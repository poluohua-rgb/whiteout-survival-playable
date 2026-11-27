// Gameplay and end-card screenshots plus on-screen size measurements for a list of viewports.
// usage: node tools-fit.mjs --file <html> --out <dir> --prefix <name-> [--only desktop|iphone|<WxH@D>,...] [--skip <WxH@D>,...] [--jobs 3]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a.startsWith('--')) { const n = process.argv[i + 1]; if (n === undefined || n.startsWith('--')) args[a.slice(2)] = true; else { args[a.slice(2)] = n; i++; } }
}
const file = path.resolve(args.file || 'dist/index.html');
const out = args.out || 'verify-out';
const prefix = args.prefix || 'fit-';
fs.mkdirSync(out, { recursive: true });

// [width, height, dpr, touch, kind, safe-area insets (top, right, bottom, left)]
const ALL = [
  [1366, 768, 1, false, 'desktop'], [1440, 900, 1, false, 'desktop'], [1920, 1080, 1, false, 'desktop'], [2560, 1440, 1, false, 'desktop'],
  [1440, 900, 2, false, 'desktop'], [1920, 1080, 2, false, 'desktop'], [2560, 1440, 2, false, 'desktop'],
  [375, 667, 2, true, 'iphone-portrait', [20, 0, 0, 0]], [667, 375, 2, true, 'iphone-landscape', [0, 0, 0, 0]],
  [390, 844, 3, true, 'iphone-portrait', [47, 0, 34, 0]], [844, 390, 3, true, 'iphone-landscape', [0, 47, 21, 47]],
  [430, 932, 3, true, 'iphone-portrait', [59, 0, 34, 0]], [932, 430, 3, true, 'iphone-landscape', [0, 59, 21, 59]],
  [720, 900, 1, false, 'reference'],
];
const match = (list, [W, H, D, , kind]) => list.split(',').some((o) => kind.startsWith(o) || o === `${W}x${H}@${D}`);
const V = ALL.filter((v) => (!args.only || match(args.only, v)) && !(args.skip && match(args.skip, v)));

async function shoot([W, H, D, touch, kind, safe]) {
  const b = await puppeteer.launch({ executablePath: '/usr/local/bin/google-chrome', headless: 'new', protocolTimeout: 900000,
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--mute-audio', '--hide-scrollbars'] });
  const p = await b.newPage();
  await p.setViewport({ width: W, height: H, deviceScaleFactor: D, hasTouch: touch, isMobile: touch });
  let safeApplied = false;
  if (safe && safe.some((v) => v)) {
    try {
      const cdp = await p.createCDPSession();
      await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: safe[0], right: safe[1], bottom: safe[2], left: safe[3] } });
      safeApplied = true;
    } catch (e) { /* older Chrome: insets stay 0 */ }
  }
  const errs = [], ext = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('request', (r) => { const u = r.url(); if (!u.startsWith('file:') && !u.startsWith('data:') && !u.startsWith('blob:')) ext.push(u); });
  await p.goto('file://' + file + '?q=0');
  await p.waitForFunction('window.__playable && window.__playable.mode==="play"', { timeout: 180000 });
  await p.evaluate(() => { const P = window.__playable; P.setManual(true); for (let i = 0; i < 15; i++) P.step(1 / 15); });
  const name = `${prefix}${W}x${H}@${D}-${kind}`;
  await p.screenshot({ path: `${out}/${name}-gameplay.png` });
  const rect = (id) => { const e = document.getElementById(id); if (!e) return null; const r = e.getBoundingClientRect(); return r.width > 0 ? [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)] : null; };
  const inside = (r, W, H, s) => !r || (r[0] >= (s ? s[3] : 0) && r[1] >= (s ? s[0] : 0) && r[0] + r[2] <= W - (s ? s[1] : 0) && r[1] + r[3] <= H - (s ? s[2] : 0));
  const play = await p.evaluate((rectSrc) => {
    const rect = eval(rectSrc), P = window.__playable, cs = getComputedStyle(document.documentElement);
    const ui = +cs.getPropertyValue('--ui'), pp = P.project(P.game.player.x, P.game.player.z);
    return { pxPerUnit: +P.view.px.toFixed(1), worldUnitsTall: +(innerHeight / P.view.px).toFixed(1), worldUnitsWide: +(innerWidth / P.view.px).toFixed(1),
      uiScale: ui, money: rect('money'), mark: rect('mark'), hint: rect('hint'), stickDiameter: Math.round(132 * ui), player: pp.map(Math.round), title: document.title,
      safe: ['--st', '--sr', '--sb', '--sl'].map((k) => cs.getPropertyValue(k).trim()) };
  }, rect.toString());
  await p.evaluate(() => { const P = window.__playable; P.game.hooks.onWin(); for (let i = 0; i < 90; i++) P.step(1 / 15); });
  await p.screenshot({ path: `${out}/${name}-endcard.png` });
  const end = await p.evaluate((rectSrc) => {
    const rect = eval(rectSrc), cs = getComputedStyle(document.documentElement);
    const o = { euScale: +cs.getPropertyValue('--eu'), mode: window.__playable.mode, text: document.getElementById('end').innerText.replace(/\s+/g, ' ').trim() };
    for (const id of ['end-logo', 'end-tag', 'search', 'cta', 'b-apple', 'b-google', 'replay']) o[id] = rect(id);
    return o;
  }, rect.toString());
  const endIds = ['end-logo', 'end-tag', 'search', 'b-apple', 'b-google', 'replay'];
  const res = { viewport: `${W}x${H}@${D}`, kind, safeAreaEmulated: safeApplied ? safe : null, play, end,
    hudInside: inside(play.money, W, H, safeApplied && safe) && inside(play.mark, W, H, safeApplied && safe),
    endInside: endIds.every((id) => inside(end[id], W, H, safeApplied && safe)),
    errors: errs, externalRequests: ext };
  await Promise.race([b.close(), new Promise((r) => setTimeout(r, 4000))]);
  return res;
}

const jobs = +(args.jobs || 3), results = new Array(V.length);
let next = 0;
await Promise.all(Array.from({ length: jobs }, async () => { while (next < V.length) { const i = next++; const t = Date.now(); try { results[i] = await shoot(V[i]); } catch (e) { results[i] = { viewport: `${V[i][0]}x${V[i][1]}@${V[i][2]}`, kind: V[i][4], failed: e.message }; } console.error(results[i].viewport, V[i][4], Math.round((Date.now() - t) / 1000) + 's'); } }));
// merge with earlier runs of the same prefix so viewports can be captured in batches
const mf = `${out}/${prefix}metrics.json`;
const prev = fs.existsSync(mf) ? JSON.parse(fs.readFileSync(mf, 'utf8')).filter((r) => !results.some((n) => n.viewport === r.viewport && n.kind === r.kind)) : [];
fs.writeFileSync(mf, JSON.stringify([...prev, ...results], null, 1));
console.log(JSON.stringify(results.map((r) => r.failed ? r : ({ vp: r.viewport, kind: r.kind, px: r.play.pxPerUnit, tall: r.play.worldUnitsTall, wide: r.play.worldUnitsWide, ui: r.play.uiScale, eu: r.end.euScale, hud: r.hudInside, end: r.endInside, err: r.errors.length, ext: r.externalRequests.length }))));
process.exit(0);
