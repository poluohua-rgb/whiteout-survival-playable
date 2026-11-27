const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// DOM overlay: money counter, logo watermark, drag hint, joystick, whiteout, end card.
const $ = (id) => document.getElementById(id);

function star(g, x, y, r, col) {
  g.save(); g.translate(x, y); g.fillStyle = col;
  for (let i = 0; i < 6; i++) {
    g.rotate(Math.PI / 3);
    g.beginPath(); g.moveTo(0, -r * 0.12); g.lineTo(r * 0.36, -r * 0.62); g.lineTo(0, -r); g.lineTo(-r * 0.36, -r * 0.62); g.closePath(); g.fill();
  }
  g.beginPath(); g.arc(0, 0, r * 0.2, 0, 7); g.fill();
  g.restore();
}

export function drawLogo() {
  const c = document.createElement('canvas'); c.width = 1000; c.height = 380;
  const g = c.getContext('2d');
  g.textBaseline = 'alphabetic'; g.lineJoin = 'round';
  const F1 = '176px "Lilita One", sans-serif', F2 = '112px "Lilita One", sans-serif';
  // WHITEOUT
  g.font = F1;
  const word = 'WHITEOUT';
  const sp = -4;
  const widths = [...word].map((ch) => g.measureText(ch).width + sp);
  const total = widths.reduce((a, b) => a + b, 0);
  let x = (1000 - total) / 2;
  const y = 196;
  const xs = [];
  for (const w of widths) { xs.push(x); x += w; }
  const pass = (fill, dy, stroke, lw) => {
    [...word].forEach((ch, i) => {
      if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.strokeText(ch, xs[i], y + dy); }
      g.fillStyle = fill; g.fillText(ch, xs[i], y + dy);
    });
  };
  g.shadowColor = 'rgba(70,90,130,0.35)'; g.shadowBlur = 16; g.shadowOffsetY = 6;
  pass('#b8c6dd', 9, '#b8c6dd', 10);
  g.shadowColor = 'transparent';
  pass('#ffffff', 0, '#ffffff', 6);
  // the second O carries a snowflake
  const ox = xs[5] + (widths[5] - sp) / 2, oy = y - 62;
  g.fillStyle = '#fff'; g.beginPath(); g.ellipse(ox, oy, 36, 44, 0, 0, 7); g.fill();
  star(g, ox, oy, 40, '#8e9fbd');
  // icicles under a few letters
  g.fillStyle = '#ffffff';
  for (const [ix, h] of [[xs[0] + 30, 26], [xs[3] + 44, 20], [xs[6] + 30, 24], [xs[7] + 60, 30]]) {
    g.beginPath(); g.moveTo(ix - 9, y - 2); g.lineTo(ix + 9, y - 2); g.lineTo(ix, y + h); g.closePath(); g.fill();
  }
  // SURVIVAL (the I is a thermometer)
  g.font = F2;
  const w2 = 'SURVIVAL';
  const ww = [...w2].map((ch, i) => (i === 4 ? 40 : g.measureText(ch).width) + 1);
  const t2 = ww.reduce((a, b) => a + b, 0);
  let x2 = (1000 - t2) / 2 + 26;
  const y2 = 300;
  const xs2 = [];
  for (const w of ww) { xs2.push(x2); x2 += w; }
  const pass2 = (fill, dy, lw) => {
    [...w2].forEach((ch, i) => {
      if (i === 4) return;
      g.strokeStyle = fill; g.lineWidth = lw; g.strokeText(ch, xs2[i], y2 + dy);
      g.fillStyle = fill; g.fillText(ch, xs2[i], y2 + dy);
    });
  };
  g.shadowColor = 'rgba(120,80,0,0.3)'; g.shadowBlur = 10; g.shadowOffsetY = 4;
  pass2('#d99a16', 7, 8);
  g.shadowColor = 'transparent';
  pass2('#ffd43b', 0, 4);
  const tx = xs2[4] + 19;
  g.fillStyle = '#d99a16'; g.beginPath(); g.roundRect(tx - 11, y2 - 96, 22, 86, 11); g.fill();
  g.fillStyle = '#ffd43b'; g.beginPath(); g.roundRect(tx - 11, y2 - 102, 22, 84, 11); g.fill();
  g.strokeStyle = '#c98a10'; g.lineWidth = 3;
  for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(tx - 10, y2 - 84 + i * 14); g.lineTo(tx - 2, y2 - 84 + i * 14); g.stroke(); }
  const gl = g.createRadialGradient(tx, y2 - 14, 2, tx, y2 - 14, 34);
  gl.addColorStop(0, 'rgba(255,255,255,1)'); gl.addColorStop(0.35, 'rgba(255,238,150,0.95)'); gl.addColorStop(1, 'rgba(255,214,60,0)');
  g.fillStyle = gl; g.beginPath(); g.arc(tx, y2 - 14, 34, 0, 7); g.fill();
  g.fillStyle = '#fff6c8'; g.beginPath(); g.arc(tx, y2 - 14, 13, 0, 7); g.fill();
  return c;
}

export function drawTagline() {
  const c = document.createElement('canvas'); c.width = 1000; c.height = 150;
  const g = c.getContext('2d');
  g.font = '104px "Russo One", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  const t = 'PLAY FREE NOW';
  g.shadowColor = 'rgba(120,190,255,0.9)'; g.shadowBlur = 22;
  g.strokeStyle = '#8eb4d9'; g.lineWidth = 10; g.strokeText(t, 500, 80);
  g.shadowColor = 'transparent';
  g.strokeStyle = '#6f97c2'; g.lineWidth = 5; g.strokeText(t, 500, 82);
  const gr = g.createLinearGradient(0, 30, 0, 125);
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.5, '#e6f3ff'); gr.addColorStop(1, '#a9cdeb');
  g.fillStyle = gr; g.fillText(t, 500, 78);
  // frosty facets
  g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(255,255,255,0.55)';
  for (let i = 0; i < 26; i++) { const x = 40 + i * 37; g.beginPath(); g.moveTo(x, 30); g.lineTo(x + 22, 30); g.lineTo(x + 4, 78); g.closePath(); g.fill(); }
  return c;
}

const BILL_SVG = `<svg viewBox="0 0 100 70" xmlns="http://www.w3.org/2000/svg">
<g transform="rotate(-9 50 35)"><rect x="12" y="14" width="82" height="46" rx="3" fill="#8fdc63" stroke="#6ec24a" stroke-width="2"/></g>
<rect x="4" y="12" width="88" height="48" rx="3" fill="#56c245"/>
<rect x="8" y="16" width="80" height="40" rx="2" fill="#a9e977"/>
<path d="M8 16h9a9 9 0 0 1-9 9zM88 16h-9a9 9 0 0 0 9 9zM8 56h9a9 9 0 0 0-9-9zM88 56h-9a9 9 0 0 1 9-9z" fill="#56c245"/>
<circle cx="48" cy="36" r="14.5" fill="#4fbf42"/>
<text x="48" y="44.5" text-anchor="middle" font-family="'Lilita One',sans-serif" font-size="24" fill="#b9f08a">$</text></svg>`;

const APPLE = `<svg viewBox="0 0 24 28" xmlns="http://www.w3.org/2000/svg"><path fill="#fff" d="M17.3 14.9c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.3-.9-1.7 0-3.3 1-4.2 2.5-1.8 3.1-.5 7.7 1.3 10.2.8 1.2 1.9 2.6 3.2 2.5 1.3-.1 1.8-.8 3.3-.8s2 .8 3.3.8c1.4 0 2.3-1.2 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9-.1 0-2.700-1.100-2.700-3.900zM14.800 7.200c.7-.9 1.200-2 1-3.200-1 .1-2.200.7-3 1.600-.6.700-1.200 1.900-1 3 1.100.1 2.300-.6 3-1.400z"/></svg>`;
const GPLAY = `<svg viewBox="0 0 24 26" xmlns="http://www.w3.org/2000/svg"><path d="M2 1.500v23l11.500-11.500z" fill="#3bccff"/><path d="M2 1.500l11.500 11.500 4-4z" fill="#46e07a"/><path d="M2 24.500l11.500-11.500 4 4z" fill="#f4475b"/><path d="M17.500 9l5 2.900c.9.500.9 1.700 0 2.200l-5 2.900-4-4z" fill="#ffd34a"/></svg>`;
const MAG = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="6.500" fill="none" stroke="#a9afc4" stroke-width="2.200"/><path d="M15 15l6 6" stroke="#a9afc4" stroke-width="2.400" stroke-linecap="round"/></svg>`;
const HAND = `<svg viewBox="0 0 64 72" xmlns="http://www.w3.org/2000/svg"><path d="M22 34V12a6 6 0 0 1 12 0v18l14 3.500c4 1 6.500 4.500 6 8.500l-2 16c-.600 5-5 9-10 9H30c-3.500 0-6.700-1.700-8.600-4.600L9.500 44.500c-1.800-2.800-.800-6.500 2.200-8 2.400-1.200 5.300-.600 7 1.500z" fill="#fff" stroke="#3a3f55" stroke-width="3.500" stroke-linejoin="round"/></svg>`;
const REPLAY = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 5V1.500L6.500 6 12 10.500V7a5.500 5.500 0 1 1-5.500 5.500h-2A7.500 7.500 0 1 0 12 5z" fill="#fff"/></svg>`;

export class UI {
  constructor() {
    this.root = $('ui');
    this.root.innerHTML = `
<div id="hud"><div id="money"><div id="bill">${BILL_SVG}</div><div id="pill"><span id="amount">25</span></div></div><img id="mark" alt=""></div>
<div id="hint"><div id="hint-hand">${HAND}</div><div id="hint-text">DRAG TO MOVE</div><div id="hint-keys">or use W A S D / arrow keys</div></div>
<div id="stick"><div id="knob"></div></div>
<div id="edge"></div>
<div id="white"></div>
<div id="end">
  <img id="end-logo" alt="Whiteout Survival"><img id="end-tag" alt="Play free now">
  <div id="cta"><div id="search"><span id="typed"></span><i>${MAG}</i></div>
  <div id="badges"><div class="badge" id="b-apple"><i>${APPLE}</i><span><small>Download on the</small><b>App Store</b></span></div>
  <div class="badge" id="b-google"><i>${GPLAY}</i><span><small>GET IT ON</small><b>Google Play</b></span></div></div></div>
  <button id="replay" aria-label="Play again">${REPLAY}</button>
</div>`;
    const logo = drawLogo().toDataURL('image/png');
    $('mark').src = logo; $('end-logo').src = logo;
    $('end-tag').src = drawTagline().toDataURL('image/png');
    this.amount = $('amount'); this.shown = -1;
    this.hint = $('hint'); this.stick = $('stick'); this.knob = $('knob');
    this.white = $('white'); this.end = $('end'); this.typed = $('typed'); this.edge = $('edge');
  }
  layout(w, h) {
    const a = w / h, land = a > 1.15, tall = a < 0.62;
    const base = Math.min(w / 720, h / 900);
    // small screens shrink the HUD less than linearly so it stays readable on phones
    const ui = Math.max(0.6, Math.min(1.5, base < 1 ? Math.pow(base, 0.6) : base));
    const eu = land ? Math.min((w * 0.46) / 430, h / 540) : tall ? Math.min(w / 480, h / 900) : base;
    document.body.classList.toggle('tall', tall);
    const s = document.documentElement.style;
    s.setProperty('--ui', ui.toFixed(4)); s.setProperty('--eu', eu.toFixed(4));
    document.body.classList.toggle('land', land);
    this.uiScale = ui;
  }
  setMoney(v) {
    if (v === this.shown) return;
    this.shown = v; this.amount.textContent = v;
    this.amount.classList.remove('bump'); void this.amount.offsetWidth; this.amount.classList.add('bump');
  }
  showHint(on) { this.hint.classList.toggle('on', on); }
  stickAt(x, y, dx, dy, on) {
    this.stick.classList.toggle('on', on);
    if (!on) return;
    this.stick.style.transform = `translate(${x}px,${y}px)`;
    this.knob.style.transform = `translate(${dx}px,${dy}px)`;
  }
  edgeArrow(on, x, y, ang) {
    this.edge.classList.toggle('on', on);
    if (on) this.edge.style.transform = `translate(${x}px,${y}px) rotate(${ang}rad)`;
  }
  whiteout(on) { this.white.classList.toggle('on', on); }
  showEnd(on) {
    this.end.classList.toggle('on', on);
    document.body.classList.toggle('ended', on);
    this.typed.textContent = '';
    this._typeT = on ? 0 : -1;
  }
  // the search bar types the game's name, starting 0.9 s after the end card appears
  update(dt) {
    if (this._typeT < 0) return;
    this._typeT += dt;
    const full = 'Whiteout Survival';
    const n = clamp(Math.floor((this._typeT - 0.9) / 0.032), 0, full.length);
    if (this.typed.textContent.length !== n) this.typed.textContent = full.slice(0, n);
    if (n >= full.length) this._typeT = -1;
  }
}
