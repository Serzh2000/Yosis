import { mobile } from './en-mobile';
import { shell } from './en-shell';
import { designer } from './en-designer';
import { chip } from './en-chip';
import { run } from './en-run';
import { lab } from './en-lab';
import { learn } from './en-learn';
import { content } from './en-content';
import { examples } from './en-examples';
import { server } from './en-server';

/**
 * Все английские тексты интерфейса. Ключ — русская фраза, как она написана в коде (`t('…')`).
 * Чего здесь нет, показывается по-русски: перевод добавляется по частям, по файлу на область.
 */
export const english: Record<string, string> = {
  ...designer,
  ...chip,
  ...run,
  ...lab,
  ...learn,
  ...content,
  ...examples,
  ...server,
  // Общие названия (вкладки, меню) заданы оболочкой и не должны переопределяться областями.
  ...mobile,
  ...shell,
};
