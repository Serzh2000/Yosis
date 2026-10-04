import { ArrowRight, Cpu, X } from 'lucide-react';
import { Dialog } from './Dialog';
export function StudioGuide({ onClose }: { onClose: () => void }) {
  return (
    <Dialog className="dialog guide-dialog" onClose={onClose} labelledBy="guide-heading">
      <div className="dialog-heading">
        <Cpu size={21} />
        <h2 id="guide-heading">От Verilog к FPGA</h2>
        <button className="icon-button" aria-label="Закрыть справку" onClick={() => onClose()}>
          <X size={18} />
        </button>
      </div>
      <ol>
        <li>
          <strong>Код.</strong> Создайте проект или откройте пример. Изменения сохраняются
          автоматически.
        </li>
        <li>
          <strong>RTL и Gowin.</strong> Синтез покажет схемные элементы и реальные примитивы FPGA.
          Щёлкните LUT для таблицы истинности.
        </li>
        <li>
          <strong>Выводы .cst.</strong> Опишите физические выводы по схеме платы перед размещением.
        </li>
        <li>
          <strong>Диаграммы и виртуальная плата.</strong> Настройте такты и входные воздействия.
          Проверяйте поведение в настоящей функциональной симуляции Icarus.
        </li>
        <li>
          <strong>Кристалл и подключение.</strong> Изучайте данные размещения и подключайте
          настоящую плату.
        </li>
        <li>
          <strong>Обучение.</strong> Пройдите интерактивный маршрут: от первого бита до регистров,
          счётчика и автомата состояний.
        </li>
      </ol>
      <div className="guide-shortcuts">
        <span>
          <kbd>Ctrl ↵</kbd> Синтез
        </span>
        <span>
          <kbd>Ctrl S</kbd> Сохранить
        </span>
      </div>
      <button className="button primary" onClick={() => onClose()}>
        К экспериментам
        <ArrowRight size={14} />
      </button>
    </Dialog>
  );
}
