// The bench: an orthographic camera at a fixed 43° elevation that turns in 90° steps, soft
// shadows from a dedicated shadow light, an ink outline pass and on-demand rendering.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { lookOf, partCatalog, partPinNames } from '../../../shared/catalog';
import type { McuBoardId } from '../../../shared/mcu';
import {
  mcuBoards,
  type CircuitPart,
  type McuProject,
  type SignalEdge,
  type SimulationFrame,
} from '../../../shared/mcu';
import { wireRoles, type CircuitSolution } from '../../../shared/sim/circuit';
import {
  boardLayout,
  dockShift,
  padOfHole,
  PCB,
  STANDOFF,
  partCenter,
  benchLayout,
  partLayout,
  partOrigin,
  terminalSpots,
  turnOffset,
  type Moved,
  type PartLayout,
  wireColor,
  type PinSpot,
  type Vec3,
  PITCH as LEAD_PITCH,
} from './layout';
import { FLAT, OUTLINED, flat, type Pick } from './materials';
import {
  discreteKinds,
  leadHoles,
  leadOffsets,
  occupiedHoles,
  mountWarning,
  contactHoles,
  standaloneKinds,
  type Mount,
} from '../../../shared/mount';
import {
  KNOBS,
  dialAt,
  dialIndex,
  dialPixelsPerStep,
  dialStep,
  dialValue,
  probeColor,
  PANEL,
  scopeFront,
} from './scope-layout';
import { CARRY_LIFT, buildBoard, buildPart, type BoardModel, type Model } from './models';
import { boardParts, type BoardPart } from './board-parts';
import { fpgaPadNote, pinNote, componentPinNote } from './pin-info';
import type { ScopeChannel, ScopeFeed, ScopeSample } from '../scope';
import { OutlineRenderer } from './outline';
import { PinLabels, type LabelPin } from './pin-labels';
import { physicalPinLabel } from './board-packages';
import { badgeTexture, glowTexture, setMaxAnisotropy } from './textures';
import { canMount } from '../../../shared/physical';
import { breadboardStrip } from '../../../shared/breadboard';
import { buildWire, previewWire, type WireModel } from './wires';
import { buildTool, type ToolModel } from './tools';
import { t } from '../../../../../../../shared/i18n';
import { HAND_HEIGHT, toolAngle, toolHeight, toolInfo, type BenchTool } from '../environment';

const ELEVATION = (43 * Math.PI) / 180;
const BASE_AZIMUTH = (36 * Math.PI) / 180;
const QUARTER = Math.PI / 2;
const DISTANCE = 600;
const ZOOM = { min: 1.2, max: 22 };

export interface StageInput {
  project: McuProject;
  frame: SimulationFrame;
  solution: CircuitSolution;
  selected: string;
  pending: string;
  /** Flashlight, burner and the other bench tools. */
  tools?: BenchTool[];
  /** Every pin change since the run began; oscilloscopes redraw their traces from it. */
  edges?: SignalEdge[];
  /** Brightness 0 … 1 of the six LEDs of the board. */
  boardLeds?: readonly number[];
  /** Which keys of the board are held down, S1 then S2. */
  boardKeys?: readonly boolean[];
}
export interface HoverInfo {
  x: number;
  y: number;
  title: string;
  detail?: string;
}
export interface PlacementInfo {
  title: string;
  detail: string;
  tone: 'valid' | 'warning' | 'invalid';
}
export interface StageEvents {
  placement?: (info: PlacementInfo | null) => void;
  select: (id: string) => void;
  terminal: (id: string) => void;
  connect: (from: string, to: string) => void;
  replug: (wire: string, end: 'from' | 'to', terminal: string) => void;
  move: (id: string, x: number, y: number, mount: Mount | null) => void;
  context: (info: ContextInfo) => void;
  value: (id: string, value: number, index?: number) => void;
  cancel: () => void;
  hover: (info: HoverInfo | null) => void;
  /** A bench tool was dragged to a new spot on the table. */
  tool?: (id: string, x: number, z: number) => void;
  /** A bench tool was turned or raised with the wheel. */
  toolPose?: (id: string, pose: { angle?: number; height?: number }) => void;
  view: () => void;
  /** The pointer rests on a named board part ('part:usb') or pin ('pin:D13'); '' when on neither. */
  inspect?: (id: string) => void;
  /** A part was refused its spot; says why. */
  notice?: (text: string) => void;
  /** A key of the FPGA board was pressed or let go. */
  boardKey?: (id: 'S1' | 'S2', down: boolean) => void;
}
export interface ContextInfo {
  x: number;
  y: number;
  target: { type: 'part' | 'wire' | 'tool'; id: string } | { type: 'board' } | null;
}
export interface Theme {
  dark: boolean;
}

type Mode =
  | { kind: 'idle' }
  | {
      kind: 'pan';
      x: number;
      y: number;
      moved: boolean;
      target: THREE.Vector3;
      clear: boolean;
      menu?: boolean;
    }
  | { kind: 'rotate'; x: number; turned: number }
  | { kind: 'pull'; from: string; x: number; y: number; moved: boolean }
  | { kind: 'replug'; wire: string; end: 'from' | 'to'; anchor: string; x: number; y: number }
  | {
      kind: 'part';
      id: string;
      x: number;
      y: number;
      grab: THREE.Vector3;
      origin: Vec3;
      moved: boolean;
      center: Vec3;
      mount: Mount | null;
    }
  | { kind: 'press'; id: string }
  | { kind: 'boardkey'; id: 'S1' | 'S2' }
  | { kind: 'tool'; id: string; dx: number; dz: number }
  | { kind: 'knob'; id: string; angle: number; value: number }
  /** A bench instrument's knob turned by dragging: `fraction` is its travel, 0 … 1. */
  | {
      kind: 'dial';
      id: string;
      knob: number;
      x: number;
      y: number;
      /** Screen position of the knob's centre, to tell a click on its right half from its left. */
      cx: number;
      start: number;
      travelled: number;
      moved: boolean;
      last: number;
    }
  | { kind: 'slide'; id: string; x: number; value: number }
  /** A joystick held: its lean is read from how far the pointer moved. */
  | { kind: 'stick'; id: string; x: number; y: number; bits: number; moved: boolean };

/** The press of a joystick as the bit of its value (up, down, left and right are bits 0 … 3). */
const JOYSTICK_PRESS = 16;

/** Bounds of the outlined meshes only: glows and beams would inflate a plain bounding box. */
function solidBox(object: THREE.Object3D) {
  const box = new THREE.Box3();
  object.updateWorldMatrix(true, true);
  object.traverse((child) => {
    if (child instanceof THREE.Mesh && child.layers.isEnabled(OUTLINED))
      box.expandByObject(child, false);
  });
  return box;
}
/** One colour per breadboard strip, so the leads of one part show as separate nets. */
const STRIP_COLORS = ['#1aa3a1', '#d9ac3f', '#8a72c8', '#3d8fd6', '#5fbf4a', '#ba83b0'];
const FLASH_MS = 1400;
/** What a header hole without a terminal does, for its tooltip. */
function inertPinNote(label: string) {
  if (/^GND/.test(label))
    return t('дополнительный контакт земли · провод ставится на другой GND платы');
  if (label === 'SDA') return t('I²C · тот же контакт, что A4');
  if (label === 'SCL') return t('I²C · тот же контакт, что A5');
  if (label === 'VIN') return t('вход питания платы · в модели не используется');
  if (label === 'RESET') return t('сброс платы · в модели не используется');
  return t('в модели не используется');
}
/** Grows an instanced overlay mesh to at least `count` instances. */
function instanced(
  current: THREE.InstancedMesh | null,
  count: number,
  make: () => { geometry: THREE.BufferGeometry; material: THREE.Material },
  parent: THREE.Object3D,
  order: number,
) {
  if (current && current.instanceMatrix.count >= count) return current;
  if (current) {
    parent.remove(current);
    current.geometry.dispose();
    (current.material as THREE.Material).dispose();
  }
  const { geometry, material } = make(),
    mesh = new THREE.InstancedMesh(geometry, material, Math.max(16, count * 2));
  mesh.layers.set(FLAT);
  mesh.renderOrder = order;
  mesh.frustumCulled = false;
  mesh.count = 0;
  parent.add(mesh);
  return mesh;
}
const printed = (board: McuBoardId, label: string) => {
  const text = physicalPinLabel(board, label);
  return text === 'G' ? 'GND' : text;
};
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export class Stage {
  readonly renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 2000);
  private outline: OutlineRenderer;
  private content = new THREE.Group();
  private overlay = new THREE.Group();
  private shadowLight = new THREE.DirectionalLight('#ffffff', 0.001);
  private grid: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private ground: THREE.Mesh<THREE.PlaneGeometry, THREE.ShadowMaterial>;
  private raycaster = new THREE.Raycaster();
  private width = 1;
  private height = 1;
  private pixelRatio = 1;
  // View state; goals are eased towards.
  private target = new THREE.Vector3();
  private targetGoal = new THREE.Vector3();
  private zoom = 4;
  private zoomGoal = 4;
  private azimuth = BASE_AZIMUTH;
  private turn = { from: BASE_AZIMUTH, to: BASE_AZIMUTH, start: 0, duration: 0 };
  private quarter = 0;
  private velocity = new THREE.Vector2();
  private keys = new Set<string>();
  private fitted = false;
  // Content.
  private board: BoardModel | null = null;
  private boardId = '';
  private parts = new Map<string, { model: Model; key: string; part: CircuitPart }>();
  private wires = new Map<string, { model: WireModel; key: string }>();
  private spots = new Map<string, PinSpot>();
  private input: StageInput | null = null;
  private ring: THREE.Mesh | null = null;
  private marker: THREE.Mesh;
  /** Breadboard holes joined with the hovered or just connected terminal. */
  private strips: THREE.InstancedMesh | null = null;
  private flash: { groups: string[][]; until: number } | null = null;
  /** Glow over the header pins of the board that are HIGH. */
  private pinGlow: THREE.InstancedMesh | null = null;
  private tools = new Map<string, { model: ToolModel; kind: BenchTool['kind']; tool: BenchTool }>();
  /** Parts just plugged into a breadboard: they sink onto their leads, polarity shown. */
  private drops = new Map<string, { start: number; height: number }>();
  /** The part held in the air by the pointer, and the one that has just been let go. */
  private carrying = '';
  private landing = '';
  /** Rings on the exact holes the leads of a carried part will go into. */
  private holeMarks = new THREE.Group();
  private holeMarkKey = '';
  /** Permanent + / − marks beside the leads of LEDs and other polarised parts. */
  private polarity = new Map<string, { key: string; sprites: THREE.Sprite[] }>();
  /** Voltage samples of the nets oscilloscope probes touch, for nets no board pin drives. */
  private scopeSamples = new Map<string, ScopeSample[][]>();
  /** Named parts of the current board, the one under the pointer and those a lesson points at. */
  private boardPartList: BoardPart[] = [];
  private boardHot = '';
  private inspected = '';
  private lessonHot: string[] = [];
  private boardMarks = new THREE.Group();
  /** Pulsing rings that tell a student which pins a lesson step is about. */
  private guideRings = new THREE.Group();
  private guidePinIds: string[] = [];
  /** The knob objects of every oscilloscope on the bench, by part id, in KNOBS order. */
  private knobHolders = new Map<string, THREE.Object3D[]>();
  private knobMark: { key: string; mesh: THREE.Mesh } | null = null;
  private wheelBuffer = 0;
  private toolLayer = new THREE.Group();
  private preview: ReturnType<typeof previewWire> | null = null;
  /** The jumper whose end is being re-plugged is hidden while its preview follows the pointer. */
  private hiddenWire = '';
  private mode: Mode = { kind: 'idle' };
  private hoverTerminal = '';
  private dirty = true;
  private frameRequest = 0;
  private animating = false;
  private last = performance.now();
  private observer: ResizeObserver;
  private disposed = false;
  private pinLabels: PinLabels;
  private dark = false;
  private inertLabels = new Map<string, LabelPin[]>();
  private labelKey = '';
  private labelProject: McuProject | null = null;
  private labelSpots: Map<string, PinSpot> | null = null;

  constructor(
    private host: HTMLElement,
    private events: StageEvents,
  ) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
      premultipliedAlpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.VSMShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.autoClear = false;
    setMaxAnisotropy(this.renderer.capabilities.getMaxAnisotropy());
    const canvas = this.renderer.domElement;
    canvas.className = 'bench-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    host.prepend(canvas);
    this.pinLabels = new PinLabels(host);
    this.outline = new OutlineRenderer(this.renderer);

    const environment = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this.scene.environment = environment.fromScene(room, 0.04).texture;
    this.scene.environmentIntensity = 0.4;
    room.dispose();
    environment.dispose();

    const hemisphere = new THREE.HemisphereLight('#fffaf3', '#c2ae90', 0.5);
    const key = new THREE.DirectionalLight('#fff6ea', 1.2);
    key.position.set(-55, 100, 62);
    // A near-invisible light whose only job is casting soft, warm shadows from the upper right.
    const shadow = this.shadowLight;
    shadow.castShadow = true;
    shadow.shadow.mapSize.set(2048, 2048);
    shadow.shadow.radius = 11;
    shadow.shadow.blurSamples = 20;
    shadow.shadow.bias = -0.0004;
    this.scene.add(hemisphere, key, key.target, shadow, shadow.target);

    this.ground = new THREE.Mesh(
      new THREE.PlaneGeometry(4000, 4000),
      new THREE.ShadowMaterial({ color: '#7a5532', opacity: 0.32, depthWrite: false }),
    );
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.ground.layers.set(FLAT);
    this.ground.renderOrder = -1;
    this.grid = new THREE.Mesh(
      new THREE.PlaneGeometry(4000, 4000),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
          center: { value: new THREE.Vector2() },
          radius: { value: new THREE.Vector2(60, 140) },
          color: { value: new THREE.Color('#d9c7ae') },
          cell: { value: 10.16 },
        },
        vertexShader: /* glsl */ `
          varying vec2 vWorld;
          void main() {
            vec4 world = modelMatrix * vec4(position, 1.0);
            vWorld = world.xz;
            gl_Position = projectionMatrix * viewMatrix * world;
          }`,
        fragmentShader: /* glsl */ `
          uniform vec2 center;
          uniform vec2 radius;
          uniform vec3 color;
          uniform float cell;
          varying vec2 vWorld;
          void main() {
            vec2 g = abs(fract(vWorld / cell - 0.5) - 0.5) / fwidth(vWorld / cell);
            float line = 1.0 - min(min(g.x, g.y), 1.0);
            float fade = 1.0 - smoothstep(radius.x, radius.y, length(vWorld - center));
            gl_FragColor = vec4(color, line * fade * 0.85);
            #include <colorspace_fragment>
          }`,
      }),
    );
    this.grid.rotation.x = -Math.PI / 2;
    this.grid.position.y = -0.05;
    this.grid.layers.set(FLAT);
    this.grid.renderOrder = -2;
    this.scene.add(this.grid, this.ground, this.content, this.overlay);
    this.overlay.add(this.guideRings, this.holeMarks);

    this.marker = new THREE.Mesh(
      new THREE.RingGeometry(1.5, 2.1, 32),
      new THREE.MeshBasicMaterial({ color: '#1aa3a1', depthTest: false, transparent: true }),
    );
    this.marker.rotation.x = -Math.PI / 2;
    this.marker.layers.set(FLAT);
    this.marker.renderOrder = 10;
    this.marker.visible = false;
    this.overlay.add(this.marker);

    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host);
    this.resize();
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointercancel', this.onPointerUp);
    canvas.addEventListener('pointerleave', this.onPointerLeave);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    canvas.addEventListener('dblclick', this.onDoubleClick);
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  // ------------------------------------------------------------ public API

  setTheme({ dark }: Theme) {
    this.dark = dark;
    this.outline.setLineColor(dark ? '#08090a' : '#141a2c');
    this.grid.material.uniforms.color!.value.set(dark ? '#33353b' : '#d9c7ae');
    this.ground.material.color.set(dark ? '#000000' : '#7a5532');
    this.ground.material.opacity = dark ? 0.45 : 0.32;
    this.requestRender();
  }

  sync(input: StageInput) {
    const previous = this.input;
    this.input = input;
    const { project } = input;
    if (!previous || previous.project !== project) this.syncContent(project);
    this.syncTools(input.tools ?? []);
    this.syncLive();
    this.syncSelection();
    this.syncPolarity(project);
    if (!this.fitted) {
      this.fitted = true;
      this.fit(false);
    }
    this.requestRender();
  }

  /**
   * Where a new part let go at a screen point (client pixels) would stand: its place on the
   * bench and the holes it would plug into, if it is over a breadboard where it fits.
   */
  dropAt(client: { clientX: number; clientY: number }, part: CircuitPart) {
    const input = this.input;
    const ground = input && this.groundAt(this.pointer(client));
    if (!input || !ground) return null;
    const center = { x: ground.x, y: 0, z: ground.z };
    const mount = this.mountAt(input.project, part, center);
    return { ...partOrigin(part, center), mount };
  }

  showTerminalInfo(id: string) {
    this.hoverTerminal = id;
    this.events.hover(id ? this.terminalInfo(id) : null);
    this.updateMarker();
    this.requestRender();
  }

  /** Screen position of a world point in CSS pixels relative to the host. */
  project(point: Vec3) {
    const v = new THREE.Vector3(point.x, point.y, point.z).project(this.camera);
    return { x: ((v.x + 1) / 2) * this.width, y: ((1 - v.y) / 2) * this.height };
  }
  partAnchor(id: string) {
    const part = this.parts.get(id);
    if (!part) return null;
    // The right-hand corner of the footprint as seen from the current camera angle.
    const box = solidBox(part.model.group);
    let best = { x: -Infinity, y: 0 };
    for (const x of [box.min.x, box.max.x])
      for (const z of [box.min.z, box.max.z]) {
        const screen = this.project({ x, y: box.min.y, z });
        if (screen.x > best.x) best = screen;
      }
    return best;
  }
  /** Names printed next to every contact; the toggle lives in the view controls. */
  setPinLabels(on: boolean) {
    this.pinLabels.enabled = on;
    this.labelKey = '';
    this.requestRender();
  }
  private drawPinLabels() {
    const input = this.input;
    if (!input || !this.pinLabels.enabled) {
      this.labelKey = '';
      return this.pinLabels.draw(
        [],
        (p) => this.project(p),
        { width: this.width, height: this.height },
        this.dark,
        new Set(),
      );
    }
    // Redrawing the names costs a layout pass; skip it while nothing they depend on has moved.
    const key = [
      this.zoom.toFixed(3),
      this.azimuth.toFixed(4),
      this.target.x.toFixed(2),
      this.target.z.toFixed(2),
      input.selected,
      input.project.board,
      this.width,
      this.height,
      this.dark,
      this.boardPartList.length,
    ].join('|');
    if (
      key === this.labelKey &&
      input.project === this.labelProject &&
      this.spots === this.labelSpots
    )
      return;
    this.labelKey = key;
    this.labelProject = input.project;
    this.labelSpots = this.spots;
    const board = input.project.board,
      pins: LabelPin[] = [];
    const shift = dockShift(input.project),
      shiftKey = `${board}:${shift ? `${shift.x.toFixed(2)},${shift.z.toFixed(2)}` : ''}`;
    let inert = this.inertLabels.get(shiftKey);
    if (!inert) {
      inert = boardLayout(board, shift)
        .pins.filter((pin) => pin.label && !pin.terminal)
        .map((pin) => ({
          x: pin.x,
          y: pin.y,
          z: pin.z,
          text: printed(board, pin.label),
          owner: 'board',
          rank: 1,
        }));
      this.inertLabels.set(shiftKey, inert);
    }
    const breadboards = new Set(
      input.project.parts.filter((part) => part.kind === 'breadboard').map((part) => part.id),
    );
    const mounted = new Set(
      input.project.parts.filter((part) => part.mount).map((part) => part.id),
    );
    for (const [id, spot] of this.spots) {
      if (!spot.label || id.endsWith(':')) continue;
      const owner = id.slice(0, id.indexOf(':'));
      // Breadboard holes carry their own printed row and column names.
      if (breadboards.has(owner)) continue;
      // A part seated on a breadboard already shows its holes; names appear once it is selected.
      if (mounted.has(owner) && owner !== input.selected) continue;
      pins.push({
        x: spot.x,
        y: spot.y,
        z: spot.z,
        text: owner === 'board' ? printed(board, spot.label) : spot.label,
        owner,
        rank: owner === 'board' ? 1 : 0,
      });
    }
    pins.push(...inert);
    // Components of the board are named too (USB, RESET, crystal, regulator…).
    const group = this.board?.group;
    if (group && !input.selected) {
      group.updateWorldMatrix(true, false);
      for (const part of this.boardPartList) {
        if (part.w > 30 || part.d > 30) continue;
        const at = group.localToWorld(new THREE.Vector3(part.x, part.h + 1, part.z));
        pins.push({
          x: at.x,
          y: at.y,
          z: at.z,
          text: part.title.length > 24 ? `${part.title.slice(0, 23)}…` : part.title,
          owner: 'board-part',
          rank: 3,
          tone: '#6b7bd6',
        });
      }
    }
    // Names would bury a zoomed-out bench: show them once neighbouring pins are a few pixels apart.
    const a = this.project({ x: 0, y: 0, z: 0 }),
      b = this.project({ x: LEAD_PITCH, y: 0, z: 0 }),
      c = this.project({ x: 0, y: 0, z: LEAD_PITCH }),
      pitch = Math.max(Math.hypot(a.x - b.x, a.y - b.y), Math.hypot(a.x - c.x, a.y - c.y));
    this.pinLabels.draw(
      pitch >= 13 ? pins : pitch >= 5 ? pins.filter((pin) => pin.owner === input.selected) : [],
      (p) => this.project(p),
      { width: this.width, height: this.height },
      this.dark,
      new Set([input.selected]),
    );
  }
  /** Point of the table at the centre of the view, where a new tool appears. */
  viewCenter() {
    return { x: this.targetGoal.x, z: this.targetGoal.z };
  }
  rotate(direction: 1 | -1) {
    this.quarter += direction;
    const to = BASE_AZIMUTH + this.quarter * QUARTER;
    this.turn = { from: this.azimuth, to, start: performance.now(), duration: 620 };
    this.requestRender();
  }
  zoomBy(factor: number) {
    this.zoomGoal = THREE.MathUtils.clamp(this.zoomGoal * factor, ZOOM.min, ZOOM.max);
    this.requestRender();
  }
  /** Frames the whole bench, or the given part. */
  fit(animate = true, id?: string, lift = 0) {
    const box = new THREE.Box3();
    if (id) {
      const part = this.parts.get(id);
      if (part) box.copy(solidBox(part.model.group));
    } else box.copy(solidBox(this.content));
    this.frameBox(box, id ? ZOOM.max : 9, animate, lift);
  }
  /** Moves and zooms the camera so that the box fills the view. */
  private frameBox(box: THREE.Box3, maxZoom: number, animate = true, lift = 0) {
    if (box.isEmpty()) return;
    const corners: THREE.Vector3[] = [];
    for (const x of [box.min.x, box.max.x])
      for (const y of [box.min.y, box.max.y])
        for (const z of [box.min.z, box.max.z]) corners.push(new THREE.Vector3(x, y, z));
    const center = box.getCenter(new THREE.Vector3());
    center.y = 0;
    // Measure the projected extent with the camera already aimed at the new centre.
    const view = this.cameraBasis();
    let w = 0,
      h = 0;
    for (const corner of corners) {
      const d = corner.clone().sub(center);
      w = Math.max(w, Math.abs(d.dot(view.right)));
      h = Math.max(h, Math.abs(d.dot(view.up)));
    }
    const zoom = THREE.MathUtils.clamp(
      Math.min((this.width * 0.42) / Math.max(w, 1), (this.height * 0.42) / Math.max(h, 1)),
      ZOOM.min,
      maxZoom,
    );
    // `lift` leaves that share of the view free at the bottom, e.g. for a lesson card.
    if (lift)
      center.addScaledVector(
        new THREE.Vector3(-view.up.x, 0, -view.up.z).normalize(),
        (lift * this.height) / zoom / Math.sin(ELEVATION),
      );
    this.targetGoal.copy(center);
    this.zoomGoal = zoom;
    if (!animate) {
      this.target.copy(center);
      this.zoom = zoom;
    }
    this.requestRender();
  }
  /** Frames one named part of the board (see board-parts.ts), or the whole board for the empty id. */
  focusBoard(id: string, margin = 12, lift = 0) {
    const group = this.board?.group;
    if (!group) return;
    const part = this.boardPartList.find((item) => item.id === id),
      box = new THREE.Box3();
    group.updateWorldMatrix(true, true);
    if (part)
      for (const x of [part.x - part.w / 2 - margin, part.x + part.w / 2 + margin])
        for (const z of [part.z - part.d / 2 - margin, part.z + part.d / 2 + margin])
          for (const y of [0, part.h + 6])
            box.expandByPoint(group.localToWorld(new THREE.Vector3(x, y, z)));
    else box.copy(solidBox(group));
    this.frameBox(box, ZOOM.max, true, lift);
  }
  /**
   * The oscilloscope knob under the pointer. Knobs are small, so this works in screen space with a
   * reach a little beyond the cap, and only for knobs that face the camera.
   */
  private knobAt(point: { x: number; y: number }) {
    const input = this.input;
    if (!input) return null;
    const direction = this.camera.getWorldDirection(new THREE.Vector3());
    let best: { part: CircuitPart; index: number } | null = null as {
        part: CircuitPart;
        index: number;
      } | null,
      nearest = Infinity;
    for (const part of input.project.parts) {
      if (part.kind !== 'scope') continue;
      const holders = this.knobHolders.get(part.id) ?? [];
      for (let index = 0; index < holders.length; index++) {
        const holder = holders[index],
          spec = KNOBS[index];
        if (!holder || !spec) continue;
        holder.updateWorldMatrix(true, false);
        const normal = new THREE.Vector3(0, 0, 1).transformDirection(holder.matrixWorld);
        if (normal.dot(direction) > -0.1) continue;
        const screen = this.project(holder.localToWorld(new THREE.Vector3(0, 0, 2.5))),
          distance = Math.hypot(screen.x - point.x, screen.y - point.y);
        if (distance < spec.radius * this.zoom + 9 && distance < nearest) {
          nearest = distance;
          best = { part, index };
        }
      }
    }
    return best;
  }
  private beginDial(part: CircuitPart, index: number, point: { x: number; y: number }) {
    const spec = KNOBS[index]!,
      holder = this.knobHolders.get(part.id)?.[index],
      value = dialValue(part, spec.dial),
      centre = holder
        ? this.project(holder.localToWorld(new THREE.Vector3(0, 0, 2.5)))
        : { x: point.x, y: point.y };
    this.mode = {
      kind: 'dial',
      id: part.id,
      knob: index,
      ...point,
      cx: centre.x,
      start: dialIndex(spec.dial, value),
      travelled: 0,
      moved: false,
      last: value,
    };
    this.markKnob({ part, index });
  }
  /** A teal ring around the knob that will turn, so there is no doubt which one it is. */
  private markKnob(knob: { part: CircuitPart; index: number } | null) {
    const key = knob ? `${knob.part.id}:${knob.index}` : '';
    if (this.mode.kind === 'dial' && !knob) return;
    if (this.knobMark?.key === key) return;
    if (this.knobMark) {
      this.overlay.remove(this.knobMark.mesh);
      this.knobMark.mesh.geometry.dispose();
      (this.knobMark.mesh.material as THREE.Material).dispose();
      this.knobMark = null;
    }
    const holder = knob && this.knobHolders.get(knob.part.id)?.[knob.index];
    if (knob && holder) {
      const radius = KNOBS[knob.index]!.radius,
        mesh = new THREE.Mesh(
          new THREE.RingGeometry(radius + 1.3, radius + 2.1, 40),
          new THREE.MeshBasicMaterial({ color: '#1aa3a1', depthTest: false, transparent: true }),
        );
      holder.updateWorldMatrix(true, false);
      holder.getWorldQuaternion(mesh.quaternion);
      mesh.position.copy(holder.localToWorld(new THREE.Vector3(0, 0, 3.4)));
      mesh.layers.set(FLAT);
      mesh.renderOrder = 14;
      this.overlay.add(mesh);
      this.knobMark = { key, mesh };
    }
    this.requestRender();
  }
  /** Frames the front plate of an oscilloscope, so that its knobs are big enough to turn. */
  focusScope(id: string) {
    const entry = this.parts.get(id),
      layout = this.layouts.get(id);
    if (!entry || !layout) return;
    const group = entry.model.group,
      front = scopeFront(layout.depth),
      box = new THREE.Box3();
    group.updateWorldMatrix(true, true);
    for (const x of [-PANEL.w / 2, PANEL.w / 2])
      for (const y of [1, PANEL.h + 4])
        for (const z of [front - 2, front + 10])
          box.expandByPoint(group.localToWorld(new THREE.Vector3(x, y, z)));
    this.frameBox(box, ZOOM.max);
  }
  /** Terminals (pins, breadboard holes) a lesson step points at; they get a pulsing ring. */
  setGuidePins(ids: string[]) {
    if (ids.join() === this.guidePinIds.join()) return;
    this.guidePinIds = ids;
    this.drawGuidePins();
  }
  private drawGuidePins() {
    const rings = this.guideRings;
    for (const child of [...rings.children]) {
      rings.remove(child);
      (child as THREE.Mesh).geometry.dispose();
      ((child as THREE.Mesh).material as THREE.Material).dispose();
    }
    for (const id of this.guidePinIds) {
      const spot = this.spots.get(id);
      if (!spot) continue;
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.7, 2.5, 32).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({
          color: '#f0a53a',
          transparent: true,
          opacity: 0.95,
          depthTest: false,
        }),
      );
      ring.position.set(spot.x, spot.y + 0.6, spot.z);
      ring.layers.set(FLAT);
      ring.renderOrder = 13;
      rings.add(ring);
    }
    this.requestRender();
  }
  /** Parts of the board that a lesson wants the student to look at. */
  setHighlight(ids: string[]) {
    if (ids.join() === this.lessonHot.join()) return;
    this.lessonHot = ids;
    this.drawMarks();
  }
  /** Teal plates over the named parts that are hovered or pointed at by the lesson. */
  private drawMarks() {
    const marks = this.boardMarks;
    for (const child of [...marks.children]) {
      marks.remove(child);
      (child as THREE.Mesh).geometry?.dispose();
    }
    const ids = new Set([...this.lessonHot, this.boardHot]);
    for (const part of this.boardPartList) {
      if (!ids.has(part.id)) continue;
      const geometry = new THREE.BoxGeometry(part.w + 1.2, part.h + 1.2, part.d + 1.2),
        y = STANDOFF + PCB + (part.h + 1.2) / 2 - 0.3;
      const fill = new THREE.Mesh(
          geometry,
          new THREE.MeshBasicMaterial({
            color: '#1aa3a1',
            transparent: true,
            opacity: 0.26,
            depthWrite: false,
          }),
        ),
        edges = new THREE.LineSegments(
          new THREE.EdgesGeometry(geometry),
          new THREE.LineBasicMaterial({ color: '#1aa3a1', depthTest: false }),
        );
      for (const mesh of [fill, edges]) {
        mesh.position.set(part.x, y, part.z);
        mesh.layers.set(FLAT);
        mesh.renderOrder = 11;
        marks.add(mesh);
      }
    }
    this.requestRender();
  }
  private boardPartAt(world: THREE.Vector3) {
    const group = this.board?.group;
    if (!group) return null;
    const local = group.worldToLocal(world.clone());
    return (
      this.boardPartList.find(
        (part) =>
          Math.abs(local.x - part.x) <= part.w / 2 + 0.6 &&
          Math.abs(local.z - part.z) <= part.d / 2 + 0.6,
      ) ?? null
    );
  }
  private setInspected(id: string) {
    const hot = id.startsWith('part:') ? id.slice(5) : '';
    if (hot !== this.boardHot) {
      this.boardHot = hot;
      this.drawMarks();
    }
    if (id !== this.inspected) {
      this.inspected = id;
      this.events.inspect?.(id);
    }
  }
  pan(dx: number, dz: number) {
    const view = this.cameraBasis(),
      forward = new THREE.Vector3(-view.up.x, 0, -view.up.z).normalize(),
      right = new THREE.Vector3(view.right.x, 0, view.right.z).normalize();
    this.targetGoal
      .addScaledVector(right, dx / this.zoom)
      .addScaledVector(forward, dz / this.zoom / Math.sin(ELEVATION));
    this.requestRender();
  }
  key(code: string, down: boolean) {
    if (down) this.keys.add(code);
    else this.keys.delete(code);
    if (down) this.requestRender();
  }
  /** Screen position of a pin, for overlays and end-to-end tests. */
  terminalScreen(id: string) {
    const spot = this.spots.get(id);
    return spot ? this.project(spot) : null;
  }
  /** Screen position of the top of a part, where its cap or knob is. */
  partScreen(id: string) {
    const part = this.parts.get(id);
    if (!part) return null;
    const box = solidBox(part.model.group);
    return this.project({
      x: (box.min.x + box.max.x) / 2,
      y: box.max.y - 0.5,
      z: (box.min.z + box.max.z) / 2,
    });
  }
  requestRender() {
    this.dirty = true;
    if (!this.frameRequest && !this.disposed)
      this.frameRequest = requestAnimationFrame(this.frameLoop);
  }
  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameRequest);
    this.observer.disconnect();
    for (const id of [...this.polarity.keys()]) this.clearPolarity(id);
    this.board?.dispose();
    for (const { model } of this.parts.values()) model.dispose();
    for (const { model } of this.wires.values()) model.dispose();
    for (const { model } of this.tools.values()) model.dispose();
    this.outline.dispose();
    this.pinLabels.dispose();
    this.scene.environment?.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  // ------------------------------------------------------------ content

  private layouts = new Map<string, PartLayout>();
  private partKey(part: CircuitPart, layout: PartLayout, carry: boolean) {
    // Anything that changes geometry rebuilds the model; plain moves only reposition it.
    const leads = layout.pins.map((pin) => [
      Math.round((pin.x - layout.center.x) * 100),
      Math.round((pin.z - layout.center.z) * 100),
    ]);
    return JSON.stringify([
      part.kind,
      part.label,
      part.color,
      part.kind === 'resistor' || part.kind === 'breadboard' ? part.value : 0,
      layout.turn,
      Boolean(layout.mounted),
      part.upright === true,
      carry,
      part.kind === 'breadboard' || layout.mounted ? leads : 0,
    ]);
  }
  private syncContent(project: McuProject, moved?: Moved) {
    const shift = dockShift(project),
      boardKey = `${project.board}:${project.module ?? ''}:${shift ? `${shift.x.toFixed(2)},${shift.z.toFixed(2)}` : ''}`;
    if (this.boardId !== boardKey) {
      if (this.board) {
        this.content.remove(this.board.group);
        this.board.dispose();
      }
      const layout = boardLayout(project.board, shift);
      this.board = buildBoard(layout, project.module);
      this.boardId = boardKey;
      this.boardPartList = boardParts(project.board, layout.width, layout.depth, project.module);
      this.boardMarks = new THREE.Group();
      this.board.group.add(this.boardMarks);
      this.content.add(this.board.group);
      this.drawMarks();
      this.fitted = false;
    }
    this.layouts = benchLayout(project, moved);
    const seen = new Set<string>(),
      riding = new Set(
        moved ? project.parts.filter((p) => p.mount?.on === moved.id).map((p) => p.id) : [],
      );
    for (const part of project.parts) {
      seen.add(part.id);
      const layout = this.layouts.get(part.id)!,
        carry = this.carrying === part.id,
        key = this.partKey(part, layout, carry);
      let entry = this.parts.get(part.id);
      if (!entry || entry.key !== key) {
        if (entry) {
          this.content.remove(entry.model.group);
          entry.model.dispose();
        }
        const plugged =
          this.fitted &&
          part.mount &&
          JSON.stringify(entry?.part.mount ?? null) !== JSON.stringify(part.mount);
        const model = buildPart(layout, carry);
        model.group.userData.baseY = model.group.position.y;
        if (part.kind === 'scope') {
          const holders: THREE.Object3D[] = [];
          model.group.traverse((object) => {
            const pick = object.userData.pick as Pick | undefined;
            if (pick?.type === 'control' && pick.knob !== undefined) holders[pick.knob] = object;
          });
          this.knobHolders.set(part.id, holders);
        }
        // A part let go falls onto its seat; one plugged in by other means drops a little.
        if (this.landing === part.id) {
          this.startDrop(part, CARRY_LIFT);
          this.landing = '';
        } else if (plugged) this.startDrop(part, 9);
        entry = { model, key, part };
        this.parts.set(part.id, entry);
        this.content.add(entry.model.group);
      }
      entry.part = part;
      const lift = carry
        ? CARRY_LIFT
        : moved && (moved.id === part.id || riding.has(part.id))
          ? (moved.lift ?? 0)
          : 0;
      entry.model.group.position.set(
        layout.center.x,
        (entry.model.group.userData.baseY as number) + lift,
        layout.center.z,
      );
    }
    for (const [id, entry] of this.parts)
      if (!seen.has(id)) {
        this.content.remove(entry.model.group);
        entry.model.dispose();
        this.parts.delete(id);
        this.knobHolders.delete(id);
      }
    this.spots = terminalSpots(project, this.layouts);
    this.hidden = new Set(
      [...this.layouts.values()]
        .filter((layout) => layout.mounted)
        .flatMap((layout) => layout.pins.map((pin) => pin.terminal)),
    );
    if (moved?.lift)
      for (const [id, spot] of this.spots) {
        const owner = id.slice(0, id.indexOf(':'));
        if ((owner === moved.id || riding.has(owner)) && owner !== this.carrying)
          this.spots.set(id, { ...spot, y: spot.y + moved.lift });
      }
    if (this.carrying)
      for (const [id, spot] of this.spots)
        if (id.slice(0, id.indexOf(':')) === this.carrying)
          this.spots.set(id, { ...spot, y: spot.y + CARRY_LIFT });
    this.syncPolarity(project);
    this.drawGuidePins();
    this.syncWires(project);
    this.fitShadow();
    this.renderer.shadowMap.needsUpdate = true;
  }
  private syncWires(project: McuProject) {
    const roles = wireRoles(project),
      seen = new Set<string>();
    project.wires.forEach((wire, lane) => {
      const a = this.spots.get(wire.from),
        b = this.spots.get(wire.to);
      if (!a || !b) return;
      seen.add(wire.id);
      const color = wireColor(wire.id, roles.get(wire.id), wire.color),
        key = JSON.stringify([a.x, a.y, a.z, a.insertion, b.x, b.y, b.z, b.insertion, color, lane]);
      const entry = this.wires.get(wire.id);
      if (entry?.key === key) return;
      if (entry) {
        this.content.remove(entry.model.group);
        entry.model.dispose();
      }
      const model = buildWire(wire.id, a, b, color, lane);
      this.wires.set(wire.id, { model, key });
      this.content.add(model.group);
    });
    for (const [id, entry] of this.wires)
      if (!seen.has(id)) {
        this.content.remove(entry.model.group);
        entry.model.dispose();
        this.wires.delete(id);
      }
  }
  private fitShadow() {
    const box = solidBox(this.content);
    if (box.isEmpty()) return;
    const center = box.getCenter(new THREE.Vector3()),
      size = box.getSize(new THREE.Vector3()),
      reach = Math.max(size.x, size.z) / 2 + 40,
      light = this.shadowLight;
    light.position.set(center.x + 70, 104 + 60, center.z - 34);
    light.target.position.set(center.x, 0, center.z);
    light.target.updateMatrixWorld();
    const camera = light.shadow.camera;
    camera.left = -reach;
    camera.right = reach;
    camera.top = reach;
    camera.bottom = -reach;
    camera.near = 10;
    camera.far = 600;
    camera.updateProjectionMatrix();
  }
  /** Starts the insertion animation: the part falls from `height` mm onto its leads. */
  private startDrop(part: CircuitPart, height: number) {
    this.drops.set(part.id, { start: performance.now(), height });
  }
  /** Marks the anode (+, red) and the cathode (−, blue) of every discrete LED on the bench. */
  private syncPolarity(project: McuProject) {
    const seen = new Set<string>();
    for (const part of project.parts) {
      const emit = partCatalog[part.kind].emit,
        layout = this.layouts.get(part.id);
      if (
        !emit ||
        !layout ||
        !discreteKinds.has(part.kind) ||
        (part.id !== this.input?.selected && part.id !== this.carrying)
      )
        continue;
      seen.add(part.id);
      const lift = this.carrying === part.id ? CARRY_LIFT : 0,
        key = JSON.stringify([lift, layout.pins.map((pin) => [pin.x, pin.y, pin.z])]);
      if (this.polarity.get(part.id)?.key === key) continue;
      this.clearPolarity(part.id);
      const sprites = layout.pins.map((pin, index) => {
        const anode = emit.anodes.includes(pin.label),
          text = anode ? `+${pin.label}` : `−${pin.label}`,
          badge = new THREE.Sprite(
            new THREE.SpriteMaterial({
              map: badgeTexture(text, anode ? '#985319' : '#315eb0'),
              depthTest: false,
              transparent: true,
              opacity: 0.95,
            }),
          );
        // Pushed away from the body along the lead row, so neighbouring badges do not overlap.
        const dx = pin.x - layout.center.x,
          dz = pin.z - layout.center.z,
          length = Math.hypot(dx, dz) || 1;
        const spread = layout.adapter
          ? turnOffset((index - (layout.pins.length - 1) / 2) * 2, 3, layout.turn)
          : { x: (dx / length) * 2.2, z: (dz / length) * 2.2 };
        badge.position.set(
          pin.x + spread.x,
          pin.y + (layout.adapter ? 2.6 : 8) + lift,
          pin.z + spread.z,
        );
        badge.scale.set(3.4, 3.4, 1);
        badge.layers.set(FLAT);
        badge.renderOrder = 12;
        this.overlay.add(badge);
        return badge;
      });
      this.polarity.set(part.id, { key, sprites });
    }
    for (const id of [...this.polarity.keys()]) if (!seen.has(id)) this.clearPolarity(id);
  }
  private clearPolarity(id: string) {
    for (const badge of this.polarity.get(id)?.sprites ?? []) {
      this.overlay.remove(badge);
      (badge.material as THREE.Material).dispose();
    }
    this.polarity.delete(id);
  }
  /** Advances insertion animations; returns true while any is still running. */
  private animateDrops(now: number) {
    for (const [id, drop] of this.drops) {
      const group = this.parts.get(id)?.model.group,
        t = Math.min(1, (now - drop.start) / 260);
      // Accelerating, like a fall: slow off the fingers, quick onto the board.
      if (group) group.position.y = (group.userData.baseY as number) + drop.height * (1 - t * t);
      this.renderer.shadowMap.needsUpdate = true;
      if (t >= 1) this.drops.delete(id);
    }
    return this.drops.size > 0;
  }
  private syncTools(tools: BenchTool[]) {
    if (!this.toolLayer.parent) this.content.add(this.toolLayer);
    const dragging = this.mode.kind === 'tool' ? this.mode.id : '';
    for (const [id, entry] of this.tools)
      if (!tools.some((tool) => tool.id === id && tool.kind === entry.kind)) {
        this.toolLayer.remove(entry.model.group);
        entry.model.dispose();
        this.tools.delete(id);
      }
    for (const tool of tools) {
      let entry = this.tools.get(tool.id);
      if (!entry) {
        entry = { model: buildTool(tool.id, tool.kind), kind: tool.kind, tool };
        this.tools.set(tool.id, entry);
        this.toolLayer.add(entry.model.group);
      }
      entry.tool = tool;
      if (tool.id !== dragging) entry.model.group.position.set(tool.x, 0, tool.z);
      entry.model.group.rotation.y = toolAngle(tool);
      // The hand turns about its middle, so a palm held down hovers right over the sensor.
      entry.model.body.position.y = toolHeight(tool);
      entry.model.body.rotation.x = tool.palmDown ? -Math.PI / 2 : 0;
    }
  }
  private syncLive() {
    const input = this.input;
    if (!input) return;
    const { frame, solution } = input;
    let animating = false;
    const time = performance.now();
    for (const { model, part } of this.parts.values()) {
      const supply = partCatalog[part.kind].supply,
        vcc = supply?.vcc ? solution.values.get(`${part.id}:${supply.vcc}`)?.voltage : null;
      if (
        model.update({
          part,
          scope: part.kind === 'scope' ? this.scopeFeed(part) : undefined,
          state: frame.devices?.[part.id],
          leds: solution.leds[part.id] ?? [],
          powered: !supply || (vcc ?? 0) >= supply.min,
          time,
        })
      )
        animating = true;
    }
    if (this.board) {
      const pin = frame.pins.find((item) => item.id === this.board!.ledPin);
      this.board.setPinLed(pin?.level === 1 ? Math.max(0.35, pin.duty || 1) : 0);
      this.board.setPowerLed(1);
      this.board.setBoardLeds?.(input.boardLeds ?? []);
      this.board.setBoardKeys?.(input.boardKeys ?? []);
    }
    this.syncPinGlow(frame);
    this.animating = animating;
  }
  /** What the oscilloscope `part` sees on its probes this frame. */
  private scopeFeed(part: CircuitPart): ScopeFeed | undefined {
    const input = this.input;
    if (!input) return undefined;
    const { solution, frame } = input,
      board = mcuBoards[input.project.board],
      netOf = (pin: string) => {
        const terminal = `${part.id}:${pin}`;
        return (
          solution.nets.get(terminal) ??
          [...solution.nets.values()].find((m) => m.includes(terminal))
        );
      };
    const samples = this.scopeSamples.get(part.id) ?? [[], []],
      last = samples[0]![samples[0]!.length - 1]?.time ?? -1;
    if (frame.time < last) samples.forEach((list) => (list.length = 0));
    const channels = ['CH1', 'CH2'].map((pin, index): ScopeChannel => {
      const members = netOf(pin) ?? [],
        volts = solution.values.get(`${part.id}:${pin}`)?.voltage ?? null,
        driver = members
          .filter((id) => id.startsWith('board:'))
          .map((id) => id.slice(6))
          .find((id) => board.pins.some((item) => item.id === id && item.supply === undefined)),
        list = samples[index]!;
      if (volts !== null && frame.time > (list[list.length - 1]?.time ?? -1)) {
        list.push({ time: frame.time, volts });
        if (list.length > 4000) list.splice(0, list.length - 4000);
      }
      return {
        connected: members.length > 1,
        volts,
        ...(driver
          ? { edges: (input.edges ?? []).filter((edge) => edge.pin === driver) }
          : { samples: list }),
      };
    });
    this.scopeSamples.set(part.id, samples);
    const ground = (netOf('GND') ?? []).some((id) =>
      board.pins.some((item) => id === `board:${item.id}` && item.supply === 0),
    );
    return {
      now: frame.time,
      timeDiv: (part.value || 100) / 1000,
      voltDiv: part.values?.[0] || 1,
      brightness: (part.values?.[1] ?? 80) / 100,
      focus: (part.values?.[2] ?? 70) / 100,
      trigger: { source: part.values?.[4] ? 1 : 0, level: part.values?.[3] ?? 1.5 },
      vcc: board.voltage,
      grounded: ground,
      channels: channels as [ScopeChannel, ScopeChannel],
    };
  }
  private syncSelection() {
    const input = this.input;
    if (!input) return;
    for (const [id, { model }] of this.wires) model.setSelected(id === input.selected);
    // Jumpers that end on the selected part turn see-through, so its face and pins stay in view.
    const mine = `${input.selected}:`;
    for (const wire of input.project.wires) {
      const model = this.wires.get(wire.id)?.model;
      model?.setGhost(
        Boolean(input.selected) &&
          input.selected !== wire.id &&
          (wire.from.startsWith(mine) || wire.to.startsWith(mine)),
      );
    }
    if (this.ring) {
      this.overlay.remove(this.ring);
      this.ring.geometry.dispose();
      this.ring = null;
    }
    const entry = this.parts.get(input.selected);
    if (entry) {
      const layout = partLayout(entry.part),
        outer = new THREE.Shape(),
        hole = new THREE.Path(),
        rect = (path: THREE.Path, w: number, d: number, r: number) => {
          path.moveTo(-w / 2 + r, -d / 2);
          path.lineTo(w / 2 - r, -d / 2);
          path.quadraticCurveTo(w / 2, -d / 2, w / 2, -d / 2 + r);
          path.lineTo(w / 2, d / 2 - r);
          path.quadraticCurveTo(w / 2, d / 2, w / 2 - r, d / 2);
          path.lineTo(-w / 2 + r, d / 2);
          path.quadraticCurveTo(-w / 2, d / 2, -w / 2, d / 2 - r);
          path.lineTo(-w / 2, -d / 2 + r);
          path.quadraticCurveTo(-w / 2, -d / 2, -w / 2 + r, -d / 2);
        };
      rect(outer, layout.width + 7, layout.depth + 7, 4);
      rect(hole, layout.width + 5.6, layout.depth + 5.6, 3.3);
      outer.holes.push(hole);
      this.ring = new THREE.Mesh(
        new THREE.ShapeGeometry(outer, 8),
        new THREE.MeshBasicMaterial({ color: '#1aa3a1', transparent: true, opacity: 0.9 }),
      );
      this.ring.rotation.x = -Math.PI / 2;
      this.ring.position.set(entry.model.group.position.x, 0.08, entry.model.group.position.z);
      this.ring.layers.set(FLAT);
      this.overlay.add(this.ring);
    }
    this.updateMarker();
  }
  private updateMarker() {
    this.updateStrips();
    const id = this.hoverTerminal || this.input?.pending || '';
    const spot = id ? this.spots.get(id) : undefined;
    this.marker.visible = Boolean(spot);
    if (spot) this.marker.position.set(spot.x, spot.y + 0.2, spot.z);
    (this.marker.material as THREE.MeshBasicMaterial).color.set(
      this.input?.pending === id ? '#f0a53a' : '#1aa3a1',
    );
  }
  /** Lights every header pin of the board that reads HIGH: amber for outputs, teal for inputs. */
  private syncPinGlow(frame: SimulationFrame) {
    const pins = frame.pins.filter(
      (pin) => pin.level === 1 && pin.mode !== 'ANALOG' && this.spots.has(`board:${pin.id}`),
    );
    this.pinGlow = instanced(
      this.pinGlow,
      pins.length,
      () => ({
        geometry: new THREE.PlaneGeometry(4.2, 4.2).rotateX(-Math.PI / 2),
        material: new THREE.MeshBasicMaterial({
          map: glowTexture(),
          transparent: true,
          depthTest: false,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      }),
      this.overlay,
      8,
    );
    const matrix = new THREE.Matrix4(),
      color = new THREE.Color();
    pins.forEach((pin, i) => {
      const spot = this.spots.get(`board:${pin.id}`)!,
        output = pin.mode === 'OUTPUT',
        strength = output ? Math.max(0.35, pin.duty || 1) : 0.55;
      matrix.makeTranslation(spot.x, spot.y + 0.4, spot.z);
      this.pinGlow!.setMatrixAt(i, matrix);
      this.pinGlow!.setColorAt(
        i,
        color.set(output ? '#ff9d2e' : '#1aa3a1').multiplyScalar(strength),
      );
    });
    this.pinGlow.count = pins.length;
    this.pinGlow.instanceMatrix.needsUpdate = true;
    if (this.pinGlow.instanceColor) this.pinGlow.instanceColor.needsUpdate = true;
  }
  /** Breadboard terminal ids joined with `terminal` inside its breadboard. */
  private stripOf(terminal: string): string[] {
    const split = terminal.indexOf(':'),
      owner = terminal.slice(0, split),
      board = this.input?.project.parts.find(
        (part) => part.id === owner && part.kind === 'breadboard',
      );
    if (!board || split < 0) return [];
    return breadboardStrip(board.value, terminal.slice(split + 1)).map((h) => `${owner}:${h}`);
  }
  /** Strips under each lead of a part mounted on a breadboard. */
  private leadStrips(part: CircuitPart, mount: Mount): string[][] {
    const board = this.input?.project.parts.find((item) => item.id === mount.on);
    if (!board) return [];
    return (contactHoles(part, mount.hole, board.value) ?? []).map(({ hole }) =>
      this.stripOf(`${board.id}:${hole}`),
    );
  }
  /** Shows the strips of the hovered, pending and dragged terminals plus a recent connection. */
  private updateStrips() {
    const groups: string[][] = [],
      mode = this.mode,
      input = this.input,
      now = performance.now();
    // While a part is carried the strips only hint; the holes it will take are ringed below.
    const carrying = mode.kind === 'part' && Boolean(mode.mount);
    if (mode.kind === 'part' && mode.mount && input) {
      const part = input.project.parts.find((item) => item.id === mode.id);
      if (part) groups.push(...this.leadStrips(part, mode.mount));
    }
    const selected = input?.project.parts.find(
      (part) => part.id === (mode.kind === 'part' ? mode.id : input.selected),
    );
    const mount = mode.kind === 'part' ? mode.mount : (selected?.mount ?? null);
    if (selected && mount) {
      const board = input?.project.parts.find((part) => part.id === mount.on);
      if (board) {
        const contacts = contactHoles(selected, mount.hole, board.value) ?? [];
        const holes = leadHoles(selected, mount.hole, board.value) ?? [];
        const warning = mountWarning(selected, mount, board.value);
        const names = partPinNames(selected);
        this.events.placement?.({
          title:
            warning || (mode.kind === 'part' ? t('Можно установить') : t('Установлено в макетку')),
          detail: names
            .map(
              (name, i) =>
                `${name} → ${
                  contacts
                    .filter((contact) => contact.pin === i)
                    .map((contact) => contact.hole)
                    .join(' / ') || holes[i]
                }`,
            )
            .join(' · '),
          tone: warning ? 'warning' : 'valid',
        });
        if (mode.kind !== 'part') groups.push(...this.leadStrips(selected, mount));
      }
    } else if (
      selected &&
      mode.kind === 'part' &&
      mode.moved &&
      input &&
      this.overBreadboard(input.project, selected, mode.center)
    ) {
      this.events.placement?.({
        title: t('Нельзя установить'),
        detail: this.placementReason(selected, mode.center),
        tone: 'invalid',
      });
    } else this.events.placement?.(null);
    this.drawHoleMarks(mount);
    for (const id of [
      mode.kind === 'pull' ? mode.from : mode.kind === 'replug' ? mode.anchor : '',
      input?.pending ?? '',
      this.hoverTerminal,
    ])
      if (id) groups.push(this.stripOf(id));
    const live = groups.some((group) => group.length);
    if (this.flash && now >= this.flash.until) this.flash = null;
    if (this.flash) groups.push(...this.flash.groups);
    const unique = groups.filter(
      (group, i) => group.length && groups.findIndex((other) => other[0] === group[0]) === i,
    );
    const total = unique.reduce((sum, group) => sum + group.length, 0);
    this.strips = instanced(
      this.strips,
      total,
      () => ({
        geometry: new THREE.PlaneGeometry(2.1, 2.1).rotateX(-Math.PI / 2),
        material: new THREE.MeshBasicMaterial({
          transparent: true,
          depthTest: false,
          depthWrite: false,
        }),
      }),
      this.overlay,
      9,
    );
    const matrix = new THREE.Matrix4(),
      color = new THREE.Color();
    let index = 0;
    unique.forEach((group, g) => {
      color.set(STRIP_COLORS[g % STRIP_COLORS.length]!);
      for (const id of group) {
        const spot = this.spots.get(id);
        if (!spot) continue;
        matrix.makeTranslation(spot.x, spot.y + 0.15, spot.z);
        this.strips!.setMatrixAt(index, matrix);
        this.strips!.setColorAt(index++, color);
      }
    });
    this.strips.count = index;
    this.strips.instanceMatrix.needsUpdate = true;
    if (this.strips.instanceColor) this.strips.instanceColor.needsUpdate = true;
    // A flash fades out over its last 400 ms unless something is hovered.
    (this.strips.material as THREE.MeshBasicMaterial).opacity = carrying
      ? 0.3
      : live || !this.flash
        ? 0.75
        : 0.75 * Math.min(1, (this.flash.until - now) / 400);
  }
  /** Valid contacts use compact rings; invalid contacts use crosses. Polarity has separate labels. */
  private drawHoleMarks(mount: Mount | null) {
    const input = this.input,
      mode = this.mode,
      part = input?.project.parts.find(
        (item) => item.id === (mode.kind === 'part' ? mode.id : input.selected),
      ),
      board = mount ? input?.project.parts.find((item) => item.id === mount.on) : null,
      fits =
        part && mount && board
          ? (contactHoles(part, mount.hole, board.value) ?? []).map((contact) => contact.hole)
          : [];
    // [spot key, colour] per lead.
    let rings: [string, string][] = [];
    if (part && board && mount) {
      rings = fits.map((hole) => {
        return [`${board.id}:${hole}`, '#1aa3a1'];
      });
    } else if (part && input && mode.kind === 'part' && mode.moved) {
      // It will not fit here: ring, in red, the holes under its legs so the reason can be seen.
      for (const hole of this.holesUnderLegs(input.project, part, mode.center))
        rings.push([hole, '#e8392e']);
    }
    const key =
      rings.map(([spot, color]) => spot + color).join('|') +
      (mode.kind === 'part' ? ':carry' : ':selected');
    if (key === this.holeMarkKey) return;
    this.holeMarkKey = key;
    for (const child of [...this.holeMarks.children]) {
      this.holeMarks.remove(child);
      (child as THREE.Mesh).geometry.dispose();
      ((child as THREE.Mesh).material as THREE.Material).dispose();
    }
    for (const [id, color] of rings) {
      const spot = this.spots.get(id);
      if (!spot) continue;
      for (const geometry of [
        new THREE.RingGeometry(0.72, 1.08, 24).rotateX(-Math.PI / 2),
        new THREE.CircleGeometry(0.35, 16).rotateX(-Math.PI / 2),
      ]) {
        const invalid = color === '#e8392e';
        if (invalid) geometry.dispose();
        const mesh = new THREE.Mesh(
          invalid ? new THREE.BoxGeometry(2.1, 0.05, 0.32) : geometry,
          new THREE.MeshBasicMaterial({
            color,
            depthTest: true,
            transparent: true,
            opacity: 0.95,
          }),
        );
        if (invalid)
          mesh.rotation.y = this.holeMarks.children.length % 2 ? -Math.PI / 4 : Math.PI / 4;
        mesh.position.set(spot.x, spot.y + 0.4, spot.z);
        mesh.layers.set(FLAT);
        mesh.renderOrder = 13;
        this.holeMarks.add(mesh);
      }
    }
    if (mount && mode.kind === 'part' && mode.moved) {
      for (const [id] of rings) {
        const spot = this.spots.get(id);
        if (!spot) continue;
        const geometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(spot.x, spot.y + 0.5, spot.z),
          new THREE.Vector3(spot.x, spot.y + CARRY_LIFT, spot.z),
        ]);
        const line = new THREE.Line(
          geometry,
          new THREE.LineDashedMaterial({
            color: '#1aa3a1',
            dashSize: 0.8,
            gapSize: 0.6,
            transparent: true,
            opacity: 0.8,
          }),
        );
        line.computeLineDistances();
        line.layers.set(FLAT);
        this.holeMarks.add(line);
      }
    }
    this.requestRender();
  }
  /** Breadboard holes nearest to each leg of a carried part that is over the board but does not fit. */
  private holesUnderLegs(project: McuProject, part: CircuitPart, center: Vec3): string[] {
    if (!this.overBreadboard(project, part, center)) return [];
    const turn = (part.turn ?? 0) & 3;
    let points: { x: number; z: number }[];
    if (discreteKinds.has(part.kind)) {
      const own = leadOffsets(part.kind).map(([c, r]) =>
          turnOffset(c * LEAD_PITCH, r * 7.62, turn),
        ),
        mx = own.reduce((sum, p) => sum + p.x, 0) / own.length,
        mz = own.reduce((sum, p) => sum + p.z, 0) / own.length;
      points = own.map((p) => ({ x: center.x + p.x - mx, z: center.z + p.z - mz }));
    } else {
      const { mount: _, ...loose } = part;
      void _;
      points = partLayout(loose, center).pins;
    }
    const found: string[] = [];
    for (const board of project.parts) {
      if (board.kind !== 'breadboard') continue;
      const holes = this.layouts.get(board.id)?.pins ?? [];
      for (const point of points) {
        let best = '',
          distance = LEAD_PITCH * 1.2;
        for (const hole of holes) {
          const d = Math.hypot(hole.x - point.x, hole.z - point.z);
          if (d < distance) {
            distance = d;
            best = `${board.id}:${hole.label}`;
          }
        }
        if (best) found.push(best);
      }
    }
    return found;
  }
  private flashStrips(groups: string[][]) {
    const lit = groups.filter((group) => group.length);
    if (!lit.length) return;
    this.flash = { groups: lit, until: performance.now() + FLASH_MS };
    this.updateStrips();
    this.requestRender();
  }

  // ------------------------------------------------------------ rendering

  private cameraBasis() {
    const el = ELEVATION,
      az = this.azimuth,
      direction = new THREE.Vector3(
        Math.sin(az) * Math.cos(el),
        Math.sin(el),
        Math.cos(az) * Math.cos(el),
      );
    const right = new THREE.Vector3(Math.cos(az), 0, -Math.sin(az));
    const up = new THREE.Vector3().crossVectors(direction, right).normalize();
    return { direction, right, up };
  }
  private resize() {
    const rect = this.host.getBoundingClientRect();
    this.width = Math.max(1, rect.width);
    this.height = Math.max(1, rect.height);
    this.pixelRatio = Math.min(2, Math.max(1.5, window.devicePixelRatio || 1));
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(this.width, this.height, false);
    const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    this.outline.setSize(size.x, size.y);
    this.pinLabels.resize(this.width, this.height, this.pixelRatio);
    this.requestRender();
  }
  private frameLoop = (now: number) => {
    this.frameRequest = 0;
    const dt = Math.min(64, now - this.last);
    this.last = now;
    let moving = false;
    // Keyboard panning.
    const kx =
        (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0) -
        (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0),
      kz =
        (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0) -
        (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0);
    if (kx || kz) {
      const speed =
        (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? 1520 : 760) * (dt / 1000);
      this.pan(kx * speed, kz * speed);
      moving = true;
    }
    // Pan inertia after a fling.
    if (this.mode.kind === 'idle' && this.velocity.lengthSq() > 0.0004) {
      this.pan(-this.velocity.x * dt, -this.velocity.y * dt);
      this.velocity.multiplyScalar(Math.exp(-dt / 340));
      moving = true;
    }
    // Eased goals.
    const k = 1 - Math.exp(-dt / 75);
    if (Math.abs(this.zoomGoal - this.zoom) > 1e-3) {
      this.zoom += (this.zoomGoal - this.zoom) * k;
      moving = true;
    } else this.zoom = this.zoomGoal;
    if (this.target.distanceToSquared(this.targetGoal) > 1e-4) {
      this.target.lerp(this.targetGoal, 1 - Math.exp(-dt / 70));
      moving = true;
    } else this.target.copy(this.targetGoal);
    if (this.turn.duration) {
      const t = Math.min(1, (now - this.turn.start) / this.turn.duration);
      this.azimuth = this.turn.from + (this.turn.to - this.turn.from) * easeInOut(t);
      if (t >= 1) this.turn.duration = 0;
      moving = true;
    }
    if (this.animating) this.syncLive();
    // Animations share the clock their start times come from.
    const clock = performance.now();
    let toolsMoving = this.animateDrops(clock);
    if (this.guideRings.children.length) {
      const pulse = 1 + 0.28 * Math.sin(clock / 220);
      for (const ring of this.guideRings.children) ring.scale.set(pulse, 1, pulse);
      toolsMoving = true;
    }
    for (const { model, tool } of this.tools.values())
      if (model.update(clock, tool)) toolsMoving = true;
    if (this.board?.animate?.(clock)) toolsMoving = true;
    if (toolsMoving && !this.disposed) this.frameRequest ||= requestAnimationFrame(this.frameLoop);
    if (this.flash) {
      this.updateStrips();
      // Keep drawing while the flash fades, without signalling a camera change.
      if (!this.disposed) this.frameRequest ||= requestAnimationFrame(this.frameLoop);
    }
    this.placeCamera();
    this.outline.render(this.scene, this.camera, this.zoom, this.pixelRatio);
    this.drawPinLabels();
    if (moving || this.dirty) this.events.view();
    this.dirty = false;
    if (moving || this.animating) this.requestRender();
  };
  private placeCamera() {
    const { direction } = this.cameraBasis(),
      camera = this.camera;
    camera.position.copy(this.target).addScaledVector(direction, DISTANCE);
    camera.lookAt(this.target);
    camera.left = -this.width / 2 / this.zoom;
    camera.right = this.width / 2 / this.zoom;
    camera.top = this.height / 2 / this.zoom;
    camera.bottom = -this.height / 2 / this.zoom;
    camera.near = 1;
    camera.far = DISTANCE * 2.5;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    const radius = Math.max(this.width, this.height) / this.zoom;
    this.grid.material.uniforms.center!.value.set(this.target.x, this.target.z);
    this.grid.material.uniforms.radius!.value.set(radius * 0.35, radius * 0.8);
  }

  // ------------------------------------------------------------ picking

  private pointer(event: { clientX: number; clientY: number }) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }
  private ndc(point: { x: number; y: number }) {
    return new THREE.Vector2((point.x / this.width) * 2 - 1, -(point.y / this.height) * 2 + 1);
  }
  /** Nearest pin within reach in screen space; pins are small, so this beats ray hits. */
  private terminalAt(
    point: { x: number; y: number },
    exclude = '',
    owner = '',
    reach = 0,
    includeHidden = false,
  ) {
    let best = '',
      distance = reach || Math.min(14, Math.max(7, 1.2 * this.zoom));
    for (const [id, spot] of this.spots) {
      if (id === exclude || (!includeHidden && this.hidden.has(id))) continue;
      if (owner && !id.startsWith(`${owner}:`)) continue;
      const screen = this.project(spot),
        d = Math.hypot(screen.x - point.x, screen.y - point.y);
      if (d < distance || (includeHidden && Math.abs(d - distance) < 0.5 && this.hidden.has(id))) {
        distance = d;
        best = id;
      }
    }
    return best;
  }
  /**
   * How far from a pin a jumper being dragged still lands on it. Generous, so that drifting a
   * little past the edge of a header does not leave the student without a target.
   */
  private dragReach() {
    return Math.min(34, Math.max(20, 3.2 * this.zoom));
  }
  /**
   * Pin under the pointer, unless a part body is in the way: a part on the breadboard covers the
   * holes beneath it, and only its own header pins can be grabbed through it.
   */
  private pinAt(point: { x: number; y: number }, hint = false) {
    const reach = hint ? Math.min(28, Math.max(22, this.zoom * 1.8)) : 0;
    const pick = this.hit(point)?.pick;
    if (pick?.type === 'control' && !hint) return '';
    if (pick?.type === 'wire-end') {
      // A plugged jumper's housing is wider than the pitch and covers the neighbouring holes:
      // when the pointer is nearer another hole than this wire's own end, that hole wins.
      const wire = this.input?.project.wires.find((item) => item.id === pick.id),
        own = wire?.[pick.end] ?? '',
        near = this.terminalAt(point, '', '', reach, hint);
      if (hint) return near || own;
      if (!near || near === own) return '';
      const distance = (id: string) => {
        const spot = this.spots.get(id);
        if (!spot) return Infinity;
        const screen = this.project(spot);
        return Math.hypot(screen.x - point.x, screen.y - point.y);
      };
      return distance(near) < distance(own) ? near : '';
    }
    if (pick?.type === 'part' || (hint && pick?.type === 'control')) {
      const part = this.input?.project.parts.find((item) => item.id === pick.id);
      if (part?.kind !== 'breadboard') return this.terminalAt(point, '', pick.id, reach, hint);
    }
    return this.terminalAt(point, '', '', reach, hint);
  }
  /** Leads of mounted parts sit inside holes; the hole is the pin a jumper plugs into. */
  private hidden = new Set<string>();
  /** Breadboard holes under the leads of a part being dragged, if it would fit there. */
  private mountRefusal = '';
  private placementReason(part: CircuitPart, center: Vec3) {
    const project = this.input!.project;
    if (!canMount(part.kind))
      return t('У этой детали кабель или собственный корпус: подключите её проводами');
    if (this.mountRefusal) return this.mountRefusal;
    const occupied = occupiedHoles(project, part.id);
    for (const id of this.holesUnderLegs(project, part, center)) {
      const split = id.indexOf(':');
      if (occupied.get(id.slice(0, split))?.has(id.slice(split + 1)))
        return t('Отверстие {hole} занято ножкой другой детали', { hole: id.slice(split + 1) });
      if (project.wires.some((wire) => wire.from === id || wire.to === id))
        return t('В отверстии {hole} уже стоит штекер провода', { hole: id.slice(split + 1) });
    }
    if (['chip595', 'chip165', 'dip', 'seg7'].includes(part.kind))
      return t('Разместите ряды ножек по обе стороны центральной канавки');
    return t(
      'Совместите все ножки со свободными отверстиями; край детали выходит за поле или корпус перекрывает другую деталь',
    );
  }
  private mountAt(project: McuProject, part: CircuitPart, center: Vec3): Mount | null {
    this.mountRefusal = '';
    if (!canMount(part.kind)) return null;
    const { mount: _, ...loose } = part;
    void _;
    const lead = partLayout(loose, center).pins[0];
    if (!lead) return null;
    const taken = occupiedHoles(project, part.id);
    let best: Mount | null = null,
      distance = LEAD_PITCH * 0.75;
    for (const board of project.parts) {
      if (board.kind !== 'breadboard') continue;
      const layout = this.layouts.get(board.id);
      if (!layout) continue;
      for (const hole of layout.pins) {
        const d = Math.hypot(hole.x - lead.x, hole.z - lead.z);
        if (d >= distance) continue;
        distance = d;
        best = { on: board.id, hole: hole.label };
      }
    }
    if (best) {
      const board = project.parts.find((item) => item.id === best.on)!;
      const contacts = contactHoles(loose, best.hole, board.value);
      if (!contacts) return null;
      for (const { hole } of contacts) {
        if (taken.get(board.id)?.has(hole)) {
          this.mountRefusal = t('Отверстие {hole} занято ножкой другой детали', { hole });
          return null;
        }
        if (
          project.wires.some(
            (wire) => wire.from === `${board.id}:${hole}` || wire.to === `${board.id}:${hole}`,
          )
        ) {
          this.mountRefusal = t('В отверстии {hole} уже стоит штекер провода', { hole });
          return null;
        }
      }
      const entry = this.parts.get(part.id),
        current = this.layouts.get(part.id);
      const candidate = benchLayout({
        ...project,
        parts: project.parts.map((item) =>
          item.id === part.id ? { ...item, mount: best! } : item,
        ),
      }).get(part.id);
      if (entry && current && candidate) {
        const body = solidBox(entry.model.group);
        body.translate(
          new THREE.Vector3(
            candidate.center.x - entry.model.group.position.x,
            candidate.center.y - current.center.y - (this.carrying === part.id ? CARRY_LIFT : 0),
            candidate.center.z - entry.model.group.position.z,
          ),
        );
        body.min.addScalar(0.35);
        body.max.addScalar(-0.35);
        for (const other of project.parts) {
          if (other.id === part.id || other.kind === 'breadboard' || other.mount?.on !== best.on)
            continue;
          const mesh = this.parts.get(other.id)?.model.group;
          if (mesh && body.intersectsBox(solidBox(mesh))) {
            this.mountRefusal = t(
              'Корпус пересекается с деталью «{name}»; сдвиньте её или выберите другие отверстия',
              { name: other.label },
            );
            return null;
          }
        }
      }
    }
    return best;
  }
  /** True when the centre of a loose part is over the holes area of a breadboard. */
  private overBreadboard(project: McuProject, part: CircuitPart, center: Vec3) {
    if (part.kind === 'breadboard' || standaloneKinds.has(part.kind)) return false;
    return project.parts.some((board) => {
      if (board.kind !== 'breadboard') return false;
      const pins = this.layouts.get(board.id)?.pins;
      if (!pins?.length) return false;
      const xs = pins.map((pin) => pin.x),
        zs = pins.map((pin) => pin.z),
        margin = LEAD_PITCH;
      return (
        center.x > Math.min(...xs) - margin &&
        center.x < Math.max(...xs) + margin &&
        center.z > Math.min(...zs) - margin &&
        center.z < Math.max(...zs) + margin
      );
    });
  }
  private hit(point: { x: number; y: number }): { pick: Pick; at: THREE.Vector3 } | null {
    this.raycaster.setFromCamera(this.ndc(point), this.camera);
    this.raycaster.layers.set(OUTLINED);
    for (const hit of this.raycaster.intersectObject(this.content, true)) {
      let object: THREE.Object3D | null = hit.object;
      while (object && !object.userData.pick) object = object.parent;
      if (object) return { pick: object.userData.pick as Pick, at: hit.point };
    }
    return null;
  }
  private groundAt(point: { x: number; y: number }, height = 0) {
    this.raycaster.setFromCamera(this.ndc(point), this.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -height);
    return this.raycaster.ray.intersectPlane(plane, new THREE.Vector3());
  }

  // ------------------------------------------------------------ pointer

  private onPointerDown = (event: PointerEvent) => {
    const input = this.input;
    if (!input) return;
    this.host.focus({ preventScroll: true });
    const canvas = this.renderer.domElement;
    canvas.setPointerCapture(event.pointerId);
    const point = this.pointer(event);
    this.velocity.set(0, 0);
    this.events.hover(null);
    if (event.button === 1) {
      this.mode = { kind: 'rotate', x: point.x, turned: 0 };
      return;
    }
    if (event.button === 2) {
      this.mode = {
        kind: 'pan',
        ...point,
        moved: false,
        target: this.targetGoal.clone(),
        clear: false,
        menu: true,
      };
      return;
    }
    if (event.button !== 0) return;
    // Knobs are small: they win over everything near them, in a generous screen-space reach.
    const knob = this.knobAt(point);
    if (knob) {
      this.events.select(knob.part.id);
      this.beginDial(knob.part, knob.index, point);
      return;
    }
    const terminal = this.pinAt(point);
    if (terminal) {
      this.mode = { kind: 'pull', from: terminal, ...point, moved: false };
      return;
    }
    const found = this.hit(point);
    const pick = found?.pick;
    if (pick?.type === 'board-key') {
      this.events.boardKey?.(pick.id, true);
      this.mode = { kind: 'boardkey', id: pick.id };
      return;
    }
    if (pick?.type === 'control') {
      const part = input.project.parts.find((item) => item.id === pick.id);
      if (!part) return;
      this.events.select(part.id);
      if (pick.knob !== undefined && KNOBS[pick.knob]) {
        this.beginDial(part, pick.knob, point);
        return;
      }
      const control = partCatalog[part.kind].control,
        look = lookOf(part.kind);
      if (pick.bit !== undefined) {
        // One slider of a DIP switch (or one touch pad): a click flips its bit.
        this.events.value(part.id, part.value ^ (1 << pick.bit));
      } else if (pick.key !== undefined) {
        // A key of a keypad is held down while the button is held; its number is the value.
        this.events.value(part.id, pick.key);
        this.mode = { kind: 'press', id: part.id };
      } else if (look === 'joystick') {
        // Dragging the stick leans it (up, down, left, right); a plain click presses it.
        this.events.value(part.id, JOYSTICK_PRESS);
        this.mode = { kind: 'stick', id: part.id, ...point, bits: JOYSTICK_PRESS, moved: false };
      } else if (control.kind === 'momentary') {
        this.events.value(part.id, 1);
        this.mode = { kind: 'press', id: part.id };
      } else if (control.kind === 'toggle') this.events.value(part.id, part.value ? 0 : 1);
      else if (look === 'potentiometer' || look === 'potmod' || look === 'encoder') {
        const center = this.project(partLayout(part).center);
        this.mode = {
          kind: 'knob',
          id: part.id,
          angle: Math.atan2(point.y - center.y, point.x - center.x),
          value: part.value,
        };
      } else if (look === 'slidepot')
        this.mode = { kind: 'slide', id: part.id, x: point.x, value: part.value };
      return;
    }
    if (pick?.type === 'tool') {
      const group = this.tools.get(pick.id)?.model.group,
        at = this.groundAt(point);
      if (group && at)
        this.mode = {
          kind: 'tool',
          id: pick.id,
          dx: group.position.x - at.x,
          dz: group.position.z - at.z,
        };
      return;
    }
    if (pick?.type === 'wire-end') {
      const wire = input.project.wires.find((item) => item.id === pick.id);
      if (wire) {
        this.events.select(wire.id);
        this.mode = {
          kind: 'replug',
          wire: wire.id,
          end: pick.end,
          anchor: pick.end === 'from' ? wire.to : wire.from,
          ...point,
        };
        return;
      }
    }
    if (pick?.type === 'wire') {
      this.events.select(pick.id);
      this.mode = {
        kind: 'pan',
        ...point,
        moved: false,
        target: this.targetGoal.clone(),
        clear: false,
      };
      return;
    }
    if (pick?.type === 'part' && found) {
      const part = input.project.parts.find((item) => item.id === pick.id);
      if (part) {
        this.events.select(part.id);
        const center = this.layouts.get(part.id)?.center ?? partCenter(part);
        this.mode = {
          kind: 'part',
          id: part.id,
          ...point,
          grab: this.groundAt(point) ?? found.at,
          origin: { ...center, y: 0 },
          center,
          moved: false,
          mount: part.mount ?? null,
        };
        return;
      }
    }
    this.mode = {
      kind: 'pan',
      ...point,
      moved: false,
      target: this.targetGoal.clone(),
      clear: !pick,
    };
  };
  private lastMove = { x: 0, y: 0, t: 0 };
  private onPointerMove = (event: PointerEvent) => {
    const input = this.input;
    if (!input) return;
    const point = this.pointer(event),
      mode = this.mode;
    switch (mode.kind) {
      case 'idle':
        this.hover(point);
        return;
      case 'rotate': {
        const steps = Math.trunc((point.x - mode.x) / 110);
        if (steps !== mode.turned) {
          this.rotate(steps > mode.turned ? -1 : 1);
          mode.turned = steps;
        }
        return;
      }
      case 'pan': {
        const dx = point.x - mode.x,
          dy = point.y - mode.y;
        if (!mode.moved && Math.hypot(dx, dy) < 4) return;
        mode.moved = true;
        this.targetGoal.copy(mode.target);
        this.pan(-dx, -dy);
        this.target.copy(this.targetGoal);
        const now = performance.now(),
          elapsed = Math.max(1, now - this.lastMove.t);
        if (elapsed < 90)
          this.velocity
            .set((point.x - this.lastMove.x) / elapsed, (point.y - this.lastMove.y) / elapsed)
            .clampLength(0, 4.5);
        this.lastMove = { ...point, t: now };
        return;
      }
      case 'pull':
      case 'replug': {
        if (
          mode.kind === 'pull' &&
          !mode.moved &&
          Math.hypot(point.x - mode.x, point.y - mode.y) < 4
        )
          return;
        if (mode.kind === 'pull') mode.moved = true;
        const from = mode.kind === 'pull' ? mode.from : mode.anchor;
        if (mode.kind === 'replug' && !this.hiddenWire) {
          const entry = this.wires.get(mode.wire);
          if (entry) entry.model.group.visible = false;
          this.hiddenWire = mode.wire;
        }
        this.showPreview(from, point);
        const landing = this.terminalAt(point, from, '', this.dragReach());
        // Name the pin the jumper is about to land on, so the student never wires blind. The
        // tooltip changes only when the pin does: a React update per mouse move would lag.
        if (landing !== this.hoverTerminal)
          this.events.hover(landing ? this.terminalInfo(landing) : null);
        this.hoverTerminal = landing;
        this.updateMarker();
        this.requestRender();
        return;
      }
      case 'part': {
        if (!mode.moved && Math.hypot(point.x - mode.x, point.y - mode.y) < 4) return;
        mode.moved = true;
        const at = this.groundAt(point);
        if (!at) return;
        const part = input.project.parts.find((item) => item.id === mode.id);
        if (!part) return;
        const origin = partOrigin(part, {
          x: mode.origin.x + at.x - mode.grab.x,
          z: mode.origin.z + at.z - mode.grab.z,
        });
        mode.center = partCenter({ ...part, ...origin });
        mode.mount = this.mountAt(input.project, part, mode.center);
        this.carrying = part.id;
        const { mount: _, ...loose } = part;
        void _;
        const preview = {
          ...input.project,
          parts: input.project.parts.map((item) =>
            item.id === part.id ? (mode.mount ? { ...loose, mount: mode.mount } : loose) : item,
          ),
        };
        this.syncContent(
          preview,
          mode.mount ? undefined : { id: mode.id, center: mode.center, lift: CARRY_LIFT },
        );
        this.syncSelection();
        this.updateStrips();
        this.requestRender();
        return;
      }
      case 'tool': {
        const at = this.groundAt(point),
          group = this.tools.get(mode.id)?.model.group;
        if (!at || !group) return;
        group.position.set(at.x + mode.dx, 0, at.z + mode.dz);
        this.events.tool?.(mode.id, group.position.x, group.position.z);
        this.requestRender();
        return;
      }
      case 'knob': {
        const part = input.project.parts.find((item) => item.id === mode.id);
        if (!part) return;
        const center = this.project(partLayout(part).center),
          angle = Math.atan2(point.y - center.y, point.x - center.x);
        let delta = angle - mode.angle;
        if (delta > Math.PI) delta -= Math.PI * 2;
        if (delta < -Math.PI) delta += Math.PI * 2;
        mode.angle = angle;
        const control = partCatalog[part.kind].control,
          max = control.max ?? 1023,
          min = control.min ?? 0;
        mode.value = THREE.MathUtils.clamp(
          mode.value + (delta / (Math.PI * 1.5)) * (max - min),
          min,
          max,
        );
        this.events.value(part.id, Math.round(mode.value));
        return;
      }
      case 'dial': {
        const knob = KNOBS[mode.knob];
        if (!knob) return;
        // Up and right turn it clockwise, one step per `dialPixelsPerStep` of drag.
        mode.travelled += mode.y - point.y + (point.x - mode.x);
        mode.x = point.x;
        mode.y = point.y;
        if (Math.abs(mode.travelled) > 4) mode.moved = true;
        if (!mode.moved) return;
        const value = dialAt(knob.dial, mode.start + mode.travelled / dialPixelsPerStep(knob.dial));
        if (value !== mode.last) {
          mode.last = value;
          this.events.value(mode.id, value, knob.dial.extra);
        }
        return;
      }
      case 'stick': {
        const dx = point.x - mode.x,
          dy = point.y - mode.y;
        if (!mode.moved && Math.hypot(dx, dy) < 8) return;
        mode.moved = true;
        // Past a small dead zone the stick leans towards the pointer; the press is let go.
        const bits =
          (dy < -10 ? 1 : 0) | (dy > 10 ? 2 : 0) | (dx < -10 ? 4 : 0) | (dx > 10 ? 8 : 0);
        // The value's bits are UP, DN, LT, RT, OK in the device's pin order.
        if (bits !== mode.bits) {
          mode.bits = bits;
          this.events.value(mode.id, bits);
        }
        return;
      }
      case 'slide': {
        const part = input.project.parts.find((item) => item.id === mode.id);
        if (!part) return;
        const control = partCatalog[part.kind].control,
          max = control.max ?? 1023,
          min = control.min ?? 0;
        const value = THREE.MathUtils.clamp(
          mode.value + ((point.x - mode.x) / (40 * this.zoom)) * (max - min),
          min,
          max,
        );
        this.events.value(part.id, Math.round(value));
        return;
      }
    }
  };
  private onPointerUp = (event: PointerEvent) => {
    const input = this.input,
      mode = this.mode;
    this.mode = { kind: 'idle' };
    this.clearPreview();
    this.showHiddenWire();
    if (!input) return;
    const point = this.pointer(event);
    switch (mode.kind) {
      case 'pull': {
        const target = this.terminalAt(point, mode.from, '', this.dragReach());
        if (!mode.moved) this.events.terminal(mode.from);
        else if (target) {
          this.flashStrips([this.stripOf(mode.from), this.stripOf(target)]);
          this.events.connect(mode.from, target);
        }
        break;
      }
      case 'replug': {
        const target = this.terminalAt(point, mode.anchor, '', this.dragReach());
        if (target) {
          this.flashStrips([this.stripOf(target)]);
          this.events.replug(mode.wire, mode.end, target);
        }
        break;
      }
      case 'part': {
        if (mode.moved) {
          // Let go: the part leaves the air and falls onto whatever is under it.
          this.landing = mode.id;
          this.carrying = '';
          const part = input.project.parts.find((item) => item.id === mode.id);
          if (part && !mode.mount && this.overBreadboard(input.project, part, mode.center)) {
            // Not over holes it fits: left there it would sink into the board, so it goes back.
            this.events.notice?.(this.placementReason(part, mode.center));
            this.syncContent(input.project);
          } else if (part) {
            const center = mode.mount
                ? (this.layouts.get(part.id)?.center ?? mode.center)
                : mode.center,
              origin = partOrigin(part, center),
              same =
                origin.x === part.x &&
                origin.y === part.y &&
                JSON.stringify(part.mount ?? null) === JSON.stringify(mode.mount);
            if (mode.mount) this.flashStrips(this.leadStrips(part, mode.mount));
            if (!same) this.events.move(part.id, origin.x, origin.y, mode.mount);
            else this.syncContent(input.project);
          }
        } else {
          // A plain click on a sensor module, which has no knob of its own, trips it or lets it go.
          const part = input.project.parts.find((item) => item.id === mode.id),
            control = part && partCatalog[part.kind].control;
          if (part && control?.scenario && !this.parts.get(part.id)?.model.control) {
            if (control.kind === 'toggle' || control.kind === 'momentary')
              this.events.value(part.id, part.value ? 0 : 1);
            else if (control.kind === 'range' && part.kind.startsWith('y:sensor-')) {
              const min = control.min ?? 0,
                max = control.max ?? 1;
              this.events.value(part.id, part.value >= (min + max) / 2 ? min : max);
            }
          }
        }
        break;
      }
      case 'press':
        this.events.value(mode.id, 0);
        break;
      case 'stick':
        this.events.value(mode.id, 0);
        break;
      case 'boardkey':
        this.events.boardKey?.(mode.id, false);
        break;
      case 'dial': {
        // A click without a drag steps the knob: on its right half forward, on its left back.
        const part = input.project.parts.find((item) => item.id === mode.id),
          knob = KNOBS[mode.knob];
        if (!mode.moved && part && knob) {
          const now = dialValue(part, knob.dial),
            next = dialStep(knob.dial, now, point.x >= mode.cx ? 1 : -1);
          if (next !== now) this.events.value(part.id, next, knob.dial.extra);
        }
        break;
      }
      case 'pan':
        if (!mode.moved && mode.menu) {
          const found = this.hit(point),
            pick = found?.pick;
          this.events.context({
            ...point,
            target:
              pick?.type === 'part' || pick?.type === 'control'
                ? { type: 'part', id: pick.id }
                : pick?.type === 'tool'
                  ? { type: 'tool', id: pick.id }
                  : pick?.type === 'wire' || pick?.type === 'wire-end'
                    ? { type: 'wire', id: pick.id }
                    : pick?.type === 'board'
                      ? { type: 'board' }
                      : null,
          });
        } else if (!mode.moved && mode.clear) {
          if (input.pending) this.events.cancel();
          this.events.select('');
        }
        break;
    }
    this.hoverTerminal = '';
    this.updateMarker();
    this.requestRender();
  };
  private onPointerLeave = () => {
    if (this.mode.kind !== 'idle') return;
    this.hoverTerminal = '';
    this.updateMarker();
    this.events.hover(null);
    this.renderer.domElement.style.cursor = '';
    this.requestRender();
  };
  private hover(point: { x: number; y: number }) {
    this.setInspected(this.hoverDetail(point));
  }
  /** Updates the tooltip and cursor; returns what the pointer rests on for `inspect`. */
  private hoverDetail(point: { x: number; y: number }): string {
    const knob = this.knobAt(point),
      canvasStyle = this.renderer.domElement.style;
    this.markKnob(knob);
    if (knob) {
      const spec = KNOBS[knob.index]!,
        holder = this.knobHolders.get(knob.part.id)?.[knob.index],
        at = new THREE.Vector3();
      holder?.getWorldPosition(at);
      const screen = this.project(at);
      canvasStyle.cursor = 'ns-resize';
      this.events.hover({
        x: screen.x,
        y: screen.y,
        title: `${spec.label} · ${spec.dial.format(dialValue(knob.part, spec.dial))}`,
        detail: t('Клик справа или слева — шаг, тяните вверх и вниз или крутите колёсиком'),
      });
      return '';
    }
    const input = this.input!;
    const terminal = this.pinAt(point, true);
    if (terminal !== this.hoverTerminal) {
      this.hoverTerminal = terminal;
      this.updateMarker();
      this.requestRender();
    }
    if (input.pending) this.showPreview(input.pending, point, terminal);
    const canvas = this.renderer.domElement;
    if (terminal) {
      const info = this.terminalInfo(terminal);
      canvas.style.cursor = 'crosshair';
      if (info) this.events.hover(info);
      return terminal.startsWith('board:')
        ? `pin:${this.spots.get(terminal)?.label ?? ''}`
        : `term:${terminal}`;
    }
    const inert = this.inertPinAt(point);
    if (inert) {
      const screen = this.project(inert);
      canvas.style.cursor = 'help';
      this.events.hover({
        x: screen.x,
        y: screen.y,
        title: t('Плата · {label}', { label: inert.label }),
        detail: inertPinNote(inert.label),
      });
      return `pin:${inert.label}`;
    }
    const found = this.hit(point);
    if (found?.pick.type === 'board') {
      const named = this.boardPartAt(found.at);
      if (named) {
        const top = this.board!.group.localToWorld(
            new THREE.Vector3(named.x, STANDOFF + PCB + named.h, named.z),
          ),
          screen = this.project(top);
        canvas.style.cursor = 'help';
        this.events.hover({ x: screen.x, y: screen.y, title: named.title, detail: named.detail });
        return `part:${named.id}`;
      }
    }
    if (found?.pick.type === 'control' && found.pick.knob !== undefined) {
      const part = input.project.parts.find(
          (item) => item.id === (found.pick as { id: string }).id,
        ),
        knob = KNOBS[found.pick.knob];
      if (part && knob) {
        const screen = this.project(found.at);
        canvas.style.cursor = 'ns-resize';
        this.events.hover({
          x: screen.x,
          y: screen.y,
          title: `${knob.label} · ${knob.dial.format(dialValue(part, knob.dial))}`,
          detail: t('Тяните вверх и вниз или крутите колёсиком'),
        });
        return '';
      }
    }
    canvas.style.cursor =
      found?.pick.type === 'control'
        ? 'pointer'
        : found?.pick.type === 'part'
          ? 'grab'
          : found
            ? 'pointer'
            : '';
    if (found?.pick.type === 'tool') {
      const entry = this.tools.get(found.pick.id);
      canvas.style.cursor = 'grab';
      if (entry) {
        const screen = this.project(entry.model.group.position);
        this.events.hover({
          x: screen.x,
          y: screen.y,
          title: toolInfo[entry.kind].name,
          detail: toolInfo[entry.kind].hint,
        });
        return '';
      }
    }
    if (found?.pick.type === 'part' || found?.pick.type === 'control') {
      const part = input.project.parts.find(
        (item) => item.id === (found.pick as { id: string }).id,
      );
      const anchor = part && part.id !== input.selected && this.partAnchor(part.id);
      if (part && anchor) {
        this.events.hover({ ...anchor, title: part.label, detail: partCatalog[part.kind].name });
        return '';
      }
    }
    this.events.hover(null);
    return '';
  }
  /** Tooltip for a pin: whose it is, what it can do and the level it has right now. */
  private terminalInfo(terminal: string): HoverInfo | null {
    const input = this.input,
      spot = this.spots.get(terminal);
    if (!input || !spot) return null;
    const value = input.solution.values.get(terminal),
      screen = this.project(spot),
      part = input.project.parts.find((item) => terminal.startsWith(`${item.id}:`)),
      state =
        value?.voltage == null
          ? t('не подключено')
          : `${t('{n} В', { n: value.voltage.toFixed(2) })}${value.level === null ? '' : value.level ? ' · HIGH' : ' · LOW'}`;
    // A hole of the breadboard in the strip of a pin of the docked board is that pin.
    const pad = padOfHole(input.project, terminal);
    if (pad) {
      const note = fpgaPadNote(pad),
        level = input.frame.pins.find((item) => item.id === pad)?.level;
      return {
        x: screen.x,
        y: screen.y,
        title: t('Контакт платы · {title}', { title: note.title }),
        detail: [
          ...note.facts,
          level === undefined || level === null
            ? ''
            : level
              ? t('Сейчас: 1 (HIGH)')
              : t('Сейчас: 0 (LOW)'),
        ]
          .filter(Boolean)
          .join('\n'),
      };
    }
    if (terminal.startsWith('board:')) {
      const note = pinNote(input.project.board, spot.label);
      return {
        x: screen.x,
        y: screen.y,
        title: t('Плата · {label}', { label: note.title }),
        detail: [...note.facts, state].join('\n'),
      };
    }
    const emit = part && partCatalog[part.kind].emit,
      role = emit
        ? emit.anodes.includes(spot.label)
          ? t(' · анод (+), длинная ножка')
          : spot.label === emit.cathode
            ? t(' · катод (−), короткая ножка')
            : ''
        : '';
    return {
      x: screen.x,
      y: screen.y,
      title: `${part?.label ?? ''} · ${spot.label}${role}`,
      detail: [componentPinNote(part?.kind, spot.label), state].filter(Boolean).join('\n'),
    };
  }
  /** Labelled header holes that carry no terminal of their own: repeated GND, AREF, IOREF… */
  private inertPinAt(point: { x: number; y: number }) {
    const project = this.input?.project;
    if (!project) return null;
    const shift = dockShift(project),
      shiftKey = `${project.board}:${shift ? `${shift.x.toFixed(2)},${shift.z.toFixed(2)}` : ''}`;
    let pins = this.inertPins.get(shiftKey);
    if (!pins) {
      pins = boardLayout(project.board, shift).pins.filter((pin) => pin.label && !pin.terminal);
      this.inertPins.set(shiftKey, pins);
    }
    let best: PinSpot | null = null,
      distance = Math.min(14, Math.max(7, 1.2 * this.zoom));
    for (const pin of pins) {
      const screen = this.project(pin),
        d = Math.hypot(screen.x - point.x, screen.y - point.y);
      if (d < distance) {
        distance = d;
        best = pin;
      }
    }
    return best;
  }
  private inertPins = new Map<string, PinSpot[]>();
  private showPreview(from: string, point: { x: number; y: number }, snap = '') {
    const start = this.spots.get(from);
    if (!start) return;
    const target = this.spots.get(snap || this.terminalAt(point, from, '', this.dragReach()));
    const end = target
      ? { ...target, y: target.y + 8.5 }
      : (() => {
          const at = this.groundAt(point, start.y);
          return at ? { x: at.x, y: start.y, z: at.z } : null;
        })();
    if (!end) return;
    if (this.preview) this.preview.update(start, end);
    else {
      this.preview = previewWire(
        start,
        end,
        this.input ? probeColor(this.input.project, from) : undefined,
      );
      flat(this.preview.group);
      this.overlay.add(this.preview.group);
    }
    this.requestRender();
  }
  private showHiddenWire() {
    const entry = this.hiddenWire && this.wires.get(this.hiddenWire);
    if (entry) entry.model.group.visible = true;
    this.hiddenWire = '';
  }
  private clearPreview() {
    if (!this.preview) return;
    this.overlay.remove(this.preview.group);
    this.preview.dispose();
    this.preview = null;
  }
  private onWheel = (event: WheelEvent) => {
    event.preventDefault();
    const point = this.pointer(event),
      before = this.groundAt(point);
    const over = this.hit(point)?.pick;
    // The wheel over an instrument knob turns it a step instead of zooming the bench. A touchpad
    // sends many small deltas, so they add up to a notch before the knob moves.
    const knob = this.knobAt(point);
    if (knob) {
      this.wheelBuffer += event.deltaY;
      if (Math.abs(this.wheelBuffer) < 40) return;
      const now = dialValue(knob.part, KNOBS[knob.index]!.dial),
        next = dialStep(KNOBS[knob.index]!.dial, now, this.wheelBuffer < 0 ? 1 : -1);
      this.wheelBuffer = 0;
      if (next !== now) this.events.value(knob.part.id, next, KNOBS[knob.index]!.dial.extra);
      return;
    }
    // The wheel over a part's own control (encoder, potentiometer, slider, switch) moves it a step.
    if (
      over?.type === 'control' &&
      over.knob === undefined &&
      over.key === undefined &&
      over.bit === undefined &&
      lookOf(this.input?.project.parts.find((item) => item.id === over.id)?.kind ?? 'led') !==
        'joystick'
    ) {
      const part = this.input?.project.parts.find((item) => item.id === over.id);
      const control = part && partCatalog[part.kind].control;
      if (part && control && (control.kind === 'range' || control.kind === 'toggle')) {
        this.wheelBuffer += event.deltaY;
        if (Math.abs(this.wheelBuffer) < 40) return;
        const up = this.wheelBuffer < 0;
        this.wheelBuffer = 0;
        if (control.kind === 'toggle') {
          this.events.value(part.id, up ? 1 : 0);
          return;
        }
        const min = control.min ?? 0,
          max = control.max ?? 1023,
          step = Math.max(control.step ?? 1, Math.round((max - min) / 50));
        const next = THREE.MathUtils.clamp(part.value + (up ? step : -step), min, max);
        if (next !== part.value) this.events.value(part.id, next);
        return;
      }
    }
    // The wheel over a hand turns it, 15° a notch (Shift raises it) instead of zooming the bench.
    if (over?.type === 'tool' && this.tools.get(over.id)?.kind === 'hand') {
      const tool = this.input?.tools?.find((item) => item.id === over.id),
        direction = event.deltaY > 0 ? 1 : -1;
      if (tool && event.shiftKey)
        this.events.toolPose?.(over.id, {
          height: Math.min(
            HAND_HEIGHT.max,
            Math.max(HAND_HEIGHT.min, toolHeight(tool) - direction * 4),
          ),
        });
      else if (tool)
        this.events.toolPose?.(over.id, { angle: toolAngle(tool) + (direction * Math.PI) / 12 });
      return;
    }
    const next = THREE.MathUtils.clamp(
      this.zoomGoal * Math.exp(-event.deltaY * 0.0018),
      ZOOM.min,
      ZOOM.max,
    );
    // Keep the point under the cursor fixed while zooming.
    if (before) {
      const view = this.cameraBasis(),
        offset = new THREE.Vector2(point.x - this.width / 2, point.y - this.height / 2);
      const ratio = 1 / this.zoomGoal - 1 / next;
      const right = new THREE.Vector3(view.right.x, 0, view.right.z).normalize(),
        forward = new THREE.Vector3(-view.up.x, 0, -view.up.z).normalize();
      this.targetGoal
        .addScaledVector(right, offset.x * ratio)
        .addScaledVector(forward, (offset.y * ratio) / Math.sin(ELEVATION));
    }
    this.zoomGoal = next;
    this.requestRender();
  };
  private onDoubleClick = (event: MouseEvent) => {
    const point = this.pointer(event);
    // A double click on a knob is two steps, not a zoom.
    if (this.knobAt(point)) return;
    const found = this.hit(point);
    if (found?.pick.type === 'part') {
      const id = found.pick.id,
        kind = this.input?.project.parts.find((part) => part.id === id)?.kind;
      if (kind === 'scope') this.focusScope(id);
      else this.fit(true, id);
    } else if (!found) this.fit(true);
  };
}
