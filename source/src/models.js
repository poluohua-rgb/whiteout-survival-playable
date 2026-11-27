import * as THREE from 'three';
import { box, cyl, cone, sph, torus, merge, paint, xf } from './util.js';

export const MAT = new THREE.MeshLambertMaterial({ vertexColors: true });
export const GLOW = new THREE.MeshBasicMaterial({ vertexColors: true });

export function mesh(geom, mat = MAT, cast = true, receive = true) {
  const m = new THREE.Mesh(geom, mat);
  m.castShadow = cast; m.receiveShadow = receive;
  return m;
}

const WOOD = '#d3a17a', WOOD_D = '#b67f5c', WOOD_DD = '#8f5d45';
const SNOW = '#f1f4fa';

export function stakeGeometry() {
  return merge([
    cyl(0.13, 0.14, 1.06, 6, '#b5603c', 0, 0.53, 0),
    cone(0.13, 0.46, 6, '#eef2f8', 0, 1.29, 0),
    cyl(0.134, 0.134, 0.07, 6, '#e7dcd8', 0, 1.04, 0),
  ]);
}
export function postGeometry() {
  return merge([
    cyl(0.2, 0.22, 1.3, 7, '#b0583a', 0, 0.65, 0),
    cyl(0.215, 0.215, 0.09, 7, '#ead9d2', 0, 0.55, 0), cyl(0.21, 0.21, 0.09, 7, '#ead9d2', 0, 0.95, 0),
    cyl(0.205, 0.205, 0.1, 7, '#f0ece9', 0, 1.26, 0),
    cone(0.2, 0.6, 7, '#f1f4fa', 0, 1.6, 0),
  ]);
}

export function treeGeometry() {
  const parts = [cyl(0.13, 0.19, 1.3, 6, '#6c4a40', 0, 0.65, 0)];
  for (let i = 0; i < 5; i++) {
    const r = 1.15 - i * 0.2, y = 1.25 + i * 0.62;
    parts.push(cone(r, 1.05, 7, '#6f93a6', 0, y, 0));
    parts.push(cone(r * 0.86, 0.86, 7, '#e3ebf6', 0, y + 0.17, 0));
  }
  parts.push(cone(0.2, 0.6, 6, '#f1f5fb', 0, 4.35, 0));
  return merge(parts);
}

export function railFenceGeometry() {
  return merge([
    box(0.14, 0.9, 0.14, '#7d6a66', -1.4, 0.45, 0), box(0.14, 0.9, 0.14, '#7d6a66', 1.4, 0.45, 0),
    box(3.0, 0.1, 0.08, '#8d7873', 0, 0.7, 0, 0, 0, 0.04), box(3.0, 0.1, 0.08, '#8d7873', 0, 0.38, 0, 0, 0, -0.03),
    box(0.2, 0.06, 0.2, SNOW, -1.4, 0.92, 0), box(0.2, 0.06, 0.2, SNOW, 1.4, 0.92, 0),
  ]);
}

// Counter table: long axis along local X, customer side is +Z, register sits near local x = regX.
function wedge(D, x, col) {
  // curved side board: tall at the back (-Z), sloping down to the front
  const parts = [];
  const n = 5;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), h = 0.5 * Math.cos(t * 1.25) + 0.06, w = D / n;
    parts.push(box(0.1, h, w + 0.01, col, x, 0.86 + h / 2, -D / 2 + w / 2 + i * w));
  }
  return parts;
}
export function tableGeometry(L = 3.8, D = 0.95, regX = -0.05) {
  const LEG = '#c8784d';
  const parts = [];
  const pw = D / 3;
  for (let i = 0; i < 3; i++) parts.push(box(L, 0.11, pw - 0.025, i === 1 ? '#d6a57d' : WOOD, 0, 0.81, -D / 2 + pw / 2 + i * pw));
  parts.push(box(L - 0.1, 0.08, D - 0.1, WOOD_D, 0, 0.73, 0));
  for (const sx of [-1, 0, 1]) for (const sz of [-1, 1]) {
    parts.push(box(0.2, 0.7, 0.2, LEG, sx * (L / 2 - 0.2), 0.36, sz * (D / 2 - 0.16)));
    parts.push(box(0.23, 0.07, 0.23, '#5b6c96', sx * (L / 2 - 0.2), 0.035, sz * (D / 2 - 0.16)));
  }
  parts.push(...wedge(D, L / 2 - 0.05, LEG), ...wedge(D, regX + 0.42, LEG));
  parts.push(box(0.1, 0.5, 0.1, LEG, L / 2 - 0.05, 1.1, -D / 2 + 0.05));
  parts.push(box(L / 2 - regX - 0.42, 0.42, 0.08, WOOD, (L / 2 + regX + 0.42) / 2, 1.07, -D / 2 + 0.04));
  // register
  parts.push(box(0.62, 0.07, 0.56, '#3c5c93', regX - 0.05, 0.9, -D / 2 + 0.3));
  parts.push(box(0.5, 0.44, 0.07, '#4a628f', regX - 0.05, 1.12, -D / 2 + 0.36, -0.28, 0, 0));
  parts.push(box(0.42, 0.36, 0.02, '#5f79a8', regX - 0.05, 1.125, -D / 2 + 0.315, -0.28, 0, 0));
  return merge(parts);
}

export function palletGeometry(w = 2.6, d = 1.05) {
  return merge([box(w, 0.06, d, '#a97a62', 0, 0.03, 0), box(w - 0.1, 0.012, d - 0.1, '#b58670', 0, 0.066, 0)]);
}

export function logGeometry() {
  // lies along local Z
  return xf(paint(new THREE.CylinderGeometry(0.125, 0.125, 0.92, 8), '#d08a58', '#f0cf9f'), 0, 0, 0, Math.PI / 2, 0, 0);
}
export function coalGeometry() {
  const g = merge([
    box(0.72, 0.22, 0.5, '#211f26', 0, 0, 0),
    box(0.62, 0.03, 0.4, '#3a3842', 0, 0.12, 0),
  ]);
  return g;
}
export function billGeometry() {
  return merge([
    box(0.78, 0.066, 0.4, '#4dbb45', 0, 0, 0),
    box(0.78, 0.012, 0.4, '#b6f07c', 0, 0.039, 0),
    cyl(0.11, 0.11, 0.006, 10, '#3fae3c', 0, 0.047, 0),
  ]);
}

// Lean-to shed: front posts at local z = +D/2, roof high at the front and sloping down to the fence behind.
export function shedGeometry(L = 5.5, D = 1.35) {
  const parts = [];
  const HF = 1.6, HB = 1.0, POST = '#a26f69';
  for (const x of [-L / 2 + 0.2, 0, L / 2 - 0.2]) parts.push(box(0.3, HF, 0.3, POST, x, HF / 2, D / 2));
  const zf = D / 2 + 0.38, zb = -D / 2, tilt = Math.atan2(HF - HB, zf - zb), rd = Math.hypot(HF - HB, zf - zb);
  const roof = [], r = mulberryLocal(5);
  for (const s of [-1, 1]) {
    const w = L / 2 + 0.12, cx = s * (w / 2 - 0.02), y = s > 0 ? 0.04 : 0;
    roof.push(box(w, 0.09, rd, '#c2935f', cx, y, 0));
    for (let i = 0; i < 4; i++) roof.push(box(w / 4 - 0.03, 0.03, rd - 0.04, i % 2 ? '#d2a570' : '#cb9c66', cx - w / 2 + (i + 0.5) * (w / 4), y + 0.05, 0));
    for (let i = 0; i < 10; i++) {
      roof.push(box(0.22 + r() * 0.6, 0.02, 0.12 + r() * 0.3, '#f3f1ee', cx + (r() - 0.5) * (w - 0.7), y + 0.072, (r() - 0.5) * (rd - 0.4), 0, r() * 0.6, 0));
    }
  }
  for (const g of roof) { g.rotateX(-tilt); g.translate(0, (HF + HB) / 2 + 0.06, (zf + zb) / 2); parts.push(g); }
  // bench + raw trunk under the front edge
  parts.push(box(L - 0.2, 0.12, 0.5, '#c9976e', -0.3, 0.68, D / 2 + 0.05));
  for (const x of [-L / 2 + 0.7, L / 2 - 0.9, 0.4]) parts.push(box(0.16, 0.64, 0.4, WOOD_DD, x, 0.32, D / 2 + 0.05));
  parts.push(cyl(0.3, 0.3, L - 0.8, 8, '#8f6248', 0, 1.03, D / 2 - 0.2, 0, 0, Math.PI / 2, '#d9a779'));
  parts.push(box(L, 0.95, 0.5, '#5a3a35', 0, 0.475, -D / 2 + 0.45));
  return merge(parts);
}
function mulberryLocal(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function coalBenchGeometry() {
  const parts = [
    box(3.0, 0.12, 1.0, WOOD, 0, 0.72, 0),
    box(3.0, 0.5, 0.1, WOOD_D, 0, 1.0, -0.48), box(0.1, 0.5, 1.0, WOOD_D, -1.46, 1.0, 0, 0, 0, 0),
    box(0.16, 0.7, 0.16, WOOD_DD, -1.3, 0.35, 0.36), box(0.16, 0.7, 0.16, WOOD_DD, 1.3, 0.35, 0.36),
    box(0.16, 0.7, 0.16, WOOD_DD, -1.3, 0.35, -0.36), box(0.16, 0.7, 0.16, WOOD_DD, 1.3, 0.35, -0.36),
    box(0.5, 0.08, 0.4, '#555a66', 0.9, 0.82, 0.1), box(0.3, 0.2, 0.3, '#3f434d', 0.9, 0.9, 0.1),
  ];
  const lumps = [[-0.9, 0.95, -0.05, 0.34], [-0.5, 0.92, 0.1, 0.3], [-0.7, 1.12, 0.02, 0.26], [-1.05, 0.9, 0.2, 0.22], [-0.25, 0.9, -0.12, 0.24], [-0.55, 1.05, -0.2, 0.2]];
  for (const [x, y, z, r] of lumps) {
    parts.push(xf(paint(new THREE.DodecahedronGeometry(r, 0), '#25232a'), x, y, z, x * 3, z * 5, 0));
  }
  return merge(parts.map((p) => (p.index ? p.toNonIndexed() : p)));
}

export function furnaceGeometry() {
  const parts = [];
  const stones = ['#8f837d', '#7c726e', '#a0948c', '#857a75'];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    if (Math.abs(a - Math.PI * 0.75) < 0.5) continue; // fire mouth faces the camera side
    parts.push(box(0.75, 0.9, 0.6, stones[i % 4], Math.cos(a) * 1.25, 0.45, Math.sin(a) * 1.25, 0, -a + Math.PI / 2, 0));
  }
  parts.push(cyl(1.2, 1.3, 0.3, 14, '#8b7f79', 0, 1.02, 0));
  parts.push(cyl(0.86, 1.18, 2.2, 16, '#a39188', 0, 2.2, 0));
  parts.push(cyl(1.22, 1.22, 0.16, 16, '#8e7466', 0, 1.6, 0));
  parts.push(cyl(1.0, 1.0, 0.14, 16, '#8e7466', 0, 2.75, 0));
  parts.push(torus(0.84, 0.12, '#6f625e', 0, 3.3, 0, Math.PI / 2, 0, 0, 6, 18));
  // crossed sticks in the mouth
  const ma = Math.PI * 0.75;
  for (let i = -2; i <= 2; i++) {
    parts.push(box(0.09, 0.9, 0.09, '#a8643c', Math.cos(ma) * 1.2 + i * 0.12 * Math.sin(ma), 0.45, Math.sin(ma) * 1.2 - i * 0.12 * Math.cos(ma), 0, 0, i * 0.35));
  }
  return merge(parts.map((p) => (p.index ? p.toNonIndexed() : p)));
}
export function furnaceGlowGeometry() {
  const ma = Math.PI * 0.75;
  return merge([
    cyl(0.8, 0.8, 0.02, 18, '#ff9a48', 0, 3.27, 0),
    cyl(0.5, 0.5, 0.03, 14, '#ffd98a', 0, 3.28, 0),
    box(0.95, 0.75, 0.3, '#ff9a48', Math.cos(ma) * 0.98, 0.42, Math.sin(ma) * 0.98, 0, -ma + Math.PI / 2, 0),
  ]);
}

export function crateGeometry() {
  const parts = [];
  const one = (s, x, y, z, ry) => {
    const list = [box(s, s, s, '#b8977c', 0, 0, 0)];
    for (const a of [-1, 1]) for (const b of [-1, 1]) {
      list.push(box(0.09, s + 0.04, 0.09, '#94745f', a * s / 2, 0, b * s / 2));
      list.push(box(s + 0.04, 0.09, 0.09, '#94745f', 0, a * s / 2, b * s / 2));
      list.push(box(0.09, 0.09, s + 0.04, '#94745f', a * s / 2, b * s / 2, 0));
    }
    list.forEach((g) => parts.push(xf(g, x, y, z, 0, ry, 0)));
  };
  one(1.15, 0, 0.58, 0, 0.2);
  one(0.95, 1.0, 0.48, 0.5, -0.3);
  one(0.85, 0.3, 1.58, 0.1, 0.5);
  return merge(parts);
}

export function carGeometry(color) {
  const c = new THREE.Color(color);
  const dark = '#' + c.clone().multiplyScalar(0.72).getHexString();
  const glass = '#27303f';
  const parts = [
    box(4.2, 0.62, 1.78, color, 0, 0.62, 0),
    box(4.3, 0.16, 1.84, dark, 0, 0.36, 0),
    box(2.15, 0.52, 1.56, color, -0.25, 1.16, 0),
    box(2.2, 0.06, 1.6, color, -0.25, 1.44, 0),
    // glass
    box(0.05, 0.4, 1.4, glass, 0.84, 1.14, 0, 0, 0, -0.35), box(0.05, 0.4, 1.4, glass, -1.34, 1.14, 0, 0, 0, 0.35),
    box(0.82, 0.34, 1.6, glass, 0.3, 1.16, 0), box(0.82, 0.34, 1.6, glass, -0.72, 1.16, 0),
    // bumpers, lights
    box(0.14, 0.18, 1.86, '#aab0ba', 2.14, 0.44, 0), box(0.14, 0.18, 1.86, '#aab0ba', -2.14, 0.44, 0),
    box(0.06, 0.16, 0.36, '#fff0c0', 2.11, 0.72, 0.62), box(0.06, 0.16, 0.36, '#fff0c0', 2.11, 0.72, -0.62),
    box(0.06, 0.2, 0.9, '#30343c', 2.11, 0.72, 0),
    box(0.06, 0.14, 0.4, '#e04a3a', -2.11, 0.72, 0.62), box(0.06, 0.14, 0.4, '#e04a3a', -2.11, 0.72, -0.62),
  ];
  for (const sx of [-1.35, 1.35]) for (const sz of [-0.86, 0.86]) {
    parts.push(cyl(0.36, 0.36, 0.26, 12, '#23232a', sx, 0.36, sz, Math.PI / 2, 0, 0, '#8d939c'));
  }
  return merge(parts.map((p) => (p.index ? p.toNonIndexed() : p)));
}

const SKIN = '#f0c3a2';
/**
 * Stylised parka character, about 1.7 units tall, facing local +Z.
 * Returns a group with animatable limbs in userData.
 */
export function makeCharacter(o = {}) {
  const coat = o.coat || '#2f88b9', trim = o.trim || '#f4f1ec', boots = o.boots || '#3b2c2a';
  const g = new THREE.Group();
  const body = [];
  const long = o.long ? 0.14 : 0;
  body.push(cyl(0.25, 0.4 + long * 0.4, 0.66 + long, 12, coat, 0, 0.67 - long / 2, 0));
  body.push(cyl(0.43 + long * 0.4, 0.43 + long * 0.4, 0.11, 12, trim, 0, 0.36 - long, 0));
  body.push(cyl(0.2, 0.25, 0.1, 10, trim, 0, 1.02, 0));
  if (o.belt) body.push(cyl(0.34, 0.345, 0.07, 12, o.belt, 0, 0.68, 0));
  // head
  body.push(sph(0.225, o.skin || SKIN, 0, 1.24, 0.07));
  if (o.hood !== false) {
    body.push(sph(0.29, coat, 0, 1.27, -0.04, 1, 1.02, 1));
    body.push(torus(0.215, 0.075, trim, 0, 1.25, 0.15, 0, 0, 0, 6, 14));
    if (o.pom) body.push(sph(0.09, trim, 0, 1.58, -0.06));
  } else {
    body.push(sph(0.25, o.hair || '#6a4634', 0, 1.33, -0.03, 1, 0.85, 1));
    body.push(cyl(0.3, 0.3, 0.12, 10, trim, 0, 1.03, 0));
  }
  body.push(sph(0.028, '#2a2020', -0.085, 1.27, 0.285)); body.push(sph(0.028, '#2a2020', 0.085, 1.27, 0.285));
  if (o.beard) body.push(sph(0.15, o.beard, 0, 1.15, 0.17, 1, 0.8, 0.7));
  if (o.pack) body.push(box(0.36, 0.4, 0.18, o.pack, 0, 0.82, -0.3));
  const bodyMesh = mesh(merge(body.map((p) => (p.index ? p.toNonIndexed() : p))));
  g.add(bodyMesh);

  const legGeom = merge([box(0.17, 0.3, 0.2, boots, 0, -0.17, 0), box(0.18, 0.1, 0.27, boots, 0, -0.29, 0.04), box(0.19, 0.06, 0.22, trim, 0, -0.04, 0)]);
  const armGeom = merge([
    cyl(0.095, 0.105, 0.4, 8, coat, 0, -0.2, 0).toNonIndexed(), cyl(0.12, 0.12, 0.08, 8, trim, 0, -0.41, 0).toNonIndexed(),
    sph(0.105, o.mitt || '#5a3a30', 0, -0.5, 0, 1, 1, 1, 8, 6).toNonIndexed(),
  ]);
  const legs = [], arms = [];
  for (const s of [-1, 1]) {
    const leg = mesh(legGeom); leg.position.set(s * 0.13, 0.34, 0); g.add(leg); legs.push(leg);
    const arm = mesh(armGeom); arm.position.set(s * 0.33, 0.98, 0); arm.rotation.z = s * 0.22; g.add(arm); arms.push(arm);
  }
  g.scale.setScalar(o.scale || 0.88);
  g.userData = { body: bodyMesh, legs, arms, phase: Math.random() * 6, baseScale: o.scale || 0.88 };
  return g;
}

export function animateCharacter(ch, mode, dt, speed = 1) {
  const u = ch.userData;
  u.phase += dt * (mode === 'walk' ? 11 * speed : mode === 'work' ? 7 : 2);
  const p = u.phase;
  if (mode === 'walk') {
    const s = Math.sin(p);
    u.legs[0].rotation.x = s * 0.8; u.legs[1].rotation.x = -s * 0.8;
    u.arms[0].rotation.x = -s * 0.7; u.arms[1].rotation.x = s * 0.7;
    u.body.position.y = Math.abs(Math.cos(p)) * 0.05;
    u.body.rotation.x = 0.1;
  } else if (mode === 'work') {
    const s = Math.sin(p);
    u.legs[0].rotation.x = 0; u.legs[1].rotation.x = 0;
    u.arms[0].rotation.x = -1.5 + s * 0.55; u.arms[1].rotation.x = -1.5 - s * 0.55;
    u.body.rotation.x = 0.16 + Math.abs(s) * 0.06; u.body.position.y = 0;
  } else if (mode === 'cheer') {
    u.arms[0].rotation.x = -2.9 + Math.sin(p * 3) * 0.15; u.arms[1].rotation.x = -2.9 - Math.sin(p * 3) * 0.15;
    u.legs[0].rotation.x = u.legs[1].rotation.x = 0;
    u.body.position.y = Math.abs(Math.sin(p * 3)) * 0.06; u.body.rotation.x = 0;
  } else {
    const k = Math.min(1, dt * 10);
    for (const l of u.legs) l.rotation.x *= 1 - k;
    for (const a of u.arms) a.rotation.x += ((mode === 'hold' ? -0.9 : 0) - a.rotation.x) * k;
    u.body.position.y = Math.sin(p) * 0.012; u.body.rotation.x *= 1 - k;
  }
}
