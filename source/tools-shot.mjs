// usage: node tools-shot.mjs <out.png> [w] [h] [waitMs] [evalJs]
import puppeteer from 'puppeteer-core';
const [out, w = '720', h = '900', wait = '2500', js = ''] = process.argv.slice(2);
const browser = await puppeteer.launch({ executablePath: '/usr/local/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required', `--window-size=${w},${h}`] });
const page = await browser.newPage();
await page.setViewport({ width: +w, height: +h, deviceScaleFactor: 1 });
const logs = [];
page.on('console', (m) => logs.push(m.type() + ': ' + m.text()));
page.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message + '\n' + e.stack));
page.on('request', (r) => { if (!r.url().startsWith('file:') && !r.url().startsWith('data:')) logs.push('REQUEST: ' + r.url()); });
await page.goto('file://' + process.cwd() + '/dist/index.html');
await new Promise((r) => setTimeout(r, +wait));
if (js) { const res = await page.evaluate(js); if (res !== undefined) console.log('eval:', JSON.stringify(res)); await new Promise((r) => setTimeout(r, 600)); }
await page.screenshot({ path: out });
console.log(logs.join('\n'));
await browser.close();
