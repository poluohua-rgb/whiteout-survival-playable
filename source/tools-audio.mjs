// Re-renders a run's sound effects from its logged events: node tools-audio.mjs <events.json> <out.wav> [html]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const [evFile, out, html = 'dist/index.html'] = process.argv.slice(2);
const ev = JSON.parse(fs.readFileSync(evFile, 'utf8'));
const browser = await puppeteer.launch({ executablePath: '/usr/local/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
await page.goto('file://' + fs.realpathSync(html));
await page.waitForFunction('window.__playable && window.__playable.mode === "play"');
const b64 = await page.evaluate(async (ev) => {
    const P = window.__playable, log = ev.log, dur = ev.clock + 1.5, sr = 48000;
    const ctx = new OfflineAudioContext(2, Math.ceil(dur * sr), sr);
    const s = new P.Sfx(); s.init(ctx); s.ok = true;
    for (const [t, m, a] of log) { s.base = t; s.now = () => t * 1000; s[m](...a); }
    const buf = await ctx.startRendering();
    const n = buf.length, L = buf.getChannelData(0), R = buf.getChannelData(1);
    const o = new DataView(new ArrayBuffer(44 + n * 4));
    const w = (p, str) => { for (let i = 0; i < str.length; i++) o.setUint8(p + i, str.charCodeAt(i)); };
    w(0, 'RIFF'); o.setUint32(4, 36 + n * 4, true); w(8, 'WAVEfmt '); o.setUint32(16, 16, true); o.setUint16(20, 1, true); o.setUint16(22, 2, true);
    o.setUint32(24, sr, true); o.setUint32(28, sr * 4, true); o.setUint16(32, 4, true); o.setUint16(34, 16, true); w(36, 'data'); o.setUint32(40, n * 4, true);
    for (let i = 0; i < n; i++) { o.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i])) * 32767, true); o.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R[i])) * 32767, true); }
    const u8 = new Uint8Array(o.buffer); let bin = '';
    for (let i = 0; i < u8.length; i += 32768) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 32768));
    return btoa(bin);
}, ev);
fs.writeFileSync(out, Buffer.from(b64, 'base64'));
await browser.close();
