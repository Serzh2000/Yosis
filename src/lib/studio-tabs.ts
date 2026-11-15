import { t } from './i18n';
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

/** Состояние результата за вкладкой: значок рядом с её названием. */
export type WorkspaceStatus = 'success' | 'error' | 'stale' | 'busy';

/** Вкладки в порядке показа: подпись на кнопке и подсказка к ней. */
export const studioTabs: { id: WorkTab; label: string; caption: string }[] = [
  { id: 'lessons', label: t('Обучение'), caption: t('От первого бита к своему устройству') },
  { id: 'code', label: t('Код'), caption: t('Исходники проекта') },
  {
    id: 'design',
    label: t('Конструктор'),
    caption: t('Схема из логических элементов без ручного Verilog'),
  },
  { id: 'constraints', label: t('Выводы'), caption: t('Физические выводы и ограничения .cst') },
  { id: 'rtl', label: 'RTL', caption: t('Логические элементы и связи') },
  { id: 'simulation', label: t('Диаграммы'), caption: t('Сигналы во времени') },
  {
    id: 'virtual',
    label: t('Лаборатория'),
    caption: t('Плата на столе: детали, провода и схема в работе'),
  },
  { id: 'technology', label: 'Gowin', caption: t('LUT, регистры и ресурсы') },
  { id: 'chip', label: t('Кристалл'), caption: t('Размещение и карта занятости') },
  { id: 'board', label: t('Подключение'), caption: t('Работа с настоящей платой') },
];
