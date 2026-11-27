import * as THREE from 'three';
import { L, CAM, tableToWorld } from './layout.js';
import { clamp, lerp, easeOutBack, angLerp, mulberry } from './util.js';
import * as M from './models.js';
import * as T from './textures.js';

const dummy = new THREE.Object3D();
const rnd = mulberry(99);

const PLAYER_SPEED = 4.6;
const CARRY_MAX = 20;
const SALE_BILLS = 10; // each sale drops 10 bills worth $2
const BILL_VALUE = 2;
const WOOD_NEED = 5;
const COAL_NEED = 6;
const H = { log: 0.25, coal: 0.236, bill: 0.085 };
const TOP = 0.866;
const PICK_RANGE = 0.45; // the player has to stand right at a pallet, as in the reference // counter top height
const PAL = { hw: 1.3, hd: 0.52 };
const CPAL = { hw: 1.15, hd: 0.65 };

class Pool {
  constructor(scene, geom, cap) {
    this.mesh = new THREE.InstancedMesh(geom, M.MAT, cap);
    this.mesh.castShadow = true; this.mesh.receiveShadow = true; this.mesh.frustumCulled = false;
    this.cap = cap; this.n = 0;
    scene.add(this.mesh);
  }
  begin() { this.n = 0; }
  put() { if (this.n < this.cap) { dummy.updateMatrix(); this.mesh.setMatrixAt(this.n++, dummy.matrix); } }
  end() { this.mesh.count = this.n; this.mesh.instanceMatrix.needsUpdate = true; }
}

function sprite(map, size) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, depthTest: false, transparent: true }));
  s.scale.set(size, size * (map.image.height / map.image.width), 1);
  s.renderOrder = 20;
  return s;
}

const CUSTOMER_LOOKS = [
  { coat: '#4f8f58', hood: false, hair: '#6a4634', trim: '#f1ece2' },
  { coat: '#b3203f', pom: true },
  { coat: '#3e8fba' },
  { coat: '#8a8494', trim: '#e9e6ee' },
  { coat: '#b3203f', hood: false, hair: '#3d2b25' },
  { coat: '#3f9a78', pom: true },
];
const CAR_COLORS = ['#c9333f', '#4aa9d7', '#3c4250', '#c9333f', '#4aa9d7', '#55607a'];
const CAR_SCALE = 1.06;

export class Game {
  constructor(scene, world, sfx, hooks) {
    this.scene = scene; this.W = world; this.sfx = sfx; this.hooks = hooks;
    this.t = 0;
    this.state = 'play'; // play | won
    this.money = 25;
    this.moneyShown = 25;
    this.cashOnBack = 25; // bills drawn on the player's back
    this.cashIn = 0;
    this.coalBuilt = false; this.expanded = false;
    this.coalDeliveredOnce = false;
    this.flyers = [];
    this.fx = [];
    this.timers = { pay: 0, pick: 0, drop: 0, cash: 0 };
    this.stats = { picks: 0, drops: 0, woodSales: 0, coalSales: 0 };
    this.bubbleScale = 1;
    this.wide = false;

    this.pools = {
      log: new Pool(scene, M.logGeometry(), 260),
      coal: new Pool(scene, M.coalGeometry(), 200),
      bill: new Pool(scene, M.billGeometry(), 340),
    };

    this.logPallets = L.logPallets.map((p) => ({ x: p.x, z: p.z, count: 12, cap: 18, t: 0, high: true }));
    this.coalPallet = { x: L.coalPallet.x, z: L.coalPallet.z, count: 0, cap: 18, t: 0, high: true };
    this.wood = { t: L.woodTable, stock: 0, inbound: 0, cash: 0, cashIn: 0, zone: null };
    this.coal = { t: L.coalTable, stock: 0, inbound: 0, cash: 0, cashIn: 0, zone: null };

    this.player = { x: L.start.x, z: L.start.z, h: Math.atan2(L.zone25.x - L.start.x, L.zone25.z - L.start.z), moving: false, carry: 0, carryType: null, inbound: 0, sway: 0, vx: 0, vz: 0 };
    this.playerMesh = M.makeCharacter({ coat: '#2f8cc0', trim: '#f6f3ee', pack: '#22648c', boots: '#3a2a28', mitt: '#2a3a55' });
    scene.add(this.playerMesh);

    this._buildZones();
    this.bubbleTex = { log: T.bubbleTexture('log'), coal: T.bubbleTexture('coal'), check: T.bubbleTexture('check'), angry: T.bubbleTexture('angry') };
    this.guide = sprite(T.arrowTexture(), 0.85);
    this.guide.center.set(0.5, 0);
    scene.add(this.guide);
    this.guideTarget = null;

    this.customers = [];
    this._custN = 0;
    for (let i = 0; i < 3; i++) this._spawnCustomer(i, 0.3 + i * 3.2);
    this._initCars();
    this.obstacles = this._obstacles();
  }

  // ---------------------------------------------------------------- zones
  _buildZones() {
    const fillTex = T.zoneFillTexture();
    const mk = (pos, size, opts) => {
      const tex = T.zoneTexture(opts);
      const g = new THREE.Group();
      const fill = new THREE.Mesh(new THREE.PlaneGeometry(size * 0.86, size * 0.86), new THREE.MeshBasicMaterial({ map: fillTex, color: '#6fe24f', transparent: true, opacity: 0, depthWrite: false }));
      const mark = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.96 }));
      fill.rotation.x = mark.rotation.x = -Math.PI / 2;
      fill.position.y = 0.035; mark.position.y = 0.045; fill.renderOrder = 2; mark.renderOrder = 3;
      g.add(fill, mark); g.position.set(pos.x, 0, pos.z);
      this.scene.add(g);
      return { x: pos.x, z: pos.z, size, half: size * 0.4, g, fill, mark, tex, active: 0, pop: 1 };
    };
    this.zone25 = Object.assign(mk(L.zone25, 2.75, { icon: 'coal', price: '$25' }), { price: 25, remaining: 25, kind: 'pay' });
    this.zone40 = Object.assign(mk(L.zone40, 2.75, { icon: 'upgrade', price: '$40' }), { price: 40, remaining: 40, kind: 'pay' });
    this.wood.zone = Object.assign(mk(L.woodZone, 2.4, { plain: true }), { kind: 'serve' });
    this.coal.zone = Object.assign(mk(L.coalZone, 2.4, { plain: true }), { kind: 'serve' });
    this.zone100a = mk(L.zone100a, 2.9, { icon: 'meat', price: '$100' });
    this.zone100b = mk(L.zone100b, 2.9, { icon: 'shirt', price: '$100' });
    this.zone100a.g.visible = this.zone100b.g.visible = false;
    this.zones = [this.zone25, this.zone40, this.wood.zone, this.coal.zone, this.zone100a, this.zone100b];
  }
  _inZone(z) {
    if (!z.g.visible) return false;
    return Math.abs(this.player.x - z.x) < z.half && Math.abs(this.player.z - z.z) < z.half;
  }

  _mkBubble() {
    const s = sprite(this.bubbleTex.log, 0.95);
    s.center.set(0.5, 0.0); s.visible = false; s.userData = { kind: '', pop: 0 };
    this.scene.add(s);
    return s;
  }
  _setBubble(s, kind, x, y, z, dt) {
    const u = s.userData;
    if (kind !== u.kind) {
      u.kind = kind; u.pop = 0;
      if (kind) { s.material.map = this.bubbleTex[kind]; s.material.needsUpdate = true; }
    }
    s.visible = !!kind;
    if (!kind) return;
    u.pop = Math.min(1, u.pop + dt * 5);
    const k = easeOutBack(u.pop) * (kind === 'angry' ? 0.66 : 1) * this.bubbleScale;
    const m = s.material.map.image;
    s.scale.set(0.95 * k, 0.95 * k * (m.height / m.width), 1);
    s.position.set(x, y + (kind === 'angry' ? Math.sin(this.t * 9 + x) * 0.04 : 0), z);
  }

  // ---------------------------------------------------------------- customers
  _spawnCustomer(i, dist) {
    const look = CUSTOMER_LOOKS[this._custN++ % CUSTOMER_LOOKS.length];
    const ch = M.makeCharacter(Object.assign({ scale: 0.8 + rnd() * 0.06 }, look));
    const q = L.queue;
    const c = { ch, x: q.x + i * q.dx + 0.9 + dist * 0.1, z: q.z + i * q.dz + dist, h: Math.PI, state: 'queue', got: 0, wait: 0, t: 0, bubble: this._mkBubble(), held: 0 };
    ch.position.set(c.x, 0, c.z);
    this.scene.add(ch);
    this.customers.push(c);
  }
  _walk(c, tx, tz, dt, speed) {
    const dx = tx - c.x, dz = tz - c.z, d = Math.hypot(dx, dz);
    if (d < 0.04) return true;
    const st = Math.min(d, speed * dt);
    c.x += (dx / d) * st; c.z += (dz / d) * st;
    c.h = angLerp(c.h, Math.atan2(dx, dz), Math.min(1, dt * 10));
    return false;
  }
  _updateCustomers(dt) {
    const q = L.queue;
    const queue = this.customers.filter((c) => c.state !== 'leave');
    queue.forEach((c, i) => {
      const arrived = this._walk(c, q.x + i * q.dx, q.z + i * q.dz, dt, 2.5);
      let mode = arrived ? 'idle' : 'walk';
      let bubble = '';
      if (arrived) {
        c.h = angLerp(c.h, Math.PI, Math.min(1, dt * 8));
        c.wait += dt;
        if (c.state === 'queue') {
          if (i === 0) {
            bubble = 'log';
            c.t -= dt;
            if (c.got + c.held < WOOD_NEED && this.wood.stock > 0 && c.t <= 0 && this._inZone(this.wood.zone)) {
              c.t = 0.2; this.wood.stock--; c.held++;
              const from = this._stockSlot(this.wood, 'log', this.wood.stock);
              this._fly('log', from, () => [c.x, 0.72 + c.got * 0.19, c.z - 0.36, c.h + Math.PI / 2], 0.34, 1.3, () => { c.held--; c.got++; this.sfx.pick(c.got + 2); });
            }
            if (c.got >= WOOD_NEED) { c.state = 'paid'; c.t = 0.5; this.sfx.check(); }
          } else if (c.wait > 1.6 + i * 0.5) bubble = 'angry';
        } else if (c.state === 'paid') {
          bubble = 'check';
          c.t -= dt;
          if (c.t <= 0) {
            this._pay(c.x, 1.0, c.z - 0.3, this.wood);
            this.stats.woodSales++;
            c.state = 'leave'; c.path = [[1.0, 5.2], [2.3, 9.8], [0.5, 36]]; c.t = 0;
            this._spawnCustomer(3, 10);
          }
        }
        if (c.got > 0 || c.held > 0) mode = 'hold';
      }
      this._setBubble(c.bubble, bubble, c.x, 1.72, c.z, dt);
      c.ch.position.set(c.x, 0, c.z); c.ch.rotation.y = c.h;
      M.animateCharacter(c.ch, mode, dt, 0.8);
    });
    for (const c of this.customers) {
      if (c.state !== 'leave') continue;
      this._setBubble(c.bubble, c.t < 0.45 ? 'check' : '', c.x, 1.72, c.z, dt);
      c.t += dt;
      const p = c.path[0];
      if (this._walk(c, p[0], p[1], dt, 2.9)) c.path.shift();
      c.ch.position.set(c.x, 0, c.z); c.ch.rotation.y = c.h;
      M.animateCharacter(c.ch, 'walk', dt, 0.9);
      if (!c.path.length) { this.scene.remove(c.ch); this.scene.remove(c.bubble); c.dead = true; }
    }
    this.customers = this.customers.filter((c) => !c.dead);
  }

  // ---------------------------------------------------------------- cars
  _initCars() {
    const ln = L.carLane, R = 2.9;
    this.lane = { R, x0: 52, s1: 52 - (ln.x + R), arc: (Math.PI / 2) * R };
    this.lane.stop = this.lane.s1 + this.lane.arc + (ln.stopZ - (ln.z + R));
    this.cars = [];
    this._carN = 0;
    this._spawnCar(this.lane.stop);
    this._spawnCar(this.lane.s1 - 24);
    this._spawnCar(this.lane.s1 - 50);
  }
  _spawnCar(s) {
    const color = CAR_COLORS[this._carN++ % CAR_COLORS.length];
    const mesh = M.mesh(M.carGeometry(color));
    mesh.scale.setScalar(CAR_SCALE);
    this.scene.add(mesh);
    const car = { mesh, s, v: 0, state: 'queue', got: 0, held: 0, t: 0, wait: 0, bubble: this._mkBubble() };
    this.cars.push(car);
    this._placeCar(car);
  }
  _lanePos(s) {
    const ln = L.carLane, { R, s1, arc, x0 } = this.lane;
    if (s < s1) return [x0 - s, ln.z, Math.PI];
    if (s < s1 + arc) {
      const a = ((s - s1) / arc) * (Math.PI / 2);
      return [ln.x + R - R * Math.sin(a), ln.z + R - R * Math.cos(a), Math.PI + a];
    }
    return [ln.x, ln.z + R + (s - s1 - arc), Math.PI * 1.5];
  }
  _placeCar(car) {
    const [x, z, ry] = this._lanePos(car.s);
    car.x = x; car.z = z;
    car.mesh.position.set(x, Math.abs(Math.sin(this.t * 31 + car.s)) * 0.012 * Math.min(1, car.v), z);
    car.mesh.rotation.y = ry;
  }
  _updateCars(dt) {
    const queue = this.cars.filter((c) => c.state !== 'leave');
    queue.forEach((car, i) => {
      const target = this.lane.stop - i * L.carLane.gap;
      const d = target - car.s;
      const want = d > 0.02 ? Math.min(8.5, Math.max(0.6, d * 2.2)) : 0;
      car.v = lerp(car.v, want, Math.min(1, dt * 4));
      if (d > 0) car.s = Math.min(target, car.s + car.v * dt);
      const stopped = d < 0.05;
      if (!stopped && car.v > 2 && Math.hypot(car.x - this.player.x, car.z - this.player.z) < 24) this.sfx.car();
      let bubble = '';
      if (stopped) {
        car.wait += dt;
        if (car.state === 'queue') {
          if (i === 0) {
            bubble = 'coal';
            car.t -= dt;
            if (car.got + car.held < COAL_NEED && this.coal.stock > 0 && car.t <= 0 && this._inZone(this.coal.zone)) {
              car.t = 0.2; this.coal.stock--; car.held++;
              const from = this._stockSlot(this.coal, 'coal', this.coal.stock);
              this._fly('coal', from, () => [car.x + 0.3, 1.65, car.z - 0.4], 0.36, 1.5, () => { car.held--; car.got++; this.sfx.pick(car.got + 1); });
            }
            if (car.got >= COAL_NEED) { car.state = 'paid'; car.t = 0.5; this.sfx.check(); }
          } else if (car.wait > 1.2 + i * 0.6) bubble = 'angry';
        } else if (car.state === 'paid') {
          bubble = 'check';
          car.t -= dt;
          if (car.t <= 0) {
            this._pay(car.x + 0.5, 1.6, car.z, this.coal);
            this.stats.coalSales++;
            car.state = 'leave'; car.t = 0;
            this._spawnCar(Math.min(this.lane.s1 - 30, this.cars.reduce((m, c) => Math.min(m, c.s), 1e9) - 14));
          }
        }
      } else if (i === 0 && car.state === 'queue') bubble = 'coal';
      this._placeCar(car);
      this._setBubble(car.bubble, bubble, car.x, 1.9, car.z, dt);
    });
    for (const car of this.cars) {
      if (car.state !== 'leave') continue;
      car.t += dt;
      car.v = lerp(car.v, 9, Math.min(1, dt * 1.6));
      car.s += car.v * dt;
      this._placeCar(car);
      this._setBubble(car.bubble, car.t < 0.45 ? 'check' : '', car.x, 1.9, car.z, dt);
      if (car.z > 64) { this.scene.remove(car.mesh); this.scene.remove(car.bubble); car.mesh.geometry.dispose(); car.dead = true; }
    }
    this.cars = this.cars.filter((c) => !c.dead);
  }

  _pay(x, y, z, table) {
    for (let k = 0; k < SALE_BILLS; k++) {
      const idx = table.cash + table.cashIn;
      table.cashIn++;
      const to = this._cashSlot(table, idx);
      this._fly('bill', [x, y, z, to[3]], () => to, 0.42, 1.5, () => { table.cashIn--; table.cash++; if (k % 2 === 0) this.sfx.cash(); }, k * 0.05);
    }
  }

  // ---------------------------------------------------------------- slots: [x, y, z, ry]
  _stockSlot(table, type, i) {
    const t = table.t, sx = L.table.stockX;
    if (type === 'log') {
      // two logs side by side per layer, ends towards the customer
      const [x, z] = tableToWorld(t, sx + ((i % 2) - 0.5) * 0.27, 0.05);
      return [x, TOP + 0.125 + Math.floor(i / 2) * H.log, z, t.ry];
    }
    const [x, z] = tableToWorld(t, sx + ((i % 2) - 0.5) * 0.74, 0);
    return [x, TOP + 0.11 + Math.floor(i / 2) * H.coal, z, t.ry + Math.PI / 2];
  }
  _cashSlot(table, i) {
    const [x, z] = tableToWorld(table.t, L.table.cashX, 0);
    return [x, TOP + 0.035 + Math.min(i, 70) * H.bill, z, table.t.ry + Math.PI / 2];
  }
  _palletSlot(p, i) { const k = i % 9, layer = Math.floor(i / 9); return [p.x + (k - 4) * 0.27, 0.2 + layer * H.log, p.z, 0]; }
  _coalPalletSlot(i) {
    const k = i % 6, layer = Math.floor(i / 6);
    return [this.coalPallet.x + ((k % 3) - 1) * 0.75, 0.19 + layer * H.coal, this.coalPallet.z + (Math.floor(k / 3) - 0.5) * 0.56, 0];
  }
  _backSlot(i, cash) {
    const p = this.player;
    const hasGoods = p.carry + p.inbound > 0;
    const back = cash ? (hasGoods ? -0.98 : -0.46) : -0.46;
    const h = cash ? H.bill : H[p.carryType || 'log'];
    const lean = p.sway * i * i * (cash ? 0.00022 : 0.0011);
    const bz = back - lean;
    const s = Math.sin(p.h), c = Math.cos(p.h);
    return [p.x + s * bz, 0.46 + i * h, p.z + c * bz, p.h + (cash || p.carryType === 'coal' ? 0 : Math.PI / 2)];
  }

  // ---------------------------------------------------------------- flyers / fx
  _fly(type, from, to, dur, h, done, delay = 0) {
    this.flyers.push({ type, x0: from[0], y0: from[1], z0: from[2], ry: from[3] || 0, to, dur, h, done, t: -delay, spin: (rnd() - 0.5) * 8 });
  }
  _updateFlyers(dt) {
    for (const f of this.flyers) {
      f.t += dt;
      if (f.t >= f.dur) { f.dead = true; f.done && f.done(); }
    }
    this.flyers = this.flyers.filter((f) => !f.dead);
  }
  _burst(x, z, w, d, big) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(w, 3.0, d), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5, depthWrite: false }));
    box.position.set(x, 1.5, z); box.renderOrder = 10;
    this.scene.add(box);
    const n = big ? 110 : 54;
    const pos = new Float32Array(n * 3), vel = [];
    for (let i = 0; i < n; i++) {
      pos[i * 3] = x + (rnd() - 0.5) * w * 1.1; pos[i * 3 + 1] = rnd() * 2.4; pos[i * 3 + 2] = z + (rnd() - 0.5) * d * 1.1;
      vel.push(1.5 + rnd() * 3.5);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ map: this._disc || (this._disc = T.softDisc()), size: 0.4, transparent: true, depthWrite: false, color: '#ffffff', opacity: 1 }));
    pts.renderOrder = 11; pts.frustumCulled = false;
    this.scene.add(pts);
    this.fx.push({ box, pts, vel, t: 0, dur: big ? 1.5 : 1.1 });
  }
  _updateFx(dt) {
    for (const f of this.fx) {
      f.t += dt;
      const k = f.t / f.dur;
      f.box.material.opacity = 0.5 * Math.max(0, 1 - k * 1.5);
      f.box.scale.y = 1 + k * 0.5;
      const a = f.pts.geometry.attributes.position;
      for (let i = 0; i < f.vel.length; i++) a.array[i * 3 + 1] += f.vel[i] * dt;
      a.needsUpdate = true;
      f.pts.material.opacity = Math.max(0, 1 - k);
      if (k >= 1) { this.scene.remove(f.box); this.scene.remove(f.pts); f.box.geometry.dispose(); f.pts.geometry.dispose(); f.dead = true; }
    }
    this.fx = this.fx.filter((f) => !f.dead);
  }

  // ---------------------------------------------------------------- collisions
  _obstacles() {
    const o = [];
    const rect = (x, z, hw, hd) => o.push({ x0: x - hw, x1: x + hw, z0: z - hd, z1: z + hd });
    const sh = L.shed;
    rect(sh.x, sh.z + 0.2, sh.len / 2 + 0.1, sh.depth / 2 + 0.35);
    for (const w of L.sawWorkers) rect(w.x, w.z, 0.3, 0.3);
    for (const p of L.logPallets) rect(p.x, p.z, PAL.hw, PAL.hd);
    const hl = L.table.len / 2, hd = L.table.depth / 2;
    rect(L.woodTable.x, L.woodTable.z, hl, hd);
    rect(L.coalTable.x, L.coalTable.z, hd, hl);
    rect(L.furnace.x, L.furnace.z, 1.5, 1.5);
    rect(L.crates.x + 0.5, L.crates.z + 0.25, 1.25, 0.95);
    if (this.coalBuilt) {
      rect(L.coalBench.x, L.coalBench.z, 1.55, 0.6);
      rect(L.coalPallet.x, L.coalPallet.z, CPAL.hw, CPAL.hd);
      rect(L.coalWorker.x, L.coalWorker.z, 0.3, 0.3);
    }
    if (this.expanded) rect(L.newTable.x, L.newTable.z, hd, hl);
    return o;
  }
  _movePlayer(dt, ix, iy) {
    const p = this.player;
    const len = Math.hypot(ix, iy), mag = Math.min(1, len);
    p.moving = mag > 0.08;
    let vx = 0, vz = 0;
    if (p.moving) {
      const nx = ix / len, ny = iy / len;
      const sp = PLAYER_SPEED * (0.35 + 0.65 * mag);
      vx = (CAM.R.x * nx - CAM.F.x * ny) * sp; vz = (CAM.R.z * nx - CAM.F.z * ny) * sp;
      p.h = angLerp(p.h, Math.atan2(vx, vz), Math.min(1, dt * 14));
    }
    p.vx = lerp(p.vx, vx, Math.min(1, dt * 16)); p.vz = lerp(p.vz, vz, Math.min(1, dt * 16));
    let x = p.x + p.vx * dt, z = p.z + p.vz * dt;
    const r = 0.34, y = L.yard, m = 0.6;
    const xmax = this.expanded && z < L.expand.z1 - m ? L.expand.x1 - m : y.x1 - m;
    x = clamp(x, y.x0 + m, xmax);
    if (this.expanded && x > y.x1 - m) z = Math.min(z, L.expand.z1 - m);
    z = clamp(z, y.z0 + m, y.z1 - m);
    for (const o of this.obstacles) {
      const cx = clamp(x, o.x0, o.x1), cz = clamp(z, o.z0, o.z1);
      const dx = x - cx, dz = z - cz, d = Math.hypot(dx, dz);
      if (d >= r) continue;
      if (d > 1e-5) { x = cx + (dx / d) * r; z = cz + (dz / d) * r; }
      else {
        const l = x - o.x0, rr = o.x1 - x, t = z - o.z0, b = o.z1 - z, mn = Math.min(l, rr, t, b);
        if (mn === l) x = o.x0 - r; else if (mn === rr) x = o.x1 + r; else if (mn === t) z = o.z0 - r; else z = o.z1 + r;
      }
    }
    p.x = x; p.z = z;
    p.sway = lerp(p.sway, p.moving ? 1 : 0, Math.min(1, dt * 6));
    if (p.moving) this.sfx.step();
  }
  _near(rx, rz, hw, hd, range) {
    const p = this.player;
    const dx = Math.max(Math.abs(p.x - rx) - hw, 0), dz = Math.max(Math.abs(p.z - rz) - hd, 0);
    return Math.hypot(dx, dz) < range;
  }

  // ---------------------------------------------------------------- interactions
  _interact(dt) {
    const p = this.player, tm = this.timers;
    for (const k in tm) tm[k] -= dt;

    for (const z of [this.zone25, this.zone40]) {
      if (!z.g.visible) continue;
      if (!z.done && this._inZone(z) && this.money > 0 && z.remaining > 0 && tm.pay <= 0) {
        tm.pay = z === this.zone25 ? 0.05 : 0.03;
        this.money--; z.remaining--; this.cashOnBack = Math.max(0, this.cashOnBack - 1);
        T.updateZoneTexture(z.tex, '$' + z.remaining);
        const from = this._backSlot(this.cashOnBack, true);
        this._fly('bill', from, () => [z.x + (rnd() - 0.5) * 0.6, 0.1, z.z + (rnd() - 0.5) * 0.6, from[3]], 0.3, 1.6, null);
        this.sfx.cash();
        if (z.remaining === 0) { z.done = true; z.doneT = 0.3; }
      }
      if (z.done && z.doneT > 0) {
        z.doneT -= dt;
        if (z.doneT <= 0) (z === this.zone25 ? this._buildCoal() : this._expand());
      }
    }

    if (tm.pick <= 0 && p.carry + p.inbound < CARRY_MAX) {
      let src = null, type = null, slot = null;
      if (p.carryType !== 'coal') {
        for (const pal of this.logPallets) if (pal.count > 0 && this._near(pal.x, pal.z, PAL.hw, PAL.hd, PICK_RANGE)) { src = pal; type = 'log'; slot = this._palletSlot(pal, pal.count - 1); break; }
      }
      // the station pops in around the player, so coal is only picked up once he has stepped away from its pallet
      const atCoal = this.coalBuilt && this._near(this.coalPallet.x, this.coalPallet.z, CPAL.hw, CPAL.hd, PICK_RANGE);
      if (this.coalBuilt && !atCoal) this.coalArmed = true;
      if (!src && atCoal && this.coalArmed && p.carryType !== 'log' && this.coalPallet.count > 0) {
        src = this.coalPallet; type = 'coal'; slot = this._coalPalletSlot(src.count - 1);
      }
      if (src) {
        tm.pick = 0.085; src.count--; p.carryType = type; p.inbound++;
        const idx = p.carry + p.inbound - 1;
        this._fly(type, slot, () => this._backSlot(idx, false), 0.3, 1.4, () => { p.inbound--; p.carry++; this.sfx.pick(this.stats.picks++); if (p.carry >= 12) this.wide = true; });
      }
    }

    for (const [table, type] of [[this.wood, 'log'], [this.coal, 'coal']]) {
      if (!this._inZone(table.zone)) continue;
      if (p.carryType === type && p.carry > 0 && tm.drop <= 0) {
        tm.drop = 0.07;
        p.carry--;
        const from = this._backSlot(p.carry, false);
        table.inbound++;
        const idx = table.stock + table.inbound - 1;
        this._fly(type, from, () => this._stockSlot(table, type, idx), 0.3, 1.5, () => { table.inbound--; table.stock++; this.sfx.place(this.stats.drops++); });
        if (type === 'coal') this.coalDeliveredOnce = true;
      }
      if (table.cash > 0 && tm.cash <= 0) {
        tm.cash = 0.05;
        table.cash--;
        const from = this._cashSlot(table, table.cash);
        const idx = this.cashOnBack + this.cashIn;
        this.cashIn += BILL_VALUE;
        this._fly('bill', from, () => this._backSlot(idx, true), 0.3, 1.5, () => { this.cashIn -= BILL_VALUE; this.cashOnBack += BILL_VALUE; this.money += BILL_VALUE; this.sfx.cash(); });
      }
    }
    if (p.carry === 0 && p.inbound === 0) p.carryType = null;
  }

  _buildCoal() {
    this.coalBuilt = true;
    this.zone25.g.visible = false;
    this.W.coalStation.visible = true; this.W.coalStation.userData.pop = 0;
    this.coalPallet.count = 0; this.coalPallet.t = -1.2;
    this.obstacles = this._obstacles();
    this._burst(L.zone25.x - 0.1, L.zone25.z + 0.3, 4.4, 4.6);
    this.sfx.unlock2();
    this.hooks.onBuild && this.hooks.onBuild('coal');
  }
  _expand() {
    this.expanded = true;
    this.zone40.g.visible = false;
    const W = this.W, y = L.yard;
    W.fenceOld.visible = false; W.fenceNew.visible = true; W.yard2.visible = true; W.treesOld.visible = false;
    W.newTable.visible = true; W.newTable.userData.pop = 0;
    for (const z of [this.zone100a, this.zone100b]) { z.g.visible = true; z.pop = 0; }
    this.obstacles = this._obstacles();
    this._burst((y.x1 + L.expand.x1) / 2 - 0.4, (y.z0 + L.expand.z1) / 2, L.expand.x1 - y.x1 + 2.2, L.expand.z1 - y.z0, true);
    this.sfx.unlock2(); this.sfx.noise(1.0, 0.12, 800, 5000, 0.7);
    this.state = 'won'; this.wonT = 0;
    this.hooks.onBuild && this.hooks.onBuild('expand');
  }

  // ---------------------------------------------------------------- guide
  // Where the guide arrow points. It walks the player through the same order of jobs the reference video shows:
  // buy the coal station, haul logs to the wood counter, haul coal to the coal counter, collect the cash, buy the upgrade.
  _guideTarget() {
    const p = this.player, st = this.stats;
    if (this.state !== 'play') return null;
    if (!this.coalBuilt) return this.zone25;
    if (this.money >= this.zone40.remaining) return this.zone40;
    const wood = this.wood, coal = this.coal;
    const logsLeft = this.logPallets.some((l) => l.count > 0);
    if (p.carryType === 'log') {
      if (this._inZone(wood.zone) || p.carry + p.inbound >= CARRY_MAX || !logsLeft) return wood.zone;
      return this._bestPallet();
    }
    if (p.carryType === 'coal') {
      if (this._inZone(coal.zone) || p.carry + p.inbound >= 14 || this.coalPallet.count === 0) return coal.zone;
      return this.coalPallet;
    }
    const serving = (t, need) => this._inZone(t.zone) && t.stock + t.inbound >= need;
    // first round: stay at each counter until its first sale, then move on to the next job
    if (st.woodSales === 0) return wood.stock + wood.inbound >= WOOD_NEED ? wood.zone : this._bestPallet();
    if (st.coalSales === 0) return coal.stock + coal.inbound >= COAL_NEED ? coal.zone : this.coalPallet;
    const pw = wood.cash + wood.cashIn, pc = coal.cash + coal.cashIn;
    if (pw > 0 && (this._inZone(wood.zone) || pw >= pc)) return wood.zone;
    if (pc > 0) return coal.zone;
    if (serving(wood, WOOD_NEED)) return wood.zone;
    if (serving(coal, COAL_NEED)) return coal.zone;
    if (wood.stock >= WOOD_NEED) return wood.zone;
    if (coal.stock >= COAL_NEED) return coal.zone;
    return wood.stock <= coal.stock ? this._bestPallet() : this.coalPallet;
  }
  _bestPallet() { return this.logPallets[0].count >= this.logPallets[1].count ? this.logPallets[0] : this.logPallets[1]; }

  // ---------------------------------------------------------------- frame
  update(dt, input) {
    this.t += dt;
    const p = this.player;
    this._movePlayer(dt, input.x, input.y);
    this._interact(dt);
    this._updateCustomers(dt);
    this._updateCars(dt);
    this._updateFlyers(dt);
    this._updateFx(dt);

    for (let i = 0; i < this.logPallets.length; i++) {
      const pal = this.logPallets[i];
      pal.t += dt;
      if (pal.t > 0.5) { pal.t = 0; if (pal.count < pal.cap) pal.count++; }
      M.animateCharacter(this.W.sawWorkers[i], 'work', dt);
    }
    if (this.coalBuilt) {
      const st = this.W.coalStation;
      if (st.userData.pop < 1) { st.userData.pop = Math.min(1, st.userData.pop + dt * 2.6); st.scale.setScalar(Math.max(0.01, easeOutBack(st.userData.pop))); }
      this.coalPallet.t += dt;
      if (this.coalPallet.t > 0.45) { this.coalPallet.t = 0; if (this.coalPallet.count < this.coalPallet.cap) this.coalPallet.count++; }
      M.animateCharacter(this.W.coalWorker, 'work', dt);
    }
    if (this.expanded) {
      const nt = this.W.newTable;
      if (nt.userData.pop < 1) { nt.userData.pop = Math.min(1, nt.userData.pop + dt * 2.4); nt.scale.setScalar(Math.max(0.01, easeOutBack(nt.userData.pop))); }
      this.wonT += dt;
      if (this.wonT > 2.7 && !this.ended) { this.ended = true; this.hooks.onWin && this.hooks.onWin(); }
    }
    this.W.furnaceLight.intensity = 24 + Math.sin(this.t * 13) * 3 + Math.sin(this.t * 7.3) * 2;

    for (const z of this.zones) {
      if (!z.g.visible) continue;
      const inside = this._inZone(z);
      z.active = lerp(z.active, inside ? 1 : 0, Math.min(1, dt * 12));
      z.fill.material.opacity = z.active * 0.55;
      z.mark.material.color.setRGB(lerp(1, 0.4, z.active), 1, lerp(1, 0.35, z.active));
      if (z.pop < 1) z.pop = Math.min(1, z.pop + dt * 2.2);
      const breathe = z.kind === 'pay' && !inside ? 1 + Math.sin(this.t * 4) * 0.025 : 1;
      z.g.scale.setScalar(Math.max(0.01, easeOutBack(z.pop)) * breathe);
    }

    this.playerMesh.position.set(p.x, 0, p.z);
    this.playerMesh.rotation.y = p.h;
    M.animateCharacter(this.playerMesh, p.moving ? 'walk' : 'idle', dt, 1);
    this.moneyShown = this.money;

    const gt = this._guideTarget();
    this.guideTarget = gt;
    this.guide.visible = !!gt;
    if (gt) {
      const s = 0.8 * this.bubbleScale;
      this.guide.scale.set(s, s * 1.25, 1);
      this.guide.position.set(gt.x, (gt.high ? 1.9 : 1.2) + Math.abs(Math.sin(this.t * 4.2)) * 0.45, gt.z);
    }

    this._writeInstances();
  }

  _put(pool, s) {
    dummy.position.set(s[0], s[1], s[2]);
    dummy.rotation.set(0, s[3] || 0, 0);
    dummy.scale.setScalar(1);
    pool.put();
  }
  _writeInstances() {
    const { log, coal, bill } = this.pools;
    log.begin(); coal.begin(); bill.begin();
    const p = this.player;
    for (const pal of this.logPallets) for (let i = 0; i < pal.count; i++) this._put(log, this._palletSlot(pal, i));
    for (let i = 0; i < this.wood.stock; i++) this._put(log, this._stockSlot(this.wood, 'log', i));
    if (this.coalBuilt && this.W.coalStation.userData.pop > 0.7) for (let i = 0; i < this.coalPallet.count; i++) this._put(coal, this._coalPalletSlot(i));
    for (let i = 0; i < this.coal.stock; i++) this._put(coal, this._stockSlot(this.coal, 'coal', i));
    for (let i = 0; i < p.carry; i++) this._put(p.carryType === 'coal' ? coal : log, this._backSlot(i, false));
    for (let i = 0; i < this.cashOnBack; i++) this._put(bill, this._backSlot(i, true));
    for (let i = 0; i < Math.min(this.wood.cash, 70); i++) this._put(bill, this._cashSlot(this.wood, i));
    for (let i = 0; i < Math.min(this.coal.cash, 70); i++) this._put(bill, this._cashSlot(this.coal, i));
    for (const c of this.customers) {
      const s = Math.sin(c.h), co = Math.cos(c.h);
      for (let i = 0; i < c.got; i++) { dummy.position.set(c.x + s * 0.36, 0.72 + i * 0.19, c.z + co * 0.36); dummy.rotation.set(0, c.h + Math.PI / 2, 0); dummy.scale.setScalar(0.68); log.put(); }
    }
    for (const f of this.flyers) {
      if (f.t < 0) continue;
      const k = f.t / f.dur, to = f.to();
      const e = k * k * (3 - 2 * k);
      dummy.position.set(lerp(f.x0, to[0], e), lerp(f.y0, to[1], e) + Math.sin(k * Math.PI) * f.h, lerp(f.z0, to[2], e));
      dummy.rotation.set(Math.sin(k * Math.PI) * f.spin * 0.25, lerp(f.ry, to[3] !== undefined ? to[3] : f.ry, e) + (1 - k) * f.spin * 0.3, 0);
      dummy.scale.setScalar(1);
      this.pools[f.type].put();
    }
    log.end(); coal.end(); bill.end();
  }
}
