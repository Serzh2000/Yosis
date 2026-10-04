/* BL616 DirtyJTAG composite device: initialize hardware before accepting USB. */
#include "board.h"
#include "bflb_gpio.h"
#include "usbd_core.h"
#include "FreeRTOS.h"
#include "task.h"
#include "dirtyjtag.h"
#include "jtag_gpio.h"
#include "uart_bridge.h"

extern void usb_descriptors_init(uint8_t busid);

static void usbd_event_handler(uint8_t busid, uint8_t event)
{
    (void)busid;
    switch (event) {
    case USBD_EVENT_RESET:
    case USBD_EVENT_DISCONNECTED:
        dirtyjtag_stop();
        uart_bridge_stop();
        break;
    case USBD_EVENT_CONFIGURED:
        dirtyjtag_start();
        uart_bridge_start();
        break;
    default: break;
    }
}

int main(void)
{
    board_init();
    jtag_gpio_init();
    uart_bridge_uart_init();
    usb_descriptors_init(0);
    dirtyjtag_init(0);
    uart_bridge_usb_init(0);
    xTaskCreate(uart_task, "uart", 1024, NULL, 2, NULL);
    usbd_initialize(0, 0x20072000, usbd_event_handler);
    vTaskStartScheduler();
    while (1) {}
}
