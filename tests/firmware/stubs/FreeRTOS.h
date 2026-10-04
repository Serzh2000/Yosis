#ifndef MOCK_FREERTOS_H
#define MOCK_FREERTOS_H
#include <stddef.h>
void mock_enter_critical(void);
void mock_exit_critical(void);
#define taskENTER_CRITICAL() mock_enter_critical()
#define taskEXIT_CRITICAL() mock_exit_critical()
#endif
