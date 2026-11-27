// One gameplay screenshot and one end-card screenshot per viewport, from the final single-file build.
// usage: node tools-viewports.mjs <html> <outDir>
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const [file, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const V = [[390, 844, 3, true, 'phone-portrait'], [844, 390, 3, true, 'phone-landscape'], [820, 1180, 2, true, 'tablet-portrait'], [1180, 820, 2, true, 'tablet-landscape'], [1440, 900, 1, false, 'desktop'], [1920, 1080, 1, false, 'desktop']];
const res = [];
for (const [W, H, D, touch, kind] of V) {
  const b = await puppeteer.launch({ executablePath: '/usr/local/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--mute-audio'] });
  const p = await b.newPage();
  await p.setViewport({ width: W, height: H, deviceScaleFactor: D, hasTouch: touch, isMobile: touch });
  const errs = [], ext = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('request', (r) => { const u = r.url(); if (!u.startsWith('file:') && !u.startsWith('data:') && !u.startsWith('blob:')) ext.push(u); });
  await p.goto('file://' + fs.realpathSync(file) + '?q=0');
  await p.waitForFunction('window.__playable && window.__playable.mode==="play"');
  // advance one second of game time frame by frame, then capture the opening view
  await p.evaluate(() => { const P = window.__playable; P.setManual(true); for (let i = 0; i < 30; i++) P.step(1 / 30); });
  const g = `${out}/whiteout-survival-playable-${W}x${H}-${kind}-gameplay.png`;
  await p.screenshot({ path: g });
  const info = await p.evaluate(() => {
    const c = document.getElementById('c'), P = window.__playable;
    const box = (id) => { const r = document.getElementById(id).getBoundingClientRect(); return r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight && r.width > 0; };
    const pp = P.project(P.game.player.x, P.game.player.z);
    return { inner: [innerWidth, innerHeight], dpr: devicePixelRatio, canvas: [c.width, c.height], hudInside: box('hud'), playerOnScreen: pp[0] > 0 && pp[0] < innerWidth && pp[1] > 0 && pp[1] < innerHeight, pxPerUnit: +P.view.px.toFixed(1) };
  });
  // jump to the end card (the win hook) and let its animation finish
  await p.evaluate(() => { const P = window.__playable; P.game.hooks.onWin(); for (let i = 0; i < 160; i++) P.step(1 / 30); });
  const e = `${out}/whiteout-survival-playable-${W}x${H}-${kind}-endcard.png`;
  await p.screenshot({ path: e });
  info.endInside = await p.evaluate(() => ['end-logo', 'end-tag', 'search', 'b-apple', 'b-google', 'replay'].every((id) => { const r = document.getElementById(id).getBoundingClientRect(); return r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight && r.width > 0; }));
  res.push({ viewport: `${W}x${H}@${D}`, kind, ...info, errors: errs, externalRequests: ext });
  await Promise.race([b.close(), new Promise((r) => setTimeout(r, 4000))]);
}
console.log(JSON.stringify(res, null, 1));
fs.writeFileSync(`${out}/viewports.json`, JSON.stringify(res, null, 1));
process.exit(0);
