import * as THREE from 'three';
import { L, CAM } from './layout.js';
import { clamp, lerp } from './util.js';
import { buildWorld } from './world.js';
import { Game } from './game.js';
import { Sfx } from './audio.js';
import { UI } from './ui.js';
import { EndScene } from './endscene.js';
import { loadPlayer, makePlayer } from './player.js';
import * as T from './textures.js';

// Set to a store link to make the end-card buttons navigate. Left empty so the file never touches the network.
const CTA_URL = '';

const canvas = document.getElementById('c');
const sfx = new Sfx();
let renderer, ui, scene, world, game, endScene, camera, snow, playerTemplate;
let mode = 'play'; // play | flash | end
let view = { w: 1, h: 1, dist: 25, Hs: CAM.designH, px: 66, zoom: 1 };
const camTarget = new THREE.Vector3();
const input = { x: 0, y: 0 };
const pointer = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
const keys = new Set();
let lastInputT = 0, started = false, clock = 0, modeT = 0;

const WIDE_ZOOM = 1; // the reference keeps one zoom level for the whole run
const PX_MAX = 66; // CSS px per world unit in the 720 x 900 reference frame
const HS_MAX = 22; // most world height shown before the world is allowed to grow again
let fpsAvg = 60;

function disposeScene(s) {
  s.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.isSkinnedMesh) o.skeleton.dispose();
    const m = o.material;
    if (m && m !== undefined) (Array.isArray(m) ? m : [m]).forEach((mm) => { if (mm.map) mm.map.dispose(); mm.dispose(); });
  });
}

function newGame() {
  if (scene) disposeScene(scene);
  scene = new THREE.Scene();
  world = buildWorld(scene);
  if (quality > 0) world.sun.shadow.mapSize.setScalar(1024);
  game = new Game(scene, world, sfx, makePlayer(playerTemplate), { onWin: startFlash });
  // drifting snow
  const n = 240, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 34; pos[i * 3 + 1] = Math.random() * 14; pos[i * 3 + 2] = (Math.random() - 0.5) * 34; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  snow = new THREE.Points(g, new THREE.PointsMaterial({ map: T.softDisc(), size: 0.17, transparent: true, depthWrite: false, opacity: 0.95 }));
  snow.frustumCulled = false; snow.renderOrder = 15;
  scene.add(snow);
  camTarget.set(game.player.x, 0.6, game.player.z); view.zoom = 1;
  mode = 'play'; modeT = 0; started = false; lastInputT = clock;
  ui.setMoney(game.money);
  ui.showEnd(false); ui.flash(false); ui.showHint(true);
  layout();
}

function layout() {
  const w = Math.max(1, window.innerWidth), h = Math.max(1, window.innerHeight);
  view.w = w; view.h = h;
  const dpr = Math.min(window.devicePixelRatio || 1, quality === 0 ? 2 : quality === 1 ? 1.5 : 1);
  renderer.setPixelRatio(dpr);
  renderer.setSize(w, h, false);
  const a = w / h;
  // Portrait narrower than the 4:5 reference keeps the reference's width and shows more world above and below.
  // Wider screens show more world to the sides and zoom in a little so the action does not shrink.
  let Hs;
  // very tall phones also move in a little, since they have height to spare
  if (a <= 0.8) Hs = Math.min(CAM.designW / a, CAM.designH * 1.9) * lerp(1, 0.86, clamp((0.8 - a) / 0.3, 0, 1));
  else Hs = CAM.designH * lerp(1, 0.64, clamp((a - 0.8) / 1.0, 0, 1));
  // Large windows (desktop, tablets) show more of the world instead of magnifying it: the world is never drawn
  // larger than in the 720 x 900 reference frame, until HS_MAX units of it are on screen.
  Hs = Math.max(Hs, Math.min(h / PX_MAX, HS_MAX));
  view.Hs = Hs;
  if (snow) { const k = Math.max(1, (Hs * a) / 30); snow.scale.set(k, 1, k); }
  view.dist = Hs / (2 * Math.tan((CAM.fov * Math.PI) / 360));
  view.px = h / Hs;
  camera.aspect = a; camera.updateProjectionMatrix();
  ui.layout(w, h);
  endScene.layout(w, h);
}

function placeCamera(dt, snap) {
  const p = game.player;
  // the reference pulls the camera back to about 0.66x once the first load of logs is on its way to the counter
  const zt = game.wide ? WIDE_ZOOM : 1;
  view.zoom = snap ? zt : lerp(view.zoom, zt, Math.min(1, dt * 1.6));
  const Hs = view.Hs / view.zoom, d = Hs / (2 * Math.tan((CAM.fov * Math.PI) / 360));
  view.px = view.h / Hs;
  scene.fog.near = d + 26; scene.fog.far = d + 95;
  game.bubbleScale = clamp(46 / view.px, 1, 1.9);
  const lead = Hs * 0.065 / Math.sin(CAM.pitch);
  const tx = p.x + CAM.F.x * lead, tz = p.z + CAM.F.z * lead;
  const k = snap ? 1 : Math.min(1, dt * 5);
  camTarget.x = lerp(camTarget.x, tx, k); camTarget.z = lerp(camTarget.z, tz, k);
  const cp = Math.cos(CAM.pitch), sp = Math.sin(CAM.pitch);
  camera.position.set(camTarget.x - CAM.F.x * cp * d, camTarget.y + sp * d, camTarget.z - CAM.F.z * cp * d);
  camera.lookAt(camTarget);
  world.sun.target.position.copy(camTarget);
  world.sun.position.copy(camTarget).add(world.sunOffset);
}

function updateSnow(dt) {
  const a = snow.geometry.attributes.position;
  for (let i = 0; i < a.count; i++) {
    let y = a.getY(i) - dt * (1.1 + (i % 7) * 0.22);
    if (y < 0) y += 14;
    a.setY(i, y);
    a.setX(i, a.getX(i) + dt * (0.5 + Math.sin(i * 1.3 + clock) * 0.4));
    if (a.getX(i) > 17) a.setX(i, a.getX(i) - 34);
  }
  a.needsUpdate = true;
  snow.position.set(camTarget.x, 0, camTarget.z);
}

function readInput() {
  let x = 0, y = 0;
  if (pointer.id !== null) {
    const max = 62 * ui.uiScale;
    let dx = pointer.x - pointer.ox, dy = pointer.y - pointer.oy;
    const d = Math.hypot(dx, dy);
    if (d > max) { dx *= max / d; dy *= max / d; }
    x = dx / max; y = dy / max;
    ui.stickAt(pointer.ox, pointer.oy, dx, dy, true);
  } else {
    ui.stickAt(0, 0, 0, 0, false);
    if (keys.has('ArrowLeft') || keys.has('KeyA')) x -= 1;
    if (keys.has('ArrowRight') || keys.has('KeyD')) x += 1;
    if (keys.has('ArrowUp') || keys.has('KeyW')) y -= 1;
    if (keys.has('ArrowDown') || keys.has('KeyS')) y += 1;
    const d = Math.hypot(x, y);
    if (d > 1) { x /= d; y /= d; }
  }
  input.x = x; input.y = y;
  if (Math.hypot(x, y) > 0.1) { lastInputT = clock; started = true; }
}

const _v = new THREE.Vector3();
function updateEdgeArrow() {
  const gt = mode === 'play' ? game.guideTarget : null;
  if (!gt) return ui.edgeArrow(false);
  _v.set(gt.x, 1.0, gt.z).project(camera);
  const m = 0.86;
  if (Math.abs(_v.x) <= m && Math.abs(_v.y) <= m && _v.z < 1) return ui.edgeArrow(false);
  const ang = Math.atan2(-_v.y, _v.x);
  const k = m / Math.max(Math.abs(_v.x), Math.abs(_v.y));
  ui.edgeArrow(true, ((_v.x * k + 1) / 2) * view.w, ((1 - _v.y * k) / 2) * view.h, ang);
}

function startFlash() {
  if (mode !== 'play') return;
  mode = 'flash'; modeT = 0;
  ui.flash(true); ui.showHint(false);
  sfx.flash(); sfx.ambience(false);
  pointer.id = null;
}

let last = 0, manual = false;
function frame(now) {
  requestAnimationFrame(frame);
  const raw = Math.max(0.001, (now - last) / 1000) || 0.016;
  last = now;
  if (manual) return;
  fpsAvg += (1 / raw - fpsAvg) * 0.05;
  watchSpeed(raw);
  tick(Math.min(0.05, raw));
}
function tick(dt) {
  clock += dt; modeT += dt;
  if (mode === 'play' || mode === 'flash') {
    readInput();
    if (mode === 'flash') { input.x = 0; input.y = 0; }
    game.update(dt, input);
    placeCamera(dt, false);
    updateSnow(dt * (mode === 'flash' ? 6 : 1));
    ui.setMoney(game.moneyShown);
    ui.showHint(mode === 'play' && (!started || clock - lastInputT > 6));
    updateEdgeArrow();
    renderer.render(scene, camera);
    if (mode === 'flash' && modeT > 0.75) {
      mode = 'end'; modeT = 0;
      endScene.reset(); ui.edgeArrow(false); ui.stickAt(0, 0, 0, 0, false);
      ui.showEnd(true); ui.flash(false);
    }
  } else {
    endScene.update(dt);
    renderer.render(endScene.scene, endScene.camera);
  }
}

// Quality steps down (never back up) when the device cannot hold about 24 fps:
// 0 = soft shadows, up to 2x pixel ratio; 1 = plain shadows, up to 1.5x; 2 = no shadows, 1x.
let quality = 0, qualityPinned = false, slowT = 0, warmT = 0, frameMs = 16;
function setQuality(q) {
  quality = clamp(q, 0, 2);
  renderer.shadowMap.enabled = quality < 2;
  renderer.shadowMap.type = quality === 0 ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
  const refresh = (sc) => sc && sc.traverse((o) => {
    if (o.isLight && o.shadow) { o.shadow.mapSize.setScalar(quality === 0 ? 2048 : 1024); if (o.shadow.map) { o.shadow.map.dispose(); o.shadow.map = null; } }
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { m.needsUpdate = true; });
  });
  refresh(scene); refresh(endScene && endScene.scene);
  layout();
}
function watchSpeed(raw) {
  if (qualityPinned || quality >= 2 || raw > 0.5) return;
  warmT += raw;
  frameMs += (raw * 1000 - frameMs) * 0.08;
  if (warmT < 1.5) return;
  slowT = frameMs > 42 ? slowT + raw : 0;
  if (slowT > 1.5) { slowT = 0; warmT = 0; frameMs = 16; setQuality(quality + 1); }
}

function bindInput() {
  const el = document.getElementById('ui');
  const down = (e) => {
    sfx.unlock();
    if (mode !== 'play') return;
    if (pointer.id !== null) return;
    pointer.id = e.pointerId; pointer.ox = pointer.x = e.clientX; pointer.oy = pointer.y = e.clientY;
    try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    e.preventDefault();
  };
  const move = (e) => { if (e.pointerId === pointer.id) { pointer.x = e.clientX; pointer.y = e.clientY; e.preventDefault(); } };
  const up = (e) => { if (e.pointerId === pointer.id) pointer.id = null; };
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener('lostpointercapture', up);
  // some mobile browsers only start audio from touchend/click
  for (const ev of ['touchend', 'click']) window.addEventListener(ev, () => sfx.unlock(), { passive: true });
  for (const ev of ['touchmove', 'gesturestart', 'contextmenu', 'dragstart', 'selectstart']) window.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
  window.addEventListener('keydown', (e) => {
    if (e.code.startsWith('Arrow') || ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'].includes(e.code)) { sfx.unlock(); keys.add(e.code); e.preventDefault(); }
    if (mode === 'end' && (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyR') && modeT > 1.2) replay();
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => { keys.clear(); pointer.id = null; });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { sfx.suspend(); keys.clear(); pointer.id = null; } else { sfx.resume(); last = performance.now(); } });
  const relayout = () => { layout(); if (mode !== 'end') placeCamera(0, true); };
  window.addEventListener('resize', relayout);
  window.addEventListener('orientationchange', () => setTimeout(relayout, 60));
  if (window.visualViewport) window.visualViewport.addEventListener('resize', relayout);

  document.getElementById('replay').addEventListener('click', (e) => { e.stopPropagation(); replay(); });
  for (const id of ['b-apple', 'b-google', 'end-tag']) {
    document.getElementById(id).addEventListener('click', () => { sfx.tap(); if (CTA_URL) window.open(CTA_URL, '_blank', 'noopener'); });
  }
}
function replay() { sfx.unlock(); sfx.tap(); sfx.ambience(true); newGame(); placeCamera(0, true); }

async function boot() {
  try {
    await Promise.all([document.fonts.load('40px "Lilita One"'), document.fonts.load('40px "Russo One"')]);
  } catch (e) { /* fall back to system fonts */ }
  const Q = new URLSearchParams(location.search);
  playerTemplate = await loadPlayer();
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  camera = new THREE.PerspectiveCamera(CAM.fov, 0.8, 1, 400);
  ui = new UI();
  endScene = new EndScene(sfx);
  bindInput();
  newGame();
  placeCamera(0, true);
  document.body.classList.add('ready');
  // ?q=0|1|2 pins the render quality (used by the verification scripts so screenshots do not depend on the test machine's speed)
  if (Q.get('q') !== null) { qualityPinned = true; setQuality(+Q.get('q') || 0); placeCamera(0, true); }
  // Debug/test handle (read-only use by the verification scripts).
  window.__playable = {
    get mode() { return mode; },
    get game() { return game; },
    get view() { return view; },
    get renderer() { return renderer; }, get scene() { return scene; }, get camera() { return camera; }, get world() { return world; },
    get fps() { return fpsAvg; },
    get quality() { return quality; },
    // frame-by-frame capture: stop the realtime loop and advance everything, CSS animations included, by dt seconds
    setManual(on) { manual = !!on; sfx.now = on ? () => clock * 1000 : () => performance.now(); },
    get sfx() { return sfx; }, get clock() { return clock; }, Sfx,
    step(dt) {
      for (const a of document.getAnimations()) {
        if (a.playState !== 'paused') a.pause();
        a.currentTime = (Number(a.currentTime) || 0) + dt * 1000;
        const end = a.effect && a.effect.getComputedTiming().endTime;
        if (Number.isFinite(end) && a.currentTime >= end) a.finish();
      }
      tick(dt);
    },
    audioState() { return sfx.ctx ? sfx.ctx.state : 'none'; },
    project(x, z, y = 0) { const v = new THREE.Vector3(x, y, z).project(camera); return [((v.x + 1) / 2) * view.w, ((1 - v.y) / 2) * view.h]; },
    L,
  };
  requestAnimationFrame((t) => { last = t; frame(t); });
}
boot().catch((e) => {
  const f = document.getElementById('fail');
  if (f) { f.style.display = 'flex'; f.textContent += ' (' + (e && e.message) + ')'; }
  console.error(e);
});
