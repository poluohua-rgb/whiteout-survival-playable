// Plays the built single-file playable from start to end card with real input events.
// usage: node tools-play.mjs --file <html> | --url <http://127.0.0.1:port/> --w 390 --h 844 --input touch|mouse|keys --out <dir> --tag <name> [--dpr 2] [--cast file.webm] [--headed] [--replay] [--resizeTo WxH]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a.startsWith('--')) { const n = process.argv[i + 1]; if (n === undefined || n.startsWith('--')) args[a.slice(2)] = true; else { args[a.slice(2)] = n; i++; } }
}
const W = +(args.w || 720), H = +(args.h || 900), dpr = +(args.dpr || 1);
const inputType = args.input || 'mouse';
const file = path.resolve(args.file || 'dist/index.html');
const out = args.out || 'verify-out';
const target = args.url || 'file://' + file;
const tag = args.tag || `${W}x${H}-${inputType}`;
fs.mkdirSync(out, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: '/usr/local/bin/google-chrome', headless: args.headed ? false : 'new',
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required',
    '--hide-scrollbars', '--mute-audio', `--window-size=${W},${H + (args.headed ? 90 : 0)}`, ...(args.headed ? ['--window-position=0,0', '--disable-infobars'] : [])],
  defaultViewport: null,
});
const page = (await browser.pages())[0] || (await browser.newPage());
const touch = inputType === 'touch';
await page.setViewport({ width: W, height: H, deviceScaleFactor: dpr, hasTouch: touch, isMobile: touch });
const log = [];
const requests = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') log.push(m.type() + ': ' + m.text()); });
page.on('pageerror', (e) => log.push('PAGEERROR: ' + e.message));
page.on('request', (r) => { const u = r.url(); requests.push(u.slice(0, 80)); });
await page.goto(target + (args.query || ''));
await page.waitForFunction('window.__playable && window.__playable.mode === "play"', { timeout: 20000 });

const STEP = args.step ? 1 / +(args.fps || 30) : 0;
const cdp = await page.createCDPSession();
let frameN = 0;
if (args.frames) fs.mkdirSync(args.frames, { recursive: true });
const grab = async () => {
  if (!args.frames) return;
  const r = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 90, optimizeForSpeed: true });
  fs.writeFileSync(path.join(args.frames, `f${String(frameN++).padStart(5, '0')}.jpg`), Buffer.from(r.data, 'base64'));
};
const stepN = async (n) => { for (let i = 0; i < n; i++) { await page.evaluate((dt) => window.__playable.step(dt), STEP); await grab(); } };
const wait = async (ms) => { if (STEP) await stepN(Math.round(ms / 1000 / STEP)); else await sleep(ms); };
if (STEP) await page.evaluate(() => window.__playable.setManual(true));
if (args.audio) {
  // log every sound effect call with its game-clock time so the run's audio can be rendered afterwards
  await page.evaluate(() => {
    const P = window.__playable, sfx = P.sfx; window.__sfxLog = []; let depth = 0;
    for (const m of ['pick', 'place', 'cash', 'unlock2', 'check', 'car', 'step', 'flash', 'beam', 'shatter', 'cheer', 'tap', 'noise', 'tone', 'ambience']) {
      const orig = sfx[m].bind(sfx);
      sfx[m] = (...a) => { if (depth === 0 && sfx.ok) window.__sfxLog.push([P.clock, m, a]); depth++; try { return orig(...a); } finally { depth--; } };
    }
  });
}
let recorder = null;
if (args.cast) recorder = await page.screencast({ path: args.cast, speed: 1 });

const shots = [];
const shot = async (name) => { const p = path.join(out, `${tag}-${name}.png`); await page.screenshot({ path: p }); shots.push(p); return p; };
const state = () => page.evaluate(() => {
  const P = window.__playable, g = P.game, p = g.player, t = g.guideTarget;
  return {
    mode: P.mode, t: g.t, x: p.x, z: p.z, carry: p.carry, type: p.carryType, money: g.money,
    tx: t ? t.x : null, tz: t ? t.z : null,
    coalBuilt: g.coalBuilt, expanded: g.expanded, z25: g.zone25.remaining, z40: g.zone40.remaining,
    wood: g.wood.stock, coal: g.coal.stock, woodCash: g.wood.cash, coalCash: g.coal.cash,
    ws: g.stats.woodSales, cs: g.stats.coalSales, zoom: P.view.zoom,
    audio: P.audioState ? P.audioState() : null, fps: P.fps || 0,
  };
});

await wait(900);
await shot('01-start');
const R = { x: 0.793, z: 0.609 }, F = { x: 0.609, z: -0.793 };
const cx = Math.round(W * 0.5), cy = Math.round(H * 0.72), rad = Math.round(Math.min(W, H) * 0.11);
let down = false, heldKeys = new Set();
const KEYSETS = [['KeyW', 'KeyA', 'KeyS', 'KeyD'], ['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight']];
async function steer(jx, jy) {
  if (inputType === 'mouse') {
    if (!down) { await page.mouse.move(cx, cy); await page.mouse.down(); down = true; }
    await page.mouse.move(cx + jx * rad, cy + jy * rad);
  } else if (inputType === 'touch') {
    if (!down) { await page.touchscreen.touchStart(cx, cy); down = true; }
    await page.touchscreen.touchMove(cx + jx * rad, cy + jy * rad);
  } else {
    const ks = KEYSETS[Math.floor(Date.now() / 5000) % 2];
    const want = new Set();
    // keys are on/off: use the direction only, the analogue slow-down near a target does not apply
    const m = Math.hypot(jx, jy);
    if (m > 0.01) { const ux = jx / m, uy = jy / m; if (uy < -0.38) want.add(ks[0]); if (ux < -0.38) want.add(ks[1]); if (uy > 0.38) want.add(ks[2]); if (ux > 0.38) want.add(ks[3]); }
    for (const k of heldKeys) if (!want.has(k)) { await page.keyboard.up(k); heldKeys.delete(k); }
    for (const k of want) if (!heldKeys.has(k)) { await page.keyboard.down(k); heldKeys.add(k); }
  }
}
async function release() {
  if (inputType === 'mouse' && down) await page.mouse.up();
  if (inputType === 'touch' && down) await page.touchscreen.touchEnd();
  for (const k of heldKeys) await page.keyboard.up(k);
  heldKeys.clear(); down = false;
}

const done = new Set();
// in realtime the player is stopped while a screenshot is taken, so the run does not drift during the capture
const mile = async (name, cond) => { if (cond && !done.has(name)) { done.add(name); if (!STEP) { await release(); await sleep(150); } await shot(name); return true; } return false; };
const t0 = Date.now();
let tCoalG = 0, tExpG = 0;
let resizeInfo = null;
let last = null, stuckT = 0, nudge = 0, nudgeDir = 1, s, tExpand = 0, tCoal = 0, lastRelT = 0, lastRelease = Date.now(), resized = false;
const timeline = [];
while (Date.now() - t0 < +(args.limit || 240) * 1000) {
  s = await state();
  if (s.mode !== 'play') break;
  if (s.tx !== null) {
    let dx = s.tx - s.x, dz = s.tz - s.z;
    const d = Math.hypot(dx, dz) || 1;
    dx /= d; dz /= d;
    if (last && Math.hypot(s.x - last.x, s.z - last.z) < 0.02 && d > 1.2) stuckT++; else stuckT = 0;
    if (stuckT > 8) { nudge = 10; nudgeDir = -nudgeDir; stuckT = 0; }
    if (nudge > 0) { nudge--; const px = -dz * nudgeDir, pz = dx * nudgeDir; dx = px * 0.9 + dx * 0.2; dz = pz * 0.9 + dz * 0.2; }
    let jx = dx * R.x + dz * R.z, jy = -(dx * F.x + dz * F.z);
    const k = d < 0.2 ? 0 : Math.max(0.15, Math.min(1, d / 2.2));
    await steer(jx * k, jy * k);
  } else await steer(0, 0);
  last = s;
  // lift and press again every few seconds, the way a thumb does
  if ((STEP ? s.t - lastRelT > 7 : Date.now() - lastRelease > 7000)) { await release(); lastRelease = Date.now(); lastRelT = s.t; await wait(120); }
  if (await mile('02-pay25', s.z25 < 20 && s.z25 > 0)) timeline.push(['pay25', s.t]);
  if (s.coalBuilt && !tCoal) { tCoal = Date.now(); tCoalG = s.t; timeline.push(['coalBuilt', s.t]); }
  if (tCoal && (STEP ? s.t - tCoalG > 0.7 : Date.now() - tCoal > 700)) await mile('03-coal-built', true);
  if (await mile('04-logs', s.type === 'log' && s.carry >= 18)) timeline.push(['logs', s.t]);
  if (await mile('05-wood-counter', s.wood >= 10)) timeline.push(['woodCounter', s.t]);
  if (await mile('06-customer-paid', s.ws >= 1 && s.woodCash >= 6)) timeline.push(['customerPaid', s.t]);
  if (await mile('07-coal-carry', s.type === 'coal' && s.carry >= 12)) timeline.push(['coalCarry', s.t]);
  if (await mile('08-coal-counter', s.coal >= 8)) timeline.push(['coalCounter', s.t]);
  if (await mile('09-car-paid', s.cs >= 1 && s.coalCash >= 6)) timeline.push(['carPaid', s.t]);
  if (await mile('10-cash', s.money >= 20 && s.coalBuilt)) timeline.push(['cash20', s.t]);
  if (await mile('11-upgrade-pay', s.z40 < 30 && s.z40 > 0)) timeline.push(['pay40', s.t]);
  if (s.expanded && !tExpand) { tExpand = Date.now(); tExpG = s.t; timeline.push(['expanded', s.t]); }
  if (tExpand && (STEP ? s.t - tExpG > 1.3 : Date.now() - tExpand > 1300)) await mile('12-expanded', true);
  if (args.resizeTo && !resized && s.coalBuilt && s.type === 'log' && s.carry >= 6) {
    resized = true;
    const [rw, rh] = args.resizeTo.split('x').map(Number);
    await page.setViewport({ width: rw, height: rh, deviceScaleFactor: dpr, hasTouch: touch, isMobile: touch });
    // keep playing in the rotated layout for a moment so the screenshot shows a frame rendered after the resize
    await sleep(500); if (STEP) await stepN(12); else await sleep(1200);
    const rs = await page.evaluate(() => { const c = document.querySelector('canvas'), P = window.__playable; return { inner: [innerWidth, innerHeight], canvas: [c.width, c.height], css: [c.clientWidth, c.clientHeight], mode: P.mode, t: P.game.t }; });
    resizeInfo = rs;
    await shot(`resized-${rw}x${rh}`);
    if (STEP) await stepN(12); else await sleep(1200);
    await page.setViewport({ width: W, height: H, deviceScaleFactor: dpr, hasTouch: touch, isMobile: touch });
    await sleep(400); if (STEP) await stepN(2);
  }
  if (STEP) await stepN(2); else await sleep(+(args.poll || 45));
}
await release();
const playTime = s ? s.t : -1;
const final = await page.evaluate(() => ({ mode: window.__playable.mode }));
let endOk = false, replayOk = null;
if (final.mode !== 'play') {
  if (STEP) { for (let i = 0; i < 90 && (await page.evaluate(() => window.__playable.mode)) !== 'end'; i++) await stepN(1); }
  else await page.waitForFunction('window.__playable.mode === "end"', { timeout: 8000 });
  await wait(1100); await shot('13-endcard-a');
  await wait(2600); await shot('14-endcard-b');
  if (STEP) await wait(+(args.tail || 1500));
  endOk = await page.evaluate(() => {
    const vis = (id) => { const e = document.getElementById(id); if (!e) return false; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 4 && r.height > 4 && cs.visibility !== 'hidden' && cs.display !== 'none' && r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1; };
    return { tag: vis('end-tag'), apple: vis('b-apple'), google: vis('b-google'), replay: vis('replay'), text: document.getElementById('end').innerText.replace(/\s+/g, ' ').trim(), title: document.title };
  });
  if (args.replay) {
    const r = await page.evaluate(() => { const b = document.getElementById('replay').getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; });
    if (touch) await page.touchscreen.tap(r[0], r[1]); else await page.mouse.click(r[0], r[1]);
    await wait(900);
    const st = await state();
    replayOk = st.mode === 'play' && st.money === 25 && !st.coalBuilt;
    await shot('15-after-replay');
  }
}
if (recorder) await recorder.stop();
if (args.audio) {
  const b64 = await page.evaluate(async () => {
    const P = window.__playable, log = window.__sfxLog, dur = P.clock + 1.5, sr = 48000;
    const ctx = new OfflineAudioContext(2, Math.ceil(dur * sr), sr);
    const s = new P.Sfx(); s.init(ctx); s.ok = true;
    for (const [t, m, a] of log) { s.base = t; s.now = () => t * 1000; s[m](...a); }
    const buf = await ctx.startRendering();
    const n = buf.length, L = buf.getChannelData(0), R = buf.getChannelData(1);
    const out = new DataView(new ArrayBuffer(44 + n * 4));
    const w = (o, str) => { for (let i = 0; i < str.length; i++) out.setUint8(o + i, str.charCodeAt(i)); };
    w(0, 'RIFF'); out.setUint32(4, 36 + n * 4, true); w(8, 'WAVEfmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 2, true);
    out.setUint32(24, sr, true); out.setUint32(28, sr * 4, true); out.setUint16(32, 4, true); out.setUint16(34, 16, true); w(36, 'data'); out.setUint32(40, n * 4, true);
    for (let i = 0; i < n; i++) { out.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i])) * 32767, true); out.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R[i])) * 32767, true); }
    const u8 = new Uint8Array(out.buffer); let bin = '';
    for (let i = 0; i < u8.length; i += 32768) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 32768));
    return JSON.stringify({ wav: btoa(bin), events: log.length, clock: P.clock, log });
  });
  const o = JSON.parse(b64);
  fs.writeFileSync(args.audio, Buffer.from(o.wav, 'base64'));
  fs.writeFileSync(args.audio + '.events.json', JSON.stringify({ clock: o.clock, log: o.log }));
  console.log('audio events', o.events, 'clock', o.clock.toFixed(2));
}
const ext = requests.filter((u) => !u.startsWith('file:') && !u.startsWith('data:') && !u.startsWith('blob:') && !(args.url && u.startsWith(new URL(args.url).origin)));
const quality = await page.evaluate(() => window.__playable.quality);
const result = { tag, quality, frames: frameN, stepped: !!STEP, viewport: `${W}x${H}@${dpr}`, input: inputType, file: target, reachedEnd: final.mode !== 'play', gameSeconds: +playTime.toFixed(1), wallSeconds: Math.round((Date.now() - t0) / 1000), timeline: timeline.map(([n, t]) => `${n}@${t.toFixed(1)}`).join(' '), endCard: endOk, replayOk, resize: resizeInfo, audio: s && s.audio, fps: s && s.fps, requests: requests.length, externalRequests: ext, errors: log, shots: shots.length };
console.log(JSON.stringify(result, null, 1));
fs.writeFileSync(path.join(out, `${tag}-result.json`), JSON.stringify(result, null, 1));
await Promise.race([browser.close(), sleep(4000)]);
process.exit(0);
