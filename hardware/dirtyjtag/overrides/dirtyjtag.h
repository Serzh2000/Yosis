#ifndef DIRTYJTAG_H
#define DIRTYJTAG_H
#include <stdint.h>
#include <stdbool.h>

void dirtyjtag_init(uint8_t busid);
void dirtyjtag_start(void);
/* Called after the USB controller aborts transfers on reset/disconnect. */
void dirtyjtag_stop(void);
#endif
