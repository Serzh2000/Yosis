#ifndef MOCK_CDC_H
#define MOCK_CDC_H
#include "usbd_core.h"
struct cdc_line_coding { uint32_t dwDTERate; uint8_t bCharFormat, bParityType, bDataBits; };
#define CDC_REQUEST_SET_LINE_CODING 0x20
#define CDC_REQUEST_GET_LINE_CODING 0x21
#define CDC_REQUEST_SET_CONTROL_LINE_STATE 0x22
#define CDC_REQUEST_SEND_BREAK 0x23
struct usbd_interface *usbd_cdc_acm_init_intf(uint8_t, struct usbd_interface *);
void usbd_cdc_acm_set_line_coding(uint8_t, uint8_t, struct cdc_line_coding *);
void usbd_cdc_acm_get_line_coding(uint8_t, uint8_t, struct cdc_line_coding *);
void usbd_cdc_acm_set_dtr(uint8_t, uint8_t, bool);
#endif
