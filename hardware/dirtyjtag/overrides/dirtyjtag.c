/* DirtyJTAG v2, derived from the pinned MIT upstream handler.
 * A whole USB packet is checked before any JTAG pin can change. */
#include <string.h>
#include "usbd_core.h"
#include "dirtyjtag.h"
#include "jtag_gpio.h"
#include "uart_bridge.h"

#define JTAG_OUT_EP 0x01
#define JTAG_IN_EP 0x82
#define JTAG_PACKET_SIZE 64
#define INFO_SIZE (10u + sizeof(struct uart_debug_state))

enum { CMD_STOP, CMD_INFO, CMD_FREQ, CMD_XFER, CMD_SETSIG, CMD_GETSIG, CMD_CLK };
enum { NO_READ = 0x80, EXTEND_LENGTH = 0x40, READOUT = 0x80 };
enum { SIG_TCK = 1 << 1, SIG_TDI = 1 << 2, SIG_TDO = 1 << 3,
       SIG_TMS = 1 << 4, SIG_TRST = 1 << 5, SIG_SRST = 1 << 6 };

static USB_NOCACHE_RAM_SECTION USB_MEM_ALIGNX uint8_t rx_buf[JTAG_PACKET_SIZE];
static USB_NOCACHE_RAM_SECTION USB_MEM_ALIGNX uint8_t tx_buf[JTAG_PACKET_SIZE];
static volatile bool ep_tx_busy;
static volatile bool jtag_active;
static bool out_armed;
static uint8_t jtag_bus;

static void arm_out(void)
{
    if (jtag_active && !ep_tx_busy && !out_armed) {
        out_armed = true;
        if (usbd_ep_start_read(jtag_bus, JTAG_OUT_EP, rx_buf, sizeof(rx_buf)) < 0)
            out_armed = false;
    }
}

static bool validate_packet(const uint8_t *packet, uint32_t count)
{
    uint32_t position = 0, response_size = 0;
    if (count > sizeof(rx_buf)) return false;
    while (position < count) {
        uint8_t command = packet[position];
        uint32_t input_size = 1, output_size = 0;
        uint8_t id = command & 0x0f;
        if (command == CMD_STOP) return true;
        /* Only XFER and CLK define modifiers in protocol v2. */
        uint8_t allowed = id == CMD_XFER ? NO_READ | EXTEND_LENGTH : id == CMD_CLK ? READOUT : 0;
        if (command & (uint8_t)~(0x0f | allowed)) return false;
        switch (id) {
        case CMD_INFO: output_size = INFO_SIZE; break;
        case CMD_FREQ:
        case CMD_SETSIG: input_size = 3; break;
        case CMD_GETSIG: output_size = 1; break;
        case CMD_CLK:
            input_size = 3;
            output_size = (command & READOUT) ? 1 : 0;
            break;
        case CMD_XFER: {
            if (count - position < 2) return false;
            uint16_t bits = packet[position + 1] + ((command & EXTEND_LENGTH) ? 256 : 0);
            uint32_t bytes = (bits + 7u) / 8u;
            input_size = 2 + bytes;
            output_size = (command & NO_READ) ? 0 : bytes;
            break;
        }
        default: return false;
        }
        if (input_size > count - position || output_size > sizeof(tx_buf) - response_size)
            return false;
        position += input_size;
        response_size += output_size;
    }
    return true;
}

static uint32_t cmd_handle(const uint8_t *packet, uint32_t count)
{
    uint32_t position = 0, output = 0;
    if (!validate_packet(packet, count)) return 0;
    while (position < count && packet[position] != CMD_STOP) {
        const uint8_t *command = packet + position;
        switch (command[0] & 0x0f) {
        case CMD_INFO: {
            static const uint8_t info[10] = "DJTAG2\n";
            struct uart_debug_state debug = {0};
            uart_bridge_get_debug(&debug);
            memcpy(tx_buf + output, info, sizeof(info));
            output += sizeof(info);
            /* Clear ABI padding as well; never expose uninitialized stack bytes. */
            memcpy(tx_buf + output, &debug, sizeof(debug));
            output += sizeof(debug);
            position++;
            break;
        }
        case CMD_FREQ:
            jtag_set_frequency((command[1] << 8) | command[2]);
            position += 3;
            break;
        case CMD_XFER: {
            uint16_t bits = command[1] + ((command[0] & EXTEND_LENGTH) ? 256 : 0);
            uint32_t bytes = (bits + 7u) / 8u;
            bool no_read = command[0] & NO_READ;
            if (!no_read) memset(tx_buf + output, 0, bytes);
            jtag_transfer(bits, command + 2, no_read ? NULL : tx_buf + output);
            position += 2 + bytes;
            if (!no_read) output += bytes;
            break;
        }
        case CMD_SETSIG: {
            uint8_t mask = command[1], value = command[2];
            if (mask & SIG_TCK) jtag_set_tck(value & SIG_TCK);
            if (mask & SIG_TDI) jtag_set_tdi(value & SIG_TDI);
            if (mask & SIG_TMS) jtag_set_tms(value & SIG_TMS);
            if (mask & SIG_TRST) jtag_set_trst(value & SIG_TRST);
            if (mask & SIG_SRST) jtag_set_srst(value & SIG_SRST);
            position += 3;
            break;
        }
        case CMD_GETSIG:
            tx_buf[output++] = jtag_get_tdo() ? SIG_TDO : 0;
            position++;
            break;
        case CMD_CLK: {
            bool value = jtag_strobe(command[2], command[1] & SIG_TMS, command[1] & SIG_TDI);
            if (command[0] & READOUT) tx_buf[output++] = value ? 0xff : 0;
            position += 3;
            break;
        }
        default: return 0; /* Unreachable after validation. */
        }
    }
    return output;
}

static void jtag_bulk_out_cb(uint8_t busid, uint8_t ep, uint32_t nbytes)
{
    (void)busid; (void)ep;
    if (!jtag_active || ep_tx_busy) return;
    out_armed = false;
    uint32_t response_size = cmd_handle(rx_buf, nbytes);
    if (response_size) {
        ep_tx_busy = true;
        if (usbd_ep_start_write(jtag_bus, JTAG_IN_EP, tx_buf, response_size) < 0) {
            ep_tx_busy = false;
            arm_out();
        }
    } else {
        arm_out();
    }
}

static void jtag_bulk_in_cb(uint8_t busid, uint8_t ep, uint32_t nbytes)
{
    (void)busid; (void)ep; (void)nbytes;
    if (!jtag_active) return;
    ep_tx_busy = false;
    /* USB now owns neither packet buffer; the next OUT can safely be accepted. */
    arm_out();
}

static struct usbd_endpoint jtag_out_ep = { .ep_addr = JTAG_OUT_EP, .ep_cb = jtag_bulk_out_cb };
static struct usbd_endpoint jtag_in_ep = { .ep_addr = JTAG_IN_EP, .ep_cb = jtag_bulk_in_cb };
static struct usbd_interface jtag_intf;

void dirtyjtag_init(uint8_t busid)
{
    jtag_bus = busid;
    usbd_add_interface(busid, &jtag_intf);
    usbd_add_endpoint(busid, &jtag_out_ep);
    usbd_add_endpoint(busid, &jtag_in_ep);
}

void dirtyjtag_start(void)
{
    if (jtag_active) return;
    jtag_active = true;
    ep_tx_busy = false;
    out_armed = false;
    arm_out();
}

void dirtyjtag_stop(void)
{
    jtag_active = false;
    ep_tx_busy = false;
    out_armed = false;
}
