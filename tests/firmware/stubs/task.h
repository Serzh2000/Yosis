#ifndef MOCK_TASK_H
#define MOCK_TASK_H
#include "FreeRTOS.h"
void vTaskDelay(unsigned);
int xTaskCreate(void (*)(void *), const char *, unsigned, void *, unsigned, void *);
void vTaskStartScheduler(void);
#endif
