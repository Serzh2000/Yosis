#ifndef MOCK_UART_H
#define MOCK_UART_H
#include <stdint.h>
#include <stdbool.h>
struct bflb_device_s { int id; };
struct bflb_uart_config_s { uint32_t baudrate; uint8_t direction, data_bits, stop_bits, parity, bit_order, flow_ctrl, tx_fifo_threshold, rx_fifo_threshold; };
enum { UART_DIRECTION_TXRX = 3, UART_DATA_BITS_5 = 0, UART_DATA_BITS_6, UART_DATA_BITS_7, UART_DATA_BITS_8 };
enum { UART_STOP_BITS_1 = 1, UART_STOP_BITS_1_5, UART_STOP_BITS_2 };
enum { UART_PARITY_NONE, UART_PARITY_ODD, UART_PARITY_EVEN, UART_LSB_FIRST = 0 };
struct bflb_device_s *bflb_device_get_by_name(const char *);
void bflb_uart_init(struct bflb_device_s *, const struct bflb_uart_config_s *);
void bflb_uart_disable(struct bflb_device_s *);
int bflb_uart_getchar(struct bflb_device_s *);
int bflb_uart_putchar(struct bflb_device_s *, int);
bool bflb_uart_txready(struct bflb_device_s *);
bool bflb_uart_txempty(struct bflb_device_s *);
#endif
