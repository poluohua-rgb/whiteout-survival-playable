import * as THREE from 'three';
import { mulberry } from './util.js';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}
function tex(c, repeat) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); }
  return t;
}

export function noiseTexture(base, specks, repeat, seed = 7) {
  const [c, g] = canvas(256, 256);
  const r = mulberry(seed);
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for (const [col, n, smin, smax, a] of specks) {
    g.fillStyle = col;
    for (let i = 0; i < n; i++) {
      g.globalAlpha = a * (0.4 + 0.6 * r());
      const s = smin + r() * (smax - smin), x = r() * 256, y = r() * 256;
      for (const ox of [-256, 0, 256]) for (const oy of [-256, 0, 256]) {
        g.beginPath(); g.ellipse(x + ox, y + oy, s, s * (0.5 + r() * 0.5), r() * 3, 0, 7); g.fill();
      }
    }
  }
  g.globalAlpha = 1;
  return tex(c, repeat);
}

// Yard ground: dirt with snow creeping in from the edges, baked into one texture.
export function yardTexture(w, d) {
  const S = 56;
  const [c, g] = canvas(Math.round(w * S), Math.round(d * S));
  const r = mulberry(11 + Math.round(w * 7));
  g.fillStyle = '#b48d8d'; g.fillRect(0, 0, c.width, c.height);
  const area = (c.width * c.height) / (700 * 700);
  const specks = [['#c5a2a1', 2600, 1.5, 5, 0.16], ['#9a7478', 2200, 1.5, 5, 0.15], ['#dcc6c4', 1500, 0.8, 2, 0.4], ['#80606a', 1300, 0.8, 2.2, 0.32], ['#c9a9a4', 160, 10, 26, 0.1], ['#a17a80', 120, 10, 30, 0.08]];
  for (const [col, n, smin, smax, a] of specks) {
    g.fillStyle = col;
    for (let i = 0; i < n * area; i++) {
      g.globalAlpha = a * (0.4 + 0.6 * r());
      const s = smin + r() * (smax - smin);
      g.beginPath(); g.ellipse(r() * c.width, r() * c.height, s, s * (0.5 + r() * 0.5), r() * 3, 0, 7); g.fill();
    }
  }
  g.globalAlpha = 1;
  // snow drifting in from the fence line
  const rim = 1.15 * S;
  const edge = (x0, y0, x1, y1, gx, gy) => {
    const gr = g.createLinearGradient(gx > 0 ? x0 : gx < 0 ? x1 : 0, gy > 0 ? y0 : gy < 0 ? y1 : 0, gx > 0 ? x1 : gx < 0 ? x0 : 0, gy > 0 ? y1 : gy < 0 ? y0 : 0);
    gr.addColorStop(0, 'rgba(240,243,249,0.98)'); gr.addColorStop(0.42, 'rgba(236,230,236,0.62)'); gr.addColorStop(1, 'rgba(236,230,236,0)');
    g.fillStyle = gr; g.fillRect(x0, y0, x1 - x0, y1 - y0);
  };
  edge(0, 0, c.width, rim, 0, 1);
  edge(0, c.height - rim, c.width, c.height, 0, -1);
  edge(0, 0, rim, c.height, 1, 0);
  edge(c.width - rim, 0, c.width, c.height, -1, 0);
  g.fillStyle = '#f0f3f9';
  for (let i = 0; i < 1100 * Math.sqrt(area); i++) {
    const side = Math.floor(r() * 4), t = r(), off = Math.pow(r(), 1.7) * rim * 1.5;
    const x = side === 0 ? off : side === 1 ? c.width - off : t * c.width;
    const y = side === 2 ? off : side === 3 ? c.height - off : t * c.height;
    g.globalAlpha = 0.5 * (1 - off / (rim * 1.5));
    g.beginPath(); g.arc(x, y, 3 + r() * 9, 0, 7); g.fill();
  }
  g.globalAlpha = 1;
  return tex(c);
}

function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

const ICONS = {
  coal(g) {
    g.fillStyle = '#fff';
    const poly = (pts) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); };
    poly([[-58, -6], [-34, -44], [8, -46], [30, -14], [16, 26], [-30, 32]]);
    poly([[38, -18], [62, -26], [80, -8], [70, 14], [44, 12]]);
    g.fillStyle = 'rgba(120,96,100,0.55)';
    poly([[8, -46], [30, -14], [16, 26], [26, -10], [44, 12], [38, -18]]);
  },
  upgrade(g) {
    g.fillStyle = '#fff';
    g.beginPath();
    g.moveTo(-62, 6); g.lineTo(-22, -34); g.lineTo(18, 6); g.lineTo(0, 6); g.lineTo(0, 40); g.lineTo(-44, 40); g.lineTo(-44, 6);
    g.closePath(); g.fill();
    g.beginPath();
    g.moveTo(10, -20); g.lineTo(46, -52); g.lineTo(82, -20); g.lineTo(62, -20); g.lineTo(62, 14); g.lineTo(30, 14); g.lineTo(30, -20);
    g.closePath(); g.fill();
  },
  meat(g) {
    g.fillStyle = '#fff';
    g.beginPath(); g.ellipse(-12, 0, 56, 40, -0.25, 0, 7); g.fill();
    g.save(); g.rotate(-0.45); g.fillRect(34, -8, 44, 16);
    g.beginPath(); g.arc(80, -10, 12, 0, 7); g.arc(80, 10, 12, 0, 7); g.fill(); g.restore();
    g.strokeStyle = 'rgba(150,120,122,0.9)'; g.lineWidth = 6;
    g.beginPath(); g.ellipse(-18, 2, 28, 19, -0.25, 0, 7); g.stroke();
    g.beginPath(); g.ellipse(-18, 2, 10, 7, -0.25, 0, 7); g.stroke();
  },
  shirt(g) {
    g.fillStyle = '#fff';
    g.beginPath();
    g.moveTo(-28, -46); g.quadraticCurveTo(0, -28, 28, -46); g.lineTo(78, -22); g.lineTo(60, 8); g.lineTo(40, -2);
    g.lineTo(40, 50); g.lineTo(-40, 50); g.lineTo(-40, -2); g.lineTo(-60, 8); g.lineTo(-78, -22);
    g.closePath(); g.fill();
  },
};

export function drawZone(g, S, { icon, price, plain }) {
  g.clearRect(0, 0, S, S);
  g.save();
  g.translate(S / 2, S / 2);
  const k = S / 512;
  g.scale(k, k);
  g.strokeStyle = '#fff'; g.lineCap = 'round';
  const R = plain ? 150 : 196, cr = plain ? 78 : 110, lw = plain ? 30 : 34;
  g.lineWidth = lw;
  for (let q = 0; q < 4; q++) {
    g.save(); g.rotate((q * Math.PI) / 2);
    g.beginPath(); g.arc(R - cr, -(R - cr), cr, -Math.PI / 2 + 0.22, -0.22); g.stroke();
    const dash = plain ? 44 : 62;
    g.beginPath(); g.moveTo(R, -dash / 2 - (plain ? 0 : 0)); g.lineTo(R, dash / 2); g.stroke();
    g.restore();
  }
  if (icon) { g.save(); g.translate(-6, price ? -40 : 0); g.scale(1.05, 1.05); ICONS[icon](g); g.restore(); }
  if (price) {
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '86px "Russo One", sans-serif';
    g.fillText(price, 6, 74);
  }
  g.restore();
}

export function zoneTexture(opts) {
  const [c, g] = canvas(512, 512);
  drawZone(g, 512, opts);
  const t = tex(c);
  t.userData = { canvas: c, ctx: g, opts };
  return t;
}
export function updateZoneTexture(t, price) {
  const { ctx, opts } = t.userData;
  opts.price = price;
  drawZone(ctx, 512, opts);
  t.needsUpdate = true;
}

export function zoneFillTexture() {
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#fff';
  rr(g, 22, 22, 212, 212, 62); g.fill();
  return tex(c);
}

function drawLogIcon(g) {
  g.save(); g.rotate(-0.5);
  g.fillStyle = '#b9703f'; rr(g, -44, -25, 74, 50, 22); g.fill();
  g.fillStyle = '#8f5230'; g.fillRect(-18, -25, 5, 50); g.fillRect(2, -25, 5, 50);
  g.fillStyle = '#f0c795'; g.beginPath(); g.ellipse(26, 0, 17, 25, 0, 0, 7); g.fill();
  g.strokeStyle = '#c98f55'; g.lineWidth = 4; g.beginPath(); g.ellipse(26, 0, 9, 14, 0, 0, 7); g.stroke();
  g.restore();
}
function drawCoalIcon(g) {
  const poly = (pts, col) => { g.fillStyle = col; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); };
  poly([[-40, 8], [-26, -30], [12, -38], [40, -10], [34, 26], [-8, 36]], '#2b2a31');
  poly([[-26, -30], [12, -38], [4, -8], [-22, -2]], '#57555f');
  poly([[12, -38], [40, -10], [18, 4], [4, -8]], '#3c3a44');
  poly([[-22, -2], [4, -8], [18, 4], [-8, 36], [-40, 8]], '#1d1c22');
}

export function bubbleTexture(kind) {
  const [c, g] = canvas(192, 224);
  g.translate(96, 96);
  if (kind === 'angry') {
    const gr = g.createRadialGradient(-14, -22, 6, 0, 0, 74);
    gr.addColorStop(0, '#ff9a4a'); gr.addColorStop(0.55, '#f2552d'); gr.addColorStop(1, '#c92f1f');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 70, 0, 7); g.fill();
    g.strokeStyle = '#4a1a14'; g.lineWidth = 9; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-46, -26); g.lineTo(-14, -10); g.moveTo(46, -26); g.lineTo(14, -10); g.stroke();
    g.fillStyle = '#4a1a14';
    g.beginPath(); g.arc(-26, 0, 8, 0, 7); g.arc(26, 0, 8, 0, 7); g.fill();
    g.beginPath(); g.arc(0, 46, 24, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
    return tex(c);
  }
  // speech bubble
  g.shadowColor = 'rgba(40,20,30,0.35)'; g.shadowBlur = 10; g.shadowOffsetY = 4;
  g.fillStyle = kind === 'check' ? '#4fd05a' : '#ffffff';
  g.beginPath(); g.arc(0, 0, 72, 0, 7); g.fill();
  g.beginPath(); g.moveTo(-22, 62); g.lineTo(0, 112); g.lineTo(22, 62); g.closePath(); g.fill();
  g.shadowColor = 'transparent';
  if (kind === 'check') {
    g.strokeStyle = '#fff'; g.lineWidth = 9; g.beginPath(); g.arc(0, 0, 62, 0, 7); g.stroke();
    g.lineWidth = 18; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(-32, 2); g.lineTo(-8, 26); g.lineTo(34, -22); g.stroke();
  } else {
    g.strokeStyle = '#e4dcdc'; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, 70, 0, 7); g.stroke();
    g.scale(1.25, 1.25);
    if (kind === 'log') drawLogIcon(g); else drawCoalIcon(g);
  }
  return tex(c);
}

export function softDisc(color = '255,255,255') {
  const [c, g] = canvas(64, 64);
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, `rgba(${color},1)`); gr.addColorStop(0.5, `rgba(${color},0.55)`); gr.addColorStop(1, `rgba(${color},0)`);
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return tex(c);
}

export function arrowTexture() {
  const [c, g] = canvas(128, 160);
  g.translate(64, 80);
  g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(-22, -66); g.lineTo(22, -66); g.lineTo(22, -4); g.lineTo(50, -4); g.lineTo(0, 66); g.lineTo(-50, -4); g.lineTo(-22, -4);
  g.closePath();
  g.fillStyle = '#ffd53a'; g.strokeStyle = '#ffffff'; g.lineWidth = 10; g.stroke(); g.fill();
  g.strokeStyle = 'rgba(120,70,0,0.55)'; g.lineWidth = 3; g.stroke();
  return tex(c);
}
