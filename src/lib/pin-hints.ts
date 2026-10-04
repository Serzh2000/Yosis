import type { Project } from '../../shared/types';
import {
  BUTTON_PINS,
  CLOCK_PIN,
  LED_PINS,
  UART_RX_PIN,
  UART_TX_PIN,
  partForPin,
} from './board-parts';
import {
  applyPinEdit,
  assignedPins,
  packagePins,
  pinCompatibility,
  type CstDirective,
  type PackagePin,
  type PlannerSignal,
} from './pin-planner';

export interface PinSuggestion {
  signal: string;
  pin: number;
  /** One plain sentence: why this pin fits this signal. */
  reason: string;
}

const bitOf = (name: string) => {
  const match = /^(.*)\[(\d+)\]$/.exec(name);
  return match ? { base: match[1], index: Number(match[2]) } : { base: name, index: null };
};

/** Suggest the on-board part that a port with a typical name is meant for. */
export function suggestPinForSignal(signal: PlannerSignal): PinSuggestion | null {
  const { base, index } = bitOf(signal.name);
  const make = (pin: number, reason: string): PinSuggestion => ({
    signal: signal.name,
    pin,
    reason,
  });
  if (signal.direction === 'input') {
    if (index === null && /^(clk|clock|sys_?clk|clk_?27m?)$/i.test(base))
      return make(CLOCK_PIN, 'Вывод 4 подключён к кварцевому генератору 27 МГц.');
    if (index === null && /^(reset|rst)(_?n)?$/i.test(base))
      return make(BUTTON_PINS.S1, 'Сброс удобно подать кнопкой S1 (вывод 88): нажата = 1.');
    if (/^(btn|button|key|sw|switch|s)_?(1|a)?$/i.test(base) && (index === null || index === 0))
      return make(BUTTON_PINS.S1, 'Кнопка S1 (вывод 88): нажата = 1, отпущена = 0.');
    if (
      (/^(btn|button|key|sw|switch|s)_?(2|b)$/i.test(base) && index === null) ||
      (/^(btn|button|key|sw|switch|buttons|keys)$/i.test(base) && index === 1)
    )
      return make(BUTTON_PINS.S2, 'Кнопка S2 (вывод 87): нажата = 1, отпущена = 0.');
    if (index === null && /^(uart_?)?rxd?$/i.test(base))
      return make(UART_RX_PIN, 'Вывод 70 принимает данные от компьютера через USB (UART RX).');
  }
  if (signal.direction === 'output') {
    if (/^(led|leds|led_?n|led_?o|ledn)$/i.test(base)) {
      const led = index ?? 0;
      if (led >= 0 && led < LED_PINS.length)
        return make(LED_PINS[led], `Светодиод LED${led} (вывод ${LED_PINS[led]}) горит при 0.`);
    }
    if (index === null && /^(uart_?)?txd?$/i.test(base))
      return make(UART_TX_PIN, 'Вывод 69 передаёт данные в компьютер через USB (UART TX).');
  }
  return null;
}

export function pinOwner(directives: CstDirective[], pin: number): string | undefined {
  return directives.find((item) => item.kind === 'IO_LOC' && assignedPins([item]).includes(pin))
    ?.signal;
}

/** Suggestions only for signals that have no pin yet, never reusing a pin that is taken. */
export function quickSuggestions(
  signals: PlannerSignal[],
  directives: CstDirective[],
): PinSuggestion[] {
  const assigned = new Set(
    directives.filter((item) => item.kind === 'IO_LOC').map((item) => item.signal),
  );
  const used = new Set(assignedPins(directives));
  const result: PinSuggestion[] = [];
  for (const signal of signals) {
    if (assigned.has(signal.name)) continue;
    const suggestion = suggestPinForSignal(signal);
    if (!suggestion || used.has(suggestion.pin)) continue;
    const pin = packagePins.find((item) => item.number === suggestion.pin);
    if (!pin || pinCompatibility(signal, pin)) continue;
    used.add(suggestion.pin);
    result.push(suggestion);
  }
  return result;
}

/** A 6-bit (or shorter) output bus whose bits can go to LED0, LED1, … in order. */
export function ledBusPlan(signals: PlannerSignal[], directives: CstDirective[]): PinSuggestion[] {
  const buses = new Map<string, Array<{ name: string; index: number }>>();
  for (const signal of signals) {
    const { base, index } = bitOf(signal.name);
    if (signal.direction !== 'output' || index === null) continue;
    buses.set(base, [...(buses.get(base) ?? []), { name: signal.name, index }]);
  }
  const candidates = [...buses.entries()].filter(
    ([base, bits]) => bits.length >= 2 && bits.length <= LED_PINS.length && !/^uart/i.test(base),
  );
  const [bus] =
    candidates.find(([base]) => /led/i.test(base)) ??
    (candidates.length === 1 ? candidates[0] : []);
  if (!bus) return [];
  const bits = buses.get(bus)!.sort((a, b) => a.index - b.index);
  const taken = (pin: number, signal: string) => {
    const owner = pinOwner(directives, pin);
    return owner !== undefined && owner !== signal;
  };
  return bits
    .map((bit, position) => ({
      signal: bit.name,
      pin: LED_PINS[position],
      reason: `Бит ${bit.index} → светодиод LED${position} (вывод ${LED_PINS[position]}).`,
    }))
    .filter((item) => !taken(item.pin, item.signal));
}

/** Apply several suggestions at once; every one goes through the normal validation. */
export function applySuggestions(
  project: Project,
  signals: PlannerSignal[],
  suggestions: PinSuggestion[],
  file: string,
): Project {
  let next = project;
  for (const item of suggestions)
    next = applyPinEdit(next, signals, {
      signal: item.signal,
      pin: item.pin,
      file,
      pull: item.pin === BUTTON_PINS.S1 || item.pin === BUTTON_PINS.S2 ? 'DOWN' : 'NONE',
    });
  return next;
}

export interface PinDetails {
  pin: PackagePin;
  title: string;
  /** What assigning a signal to this pin does physically. */
  effect: string;
  assignedTo: string[];
  warnings: string[];
}
export function pinDetails(
  pin: PackagePin,
  directives: CstDirective[],
  signal?: PlannerSignal,
): PinDetails {
  const part = partForPin(pin.number);
  const assignedTo = directives
    .filter((item) => item.kind === 'IO_LOC' && assignedPins([item]).includes(pin.number))
    .map((item) => item.signal);
  const warnings: string[] = [];
  if (pin.reserved)
    warnings.push(
      'Этот вывод занят платой (питание, программатор или флеш). Его нельзя назначать.',
    );
  if (signal) {
    const incompatible = pinCompatibility(signal, pin);
    if (incompatible && !pin.reserved) warnings.push(incompatible);
    const others = assignedTo.filter((name) => name !== signal.name);
    if (others.length) warnings.push(`Уже назначен: ${others.join(', ')}.`);
  } else if (assignedTo.length > 1)
    warnings.push(`К одному выводу назначено несколько сигналов: ${assignedTo.join(', ')}.`);
  if (part && !part.service && signal && part.direction === signal.direction && !warnings.length)
    warnings.push(
      `На плате к этому выводу уже подключено: ${part.title}. Назначайте сигнал, только если хотите им управлять.`,
    );
  return {
    pin,
    title: part?.title ?? (pin.reserved ? 'Служебный контакт' : 'Свободный вывод ввода-вывода'),
    effect:
      part?.effect ??
      (pin.reserved
        ? 'Питание, земля или служебный контакт корпуса.'
        : 'К этому выводу на плате ничего не припаяно, он выведен на разъём. Сигнал, назначенный сюда, появится на контакте разъёма как напряжение 0 или 3,3 В.'),
    assignedTo,
    warnings,
  };
}

function numericRange(text: string): { low: number; width: number } | null {
  const match = /^\[\s*(\d+)\s*:\s*(\d+)\s*\]$/.exec(text.trim());
  if (!match) return null;
  const a = Number(match[1]);
  const b = Number(match[2]);
  return { low: Math.min(a, b), width: Math.abs(a - b) + 1 };
}
function stripComments(text: string) {
  return text.replace(/\/\*[\s\S]*?\*\/|\/\/[^\r\n]*/g, (token) => token.replace(/[^\r\n]/g, ' '));
}
function matchingParen(text: string, open: number): number {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '(') depth++;
    else if (text[i] === ')' && --depth === 0) return i;
  }
  return -1;
}

/**
 * Read the ports of the top module from the Verilog text (ANSI-style header, numeric ranges only),
 * so that the list is useful before the first synthesis. Returns null when unsure.
 */
export function parsePortsFromSource(project: Project): PlannerSignal[] | null {
  for (const file of project.files.filter((item) => /\.(v|sv)$/i.test(item.name))) {
    const text = stripComments(file.content);
    const header = new RegExp(`\\bmodule\\s+${project.top.replace(/[$]/g, '\\$')}\\b`).exec(text);
    if (!header) continue;
    let cursor = header.index + header[0].length;
    while (/\s/.test(text[cursor] ?? '')) cursor++;
    if (text[cursor] === '#') {
      cursor = text.indexOf('(', cursor);
      if (cursor < 0) return null;
      cursor = matchingParen(text, cursor) + 1;
      if (cursor <= 0) return null;
      while (/\s/.test(text[cursor] ?? '')) cursor++;
    }
    if (text[cursor] !== '(') return null;
    const close = matchingParen(text, cursor);
    if (close < 0) return null;
    const body = text.slice(cursor + 1, close);
    const items: string[] = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i <= body.length; i++) {
      const char = body[i];
      if (char === '(' || char === '[') depth++;
      else if (char === ')' || char === ']') depth--;
      else if ((char === ',' && depth === 0) || i === body.length) {
        items.push(body.slice(start, i));
        start = i + 1;
      }
    }
    const signals: PlannerSignal[] = [];
    let direction: PlannerSignal['direction'] | null = null;
    let range: { low: number; width: number } | null = null;
    for (const raw of items) {
      let item = raw.trim();
      if (!item) continue;
      const lead = /^(input|output|inout)\b/.exec(item);
      if (lead) {
        direction = lead[1] as PlannerSignal['direction'];
        range = null;
        item = item.slice(lead[0].length).trim();
        const bracket = /^(?:(?:wire|reg|logic|signed|unsigned)\s+)*(\[[^\]]*\])?/.exec(item);
        item = item.slice(bracket ? bracket[0].length : 0).trim();
        if (bracket?.[1]) {
          range = numericRange(bracket[1]);
          if (!range) return null;
        }
      }
      const name = /^([A-Za-z_][A-Za-z0-9_$]*)\s*(?:=.*)?$/s.exec(item);
      if (!direction || !name) return null;
      if (!range) signals.push({ name: name[1], direction });
      else
        for (let bit = 0; bit < range.width; bit++)
          signals.push({ name: `${name[1]}[${range.low + bit}]`, direction });
    }
    return signals;
  }
  return null;
}
