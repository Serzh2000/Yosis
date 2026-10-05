import { LAB_OP, type LabDesign } from '../../../shared/lab';

/** One watched net: where a device looks at the design. */
export interface LabProbe {
  net: number;
  level: 0 | 1;
  /** Cycles spent high since the simulation started (up to the last change). */
  high: number;
  rises: number;
  /** Cycle of the last change. */
  changed: number;
  /** Width in cycles of the last finished high pulse. */
  pulse: number;
  /** Cycles between the last two rising edges. */
  period: number;
  lastRise: number;
  listener?: (level: 0 | 1, cycle: number) => void;
  /** The level changed this cycle and the listener has not been told yet. */
  fire?: boolean;
}

interface TimedInput {
  cycle: number;
  net: number;
  level: 0 | 1 | null;
  /** Set for pad drivers: the level is one driver's contribution, not the net's value. */
  driver?: string;
}

/**
 * Two-state simulator of a gate-level design. One cycle is one period of the board clock.
 * Gates are evaluated in dependency order; flip-flops take their D on the rising edge of
 * whatever net clocks them, so divided and inverted clocks work as well as the main one.
 */
export class LabSim {
  readonly values: Uint8Array;
  cycle = 0;
  private gates: Int32Array;
  private dffC: Int32Array;
  private dffD: Int32Array;
  private dffQ: Int32Array;
  private clockPrev: Uint8Array;
  private dPrev: Uint8Array;
  private next: Uint8Array;
  private probes: LabProbe[] = [];
  private timed: TimedInput[] = [];
  private dirty = true;
  /** Every flip-flop is clocked by the board clock itself and nothing else reads that net. */
  private simple: boolean;
  private inputNets: Set<number>;
  /** What the outside world makes of each pad: pulled up unless somebody drives it. */
  private ext: Uint8Array;
  private padDrivers = new Map<number, Map<string, 0 | 1>>();
  private triNets = new Set<number>();

  constructor(
    private design: LabDesign,
    private clockNet: number | null,
  ) {
    this.values = new Uint8Array(design.nets);
    this.values[1] = 1;
    this.ext = new Uint8Array(design.nets).fill(1);
    for (let i = 0; i < design.gates.length; i += 5)
      if (design.gates[i] === LAB_OP.TRI) this.triNets.add(design.gates[i + 4]);
    this.gates = orderGates(design);
    const count = design.dffs.length / 4;
    this.dffC = new Int32Array(count);
    this.dffD = new Int32Array(count);
    this.dffQ = new Int32Array(count);
    this.clockPrev = new Uint8Array(count);
    this.dPrev = new Uint8Array(count);
    this.next = new Uint8Array(count);
    for (let i = 0; i < count; i++) {
      this.dffC[i] = design.dffs[i * 4];
      this.dffD[i] = design.dffs[i * 4 + 1];
      this.dffQ[i] = design.dffs[i * 4 + 2];
      this.values[this.dffQ[i]] = design.dffs[i * 4 + 3] ? 1 : 0;
    }
    this.inputNets = new Set(
      design.ports.filter((port) => port.direction !== 'output').flatMap((port) => port.bits),
    );
    let clockIsData = false;
    for (let i = 0; i < this.gates.length; i += 5)
      if (
        this.gates[i + 1] === clockNet ||
        this.gates[i + 2] === clockNet ||
        this.gates[i + 3] === clockNet
      )
        clockIsData = true;
    this.simple =
      clockNet !== null &&
      !clockIsData &&
      this.dffC.every((net) => net === clockNet) &&
      !this.dffD.some((net) => net === clockNet);
    this.settle();
    this.remember();
  }

  get gateCount() {
    return this.gates.length / 5;
  }
  get registerCount() {
    return this.dffC.length;
  }

  /** Drive an input of the design. Nets that are not inputs are ignored. */
  setInput(net: number, level: 0 | 1) {
    if (!this.inputNets.has(net) || net === this.clockNet) return;
    // A pad that the design can release shares the line with the plain input as one more driver.
    if (this.padDrivers.has(net) || this.triNets.has(net)) {
      this.drivePad(net, '', level);
      return;
    }
    if (this.values[net] === level) return;
    this.values[net] = level;
    this.dirty = true;
  }
  /**
   * Pull a pad of the design low or push it high from outside; null lets go. The line is the
   * wired-AND of everything attached that pulls low, and a pull-up when nothing drives it.
   * While the design itself drives a pad (its enable is 1) its own level wins.
   */
  drivePad(net: number, driver: string, level: 0 | 1 | null) {
    if (!this.inputNets.has(net) || net === this.clockNet) return;
    let drivers = this.padDrivers.get(net);
    if (!drivers) this.padDrivers.set(net, (drivers = new Map()));
    if (level === null) drivers.delete(driver);
    else drivers.set(driver, level);
    let resolved: 0 | 1 = 1;
    for (const value of drivers.values()) if (!value) resolved = 0;
    this.ext[net] = resolved;
    if (this.triNets.has(net)) this.dirty = true;
    else if (this.values[net] !== resolved) {
      this.values[net] = resolved;
      this.dirty = true;
    }
  }
  drivePadAt(cycle: number, net: number, driver: string, level: 0 | 1 | null) {
    this.queue({ cycle: Math.max(cycle, this.cycle), net, level, driver });
  }
  /** Drive an input at a later cycle: serial data, encoder steps, generators. */
  setInputAt(cycle: number, net: number, level: 0 | 1) {
    this.queue({ cycle: Math.max(cycle, this.cycle), net, level });
  }
  private queue(item: TimedInput) {
    let index = this.timed.length;
    while (index > 0 && this.timed[index - 1].cycle > item.cycle) index--;
    this.timed.splice(index, 0, item);
  }
  pendingInputs() {
    return this.timed.length;
  }

  probe(net: number, listener?: LabProbe['listener']): LabProbe {
    const level = (this.values[net] ? 1 : 0) as 0 | 1;
    const probe: LabProbe = {
      net,
      level,
      high: 0,
      rises: 0,
      changed: this.cycle,
      pulse: 0,
      period: 0,
      lastRise: -1,
      listener,
    };
    this.probes.push(probe);
    return probe;
  }
  removeProbe(probe: LabProbe) {
    const index = this.probes.indexOf(probe);
    if (index >= 0) this.probes.splice(index, 1);
  }
  /** Cycles a probe has been high up to now, including the level it currently holds. */
  highUntilNow(probe: LabProbe) {
    return probe.high + (probe.level ? this.cycle - probe.changed : 0);
  }

  /** Run whole clock cycles until the count or the time budget is used up. */
  run(cycles: number, budgetMs = Infinity): number {
    const start = performance.now();
    let done = 0;
    while (done < cycles) {
      const chunk = Math.min(256, cycles - done);
      for (let i = 0; i < chunk; i++) this.tick();
      done += chunk;
      if (performance.now() - start >= budgetMs) break;
    }
    return done;
  }

  /** Settle after input changes without advancing time (used while paused). */
  refresh() {
    if (!this.dirty) return;
    this.settleWithEdges();
    this.watch();
  }

  private tick() {
    while (this.timed.length && this.timed[0].cycle <= this.cycle) {
      const item = this.timed.shift()!;
      if (item.driver !== undefined) this.drivePad(item.net, item.driver, item.level);
      else if (item.level !== null && this.values[item.net] !== item.level) {
        this.values[item.net] = item.level;
        this.dirty = true;
      }
    }
    if (this.simple) {
      if (this.dirty) this.settle();
      const { values, dffD, dffQ, next } = this;
      const count = dffQ.length;
      for (let i = 0; i < count; i++) next[i] = values[dffD[i]];
      for (let i = 0; i < count; i++) values[dffQ[i]] = next[i];
      this.settle();
    } else {
      if (this.dirty) this.settleWithEdges();
      if (this.clockNet !== null) {
        this.values[this.clockNet] = 1;
        this.settleWithEdges();
        this.values[this.clockNet] = 0;
      }
      this.settleWithEdges();
    }
    this.cycle++;
    this.watch();
  }

  private remember() {
    const { values, dffC, dffD, clockPrev, dPrev } = this;
    for (let i = 0; i < dffC.length; i++) {
      clockPrev[i] = values[dffC[i]];
      dPrev[i] = values[dffD[i]];
    }
  }

  /** Settle, then let every flip-flop whose clock rose take the D it saw before the change. */
  private settleWithEdges() {
    const { values, dffC, dffQ, clockPrev, dPrev } = this;
    for (let round = 0; round < 32; round++) {
      this.settle();
      const { next } = this;
      let edges = 0;
      // 2 marks "no edge"; the new outputs are applied only after the settled state is
      // remembered, so a register clocked by another register sees that one's change.
      for (let i = 0; i < dffC.length; i++) {
        const rose = !clockPrev[i] && values[dffC[i]];
        next[i] = rose ? dPrev[i] : 2;
        if (rose) edges++;
      }
      this.remember();
      if (!edges) return;
      for (let i = 0; i < dffC.length; i++) if (next[i] !== 2) values[dffQ[i]] = next[i];
    }
  }

  private settle() {
    const v = this.values;
    const g = this.gates;
    for (let i = 0; i < g.length; i += 5) {
      const a = v[g[i + 1]];
      let y: number;
      switch (g[i]) {
        case LAB_OP.NOT:
          y = a ^ 1;
          break;
        case LAB_OP.AND:
          y = a & v[g[i + 2]];
          break;
        case LAB_OP.NAND:
          y = (a & v[g[i + 2]]) ^ 1;
          break;
        case LAB_OP.OR:
          y = a | v[g[i + 2]];
          break;
        case LAB_OP.NOR:
          y = (a | v[g[i + 2]]) ^ 1;
          break;
        case LAB_OP.XOR:
          y = a ^ v[g[i + 2]];
          break;
        case LAB_OP.XNOR:
          y = a ^ v[g[i + 2]] ^ 1;
          break;
        case LAB_OP.ANDNOT:
          y = a & (v[g[i + 2]] ^ 1);
          break;
        case LAB_OP.ORNOT:
          y = a | (v[g[i + 2]] ^ 1);
          break;
        case LAB_OP.MUX:
          y = v[g[i + 3]] ? v[g[i + 2]] : a;
          break;
        case LAB_OP.TRI:
          y = v[g[i + 2]] ? a : this.ext[g[i + 4]];
          break;
        default:
          y = a;
      }
      v[g[i + 4]] = y;
    }
    this.dirty = false;
  }

  private watch() {
    const { probes, values, cycle } = this;
    let fired = 0;
    // Bring every probe up to date before any listener runs, so that a part which looks at
    // several of its pins from one callback sees one consistent instant whatever the order.
    for (let i = 0; i < probes.length; i++) {
      const probe = probes[i];
      const level = values[probe.net] as 0 | 1;
      if (level === probe.level) continue;
      if (level) {
        probe.rises++;
        if (probe.lastRise >= 0) probe.period = cycle - probe.lastRise;
        probe.lastRise = cycle;
      } else {
        probe.high += cycle - probe.changed;
        probe.pulse = cycle - probe.changed;
      }
      probe.level = level;
      probe.changed = cycle;
      probe.fire = true;
      fired++;
    }
    if (!fired) return;
    for (let i = 0; i < probes.length; i++) {
      const probe = probes[i];
      if (!probe.fire) continue;
      probe.fire = false;
      probe.listener?.(probe.level, cycle);
    }
  }
}

/** Gates in an order where every input is computed before it is read. */
function orderGates(design: LabDesign): Int32Array {
  const count = design.gates.length / 5;
  const source = design.gates;
  const producer = new Int32Array(design.nets).fill(-1);
  for (let i = 0; i < count; i++) producer[source[i * 5 + 4]] = i;
  const inputsOf = (gate: number) => {
    const op = source[gate * 5];
    const list = [source[gate * 5 + 1]];
    if (op !== LAB_OP.NOT && op !== LAB_OP.BUF) list.push(source[gate * 5 + 2]);
    if (op === LAB_OP.MUX) list.push(source[gate * 5 + 3]);
    return list;
  };
  const waiting = new Int32Array(count);
  const readers: number[][] = Array.from({ length: count }, () => []);
  for (let i = 0; i < count; i++)
    for (const net of inputsOf(i)) {
      const from = producer[net];
      if (from >= 0) {
        waiting[i]++;
        readers[from].push(i);
      }
    }
  const order = new Int32Array(count * 5);
  const queue: number[] = [];
  for (let i = 0; i < count; i++) if (!waiting[i]) queue.push(i);
  let placed = 0;
  for (let head = 0; head < queue.length; head++) {
    const gate = queue[head];
    for (let k = 0; k < 5; k++) order[placed * 5 + k] = source[gate * 5 + k];
    placed++;
    for (const reader of readers[gate]) if (--waiting[reader] === 0) queue.push(reader);
  }
  if (placed !== count)
    throw new Error(
      'В схеме есть комбинационная петля: выход логики приходит на её же вход без регистра. Лаборатория не может её посчитать.',
    );
  return order;
}
