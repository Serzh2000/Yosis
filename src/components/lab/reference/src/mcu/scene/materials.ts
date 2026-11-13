import * as THREE from 'three';

/** Picking metadata stored in userData.pick of the object that owns a mesh. */
export type Pick =
  | { type: 'board' }
  | { type: 'part'; id: string }
  | { type: 'control'; id: string; knob?: number; bit?: number; key?: number }
  /** One of the two keys of the FPGA board itself. */
  | { type: 'board-key'; id: 'S1' | 'S2' }
  | { type: 'wire'; id: string }
  | { type: 'wire-end'; id: string; end: 'from' | 'to' }
  | { type: 'tool'; id: string };

/** Layer 0 is outlined, layer 1 is drawn without outline (ground, glows, rings). */
export const OUTLINED = 0;
export const FLAT = 1;

const cache = new Map<string, THREE.MeshStandardMaterial>();
export function mat(color: string, roughness = 0.55, metalness = 0, extra?: string) {
  const key = `${color}|${roughness}|${metalness}|${extra ?? ''}`;
  let found = cache.get(key);
  if (!found) {
    found = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    cache.set(key, found);
  }
  return found;
}
export const palette = {
  pcb: '#4a5d99',
  pcbEdge: '#e0c39c',
  header: '#33374a',
  hole: '#0d0f17',
  plastic: '#2c3041',
  chip: '#2a2d38',
  metal: '#efe4d2',
  pin: '#e8e2d6',
  cream: '#f1e4c8',
  housing: '#24272f',
  breadboard: '#ebe3d2',
  teal: '#1aa3a1',
};
export const pcbColors: Record<string, string> = {
  indicators: '#3f4f8c',
  inputs: '#3e6f7c',
  sensors: '#3d5f9e',
  actuators: '#5a4f8f',
  displays: '#304a7a',
  bus: '#2f6b6a',
  passive: '#6c5a3f',
};
export const metal = () => mat(palette.pin, 0.32, 0.55);

/** Box with its bottom face at y, like most PCB components. */
export function box(
  width: number,
  height: number,
  depth: number,
  material: THREE.Material | THREE.Material[],
  x = 0,
  y = 0,
  z = 0,
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y + height / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
export function cylinder(
  radius: number,
  height: number,
  material: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
  segments = 24,
) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, height, segments),
    material,
  );
  mesh.position.set(x, y + height / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
/** Rounded rectangle extruded upwards from y = 0, used for PCBs. */
export function roundedSlab(width: number, depth: number, height: number, radius: number) {
  const shape = new THREE.Shape(),
    w = width / 2,
    d = depth / 2,
    r = Math.min(radius, w, d);
  shape.moveTo(-w + r, -d);
  shape.lineTo(w - r, -d);
  shape.quadraticCurveTo(w, -d, w, -d + r);
  shape.lineTo(w, d - r);
  shape.quadraticCurveTo(w, d, w - r, d);
  shape.lineTo(-w + r, d);
  shape.quadraticCurveTo(-w, d, -w, d - r);
  shape.lineTo(-w, -d + r);
  shape.quadraticCurveTo(-w, -d, -w + r, -d);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
  // Extrusion runs along +z; lay it flat so the top face points up. Texture v runs from the far
  // edge (canvas top) to the near edge, matching how canvases are painted.
  geometry.rotateX(-Math.PI / 2);
  const uv = geometry.attributes.uv as THREE.BufferAttribute,
    position = geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++)
    uv.setXY(i, (position.getX(i) + w) / width, (d - position.getZ(i)) / depth);
  return geometry;
}
export function setPick(object: THREE.Object3D, pick: Pick) {
  object.userData.pick = pick;
  return object;
}
export function flat(object: THREE.Object3D) {
  object.traverse((child) => child.layers.set(FLAT));
  return object;
}
