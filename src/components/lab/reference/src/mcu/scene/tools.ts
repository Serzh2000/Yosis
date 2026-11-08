// 3D bench tools: each hovers above the table, carries its own light or animation and shows
// its reach as a ring on the ground. What a tool does to sensors lives in ../environment.ts.
import * as THREE from 'three';
import { toolInfo, type ToolKind, type BenchTool } from '../environment';
import { box, cylinder, flat, mat, metal, setPick } from './materials';
import { badgeTexture } from './textures';

export interface ToolModel {
  group: THREE.Group;
  /** The tool itself, lifted and tilted over the table; the group keeps the ring on the table. */
  body: THREE.Group;
  /** Moves flames and drops; returns true while it needs more frames (always, for those). */
  update(time: number, tool?: BenchTool): boolean;
  dispose(): void;
}
const additive = (color: string, opacity: number) =>
  new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
const ringColor: Record<ToolKind, string> = {
  flashlight: '#f2c84b',
  burner: '#ff7a2e',
  magnet: '#e8392e',
  hand: '#1aa3a1',
  water: '#3d8fd6',
  shaker: '#d28d37',
  sound: '#9b73d1',
  gas: '#67a66d',
  load: '#6b7890',
  uv: '#a66ee8',
  source: '#e8ad39',
  pressure: '#6eabc1',
  wheel: '#7d8796',
};

function flashlight(group: THREE.Group) {
  const height = 34;
  const body = cylinder(3.2, 18, mat('#2c3041', 0.45, 0.3), 0, height + 6, 0);
  const head = new THREE.Mesh(new THREE.CylinderGeometry(5, 3.2, 8, 24), mat('#3a3f52', 0.35, 0.5));
  head.position.y = height + 2;
  head.castShadow = true;
  const lens = new THREE.Mesh(new THREE.CircleGeometry(4.5, 24), additive('#fff6c8', 0.95));
  lens.rotation.x = Math.PI / 2;
  lens.position.y = height - 2.05;
  const button = box(2, 1, 3, mat('#e8392e', 0.5), 0, height + 18, 3.2);
  // A soft visible cone, plus a real spot light that brightens what it points at.
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(28, height - 2, 40, 1, true),
    additive('#fff1b0', 0.12),
  );
  cone.position.y = (height - 2) / 2;
  flat(cone);
  const light = new THREE.SpotLight('#fff3cf', 900, 220, 0.62, 0.55, 1.4);
  light.position.set(0, height - 2, 0);
  light.target.position.set(0, 0, 0);
  group.add(body, head, lens, button, cone, light, light.target);
  return () => false;
}
function burner(group: THREE.Group) {
  const base = cylinder(9, 3, mat('#3a3f52', 0.4, 0.4), 0, 0, 0, 32);
  const tube = cylinder(2.6, 26, mat('#c9ccd3', 0.3, 0.7), 0, 3, 0);
  const valve = box(6, 2.4, 2.4, mat('#c9a03a', 0.35, 0.6), 4, 8, 0);
  const outer = new THREE.Mesh(new THREE.ConeGeometry(4.2, 18, 20), additive('#ff8a2e', 0.75)),
    inner = new THREE.Mesh(new THREE.ConeGeometry(2.2, 9, 20), additive('#5aa9ff', 0.9));
  outer.position.y = 29 + 9;
  inner.position.y = 29 + 4.5;
  flat(outer);
  flat(inner);
  const light = new THREE.PointLight('#ff9a4a', 600, 130, 1.6);
  light.position.y = 36;
  group.add(base, tube, valve, outer, inner, light);
  return (time: number) => {
    const flicker = 1 + Math.sin(time / 70) * 0.06 + Math.sin(time / 23) * 0.04;
    outer.scale.set(1, flicker, 1);
    outer.position.y = 29 + 9 * flicker;
    light.intensity = 600 * flicker;
    return true;
  };
}
/** Horseshoe magnet standing on its poles: red north arm, blue south arm, steel pole pieces. */
function magnet(group: THREE.Group) {
  const outer = 11,
    inner = 5.5,
    leg = 13,
    depth = 7,
    lift = 6;
  // Right half of the U in the XY plane; the left half is its mirror image.
  const shape = new THREE.Shape();
  shape.moveTo(0, outer);
  shape.absarc(0, 0, outer, Math.PI / 2, 0, true);
  shape.lineTo(outer, -leg);
  shape.lineTo(inner, -leg);
  shape.lineTo(inner, 0);
  shape.absarc(0, 0, inner, 0, Math.PI / 2, false);
  shape.lineTo(0, outer);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.8,
    bevelSize: 0.8,
    bevelSegments: 3,
    curveSegments: 24,
  });
  geometry.translate(0, 0, -depth / 2);
  const holder = new THREE.Group();
  holder.position.y = lift + leg + 3;
  holder.rotation.y = -0.5;
  const arms = [
    { color: '#d93a2f', side: 1, label: 'N' },
    { color: '#2f6fd9', side: -1, label: 'S' },
  ];
  for (const { color, side, label } of arms) {
    const arm = new THREE.Mesh(geometry, mat(color, 0.35, 0.1));
    arm.scale.x = side;
    arm.castShadow = true;
    holder.add(arm);
    // Steel pole piece below each arm, with the pole letter painted on the front.
    const tip = new THREE.Mesh(
      new THREE.BoxGeometry(outer - inner + 1.6, 3, depth + 1.6),
      mat('#c9ccd3', 0.25, 0.85),
    );
    tip.position.set((side * (outer + inner)) / 2, -leg - 1.5, 0);
    tip.castShadow = true;
    holder.add(tip);
    const letter = new THREE.Mesh(
      new THREE.PlaneGeometry(4, 4),
      new THREE.MeshBasicMaterial({ map: badgeTexture(label, color), transparent: true }),
    );
    letter.position.set((side * (outer + inner)) / 2, -leg + 5, depth / 2 + 0.85);
    holder.add(letter);
  }
  group.add(holder);
  return () => false;
}
function hand(group: THREE.Group) {
  const skin = mat('#f2c6a0', 0.6);
  // An open hand held upright; the palm faces -z, so turning the tool aims it at a sensor.
  const palm = new THREE.Mesh(new THREE.BoxGeometry(18, 17, 4), skin);
  palm.castShadow = true;
  group.add(palm);
  [-6.6, -2.2, 2.2, 6.6].forEach((x, i) => {
    const length = i === 0 || i === 3 ? 9 : 12,
      finger = new THREE.Mesh(new THREE.CapsuleGeometry(1.9, length), skin);
    finger.position.set(x, 8.5 - 2 + (length + 3.8) / 2, 0);
    finger.castShadow = true;
    group.add(finger);
  });
  const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(2.2, 8), skin);
  thumb.rotation.z = -0.9;
  thumb.position.set(11, -2, 0);
  thumb.castShadow = true;
  const wrist = cylinder(4.6, 8, skin, 0, -16.5, 0),
    cuff = cylinder(6.4, 6, mat('#1aa3a1', 0.5), 0, -22.5, 0);
  group.add(thumb, wrist, cuff);
  return () => false;
}
function water(group: THREE.Group) {
  const bottle = cylinder(6, 20, mat('#3d8fd6', 0.3), 0, 34, 0);
  const cap = cylinder(3.4, 6, mat('#f2efe6', 0.5), 0, 54, 0);
  const nozzle = box(3, 3, 7, mat('#f2efe6', 0.5), 0, 57, -4);
  const drops = Array.from({ length: 14 }, (_, i) => {
    const drop = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 6), additive('#7cc4ff', 0.85));
    flat(drop);
    drop.userData.seed = i;
    return drop;
  });
  group.add(bottle, cap, nozzle, ...drops);
  return (time: number) => {
    for (const drop of drops) {
      const seed = drop.userData.seed as number,
        t = (((time / 900 + seed / 14) % 1) + 1) % 1,
        angle = seed * 2.4;
      drop.position.set(
        Math.cos(angle) * (2 + t * 14),
        32 * (1 - t),
        Math.sin(angle) * (2 + t * 14) - 4,
      );
    }
    return true;
  };
}
function shaker(group: THREE.Group) {
  group.add(box(24, 3, 20, mat('#333d49'), 0, 21, 0));
  group.add(box(21, 1, 17, mat('#d28d37'), 0, 24, 0));
  for (const x of [-8, 8])
    for (const z of [-6, 6]) {
      const spring = new THREE.Mesh(new THREE.TorusGeometry(2, 0.5, 6, 16), metal());
      spring.rotation.x = Math.PI / 2;
      spring.position.set(x, 19, z);
      group.add(spring);
      group.add(cylinder(1, 6, metal(), x, 15, z));
    }
  return (time: number) => {
    group.position.x = Math.sin(time / 57) * 0.9;
    return true;
  };
}
function sound(group: THREE.Group) {
  group.add(box(16, 20, 11, mat('#343440'), 0, 23, 0));
  const cone = new THREE.Mesh(new THREE.ConeGeometry(5.5, 3, 24, 1, true), mat('#25282d'));
  cone.rotation.x = Math.PI / 2;
  cone.position.set(0, 33, -7);
  group.add(cone);
  group.add(box(13, 2, 10, mat('#9266c7'), 0, 43, 0));
  return (time: number) => {
    cone.scale.setScalar(1 + Math.sin(time / 12) * 0.03);
    return true;
  };
}
function gas(group: THREE.Group) {
  group.add(cylinder(6, 20, mat('#57966c'), 0, 24, 0));
  group.add(cylinder(2, 4, metal(), 0, 44, 0));
  group.add(box(9, 2, 2, mat('#d9b65f'), 0, 48, 0));
  group.add(box(4, 6, 7, mat('#dbe5df'), 0, 31, -5));
  return () => false;
}
function load(group: THREE.Group) {
  group.add(cylinder(8, 13, mat('#5d6777', 0.4, 0.7), 0, 22, 0));
  const grip = new THREE.Mesh(new THREE.TorusGeometry(3, 1, 8, 20), metal());
  grip.position.set(0, 37, 0);
  group.add(grip);
  return () => false;
}
function source(group: THREE.Group) {
  group.add(box(25, 12, 19, mat('#d9d9d1'), 0, 25, 0));
  group.add(box(14, 4, 0.6, mat('#1d3835'), -3, 31, -9.8));
  for (const [x, color] of [
    [-7, '#d93c35'],
    [0, '#292c30'],
  ] as const)
    group.add(cylinder(1.7, 2, mat(color), x, 37, 4));
  group.add(cylinder(2.8, 2, mat('#454a4d'), 8, 37, -4));
  return () => false;
}
function pressure(group: THREE.Group) {
  group.add(cylinder(5, 20, mat('#6eabc1'), 0, 23, 0));
  group.add(cylinder(1.4, 8, metal(), 0, 43, 0));
  group.add(box(16, 3, 4, mat('#303c47'), 0, 51, 0));
  return () => false;
}
function wheel(group: THREE.Group) {
  group.add(box(18, 3, 14, mat('#5d6777'), 0, 17, 0));
  group.add(box(3, 16, 4, metal(), 0, 20, 3));
  const disk = new THREE.Group();
  disk.position.set(0, 34, 0);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 2, 24), metal());
  hub.rotation.x = Math.PI / 2;
  disk.add(hub);
  const rim = new THREE.Mesh(new THREE.RingGeometry(10, 12, 64), mat('#343b42'));
  rim.material.side = THREE.DoubleSide;
  disk.add(rim);
  for (let i = 0; i < 20; i++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.7, 8, 1.5), mat('#343b42'));
    const a = (i * Math.PI) / 10;
    spoke.position.set(Math.sin(a) * 6.5, Math.cos(a) * 6.5, 0);
    spoke.rotation.z = -a;
    disk.add(spoke);
  }
  group.add(disk);
  // An illustrative slow rotation; pulse timing is generated by the real peripheral model.
  return (time: number, tool?: BenchTool) => {
    disk.rotation.z = (-time * Math.PI * 2 * (tool?.rpm ?? 1200)) / 60000;
    return (tool?.rpm ?? 1200) > 0;
  };
}
const builders: Record<
  ToolKind,
  (group: THREE.Group) => (time: number, tool?: BenchTool) => boolean
> = {
  flashlight,
  burner,
  magnet,
  hand,
  water,
  shaker,
  sound,
  gas,
  load,
  source,
  pressure,
  wheel,
  uv: (group) => {
    const update = flashlight(group);
    group.add(new THREE.PointLight('#ae74ff', 250, 90));
    return update;
  },
};

export function buildTool(id: string, kind: ToolKind): ToolModel {
  // `body` is lifted and tilted by the stage; the ring and arrow stay on the table.
  const group = new THREE.Group(),
    body = new THREE.Group(),
    animate = builders[kind](body);
  group.add(body);
  if (kind === 'hand') {
    // Shows on the table where the palm looks.
    const arrow = new THREE.Mesh(
      new THREE.ConeGeometry(3, 7, 3).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: '#1aa3a1', transparent: true, opacity: 0.8 }),
    );
    arrow.position.set(0, 0.3, -24);
    flat(arrow);
    group.add(arrow);
  }
  group.traverse((child) => {
    if (child instanceof THREE.Mesh) child.castShadow = child.castShadow || false;
  });
  const radius = toolInfo[kind].radius,
    reach = new THREE.Mesh(
      new THREE.RingGeometry(radius - 0.8, radius, 72).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        color: ringColor[kind],
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
      }),
    );
  reach.position.y = 0.12;
  flat(reach);
  group.add(reach);
  setPick(group, { type: 'tool', id });
  return {
    group,
    body,
    update: animate,
    dispose() {
      group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          // Shared catalogue materials (mat) stay cached; the tool's own ones go.
          const material = child.material as THREE.Material;
          if (!(material as THREE.MeshStandardMaterial).isMeshStandardMaterial) material.dispose();
        }
      });
    },
  };
}
