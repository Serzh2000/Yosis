// Procedural models in millimetres. Each builder returns a group positioned in world space and an
// update function that maps live simulation state onto the model.
import * as THREE from 'three';
import { boardPackages, physicalPinLabel, radioPackage } from './board-packages';
import type { ModuleVariant } from '../../../shared/pin-layout';
import { cabledKinds, pcbColor, moduleProfiles } from '../../../shared/physical';
import {
  pcbGeometry,
  slottedDiskGeometry,
  usbSocket,
  leadFrame,
  surfacePattern,
  mountingRims,
  screw,
} from './package-art';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { partCatalog, partPinNames, partValues, lookOf } from '../../../shared/catalog';
import { breadboardRows } from '../../../shared/breadboard';
import { discreteKinds, leadOffsets, uprightKinds } from '../../../shared/mount';
import {
  formatOhm,
  mcuBoards,
  type CircuitPart,
  type DeviceState,
  type McuBoardId,
} from '../../../shared/mcu';
import {
  HEADER,
  MALE_BASE,
  PCB,
  PITCH,
  STANDOFF,
  MOUNT_LIFT,
  breadboardGeometry,
  breadboardOffset,
  partLayout,
  splitHeaders,
  turnOffset,
  type BoardLayout,
  type PartLayout,
  type PinSpot,
} from './layout';
import { FLAT, box, cylinder, flat, mat, metal, palette, setPick } from './materials';
import { paintScope, type ScopeFeed } from '../scope';
import { scopePanelTexture } from './scope-art';
import {
  KNOBS,
  PANEL,
  PROBE_COLORS,
  SCREEN,
  SOCKETS,
  dialAngle,
  dialValue,
  scopeFront,
  scopeTip,
} from './scope-layout';
import {
  canvasTexture,
  glowTexture,
  lcdScreen,
  matrixScreen,
  oledScreen,
  paintBreadboard,
  clearMarkingSpot,
  paintMarking,
  paintPcb,
  paintSilkscreen,
  sevenSegmentScreen,
  tm1637Screen,
  segmentScreen,
  waveScreen,
  tftScreen,
  nokiaScreen,
  chatScreen,
  type PaintArea,
  type Screen,
} from './textures';

export interface LiveContext {
  part?: CircuitPart;
  /** What an oscilloscope on the bench has to draw this frame. */
  scope?: ScopeFeed;
  state?: DeviceState;
  leds: number[];
  /** Supply present on the module's VCC pin (or always true for passive parts). */
  powered: boolean;
  time: number;
}
export interface Model {
  group: THREE.Object3D;
  /** Returns true while the model animates on its own (motor spinning, buzzer pulsing). */
  update: (context: LiveContext) => boolean;
  /** Pressable cap or knob, if the part has one. */
  control?: THREE.Object3D;
  dispose: () => void;
}

const disposeGroup = (group: THREE.Object3D) => () =>
  group.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Sprite) {
      child.geometry.dispose();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        // Shared materials from mat() are cached and reused; only free per-model ones.
        if (material.userData.own) {
          (material as THREE.MeshStandardMaterial).map?.dispose();
          material.dispose();
        }
      }
    }
  });
function own<T extends THREE.Material>(material: T) {
  material.userData.own = true;
  return material;
}

/** Header strip; female sockets for boards, male pins for modules. Positions are local. */
export function headers(
  spots: { x: number; z: number }[],
  base: number,
  kind: 'female' | 'male' | 'down',
  pinLength = 6,
) {
  const group = new THREE.Group();
  if (!spots.length) return group;
  const bodies: THREE.BufferGeometry[] = [],
    tips: THREE.BufferGeometry[] = [];
  for (const spot of spots) {
    if (kind === 'female') {
      const body = new THREE.BoxGeometry(PITCH, HEADER, PITCH);
      body.translate(spot.x, base + HEADER / 2, spot.z);
      bodies.push(body);
      const hole = new THREE.BoxGeometry(1.05, 0.1, 1.05);
      hole.translate(spot.x, base + HEADER + 0.01, spot.z);
      tips.push(hole);
    } else {
      // A module plugged into a breadboard carries its header under the PCB, pins pointing down.
      const down = kind === 'down',
        body = new THREE.BoxGeometry(PITCH, MALE_BASE, PITCH);
      body.translate(spot.x, down ? base - MALE_BASE / 2 : base + MALE_BASE / 2, spot.z);
      bodies.push(body);
      const pin = new THREE.BoxGeometry(0.64, pinLength, 0.64);
      pin.translate(
        spot.x,
        down ? base - MALE_BASE - pinLength / 2 : base + MALE_BASE + pinLength / 2,
        spot.z,
      );
      tips.push(pin);
    }
  }
  const body = new THREE.Mesh(mergeGeometries(bodies), mat(palette.header, 0.5));
  body.castShadow = body.receiveShadow = true;
  const tip = new THREE.Mesh(
    mergeGeometries(tips),
    kind === 'female' ? mat(palette.hole, 0.9) : metal(),
  );
  tip.castShadow = true;
  for (const geometry of [...bodies, ...tips]) geometry.dispose();
  group.add(body, tip);
  return group;
}

function pcbSlab(
  width: number,
  depth: number,
  texture: THREE.Texture,
  edge = palette.pcbEdge,
  uno = false,
  ring = false,
  holes?: [number, number][],
  holeRadius = 1.35,
) {
  const slab = new THREE.Mesh(pcbGeometry(width, depth, PCB, uno, ring, holes, holeRadius), [
    own(new THREE.MeshStandardMaterial({ map: texture, roughness: 0.62 })),
    mat(edge, 0.8),
  ]);
  slab.position.y = STANDOFF;
  slab.castShadow = slab.receiveShadow = true;
  return slab;
}
function smdLed(color: string, x: number, y: number, z: number) {
  const material = own(
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.3,
      emissive: new THREE.Color(color),
      emissiveIntensity: 0,
    }),
  );
  const mesh = box(1.6, 0.7, 0.9, material, x, y, z);
  flat(mesh);
  return { mesh, set: (on: number) => (material.emissiveIntensity = on * 1.6) };
}
/** An LED of the Tang Nano 20K, drawn big enough to see and to tell from its neighbours. */
function tangLed(x: number, y: number, z: number) {
  const material = own(
    new THREE.MeshStandardMaterial({
      color: '#e3b45a',
      roughness: 0.3,
      emissive: new THREE.Color('#ffb62e'),
      emissiveIntensity: 0,
    }),
  );
  const mesh = new THREE.Group();
  // A pale pad under every LED shows where it is whether it is lit or not.
  mesh.add(cylinder(2.1, 0.12, mat('#efe9d6', 0.5), x, y, z, 24));
  mesh.add(box(2.2, 1, 1.5, material, x, y + 0.12, z));
  flat(mesh);
  const halo = glow('#ffb62e', 8);
  halo.position.set(x, y + 1.6, z);
  const halos = halo.material as THREE.SpriteMaterial;
  // Drawn over the pins around: the six must be countable from every side of the board, lit or not.
  halos.depthTest = false;
  halo.renderOrder = 20;
  halos.opacity = 0.45;
  halo.scale.setScalar(3.6);
  return {
    mesh,
    halo,
    set: (on: number) => {
      material.emissiveIntensity = on * 1.8;
      halos.opacity = 0.45 + on * 0.5;
      halo.scale.setScalar(3.6 + on * 5.4);
    },
  };
}
function glow(color: string, size: number) {
  const sprite = new THREE.Sprite(
    own(
      new THREE.SpriteMaterial({
        map: glowTexture(),
        color,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    ),
  );
  sprite.scale.set(size, size, 1);
  sprite.layers.set(FLAT);
  sprite.renderOrder = 2;
  return sprite;
}

// ---------------------------------------------------------------- boards

const boardLook: Record<string, { pcb: string; trace: string; name: string; chip: string }> = {
  uno: { pcb: '#187d8b', trace: 'rgba(116,136,186,.42)', name: 'UNO', chip: 'ATMEGA328P-PU' },
  nano: { pcb: '#1c635d', trace: 'rgba(116,136,186,.42)', name: 'NANO', chip: 'ATMEGA328P' },
  esp32: {
    pcb: '#2b2f3a',
    trace: 'rgba(120,128,150,.35)',
    name: 'ESP32 DevKitC V4',
    chip: 'ESP32-WROOM-32E',
  },
  esp32s3: {
    pcb: '#2b2f3a',
    trace: 'rgba(120,128,150,.35)',
    name: 'ESP32-S3 DevKitC-1 v1.0',
    chip: 'ESP32-S3-WROOM-1',
  },
  tangnano20k: {
    pcb: '#1b1f2b',
    trace: 'rgba(120,138,190,.34)',
    name: 'TANG NANO 20K',
    chip: 'GW2AR-18',
  },
};
export interface BoardModel extends Model {
  pins: PinSpot[];
  /** Pin that drives the on-board "L" LED, and setters for the indicator LEDs. */
  ledPin: string;
  setPinLed: (on: number) => void;
  setPowerLed: (on: number) => void;
  /** The six LEDs of the Tang Nano 20K, brightness 0 … 1 each. */
  setBoardLeds?: (levels: readonly number[]) => void;
  /** Which of the board's keys are held down, S1 then S2. */
  setBoardKeys?: (pressed: readonly boolean[]) => void;
}

interface Ink {
  text: string;
  x: number;
  z: number;
  size: number;
  angle: number;
}
/**
 * Keeps reference designators off everything that stands on the board: mounting holes, tall
 * components, connectors and the header pins. A name that does not fit beside its part is moved
 * to the nearest free spot, or left out rather than printed over something.
 */
function freePrint(
  items: Ink[],
  group: THREE.Group,
  top: number,
  pins: { x: number; z: number }[],
  holes: [number, number][],
  holeRadius: number,
  bounds: { x: number; z: number },
) {
  type Rect = { x0: number; x1: number; z0: number; z1: number };
  const blocked: Rect[] = [];
  group.updateWorldMatrix(true, true);
  const inverse = group.matrixWorld.clone().invert();
  for (const child of group.children) {
    const box = new THREE.Box3().setFromObject(child);
    if (box.isEmpty() || box.max.y < top + 0.6) continue;
    const a = box.min.clone().applyMatrix4(inverse),
      b = box.max.clone().applyMatrix4(inverse);
    blocked.push({
      x0: Math.min(a.x, b.x) - 0.6,
      x1: Math.max(a.x, b.x) + 0.6,
      z0: Math.min(a.z, b.z) - 0.6,
      z1: Math.max(a.z, b.z) + 0.6,
    });
  }
  for (const pin of pins)
    blocked.push({ x0: pin.x - 1.5, x1: pin.x + 1.5, z0: pin.z - 1.5, z1: pin.z + 1.5 });
  const r = holeRadius + 1.2;
  for (const [x, z] of holes) blocked.push({ x0: x - r, x1: x + r, z0: z - r, z1: z + r });
  const placed: Rect[] = [],
    kept: Ink[] = [],
    hit = (a: Rect, b: Rect) => a.x0 < b.x1 && b.x0 < a.x1 && a.z0 < b.z1 && b.z0 < a.z1;
  const steps: [number, number][] = [[0, 0]];
  for (const reach of [1.5, 3, 4.5, 6])
    steps.push([reach, 0], [-reach, 0], [0, reach], [0, -reach], [reach, reach], [-reach, -reach]);
  for (const item of items) {
    const along = item.text.length * item.size * 0.62,
      across = item.size * 1.2,
      vertical = Math.abs(item.angle) > 1;
    for (const [dx, dz] of steps) {
      const x = item.x + dx,
        z = item.z + dz,
        w = vertical ? across : along,
        d = vertical ? along : across,
        rect = { x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 };
      if (
        rect.x0 < -bounds.x ||
        rect.x1 > bounds.x ||
        rect.z0 < -bounds.z ||
        rect.z1 > bounds.z ||
        [...blocked, ...placed].some((other) => hit(rect, other))
      )
        continue;
      placed.push(rect);
      kept.push({ ...item, x, z });
      break;
    }
  }
  return kept;
}
/** Reference designators and connector names printed beside the components of each board. */
function componentPrint(board: McuBoardId, width: number, depth: number, s3: boolean) {
  const w = width / 2;
  const t = (text: string, x: number, z: number, size = 1, angle = 0) => ({
    text,
    x,
    z,
    size,
    angle,
  });
  void depth;
  if (board === 'uno')
    return [
      t('USB', -w + 15, -13.5, 1.1),
      t('DC IN', -w + 15, 22.5, 1.1),
      t('7-12V', -w + 15, 24, 0.8),
      t('Y1 16MHz', -6, 1.5, 0.9),
      t('U1 REG', -18, 9.2, 0.8),
      t('F1', -26, 8, 0.9),
      t('D1', -19.5, 0.3, 0.8),
      t('C1', -w + 17, 23, 0.8),
      t('C2', -w + 24, 23, 0.8),
      t('U3', -15.5, -13.5, 0.8),
      t('ICSP', w - 6.5, -5.5, 0.9),
      t('ICSP2', 20, -22.5, 0.8),
      t('U2 328P', 12.5, 15, 0.9),
    ];
  if (board === 'nano')
    return [
      t('USB', -w + 9.5, 0, 0.9, -Math.PI / 2),
      t('U1 328P', -5.5, -6.2, 0.7),
      t('Y1', -1, -7, 0.7),
      t('ICSP', 20, 5.6, 0.7),
      t('CH340', -1, 4.1, 0.6),
    ];
  const x0 = -w;
  return [
    t(s3 ? 'USB' : 'USB', x0 + 8.4, s3 ? -5 : 0, 0.9, -Math.PI / 2),
    ...(s3 ? [t('UART', x0 + 8.4, 5, 0.8, -Math.PI / 2)] : []),
    t('U2 REG', x0 + (s3 ? 23 : 20), 4.5, 0.7),
    t('PWR', x0 + (s3 ? 17.5 : 12), -10.4, 0.8),
    ...(s3 ? [t('RGB', x0 + 20, 10.2, 0.8)] : []),
    t(s3 ? 'U1 CP2102N' : 'U1 CP2102', x0 + (s3 ? 14.5 : 10.5), 4.2, 0.6),
    t('3V3 5V GND', x0 + (s3 ? 26 : 22), -6.8, 0.6),
  ];
}
export function buildBoard(layout: BoardLayout, variant?: ModuleVariant): BoardModel {
  const group = new THREE.Group(),
    { width, depth, center } = layout,
    look = boardLook[layout.board]!,
    top = STANDOFF + PCB;
  group.position.set(center.x, center.y, center.z);
  group.rotation.y = layout.rotation;
  // On a breadboard the board floats over it on its own pins, which point down into the holes.
  const docked = center.y > 0;
  setPick(group, { type: 'board' });
  // Undo boardToWorld.
  const local = layout.pins.map((pin) => ({ ...pin, x: pin.x - center.x, z: pin.z - center.z }));
  const shadows: PaintArea[] = [],
    toPaint = (x: number, z: number, w: number, d: number): PaintArea => ({
      x: x + width / 2 - w / 2,
      z: z + depth / 2 - d / 2,
      width: w,
      depth: d,
    });
  const add = (mesh: THREE.Mesh, w: number, d: number) => {
    shadows.push(toPaint(mesh.position.x, mesh.position.z, w, d));
    group.add(mesh);
    return mesh;
  };
  const passive = (x: number, z: number, length = 1.6, color = '#a99470') => {
    group.add(flat(box(length, 0.45, 0.8, mat(color), x, top, z)));
    for (const side of [-1, 1])
      group.add(flat(box(0.3, 0.48, 0.85, metal(), x + side * (length / 2 - 0.15), top, z)));
  };
  const qfp = (x: number, z: number, size: number, label: string, angle = 0) => {
    const pack = new THREE.Group();
    pack.position.set(x, top, z);
    pack.rotation.y = angle;
    pack.add(box(size, 1, size, mat(palette.chip), 0, 0, 0));
    leadFrame(pack, 0, 0, 0, size, size, 8);
    const print = new THREE.Mesh(
      new THREE.PlaneGeometry(size - 0.6, size - 0.8),
      own(new THREE.MeshStandardMaterial({ map: paintMarking(label, size - 0.6, size - 0.8) })),
    );
    print.rotation.x = -Math.PI / 2;
    print.position.y = 1.02;
    flat(print);
    pack.add(print);
    pack.add(flat(cylinder(0.23, 0.03, mat('#a7a9a5'), -size / 2 + 0.65, 1.03, -size / 2 + 0.65)));
    group.add(pack);
    shadows.push(toPaint(x, z, size * 1.42, size * 1.42));
  };
  const smallButton = (x: number, z: number, key?: 'S1' | 'S2') => {
    const body = box(4.4, 1.2, 3.4, mat('#d4d3c9', 0.4, 0.3), x, top, z);
    const cap = cylinder(1.15, 0.6, mat('#efece2'), x, top + 1.2, z, 20);
    group.add(body, cap);
    for (const sx of [-1, 1])
      for (const sz of [-1, 1])
        group.add(flat(box(0.7, 0.3, 0.7, metal(), x + sx * 2.3, top, z + sz * 1.3)));
    if (!key) return undefined;
    // A key of the board is pressed with the pointer: a pad wider than the key itself catches the
    // click, so it does not have to be aimed at four millimetres.
    const pad = box(8, 3, 7, mat('#ffffff'), x, top + 0.8, z);
    pad.visible = false;
    group.add(pad);
    for (const part of [body, cap, pad]) setPick(part, { type: 'board-key', id: key });
    return cap;
  };
  let onLed: ReturnType<typeof smdLed>, pinLed: ReturnType<typeof smdLed> | undefined;
  const tangLeds: ReturnType<typeof tangLed>[] = [];
  let setKeys: ((pressed: readonly boolean[]) => void) | undefined;
  if (layout.board === 'uno') {
    usbSocket(group, -width / 2 + 6, top, -11, 'B');
    // Hollow power connector, opening towards the left edge.
    const jack = mat('#252a2c', 0.55),
      jx = -width / 2 + 5.5;
    group.add(box(14, 1.5, 9, jack, jx, top, 16), box(14, 1.5, 9, jack, jx, top + 9.5, 16));
    for (const side of [-1, 1]) group.add(box(14, 8, 1.4, jack, jx, top + 1.5, 16 + side * 3.8));
    group.add(box(1, 10, 8, jack, jx + 6.5, top, 16));
    const mouth = new THREE.Mesh(new THREE.RingGeometry(2.7, 4, 28), jack);
    mouth.rotation.y = -Math.PI / 2;
    mouth.position.set(jx - 7.01, top + 5.5, 16);
    group.add(mouth);
    const contact = cylinder(0.8, 4, metal(), 0, 0, 0);
    contact.rotation.z = Math.PI / 2;
    contact.position.set(jx - 3, top + 5.5, 16);
    group.add(contact);
    group.add(box(36, 1.1, 10, mat('#181e21'), 12.5, top, 10));
    const chip = add(box(35, 3.6, 7.6, mat(palette.chip, 0.45), 12.5, top + 1.2, 10), 35, 9);
    const marking = new THREE.Mesh(
      new THREE.PlaneGeometry(33, 6.4),
      own(
        new THREE.MeshStandardMaterial({
          map: paintMarking('ATMEGA328P-PU', 33, 6.4),
          roughness: 0.45,
        }),
      ),
    );
    marking.rotation.x = -Math.PI / 2;
    marking.position.set(12.5, top + 4.82, 10);
    group.add(marking);
    const legs: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 14; i++)
      for (const side of [-1, 1]) {
        const leg = new THREE.BoxGeometry(0.6, 1.4, 1.2);
        leg.translate(12.5 - 16.5 + i * PITCH, top + 0.7, 10 + side * 4.2);
        legs.push(leg);
      }
    const legMesh = new THREE.Mesh(mergeGeometries(legs), metal());
    legMesh.castShadow = true;
    group.add(legMesh);
    for (const geometry of legs) geometry.dispose();
    void chip;
    add(cylinder(3.2, 7, mat('#ebebe6', 0.34, 0.45), -width / 2 + 17, top, 18), 6.4, 6.4);
    add(cylinder(3.2, 7, mat('#ebebe6', 0.34, 0.45), -width / 2 + 24, top, 18), 6.4, 6.4);
    add(box(10, 3.4, 3.6, mat(palette.metal, 0.4, 0.5), -6, top, -2), 10, 3.6);
    add(box(6, 3, 6, mat(palette.cream, 0.55), -width / 2 + 7, top, -22), 6, 6);
    group.add(cylinder(1.7, 1.2, mat('#ec5a4b', 0.4), -width / 2 + 7, top + 3, -22));
    qfp(-15.5, -9, 5, 'ATMEGA16U2', Math.PI / 4);
    const icsp = headers(
      [-1, 0, 1].flatMap((i) => [
        { x: width / 2 - 4.2, z: 2 + i * PITCH },
        { x: width / 2 - 4.2 - PITCH, z: 2 + i * PITCH },
      ]),
      top,
      'male',
    );
    group.add(icsp);
    pinLed = smdLed('#f5b444', -4, top, -16);
    onLed = smdLed('#8bd67c', 22, top, -2);
    group.add(pinLed.mesh, onLed.mesh);
    // Details of the real R3: 5 V regulator, resettable fuse, protection diode, the resonator and
    // programming header of the USB chip, and the TX / RX indicators.
    add(box(6.5, 1.8, 3.5, mat('#2a2d38', 0.45), -18, top, 6), 6.5, 3.5);
    add(box(2.6, 0.5, 3.2, mat(palette.metal, 0.35, 0.6), -22.2, top, 6), 2.6, 3.2);
    add(box(3.4, 0.9, 1.9, mat('#d8b24a', 0.5), -19.5, top, -2.6), 3.4, 1.9);
    add(box(4.4, 1.6, 2.7, mat('#1f2330', 0.5), -26, top, 4.5), 4.4, 2.7);
    add(box(3.6, 1.3, 1.8, mat(palette.metal, 0.4, 0.4), 11, top, -16.5), 3.6, 1.8);
    group.add(
      smdLed('#f5b444', -0.8, top, -16).mesh,
      smdLed('#f5b444', 2.4, top, -16).mesh,
      headers(
        [-1, 0, 1].flatMap((i) => [
          { x: 20 + i * PITCH, z: -18.5 - 1.27 },
          { x: 20 + i * PITCH, z: -18.5 + 1.27 },
        ]),
        top,
        'male',
      ),
    );
  } else if (layout.board === 'nano') {
    usbSocket(group, -width / 2 + 3.5, top, 0, 'mini');
    qfp(-5.5, 0, 7, 'ATMEGA328P', Math.PI / 4);
    smallButton(2.8, 0);
    const crystal = box(3.6, 1.1, 1.6, metal(), -1, -0.0 + top, -4.7);
    crystal.rotation.y = Math.PI / 4;
    add(crystal, 4.5, 4.5);
    const icsp = [18.69, 21.23].flatMap((x) => [-PITCH, 0, PITCH].map((z) => ({ x, z })));
    group.add(headers(icsp, top, 'male'));
    pinLed = smdLed('#f5b444', 7.4, top, 1.55);
    onLed = smdLed('#8bd67c', 7.4, top, 4.65);
    group.add(
      pinLed.mesh,
      onLed.mesh,
      smdLed('#f5b444', 7.4, top, -4.65).mesh,
      smdLed('#f5b444', 7.4, top, -1.55).mesh,
    );
    for (const z of [-4.65, -1.55, 1.55, 4.65]) passive(10.4, z, 1.2, '#3b3d3b');
    for (const z of [-3, 0, 3]) passive(-13, z, 1.2);
    // Classic Nano's USB bridge and regulator are on the underside, never on top of RESET.
    group.add(box(10, 1.2, 5.3, mat(palette.chip), -1, 0.5, 0));
    leadFrame(group, -1, 0.4, 0, 10, 5.3, 14);
    group.add(box(6.5, 1.4, 3.5, mat(palette.chip), -11, 0.3, 0));
  } else if (layout.board === 'tangnano20k') {
    // Sipeed Tang Nano 20K: USB-C and two buttons at the left end, the GW2AR-18 under its
    // black lid, the flash and the debugger chip, a white FPC socket and the HDMI port.
    const w = width / 2;
    usbSocket(group, -w + 4.2, top, 0, 'C');
    const keyCaps = [smallButton(-w + 12.5, 6.8, 'S1')!, smallButton(-w + 12.5, -6.8, 'S2')!];
    setKeys = (pressed) =>
      keyCaps.forEach((cap, i) => (cap.position.y = top + (pressed[i] ? 0.75 : 1.2)));
    // The FPGA: a square package with its marking, the largest part on the board.
    add(box(11.2, 1.5, 11.2, mat('#17181d', 0.5), -w + 22, top, 0), 11.2, 11.2);
    group.add(
      flat(
        (() => {
          const print = new THREE.Mesh(
            new THREE.PlaneGeometry(10, 10),
            own(new THREE.MeshStandardMaterial({ map: paintMarking('GOWIN GW2AR-18', 10, 10) })),
          );
          print.rotation.x = -Math.PI / 2;
          print.position.set(-w + 22, top + 1.52, 0);
          return print;
        })(),
      ),
    );
    group.add(flat(cylinder(0.3, 0.03, mat('#a7a9a5'), -w + 17.9, top + 1.53, 4.1)));
    qfp(-w + 12.8, 0, 4.6, 'BL616');
    qfp(-w + 33, -5.6, 3.6, 'FLASH');
    // The debugger and regulator, the crystal, a handful of resistors and capacitors.
    add(box(6, 1.4, 3.4, mat(palette.chip), -w + 31.5, top, 3.2), 6, 3.4);
    const crystal = box(3.2, 0.9, 2.5, metal(), -w + 30.8, top, 0.4);
    add(crystal, 3.2, 2.5);
    for (const z of [-3.6, -1.8, 1.8, 3.6]) passive(-w + 36.4, z, 1.2, '#3b3d3b');
    for (const x of [-w + 27.4, -w + 28.8, -w + 38.2]) passive(x, -9.8, 1.6);
    // The FPC socket for a display and the HDMI port on the right.
    add(box(24, 2.2, 6.2, mat('#e7e4da', 0.6), w - 21.5, top, 6.2), 24, 6.2);
    group.add(flat(box(24, 0.7, 2, mat('#2a2c33', 0.5), w - 21.5, top + 2.2, 7.2)));
    add(box(14.8, 6.6, 15.5, mat('#bfc3c8', 0.3, 0.75), w - 5.2, top, 0), 14.8, 15.5);
    add(box(0.3, 4, 13.6, mat('#15191d', 0.8), w + 2.3, top + 1.3, 0), 0.3, 13.6);
    // The six LEDs by the lower header and the RGB LED beside the FPGA.
    onLed = smdLed('#e84a3a', -w + 8, top, -8.4);
    group.add(onLed.mesh);
    // Larger than the real 0603 parts and wider apart, each with its own halo, so that the six
    // can be told apart from the screen and read one by one.
    for (let i = 0; i < 6; i++) {
      const led = tangLed(-w + 16.6 + i * 2.7, top, -8);
      tangLeds.push(led);
      group.add(led.mesh, led.halo);
    }
    group.add(flat(box(2.4, 0.5, 2.4, mat('#f4f4f0', 0.4), -w + 29.5, top, -2.4)));
    for (const x of [-w + 26.5, -w + 28.1, -w + 29.7]) passive(x, 3, 1.2, '#3b3d3b');
  } else {
    const s3 = layout.board === 'esp32s3',
      radio = radioPackage(layout.board as 'esp32' | 'esp32s3', variant),
      moduleStart = radio.start,
      shieldX = moduleStart + radio.shieldLength / 2,
      antennaX = radio.end - 3.75;
    add(
      box(radio.length, 0.7, 18, mat('#253d35'), moduleStart + radio.length / 2, top, 0),
      radio.length,
      18,
    );
    add(
      box(radio.shieldLength, 2.5, 17.5, mat('#bac2c4', 0.32, 0.75), shieldX, top + 0.7, 0),
      radio.shieldLength,
      17.5,
    );
    // Folded RF-shield seam and its laser marking.
    for (const z of [-8.75, 8.75])
      group.add(
        flat(box(radio.shieldLength, 0.2, 0.3, mat('#7c858a', 0.3, 0.7), shieldX, top + 3.2, z)),
      );
    const marking = new THREE.Mesh(
      new THREE.PlaneGeometry(16.5, 14),
      own(
        new THREE.MeshStandardMaterial({
          map: paintSilkscreen(16.5, 14, [
            { text: 'ESPRESSIF', x: 8.25, z: 3, size: 1.8 },
            { text: s3 ? 'ESP32-S3' : 'ESP32', x: 8.25, z: 6.2, size: 1.7 },
            { text: radio.marking, x: 8.25, z: 8.9, size: 1.3 },
          ]),
          transparent: true,
          color: '#2d3437',
        }),
      ),
    );
    marking.rotation.x = -Math.PI / 2;
    marking.position.set(shieldX, top + 3.22, 0);
    flat(marking);
    group.add(marking);
    for (let i = 0; i < 14; i++)
      for (const side of [-1, 1])
        group.add(
          flat(
            box(
              1,
              0.2,
              1.1,
              mat('#d2b372', 0.3, 0.65),
              moduleStart + 1.5 + i * 1.27,
              top + 0.1,
              side * 9,
            ),
          ),
        );
    for (let i = 0; i < (s3 ? 12 : 10); i++)
      group.add(
        flat(
          box(
            1.1,
            0.2,
            0.8,
            mat('#d2b372', 0.3, 0.65),
            moduleStart,
            top + 0.1,
            (i - ((s3 ? 12 : 10) - 1) / 2) * 1.27,
          ),
        ),
      );
    for (let i = 0; i < 5; i++) {
      const x = antennaX - 2.5 + i * 1.1;
      group.add(flat(box(0.45, 0.06, 13, mat('#c6ad68', 0.35, 0.65), x, top + 0.71, 0)));
      if (i < 4)
        group.add(
          flat(
            box(
              1.5,
              0.06,
              0.45,
              mat('#c6ad68', 0.35, 0.65),
              x + 0.55,
              top + 0.71,
              i % 2 ? 6.3 : -6.3,
            ),
          ),
        );
    }
    const usbX = -width / 2 + 3.8;
    for (const z of s3 ? [-5, 5] : [0]) usbSocket(group, usbX, top, z, 'micro');
    const buttonX = -width / 2 + (s3 ? 10.4 : 3.8);
    smallButton(buttonX, -8.3);
    smallButton(buttonX, 8.3);
    qfp(-width / 2 + (s3 ? 14.5 : 10.5), 0, s3 ? 3 : 5, s3 ? 'CP2102N' : 'CP2102');
    const regulatorX = -width / 2 + (s3 ? 23 : 20);
    add(box(6.5, 1.7, 3.5, mat(palette.chip), regulatorX, top, 0), 6.5, 3.5);
    group.add(flat(box(4.5, 0.25, 3, metal(), regulatorX, top, 3.2)));
    for (const x of [-2, 0, 2])
      group.add(flat(box(0.8, 0.3, 2, metal(), regulatorX + x, top, -2.6)));
    for (const z of [-5.8, 5.8])
      for (const x of [regulatorX - 3, regulatorX + 1, regulatorX + 5]) passive(x, z, 1.6);
    for (const z of [-4, 4]) passive(-width / 2 + 10, z, 1.2, '#333a39');
    onLed = smdLed('#e84a3a', -width / 2 + (s3 ? 17.5 : 12), top, -8.3);
    group.add(onLed.mesh);
    if (s3) {
      group.add(flat(box(3.5, 0.8, 3.5, mat('#ebe8dc'), -width / 2 + 20, top, 7.5)));
      group.add(flat(cylinder(1.2, 0.1, mat('#d8c9a4'), -width / 2 + 20, top + 0.8, 7.5)));
    }
    // DevKitC V4 has a power LED; its GPIO2 is not a fabricated onboard indicator.
  }
  const s3Board = layout.board === 'esp32s3';
  const printing = [
    ...local
      .filter((pin) => pin.label)
      .map((pin) => ({
        text: physicalPinLabel(layout.board, pin.label),
        x: pin.x + width / 2,
        z: pin.z + depth / 2 + (pin.z < 0 ? 1 : -1) * (layout.board === 'uno' ? 3.3 : 1.85),
        size: layout.board === 'uno' ? 1.2 : 0.95,
        angle: layout.board === 'uno' && !/^D[0-9]+$/.test(pin.label) ? -Math.PI / 2 : 0,
        weight: 700,
      })),
    // Every component on the board gets its reference name beside it, as a real board prints.
    ...freePrint(
      componentPrint(layout.board, width, depth, s3Board),
      group,
      top,
      local,
      boardPackages[layout.board].holes,
      boardPackages[layout.board].holeRadius,
      { x: width / 2 - 0.8, z: depth / 2 - 0.8 },
    ).map((item) => ({
      weight: 700,
      ...item,
      x: item.x + width / 2,
      z: item.z + depth / 2,
    })),
    ...(layout.board === 'tangnano20k'
      ? [
          { text: 'SIPEED', x: width / 2 - 6, z: depth / 2 - 5.2, size: 2, weight: 700 },
          { text: look.name, x: width / 2 + 3, z: depth / 2 + 1.2, size: 1.5, weight: 700 },
          { text: 'S1', x: width / 2 - width / 2 + 12.5, z: depth / 2 + 3.5, size: 0.9 },
          { text: 'S2', x: 12.5, z: depth / 2 - 3.5, size: 0.9 },
          // The six LEDs are numbered where they sit, towards the middle of the board.
          ...Array.from({ length: 6 }, (_, i) => ({
            text: String(i),
            x: 16.6 + i * 2.7,
            z: depth / 2 - 6.4,
            size: 1,
            weight: 700,
          })),
        ]
      : []),
    ...(layout.board === 'uno' || layout.board === 'nano'
      ? [
          {
            text: look.name,
            x: width / 2 + (layout.board === 'uno' ? 13 : 13.2),
            z: depth / 2 + (layout.board === 'uno' ? -4 : 0),
            size: layout.board === 'uno' ? 4.4 : 1.2,
            weight: 700,
          },
        ]
      : []),
    ...(layout.board === 'uno'
      ? [
          { text: 'DIGITAL (PWM ~)', x: width / 2 + 13, z: depth / 2 - 18, size: 1.15 },
          { text: 'ANALOG IN', x: width / 2 + 21, z: depth / 2 + 18.2, size: 1.1 },
          { text: 'POWER', x: width / 2 + 1, z: depth / 2 + 18.2, size: 1.1 },
          { text: 'RESET', x: width / 2 - 26, z: depth / 2 - 17.3, size: 1 },
          { text: 'L  TX RX', x: width / 2 - 1, z: depth / 2 - 13.3, size: 0.95 },
          { text: 'ON', x: width / 2 + 22, z: depth / 2 + 1, size: 1 },
        ]
      : layout.board === 'nano'
        ? [
            ...['TX', 'RX', 'L', 'ON'].map((text, i) => ({
              text,
              x: width / 2 + 5.1,
              z: depth / 2 - 4.65 + i * 3.1,
              size: 0.6,
              angle: -Math.PI / 2,
            })),
            { text: 'RESET', x: width / 2 + 0.3, z: depth / 2, size: 0.7, angle: -Math.PI / 2 },
          ]
        : [
            { text: 'EN', x: layout.board === 'esp32' ? 5.6 : 10.4, z: depth / 2 - 5.7, size: 0.8 },
            {
              text: 'BOOT',
              x: layout.board === 'esp32' ? 5.6 : 10.4,
              z: depth / 2 + 5.7,
              size: 0.8,
            },
          ]),
  ];
  const texture = paintPcb(width, depth, {
    base: look.pcb,
    trace: look.trace,
    seed: layout.board.length * 7,
    shadows,
    pads: [],
  });
  const silk = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    own(
      new THREE.MeshBasicMaterial({
        map: paintSilkscreen(width, depth, printing),
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      }),
    ),
  );
  silk.rotation.x = -Math.PI / 2;
  silk.position.y = top + 0.03;
  flat(silk);
  group.add(silk);
  const pack = boardPackages[layout.board];
  group.add(
    pcbSlab(
      width,
      depth,
      texture,
      palette.pcbEdge,
      layout.board === 'uno',
      false,
      pack.holes,
      pack.holeRadius,
    ),
  );
  mountingRims(group, width, depth, top + 0.02, pack.holes, pack.holeRadius);
  const female = docked
    ? headers(local, STANDOFF, 'down', 6)
    : headers(local, top, layout.board === 'uno' ? 'female' : 'male');
  group.add(female);
  const blink = mcuBoards[layout.board].ledPin;
  const ledPin =
    layout.board === 'tangnano20k'
      ? String(blink)
      : layout.board === 'uno' || layout.board === 'nano'
        ? `D${blink}`
        : `IO${blink}`;
  return {
    group,
    pins: layout.pins,
    update: () => false,
    dispose: disposeGroup(group),
    ledPin,
    setPinLed: pinLed?.set ?? (() => {}),
    setPowerLed: onLed.set,
    setBoardLeds: (levels) => tangLeds.forEach((led, i) => led.set(levels[i] ?? 0)),
    setBoardKeys: (pressed) => setKeys?.(pressed),
  };
}

// ---------------------------------------------------------------- parts

function ledDome(color: string, milky = false) {
  const profile = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(2.95, 0),
    new THREE.Vector2(2.95, 1),
    new THREE.Vector2(2.5, 1),
    new THREE.Vector2(2.5, 5.6),
  ];
  for (let i = 1; i <= 8; i++) {
    const angle = (i / 8) * (Math.PI / 2);
    profile.push(new THREE.Vector2(2.5 * Math.cos(angle), 5.6 + 2.5 * Math.sin(angle)));
  }
  const material = own(
    new THREE.MeshStandardMaterial({
      color: milky ? '#f2efe6' : color,
      roughness: 0.22,
      emissive: new THREE.Color(milky ? '#ffffff' : color),
      emissiveIntensity: 0.05,
    }),
  );
  const mesh = new THREE.Mesh(new THREE.LatheGeometry(profile, 28), material);
  mesh.castShadow = true;
  return { mesh, material };
}

interface Build {
  group: THREE.Group;
  top: number;
  width: number;
  depth: number;
  part: CircuitPart;
  shadows: PaintArea[];
  labels: { text: string; x: number; z: number; size: number; weight?: number }[];
  updates: ((context: LiveContext) => boolean | void)[];
  control?: THREE.Object3D;
  /** Held in the air by the pointer: leads and pins are drawn long, ready to be pushed in. */
  carry?: boolean;
}
/** How far a carried part hangs above its seat, and how far its leads reach below the body. */
export const CARRY_LIFT = 14;
const LEAD_REACH = { long: 11, short: 9, stub: 3.5 };
const add = (build: Build, mesh: THREE.Object3D, w: number, d: number, paint = true) => {
  build.group.add(mesh);
  if (paint)
    build.shadows.push({
      x: mesh.position.x + build.width / 2 - w / 2,
      z: mesh.position.z + build.depth / 2 - d / 2,
      width: w,
      depth: d,
    });
  return mesh;
};
function screenPlane(
  build: Build,
  screen: Screen,
  w: number,
  d: number,
  x: number,
  y: number,
  z: number,
) {
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    own(
      new THREE.MeshStandardMaterial({
        map: screen.texture,
        emissiveMap: screen.texture,
        emissive: new THREE.Color('#ffffff'),
        emissiveIntensity: 0.85,
        roughness: 0.3,
      }),
    ),
  );
  plane.rotation.x = -Math.PI / 2;
  plane.position.set(x, y, z);
  build.group.add(plane);
  build.updates.push((context) => void screen.paint(context.state, context.leds));
}
function lens(build: Build, color: string, x: number, z: number, index: number, size = 18) {
  const { mesh, material } = ledDome(color);
  mesh.position.set(x, build.top, z);
  add(build, mesh, 6, 6);
  const halo = glow(color, size);
  halo.position.set(x, build.top + 6, z);
  build.group.add(halo);
  build.updates.push(({ leds }) => {
    const t = Math.min(1, Math.max(0, leds[index] ?? 0));
    material.emissiveIntensity = 0.05 + t * 1.4;
    (halo.material as THREE.SpriteMaterial).opacity = t * 0.85;
  });
}
function chipBlock(build: Build, text: string, w: number, d: number, x = 0, z = -2, h = 1.4) {
  const chip = box(w, h, d, mat(palette.chip, 0.45), x, build.top, z);
  add(build, chip, w, d);
  const marking = new THREE.Mesh(
    new THREE.PlaneGeometry(w * 0.92, d * 0.8),
    own(
      new THREE.MeshStandardMaterial({
        map: paintMarking(text, w * 0.92, d * 0.8),
        roughness: 0.45,
      }),
    ),
  );
  marking.rotation.x = -Math.PI / 2;
  marking.position.set(x, build.top + h + 0.02, z);
  build.group.add(marking);
  if (!discreteKinds.has(lookOf(build.part.kind))) {
    leadFrame(build.group, x, build.top, z, w, d, Math.min(8, Math.max(3, Math.round(w / 2))));
    for (const side of [-1, 1]) {
      const px = Math.max(
        -build.width / 2 + 2.5,
        Math.min(build.width / 2 - 2.5, x + side * (w / 2 + 2)),
      );
      build.group.add(box(1.2, 0.65, 2, mat('#bda984'), px, build.top, z + d / 2 + 1));
      build.group.add(box(1.3, 0.15, 0.4, metal(), px, build.top, z + d / 2 + 0.1));
    }
  }
}
function trimmer(build: Build, x: number, z: number) {
  add(build, box(4.5, 4.5, 4.5, mat('#3d6fc4', 0.5), x, build.top, z), 4.5, 4.5);
  build.group.add(cylinder(1.6, 0.4, mat(palette.metal, 0.4, 0.5), x, build.top + 4.5, z, 16));
}

type Detail = (build: Build, value: number) => void;
const sensorDetail: Partial<Record<string, Detail>> = {
  pir: (b) => {
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(11, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      mat('#f6f2ea', 0.75),
    );
    dome.position.set(0, b.top, -2);
    dome.castShadow = true;
    add(b, dome, 22, 22);
    for (const radius of [3, 5.5, 8, 10]) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 0.15, 4, 32),
        mat('#d6dbd5', 0.8),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(0, b.top + Math.sqrt(121 - radius * radius), -2);
      b.group.add(ring);
    }
    trimmer(b, -8, 9);
    trimmer(b, 8, 9);
  },
  ldr: (b) => {
    add(b, cylinder(4.4, 2.2, mat('#d9a25c', 0.5), 0, b.top + 1.4, -3), 8.8, 8.8);
    const face = surfacePattern('ldr', 7.4, 7.4);
    face.position.set(0, b.top + 3.62, -3);
    b.group.add(face);
    // Two short leads and the plastic rim of the real photoresistor.
    for (const x of [-1.3, 1.3]) b.group.add(box(0.5, 1.4, 0.5, metal(), x, b.top, -3));
    const rim = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.28, 6, 36), mat('#8a6a3a', 0.5));
    rim.rotation.x = Math.PI / 2;
    rim.position.set(0, b.top + 3.55, -3);
    b.group.add(rim);
  },
  flame: (b) => {
    const { mesh } = ledDome('#1d1f27');
    mesh.position.set(0, b.top, -4);
    add(b, mesh, 6, 6);
    trimmer(b, 8, 1);
  },
  irobstacle: (b) => {
    const a = ledDome('#f2efe6');
    a.mesh.position.set(-4, b.top, -6);
    a.mesh.rotation.x = Math.PI / 2;
    a.mesh.position.y = b.top + 3;
    const c = ledDome('#1d1f27');
    c.mesh.position.set(4, b.top + 3, -6);
    c.mesh.rotation.x = Math.PI / 2;
    add(b, a.mesh, 6, 6);
    add(b, c.mesh, 6, 6);
    trimmer(b, 0, 2);
  },
  soil: (b) => {
    for (const x of [-5, 5]) {
      const shape = new THREE.Shape();
      shape.moveTo(x - 2, 0);
      shape.lineTo(x + 2, 0);
      shape.lineTo(x + 2, 20);
      shape.lineTo(x, 25);
      shape.lineTo(x - 2, 20);
      shape.closePath();
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.8, bevelEnabled: false });
      geometry.rotateX(-Math.PI / 2);
      const probe = new THREE.Mesh(geometry, mat('#bea165', 0.4, 0.5));
      probe.position.set(0, b.top, -1);
      b.group.add(probe);
    }
    chipBlock(b, 'LM393', 5, 4, 0, 5, 1);
  },
  water: (b) => {
    const face = surfacePattern('water', 14, 23);
    face.position.set(0, b.top + 0.15, -4);
    b.group.add(face);
  },
  gas: (b) => {
    add(b, cylinder(8, 8, mat('#b9b6ae', 0.6, 0.4), 0, b.top, -3), 16, 16);
    b.group.add(cylinder(6.4, 0.3, mat('#6f6c66', 0.8), 0, b.top + 8, -3));
    const mesh = surfacePattern('mesh', 10, 10);
    mesh.position.set(0, b.top + 8.32, -3);
    b.group.add(mesh);
    trimmer(b, 12, 1);
    chipBlock(b, 'LM393', 5, 4, -11, 2, 1);
  },
  sound: (b) => {
    add(b, cylinder(4.8, 5, mat('#b9b6ae', 0.5, 0.5), -6, b.top, -3), 9.6, 9.6);
    b.group.add(cylinder(4.2, 0.2, mat('#1d1f27', 0.9), -6, b.top + 5, -3));
    trimmer(b, 6, -2);
  },
  touch: (b) => {
    add(b, cylinder(7, 0.4, mat('#d8c27a', 0.35, 0.6), 0, b.top, -3), 14, 14);
  },
  force: (b) => {
    add(b, cylinder(8, 0.5, mat('#2c2a28', 0.6), 0, b.top, -3), 16, 16);
    b.group.add(box(6, 0.3, 18, mat('#c3a46f', 0.6), 0, b.top, 9));
    for (const x of [-1.5, 1.5]) b.group.add(box(0.6, 0.05, 18, metal(), x, b.top + 0.31, 9));
  },
  temperature: (b) => toNinetyTwo(b, 'TMP36'),
  lm35: (b) => toNinetyTwo(b, 'LM35'),
  ntc: (b) => {
    const bead = new THREE.Mesh(new THREE.SphereGeometry(2.8, 20, 14), mat('#2f3547', 0.3));
    bead.scale.y = 1.25;
    bead.position.set(0, b.top + 5.2, -3);
    bead.castShadow = true;
    add(b, bead, 5.6, 5.6);
    for (const x of [-1, 1]) b.group.add(box(0.5, 3.4, 0.5, metal(), x, b.top, -3));
  },
  tilt: (b) => {
    // SW-520D: a small steel can lying on its side, plastic plug at one end, two leads out of it.
    const can = cylinder(1.9, 7.5, mat('#c9ccd3', 0.3, 0.7), 0, 0, 0, 24);
    can.rotation.z = Math.PI / 2;
    can.position.set(0, b.top + 2.4, -3);
    add(b, can, 7.5, 3.8);
    const plug = cylinder(1.95, 1.6, mat('#1d1f27', 0.5), 3.9, 0, 0, 24);
    plug.rotation.z = Math.PI / 2;
    plug.position.set(3.9, b.top + 2.4, -3);
    b.group.add(plug);
    for (const z of [-3.9, -2.1]) b.group.add(box(0.5, 2.4, 0.5, metal(), 4.6, b.top, z));
  },
  reed: (b) => {
    const y = b.top + 2,
      z = -b.depth / 2 - 2.6;
    const glassMaterial = own(
      new THREE.MeshStandardMaterial({
        color: '#b5e0d9',
        roughness: 0.12,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      }),
    );
    const glass = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 1.5, 14, 24, 1, true),
      glassMaterial,
    );
    glass.rotation.z = Math.PI / 2;
    glass.position.set(0, y, z);
    b.group.add(glass);
    for (const side of [-1, 1]) {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.16, 6, 24), mat('#9bc9bd', 0.2));
      rim.rotation.y = Math.PI / 2;
      rim.position.set(side * 6.8, y, z);
      b.group.add(rim);
      const lead = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 2, y, z),
        new THREE.Vector3(side * 9, y, z),
        new THREE.Vector3(side * 8.2, y, z + 4),
        new THREE.Vector3(side * 6.2, b.top + 0.15, -2),
      ]);
      b.group.add(new THREE.Mesh(new THREE.TubeGeometry(lead, 12, 0.25, 6), metal()));
      b.group.add(box(5.5, 0.18, 0.75, metal(), side * 2.8, y + side * 0.2, z));
      b.group.add(cylinder(0.8, 0.15, mat('#c2a567', 0.4, 0.6), side * 6.2, b.top, -2, 12));
    }
    b.shadows.push({ x: b.width / 2 - 10, z: 0, width: 20, depth: 3 });
  },
  hall: (b) => chipBlock(b, 'A3144', 4, 3, 0, -3, 1.5),
};
for (const kind of ['mq2', 'mq3', 'mq7', 'mq135']) sensorDetail[kind] = sensorDetail.gas;
sensorDetail.thermky013 = sensorDetail.ntc;

/** Screw terminal block, blue or green, with slotted screws on top. */
function terminal(b: Build, x: number, z: number, ways: number, color = '#3d6fc4') {
  const w = ways * 5;
  add(b, box(w, 8, 7, mat(color, 0.5), x, b.top, z), w, 7);
  for (let i = 0; i < ways; i++)
    b.group.add(
      cylinder(
        1.5,
        0.4,
        mat(palette.metal, 0.35, 0.6),
        x + (i - (ways - 1) / 2) * 5,
        b.top + 8,
        z,
        12,
      ),
    );
}
function lensLed(b: Build, color: string, x: number, z: number, index: number, size = 16) {
  lens(b, color, x, z, index, size);
}
/** Details for kit modules; each sits on the module PCB above its header row. */
/** Small sensor die in a metal-lidded or plastic package, as on GY-xxx breakout boards. */
function sensorChip(b: Build, text: string, w: number, color = '#c9ccd3', lid = true) {
  add(b, box(w, 1, w, mat(lid ? color : '#2a2d38', 0.35, lid ? 0.6 : 0), 0, b.top, -3), w, w);
  if (lid) b.group.add(cylinder(0.5, 0.05, mat('#24272f', 0.6), w / 4, b.top + 1, -3 - w / 4, 10));
  leadFrame(b.group, 0, b.top, -3, w, w, 3);
  for (const x of [-5, 5]) b.group.add(box(1.2, 0.7, 2.2, mat('#c2ab84'), x, b.top, 1));
  void text;
}
/** DIP-16 package: black body with the pin-1 notch on the left end. */
function dipChip(b: Build, text: string) {
  chipBlock(b, text, 20.3, 6.4, 0, -3, 3.2);
  const notch = cylinder(1.1, 0.12, mat('#15161b', 0.6), -9.4, b.top + 3.2, -3, 16);
  b.group.add(notch);
}
/** Addressable 5050 LED: white package lit with the colour the strip last latched. */
function pixel(b: Build, x: number, z: number, index: number, angle = 0) {
  const material = own(
    new THREE.MeshStandardMaterial({
      color: '#f6f2ea',
      roughness: 0.3,
      emissive: new THREE.Color('#000000'),
      emissiveIntensity: 1.4,
    }),
  );
  const packageBody = box(5, 1.6, 5, material, x, b.top, z);
  packageBody.rotation.y = -angle;
  add(b, packageBody, 5, 5);
  const die = box(2.6, 0.05, 2.6, mat('#d8c27a', 0.4, 0.5), x, b.top + 1.6, z);
  die.rotation.y = -angle;
  b.group.add(die);
  const halo = glow('#ffffff', 13);
  halo.position.set(x, b.top + 3, z);
  b.group.add(halo);
  b.updates.push(({ state }) => {
    const color = state?.powered ? (state.colors?.[index] ?? 0) : 0,
      r = ((color >> 16) & 255) / 255,
      g = ((color >> 8) & 255) / 255,
      bl = (color & 255) / 255;
    material.emissive.setRGB(r, g, bl);
    const sprite = halo.material as THREE.SpriteMaterial;
    sprite.color.setRGB(r || 0.01, g || 0.01, bl || 0.01);
    sprite.opacity = Math.max(r, g, bl) * 0.9;
  });
}
/** Ultrasonic transducer: aluminium can with a dark mesh face. */
function transducer(b: Build, x: number, z: number) {
  add(b, cylinder(8, 12, mat('#c9ccd3', 0.3, 0.7), x, b.top, z, 32), 16, 16);
  b.group.add(cylinder(6.6, 0.3, mat('#2a2d38', 0.85), x, b.top + 12, z, 32));
}
/**
 * HC-SR04 at work: after each trigger, arcs leave the transmitter at `origin`, reach a wall at the
 * set distance (1 cm of distance = 0.25 mm of bench, capped at 4 m) and come back.
 */
function sonar(b: Build, origin: { y: number; z: number }) {
  const waves = Array.from({ length: 3 }, () => {
    const material = own(
      new THREE.MeshBasicMaterial({
        color: '#1aa3a1',
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    const arc = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 1, 32, 1, Math.PI / 2 - 0.55, 1.1),
      material,
    );
    arc.rotation.x = -Math.PI / 2;
    flat(arc);
    b.group.add(arc);
    return { arc, material };
  });
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(34, 14, 1.2),
    own(
      new THREE.MeshBasicMaterial({
        color: '#e8392e',
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    ),
  );
  flat(wall);
  b.group.add(wall);
  let pings = -1,
    started = 0;
  b.updates.push(({ state, time, part }) => {
    const cm = Math.min(400, (part ?? b.part).value),
      reach = 4 + cm * 0.25,
      out = !state?.powered || cm > 400;
    wall.position.set(0, origin.y + 1, origin.z - 8 - reach);
    (wall.material as THREE.MeshBasicMaterial).opacity = state?.powered && !out ? 0.18 : 0;
    if (state?.transfers !== undefined && state.transfers !== pings) {
      if (pings >= 0) started = time;
      pings = state.transfers;
    }
    // One round trip takes 600 ms on screen, whatever the real echo time.
    const t = (time - started) / 600;
    const active = state?.powered === true && started > 0 && t < 1;
    waves.forEach(({ arc, material }, i) => {
      const phase = t - i * 0.12;
      if (!active || phase < 0 || phase > 1) {
        material.opacity = 0;
        return;
      }
      // Out to the wall in the first half, back to the receiver in the second.
      const r = 3 + reach * (phase < 0.5 ? phase * 2 : 2 - phase * 2);
      arc.scale.setScalar(r);
      arc.position.set(phase < 0.5 ? -13 : 13, origin.y, origin.z);
      material.opacity = 0.65 * (1 - phase);
    });
    return active;
  });
}
/** DHT housing: a vented plastic box. */
function dhtBody(b: Build, color: string, w: number, h: number, d: number) {
  add(b, box(w, h, d, mat(color, 0.6), 0, b.top, -3), w, d);
  for (let row = 0; row < 4; row++)
    for (let col = 0; col < 3; col++)
      b.group.add(
        box(
          w / 5,
          0.1,
          d / 9,
          mat('#20232c', 0.8),
          (col - 1) * (w / 3.6),
          b.top + h,
          -3 - d / 3 + row * (d / 5.2),
        ),
      );
}
/** Blue relays in a row with their channel LEDs and screw terminals, as on 2/4-channel boards. */
function relayBank(b: Build, count: number) {
  const pitch = (b.width - 8) / count;
  const leds = Array.from({ length: count }, (_, i) => {
    const x = -b.width / 2 + 4 + pitch * (i + 0.5);
    add(b, box(Math.min(15, pitch - 2), 15, 18, mat('#3d6fc4', 0.45), x, b.top, -1), 15, 18);
    terminal(b, x, -b.depth / 2 + 5, 3);
    const led = smdLed('#e84a3a', x, b.top, b.depth / 2 - 6);
    b.group.add(led.mesh);
    return led;
  });
  b.updates.push(({ state }) =>
    leds.forEach((led, i) => led.set(state?.powered && state.channels?.[i] ? 1 : 0)),
  );
}
const kitDetail: Partial<Record<string, Detail>> = {
  hc05: (b) => {
    // Radio daughterboard with its PCB antenna; the LED blinks fast while waiting for a phone.
    add(b, box(26, 2, 13, mat('#2f6fd6', 0.5), -2, b.top, -3), 26, 13);
    chipBlock(b, 'BC417', 7, 7, -5, -3, 1.2);
    b.group.add(box(6, 0.1, 10, mat('#d8c27a', 0.35, 0.6), 9, b.top + 2, -3));
    const led = smdLed('#e84a3a', -14, b.top, 6);
    b.group.add(led.mesh);
    // The paired phone lies on the table beside the module.
    const phone = new THREE.Group();
    phone.position.set(b.width / 2 + 22, 0, -2);
    phone.add(box(30, 4, 56, mat('#1b1d22', 0.35, 0.3), 0, 0, 0));
    b.group.add(phone);
    const chat = chatScreen(),
      glass = new THREE.Mesh(
        new THREE.PlaneGeometry(27, 50),
        own(
          new THREE.MeshStandardMaterial({
            map: chat.texture,
            emissiveMap: chat.texture,
            emissive: new THREE.Color('#ffffff'),
            emissiveIntensity: 0.8,
            roughness: 0.25,
          }),
        ),
      );
    glass.rotation.x = -Math.PI / 2;
    glass.position.set(0, 4.02, 0);
    phone.add(glass);
    b.updates.push(({ state, time }) => {
      chat.paint(state, []);
      const connected = state?.powered && state.active;
      led.set(
        state?.powered ? (connected ? Math.floor(time / 1000) % 2 : Math.floor(time / 125) % 2) : 0,
      );
      return state?.powered === true;
    });
  },
  rc522: (b) => {
    // Antenna coil traces around the board, the reader chip and the card or key fob over it.
    for (let i = 0; i < 3; i++) {
      const w = b.width - 10 - i * 4,
        d = b.depth - 12 - i * 4;
      for (const [x, z, sx, sz] of [
        [0, -d / 2 - 2, w, 0.6],
        [0, d / 2 - 2, w, 0.6],
        [-w / 2, -2, 0.6, d],
        [w / 2, -2, 0.6, d],
      ] as const)
        b.group.add(box(sx, 0.05, sz, mat('#d8c27a', 0.35, 0.6), x, b.top, z));
    }
    chipBlock(b, 'RC522', 5, 5, 0, 4, 1);
    const card = new THREE.Group();
    const plastic = own(new THREE.MeshStandardMaterial({ color: '#f4f1ea', roughness: 0.5 })),
      white = box(54, 0.8, 34, plastic, 0, 0, 0);
    const fob = new THREE.Group();
    fob.add(cylinder(10, 3, mat('#2f6fd6', 0.5), 0, 0, 0, 32));
    fob.add(cylinder(2, 3.2, mat('#15161b', 0.6), 7, 0, 0, 16));
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 8),
      own(
        new THREE.MeshStandardMaterial({
          map: paintMarking('RFID', 40, 8, '#2f6fd6'),
          roughness: 0.5,
        }),
      ),
    );
    label.rotation.x = -Math.PI / 2;
    label.position.set(0, 0.82, 0);
    card.add(white, label, fob);
    card.position.set(0, b.top + 14, -3);
    b.group.add(card);
    b.updates.push(({ part }) => {
      const which = (part ?? b.part).value;
      card.visible = which > 0;
      white.visible = label.visible = which === 1 || which === 3;
      fob.visible = which === 2;
      plastic.color.set(which === 3 ? '#f2c9a0' : '#f4f1ea');
    });
  },
  nrf24: (b) => {
    chipBlock(b, 'nRF24L01+', 5, 5, -6, -7, 0.9);
    const crystal = box(4, 1.4, 2, mat(palette.metal, 0.3, 0.7), -12, b.top, -7);
    b.group.add(crystal);
    // Meandering PCB antenna at the far end.
    for (let i = 0; i < 5; i++)
      b.group.add(box(0.6, 0.05, 10, mat('#d8c27a', 0.35, 0.6), 6 + i * 2.4, b.top, -2));
    for (let i = 0; i < 4; i++)
      b.group.add(
        box(3, 0.05, 0.6, mat('#d8c27a', 0.35, 0.6), 7.2 + i * 2.4, b.top, i % 2 ? 3 : -7),
      );
    // A packet in the air: a brief ring over the antenna.
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.85, 1, 32),
      own(
        new THREE.MeshBasicMaterial({
          color: '#1aa3a1',
          transparent: true,
          opacity: 0,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      ),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(10.8, b.top + 3, -2);
    flat(ring);
    b.group.add(ring);
    let packets = -1,
      since = 0;
    b.updates.push(({ state, time }) => {
      if (state?.transfers !== undefined && state.transfers !== packets) {
        if (packets >= 0) since = time;
        packets = state.transfers;
      }
      const t = (time - since) / 400,
        active = since > 0 && t < 1;
      ring.scale.setScalar(2 + t * 14);
      (ring.material as THREE.MeshBasicMaterial).opacity = active ? 0.7 * (1 - t) : 0;
      return active;
    });
  },
  sdcard: (b) => {
    // Metal socket and the card sliding into it.
    add(b, box(16, 2, 15, mat(palette.metal, 0.3, 0.75), 0, b.top, -3), 16, 15);
    const card = box(11, 1, 15, mat('#1d2a4a', 0.5), 0, b.top + 2, -6);
    b.group.add(card);
    chipBlock(b, 'LVC125', 6, 4, 14, -8, 1.2);
    const led = smdLed('#e84a3a', 14, b.top, -2);
    b.group.add(led.mesh);
    let seen = -1,
      since = 0;
    b.updates.push(({ part, state, time }) => {
      card.visible = (part ?? b.part).value === 1;
      if (state?.transfers !== undefined && state.transfers !== seen) {
        if (seen >= 0) since = time;
        seen = state.transfers;
      }
      const busy = since > 0 && time - since < 150;
      led.set(state?.powered && busy ? 1 : 0);
      return busy;
    });
  },
  relay2: (b) => relayBank(b, 2),
  relay4: (b) => relayBank(b, 4),
  max7219seg: (b) => {
    add(b, box(64, 7, 15, mat('#1b1d22', 0.5), 0, b.top, -4), 64, 15);
    screenPlane(b, segmentScreen(b.part.color, 8, false), 62, 12.5, 0, b.top + 7.02, -4);
  },
  ds1302: (b) => {
    chipBlock(b, 'DS1302', 9.4, 6.4, -8, -2, 3.2);
    // 32.768 kHz crystal and the CR2032 holder.
    const crystal = cylinder(1.2, 6, mat(palette.metal, 0.3, 0.7), 0, b.top + 1.2, -2, 12);
    crystal.rotation.z = Math.PI / 2;
    b.group.add(crystal);
    add(b, cylinder(10, 3.2, mat('#c9ccd3', 0.3, 0.7), 12, b.top, -2, 32), 20, 20);
  },
  pca9685: (b) => {
    chipBlock(b, 'PCA9685', 7.8, 6.4, -b.width / 2 + 10, -2, 1.2);
    // Sixteen servo headers (GND, V+, PWM) in groups of four; a lamp beside each shows its duty.
    const lamps = Array.from({ length: 16 }, (_, i) => {
      const x = b.width / 2 - 47 + i * 2.54 + Math.floor(i / 4) * 1.5;
      ['#20232c', '#c0392b', '#e5c23a'].forEach((color, row) =>
        b.group.add(box(2.3, 6, 2.3, mat(color, 0.5), x, b.top, -7 + row * 2.54)),
      );
      const lamp = smdLed('#ffb347', x, b.top, 2.5);
      b.group.add(lamp.mesh);
      return lamp;
    });
    b.updates.push(({ state }) =>
      lamps.forEach((lamp, i) =>
        lamp.set(state?.powered && state.displayOn ? (state.channels?.[i] ?? 0) : 0),
      ),
    );
  },
  flowmeter: (b) => {
    // Black body with a threaded pipe through it and the sensor wires on top.
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 46, 24), mat('#24272f', 0.5));
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set(0, b.top + 7, -4);
    pipe.castShadow = true;
    add(b, pipe, 46, 12);
    for (const x of [-20, -17, 17, 20])
      b.group.add(cylinder(6.6, 1, mat('#1d1f27', 0.6), x, b.top + 7, -4).rotateZ(Math.PI / 2));
    add(b, cylinder(9, 12, mat('#2c2f3a', 0.5), 0, b.top, -4, 28), 18, 18);
    b.group.add(cylinder(7, 0.4, mat('#7cc4ff', 0.2), 0, b.top + 12, -4, 28));
  },
  speedsensor: (b) => {
    for (const z of [-9, 1]) add(b, box(6, 11, 4, mat('#1d1f27', 0.5), 4, b.top, z), 6, 4);
    // The rim passes between the emitter and receiver. Its optical windows go all the way through.
    const disk = new THREE.Group();
    disk.position.set(-4, b.top + 12, -4);
    disk.add(new THREE.Mesh(slottedDiskGeometry(), mat('#2c3041', 0.5)));
    const axle = cylinder(1.2, 4, metal(), 0, 0, 0);
    axle.rotation.x = Math.PI / 2;
    axle.position.set(0, 0, 2);
    disk.add(axle);
    b.group.add(disk);
    let last = 0;
    b.updates.push(({ part, time, state }) => {
      const rpm = state?.powered ? (part ?? b.part).value : 0,
        dt = Math.min(0.1, last ? (time - last) / 1000 : 0);
      last = time;
      // Shown at a tenth of the real speed so the slots stay visible.
      disk.rotation.z += ((rpm / 60) * Math.PI * 2 * dt) / 10;
      return rpm > 0;
    });
  },
  max6675: (b) => {
    chipBlock(b, 'MAX6675', 5, 4, -4, -3, 1.4);
    terminal(b, 8, -3, 2);
    // Thermocouple probe leaving the screw terminal.
    const probe = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.2, 40, 12),
      mat('#c9ccd3', 0.3, 0.75),
    );
    probe.rotation.z = Math.PI / 2;
    probe.position.set(32, b.top + 4, -3);
    probe.castShadow = true;
    b.group.add(probe);
  },
  tcs34725: (b) => {
    sensorChip(b, 'TCS34725', 2.5, '#2a2d38', false);
    const led = smdLed('#fff6e0', 0, b.top, -8);
    b.group.add(led.mesh);
    b.updates.push(({ state }) => void led.set(state?.active ? 1 : 0.2));
  },
  mpr121: (b) => {
    chipBlock(b, 'MPR121', 3, 3, -12, -4, 1);
    // Twelve electrode pads; touched ones turn teal.
    const pads = Array.from({ length: 12 }, (_, i) => {
      const material = own(
        new THREE.MeshStandardMaterial({ color: '#d8c27a', roughness: 0.35, metalness: 0.6 }),
      );
      b.group.add(box(3, 0.1, 3, material, -6 + (i % 6) * 4.5, b.top, -9 + Math.floor(i / 6) * 5));
      const number = new THREE.Mesh(
        new THREE.PlaneGeometry(2.8, 1.2),
        own(
          new THREE.MeshStandardMaterial({
            map: paintSilkscreen(2.8, 1.2, [{ text: String(i), x: 1.4, z: 0.6, size: 0.9 }]),
            transparent: true,
          }),
        ),
      );
      number.rotation.x = -Math.PI / 2;
      number.position.set(-6 + (i % 6) * 4.5, b.top + 0.02, -6.8 + Math.floor(i / 6) * 5);
      b.group.add(number);
      return material;
    });
    b.updates.push(({ state, part }) => {
      pads.forEach((material, i) =>
        material.color.set(
          state?.powered && ((part ?? b.part).value >> i) & 1 ? '#1aa3a1' : '#d8c27a',
        ),
      );
    });
  },
  nunchuk: (b) => {
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(8, 18, 8, 20), mat('#f6f2ea', 0.45));
    body.rotation.x = Math.PI / 2;
    body.position.set(0, b.top + 8, -6);
    body.castShadow = true;
    add(b, body, 16, 34);
    const stick = new THREE.Group();
    stick.position.set(0, b.top + 16, -14);
    stick.add(cylinder(2.6, 3, mat('#9aa0ad', 0.5), 0, 0, 0, 16));
    b.group.add(stick);
    b.group.add(box(4, 2, 3, mat('#e8e2d6', 0.5), 0, b.top + 13, 4));
    b.updates.push(({ part }) => {
      const [x = 128, y = 128] = (part ?? b.part).values ?? [];
      stick.rotation.set(((y - 128) / 128) * 0.4, 0, -((x - 128) / 128) * 0.4);
    });
  },
  lanalyzer: (b) => {
    // A small instrument: a dark case with the traces on its face and a row of probe sockets.
    add(b, box(60, 7, 25, mat('#20272a', 0.5), 0, b.top, -4), 60, 25);
    const inputs = partPinNames(b.part).filter((name) => name !== 'VCC' && name !== 'GND').length;
    screenPlane(b, waveScreen(Math.min(8, Math.max(2, inputs))), 54, 20.5, 0, b.top + 7.02, -4);
    const lamp = smdLed('#3fd0c4', 25, b.top + 7, -15.5);
    b.group.add(lamp.mesh);
    b.updates.push(({ state }) => void lamp.set(state?.powered ? 1 : 0));
  },
  tm1638: (b) => {
    add(b, box(58, 6, 13, mat('#1b1d22', 0.5), 0, b.top, -11), 58, 13);
    screenPlane(b, segmentScreen('#ff4b3e', 8, false), 56, 11.5, 0, b.top + 6.02, -11);
    const lights = Array.from({ length: 8 }, (_, i) => {
      const led = smdLed('#ff4b3e', -24.5 + i * 7, b.top, -20.5);
      b.group.add(led.mesh);
      return led;
    });
    const keys = Array.from({ length: 8 }, (_, i) => {
      add(b, box(5, 2.5, 5, mat('#2c2f3a', 0.5), -24.5 + i * 7, b.top, 1), 5, 5);
      const cap = cylinder(1.6, 1.2, mat('#1d1f27', 0.5), -24.5 + i * 7, b.top + 2.5, 1, 12);
      b.group.add(cap);
      return cap;
    });
    b.updates.push(({ state, part }) => {
      lights.forEach((led, i) => led.set(state?.powered && state.lights?.[i] ? 1 : 0));
      keys.forEach(
        (cap, i) => (cap.position.y = b.top + 2.5 + (((part ?? b.part).value >> i) & 1 ? -0.8 : 0)),
      );
    });
  },
  encoder: (b) => {
    add(b, box(12, 6, 12, mat(palette.metal, 0.4, 0.5), 0, b.top, -3), 12, 12);
    const knob = new THREE.Group();
    knob.position.set(0, b.top + 6, -3);
    knob.add(cylinder(4, 9, mat('#2c2f3a', 0.5), 0, 0, 0, 20));
    knob.add(box(1, 0.3, 3, mat('#f6f2ea', 0.5), 0, 9, -2));
    b.group.add(knob);
    setPick(knob, { type: 'control', id: b.part.id });
    b.control = knob;
    // 20 detents per turn.
    b.updates.push(({ part }) => {
      knob.rotation.y = -((part ?? b.part).value * 18 * Math.PI) / 180;
    });
  },
  irremote: (b) => {
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(3, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      mat('#1d1f27', 0.25),
    );
    dome.position.set(-5, b.top + 3, -4);
    dome.castShadow = true;
    add(b, box(6, 3, 5, mat('#1d1f27', 0.4), -5, b.top, -4), 6, 5);
    b.group.add(dome);
    // The kit remote lies next to the receiver; its IR LED blinks while a frame is sent.
    add(b, box(12, 2, 22, mat('#20232c', 0.5), 9, b.top, -6), 12, 22);
    for (let row = 0; row < 7; row++)
      for (let col = 0; col < 3; col++)
        b.group.add(
          box(
            2.4,
            0.5,
            1.6,
            mat(row < 2 ? '#e8392e' : '#f2efe6', 0.5),
            6 + col * 3,
            b.top + 2,
            -15 + row * 2.8,
          ),
        );
    const led = smdLed('#b04ad8', 9, b.top + 2, 5);
    b.group.add(led.mesh);
    b.updates.push(({ state }) => void led.set(state?.active ? 1 : 0));
  },
  stepper: (b) => {
    chipBlock(b, 'ULN2003', 20, 6.4, -2, -14, 3.2);
    const leds = [0, 1, 2, 3].map((i) => {
      const led = smdLed('#e84a3a', 12, b.top, -18 + i * 3);
      b.group.add(led.mesh);
      return led;
    });
    // Motor beside the driver board, shaft up.
    add(b, cylinder(14, 19, mat('#c9ccd3', 0.35, 0.65), 0, b.top, 6, 40), 28, 28);
    b.group.add(cylinder(4.5, 1.5, mat('#3d6fc4', 0.5), 0, b.top + 19, 2, 24));
    const shaft = new THREE.Group();
    shaft.position.set(0, b.top + 20.5, 2);
    shaft.add(cylinder(2.5, 5, mat('#c9a03a', 0.35, 0.6), 0, 0, 0, 16));
    shaft.add(box(1.6, 5.5, 5, mat('#c9a03a', 0.35, 0.6), 0, 0, 0));
    shaft.add(box(8, 1.2, 1.4, mat('#f6f2ea', 0.5), 3, 5, 0));
    b.group.add(shaft);
    b.updates.push(({ state }) => {
      shaft.rotation.y = -((state?.angle ?? 0) * Math.PI) / 180;
      leds.forEach((led, i) =>
        led.set(state?.powered && ((state.matrix?.[0] ?? 0) >> i) & 1 ? 1 : 0),
      );
    });
  },
  l298n: (b) => {
    // Heat sink with fins over the L298 chip.
    add(b, box(22, 3, 16, mat('#1d1f27', 0.45, 0.4), -6, b.top, -8), 22, 16);
    for (let i = 0; i < 7; i++)
      b.group.add(box(1, 12, 16, mat('#1d1f27', 0.45, 0.4), -15 + i * 3, b.top + 3, -8));
    terminal(b, 14, -14, 2);
    terminal(b, 14, 0, 2);
    // A yellow TT gear motor with a wheel on each output.
    const wheels = [-1, 1].map((side) => {
      add(b, box(12, 11, 18, mat('#f0c33a', 0.5), side * 24, b.top, 6), 12, 18, false);
      const wheel = new THREE.Group();
      wheel.position.set(side * 32.5, b.top + 6, 6);
      const tyre = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 5, 32), mat('#24272f', 0.8));
      tyre.rotation.z = Math.PI / 2;
      tyre.castShadow = true;
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 5.5, 5.4, 6), mat('#f0c33a', 0.5));
      hub.rotation.z = Math.PI / 2;
      wheel.add(tyre, hub);
      b.group.add(wheel);
      return wheel;
    });
    let last = 0;
    b.updates.push(({ state, time }) => {
      const dt = Math.min(0.1, last ? (time - last) / 1000 : 0);
      last = time;
      let moving = false;
      wheels.forEach((wheel, i) => {
        const speed = state?.motors?.[i] ?? 0;
        // About two turns a second at full speed.
        wheel.rotation.x += speed * Math.PI * 4 * dt;
        if (speed) moving = true;
      });
      return moving;
    });
  },
  chip595: (b) => dipChip(b, '74HC595'),
  chip165: (b) => dipChip(b, '74HC165'),
  st7735: (b) => {
    add(b, box(30, 1.6, 37, mat('#15161b', 0.4), 0, b.top, -3), 30, 37);
    screenPlane(b, tftScreen(), 27, 33.75, 0, b.top + 1.62, -3);
  },
  ili9341: (b) => {
    add(b, box(44, 2.2, 58, mat('#15161b', 0.4), 0, b.top, -3), 44, 58);
    screenPlane(b, tftScreen(240, 320), 40, 53.3, 0, b.top + 2.22, -3);
  },
  oledspi: (b) => {
    add(b, box(27, 1.6, 15, mat('#121419', 0.25), 0, b.top, -6), 27, 15);
    screenPlane(b, oledScreen(), 23, 11.5, 0, b.top + 1.62, -6);
  },
  pcd8544: (b) => {
    add(b, box(38, 2.4, 25, mat('#c9ccd3', 0.3, 0.7), 0, b.top, -3), 38, 25);
    screenPlane(b, nokiaScreen(), 34, 19.4, 0, b.top + 2.42, -3);
  },
  gps: (b) => {
    // Ceramic patch antenna sitting on top of the receiver board.
    add(b, box(24, 4, 24, mat('#d9c49a', 0.6), 0, b.top, -2), 24, 24);
    b.group.add(box(16, 0.2, 16, mat('#c9ccd3', 0.3, 0.7), 0, b.top + 4, -2));
    b.group.add(cylinder(1.2, 0.5, mat('#c9a03a', 0.35, 0.6), 2, b.top + 4.2, 0, 12));
  },
  dfplayer: (b) => {
    add(b, box(14, 2, 15, mat('#c9ccd3', 0.3, 0.7), 0, b.top, -3), 14, 15);
    b.group.add(box(11, 0.4, 3, mat('#24272f', 0.5), 0, b.top + 2, 3.5));
    // The status LED lights while a track plays (BUSY low).
    const busy = smdLed('#4fb3ff', 5, b.top, -9);
    b.group.add(busy.mesh);
    b.updates.push(({ state }) => void busy.set(state?.active ? 1 : 0));
  },
  mhz19: (b) => {
    add(b, box(30, 9, 18, mat('#c9a03a', 0.3, 0.75), 0, b.top, -3), 30, 18);
    for (let i = 0; i < 6; i++)
      b.group.add(cylinder(0.7, 0.1, mat('#3a2f12', 0.8), -10 + i * 4, b.top + 9, -3, 10));
  },
  tm1637: (b) => {
    add(b, box(31, 6, 14, mat('#1b1d22', 0.5), 0, b.top, -3), 31, 14);
    screenPlane(b, tm1637Screen(b.part.color), 30, 12, 0, b.top + 6.02, -3);
  },
  hx711: (b) => {
    chipBlock(b, 'HX711', 10, 6, -3, -2, 1.5);
    for (let i = 0; i < 4; i++)
      b.group.add(box(2, 0.1, 2, mat('#d8c27a', 0.35, 0.6), -9 + i * 6, b.top, -8));
  },
  shift165: (b) => chipBlock(b, '74HC165', 20, 7.6, 0, -3, 3.2),
  hcsr04: (b) => {
    transducer(b, -13, -2);
    transducer(b, 13, -2);
    add(b, box(9, 3.5, 3.5, mat(palette.metal, 0.35, 0.6), 0, b.top, -6), 9, 3.5);
  },
  dht11: (b) => dhtBody(b, '#3d8fd6', 12, 5.5, 15.5),
  dht22: (b) => dhtBody(b, '#f2efe6', 15, 7.5, 18),
  ds18b20: (b) => toNinetyTwo(b, 'DS18B20'),
  ws2812stick: (b) => {
    for (let i = 0; i < 8; i++) pixel(b, -22 + i * 6.3, -2, i);
  },
  ws2812ring: (b) => {
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      pixel(b, Math.cos(angle) * 15.75, -4 + Math.sin(angle) * 15.75, i, angle);
    }
  },
  bmp280: (b) => lgaLid(b, 5, 4),
  bme280: (b) => lgaLid(b, 5, 4),
  bmp180: (b) => lgaLid(b, 6.5, 6.5),
  aht20: (b) => {
    add(b, box(5.5, 1.3, 5.5, mat('#f2efe6', 0.5), 0, b.top, -3), 5.5, 5.5);
    for (const x of [-1.4, 0, 1.4])
      for (const z of [-1.4, 0, 1.4])
        b.group.add(cylinder(0.32, 0.06, mat('#3a3d47', 0.6), x, b.top + 1.32, -3 + z, 10));
    breakoutParts(b);
  },
  sht31: (b) => {
    add(b, box(5, 1.2, 5, mat('#2a2d38', 0.45), 0, b.top, -3), 5, 5);
    b.group.add(cylinder(1.3, 0.1, mat('#9aa0ad', 0.7), 0, b.top + 1.22, -3, 20));
    breakoutParts(b);
  },
  adxl345: (b) => {
    chipBlock(b, 'ADXL345', 6.5, 5, 0, -3, 1.2);
    breakoutParts(b);
  },
  hmc5883l: (b) => {
    chipBlock(b, 'L883', 5, 5, 0, -3, 1);
    breakoutParts(b);
  },
  qmc5883l: (b) => {
    chipBlock(b, '5883', 5, 5, 0, -3, 1);
    breakoutParts(b);
  },
  ina219: (b) => {
    add(b, box(6, 0.8, 3, mat('#24272f', 0.5), -7, b.top, -4), 6, 3);
    b.group.add(box(1.2, 0.85, 3, mat(palette.metal, 0.35, 0.6), -9.4, b.top, -4));
    b.group.add(box(1.2, 0.85, 3, mat(palette.metal, 0.35, 0.6), -4.6, b.top, -4));
    chipBlock(b, 'INA219', 3, 3, 3, -4, 1);
    terminal(b, 0, -10, 2);
  },
  mlx90614: (b) => {
    add(b, cylinder(4.6, 4.4, mat('#c9ccd3', 0.3, 0.75), 0, b.top, -4, 32), 9.2, 9.2);
    b.group.add(cylinder(1.6, 0.2, mat('#1d2230', 0.3), 0, b.top + 4.4, -4, 20));
  },
  pcf8591: (b) => chipBlock(b, 'PCF8591', 20, 6.4, 0, -4, 3.2),
  ads1115: (b) => chipBlock(b, 'ADS1115', 3, 3, 0, -4, 1),
  mcp4725: (b) => chipBlock(b, '4725', 3, 3, 0, -4, 1),
  mcp23017: (b) => chipBlock(b, 'MCP23017', 35, 7.6, 0, -6, 3.2),
  bicolor: (b) => {
    const { mesh, material } = ledDome('#f2efe6', true);
    mesh.position.set(0, b.top, -3);
    add(b, mesh, 6, 6);
    const halo = glow('#ffffff', 18);
    halo.position.set(0, b.top + 6, -3);
    b.group.add(halo);
    b.updates.push(({ leds }) => {
      const [r = 0, g = 0] = leds.map((v) => Math.min(1, Math.max(0, v)));
      material.emissive.setRGB(r, g * 0.85, 0);
      material.emissiveIntensity = 0.05 + Math.max(r, g) * 1.4;
      (halo.material as THREE.SpriteMaterial).color.setRGB(r || 0.01, g || 0.01, 0.01);
      (halo.material as THREE.SpriteMaterial).opacity = Math.max(r, g) * 0.85;
    });
  },
  ledmod: (b) => lensLed(b, b.part.color, 0, -4, 0),
  led3w: (b) => {
    add(b, cylinder(9, 1.6, mat('#c9ccd3', 0.3, 0.7), 0, b.top, -4, 6), 18, 18);
    lensLed(b, '#fff3c4', 0, -4, 0, 30);
  },
  smdrgb: (b) => {
    const material = own(
      new THREE.MeshStandardMaterial({
        color: '#f6f2ea',
        roughness: 0.3,
        emissive: new THREE.Color('#000000'),
      }),
    );
    add(b, box(5, 1.6, 5, material, 0, b.top, -3), 5, 5);
    const halo = glow('#ffffff', 16);
    halo.position.set(0, b.top + 3, -3);
    b.group.add(halo);
    b.updates.push(({ leds }) => {
      const [r = 0, g = 0, bl = 0] = leds.map((v) => Math.min(1, Math.max(0, v)));
      material.emissive.setRGB(r, g, bl);
      material.emissiveIntensity = 1.4;
      (halo.material as THREE.SpriteMaterial).color.setRGB(r || 0.01, g || 0.01, bl || 0.01);
      (halo.material as THREE.SpriteMaterial).opacity = Math.max(r, g, bl) * 0.85;
    });
  },
  collision: (b) => {
    add(b, box(13, 6, 6.5, mat('#2c2f3a', 0.5), 0, b.top, -4), 13, 6.5);
    const lever = box(18, 0.4, 4, mat(palette.metal, 0.35, 0.6), 2, b.top + 6.6, -4);
    lever.rotation.z = 0.12;
    b.group.add(lever);
    b.updates.push(() => void (lever.rotation.z = b.part.value ? 0 : 0.12));
  },
  knock: (b) => {
    const z = -b.depth / 2 + 0.5,
      y = b.top + 2.4;
    const shell = box(
      18,
      4.8,
      5,
      own(
        new THREE.MeshStandardMaterial({
          color: '#d8ded8',
          transparent: true,
          opacity: 0.22,
          roughness: 0.2,
          depthWrite: false,
        }),
      ),
      0,
      b.top,
      z,
    );
    add(b, shell, 18, 5);
    const points = Array.from({ length: 145 }, (_, i) => {
      const t = i / 144;
      return new THREE.Vector3(
        -7 + t * 14,
        y + Math.sin(t * Math.PI * 24) * 0.8,
        z + Math.cos(t * Math.PI * 24) * 0.8,
      );
    });
    b.group.add(
      new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 144, 0.14, 5),
        metal(),
      ),
    );
    b.group.add(box(15, 0.3, 0.3, metal(), 0, y - 0.15, z));
    for (const x of [-8, 8]) b.group.add(box(1, 4.8, 5, mat('#d3dfd5', 0.35), x, b.top, z));
    for (const x of [-5.5, 5.5]) {
      const lead = new THREE.CatmullRomCurve3([
        new THREE.Vector3(x, y, z),
        new THREE.Vector3(x, y, z + 3),
        new THREE.Vector3(x, b.top, -2),
      ]);
      b.group.add(new THREE.Mesh(new THREE.TubeGeometry(lead, 12, 0.22, 6), metal()));
    }
  },
  shock: (b) => {
    add(b, cylinder(2.2, 10, mat('#242b2e', 0.35), 0, b.top, -2), 4.4, 4.4);
    b.group.add(cylinder(1.8, 0.15, mat('#131d25', 0.3), 0, b.top + 10, -2));
    for (const x of [-1.5, 1.5]) b.group.add(box(0.5, 1.4, 0.5, metal(), x, b.top, -2));
  },
  doorsensor: (b) => {
    add(b, box(14, 7, 8, mat('#f2efe6', 0.6), -5, b.top, -4), 14, 8);
    const magnet = box(14, 7, 8, mat('#f2efe6', 0.6), 11, b.top, -4);
    b.group.add(magnet);
    b.updates.push(() => void (magnet.position.x = b.part.value ? 22 : 11));
  },
  trimpot: (b) => {
    add(b, box(9.5, 4.8, 9.5, mat('#3d6fc4', 0.5), 0, b.top, -3), 9.5, 9.5);
    b.group.add(cylinder(1.4, 1.2, mat('#d4b46a', 0.35, 0.65), 3, b.top + 4.8, -6));
  },
  ttp224: (b) => {
    for (let i = 0; i < 4; i++) {
      const pad = own(
        new THREE.MeshStandardMaterial({
          color: '#f2efe6',
          roughness: 0.5,
          emissive: new THREE.Color('#1aa3a1'),
        }),
      );
      const step = Math.min(11, (b.width - 4) / 4);
      add(
        b,
        cylinder(step * 0.4, 0.4, pad, (i - 1.5) * step, b.top, -5, 24),
        step * 0.8,
        step * 0.8,
      );
      b.updates.push(() => void (pad.emissiveIntensity = (b.part.value >> i) & 1 ? 0.8 : 0));
    }
  },
  rcwl0516: (b) => {
    for (let i = 0; i < 5; i++)
      b.group.add(box(1, 0.1, 10, mat('#cdb07a', 0.35, 0.6), -8 + i * 4, b.top, -4));
    chipBlock(b, 'RCWL-9196', 5, 4, 8, 2, 1);
  },
  linetrack: (b) => tcrt(b, 0),
  linetrack3: (b) => [-12, 0, 12].forEach((x) => tcrt(b, x)),
  photogate: (b) => {
    const black = mat('#24272f', 0.45);
    add(b, box(12, 3, 6, black, 0, b.top, -3), 12, 6);
    add(b, box(3.5, 8, 6, black, -4.25, b.top + 3, -3), 3.5, 6, false);
    add(b, box(3.5, 8, 6, black, 4.25, b.top + 3, -3), 3.5, 6, false);
  },
  vibrsensor: (b) => {
    const can = cylinder(2.4, 10, mat('#c9ccd3', 0.3, 0.7), 0, 0, 0);
    can.rotation.z = Math.PI / 2;
    can.position.set(-4, b.top + 2.4, -4);
    add(b, can, 10, 4.8);
    trimmer(b, 8, -3);
  },
  mercury: (b) => {
    const capsule = cylinder(
      3,
      12,
      own(
        new THREE.MeshStandardMaterial({
          color: '#cfe6e2',
          roughness: 0.1,
          transparent: true,
          opacity: 0.22,
          depthWrite: false,
        }),
      ),
      0,
      b.top,
      -3,
    );
    add(b, capsule, 6, 6);
    const drop = new THREE.Mesh(new THREE.SphereGeometry(1.6, 16, 12), mat('#c9ccd3', 0.15, 0.9));
    drop.position.set(0, b.top + 1.8, -3);
    b.group.add(drop);
  },
  metaltouch: (b) => {
    const wire = cylinder(0.5, 12, mat(palette.metal, 0.35, 0.6), 0, 0, 0);
    wire.rotation.z = 0.5;
    wire.position.set(-6, b.top + 6, -4);
    b.group.add(wire);
    trimmer(b, 8, -3);
  },
  rain: (b) => {
    add(
      b,
      box(b.width - 6, 0.6, b.depth - 8, mat('#2c2f3a', 0.6), 0, b.top, -2),
      b.width - 6,
      b.depth - 8,
    );
    for (let i = 0; i < 6; i++)
      b.group.add(
        box(
          b.width - 10,
          0.1,
          0.8,
          mat('#cdb07a', 0.35, 0.6),
          0,
          b.top + 0.6,
          -2 - b.depth / 2 + 7 + i * 3,
        ),
      );
  },
  steam: (b) => {
    for (let i = 0; i < 5; i++)
      b.group.add(box(14, 0.1, 0.8, mat('#cdb07a', 0.35, 0.6), 0, b.top, -8 + i * 2.5));
  },
  soilcap: (b) => {
    const probe = box(10, 1.6, 40, mat('#1d2230', 0.6), 0, b.top, -24);
    add(b, probe, 10, 40, false);
    b.group.add(box(10, 0.1, 0.8, mat('#f2efe6', 0.6), 0, b.top + 1.6, -18));
    chipBlock(b, '555', 5, 4, 0, -2, 1.2);
  },
  uvsensor: (b) => add(b, box(3.6, 1.4, 3.6, mat('#f6f2ea', 0.4), 0, b.top, -3), 3.6, 3.6),
  hall49e: (b) => {
    chipBlock(b, '49E', 4, 3, -4, -3, 1.5);
    trimmer(b, 8, -3);
  },
  digtemp: (b) => {
    const bead = new THREE.Mesh(new THREE.SphereGeometry(2.6, 20, 14), mat('#2f3547', 0.3));
    bead.scale.y = 1.25;
    bead.position.set(-5, b.top + 5, -4);
    add(b, bead, 5.2, 5.2);
    for (const x of [-6, -4]) b.group.add(box(0.5, 3.2, 0.5, metal(), x, b.top, -4));
    trimmer(b, 8, -3);
  },
  voltagesens: (b) => terminal(b, 0, -4, 2, '#3fae6a'),
  acs712: (b) => {
    terminal(b, -6, -3, 2);
    chipBlock(b, 'ACS712', 5, 4, 8, -2, 1.5);
  },
  sharpir: (b) => {
    add(b, box(29, 13, 13, mat('#24272f', 0.45), 0, b.top, -4), 29, 13);
    for (const x of [-6, 6]) b.group.add(box(6, 0.2, 6, mat('#5a2430', 0.2), x, b.top + 13, -4));
    add(b, box(44, 1.6, 8, mat('#24272f', 0.45), 0, b.top, -4), 44, 8, false);
  },
  speaker: (b) => {
    // Round 8 ohm driver: stamped steel basket, rubber surround, paper cone with a dust cap.
    add(b, cylinder(16, 3, mat('#24272f', 0.45, 0.3), 0, b.top, -6, 40), 32, 32);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(14.2, 1.1, 8, 48), mat('#15161b', 0.7));
    rim.rotation.x = Math.PI / 2;
    rim.position.set(0, b.top + 3.2, -6);
    b.group.add(rim);
    const profile = [new THREE.Vector2(3.4, -3.4), new THREE.Vector2(3.4, -2.6)];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      profile.push(new THREE.Vector2(3.4 + 9.4 * t, -2.6 + 2.6 * t * t));
    }
    const cone = new THREE.Group();
    cone.position.set(0, b.top + 3.4, -6);
    const shell = new THREE.Mesh(
      new THREE.LatheGeometry(profile, 40),
      own(
        new THREE.MeshStandardMaterial({
          color: '#2f323d',
          roughness: 0.85,
          side: THREE.DoubleSide,
        }),
      ),
    );
    shell.castShadow = true;
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(3.4, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      mat('#1b1d24', 0.5),
    );
    cap.position.y = -2.6;
    cone.add(shell, cap);
    b.group.add(cone);
    for (const z of [-13.5, -9.5]) b.group.add(box(2.6, 0.5, 2.6, metal(), 17.5, b.top + 1.2, z));
    soundRings(b, 0, b.top + 5, -6, 20, cone);
  },
  piezo: (b) => {
    add(b, cylinder(13.5, 0.4, mat('#d4b46a', 0.35, 0.65), 0, b.top, -6, 40), 27, 27);
    const disc = cylinder(9.5, 0.3, mat('#f2efe6', 0.6), 0, b.top + 0.4, -6, 40);
    b.group.add(disc);
    soundRings(b, 0, b.top + 1.5, -6, 17, disc);
  },
  ssr: (b) => {
    add(b, box(14, 18, 5, mat('#24272f', 0.45), -4, b.top, -4), 14, 5);
    terminal(b, 10, -3, 2);
    const led = smdLed('#e84a3a', -4, b.top + 18, -1.4);
    b.group.add(led.mesh);
    b.updates.push(({ state }) => void led.set(state?.active && state.powered ? 1 : 0));
  },
  mosfet: (b) => {
    add(b, box(10, 15, 4.5, mat('#24272f', 0.45), -6, b.top, -4), 10, 4.5);
    b.group.add(box(10, 6, 1.3, mat('#c9ccd3', 0.35, 0.6), -6, b.top + 15, -5.6));
    terminal(b, 8, -3, 2);
    const led = smdLed('#e84a3a', 3, b.top, 2);
    b.group.add(led.mesh);
    b.updates.push(({ state }) => void led.set(state?.powered ? (state.active ?? 0) : 0));
  },
  magnet: (b) => {
    add(b, cylinder(10, 14, mat('#c9ccd3', 0.3, 0.7), 0, b.top, -6, 32), 20, 20);
    const core = cylinder(4, 0.4, mat('#8b8f94', 0.4, 0.7), 0, b.top + 14, -6, 24);
    b.group.add(core);
    // A pulling magnet shows its field as a halo around the pole.
    const halo = glow('#5aa2ff', 34);
    halo.position.set(0, b.top + 15, -6);
    b.group.add(halo);
    b.updates.push(({ state }) => {
      const on = state?.powered ? (state.active ?? 0) : 0;
      (halo.material as THREE.SpriteMaterial).opacity = 0.8 * on;
      return on > 0;
    });
  },
  levelshift: (b) => {
    for (const x of [-6, -2, 2, 6]) chipBlock(b, '', 2.8, 2.6, x, -3, 1);
  },
};
/** Expanding rings above a sounding part, with the diaphragm trembling at the same rate. */
function soundRings(
  b: Build,
  x: number,
  y: number,
  z: number,
  radius: number,
  diaphragm: THREE.Object3D,
) {
  const rings = Array.from({ length: 3 }, () => {
    const material = own(
      new THREE.MeshBasicMaterial({
        color: '#1aa3a1',
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.93, 1, 40), material);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, y, z);
    flat(ring);
    b.group.add(ring);
    return { ring, material };
  });
  const rest = diaphragm.position.y;
  b.updates.push(({ state, time }) => {
    const on = Boolean(state?.powered !== false && (state?.frequencyHz || state?.active));
    diaphragm.position.y = rest + (on ? 0.35 * Math.sin(time / 9) : 0);
    rings.forEach(({ ring, material }, i) => {
      const phase = on ? (time / 700 + i / rings.length) % 1 : 0;
      ring.scale.setScalar(radius * (0.55 + phase * 0.9));
      ring.position.y = y + phase * 5;
      material.opacity = on ? 0.7 * (1 - phase) : 0;
    });
    return on;
  });
}
function tcrt(b: Build, x: number) {
  add(b, box(10, 5, 6, mat('#24272f', 0.45), x, b.top, -5), 10, 6);
  b.group.add(cylinder(1.6, 0.4, mat('#3d6fc4', 0.3), x - 2.2, b.top + 5, -5, 16));
  b.group.add(cylinder(1.6, 0.4, mat('#1d1f27', 0.3), x + 2.2, b.top + 5, -5, 16));
}

/** Surface-mount resistor or capacitor on a breakout board, long side along x. */
function smd(b: Build, x: number, z: number, length = 2, color = '#3b3d3b') {
  b.group.add(flat(box(length, 0.7, 1.2, mat(color, 0.5), x, b.top, z)));
  for (const side of [-1, 1])
    b.group.add(
      flat(
        box(0.45, 0.76, 1.25, mat('#d2b372', 0.3, 0.65), x + side * (length / 2 - 0.22), b.top, z),
      ),
    );
}
/** The 3.3 V regulator every cheap breakout carries: a small SOT-23 with three legs. */
function sot23(b: Build, x: number, z: number) {
  b.group.add(box(2.9, 1.1, 1.7, mat(palette.chip, 0.45), x, b.top + 0.2, z));
  for (const dx of [-0.95, 0.95])
    b.group.add(flat(box(0.5, 0.3, 0.8, metal(), x + dx, b.top, z + 1.2)));
  b.group.add(flat(box(0.5, 0.3, 0.8, metal(), x, b.top, z - 1.2)));
}
/** Regulator, pull-ups and decoupling capacitors that surround the chip of an I2C breakout. */
function breakoutParts(b: Build, chipX = 0, chipZ = -3) {
  sot23(b, chipX - 7.5, chipZ - 1);
  smd(b, chipX - 7.5, chipZ + 2.2, 1.8, '#a99470');
  smd(b, chipX + 7, chipZ - 2.5, 1.8, '#3b3d3b');
  smd(b, chipX + 7, chipZ, 1.8, '#3b3d3b');
  smd(b, chipX + 4.6, chipZ + 3.2, 1.6, '#a99470');
  b.group.add(flat(box(1.5, 0.5, 1.5, mat('#4cc36f', 0.3), chipX + 3.2, b.top, chipZ - 5.2)));
}
/** Metal-lid LGA sensor (BMP/BME): a black base, a shiny lid and the pressure vent. */
function lgaLid(b: Build, w: number, d: number, x = 0, z = -3) {
  add(b, box(w, 1.1, d, mat('#2a2d38', 0.45), x, b.top, z), w, d);
  b.group.add(box(w - 0.6, 0.35, d - 0.6, mat('#c9ccd3', 0.25, 0.8), x, b.top + 1.1, z));
  b.group.add(cylinder(0.45, 0.06, mat('#15161b', 0.6), x + w / 4, b.top + 1.47, z, 14));
  breakoutParts(b, x, z);
}
/** Plastic TO-92 sensor body, enlarged a little so its flat face and marking can be read. */
function toNinetyTwo(b: Build, text: string) {
  const profile = new THREE.Shape();
  const k = 1.5;
  profile.moveTo(-2.4 * k, 0);
  profile.lineTo(2.4 * k, 0);
  profile.absarc(0, 0, 2.4 * k, 0, Math.PI, false);
  profile.closePath();
  const geometry = new THREE.ExtrudeGeometry(profile, {
    depth: 4.8 * k,
    bevelEnabled: false,
    curveSegments: 20,
  });
  geometry.rotateX(-Math.PI / 2);
  const body = new THREE.Mesh(geometry, mat('#24272f', 0.45));
  body.position.set(0, b.top + 2.6, -1.8);
  body.castShadow = true;
  add(b, body, 7.2, 5.1);
  for (const x of [-1.9, 0, 1.9]) b.group.add(box(0.5, 2.7, 0.5, metal(), x, b.top, -3));
  const print = new THREE.Mesh(
    new THREE.PlaneGeometry(5.6, 3.8),
    own(new THREE.MeshStandardMaterial({ map: paintMarking(text, 5.6, 3.8) })),
  );
  print.position.set(0, b.top + 6.2, -1.79);
  flat(print);
  b.group.add(print);
}

function partBody(build: Build, value: number) {
  const { part, top } = build;
  const kind = lookOf(part.kind);
  switch (kind) {
    case 'led':
      lens(build, part.color, 0, -1.5, 0);
      return;
    case 'rgb': {
      const { mesh, material } = ledDome('#f2efe6', true);
      mesh.position.set(0, top, -1.5);
      add(build, mesh, 6, 6);
      const halo = glow('#ffffff', 20);
      halo.position.set(0, top + 6, -1.5);
      build.group.add(halo);
      build.updates.push(({ leds }) => {
        const [r = 0, g = 0, b = 0] = leds.map((v) => Math.min(1, Math.max(0, v)));
        const peak = Math.max(r, g, b);
        material.emissive.setRGB(r, g, b);
        material.emissiveIntensity = 0.05 + peak * 1.4;
        (halo.material as THREE.SpriteMaterial).color.setRGB(r || 0.01, g || 0.01, b || 0.01);
        (halo.material as THREE.SpriteMaterial).opacity = peak * 0.85;
      });
      return;
    }
    case 'traffic': {
      add(build, box(26, 3, 10, mat(palette.plastic, 0.5), 0, top, -2), 26, 10);
      ['#e8392e', '#f2c23a', '#3fbf6a'].forEach((color, i) => {
        const { mesh, material } = ledDome(color);
        mesh.position.set((i - 1) * 8, top + 3, -2);
        build.group.add(mesh);
        const halo = glow(color, 16);
        halo.position.set((i - 1) * 8, top + 9, -2);
        build.group.add(halo);
        build.updates.push(({ leds }) => {
          const t = Math.min(1, Math.max(0, leds[i] ?? 0));
          material.emissiveIntensity = 0.05 + t * 1.4;
          (halo.material as THREE.SpriteMaterial).opacity = t * 0.85;
        });
      });
      return;
    }
    case 'ledbar': {
      add(build, box(26, 7, 10, mat(palette.plastic, 0.5), 0, top, -3), 26, 10);
      for (let i = 0; i < 10; i++) {
        const material = own(
          new THREE.MeshStandardMaterial({
            color: part.color,
            roughness: 0.3,
            emissive: new THREE.Color(part.color),
            emissiveIntensity: 0.05,
          }),
        );
        build.group.add(box(1.6, 0.2, 5, material, -11.25 + i * 2.5, top + 7, -3));
        build.updates.push(({ leds }) => {
          material.emissiveIntensity = 0.05 + Math.min(1, leds[i] ?? 0) * 1.5;
        });
      }
      return;
    }
    case 'seg7': {
      add(build, box(13, 8, 19, mat('#1b1d22', 0.5), 0, top, -3), 13, 19);
      screenPlane(build, sevenSegmentScreen(part.color), 12, 17.5, 0, top + 8.02, -3);
      return;
    }
    case 'limit': {
      add(build, box(20, 7, 10, mat('#20292c'), 0, top, -3), 20, 10);
      const lever = box(22, 0.5, 4, metal(), 0, top + 8, -3);
      lever.rotation.z = -0.15;
      build.group.add(lever);
      const roller = cylinder(2.2, 4.5, mat('#e1e2dd'), 10, top + 6, -3);
      roller.rotation.x = Math.PI / 2;
      build.group.add(roller);
      screw(build.group, -6, top + 7, 0);
      setPick(lever, { type: 'control', id: part.id });
      build.control = lever;
      build.updates.push(({ part: live }) => {
        lever.rotation.z = (live ?? build.part).value ? 0 : -0.15;
      });
      return;
    }
    case 'button':
    case 'btnmod':
    case 'tact12':
    case 'latchbtn': {
      // 12×12 tactile switches are twice the size of the common 6×6 one.
      const big = kind === 'tact12' ? 1 : 0,
        size = big ? 12 : kind === 'latchbtn' ? 8 : 6;
      add(build, box(size, 3.5, size, mat('#2c2f3a', 0.5), 0, top, -3), size, size);
      build.group.add(box(size - 0.4, 0.3, size - 0.4, metal(), 0, top + 3.5, -3));
      for (const sx of [-1, 1])
        for (const sz of [-1, 1])
          build.group.add(
            cylinder(
              0.9,
              0.5,
              mat(palette.metal, 0.4, 0.5),
              sx * (size / 2 - 0.8),
              top + 3.5,
              -3 + sz * (size / 2 - 0.8),
              10,
            ),
          );
      const cap =
        kind === 'latchbtn'
          ? box(5, 4, 5, mat('#f2efe6', 0.45))
          : cylinder(
              1.7 + big * 3.1,
              3.4,
              mat(kind === 'btnmod' ? '#2f3547' : kind === 'tact12' ? part.color : '#ec5a4b', 0.4),
              0,
              0,
              0,
            );
      const holder = new THREE.Group();
      holder.position.set(0, top + 3.5, -3);
      holder.add(cap);
      build.group.add(holder);
      setPick(holder, { type: 'control', id: part.id });
      build.control = holder;
      // The cap travels down over a few frames and springs back on release.
      let travel = 0;
      build.updates.push(() => {
        const goal = build.part.value ? 1.3 : 0;
        travel += (goal - travel) * 0.45;
        if (Math.abs(goal - travel) < 0.02) travel = goal;
        holder.position.y = top + 3.5 - travel;
        holder.scale.setScalar(1 - travel * 0.04);
        return travel !== goal;
      });
      return;
    }
    case 'switch':
    case 'slideswitch': {
      add(build, box(12, 5, 6, mat('#2c2f3a', 0.5), 0, top, -3), 12, 6);
      const lever = box(2.4, 4, 2.4, mat(palette.metal, 0.4, 0.5), 0, 0, 0);
      const holder = new THREE.Group();
      holder.add(lever);
      holder.position.set(0, top + 5, -3);
      build.group.add(holder);
      setPick(holder, { type: 'control', id: part.id });
      build.control = holder;
      build.updates.push(() => {
        holder.position.x = build.part.value ? 2.5 : -2.5;
      });
      return;
    }
    case 'dip': {
      const bits = partCatalog.dip.control.bits ?? partCatalog.dip.pins.length / 2;
      add(build, box(bits * 2.54 + 2, 4, 9, mat('#d64a3a', 0.5), 0, top, -4), bits * 2.54 + 2, 9);
      const knobs: THREE.Mesh[] = [];
      for (let i = 0; i < Math.max(1, bits); i++) {
        const knob = box(1.2, 1, 2, mat('#f6f2ea', 0.5), (i - (bits - 1) / 2) * PITCH, top + 4, -4);
        build.group.add(knob);
        knobs.push(knob);
      }
      build.updates.push(() => {
        knobs.forEach(
          (knob, i) => (knob.position.z = -4 + ((build.part.value >> i) & 1 ? -1.6 : 1.6)),
        );
      });
      return;
    }
    case 'joystick': {
      add(build, box(16, 10, 16, mat('#2c2f3a', 0.5), 0, top, -4), 16, 16);
      const stick = new THREE.Group();
      stick.position.set(0, top + 10, -4);
      stick.add(cylinder(1.4, 8, mat('#c9ccd3', 0.4, 0.5)));
      const cap = cylinder(6, 6, mat('#2f3547', 0.6), 0, 8, 0);
      stick.add(cap);
      build.group.add(stick);
      build.updates.push(() => {
        const [x = 512, y = 512] = partValues(build.part);
        stick.rotation.z = -((x - 512) / 512) * 0.4;
        stick.rotation.x = ((y - 512) / 512) * 0.4;
      });
      return;
    }
    case 'keypad':
    case 'keypad3x4': {
      add(
        build,
        box(build.width - 6, 0.6, build.depth - 8, mat('#1d2230', 0.7), 0, top, -2),
        build.width - 6,
        build.depth - 8,
      );
      const cols = kind === 'keypad3x4' ? 3 : 4,
        rows = 4,
        kw = (build.width - 12) / cols,
        kd = (build.depth - 14) / rows;
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
          build.group.add(
            box(
              kw * 0.78,
              1.2,
              kd * 0.72,
              mat(c === 3 ? '#d64a3a' : '#e9e4d6', 0.6),
              (c - (cols - 1) / 2) * kw,
              top + 0.6,
              -2 + (r - 1.5) * kd,
            ),
          );
      return;
    }
    case 'potentiometer':
    case 'potmod': {
      add(build, box(10, 6, 10, mat('#3d6fc4', 0.5), 0, top, -4), 10, 10);
      const knob = new THREE.Group();
      knob.position.set(0, top + 6, -4);
      knob.add(cylinder(3.5, 2, mat(palette.metal, 0.4, 0.5)));
      const grip = cylinder(6, 7, mat('#2c2f3a', 0.55), 0, 2, 0, 20);
      knob.add(grip);
      knob.add(box(0.8, 0.3, 4.5, mat('#f6f2ea', 0.5), 0, 9, -2.6));
      build.group.add(knob);
      setPick(knob, { type: 'control', id: part.id });
      build.control = knob;
      const max = partCatalog[kind].control.max ?? 1023;
      build.updates.push(() => {
        knob.rotation.y = (0.5 - build.part.value / max) * (Math.PI * 1.5);
      });
      return;
    }
    case 'slidepot': {
      const length = Math.min(build.width - 8, 50);
      add(build, box(length, 6, 8, mat('#2c2f3a', 0.55), 0, top, -4), length, 8);
      const handle = box(4, 8, 6, mat('#f0c93a', 0.5), 0, top + 6, -4);
      build.group.add(handle);
      setPick(handle, { type: 'control', id: part.id });
      build.control = handle;
      const max = partCatalog.slidepot.control.max ?? 1023;
      build.updates.push(() => {
        handle.position.x = (build.part.value / max - 0.5) * (length - 8);
      });
      return;
    }
    case 'buzzer':
    case 'activebuzzer': {
      const body = add(build, cylinder(6, 8, mat('#24272f', 0.45), 0, top, -3, 32), 12, 12);
      const port = cylinder(1.2, 0.2, mat('#0d0f17', 0.9), 0, top + 8, -3);
      build.group.add(port);
      const crown = new THREE.Mesh(new THREE.TorusGeometry(5.7, 0.35, 6, 32), mat('#3a3d47', 0.4));
      crown.rotation.x = Math.PI / 2;
      crown.position.set(0, top + 8, -3);
      build.group.add(crown);
      if (kind === 'activebuzzer') {
        // The sealed active buzzer carries its polarity sticker on top; the passive one has none.
        const sticker = cylinder(4.6, 0.06, mat('#e9e6dc', 0.8), 0, top + 8, -3, 24);
        sticker.position.y = top + 8.04;
        build.group.add(sticker);
        for (const [w, d] of [
          [2.6, 0.6],
          [0.6, 2.6],
        ] as const)
          build.group.add(flat(box(w, 0.05, d, mat('#d8453a', 0.5), -2, top + 8.08, -3)));
      }
      soundRings(build, 0, top + 9, -3, 10, port);
      build.updates.push(({ state, time }) => {
        const on = Boolean(state?.active || state?.frequencyHz);
        body.scale.setScalar(on ? 1 + 0.03 * Math.sin(time / 30) : 1);
        return on;
      });
      return;
    }
    case 'servo':
    case 'servo360':
    case 'mg996r': {
      // MG996R: same layout as the SG90, about 1.7× larger and black.
      const k = kind === 'mg996r' ? 1.7 : 1,
        shell = mat(kind === 'mg996r' ? '#2c2f3a' : '#3d6fc4', 0.5);
      add(build, box(23 * k, 12 * k, 12 * k, shell, 0, top, -4), 23 * k, 12 * k);
      add(build, box(32 * k, 1.6, 12 * k, shell, 0, top + 8.5 * k, -4), 32 * k, 12 * k, false);
      build.group.add(
        cylinder(5.8 * k, kind === 'mg996r' ? 7 : 4, shell, -5.5 * k, top + 12 * k, -4),
      );
      if (kind === 'mg996r') {
        add(build, box(25, 7, 19, mat('#70777b', 0.4, 0.5), 0, top + 12, -4), 25, 19);
        for (const x of [-15, 15]) screw(build.group, x, top + 14.7, -4);
      } else {
        build.group.add(box(14, 8, 0.15, mat('#d9e4ed', 0.6), 0, top + 2, 2.05));
      }
      const horn = new THREE.Group();
      horn.position.set(-5.5 * k, top + 12 * k + 4, -4);
      horn.add(cylinder(2.6, 2, mat('#f6f2ea', 0.5)));
      horn.add(box(3.4, 1.6, 15, mat('#f6f2ea', 0.5), 0, 0.2, -6.5));
      build.group.add(horn);
      if (kind === 'servo360') {
        // Continuous rotation: the horn turns at up to a revolution per second.
        let spin = 0,
          last = 0;
        build.updates.push(({ state, time }) => {
          const speed = state?.powered ? (state.motors?.[0] ?? 0) : 0;
          spin += speed * Math.PI * 2 * Math.min(0.1, last ? (time - last) / 1000 : 0);
          last = time;
          horn.rotation.y = spin;
          return speed !== 0;
        });
        return;
      }
      build.updates.push(({ state }) => {
        horn.rotation.y = (((state?.angle ?? 90) - 90) * Math.PI) / 180;
      });
      return;
    }
    case 'motor':
    case 'vibration': {
      const vibration = kind === 'vibration';
      const body = vibration
        ? cylinder(5, 2.6, mat('#c9ccd3', 0.35, 0.6), 0, top, -3)
        : cylinder(6, 18, mat('#c9ccd3', 0.35, 0.6), -2, top + 6, -3);
      if (!vibration) {
        body.rotation.z = Math.PI / 2;
        body.position.set(-2, top + 6, -3);
      }
      add(build, body, vibration ? 10 : 18, vibration ? 10 : 12);
      const rotor = new THREE.Group();
      if (!vibration) {
        rotor.position.set(8.5, top + 6, -3);
        rotor.rotation.z = Math.PI / 2;
        rotor.add(cylinder(0.8, 4, metal(), 0, 0, 0));
        const blade = box(1, 1, 22, mat('#f0a53a', 0.5), 0, 3.5, 0);
        rotor.add(blade);
        build.group.add(rotor);
      }
      build.updates.push(({ state, time }) => {
        const on = Boolean(state?.active);
        if (vibration) body.position.x = on ? Math.sin(time / 12) * 0.4 : 0;
        else if (on) rotor.rotation.x = time / 40;
        return on;
      });
      return;
    }
    case 'relay': {
      add(build, box(19, 15, 15, mat('#3d6fc4', 0.45), -4, top, -3), 19, 15);
      const marking = new THREE.Mesh(
        new THREE.PlaneGeometry(17, 6),
        own(
          new THREE.MeshStandardMaterial({
            map: paintMarking('SRD-05VDC', 17, 6, '#e9eef7'),
            roughness: 0.4,
          }),
        ),
      );
      marking.rotation.x = -Math.PI / 2;
      marking.position.set(-4, top + 15.02, -3);
      build.group.add(marking);
      add(build, box(7, 8, 8, mat('#3f7fc8', 0.5), 11, top, -3), 7, 8);
      const led = smdLed('#e84a3a', 11, top, 6);
      build.group.add(led.mesh);
      build.updates.push(({ state }) => void led.set(state?.active ? 1 : 0));
      return;
    }
    case 'laser': {
      const tube = cylinder(3, 14, mat('#d4b46a', 0.35, 0.65), 0, 0, 0);
      tube.rotation.z = Math.PI / 2;
      tube.position.set(0, top + 3, -3);
      add(build, tube, 14, 6);
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.35, 120, 8),
        own(
          new THREE.MeshBasicMaterial({
            color: '#ff3b2f',
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
        ),
      );
      beam.rotation.z = Math.PI / 2;
      beam.position.set(67, top + 3, -3);
      flat(beam);
      build.group.add(beam);
      build.updates.push(({ state }) => {
        (beam.material as THREE.MeshBasicMaterial).opacity = state?.active ? 0.8 : 0;
      });
      return;
    }
    case 'oled32': {
      add(build, box(26, 1.6, 9, mat('#121419', 0.25), 0, top, -2), 26, 9);
      screenPlane(build, oledScreen(32), 22, 5.5, 0, top + 1.62, -2);
      return;
    }
    case 'oled':
    case 'sh1106': {
      add(build, box(26, 1.6, 15, mat('#121419', 0.25), 0, top, -2), 26, 15);
      screenPlane(build, oledScreen(), 22, 11, 0, top + 1.62, -2);
      return;
    }
    case 'scope': {
      // A Soviet bench oscilloscope (С1-94 style) standing on the table: blue-grey case, carrying
      // handle, the CRT and six knobs on the front plate, three probes lying in front of it.
      const { w: W, h: H } = PANEL,
        depth = 30,
        front = scopeFront(build.depth),
        case_ = mat('#8da2a0', 0.55),
        rubber = mat('#1b2022', 0.7),
        chrome = mat('#d4d0c8', 0.3, 0.7),
        body = new THREE.Group(),
        place = (x: number, y: number) => [x - W / 2, H / 2 - y] as const;
      body.position.set(0, 1.4 + H / 2, front);
      // Rubber feet and the case itself.
      for (const fx of [-W / 2 + 6, W / 2 - 6])
        for (const fz of [front - depth + 6, front - 6])
          add(build, cylinder(2, 1.4, rubber, fx, 0, fz, 12), 4, 4, false);
      body.add(box(W + 1.6, H + 1.6, depth, case_, 0, -(H + 1.6) / 2, -depth / 2));
      // Front plate: the painted art, with the CRT as its own plane on top.
      const art = new THREE.Mesh(
        new THREE.PlaneGeometry(W, H),
        own(new THREE.MeshStandardMaterial({ map: scopePanelTexture(), roughness: 0.6 })),
      );
      art.position.z = 0.02;
      body.add(art);
      const { context, texture } = canvasTexture(512, 320),
        [sx, sy] = place(SCREEN.x + SCREEN.w / 2, SCREEN.y + SCREEN.h / 2),
        crt = new THREE.Mesh(
          new THREE.PlaneGeometry(SCREEN.w, SCREEN.h),
          own(
            new THREE.MeshStandardMaterial({
              map: texture,
              emissiveMap: texture,
              emissive: new THREE.Color('#ffffff'),
              emissiveIntensity: 0.95,
              roughness: 0.25,
            }),
          ),
        );
      crt.position.set(sx, sy, 0.06);
      body.add(crt);
      // Knobs are real: each is picked on its own and its pointer follows the setting.
      const pointers: THREE.Group[] = [];
      KNOBS.forEach((knob, index) => {
        const [kx, ky] = place(knob.x, knob.y),
          holder = new THREE.Group();
        holder.position.set(kx, ky, 0);
        const skirt = new THREE.Mesh(
          new THREE.CylinderGeometry(knob.radius + 0.9, knob.radius + 0.9, 0.7, 24),
          chrome,
        );
        skirt.rotation.x = Math.PI / 2;
        skirt.position.z = 0.35;
        const cap = new THREE.Mesh(
          new THREE.CylinderGeometry(knob.radius, knob.radius * 0.88, 2.6, 24),
          rubber,
        );
        cap.rotation.x = Math.PI / 2;
        cap.position.z = 1.8;
        cap.castShadow = true;
        const pointer = new THREE.Mesh(
          new THREE.BoxGeometry(0.55, knob.radius * 0.8, 0.3),
          mat('#f1f1e8', 0.4),
        );
        pointer.position.set(0, knob.radius * 0.5, 3.15);
        const turn = new THREE.Group();
        turn.add(pointer);
        pointers.push(turn);
        holder.add(skirt, cap, turn);
        setPick(holder, { type: 'control', id: build.part.id, knob: index });
        body.add(holder);
      });
      // Probes: a cable from each socket to a puck on the table, where the jumper plugs in.
      SOCKETS.forEach((socket, index) => {
        const [bx, by] = place(socket.x, socket.y),
          color = PROBE_COLORS[socket.pin],
          tip = scopeTip(build.depth, index),
          jack = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 3.2, 20), chrome),
          hole = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 3.3, 16), rubber),
          pin = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 3.6, 8), chrome);
        for (const part of [jack, hole, pin]) {
          part.rotation.x = Math.PI / 2;
          part.position.set(bx, by, 1.6);
        }
        hole.position.z = 1.65;
        pin.position.z = 1.9;
        body.add(jack, hole, pin);
        const sockets = new THREE.Vector3(bx, 1.4 + H / 2 + by, front + 3.2),
          cable = new THREE.Mesh(
            new THREE.TubeGeometry(
              new THREE.CubicBezierCurve3(
                sockets,
                new THREE.Vector3(bx, sockets.y - 3, front + 5.5),
                new THREE.Vector3(tip.x, 4, tip.z - 2),
                new THREE.Vector3(tip.x, 1.8, tip.z),
              ),
              24,
              0.5,
              6,
            ),
            mat(color, 0.5),
          );
        cable.castShadow = true;
        build.group.add(cable, cylinder(2.2, 1.4, mat(color, 0.45), tip.x, 0, tip.z, 16));
      });
      // Carrying handle on top: two posts and a bar.
      for (const hx of [-W * 0.3, W * 0.3]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 5, 10), chrome);
        post.position.set(hx, H / 2 + 3.3, -depth / 2);
        body.add(post);
      }
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, W * 0.6, 12), chrome);
      bar.rotation.z = Math.PI / 2;
      bar.position.set(0, H / 2 + 5.6, -depth / 2);
      bar.castShadow = true;
      body.add(bar);
      build.group.add(body);
      let drawn = '';
      build.updates.push((live) => {
        const part = live.part;
        if (part)
          KNOBS.forEach((knob, index) => {
            pointers[index]!.rotation.z = -dialAngle(knob.dial, dialValue(part, knob.dial));
          });
        const feed = live.scope;
        if (!feed) return false;
        // Repaint only when something visible changed.
        const key = JSON.stringify([
          feed.now.toFixed(4),
          feed.timeDiv,
          feed.voltDiv,
          feed.brightness,
          feed.focus,
          feed.trigger,
          feed.grounded,
          feed.channels.map((channel) => [channel.connected, channel.volts]),
        ]);
        if (key === drawn) return false;
        drawn = key;
        paintScope(context, feed);
        texture.needsUpdate = true;
        return false;
      });
      return;
    }
    case 'lcd1602':
    case 'lcd1602p':
    case 'lcd2004': {
      const rows = kind === 'lcd2004' ? 4 : 2,
        w = Math.min(build.width - 6, 66),
        d = Math.min(build.depth - 10, rows === 4 ? 26 : 16);
      add(build, box(w + 4, 7, d + 4, mat('#1d2230', 0.55), 0, top, -2), w + 4, d + 4);
      screenPlane(build, lcdScreen(kind === 'lcd2004' ? 20 : 16, rows), w, d, 0, top + 7.02, -2);
      return;
    }
    case 'max7219': {
      add(build, box(32, 8, 32, mat('#151214', 0.5), 0, top, -3), 32, 32);
      screenPlane(build, matrixScreen(), 31, 31, 0, top + 8.02, -3);
      return;
    }
    case 'rtc':
      chipBlock(build, 'DS1307', 8, 5, -6, -3);
      // CR2032 in its holder: black base, steel cell, two clips over the rim.
      add(build, cylinder(11.2, 1.6, mat('#1d1f27', 0.5), 8, top, -2, 36), 22.4, 22.4);
      add(build, cylinder(10, 3.2, mat('#c9ccd3', 0.3, 0.7), 8, top + 1.6, -2, 36), 20, 20);
      for (const z of [-9.5, 5.5]) build.group.add(box(5, 0.5, 2.6, metal(), 8, top + 4.2, z));
      return;
    case 'mpu6050':
      chipBlock(build, 'MPU-6050', 5, 5, 0, -3, 1);
      return;
    case 'bh1750':
      chipBlock(build, 'BH1750', 7, 4.6, 0, -3, 1.2);
      build.group.add(box(2.6, 0.2, 2.6, mat('#1b2a4a', 0.2), -1.4, top + 1.22, -3));
      breakoutParts(build);
      return;
    case 'lm75':
      chipBlock(build, 'LM75', 6.5, 5, 0, -3, 1.6);
      breakoutParts(build);
      return;
    case 'eeprom':
      chipBlock(build, 'AT24C256', 10, 7, 0, -3, 3.2);
      return;
    case 'pcf8574':
      chipBlock(build, 'PCF8574', 20, 7.6, 0, -3, 3.2);
      return;
    case 'shift595':
      chipBlock(build, '74HC595', 20, 7.6, 0, -3, 3.2);
      return;
    default: {
      const detail = sensorDetail[kind] ?? kitDetail[kind];
      if (detail) detail(build, value);
      else chipBlock(build, partCatalog[kind].name.split(' ')[0]!.toUpperCase(), 9, 6, 0, -3);
    }
  }
}

function resistorModel(build: Build) {
  const { part, top } = build;
  const profile: THREE.Vector2[] = [];
  const shape = (x: number) => (x < 0.8 || x > 5.2 ? 1.25 : 1.05);
  for (let i = 0; i <= 24; i++) {
    const x = (i / 24) * 6;
    profile.push(
      new THREE.Vector2(
        Math.max(0.01, shape(x) * Math.sin((Math.min(x, 6 - x, 0.6) / 0.6) * (Math.PI / 2))),
        x - 3,
      ),
    );
  }
  const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 24), mat('#e6cfa4', 0.55));
  body.rotation.z = Math.PI / 2;
  body.position.set(0, top + 4, 0);
  body.castShadow = true;
  add(build, body, 7, 3);
  const bandColors = [
    '#2b2b2b',
    '#7a4a2a',
    '#d0412f',
    '#e8892f',
    '#efc540',
    '#3fae6a',
    '#3d6fc4',
    '#8a63c9',
    '#8b8f94',
    '#f4f4f4',
  ];
  const exponent = Math.floor(Math.log10(Math.max(1, part.value))) - 1,
    digits = Math.round(part.value / 10 ** exponent),
    bands = [
      bandColors[Math.floor(digits / 10) % 10]!,
      bandColors[digits % 10]!,
      exponent < 0 ? '#c9a54a' : bandColors[Math.min(9, exponent)]!,
      '#c9a54a',
    ];
  bands.forEach((color, i) => {
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.1, 0.5, 20, 1, true),
      mat(color, 0.5),
    );
    band.rotation.z = Math.PI / 2;
    band.position.set(-1.6 + i * (i === 3 ? 1.15 : 0.95), top + 4, 0);
    build.group.add(band);
  });
  const legMaterial = mat('#e6e2d8', 0.4, 0.2);
  for (const side of [-1, 1]) {
    const path = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 3, top + 4, 0),
      new THREE.Vector3(side * 6, top + 4, 0),
      new THREE.Vector3(side * (build.width / 2 - 2.5), top + 3, 0),
      new THREE.Vector3(
        side * (build.width / 2 - 2.5),
        top + MALE_BASE - (build.carry ? LEAD_REACH.short : 0),
        0,
      ),
    ]);
    const leg = new THREE.Mesh(
      new THREE.TubeGeometry(path, 16, build.carry ? 0.45 : 0.3, 6),
      legMaterial,
    );
    leg.castShadow = true;
    build.group.add(leg);
  }
}

function breadboardModel(layout: PartLayout): Model {
  const group = new THREE.Group(),
    geometry = breadboardGeometry(layout.part.value),
    { width, boardDepth: depth, height } = geometry;
  group.position.set(layout.center.x, 0, layout.center.z);
  setPick(group, { type: 'part', id: layout.part.id });
  for (let board = 0; board < geometry.boards; board++) {
    const offsetZ = geometry.offsetZ(board),
      prefix = board ? '2' : '',
      local = (pin: string) => {
        const offset = breadboardOffset(pin, layout.part.value);
        return { x: offset.x + width / 2, z: offset.z - offsetZ + depth / 2 };
      };
    const holes = layout.pins
      .filter((pin) => (pin.label.startsWith('2') ? 1 : 0) === board)
      .map((pin) => local(pin.label));
    const labels = [
      ...Array.from({ length: geometry.columns }, (_, i) => i + 1)
        .filter((column) => column === 1 || column % 5 === 0)
        .flatMap((column) => [
          { text: String(column), ...local(`${prefix}a${column}`), dz: -2.2 },
          { text: String(column), ...local(`${prefix}j${column}`), dz: 2.2 },
        ])
        .map(({ text, x, z, dz }) => ({ text, x, z: z + dz })),
      ...breadboardRows.split('').flatMap((row) => [
        { text: row, x: 2, z: local(`${prefix}${row}1`).z },
        { text: row, x: width - 2, z: local(`${prefix}${row}1`).z },
      ]),
      ...(['P', 'N', 'Pb', 'Nb'] as const).map((rail) => ({
        text: rail.startsWith('P') ? '+' : '−',
        x: 2,
        z: local(`${prefix}${rail}1`).z,
      })),
    ];
    const texture = paintBreadboard(width, depth, holes, labels);
    const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), [
      mat(palette.breadboard, 0.75),
      mat(palette.breadboard, 0.75),
      own(new THREE.MeshStandardMaterial({ map: texture, roughness: 0.75 })),
      mat(palette.breadboard, 0.75),
      mat(palette.breadboard, 0.75),
      mat(palette.breadboard, 0.75),
    ]);
    body.position.set(0, height / 2, offsetZ);
    body.castShadow = body.receiveShadow = true;
    group.add(body);
  }
  return { group, update: () => false, dispose: disposeGroup(group) };
}

/** A bare component standing in breadboard holes: body above the board, leads into the holes. */
function mountedDiscrete(layout: PartLayout, build: Build) {
  const { part } = layout,
    spanWidth =
      Math.abs(layout.pins[0]!.x - layout.pins[layout.pins.length - 1]!.x) +
      Math.abs(layout.pins[0]!.z - layout.pins[layout.pins.length - 1]!.z);
  if (lookOf(part.kind) === 'resistor') {
    if (!layout.mounted && !build.carry) {
      build.top = STANDOFF + PCB;
      const texture = paintPcb(layout.width, layout.depth, {
        base: '#2b6653',
        trace: 'rgba(213,196,131,.5)',
        seed: 0,
        pads: [
          { x: 2.5, z: layout.depth / 2 },
          { x: layout.width - 2.5, z: layout.depth / 2 },
        ],
        labels: [
          { text: formatOhm(part.value), x: layout.width / 2, z: layout.depth / 2 + 3, size: 1.2 },
        ],
      });
      build.group.add(
        pcbSlab(layout.width, layout.depth, texture, palette.pcbEdge, false, false, []),
      );
      resistorModel(build);
      build.group.add(
        headers(
          [
            { x: -layout.width / 2 + 2.5, z: 0 },
            { x: layout.width / 2 - 2.5, z: 0 },
          ],
          build.top,
          'male',
        ),
      );
      return;
    }
    build.width = spanWidth + 5;
    build.top = layout.center.y - MALE_BASE;
    resistorModel(build);
    return;
  }
  build.top = layout.center.y + 1.2;
  const body = new THREE.Group();
  const inner: Build = { ...build, group: body, updates: [] };
  partBody(inner, part.value);
  build.updates.push((context) => {
    if (context.part) inner.part = context.part;
    let animating = false;
    for (const step of inner.updates) if (step(context)) animating = true;
    return animating;
  });
  build.control = inner.control;
  // partBody places features where a module would; centre them over the leads instead.
  const box = new THREE.Box3().setFromObject(body);
  body.position.set(-(box.min.x + box.max.x) / 2, 0, -(box.min.z + box.max.z) / 2);
  build.group.add(body);
  const legs: THREE.BufferGeometry[] = [],
    anodes = partCatalog[part.kind].emit?.anodes ?? [],
    turnBack = (4 - layout.turn) % 4;
  // Leads in the part's own frame, centred under its body. Plugged in, they are the breadboard
  // holes; held in the air, they follow the package (a DIP has two rows across the centre gap),
  // because the pins of the free layout stand in one row like a module's header.
  const centred = (points: { x: number; z: number }[]) => {
    const mx = points.reduce((sum, point) => sum + point.x, 0) / points.length,
      mz = points.reduce((sum, point) => sum + point.z, 0) / points.length;
    return points.map((point) => ({ x: point.x - mx, z: point.z - mz }));
  };
  const contacts = layout.contacts ?? layout.pins;
  const leads =
    layout.mounted || layout.contacts
      ? centred(contacts).map((point) => turnOffset(point.x, point.z, turnBack))
      : centred(
          leadOffsets(lookOf(part.kind)).map(([column, row]) => ({
            x: column * PITCH,
            z: row * 7.62,
          })),
        );
  for (const [index, pin] of contacts.entries()) {
    const local = leads[index] ?? { x: (index - contacts.length / 2) * PITCH, z: 0 };
    // The anode is the longer lead; while the part is carried both reach well below the body.
    // Only LED-like parts have long wire leads; switches and pots have short stubs.
    const reach = !build.carry
        ? 0
        : !partCatalog[part.kind].emit
          ? LEAD_REACH.stub
          : anodes.includes(pin.label)
            ? LEAD_REACH.long
            : LEAD_REACH.short,
      packaged = lookOf(part.kind) === 'chip595' || lookOf(part.kind) === 'chip165',
      rise = packaged ? 0.7 : 0.4,
      leg = new THREE.BoxGeometry(
        build.carry ? 0.8 : 0.5,
        1.6 + reach + rise,
        build.carry ? 0.8 : 0.5,
      );
    leg.translate(local.x, layout.center.y + 1.4 + rise - (1.6 + reach + rise) / 2, local.z);
    legs.push(leg);
    if (['button', 'tact12', 'latchbtn'].includes(lookOf(part.kind))) {
      const half = lookOf(part.kind) === 'tact12' ? 6 : lookOf(part.kind) === 'latchbtn' ? 4 : 3;
      const side = Math.sign(local.z) || 1;
      const inside = Math.min(half - 0.5, Math.abs(local.z));
      const length = Math.abs(local.z) - inside + 0.5;
      const shoulder = new THREE.BoxGeometry(0.65, 0.6, length);
      shoulder.translate(local.x, layout.center.y + 1.5, side * (inside + length / 2 - 0.25));
      legs.push(shoulder);
    }
    if (packaged) {
      // A DIP lead leaves the side of the package, then bends down: without the shoulder the
      // legs stand beside the body like separate pegs.
      const side = Math.sign(local.z) || 1,
        inner = 3,
        length = Math.abs(local.z) + 0.25 - inner,
        shoulder = new THREE.BoxGeometry(0.5, 0.6, length);
      shoulder.translate(local.x, layout.center.y + 1.4 + rise - 0.3, side * (inner + length / 2));
      legs.push(shoulder);
    }
    // The anode is the longer lead: it rises above the hole with a small kink.
    if (anodes.includes(pin.label)) {
      const knee = new THREE.BoxGeometry(0.5, 0.5, 1.4);
      knee.translate(local.x, layout.center.y + 1.5, local.z + 0.45);
      legs.push(knee);
    }
  }
  const mesh = new THREE.Mesh(mergeGeometries(legs), mat('#e6e2d8', 0.4, 0.2));
  for (const geometry of legs) geometry.dispose();
  build.group.add(mesh);
  // A real LED has a flat on the rim at the cathode side, next to the shorter lead.
  const emit = partCatalog[part.kind].emit,
    cathode = layout.pins.findIndex((pin) => pin.label === emit?.cathode);
  if (emit && cathode >= 0 && lookOf(part.kind) === 'led') {
    const local = leads[cathode]!,
      length = Math.hypot(local.x, local.z) || 1,
      flat = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.1, 3.8), mat('#f2efe6', 0.5));
    flat.position.set((local.x / length) * 2.85, build.top + 0.55, (local.z / length) * 2.85);
    flat.rotation.y = -Math.atan2(local.z, local.x);
    build.group.add(flat);
  }
}

export function buildPart(layout: PartLayout, carry = false): Model {
  const { part } = layout;
  if (lookOf(part.kind) === 'breadboard') return breadboardModel(layout);
  const group = new THREE.Group();
  group.position.set(layout.center.x, 0, layout.center.z);
  group.rotation.y = (-layout.turn * Math.PI) / 2;
  setPick(group, { type: 'part', id: part.id });
  const finish = (build: Build): Model => ({
    group,
    control: build.control,
    update: (context) => {
      if (context.part) build.part = context.part;
      let animating = false;
      for (const step of build.updates) if (step(context)) animating = true;
      return animating;
    },
    dispose: disposeGroup(group),
  });
  const build: Build = {
    group,
    top: layout.top,
    width: layout.width,
    depth: layout.depth,
    part,
    shadows: [],
    labels: [],
    updates: [],
    carry,
  };
  if (lookOf(part.kind) === 'scope') {
    partBody(build, part.value);
    return finish(build);
  }
  // Desk adapters expose a clear row of jumper contacts. The actual component keeps its
  // physical leads on the adapter, and becomes bare again when carried into a breadboard.
  if (layout.adapter && !carry && lookOf(part.kind) !== 'resistor') {
    build.top = STANDOFF + PCB;
    const localPins = layout.pins.map((pin) =>
      turnOffset(pin.x - layout.center.x, pin.z - layout.center.z, (4 - layout.turn) % 4),
    );
    const texture = paintPcb(layout.width, layout.depth, {
      base: '#2b6653',
      trace: 'rgba(213,196,131,.5)',
      seed: 0,
      pads: localPins.map((pin, i) => ({
        x: pin.x + layout.width / 2,
        z: pin.z + layout.depth / 2,
        label: partPinNames(part)[i],
        labelSide: -1,
      })),
      labels: [
        {
          text:
            (
              { potentiometer: 'POT', chip595: '74HC595', chip165: '74HC165' } as Record<
                string,
                string
              >
            )[lookOf(part.kind)] ?? lookOf(part.kind).toUpperCase(),
          x: layout.width / 2,
          z: 2.5,
          size: 1.2,
        },
      ],
    });
    group.add(pcbSlab(layout.width, layout.depth, texture, palette.pcbEdge, false, false, []));
    const bare = partLayout(part, { ...layout.center, y: build.top }, true);
    mountedDiscrete(bare, build);
    group.add(headers(localPins, STANDOFF + PCB, 'male'));
    return finish(build);
  }
  if (discreteKinds.has(lookOf(part.kind))) {
    mountedDiscrete(layout, build);
    return finish(build);
  }
  // An upright module is built flat in `holder`, then stood on its edge over its pin row.
  const upright = part.upright === true && uprightKinds.has(lookOf(part.kind)),
    holder = upright ? new THREE.Group() : group;
  build.group = holder;
  if (lookOf(part.kind) === 'resistor') resistorModel(build);
  else if (splitHeaders(lookOf(part.kind))) {
    // The chip sits between the two header rows, not against the front one.
    const middle = new THREE.Group(),
      before = build.shadows.length;
    middle.position.z = 3;
    holder.add(middle);
    build.group = middle;
    partBody(build, part.value);
    for (const area of build.shadows.slice(before)) area.z += 3;
  } else partBody(build, part.value);
  build.group = group;
  // Pins in the model's own frame, before the group's quarter turns.
  const localPins = layout.pins.map((pin) =>
    turnOffset(pin.x - layout.center.x, pin.z - layout.center.z, (4 - layout.turn) % 4),
  );
  if (cabledKinds.has(lookOf(part.kind))) {
    // A flexible cable ends in individually addressable connector contacts.
    const colours = ['#563d2e', '#c94436', '#d6a735', '#3e72ad'];
    localPins.forEach((pin, i) => {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3((i - (localPins.length - 1) / 2) * 0.8, layout.top + 2, 1),
        new THREE.Vector3(pin.x, layout.top + 3, pin.z - 3),
        new THREE.Vector3(pin.x, layout.top + MALE_BASE, pin.z),
      ]);
      group.add(
        new THREE.Mesh(
          new THREE.TubeGeometry(curve, 12, 0.35, 6),
          mat(colours[i % colours.length]!),
        ),
      );
      group.add(box(1.8, 2.5, 2, mat('#22292c'), pin.x, layout.top, pin.z));
    });
    return finish(build);
  }
  const profile = moduleProfiles[part.kind];
  // A module only has the indicators and mounting holes belonging to that package.
  const holes = (profile?.holes ?? []).filter(
    ([x, z]) =>
      !build.shadows.some(
        (area) =>
          x + layout.width / 2 > area.x - 2 &&
          x + layout.width / 2 < area.x + area.width + 2 &&
          z + layout.depth / 2 > area.z - 2 &&
          z + layout.depth / 2 < area.z + area.depth + 2,
      ),
  );
  const pads = localPins.map((pin, i) => ({
    x: pin.x + layout.width / 2,
    z: pin.z + layout.depth / 2,
    label: lookOf(part.kind) === 'resistor' ? undefined : partPinNames(part)[i],
    // Printed towards the middle of the board, away from the edge the header sits on.
    labelSide: (pin.z > 0 ? -1 : 1) as -1 | 1,
  }));
  // The name of the module goes where it covers neither the pin names nor a component.
  const marking = profile?.marking
    ? {
        text: profile.marking,
        ...clearMarkingSpot({
          text: profile.marking,
          size: 1.2,
          want: {
            x: layout.width / 2 + (profile.label?.[0] ?? 0),
            z: layout.depth / 2 + (profile.label?.[1] ?? -layout.depth / 2 + 2.5),
          },
          width: layout.width,
          depth: layout.depth,
          pads,
          shadows: build.shadows,
          holes: holes.map(([x, z]) => [x + layout.width / 2, z + layout.depth / 2]),
        }),
        size: 1.2,
        weight: 600,
      }
    : null;
  const texture = paintPcb(layout.width, layout.depth, {
    base: pcbColor(lookOf(part.kind)),
    trace: 'rgba(160,180,220,.28)',
    seed: [...lookOf(part.kind)].reduce((sum, char) => sum + char.charCodeAt(0), 0),
    shadows: build.shadows,
    pads,
    labels: marking ? [marking] : [],
  });
  if (lookOf(part.kind) === 'soil') {
    texture.dispose();
    holder.add(box(18, PCB, 12, mat('#246749'), 0, STANDOFF, 7));
  } else
    holder.add(
      pcbSlab(
        layout.width,
        layout.depth,
        texture,
        palette.pcbEdge,
        false,
        lookOf(part.kind) === 'ws2812ring',
        holes,
      ),
    );
  if (lookOf(part.kind) !== 'ws2812ring' && lookOf(part.kind) !== 'soil')
    mountingRims(holder, layout.width, layout.depth, layout.top + 0.02, holes);
  const pinRow = localPins[0]?.z ?? layout.depth / 2;
  if (upright) {
    // Spin half a turn, then tip forward: the far edge goes up, the parts face −z.
    const spin = new THREE.Group(),
      tilt = new THREE.Group();
    spin.rotation.y = Math.PI;
    spin.add(holder);
    tilt.rotation.x = -Math.PI / 2;
    tilt.add(spin);
    tilt.position.set(0, layout.depth / 2 + STANDOFF + 1.5, pinRow - 1.2);
    group.add(tilt);
    // The right-angle header: a short base strip carrying the pins.
    group.add(box(layout.width, PCB, 5, mat(palette.pcbEdge, 0.6), 0, STANDOFF, pinRow));
  }
  if (lookOf(part.kind) === 'hcsr04') {
    const base = layout.depth / 2 + STANDOFF + 1.5;
    sonar(
      build,
      upright ? { y: base + 2, z: pinRow - 1.2 - (layout.top + 12) } : { y: layout.top + 6, z: -2 },
    );
  }
  if (layout.mounted || carry) {
    // Floats over the breadboard on its own header pins, which hang long while it is carried.
    group.position.y = MOUNT_LIFT;
    group.add(headers(localPins, STANDOFF, 'down', carry ? 12 : 6));
  } else {
    if (lookOf(part.kind) !== 'ws2812ring') group.add(headers(localPins, layout.top, 'male'));
  }
  return finish(build);
}
