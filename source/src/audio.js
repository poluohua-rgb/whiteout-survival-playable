// All sound is synthesised with WebAudio; nothing is loaded. Pitches follow the reference ad's effects
// (C6 cash ticks, rising B4-E5-G5-B5-D#6 pick-up pops, A#4 drop pops, F7 build shimmer).
const ARP = [494, 659, 784, 988, 1245];

export class Sfx {
  constructor() { this.ctx = null; this.ok = false; this.last = {}; this.base = 0; this.now = () => performance.now(); }

  unlock() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        const c = new AC();
        this.init(c);
        // iOS: play a silent buffer inside the gesture so the context really starts
        const s = c.createBufferSource(); s.buffer = c.createBuffer(1, 1, 22050); s.connect(c.destination); s.start(0);
      }
      if (this.ctx.state !== 'running') this.ctx.resume();
      this.ok = true;
    } catch (e) { /* audio is optional */ }
  }
  // also used with an OfflineAudioContext to render a run's sound effects to a file
  init(c) {
    this.ctx = c;
    this.master = c.createGain(); this.master.gain.value = 1.5;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.2;
    this.master.connect(comp); comp.connect(c.destination);
    this.noiseBuf = this._noise(2);
    this._ambient();
  }
  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend(); }
  resume() { if (this.ctx && this.ok && this.ctx.state !== 'running') this.ctx.resume(); }

  _noise(sec) {
    const c = this.ctx, b = c.createBuffer(1, c.sampleRate * sec, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  // wind bed plus the steady rasp of the sawmill, which is what fills the reference between effects
  _ambient() {
    const c = this.ctx;
    const src = c.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
    const g = c.createGain(); g.gain.value = 0.2;
    src.connect(lp); lp.connect(g); g.connect(this.master); src.start();
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 2.5;
    const g2 = c.createGain(); g2.gain.value = 0.035;
    const lfo = c.createOscillator(); lfo.frequency.value = 0.13; const lg = c.createGain(); lg.gain.value = 260;
    lfo.connect(lg); lg.connect(bp.frequency); lfo.start();
    src.connect(bp); bp.connect(g2); g2.connect(this.master);
    const saw = c.createBiquadFilter(); saw.type = 'bandpass'; saw.frequency.value = 1500; saw.Q.value = 1.1;
    const sg = c.createGain(); sg.gain.value = 0.0;
    const sl = c.createOscillator(); sl.type = 'triangle'; sl.frequency.value = 1.7; const slg = c.createGain(); slg.gain.value = 0.02;
    const off = c.createConstantSource(); off.offset.value = 0.02;
    sl.connect(slg); slg.connect(sg.gain); off.connect(sg.gain); sl.start(); off.start();
    this.sawLevels = [slg.gain, off.offset];
    src.connect(saw); saw.connect(sg); sg.connect(this.master);
  }
  // the sawmill rasp belongs to the yard, not to the end card
  ambience(on) {
    if (!this.ok || !this.sawLevels) return;
    const t = this.ctx.currentTime + this.base;
    for (const p of this.sawLevels) p.setTargetAtTime(on ? 0.02 : 0, t, 0.25);
  }
  tone(f, dur, gain = 0.15, type = 'sine', when = 0, f2 = 0, attack = 0.004) {
    if (!this.ok) return;
    const c = this.ctx, t = c.currentTime + this.base + when;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  }
  noise(dur, gain, f0, f1, q = 1, type = 'bandpass', when = 0) {
    if (!this.ok) return;
    const c = this.ctx, t = c.currentTime + this.base + when;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
    const fl = c.createBiquadFilter(); fl.type = type; fl.Q.value = q;
    fl.frequency.setValueAtTime(f0, t); if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + Math.min(0.08, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(this.master); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  _gate(name, ms) {
    const n = this.now();
    if (n - (this.last[name] || 0) < ms) return false;
    this.last[name] = n; return true;
  }

  pick(i) {
    if (!this._gate('pick', 45)) return;
    const f = ARP[i % ARP.length];
    this.tone(f, 0.1, 0.3, 'triangle'); this.tone(f * 2, 0.06, 0.1, 'sine');
    this.noise(0.03, 0.05, 9000, 0, 1, 'highpass');
  }
  place(i) {
    if (!this._gate('place', 45)) return;
    this.tone(466, 0.09, 0.3, 'triangle'); this.tone(i % 2 ? 932 : 699, 0.05, 0.1, 'sine');
    this.noise(0.03, 0.05, 6000, 0, 1, 'highpass');
  }
  cash() {
    if (!this._gate('cash', 55)) return;
    this.tone(1047, 0.08, 0.26, 'sine'); this.tone(2094, 0.06, 0.1, 'sine'); this.tone(4188, 0.04, 0.04, 'sine');
  }
  unlock2() {
    this.tone(234, 0.22, 0.4, 'sine', 0, 110);
    this.tone(1047, 0.5, 0.26, 'sine'); this.tone(1319, 0.45, 0.12, 'sine', 0.05); this.tone(1568, 0.5, 0.1, 'sine', 0.1);
    for (let i = 0; i < 9; i++) this.tone(2859 * (i % 2 ? 1 : 2.06), 0.14, 0.05, 'sine', 0.25 + i * 0.085);
    this.noise(0.9, 0.09, 1200, 9000, 0.8, 'bandpass', 0.05);
  }
  check() { this.tone(784, 0.1, 0.14, 'triangle'); this.tone(1175, 0.16, 0.14, 'triangle', 0.08); }
  car() { if (this._gate('car', 900)) { this.tone(64, 0.95, 0.16, 'sawtooth', 0, 50, 0.25); this.noise(0.95, 0.07, 220, 110, 0.7, 'lowpass'); } }
  step() { if (this._gate('step', 230)) this.noise(0.05, 0.035, 1800, 900, 1.2, 'bandpass'); }
  whiteout() {
    this.noise(1.6, 0.3, 500, 6000, 0.6, 'bandpass'); this.noise(1.6, 0.14, 4000, 12000, 0.5, 'highpass', 0.1);
    this.tone(187, 0.5, 0.25, 'sine', 0, 90);
  }
  beam() {
    for (let i = 0; i < 10; i++) this.tone(3200 + Math.random() * 2600, 0.12, 0.035, 'sine', i * 0.06);
    this.noise(0.7, 0.07, 5000, 9000, 3, 'bandpass');
  }
  shatter() {
    this.noise(0.35, 0.3, 4500, 0, 0.7, 'highpass'); this.tone(427, 0.25, 0.2, 'triangle', 0, 228);
    for (let i = 0; i < 12; i++) this.tone(2500 + Math.random() * 4500, 0.09 + Math.random() * 0.1, 0.05, 'sine', 0.02 + Math.random() * 0.3);
  }
  cheer() {
    [233, 349, 466, 587, 698].forEach((f, i) => this.tone(f, 1.1, 0.07, 'triangle', i * 0.05, 0, 0.05));
    this.tone(932, 0.5, 0.08, 'sine', 0.3);
  }
  tap() { this.tone(660, 0.06, 0.1, 'triangle'); }
}
