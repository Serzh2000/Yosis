import * as THREE from 'three';
import { HOUSING, wireCurve, wireSeat, type Vec3, type PinSpot } from './layout';
import { box, mat, setPick } from './materials';

const v = (p: Vec3) => new THREE.Vector3(p.x, p.y, p.z);
export const WIRE_RADIUS = 0.72;

export interface WireModel {
  group: THREE.Group;
  setSelected: (selected: boolean) => void;
  /** See-through cable, so the part it runs to can be seen behind it. */
  setGhost: (ghost: boolean) => void;
  dispose: () => void;
}
function housing(at: Vec3, color: string) {
  const group = new THREE.Group();
  group.position.set(at.x, at.y, at.z);
  group.add(box(2.45, HOUSING - 2.4, 2.45, mat('#24272f', 0.5)));
  group.add(box(2.6, 2.4, 2.6, mat(color, 0.42), 0, HOUSING - 2.4));
  return group;
}
/** Tube along the jumper arch with a Dupont housing at each end. */
export function buildWire(
  id: string,
  aPin: Vec3 & Partial<PinSpot>,
  bPin: Vec3 & Partial<PinSpot>,
  color: string,
  lane: number,
): WireModel {
  const a = wireSeat(aPin),
    b = wireSeat(bPin);
  const group = new THREE.Group(),
    curve = wireCurve(a, b, lane),
    material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.42,
      emissive: new THREE.Color('#1aa3a1'),
      emissiveIntensity: 0,
    });
  const tube = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CubicBezierCurve3(v(curve.start), v(curve.c1), v(curve.c2), v(curve.end)),
      96,
      WIRE_RADIUS,
      8,
    ),
    material,
  );
  tube.castShadow = true;
  setPick(tube, { type: 'wire', id });
  const from = setPick(housing(a, color), { type: 'wire-end', id, end: 'from' }),
    to = setPick(housing(b, color), { type: 'wire-end', id, end: 'to' });
  group.add(tube, from, to);
  return {
    group,
    setSelected: (selected) => (material.emissiveIntensity = selected ? 0.55 : 0),
    setGhost: (ghost) => {
      if (material.transparent === ghost) return;
      material.transparent = ghost;
      material.opacity = ghost ? 0.28 : 1;
      material.depthWrite = !ghost;
      material.needsUpdate = true;
    },
    dispose: () => {
      tube.geometry.dispose();
      material.dispose();
      for (const end of [from, to])
        end.traverse((child) => child instanceof THREE.Mesh && child.geometry.dispose());
    },
  };
}
/**
 * Light-weight preview while a jumper is being pulled to its second pin. Both ends keep their
 * Dupont housing, so the tip never disappears while the wire is dragged. It is built once and
 * `update` only moves the housings and re-bends the tube, which keeps dragging smooth.
 */
export function previewWire(a: Vec3, b: Vec3, color = '#1aa3a1') {
  const group = new THREE.Group(),
    material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.4,
      transparent: true,
      opacity: 0.85,
    }),
    tube = new THREE.Mesh(new THREE.BufferGeometry(), material),
    first = housing(a, color),
    last = housing(b, color);
  group.add(tube, first, last);
  group.traverse((child) => {
    child.castShadow = false;
    child.receiveShadow = false;
  });
  const update = (from: Vec3, to: Vec3) => {
    const start = wireSeat(from),
      end = { ...to, y: Math.max(0, to.y - HOUSING) },
      curve = wireCurve(start, end);
    tube.geometry.dispose();
    tube.geometry = new THREE.TubeGeometry(
      new THREE.CubicBezierCurve3(v(curve.start), v(curve.c1), v(curve.c2), v(curve.end)),
      32,
      WIRE_RADIUS * 0.9,
      5,
    );
    first.position.set(start.x, start.y, start.z);
    last.position.set(end.x, end.y, end.z);
  };
  update(a, b);
  return {
    group,
    update,
    dispose: () => {
      group.traverse((child) => child instanceof THREE.Mesh && child.geometry.dispose());
      material.dispose();
    },
  };
}
