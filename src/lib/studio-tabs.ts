/** Рабочие вкладки студии. Тип живёт в lib, чтобы маршрут и логика не зависели от компонентов. */
export type WorkTab =
  | 'design'
  | 'code'
  | 'rtl'
  | 'technology'
  | 'constraints'
  | 'simulation'
  | 'virtual'
  | 'chip'
  | 'lessons'
  | 'board';

/** Вкладки в порядке показа: подпись на кнопке и подсказка к ней. */
export const studioTabs: { id: WorkTab; label: string; caption: string }[] = [
  { id: 'lessons', label: 'Обучение', caption: 'От первого бита к своему устройству' },
  { id: 'code', label: 'Код', caption: 'Исходники проекта' },
  {
    id: 'design',
    label: 'Конструктор',
    caption: 'Схема из логических элементов без ручного Verilog',
  },
  { id: 'constraints', label: 'Выводы', caption: 'Физические выводы и ограничения .cst' },
  { id: 'rtl', label: 'RTL', caption: 'Логические элементы и связи' },
  { id: 'simulation', label: 'Диаграммы', caption: 'Сигналы во времени' },
  {
    id: 'virtual',
    label: 'Лаборатория',
    caption: 'Плата на столе: детали, провода и схема в работе',
  },
  { id: 'technology', label: 'Gowin', caption: 'LUT, регистры и ресурсы' },
  { id: 'chip', label: 'Кристалл', caption: 'Размещение и карта занятости' },
  { id: 'board', label: 'Подключение', caption: 'Работа с настоящей платой' },
];
