import type { Project } from '../../shared/types';
import { constraints, type Pin } from './example-constraints';

/**
 * Проект, с которого открывается студия, пока в браузере ничего не сохранено. Он живёт отдельно
 * от библиотеки примеров: библиотека весит почти полмегабайта и нужна только в диалоге «Примеры».
 * Первый пример библиотеки строится из тех же данных, поэтому расхождения быть не может.
 */
export const STARTER_ID = 'logic';
export const STARTER_TITLE = 'Логическое выражение';
export const STARTER_DESCRIPTION = 'AND + OR: от выражения к таблице LUT.';
export const STARTER_SOURCE = `// Комбинационная логика: y = (a И b) ИЛИ c.
// assign описывает постоянно действующую связь, а не программу по шагам.
// На диаграммах переберите a, b, c = 0/1 и посмотрите таблицу LUT в Gowin.
// a/b — уровни кнопок (нажата = 1). c — UART_RX на выводе 70,
// внешний сигнал от USB-UART; это НЕ третья кнопка. В симуляции задайте c сами.
// y выведен на LED0: y = 0 включает LED, y = 1 выключает его.
module top (
    input wire a,
    input wire b,
    input wire c,
    output wire y
);
    assign y = (a & b) | c;
endmodule
`;
export const STARTER_PINS: Pin[] = [
  ['a', 87, 'Уровень первой кнопки: 1 при нажатии.'],
  ['b', 88, 'Уровень второй кнопки: 1 при нажатии.'],
  ['c', 70, 'UART_RX от встроенного USB-UART; задаётся внешним устройством, не кнопкой.'],
  ['y', 15, 'LED0; 0 = светится, 1 = погашен.'],
];

export function starterProject(): Project {
  return {
    name: `${STARTER_ID}-lab`,
    top: 'top',
    board: 'tangnano20k',
    files: [
      { name: 'top.v', content: STARTER_SOURCE },
      { name: 'board.cst', content: constraints(STARTER_PINS) },
    ],
  };
}
