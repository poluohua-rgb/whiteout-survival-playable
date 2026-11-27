import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const _c = new THREE.Color();
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();

export function paint(g, color, capColor) {
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  const base = new THREE.Color(color);
  const cap = capColor !== undefined ? new THREE.Color(capColor) : null;
  const nor = g.attributes.normal;
  for (let i = 0; i < n; i++) {
    const c = cap && Math.abs(nor.getY(i)) > 0.9 ? cap : base;
    arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

export function xf(g, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  _e.set(rx, ry, rz);
  _q.setFromEuler(_e);
  _m.compose(_v.set(x, y, z), _q, _s.set(sx, sy, sz));
  g.applyMatrix4(_m);
  return g;
}

export const box = (w, h, d, color, x, y, z, rx, ry, rz) =>
  xf(paint(new THREE.BoxGeometry(w, h, d), color), x, y, z, rx, ry, rz);
export const cyl = (rt, rb, h, seg, color, x, y, z, rx, ry, rz, cap) =>
  xf(paint(new THREE.CylinderGeometry(rt, rb, h, seg), color, cap), x, y, z, rx, ry, rz);
export const cone = (r, h, seg, color, x, y, z, rx, ry, rz) =>
  xf(paint(new THREE.ConeGeometry(r, h, seg), color), x, y, z, rx, ry, rz);
export const sph = (r, color, x, y, z, sx = 1, sy = 1, sz = 1, ws = 12, hs = 9) =>
  xf(paint(new THREE.SphereGeometry(r, ws, hs), color), x, y, z, 0, 0, 0, sx, sy, sz);
export const torus = (R, r, color, x, y, z, rx, ry, rz, rs = 6, ts = 14) =>
  xf(paint(new THREE.TorusGeometry(R, r, rs, ts), color), x, y, z, rx, ry, rz);

export function merge(list) {
  list = list.map((l) => (l.index ? l.toNonIndexed() : l));
  const g = mergeGeometries(list, false);
  list.forEach((l) => l.dispose());
  return g;
}

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const smooth = (t) => t * t * (3 - 2 * t);
export const easeOutBack = (t) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
export function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function angLerp(a, b, t) {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
