import type { Bit, YosysCell, YosysModule, YosysNetlist, YosysPort } from '../../shared/types';

export interface SourceLocation {
  file: string;
  line: number;
  endLine?: number;
}
export interface ResourceCounts {
  LUT: number;
  FF: number;
  ALU: number;
  BRAM: number;
  DSP: number;
  IO: number;
  other: number;
  total: number;
}
export interface HierarchyNode {
  id: string;
  name: string;
  moduleName: string;
  resources: ResourceCounts;
  children: HierarchyNode[];
  source: SourceLocation[];
  recursive?: boolean;
  truncated?: boolean;
}

function emptyResources(): ResourceCounts {
  return { LUT: 0, FF: 0, ALU: 0, BRAM: 0, DSP: 0, IO: 0, other: 0, total: 0 };
}

function attributeEnabled(value: string | number | undefined): boolean {
  if (typeof value === 'number') return value !== 0;
  return value !== undefined && value !== '' && /[1-9a-f]/i.test(value);
}

export function isExpandableModule(module: YosysModule | undefined): module is YosysModule {
  if (!module) return false;
  return !['blackbox', 'whitebox', 'lib', 'library'].some((key) =>
    attributeEnabled(module.attributes?.[key]),
  );
}

export function getSourceLocations(
  attributes: Record<string, string | number> | undefined,
): SourceLocation[] {
  const src = attributes?.src;
  if (typeof src !== 'string') return [];
  const locations: SourceLocation[] = [];
  for (const fragment of src.split('|')) {
    // A greedy filename allows drive letters and colons in Windows paths.
    const match = fragment.trim().match(/^(.+):(\d+)(?:\.\d+)?(?:-(\d+)(?:\.\d+)?)?$/);
    if (!match) continue;
    const location = {
      file: match[1],
      line: Number(match[2]),
      ...(match[3] ? { endLine: Number(match[3]) } : {}),
    };
    if (
      !locations.some(
        (item) =>
          item.file === location.file &&
          item.line === location.line &&
          item.endLine === location.endLine,
      )
    ) {
      locations.push(location);
    }
  }
  return locations;
}

export function resourceCategory(type: string): Exclude<keyof ResourceCounts, 'total'> {
  if (/^(LUT[1-9]|\$lut|\$_[A-Z]*LUT_)$/i.test(type)) return 'LUT';
  if (
    /^(DFF|SDFF|IDDR|ODDR)/i.test(type) ||
    /^\$(?:(?:a|al|s)?dff(?:e|ce|sr|sre)?|a?dlatch(?:sr)?|ff|sr)$/i.test(type) ||
    /^\$_(?:DFF(?:E|SR|SRE)?|ALDFF(?:E)?|SDFF(?:E|CE)?|DLATCH(?:SR)?|SR)_[PN01]+_$/i.test(type) ||
    type === '$_FF_'
  )
    return 'FF';
  if (/^(MULT|MULTADDALU|MULTALU|ALU54D|PADD|DSP)/i.test(type)) return 'DSP';
  if (/^ALU/i.test(type) || /^\$(add|sub|alu|macc|mul|div|mod|pow)$/i.test(type)) return 'ALU';
  // RAM16S/RAM32S are distributed memories; physical BRAM is only counted for known block primitives.
  if (/^(DPB|SDPB|SPB?|ROM|BSRAM)(?:$|_)/i.test(type) || /^\$mem/.test(type)) return 'BRAM';
  if (/^(I?O?BUF|IOBUF|TBUF|TLVDS|ELVDS|MIPI|I3C)/i.test(type)) return 'IO';
  return 'other';
}

export function getResources(netlist: YosysNetlist, moduleName: string): ResourceCounts {
  const cache = new Map<string, ResourceCounts>();
  function count(name: string, ancestors: Set<string>): ResourceCounts {
    if (ancestors.has(name)) return emptyResources();
    const cached = cache.get(name);
    if (cached) return { ...cached };
    const module = netlist.modules[name];
    const result = emptyResources();
    if (!isExpandableModule(module)) return result;
    const nextAncestors = new Set(ancestors).add(name);
    for (const cell of Object.values(module.cells)) {
      if (isExpandableModule(netlist.modules[cell.type])) {
        const child = count(cell.type, nextAncestors);
        for (const key of Object.keys(result) as (keyof ResourceCounts)[])
          result[key] += child[key];
      } else {
        result[resourceCategory(cell.type)] += 1;
        result.total += 1;
      }
    }
    cache.set(name, result);
    return { ...result };
  }
  return count(moduleName, new Set());
}

export function getHierarchy(netlist: YosysNetlist, top: string): HierarchyNode {
  let remaining = 2000;
  function visit(
    moduleName: string,
    instance: string,
    path: string,
    ancestors: Set<string>,
    source?: SourceLocation[],
  ): HierarchyNode {
    const module = netlist.modules[moduleName];
    const node: HierarchyNode = {
      id: path,
      name: instance,
      moduleName,
      resources: getResources(netlist, moduleName),
      children: [],
      source: source ?? getSourceLocations(module?.attributes),
    };
    if (ancestors.has(moduleName)) return { ...node, recursive: true };
    remaining -= 1;
    if (!isExpandableModule(module)) return node;
    if (remaining <= 0) return { ...node, truncated: true };
    const nextAncestors = new Set(ancestors).add(moduleName);
    for (const [name, cell] of Object.entries(module.cells)) {
      if (remaining <= 0) {
        node.truncated = true;
        break;
      }
      if (isExpandableModule(netlist.modules[cell.type])) {
        node.children.push(
          visit(
            cell.type,
            name,
            `${path}/${name}`,
            nextAncestors,
            getSourceLocations(cell.attributes),
          ),
        );
      }
    }
    return node;
  }
  return visit(top, top, top, new Set());
}

function parameterNumber(value: string | number | undefined): number | null {
  if (typeof value === 'number') return value;
  if (!value) return null;
  if (/^[01]+$/.test(value)) return parseInt(value, 2);
  if (/^\d+'h[\da-f]+$/i.test(value)) return parseInt(value.split("'h")[1], 16);
  if (/^0x[\da-f]+$/i.test(value)) return parseInt(value, 16);
  if (/^\d+$/.test(value)) return Number(value);
  return null;
}

export function getLutInputCount(cell: YosysCell): number | null {
  const typeWidth = cell.type.match(/^LUT([1-6])$/i);
  if (typeWidth) return Number(typeWidth[1]);
  if (cell.type === '$lut') {
    const width = parameterNumber(cell.parameters.WIDTH) ?? cell.connections.A?.length;
    return width !== undefined && width !== null && width >= 1 && width <= 6 ? width : null;
  }
  return null;
}

export type TruthValue = '0' | '1' | 'x' | 'z' | '?';
export interface LutTruthRow {
  index: number;
  inputs: (0 | 1)[];
  output: TruthValue;
}

function parameterBits(value: string | number | undefined, width: number): string {
  if (value === undefined) return '?'.repeat(width);
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value < 0) return '?'.repeat(width);
    return BigInt(value).toString(2).padStart(width, '0');
  }
  const cleaned = value.trim().replace(/_/g, '').toLowerCase();
  if (/^[01xz]+$/.test(cleaned)) {
    const pad = /^[xz]/.test(cleaned) ? cleaned[0] : '0';
    return cleaned.padStart(width, pad);
  }
  const hex = cleaned.match(/^(?:\d+'h|0x)([\da-fxz]+)$/)?.[1];
  if (hex) {
    const bits = [...hex]
      .map((digit) =>
        /[xz]/.test(digit) ? digit.repeat(4) : parseInt(digit, 16).toString(2).padStart(4, '0'),
      )
      .join('');
    return bits.padStart(width, /^[xz]/.test(bits) ? bits[0] : '0');
  }
  return '?'.repeat(width);
}

export function getLutTruthTable(cell: YosysCell): LutTruthRow[] | null {
  const inputs = getLutInputCount(cell);
  if (inputs === null) return null;
  const count = 2 ** inputs;
  const parameter = cell.type === '$lut' ? cell.parameters.LUT : cell.parameters.INIT;
  // Yosys serializes parameters MSB first; I0 (A[0] for $lut) is the address LSB.
  const bits = parameterBits(parameter, count).slice(-count).split('').reverse();
  return Array.from({ length: count }, (_, index) => ({
    index,
    inputs: Array.from({ length: inputs }, (_, bit) => ((index >> bit) & 1) as 0 | 1),
    output: (bits[index] ?? '?') as TruthValue,
  }));
}

export interface GraphPort {
  id: string;
  name: string;
  direction: 'input' | 'output' | 'inout';
  bits: Bit[];
  offset?: number;
  upto?: number;
}
export interface GraphNode {
  id: string;
  name: string;
  type: string;
  kind: 'cell' | 'input' | 'output' | 'inout' | 'constant' | 'undriven';
  cellName?: string;
  moduleName?: string;
  ports: GraphPort[];
  source: SourceLocation[];
}
export interface GraphEdge {
  id: string;
  source: string;
  sourcePort: string;
  target: string;
  targetPort: string;
  bits: Bit[];
  width: number;
  label: string;
}
export interface NetlistGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  totalCells: number;
  hiddenCells: number;
  hiddenEdges: number;
}
interface Endpoint {
  node: string;
  port: string;
  bits: Bit[];
  direction: GraphPort['direction'];
}

export function buildGraph(
  netlist: YosysNetlist,
  moduleName: string,
  options: { maxCells?: number; selectedCell?: string | null; maxEdges?: number } = {},
): NetlistGraph {
  const module = netlist.modules[moduleName];
  if (!module) return { nodes: [], edges: [], totalCells: 0, hiddenCells: 0, hiddenEdges: 0 };
  const cellEntries = Object.entries(module.cells);
  const maxCells = options.maxCells ?? 180;
  const visible = cellEntries.slice(0, maxCells);
  const selected = options.selectedCell
    ? cellEntries.find(([name]) => name === options.selectedCell)
    : undefined;
  if (selected && !visible.some(([name]) => name === selected[0])) {
    if (visible.length >= maxCells) visible.pop();
    visible.push(selected);
  }
  const visibleNames = new Set(visible.map(([name]) => name));
  const nodes: GraphNode[] = [];
  const endpoints: Endpoint[] = [];
  const drivers = new Map<Bit, Endpoint[]>();
  const knownDrivers = new Set<Bit>();

  function addEndpoint(endpoint: Endpoint, displayed: boolean) {
    if (endpoint.direction !== 'input') {
      for (const bit of endpoint.bits) {
        if (typeof bit !== 'number') continue;
        knownDrivers.add(bit);
        if (displayed) {
          const existing = drivers.get(bit) ?? [];
          if (!existing.some((driver) => driver.port === endpoint.port))
            drivers.set(bit, [...existing, endpoint]);
        }
      }
    }
    if (displayed) endpoints.push(endpoint);
  }
  function makePort(
    nodeId: string,
    name: string,
    direction: GraphPort['direction'],
    bits: Bit[],
    definition?: YosysPort,
  ): GraphPort {
    return {
      id: `${nodeId}/p:${name}`,
      name,
      direction,
      bits,
      ...(definition?.offset !== undefined ? { offset: definition.offset } : {}),
      ...(definition?.upto !== undefined ? { upto: definition.upto } : {}),
    };
  }

  for (const [name, port] of Object.entries(module.ports)) {
    const id = `port:${name}`;
    // A module input drives cells inside that module; its direction is reversed in the graph.
    const direction =
      port.direction === 'input' ? 'output' : port.direction === 'output' ? 'input' : 'inout';
    const graphPort = makePort(id, name, direction, port.bits, port);
    nodes.push({
      id,
      name,
      type: port.bits.length > 1 ? `${port.bits.length} бит` : '1 бит',
      kind: port.direction,
      ports: [graphPort],
      source: getSourceLocations(module.netnames[name]?.attributes),
    });
    addEndpoint({ node: id, port: graphPort.id, direction, bits: port.bits }, true);
  }
  for (const [name, cell] of cellEntries) {
    const id = `cell:${name}`;
    const displayed = visibleNames.has(name);
    const childModule = netlist.modules[cell.type];
    const ports = Object.entries(cell.connections).map(([portName, bits]) => {
      const direction =
        cell.port_directions?.[portName] ?? childModule?.ports[portName]?.direction ?? 'input';
      const port = makePort(id, portName, direction, bits, childModule?.ports[portName]);
      addEndpoint({ node: id, port: port.id, direction, bits }, displayed);
      return port;
    });
    if (displayed)
      nodes.push({
        id,
        name,
        type: cell.type,
        kind: 'cell',
        cellName: name,
        ...(isExpandableModule(childModule) ? { moduleName: cell.type } : {}),
        ports,
        source: getSourceLocations(cell.attributes),
      });
  }

  const edgeGroups = new Map<string, Omit<GraphEdge, 'id' | 'width' | 'label'>>();
  const special = new Map<string, Endpoint>();
  const maxEdges = options.maxEdges ?? 1600;
  let hiddenEdges = 0;
  function specialEndpoint(bit: Bit): Endpoint {
    const key = typeof bit === 'string' ? bit : '?';
    const existing = special.get(key);
    if (existing) return existing;
    const id = `constant:${key}`;
    const port = makePort(id, 'Y', 'output', [bit]);
    const endpoint: Endpoint = { node: id, port: port.id, direction: 'output', bits: [bit] };
    special.set(key, endpoint);
    nodes.push({
      id,
      name: key === '?' ? 'Нет драйвера' : key.toUpperCase(),
      type: key === '?' ? 'Сигнал без источника' : 'Константа',
      kind: key === '?' ? 'undriven' : 'constant',
      ports: [port],
      source: [],
    });
    return endpoint;
  }
  for (const sink of endpoints) {
    if (sink.direction === 'output') continue;
    for (const bit of sink.bits) {
      let sources = typeof bit === 'string' ? [specialEndpoint(bit)] : (drivers.get(bit) ?? []);
      if (typeof bit === 'number' && !knownDrivers.has(bit)) sources = [specialEndpoint(bit)];
      for (const source of sources) {
        if (source.port === sink.port) continue;
        const key = `${source.port}\u0000${sink.port}`;
        let group = edgeGroups.get(key);
        if (!group) {
          if (edgeGroups.size >= maxEdges) {
            hiddenEdges += 1;
            continue;
          }
          group = {
            source: source.node,
            sourcePort: source.port,
            target: sink.node,
            targetPort: sink.port,
            bits: [],
          };
          edgeGroups.set(key, group);
        }
        group.bits.push(bit);
      }
    }
  }
  const namedNets = Object.entries(module.netnames).filter(([, net]) => !net.hide_name);
  const edges = [...edgeGroups.values()].map((edge, index) => {
    const sameNet = namedNets.find(
      ([, net]) =>
        net.bits.length === edge.bits.length &&
        net.bits.every((bit, position) => bit === edge.bits[position]),
    );
    const width = edge.bits.length;
    return {
      ...edge,
      id: `edge:${index}`,
      width,
      label: sameNet ? sameNet[0] : width > 1 ? `${width} бит` : '',
    };
  });
  return {
    nodes,
    edges,
    totalCells: cellEntries.length,
    hiddenCells: cellEntries.length - visible.length,
    hiddenEdges,
  };
}
