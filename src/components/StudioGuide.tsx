import { ArrowRight, Cpu, X } from 'lucide-react';
import { Dialog } from './Dialog';
import { t } from '../lib/i18n';
export function StudioGuide({ onClose }: { onClose: () => void }) {
  return (
    <Dialog className="dialog guide-dialog" onClose={onClose} labelledBy="guide-heading">
      <div className="dialog-heading">
        <Cpu size={21} />
        <h2 id="guide-heading">{t('От Verilog к FPGA')}</h2>
        <button className="icon-button" aria-label={t('Закрыть справку')} onClick={() => onClose()}>
          <X size={18} />
        </button>
      </div>
      <ol>
        <li>
          <strong>{t('Код.')}</strong>{' '}
          {t('Создайте проект или откройте пример. Изменения сохраняются автоматически.')}
        </li>
        <li>
          <strong>{t('RTL и Gowin.')}</strong>{' '}
          {t(
            t(
              'Синтез покажет схемные элементы и реальные примитивы FPGA. Щёлкните LUT для таблицы истинности.',
            ),
          )}
        </li>
        <li>
          <strong>{t('Выводы .cst.')}</strong>{' '}
          {t('Опишите физические выводы по схеме платы перед размещением.')}
        </li>
        <li>
          <strong>{t('Диаграммы и виртуальная плата.')}</strong>{' '}
          {t(
            t(
              'Настройте такты и входные воздействия. Проверяйте поведение в настоящей функциональной симуляции Icarus.',
            ),
          )}
        </li>
        <li>
          <strong>{t('Кристалл и подключение.')}</strong>{' '}
          {t('Изучайте данные размещения и подключайте настоящую плату.')}
        </li>
        <li>
          <strong>{t('Обучение.')}</strong>{' '}
          {t(
            t(
              'Пройдите интерактивный маршрут: от первого бита до регистров, счётчика и автомата состояний.',
            ),
          )}
        </li>
      </ol>
      <div className="guide-shortcuts">
        <span>
          <kbd>Ctrl ↵</kbd> {t('Синтез')}
        </span>
        <span>
          <kbd>Ctrl S</kbd> {t('Сохранить')}
        </span>
      </div>
      <button className="button primary" onClick={() => onClose()}>
        {t('К экспериментам')}
        <ArrowRight size={14} />
      </button>
    </Dialog>
  );
}
