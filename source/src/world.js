import * as THREE from 'three';
import { L, CAM } from './layout.js';
import { mulberry } from './util.js';
import * as M from './models.js';
import * as T from './textures.js';

const dummy = new THREE.Object3D();
const railMat = new THREE.MeshLambertMaterial({ color: '#a8603f' });

function fenceRun(scene, segs, seed) {
  const r = mulberry(seed);
  const items = [], posts = [];
  for (const [x0, z0, x1, z1] of segs) {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(2, Math.round(len / 0.275));
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
      if (i % 7 === 0 || i === n) posts.push([x, z, 0.96 + r() * 0.1, r() * 6, 0]);
      else items.push([x + (r() - 0.5) * 0.04, z + (r() - 0.5) * 0.04, 0.9 + r() * 0.2, r() * 6, (r() - 0.5) * 0.05]);
    }
  }
  const group = new THREE.Group();
  for (const [geo, list] of [[M.stakeGeometry(), items], [M.postGeometry(), posts]]) {
    const im = new THREE.InstancedMesh(geo, M.MAT, list.length);
    list.forEach(([x, z, s, ry, tilt], i) => {
      dummy.position.set(x, 0, z); dummy.rotation.set(tilt, ry, tilt); dummy.scale.set(1, s, 1); dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
    });
    im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false;
    group.add(im);
  }
  const cx = (L.yard.x0 + L.yard.x1) / 2, cz = (L.yard.z0 + L.yard.z1) / 2;
  for (const [x0, z0, x1, z1] of segs) {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const rail = M.mesh(new THREE.BoxGeometry(len, 0.1, 0.07), railMat, false, false);
    rail.position.set((x0 + x1) / 2, 0.62, (z0 + z1) / 2);
    rail.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
    const nx = -(z1 - z0) / len, nz = (x1 - x0) / len;
    const sgn = Math.sign((cx - rail.position.x) * nx + (cz - rail.position.z) * nz) || 1;
    rail.position.x += nx * 0.16 * sgn; rail.position.z += nz * 0.16 * sgn;
    group.add(rail);
  }
  scene.add(group);
  return group;
}

function roadTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 512;
  const g = c.getContext('2d');
  const r = mulberry(3);
  g.fillStyle = '#c6a9aa'; g.fillRect(0, 0, 128, 512);
  for (let i = 0; i < 1400; i++) {
    g.fillStyle = r() > 0.5 ? '#dac7c7' : '#ad9094'; g.globalAlpha = 0.22 * r();
    g.beginPath(); g.ellipse(r() * 128, r() * 512, 1 + r() * 4, 1 + r() * 2, r() * 3, 0, 7); g.fill();
  }
  g.globalAlpha = 0.14; g.fillStyle = '#8c6d74';
  g.fillRect(40, 0, 8, 512); g.fillRect(80, 0, 8, 512);
  g.globalAlpha = 1; g.globalCompositeOperation = 'destination-in';
  const gr = g.createLinearGradient(0, 0, 128, 0);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.22, 'rgba(0,0,0,1)'); gr.addColorStop(0.78, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 512);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function buildWorld(scene) {
  const W = {};
  scene.background = new THREE.Color('#d3deee');
  scene.fog = new THREE.Fog('#d3deee', 40, 96);

  scene.add(new THREE.HemisphereLight('#f4f7ff', '#b9a3ad', 1.45));
  const sun = new THREE.DirectionalLight('#ffe6cf', 2.0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -26; sc.right = 26; sc.top = 26; sc.bottom = -26; sc.near = 1; sc.far = 100;
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.035;
  scene.add(sun); scene.add(sun.target);
  W.sun = sun;
  // light from screen-left and a little towards the viewer, so shadows fall to the right like the reference
  W.sunOffset = new THREE.Vector3(-(CAM.R.x + CAM.F.x * 0.25), 1.2, -(CAM.R.z + CAM.F.z * 0.25)).normalize().multiplyScalar(45);

  const snowTex = T.noiseTexture('#d2dcec', [['#c3d0e6', 220, 6, 22, 0.5], ['#e9eff8', 260, 4, 14, 0.6], ['#b9c8e0', 60, 8, 20, 0.25]], 26, 5);
  const snow = M.mesh(new THREE.PlaneGeometry(360, 360), new THREE.MeshLambertMaterial({ map: snowTex }), false, true);
  snow.rotation.x = -Math.PI / 2; snow.position.set(4, 0, 0);
  scene.add(snow);

  const rt = roadTexture();
  const mkRoad = (len, w, x, z, ry) => {
    const t = rt.clone(); t.needsUpdate = true; t.repeat.set(1, len / 12);
    const m = M.mesh(new THREE.PlaneGeometry(w, len), new THREE.MeshLambertMaterial({ map: t, transparent: true, depthWrite: false }), false, true);
    m.rotation.x = -Math.PI / 2; m.rotation.z = ry; m.position.set(x, 0.012, z); m.renderOrder = 1;
    scene.add(m);
  };
  const ln = L.carLane;
  mkRoad(190, 5.6, 30, ln.z, Math.PI / 2);
  mkRoad(120, 5.6, ln.x, ln.z + 57, 0);
  mkRoad(70, 5.0, (L.gate.x0 + L.gate.x1) / 2, L.yard.z1 + 33, 0.1);

  const y = L.yard, yw = y.x1 - y.x0, yd = y.z1 - y.z0;
  const yard = M.mesh(new THREE.PlaneGeometry(yw, yd), new THREE.MeshLambertMaterial({ map: T.yardTexture(yw, yd) }), false, true);
  yard.rotation.x = -Math.PI / 2; yard.position.set((y.x0 + y.x1) / 2, 0.02, (y.z0 + y.z1) / 2);
  scene.add(yard);
  const ew = L.expand.x1 - y.x1 + 1.4, ed = L.expand.z1 - y.z0;
  const yard2 = M.mesh(new THREE.PlaneGeometry(ew, ed), new THREE.MeshLambertMaterial({ map: T.yardTexture(ew, ed, true) }), false, true);
  yard2.rotation.x = -Math.PI / 2; yard2.position.set(y.x1 - 1.4 + ew / 2, 0.026, y.z0 + ed / 2);
  yard2.visible = false; scene.add(yard2);
  W.yard2 = yard2;

  const sh = L.shed, shx0 = sh.x - sh.len / 2;
  fenceRun(scene, [
    [y.x0, y.z0, y.x1, y.z0],
    [y.x1, L.expand.z1, y.x1, y.z1],
    [y.x0, y.z1, L.gate.x0, y.z1], [L.gate.x1, y.z1, y.x1, y.z1],
    [y.x0, y.z0, y.x0, L.coalTable.z - 2.1], [y.x0, L.coalTable.z + 2.1, y.x0, y.z1],
  ], 1);
  W.fenceOld = fenceRun(scene, [[y.x1, y.z0 + 0.28, y.x1, L.expand.z1]], 2);
  W.fenceNew = fenceRun(scene, [[y.x1 + 0.28, y.z0, L.expand.x1, y.z0], [L.expand.x1, y.z0, L.expand.x1, L.expand.z1], [y.x1 + 0.4, L.expand.z1, L.expand.x1, L.expand.z1]], 3);
  W.fenceNew.visible = false;

  // pines and rail fences outside
  const r = mulberry(21);
  const spots = [];
  const blocked = (x, z) =>
    (x > y.x0 - 1.8 && x < L.expand.x1 + 3.2 && z > y.z0 - 2.6 && z < y.z1 + 2.2) ||
    (z > ln.z - 3.4 && z < ln.z + 3.2) || (x > ln.x - 3.4 && x < ln.x + 3.0 && z > ln.z) ||
    (x > L.gate.x0 - 2.5 && x < L.gate.x1 + 4.5 && z > y.z1 && z < 80) ||
    // keep the corridor between the camera and the yard clear
    (z > y.z1 + 1 && x < y.x0 && Math.abs((x - 2) * CAM.R.x + (z - 2) * CAM.R.z) < 7.5 && z < 46);
  let guard = 0;
  while (spots.length < 210 && guard++ < 9000) {
    const x = -70 + r() * 150, z = -66 + r() * 126;
    if (blocked(x, z)) continue;
    if (spots.some((s) => Math.hypot(s[0] - x, s[1] - z) < 2.9)) continue;
    spots.push([x, z, 0.7 + r() * 0.45, r() * 6]);
  }
  const trees = new THREE.InstancedMesh(M.treeGeometry(), M.MAT, spots.length);
  spots.forEach(([x, z, s, ry], i) => {
    dummy.position.set(x, 0, z); dummy.rotation.set(0, ry, 0); dummy.scale.setScalar(s); dummy.updateMatrix();
    trees.setMatrixAt(i, dummy.matrix);
  });
  trees.castShadow = true; trees.receiveShadow = true; trees.frustumCulled = false;
  scene.add(trees);
  // a few pines close to the right-hand fence, cleared when the yard expands
  const near = new THREE.Group();
  for (const [x, z, sc] of [[11.7, -7.4, 1.0], [12.6, -3.6, 0.9], [12.2, 0.6, 1.05], [14.6, -5.6, 1.1]]) {
    const m = M.mesh(M.treeGeometry()); m.position.set(x, 0, z); m.scale.setScalar(sc); near.add(m);
  }
  scene.add(near); W.treesOld = near;
  const keep = [[15.4, -1.2, 1.0], [15.0, 3.2, 0.95], [12.4, 6.4, 1.0], [14.3, 9.5, 1.1], [-0.5, -12.2, 1.05], [5.5, -11.8, 0.95]];
  for (const [x, z, sc] of keep) { const m = M.mesh(M.treeGeometry()); m.position.set(x, 0, z); m.scale.setScalar(sc); scene.add(m); }
  const railGeo = M.railFenceGeometry();
  for (const [x, z, ry] of [[0, ln.z - 4.2, 0.05], [9, ln.z - 4.4, -0.08], [ln.x - 4.3, -2, 1.5], [ln.x - 4.4, 8, 1.62], [19, ln.z - 4.1, 0.1], [17.5, 2, 1.5], [ln.x - 5, ln.z - 5, 0.7]]) {
    const m = M.mesh(railGeo); m.position.set(x, 0, z); m.rotation.y = ry; m.scale.setScalar(1.25); scene.add(m);
  }

  // sawmill
  const shed = M.mesh(M.shedGeometry(sh.len, sh.depth)); shed.position.set(sh.x, 0, sh.z); scene.add(shed);
  const palletGeo = M.palletGeometry(2.6, 1.05);
  L.logPallets.forEach((p) => { const m = M.mesh(palletGeo); m.position.set(p.x, 0, p.z); scene.add(m); });
  const workerLook = { coat: '#d2b08c', trim: '#f5ecdb', boots: '#6a5146', mitt: '#8a6a55', belt: '#9a7654', scale: 0.95 };
  W.sawWorkers = L.sawWorkers.map((p, i) => {
    const c = M.makeCharacter(workerLook);
    c.position.set(p.x, 0, p.z); c.rotation.y = Math.PI; c.userData.phase = i * 1.7; scene.add(c); return c;
  });

  // counters
  const tGeo = M.tableGeometry(L.table.len, L.table.depth, L.table.regX);
  for (const t of [L.woodTable, L.coalTable]) { const m = M.mesh(tGeo); m.position.set(t.x, 0, t.z); m.rotation.y = t.ry; scene.add(m); }
  const nt = M.mesh(tGeo); nt.position.set(L.newTable.x, 0, L.newTable.z); nt.rotation.y = L.newTable.ry; nt.visible = false; scene.add(nt);
  W.newTable = nt;

  // coal station (hidden until bought); the group sits at the station centre so it can pop in by scaling
  const station = new THREE.Group();
  const sx = L.zone25.x, sz = L.zone25.z;
  station.position.set(sx, 0, sz);
  const bench = M.mesh(M.coalBenchGeometry()); bench.position.set(L.coalBench.x - sx, 0, L.coalBench.z - sz); station.add(bench);
  const cp = M.mesh(M.palletGeometry(2.3, 1.3)); cp.position.set(L.coalPallet.x - sx, 0, L.coalPallet.z - sz); station.add(cp);
  const cw = M.makeCharacter(workerLook);
  cw.position.set(L.coalWorker.x - sx, 0, L.coalWorker.z - sz); cw.rotation.y = -Math.PI / 2 - 0.3; station.add(cw);
  station.visible = false; scene.add(station);
  W.coalStation = station; W.coalWorker = cw;

  // furnace + crates
  const fur = M.mesh(M.furnaceGeometry()); fur.position.set(L.furnace.x, 0, L.furnace.z); fur.scale.setScalar(1.05); scene.add(fur);
  const glow = M.mesh(M.furnaceGlowGeometry(), M.GLOW, false, false); glow.position.copy(fur.position); glow.scale.copy(fur.scale); scene.add(glow);
  const fl = new THREE.PointLight('#ff9a4a', 26, 11, 1.6); fl.position.set(L.furnace.x - 1.6, 1.0, L.furnace.z + 1.6); scene.add(fl);
  W.furnaceLight = fl;
  const cr = M.mesh(M.crateGeometry()); cr.position.set(L.crates.x, 0, L.crates.z); cr.scale.setScalar(1.0); scene.add(cr);

  return W;
}
