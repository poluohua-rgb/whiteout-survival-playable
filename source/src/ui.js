const UI_MAX = 1; // HUD, hint and joystick scale on large windows
const END_MAX = 1.4; // end-card title and badges scale on large windows
// DOM overlay: money counter, drag hint, joystick, white flash, end card.
const $ = (id) => document.getElementById(id);

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
const HAND = `<svg viewBox="0 0 64 72" xmlns="http://www.w3.org/2000/svg"><path d="M22 34V12a6 6 0 0 1 12 0v18l14 3.500c4 1 6.500 4.500 6 8.500l-2 16c-.600 5-5 9-10 9H30c-3.500 0-6.700-1.700-8.600-4.600L9.500 44.500c-1.800-2.800-.800-6.500 2.200-8 2.400-1.200 5.300-.600 7 1.500z" fill="#fff" stroke="#3a3f55" stroke-width="3.500" stroke-linejoin="round"/></svg>`;
const REPLAY = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 5V1.500L6.500 6 12 10.500V7a5.500 5.500 0 1 1-5.500 5.500h-2A7.500 7.500 0 1 0 12 5z" fill="#fff"/></svg>`;

export class UI {
  constructor() {
    this.root = $('ui');
    this.root.innerHTML = `
<div id="hud"><div id="money"><div id="bill">${BILL_SVG}</div><div id="pill"><span id="amount">25</span></div></div></div>
<div id="hint"><div id="hint-hand">${HAND}</div><div id="hint-text">DRAG TO MOVE</div><div id="hint-keys">or use W A S D / arrow keys</div></div>
<div id="stick"><div id="knob"></div></div>
<div id="edge"></div>
<div id="white"></div>
<div id="end">
  <img id="end-tag" alt="Play free now">
  <div id="cta"><div class="badge" id="b-apple"><i>${APPLE}</i><span><small>Download on the</small><b>App Store</b></span></div>
  <div class="badge" id="b-google"><i>${GPLAY}</i><span><small>GET IT ON</small><b>Google Play</b></span></div></div>
  <button id="replay" aria-label="Play again">${REPLAY}</button>
</div>`;
    $('end-tag').src = drawTagline().toDataURL('image/png');
    this.amount = $('amount'); this.shown = -1;
    this.hint = $('hint'); this.stick = $('stick'); this.knob = $('knob');
    this.white = $('white'); this.end = $('end'); this.edge = $('edge');
  }
  layout(w, h) {
    const a = w / h, land = a > 1.15, tall = a < 0.62;
    const base = Math.min(w / 720, h / 900);
    // Small screens shrink the HUD less than linearly so it stays readable on phones.
    // Large windows keep the size of the 720 x 900 reference frame instead of growing with the window.
    const ui = Math.max(0.6, Math.min(UI_MAX, base < 1 ? Math.pow(base, 0.6) : base));
    // End card: the tagline is --tw wide. Landscape keeps it in the left 46% of the screen, tall phones use the full width.
    const tw = land ? 470 : tall ? 440 : 520;
    const eu = Math.min(END_MAX, land ? Math.min((w * 0.46) / tw, h / 540) : tall ? Math.min(w / 480, h / 900) : base);
    document.body.classList.toggle('tall', tall);
    const s = document.documentElement.style;
    s.setProperty('--ui', ui.toFixed(4)); s.setProperty('--eu', eu.toFixed(4)); s.setProperty('--tw', tw);
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
  flash(on) { this.white.classList.toggle('on', on); }
  showEnd(on) {
    this.end.classList.toggle('on', on);
    document.body.classList.toggle('ended', on);
  }
}
