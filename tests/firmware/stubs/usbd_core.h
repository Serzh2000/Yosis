#ifndef MOCK_USBD_CORE_H
#define MOCK_USBD_CORE_H
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#define USB_NOCACHE_RAM_SECTION
#define USB_MEM_ALIGNX
struct usb_setup_packet { uint8_t bmRequestType, bRequest; uint16_t wValue, wIndex, wLength; };
typedef int (*usbd_request_handler)(uint8_t, struct usb_setup_packet *, uint8_t **, uint32_t *);
struct usbd_interface { usbd_request_handler class_interface_handler; uint8_t intf_num; };
struct usbd_endpoint { uint8_t ep_addr; void (*ep_cb)(uint8_t, uint8_t, uint32_t); };
enum { USBD_EVENT_RESET = 1, USBD_EVENT_DISCONNECTED = 4, USBD_EVENT_CONFIGURED = 7 };
void usbd_add_interface(uint8_t, struct usbd_interface *);
void usbd_add_endpoint(uint8_t, struct usbd_endpoint *);
int usbd_ep_start_read(uint8_t, uint8_t, uint8_t *, uint32_t);
int usbd_ep_start_write(uint8_t, uint8_t, uint8_t *, uint32_t);
void usbd_initialize(uint8_t, uintptr_t, void (*)(uint8_t, uint8_t));
#endif
