#include <assert.h>
#include <setjmp.h>
#include <stdio.h>
#include <string.h>
#include "usbd_core.h"
#include "usbd_cdc_acm.h"
#include "bflb_uart.h"
#include "bflb_gpio.h"
#include "task.h"
#include "jtag_gpio.h"

/* Compile the actual overrides in this translation unit so static packet
 * validation and callbacks are tested, without modifying their visibility. */
#include "../../hardware/dirtyjtag/overrides/dirtyjtag.c"
#include "../../hardware/dirtyjtag/overrides/uart_bridge.c"
#define main firmware_entry
#include "../../hardware/dirtyjtag/overrides/main.c"
#undef main

struct transfer { uint8_t *buffer; uint32_t size; unsigned submissions; bool owned; };
static struct transfer reads[256], writes[256];
static struct usbd_endpoint *endpoints[256];
static unsigned interfaces, gpio_calls, transfer_bits, uart_inits, cdc_requests;
static unsigned fifo_space, critical_depth;
static bool uart_empty = true, fail_write, in_usb_callback, gpio_initialized, board_initialized;
static struct bflb_uart_config_s last_uart_config;
static struct bflb_device_s mock_device;
static uint8_t uart_input[2048], uart_output[2048];
static unsigned uart_input_count, uart_input_offset, uart_output_count;
static void (*usb_event)(uint8_t, uint8_t);
static jmp_buf scheduler_exit;

void usbd_add_interface(uint8_t bus, struct usbd_interface *intf) { (void)bus; intf->intf_num = (uint8_t)interfaces++; }
void usbd_add_endpoint(uint8_t bus, struct usbd_endpoint *ep) { (void)bus; endpoints[ep->ep_addr] = ep; }
int usbd_ep_start_read(uint8_t bus, uint8_t ep, uint8_t *buffer, uint32_t count) {
    (void)bus; assert(!reads[ep].owned); assert(count <= 512);
    reads[ep].buffer = buffer; reads[ep].size = count; reads[ep].submissions++; reads[ep].owned = true; return 0;
}
int usbd_ep_start_write(uint8_t bus, uint8_t ep, uint8_t *buffer, uint32_t count) {
    (void)bus; assert(!writes[ep].owned); assert(count && count <= (ep == 0x82 ? 64u : 512u));
    if (fail_write) { fail_write = false; return -1; }
    writes[ep].buffer = buffer; writes[ep].size = count; writes[ep].submissions++; writes[ep].owned = true; return 0;
}
void usbd_initialize(uint8_t bus, uintptr_t address, void (*event)(uint8_t, uint8_t)) {
    (void)bus; (void)address; assert(board_initialized && gpio_initialized && uart_inits); usb_event = event;
}
static int mock_cdc_class(uint8_t bus, struct usb_setup_packet *setup, uint8_t **data, uint32_t *len) {
    cdc_requests++;
    if (setup->bRequest == CDC_REQUEST_SET_LINE_CODING) {
        struct cdc_line_coding coding = {0}; memcpy(&coding, *data, 7); usbd_cdc_acm_set_line_coding(bus, 1, &coding);
    } else if (setup->bRequest == CDC_REQUEST_GET_LINE_CODING) {
        struct cdc_line_coding coding; usbd_cdc_acm_get_line_coding(bus, 1, &coding); memcpy(*data, &coding, 7); *len = 7;
    } else if (setup->bRequest == CDC_REQUEST_SET_CONTROL_LINE_STATE) usbd_cdc_acm_set_dtr(bus, 1, setup->wValue & 1);
    return 0;
}
struct usbd_interface *usbd_cdc_acm_init_intf(uint8_t bus, struct usbd_interface *intf) { (void)bus; intf->class_interface_handler = mock_cdc_class; return intf; }
struct bflb_device_s *bflb_device_get_by_name(const char *name) { (void)name; return &mock_device; }
void bflb_gpio_uart_init(struct bflb_device_s *dev, int pin, int function) { (void)dev; assert((pin == 11 && function == 1) || (pin == 13 && function == 2)); }
void bflb_uart_init(struct bflb_device_s *dev, const struct bflb_uart_config_s *config) { (void)dev; assert(!in_usb_callback); last_uart_config = *config; uart_inits++; }
void bflb_uart_disable(struct bflb_device_s *dev) { (void)dev; assert(!in_usb_callback); }
int bflb_uart_getchar(struct bflb_device_s *dev) { (void)dev; return uart_input_offset < uart_input_count ? uart_input[uart_input_offset++] : -1; }
bool bflb_uart_txready(struct bflb_device_s *dev) { (void)dev; return fifo_space > 0; }
bool bflb_uart_txempty(struct bflb_device_s *dev) { (void)dev; return uart_empty; }
int bflb_uart_putchar(struct bflb_device_s *dev, int value) { (void)dev; assert(!in_usb_callback && fifo_space); assert(uart_output_count < sizeof(uart_output)); fifo_space--; uart_output[uart_output_count++] = (uint8_t)value; return 0; }
void mock_enter_critical(void) { critical_depth++; }
void mock_exit_critical(void) { assert(critical_depth); critical_depth--; }
void vTaskDelay(unsigned ticks) { assert(ticks > 0 && !critical_depth); }
int xTaskCreate(void (*task)(void *), const char *name, unsigned size, void *arg, unsigned priority, void *handle) { (void)task; (void)name; (void)size; (void)arg; (void)priority; (void)handle; return 1; }
void vTaskStartScheduler(void) { longjmp(scheduler_exit, 1); }
void board_init(void) { board_initialized = true; }
void usb_descriptors_init(uint8_t bus) { (void)bus; }
void jtag_gpio_init(void) { assert(board_initialized); gpio_initialized = true; }
void jtag_set_frequency(uint16_t value) { (void)value; gpio_calls++; }
void jtag_set_tck(bool value) { (void)value; gpio_calls++; }
void jtag_set_tdi(bool value) { (void)value; gpio_calls++; }
void jtag_set_tms(bool value) { (void)value; gpio_calls++; }
void jtag_set_trst(bool value) { (void)value; gpio_calls++; }
void jtag_set_srst(bool value) { (void)value; gpio_calls++; }
bool jtag_get_tdo(void) { gpio_calls++; return true; }
bool jtag_strobe(uint8_t pulses, bool tms, bool tdi) { (void)pulses; (void)tms; (void)tdi; gpio_calls++; return true; }
void jtag_transfer(uint16_t bits, const uint8_t *tdi, uint8_t *tdo) { assert(bits <= 496); gpio_calls++; transfer_bits = bits; if (tdo) memcpy(tdo, tdi, (bits + 7u) / 8u); }

static void deliver(uint8_t ep, const uint8_t *data, uint32_t count) {
    assert(reads[ep].owned); if (count <= reads[ep].size && count) memcpy(reads[ep].buffer, data, count);
    reads[ep].owned = false; in_usb_callback = true; endpoints[ep]->ep_cb(0, ep, count); in_usb_callback = false;
}
static void complete(uint8_t ep) {
    assert(writes[ep].owned); uint32_t count = writes[ep].size; writes[ep].owned = false;
    in_usb_callback = true; endpoints[ep]->ep_cb(0, ep, count); in_usb_callback = false;
}
static void abort_usb(uint8_t event) {
    for (unsigned ep = 0; ep < 256; ep++) { reads[ep].owned = false; writes[ep].owned = false; }
    in_usb_callback = true; usb_event(0, event); in_usb_callback = false;
}
static void uart_feed(unsigned count, uint8_t first) { assert(count <= sizeof(uart_input)); uart_input_count = count; uart_input_offset = 0; for (unsigned i = 0; i < count; i++) uart_input[i] = (uint8_t)(first + i); }
static void poll(void) { uart_bridge_poll(); assert(critical_depth == 0); }
static void expect_rejected(const uint8_t *packet, unsigned count) {
    unsigned before = gpio_calls, writes_before = writes[0x82].submissions;
    deliver(0x01, packet, count); assert(gpio_calls == before && writes[0x82].submissions == writes_before); assert(reads[0x01].owned);
}

static void test_jtag(void) {
    uint8_t valid_then_short[] = { CMD_SETSIG, SIG_TCK, SIG_TCK, CMD_FREQ, 1 };
    uint8_t too_many_infos[] = { CMD_INFO, CMD_INFO, CMD_INFO };
    uint8_t missing_length[] = { CMD_XFER };
    uint8_t missing_payload[] = { CMD_XFER | EXTEND_LENGTH, 255 };
    uint8_t unknown[] = { CMD_SETSIG, SIG_TMS, SIG_TMS, 0x0f };
    uint8_t flags[] = { CMD_FREQ | EXTEND_LENGTH, 1, 2 };
    expect_rejected(valid_then_short, sizeof(valid_then_short));
    expect_rejected(too_many_infos, sizeof(too_many_infos));
    expect_rejected(missing_length, sizeof(missing_length));
    expect_rejected(missing_payload, sizeof(missing_payload));
    expect_rejected(unknown, sizeof(unknown));
    expect_rejected(flags, sizeof(flags));
    expect_rejected(NULL, 65);
    puts("PASS JTAG: malformed whole packets cause no GPIO/IN side effects");

    uint8_t packet[64] = { CMD_XFER | EXTEND_LENGTH, 240 };
    for (unsigned i = 2; i < sizeof(packet); i++) packet[i] = (uint8_t)i;
    unsigned reads_before = reads[0x01].submissions;
    deliver(0x01, packet, sizeof(packet));
    assert(transfer_bits == 496 && writes[0x82].size == 62);
    assert(memcmp(writes[0x82].buffer, packet + 2, 62) == 0);
    assert(!reads[0x01].owned && reads[0x01].submissions == reads_before);
    dirtyjtag_start(); assert(!reads[0x01].owned); /* Repeated configured cannot reset busy. */
    complete(0x82); assert(reads[0x01].owned);
    puts("PASS JTAG: maximum packet and IN/OUT ownership");

    uint8_t info[] = { CMD_INFO, CMD_INFO };
    deliver(0x01, info, sizeof(info)); assert(writes[0x82].size == 2 * INFO_SIZE);
    assert(memcmp(writes[0x82].buffer, "DJTAG2\n", 7) == 0);
    const uint8_t *padding = writes[0x82].buffer + 10 + offsetof(struct uart_debug_state, cdc_tx_busy) + 1;
    for (size_t i = 0; i < offsetof(struct uart_debug_state, baudrate) - offsetof(struct uart_debug_state, cdc_tx_busy) - 1; i++) assert(padding[i] == 0);
    complete(0x82);
    puts("PASS JTAG: bounded INFO and cleared diagnostic padding");

    uint8_t getsig[] = { CMD_GETSIG };
    fail_write = true; deliver(0x01, getsig, 1); assert(reads[0x01].owned && !ep_tx_busy);
    puts("PASS JTAG: failed IN submission releases ownership");

    uint32_t random = 0x12345678;
    for (unsigned trial = 0; trial < 20000; trial++) {
        random = random * 1664525u + 1013904223u; unsigned count = random % 65;
        for (unsigned i = 0; i < count; i++) { random = random * 1664525u + 1013904223u; packet[i] = (uint8_t)(random >> 24); }
        unsigned before = gpio_calls; bool valid = validate_packet(packet, count); uint32_t response = cmd_handle(packet, count);
        assert(response <= 64); if (!valid) assert(gpio_calls == before && response == 0);
    }
    puts("PASS JTAG: 20,000 deterministic malformed/valid packet cases");
}

static void test_uart(void) {
    uart_feed(10, 1); unsigned writes_before = writes[0x84].submissions; poll();
    assert(writes[0x84].submissions == writes_before && uart_input_offset == 10);
    puts("PASS UART: closed CDC drains RX without submitting USB IN");

    usbd_cdc_acm_set_dtr(0, 1, true); uart_feed(20, 0x40); poll();
    assert(writes[0x84].owned && writes[0x84].size == 20);
    uint8_t saved[20]; memcpy(saved, writes[0x84].buffer, 20); uint8_t *owned_buffer = writes[0x84].buffer;
    usbd_cdc_acm_set_dtr(0, 1, false); usbd_cdc_acm_set_dtr(0, 1, true);
    uart_feed(64, 0x80); poll(); assert(cdc_tx_busy && writes[0x84].buffer == owned_buffer);
    assert(memcmp(owned_buffer, saved, sizeof(saved)) == 0);
    complete(0x84); poll(); assert(writes[0x84].owned && writes[0x84].buffer != owned_buffer); complete(0x84);
    puts("PASS UART: DTR changes preserve USB buffer ownership");

    uint8_t outgoing[512]; for (unsigned i = 0; i < sizeof(outgoing); i++) outgoing[i] = (uint8_t)i;
    unsigned reads_before = reads[0x03].submissions, output_before = uart_output_count;
    deliver(0x03, outgoing, sizeof(outgoing)); assert(uart_output_count == output_before && !reads[0x03].owned);
    fifo_space = 0; poll(); assert(uart_output_count == output_before && reads[0x03].submissions == reads_before);
    fifo_space = 3; poll(); assert(uart_output_count == output_before + 3 && !reads[0x03].owned);
    fifo_space = 1000; for (unsigned i = 0; i < 8; i++) poll();
    assert(uart_output_count == output_before + 512 && reads[0x03].owned);
    assert(memcmp(uart_output + output_before, outgoing, 512) == 0);
    puts("PASS UART: USB OUT forwarding is deferred, bounded and backpressured");

    struct cdc_line_coding coding = { .dwDTERate = 230400, .bDataBits = 7, .bParityType = 2, .bCharFormat = 1 };
    unsigned inits_before = uart_inits; uart_empty = false;
    in_usb_callback = true; usbd_cdc_acm_set_line_coding(0, 1, &coding); in_usb_callback = false;
    coding.dwDTERate = 9600; poll(); assert(uart_inits == inits_before);
    uart_empty = true; poll(); assert(uart_inits == inits_before + 1);
    assert(last_uart_config.baudrate == 230400 && last_uart_config.data_bits == UART_DATA_BITS_7);
    assert(last_uart_config.parity == UART_PARITY_EVEN && last_uart_config.stop_bits == UART_STOP_BITS_1_5);
    coding.bParityType = 3; usbd_cdc_acm_set_line_coding(0, 1, &coding); poll(); assert(uart_inits == inits_before + 1);
    puts("PASS UART: copied line coding applies in task after FIFO empties");

    uint8_t data[8] = {0}; uint8_t *data_ptr = data; uint32_t len = sizeof(data);
    struct usb_setup_packet request = { .bmRequestType = 0x21, .bRequest = CDC_REQUEST_SET_LINE_CODING, .wIndex = 1, .wLength = 8 };
    unsigned requests_before = cdc_requests;
    assert(checked_cdc_request(0, &request, &data_ptr, &len) < 0);
    request.wLength = 6; assert(checked_cdc_request(0, &request, &data_ptr, &len) < 0);
    request.wLength = 7; data[6] = 8; data[5] = 255; assert(checked_cdc_request(0, &request, &data_ptr, &len) < 0);
    coding = (struct cdc_line_coding){ .dwDTERate = 115200, .bDataBits = 8 }; memcpy(data, &coding, 7);
    request.wIndex = 2; assert(checked_cdc_request(0, &request, &data_ptr, &len) < 0);
    request.wIndex = 1; request.bmRequestType = 0xa1; assert(checked_cdc_request(0, &request, &data_ptr, &len) < 0);
    assert(cdc_requests == requests_before);
    request.bmRequestType = 0x21; assert(checked_cdc_request(0, &request, &data_ptr, &len) == 0); poll();
    assert(last_uart_config.baudrate == 115200);
    puts("PASS CDC: control requests validate before the pinned class handler");

    uart_feed(10, 5); fail_write = true; poll(); assert(!cdc_tx_busy && tx_fill_count == 10); poll(); assert(writes[0x84].owned); complete(0x84);
    puts("PASS UART: failed IN keeps the payload for retry");
    deliver(0x03, NULL, 513); assert(reads[0x03].owned && !rx_pending);
    puts("PASS UART: oversized OUT callback is rejected");
}

static void test_reset(void) {
    uint8_t command[] = { CMD_GETSIG }; deliver(0x01, command, 1); uart_feed(12, 0x30); poll();
    assert(writes[0x82].owned && writes[0x84].owned);
    abort_usb(USBD_EVENT_RESET);
    assert(!jtag_active && !usb_active && !cdc_configured && !ep_tx_busy && !cdc_tx_busy);
    unsigned jtag_reads = reads[0x01].submissions, cdc_reads = reads[0x03].submissions, in_count = writes[0x84].submissions;
    jtag_bulk_in_cb(0, 0x82, 1); cdc_bulk_in_cb(0, 0x84, 12); uart_feed(5, 1); poll();
    assert(reads[0x01].submissions == jtag_reads && reads[0x03].submissions == cdc_reads && writes[0x84].submissions == in_count);
    usb_event(0, USBD_EVENT_CONFIGURED); assert(reads[0x01].owned && reads[0x03].owned && !cdc_configured);
    abort_usb(USBD_EVENT_DISCONNECTED); assert(!jtag_active && !usb_active);
    puts("PASS reset/disconnect: controller abort releases buffers and stops rearming");
}

int main(void) {
    if (!setjmp(scheduler_exit)) firmware_entry();
    assert(usb_event); usb_event(0, USBD_EVENT_CONFIGURED);
    puts("PASS startup: GPIO/UART are initialized before USB");
    test_jtag(); test_uart(); test_reset();
    puts("Firmware native harness: all checks passed"); return 0;
}
