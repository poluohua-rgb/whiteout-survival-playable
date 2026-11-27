import * as THREE from 'three';
import { box, cyl, cone, sph, merge, paint, xf, lerp, clamp, mulberry, smooth } from './util.js';
import * as M from './models.js';
import * as T from './textures.js';

// End card backdrop: snowy plain, distant settlement with the furnace tower, a survivor thawing a frozen villager.
export class EndScene {
  constructor(sfx) {
    this.sfx = sfx;
    const scene = (this.scene = new THREE.Scene());
    scene.background = new THREE.Color('#d9dde7');
    scene.fog = new THREE.Fog('#dfe3ec', 30, 190);
    this.camera = new THREE.PerspectiveCamera(30, 0.8, 0.5, 300);
    scene.add(new THREE.HemisphereLight('#ffffff', '#b9c4dc', 1.7));
    const sun = new THREE.DirectionalLight('#fff3e6', 1.5);
    sun.position.set(-8, 14, 10); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
    const sc = sun.shadow.camera; sc.left = -8; sc.right = 8; sc.top = 8; sc.bottom = -8; sc.near = 1; sc.far = 50;
    sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.03;
    scene.add(sun);
    const r = mulberry(5);

    const snowTex = T.noiseTexture('#e4e9f3', [['#d2dbec', 160, 8, 26, 0.5], ['#f7f9fd', 200, 5, 16, 0.6]], 30, 9);
    const ground = M.mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshLambertMaterial({ map: snowTex }), false, true);
    ground.rotation.x = -Math.PI / 2; scene.add(ground);
    // trench the characters stand in
    const trench = M.mesh(new THREE.PlaneGeometry(16, 1.5), new THREE.MeshBasicMaterial({ color: '#c3cee6', transparent: true, opacity: 0.55, depthWrite: false }), false, false);
    trench.rotation.x = -Math.PI / 2; trench.rotation.z = 0.06; trench.position.set(0, 0.01, 0.75); scene.add(trench);

    // distant settlement
    const far = [];
    const house = (x, z, w, h, d, ry) => {
      const list = [box(w, h, d, '#7a5646', 0, h / 2, 0), box(w * 1.1, 0.25, d * 1.1, '#eef1f7', 0, h + 0.5, 0),
        xf(paint(new THREE.CylinderGeometry(0.01, w * 0.78, 1.0, 4), '#f1f4fa'), 0, h + 0.5, 0, 0, Math.PI / 4, 0, 1, 1, d / w)];
      for (let i = -1; i <= 1; i++) list.push(box(w * 0.14, h * 0.3, 0.06, '#ffc36b', i * w * 0.28, h * 0.5, d / 2 + 0.02));
      list.forEach((g) => far.push(xf(g, x, 0, z, 0, ry, 0)));
    };
    house(1.2, -52, 4.6, 2.0, 4, 0.1); house(4.6, -55, 4.2, 1.9, 4, -0.15); house(10.2, -53, 4.6, 2.0, 4, 0.2); house(13.6, -56, 4.4, 1.9, 4, 0);
    house(-22, -60, 5, 2.2, 4, 0.2); house(17.5, -54, 4.6, 2.0, 4, -0.1); house(24, -58, 5, 2.3, 4, 0.15); house(-11.5, -62, 4.5, 1.9, 4, -0.2);
    // furnace tower
    const FX = 7.2;
    far.push(cyl(1.9, 2.5, 2.4, 10, '#6b4d44', FX, 1.2, -50)); far.push(cyl(1.4, 1.9, 2.0, 10, '#7d5a4c', FX, 3.4, -50));
    far.push(cyl(2.2, 2.2, 0.3, 10, '#4f3a36', FX, 2.4, -50)); far.push(cone(1.15, 5.2, 8, '#a8432c', FX, 6.9, -50));
    // watch tower
    far.push(box(0.3, 5.6, 0.3, '#6a5a58', -2.2, 2.8, -58)); far.push(box(2.2, 1.2, 2.2, '#7a6660', -2.2, 6.0, -58));
    far.push(box(2.7, 0.25, 2.7, '#eef1f7', -2.2, 6.75, -58)); far.push(sph(0.4, '#ffcf7a', -2.2, 5.1, -58));
    // far ridge + glacier
    far.push(xf(paint(new THREE.ConeGeometry(26, 20, 5), '#c4d0e6'), -62, 9, -105, 0, 0.4, 0));
    far.push(xf(paint(new THREE.ConeGeometry(20, 14, 5), '#d3dcee'), -40, 6.5, -112, 0, 1.1, 0));
    far.push(xf(paint(new THREE.ConeGeometry(30, 12, 5), '#d6deee'), 70, 5.5, -120, 0, 0.2, 0));
    scene.add(M.mesh(merge(far), M.MAT, false, false));
    const glow = merge([cone(0.95, 4.6, 8, '#ff9d3a', FX, 7.2, -49.4), cone(0.55, 3.2, 8, '#ffe29a', FX, 6.9, -48.9)]);
    this.flame = M.mesh(glow, M.GLOW, false, false); scene.add(this.flame);

    // pines
    const spots = [];
    for (let i = 0; i < 60; i++) {
      const x = -70 + r() * 150, z = -30 - r() * 45;
      if (x > -4 && x < 28 && z < -40) continue;
      if (Math.abs(x + 0.45) < 5 && z > -44) continue;
      spots.push([x, z, 0.8 + r() * 0.7]);
    }
    const trees = new THREE.InstancedMesh(M.treeGeometry(), M.MAT, spots.length);
    const d = new THREE.Object3D();
    spots.forEach(([x, z, s], i) => { d.position.set(x, 0, z); d.scale.setScalar(s); d.rotation.y = i; d.updateMatrix(); trees.setMatrixAt(i, d.matrix); });
    trees.frustumCulled = false; scene.add(trees);

    // smoke plume
    const disc = T.softDisc('255,190,170');
    this.smoke = [];
    for (let i = 0; i < 16; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: disc, transparent: true, depthWrite: false, opacity: 0.5 }));
      s.userData.o = i / 16; scene.add(s); this.smoke.push(s);
    }

    // survivor with the thaw horn
    const man = (this.man = M.makeCharacter({ coat: '#6f5646', trim: '#f4f0ea', beard: '#7b5133', belt: '#3f2d27', boots: '#3a2a26', mitt: '#3b3030', scale: 1.1 }));
    man.position.set(-2.1, 0, 0); man.rotation.y = Math.PI / 2 - 0.25;
    const horn = M.mesh(merge([
      cyl(0.09, 0.07, 0.9, 10, '#7b4a3e', 0, 0, 0.1, Math.PI / 2, 0, 0), cyl(0.3, 0.1, 0.55, 12, '#96584a', 0, 0, 0.8, -Math.PI / 2, 0, 0),
      cyl(0.32, 0.32, 0.05, 12, '#5f372f', 0, 0, 1.08, Math.PI / 2, 0, 0),
    ]));
    horn.position.set(0.05, 0.62, 0.42); man.add(horn); this.horn = horn;
    scene.add(man);

    // villager (frozen, then thawed)
    const lady = (this.lady = M.makeCharacter({ coat: '#a51f3e', trim: '#f6f2ee', long: true, pom: false, boots: '#5a2c2c', mitt: '#6a3b33', scale: 1.0 }));
    lady.position.set(-0.1, 0, 0.1); lady.rotation.y = -Math.PI / 2 + 0.5;
    scene.add(lady);
    const iceMat = new THREE.MeshLambertMaterial({ color: '#a9dcfa', emissive: '#3f8fc8', emissiveIntensity: 0.45, transparent: true, opacity: 0.93 });
    const ice = (this.ice = new THREE.Group());
    const iceParts = [cyl(0.42, 0.6, 1.1, 7, '#fff', 0, 0.55, 0), cyl(0.3, 0.42, 0.6, 7, '#fff', 0, 1.4, 0), cone(0.3, 0.45, 6, '#fff', 0, 1.92, 0)];
    for (let i = 0; i < 7; i++) { const a = (i / 7) * 6.283; iceParts.push(cone(0.16, 0.6 + r() * 0.4, 5, '#fff', Math.cos(a) * 0.55, 0.3, Math.sin(a) * 0.55, Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5)); }
    ice.add(M.mesh(merge(iceParts), iceMat, true, false));
    ice.position.copy(lady.position); scene.add(ice);

    // beam + muzzle glow
    const beamMat = new THREE.MeshBasicMaterial({ color: '#cfeeff', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    this.beam = M.mesh(xf(new THREE.CylinderGeometry(0.34, 0.1, 1, 12, 1, true), 0, 0, 0, 0, 0, Math.PI / 2), beamMat, false, false);
    scene.add(this.beam);
    this.muzzle = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.softDisc('190,235,255'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    scene.add(this.muzzle);

    // shards
    this.shardGeo = new THREE.TetrahedronGeometry(0.12);
    this.shards = new THREE.InstancedMesh(this.shardGeo, iceMat, 60);
    this.shards.frustumCulled = false; this.shards.count = 0; scene.add(this.shards);
    this.shardData = [];

    // snowfall
    const n = 260, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = (r() - 0.5) * 30; pos[i * 3 + 1] = r() * 12; pos[i * 3 + 2] = -18 + r() * 28; }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.snow = new THREE.Points(sg, new THREE.PointsMaterial({ map: T.softDisc(), size: 0.16, transparent: true, depthWrite: false, opacity: 0.9 }));
    this.snow.frustumCulled = false; scene.add(this.snow);
    this.t = 0; this.stage = 0;
  }

  reset() {
    this.t = 0; this.stage = 0;
    this.ice.visible = true; this.ice.scale.setScalar(1); this.lady.visible = false;
    this.shards.count = 0; this.shardData = [];
  }

  layout(w, h) {
    const a = w / h, cam = this.camera;
    const land = a > 1.15;
    // keep both characters in frame: at least ~5.6 units across at the characters' depth
    const dist = 12.5;
    let fov = 30;
    const needW = land ? 0 : 5.3;
    const visW = 2 * dist * Math.tan((fov * Math.PI) / 360) * a;
    if (visW < needW) fov = (Math.atan(needW / a / (2 * dist)) * 360) / Math.PI;
    cam.fov = fov; cam.aspect = a;
    cam.position.set(-0.45, 1.95, dist);
    cam.rotation.set(0.03, 0, 0);
    // landscape: characters sit right of centre so the title block can take the left
    if (land) cam.setViewOffset(w, h, -w * 0.2, 0, w, h); else cam.clearViewOffset();
    cam.updateProjectionMatrix();
  }

  update(dt) {
    this.t += dt;
    const t = this.t;
    const mu = this.man.userData, lu = this.lady.userData;
    // survivor: aims, then lowers the horn
    const aim = t < 1.55 ? 1 : 1 - smooth(clamp((t - 1.55) / 0.9, 0, 1));
    mu.arms[0].rotation.x = mu.arms[1].rotation.x = lerp(-0.55, -1.2, aim);
    this.horn.rotation.x = lerp(0.62, 0.0, aim);
    this.horn.position.y = lerp(0.42, 0.62, aim);
    mu.body.position.y = Math.sin(t * 2.2) * 0.012;

    const muzzle = new THREE.Vector3(0, 0, 1.15); this.horn.localToWorld(muzzle);
    const firing = t > 0.25 && t < 1.3;
    this.muzzle.position.copy(muzzle);
    const ms = firing ? 1.0 + Math.sin(t * 40) * 0.2 : Math.max(0, 0.6 - (t - 1.3) * 2);
    this.muzzle.scale.setScalar(Math.max(0.001, ms));
    this.muzzle.visible = t < 1.7;
    const target = new THREE.Vector3(this.lady.position.x - 0.3, 0.95, this.lady.position.z);
    this.beam.visible = firing;
    if (firing) {
      const dv = target.clone().sub(muzzle), len = dv.length();
      this.beam.position.copy(muzzle).addScaledVector(dv, 0.5);
      this.beam.scale.set(len, 1 + Math.sin(t * 50) * 0.15, 1 + Math.sin(t * 50) * 0.15);
      this.beam.rotation.set(0, 0, Math.atan2(dv.y, dv.x));
      this.beam.material.opacity = 0.42 + Math.sin(t * 33) * 0.12;
      if (this.stage === 0) { this.stage = 1; this.sfx.beam(); }
      this.ice.rotation.z = Math.sin(t * 60) * 0.012 * clamp((t - 0.6) * 2, 0, 1);
    }
    // thaw
    if (t > 1.3 && this.stage < 2) {
      this.stage = 2; this.sfx.shatter();
      this.ice.visible = false; this.lady.visible = true;
      for (let i = 0; i < 60; i++) {
        const a = Math.random() * 6.283, sp = 1.5 + Math.random() * 4;
        this.shardData.push({ p: new THREE.Vector3(this.lady.position.x + Math.cos(a) * 0.3, 0.3 + Math.random() * 1.6, this.lady.position.z + Math.sin(a) * 0.3), v: new THREE.Vector3(Math.cos(a) * sp, 1.5 + Math.random() * 3.5, Math.sin(a) * sp * 0.6), r: Math.random() * 6 });
      }
    }
    if (this.stage >= 2) {
      const bow = 1 - smooth(clamp((t - 1.75) / 0.7, 0, 1));
      lu.body.rotation.x = bow * 0.85; lu.body.position.y = 0;
      if (t < 2.95) {
        const k = smooth(clamp((t - 2.0) / 0.5, 0, 1));
        lu.arms[0].rotation.x = lu.arms[1].rotation.x = lerp(-0.4 - bow * 0.8, -1.25, k);
        lu.arms[0].rotation.z = -lerp(0.22, -0.35, k); lu.arms[1].rotation.z = lerp(0.22, -0.35, k);
      } else {
        if (this.stage === 2) { this.stage = 3; this.sfx.cheer(); }
        const k = smooth(clamp((t - 2.95) / 0.3, 0, 1));
        lu.arms[0].rotation.x = lu.arms[1].rotation.x = lerp(-1.25, -2.85, k) + Math.sin(t * 9) * 0.08 * k;
        lu.arms[0].rotation.z = -lerp(-0.35, 0.3, k); lu.arms[1].rotation.z = lerp(-0.35, 0.3, k);
        lu.body.position.y = Math.abs(Math.sin(t * 7)) * 0.05 * k;
      }
      const d = new THREE.Object3D();
      let n = 0;
      for (const s of this.shardData) {
        s.v.y -= 9 * dt; s.p.addScaledVector(s.v, dt);
        if (s.p.y < 0.03) { s.p.y = 0.03; s.v.set(0, 0, 0); s.life = (s.life || 0) + dt; }
        if ((s.life || 0) > 1.2) continue;
        d.position.copy(s.p); d.rotation.set(s.r + t * 5, s.r, t * 3); d.scale.setScalar(1 - (s.life || 0) / 1.2); d.updateMatrix();
        this.shards.setMatrixAt(n++, d.matrix);
      }
      this.shards.count = n; this.shards.instanceMatrix.needsUpdate = true;
    }
    // ambience
    this.flame.scale.y = 1 + Math.sin(t * 11) * 0.06;
    for (const s of this.smoke) {
      const k = (s.userData.o + t * 0.06) % 1;
      s.position.set(7.2 + k * 22 + Math.sin(k * 9 + s.userData.o * 20) * 1.0, 9.5 + k * 22, -50 - k * 6);
      const sz = 2.4 + k * 10; s.scale.set(sz, sz, 1);
      s.material.opacity = 0.5 * Math.sin(Math.min(1, k * 4) * Math.PI * 0.5) * (1 - k);
    }
    const a = this.snow.geometry.attributes.position;
    for (let i = 0; i < a.count; i++) {
      let y = a.getY(i) - dt * (0.9 + (i % 5) * 0.2);
      if (y < 0) y += 12;
      a.setY(i, y); a.setX(i, a.getX(i) + dt * 0.35 * Math.sin(i + t));
    }
    a.needsUpdate = true;
  }
}
