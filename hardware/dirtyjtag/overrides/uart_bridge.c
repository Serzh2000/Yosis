/* CDC-ACM/UART1 bridge, derived from the pinned MIT upstream.
 * USB callbacks publish work. Only the task configures or writes the UART. */
#include <string.h>
#include "usbd_core.h"
#include "usbd_cdc_acm.h"
#include "bflb_uart.h"
#include "bflb_gpio.h"
#include "FreeRTOS.h"
#include "task.h"
#include "uart_bridge.h"

#define CDC_OUT_EP 0x03
#define CDC_IN_EP 0x84
#define UART_POLL_BUDGET 64

static struct bflb_device_s *uart1_dev;
static USB_NOCACHE_RAM_SECTION USB_MEM_ALIGNX uint8_t cdc_rx_buf[512];
static USB_NOCACHE_RAM_SECTION USB_MEM_ALIGNX uint8_t cdc_tx_buf[2][512];
static uint8_t tx_fill_idx;
static uint32_t tx_fill_count;
static volatile bool usb_active;
static volatile bool cdc_configured;
static volatile bool cdc_tx_busy;
static bool cdc_out_armed;
static volatile bool rx_pending;
static uint32_t rx_count, rx_offset;
static uint8_t cdc_bus;
static uint32_t debug_rx_bytes, debug_tx_bytes;
static uint32_t debug_baudrate = 115200;
static volatile bool uart_reconfig_pending;
static struct cdc_line_coding pending_line_coding;
static struct cdc_line_coding applied_line_coding = { .dwDTERate = 115200, .bDataBits = 8 };

static void arm_cdc_out(void)
{
    if (usb_active && !rx_pending && !cdc_out_armed) {
        cdc_out_armed = true;
        if (usbd_ep_start_read(cdc_bus, CDC_OUT_EP, cdc_rx_buf, sizeof(cdc_rx_buf)) < 0)
            cdc_out_armed = false;
    }
}

static void cdc_bulk_out_cb(uint8_t busid, uint8_t ep, uint32_t nbytes)
{
    (void)busid; (void)ep;
    if (!usb_active || rx_pending) return;
    cdc_out_armed = false;
    if (!cdc_configured || nbytes == 0 || nbytes > sizeof(cdc_rx_buf)) {
        arm_cdc_out();
        return;
    }
    rx_count = nbytes;
    rx_offset = 0;
    rx_pending = true;
    /* Keep this buffer until the task has moved every byte to the UART FIFO. */
}

static void cdc_bulk_in_cb(uint8_t busid, uint8_t ep, uint32_t nbytes)
{
    (void)busid; (void)ep; (void)nbytes;
    if (usb_active) cdc_tx_busy = false;
}

static struct usbd_endpoint cdc_out_ep = { .ep_addr = CDC_OUT_EP, .ep_cb = cdc_bulk_out_cb };
static struct usbd_endpoint cdc_in_ep = { .ep_addr = CDC_IN_EP, .ep_cb = cdc_bulk_in_cb };
static struct usbd_interface cdc_intf0, cdc_intf1;
static usbd_request_handler cdc_class_handler;
static int checked_cdc_request(uint8_t busid, struct usb_setup_packet *setup, uint8_t **data, uint32_t *len);

void uart_bridge_usb_init(uint8_t busid)
{
    cdc_bus = busid;
    usbd_cdc_acm_init_intf(busid, &cdc_intf0);
    usbd_cdc_acm_init_intf(busid, &cdc_intf1);
    cdc_class_handler = cdc_intf0.class_interface_handler;
    cdc_intf0.class_interface_handler = checked_cdc_request;
    cdc_intf1.class_interface_handler = checked_cdc_request;
    usbd_add_interface(busid, &cdc_intf0);
    usbd_add_interface(busid, &cdc_intf1);
    usbd_add_endpoint(busid, &cdc_out_ep);
    usbd_add_endpoint(busid, &cdc_in_ep);
}

static bool valid_line_coding(const struct cdc_line_coding *coding)
{
    /* The SDK supports 5..8 bits, none/odd/even parity and 1/1.5/2 stop bits. */
    return coding && coding->dwDTERate > 0 && coding->dwDTERate <= 3000000
        && coding->bDataBits >= 5 && coding->bDataBits <= 8
        && coding->bParityType <= 2 && coding->bCharFormat <= 2;
}

/* The pinned CDC class copies wLength to a 7-byte structure and indexes debug
 * tables before its callback. Validate here without changing vendored SDK files. */
static int checked_cdc_request(uint8_t busid, struct usb_setup_packet *setup, uint8_t **data, uint32_t *len)
{
    if (!setup || setup->wIndex != 1 || !cdc_class_handler) return -1;
    switch (setup->bRequest) {
    case CDC_REQUEST_SET_LINE_CODING: {
        if (setup->bmRequestType != 0x21 || setup->wLength != 7 || !data || !*data) return -1;
        struct cdc_line_coding coding = {0};
        memcpy(&coding, *data, 7);
        if (!valid_line_coding(&coding)) return -1;
        break;
    }
    case CDC_REQUEST_GET_LINE_CODING:
        if (setup->bmRequestType != 0xa1 || setup->wLength != 7 || !data || !*data) return -1;
        break;
    case CDC_REQUEST_SET_CONTROL_LINE_STATE:
        if (setup->bmRequestType != 0x21 || setup->wLength != 0 || (setup->wValue & ~3u)) return -1;
        break;
    case CDC_REQUEST_SEND_BREAK:
        if (setup->bmRequestType != 0x21 || setup->wLength != 0) return -1;
        break;
    default: return -1;
    }
    return cdc_class_handler(busid, setup, data, len);
}

static void apply_line_coding(const struct cdc_line_coding *coding)
{
    if (!uart1_dev) return;
    struct bflb_uart_config_s config = {
        .baudrate = coding->dwDTERate,
        .direction = UART_DIRECTION_TXRX,
        .data_bits = UART_DATA_BITS_8,
        .stop_bits = UART_STOP_BITS_1,
        .parity = UART_PARITY_NONE,
        .bit_order = UART_LSB_FIRST,
        .flow_ctrl = 0, .tx_fifo_threshold = 7, .rx_fifo_threshold = 7,
    };
    switch (coding->bDataBits) {
    case 5: config.data_bits = UART_DATA_BITS_5; break;
    case 6: config.data_bits = UART_DATA_BITS_6; break;
    case 7: config.data_bits = UART_DATA_BITS_7; break;
    default: break;
    }
    if (coding->bCharFormat == 1) config.stop_bits = UART_STOP_BITS_1_5;
    if (coding->bCharFormat == 2) config.stop_bits = UART_STOP_BITS_2;
    if (coding->bParityType == 1) config.parity = UART_PARITY_ODD;
    if (coding->bParityType == 2) config.parity = UART_PARITY_EVEN;
    bflb_uart_disable(uart1_dev);
    bflb_uart_init(uart1_dev, &config);
    applied_line_coding = *coding;
    debug_baudrate = config.baudrate;
}

void uart_bridge_uart_init(void)
{
    struct bflb_device_s *gpio = bflb_device_get_by_name("gpio");
    bflb_gpio_uart_init(gpio, GPIO_PIN_11, GPIO_UART_FUNC_UART1_TX);
    bflb_gpio_uart_init(gpio, GPIO_PIN_13, GPIO_UART_FUNC_UART1_RX);
    uart1_dev = bflb_device_get_by_name("uart1");
    apply_line_coding(&applied_line_coding);
}

void usbd_cdc_acm_set_line_coding(uint8_t busid, uint8_t intf, struct cdc_line_coding *coding)
{
    (void)busid;
    if (intf != 1 || !valid_line_coding(coding)) return;
    pending_line_coding = *coding;
    uart_reconfig_pending = true;
}

void usbd_cdc_acm_get_line_coding(uint8_t busid, uint8_t intf, struct cdc_line_coding *coding)
{
    (void)busid; (void)intf;
    /* An unsupported request retains the last supported configuration. */
    *coding = uart_reconfig_pending ? pending_line_coding : applied_line_coding;
}

void usbd_cdc_acm_set_dtr(uint8_t busid, uint8_t intf, bool dtr)
{
    (void)busid;
    if (intf != 1) return;
    cdc_configured = usb_active && dtr;
    /* DTR does not cancel a USB transfer: its buffer remains owned until IN completes. */
}

void uart_bridge_start(void)
{
    if (usb_active) return;
    usb_active = true;
    cdc_configured = false;
    cdc_out_armed = false;
    arm_cdc_out();
}

void uart_bridge_stop(void)
{
    /* The controller has already aborted endpoints on reset/disconnect. */
    usb_active = false;
    cdc_configured = false;
    cdc_tx_busy = false;
    cdc_out_armed = false;
    rx_pending = false;
    rx_count = rx_offset = 0;
    tx_fill_idx = 0;
    tx_fill_count = 0;
    uart_reconfig_pending = false;
}

void uart_bridge_poll(void)
{
    if (!uart1_dev) return;
    /* The USB ISR must not swap ownership or overwrite line coding during this
     * bounded iteration. No wait for UART/USB completion occurs under this lock. */
    taskENTER_CRITICAL();
    if (uart_reconfig_pending && !rx_pending && bflb_uart_txempty(uart1_dev)) {
        struct cdc_line_coding coding = pending_line_coding;
        uart_reconfig_pending = false;
        apply_line_coding(&coding);
    }
    if (rx_pending) {
        if (!usb_active || !cdc_configured) {
            rx_offset = rx_count;
        } else {
            for (unsigned budget = 0; budget < UART_POLL_BUDGET && rx_offset < rx_count; ++budget) {
                if (!bflb_uart_txready(uart1_dev)) break;
                /* This task is the only FIFO writer. After txready it cannot fill
                 * between the check and this putchar, so the SDK wait never runs. */
                if (bflb_uart_putchar(uart1_dev, cdc_rx_buf[rx_offset]) < 0) break;
                rx_offset++;
                debug_tx_bytes++;
            }
        }
        if (rx_offset == rx_count) { rx_pending = false; rx_count = rx_offset = 0; arm_cdc_out(); }
    }
    for (unsigned budget = 0; budget < UART_POLL_BUDGET; ++budget) {
        if (usb_active && cdc_configured && tx_fill_count == sizeof(cdc_tx_buf[0])) break;
        int ch = bflb_uart_getchar(uart1_dev);
        if (ch < 0) break;
        if (usb_active && cdc_configured) cdc_tx_buf[tx_fill_idx][tx_fill_count++] = (uint8_t)ch;
    }
    if (!usb_active || !cdc_configured) {
        tx_fill_count = 0;
    } else if (tx_fill_count && !cdc_tx_busy) {
        cdc_tx_busy = true;
        if (usbd_ep_start_write(cdc_bus, CDC_IN_EP, cdc_tx_buf[tx_fill_idx], tx_fill_count) < 0) {
            cdc_tx_busy = false;
        } else {
            debug_rx_bytes += tx_fill_count;
            tx_fill_idx ^= 1;
            tx_fill_count = 0;
        }
    }
    arm_cdc_out(); /* Retry a failed read submission on the next tick. */
    taskEXIT_CRITICAL();
}

void uart_task(void *param)
{
    (void)param;
    for (;;) { uart_bridge_poll(); vTaskDelay(1); }
}

void uart_bridge_get_debug(struct uart_debug_state *state)
{
    memset(state, 0, sizeof(*state));
    state->rx_bytes = debug_rx_bytes;
    state->tx_bytes = debug_tx_bytes;
    state->cdc_configured = cdc_configured;
    state->cdc_tx_busy = cdc_tx_busy;
    state->baudrate = debug_baudrate;
}
