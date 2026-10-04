#ifndef UART_BRIDGE_H
#define UART_BRIDGE_H
#include <stdint.h>
#include <stdbool.h>

void uart_bridge_usb_init(uint8_t busid);
void uart_bridge_uart_init(void);
void uart_bridge_start(void);
void uart_bridge_stop(void);
/* One bounded, nonblocking task iteration; also exercised by the native harness. */
void uart_bridge_poll(void);
void uart_task(void *param);

struct uart_debug_state {
    uint32_t rx_bytes;
    uint32_t tx_bytes;
    uint8_t cdc_configured;
    uint8_t cdc_tx_busy;
    uint32_t baudrate;
};
void uart_bridge_get_debug(struct uart_debug_state *state);
#endif
