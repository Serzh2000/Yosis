#ifndef MOCK_GPIO_H
#define MOCK_GPIO_H
#include "bflb_uart.h"
enum { GPIO_PIN_11 = 11, GPIO_PIN_13 = 13, GPIO_UART_FUNC_UART1_TX = 1, GPIO_UART_FUNC_UART1_RX = 2 };
void bflb_gpio_uart_init(struct bflb_device_s *, int, int);
#endif
