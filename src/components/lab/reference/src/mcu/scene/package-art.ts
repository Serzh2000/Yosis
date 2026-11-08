import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { box, cylinder, mat, metal, flat } from './materials';
import { canvasTexture } from './textures';

/** Machined outline and actual through holes, rather than painted black dots. */
export function pcbGeometry(
  width: number,
  depth: number,
  height: number,
  uno = false,
  ring = false,
  holes?: [number, number][],
  holeRadius = 1.35,
) {
  const shape = new THREE.Shape(),
    w = width / 2,
    d = depth / 2;
  if (ring) {
    shape.absarc(0, 4, 19, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absarc(0, 4, 12.5, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  } else {
    const points = uno
      ? [
          [-w, -d],
          [w - 4, -d],
          [w - 4, -d + 3],
          [w, -d + 7],
          [w, d - 4],
          [w - 4, d],
          [-w, d],
        ]
      : [
          [-w + 1, -d],
          [w - 1, -d],
          [w, -d + 1],
          [w, d - 1],
          [w - 1, d],
          [-w + 1, d],
          [-w, d - 1],
          [-w, -d + 1],
        ];
    points.forEach(([x, y], i) => (i ? shape.lineTo(x!, y!) : shape.moveTo(x!, y!)));
    shape.closePath();
    for (const [x, y] of holes?.map(([x, z]) => [x, -z]) ??
      [-w + 3.2, w - 3.2].flatMap((x) => [-d + 3.2, d - 3.2].map((y) => [x, y]))) {
      const hole = new THREE.Path();
      hole.absarc(x!, y!, holeRadius, 0, Math.PI * 2, true);
      shape.holes.push(hole);
    }
  }
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: false,
    curveSegments: 20,
  });
  geometry.rotateX(-Math.PI / 2);
  const uv = geometry.attributes.uv!,
    p = geometry.attributes.position!;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (p.getX(i) + w) / width, (d - p.getZ(i)) / depth);
  return geometry;
}

/** Encoder disk with twenty real optical windows, not white paint pretending to be slots. */
export function slottedDiskGeometry(radius = 11, slots = 20) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, radius, 0, Math.PI * 2, false);
  const hub = new THREE.Path();
  hub.absarc(0, 0, 1.3, 0, Math.PI * 2, true);
  shape.holes.push(hub);
  for (let i = 0; i < slots; i++) {
    const a = (i * Math.PI * 2) / slots,
      half = (Math.PI / slots) * 0.46;
    const slot = new THREE.Path();
    slot.moveTo(Math.cos(a - half) * radius * 0.69, Math.sin(a - half) * radius * 0.69);
    slot.absarc(0, 0, radius * 0.92, a - half, a + half, false);
    slot.lineTo(Math.cos(a + half) * radius * 0.69, Math.sin(a + half) * radius * 0.69);
    slot.absarc(0, 0, radius * 0.69, a + half, a - half, true);
    slot.closePath();
    shape.holes.push(slot);
  }
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.8,
    bevelEnabled: false,
    curveSegments: 12,
  });
  geometry.translate(0, 0, -0.4);
  return geometry;
}

/** A USB shell open towards the cable, with a recessed tongue and visible metal walls. */
export function usbSocket(
  group: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  type: 'B' | 'mini' | 'micro' | 'C',
) {
  const w = type === 'B' ? 12 : type === 'mini' ? 8 : type === 'C' ? 8.94 : 7.5,
    h = type === 'B' ? 10.5 : type === 'mini' ? 3.8 : type === 'C' ? 3.26 : 2.8,
    length = type === 'B' ? 15 : 7.5,
    shell = mat('#c3c9ce', 0.26, 0.8);
  group.add(box(length, 0.45, w, shell, x, y, z), box(length, 0.45, w, shell, x, y + h - 0.45, z));
  for (const side of [-1, 1])
    group.add(box(length, h, 0.45, shell, x, y, z + side * (w / 2 - 0.2)));
  group.add(box(0.5, h - 0.5, w - 0.6, mat('#15191d', 0.8), x + length / 2 - 0.4, y + 0.25, z));
  group.add(
    box(length - 2, type === 'B' ? 3.2 : 0.7, w - 2, mat('#292e31', 0.7), x + 0.8, y + h * 0.4, z),
  );
  for (let i = 0; i < (type === 'B' ? 4 : 5); i++)
    group.add(
      box(
        length - 3,
        0.1,
        0.3,
        mat('#c7a257', 0.3, 0.7),
        x + 1,
        y + h * 0.4 + (type === 'B' ? 3.3 : 0.8),
        z + (i - (type === 'B' ? 1.5 : 2)) * 0.7,
      ),
    );
}

export function leadFrame(
  group: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  w: number,
  d: number,
  count = 8,
) {
  const geometries: THREE.BufferGeometry[] = [];
  for (let i = 0; i < count; i++)
    for (const side of [-1, 1]) {
      const a = new THREE.BoxGeometry(0.32, 0.3, 1.2);
      a.translate(x + ((i - (count - 1) / 2) * w) / count, y + 0.3, z + side * (d / 2 + 0.4));
      geometries.push(a);
      const b = new THREE.BoxGeometry(1.2, 0.3, 0.32);
      b.translate(x + side * (w / 2 + 0.4), y + 0.3, z + ((i - (count - 1) / 2) * d) / count);
      if (w / d < 1.7) geometries.push(b);
      else b.dispose();
    }
  // All package leads share a material and a draw call.
  if (geometries.length) group.add(flat(new THREE.Mesh(mergeGeometries(geometries), metal())));
  for (const geometry of geometries) geometry.dispose();
}

export function surfacePattern(kind: 'ldr' | 'mesh' | 'water', width: number, depth: number) {
  const { context: g, canvas, texture } = canvasTexture(256, 256);
  g.fillStyle = kind === 'ldr' ? '#d8a877' : kind === 'water' ? '#23734b' : '#7d8589';
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = kind === 'ldr' ? '#793c31' : '#cfb97c';
  g.lineWidth = kind === 'ldr' ? 9 : 5;
  if (kind === 'mesh') {
    g.fillStyle = '#222c30';
    for (let x = 8; x < 256; x += 18)
      for (let y = 8; y < 256; y += 18) {
        g.beginPath();
        g.arc(x, y, 4, 0, Math.PI * 2);
        g.fill();
      }
  } else {
    for (let i = 0; i < 9; i++) {
      const x = 30 + i * 24;
      g.beginPath();
      g.moveTo(x, 24);
      g.lineTo(x, 230);
      if (kind === 'ldr') {
        g.lineTo(x + 12, 230);
        g.lineTo(x + 12, 24);
      }
      g.stroke();
    }
  }
  void canvas;
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.55,
    metalness: kind === 'mesh' ? 0.5 : 0.1,
  });
  material.userData.own = true;
  const mesh = new THREE.Mesh(
    kind === 'water'
      ? new THREE.PlaneGeometry(width, depth)
      : new THREE.CircleGeometry(Math.min(width, depth) / 2, 40),
    material,
  );
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

export function mountingRims(
  group: THREE.Object3D,
  width: number,
  depth: number,
  y: number,
  holes?: [number, number][],
  holeRadius = 1.35,
) {
  for (const [x, z] of holes ??
    [-width / 2 + 3.2, width / 2 - 3.2].flatMap((x) =>
      [-depth / 2 + 3.2, depth / 2 - 3.2].map((z) => [x, z] as [number, number]),
    )) {
    const rim = new THREE.Mesh(
      new THREE.RingGeometry(holeRadius, holeRadius + 0.55, 24),
      mat('#c1a66b', 0.4, 0.5),
    );
    rim.rotation.x = -Math.PI / 2;
    rim.position.set(x, y, z);
    group.add(rim);
  }
}

export function screw(group: THREE.Object3D, x: number, y: number, z: number) {
  group.add(
    cylinder(1, 0.35, metal(), x, y, z, 12),
    box(1.3, 0.05, 0.2, mat('#303a3c'), x, y + 0.36, z),
  );
}
