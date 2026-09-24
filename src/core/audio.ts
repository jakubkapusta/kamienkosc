// Fully procedural sound: every effect is synthesized, nothing is loaded.
interface ToneOpt { type?: OscillatorType; vol?: number; attack?: number; slide?: number; when?: number; wet?: boolean }
interface NoiseOpt { freq?: number; q?: number; vol?: number; type?: BiquadFilterType; slideTo?: number; when?: number }

class Sfx {
  ac: AudioContext | null = null;
  private out!: GainNode;
  private wet!: GainNode;
  private noiseBuf!: AudioBuffer;
  private last = new Map<string, number>();
  on = true;

  constructor() {
    try {
      this.on = localStorage.getItem('kamienkosc.sound') !== '0';
    } catch {
      /* storage unavailable */
    }
  }

  unlock() {
    if (this.ac) {
      if (this.ac.state === 'suspended') this.ac.resume();
      return;
    }
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ac = new AC();
      this.ac = ac;
      this.out = ac.createGain();
      this.out.gain.value = 0.55;
      const comp = ac.createDynamicsCompressor();
      this.out.connect(comp).connect(ac.destination);
      const rev = ac.createConvolver();
      const len = ac.sampleRate * 1.8;
      const ir = ac.createBuffer(2, len, ac.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = ir.getChannelData(ch);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
      }
      rev.buffer = ir;
      this.wet = ac.createGain();
      this.wet.gain.value = 0.28;
      this.wet.connect(rev).connect(this.out);
      this.noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const nd = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    } catch {
      this.ac = null;
    }
  }

  toggle() {
    this.on = !this.on;
    try {
      localStorage.setItem('kamienkosc.sound', this.on ? '1' : '0');
    } catch {
      /* ignore */
    }
    return this.on;
  }

  private ok(key: string, gap = 0.03) {
    if (!this.on || !this.ac) return false;
    const now = this.ac.currentTime;
    if ((this.last.get(key) ?? -1) > now - gap) return false;
    this.last.set(key, now);
    return true;
  }

  private tone(f: number, dur: number, o: ToneOpt = {}) {
    const ac = this.ac!;
    const t0 = ac.currentTime + (o.when ?? 0);
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = o.type ?? 'sine';
    osc.frequency.setValueAtTime(f, t0);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, f + o.slide), t0 + dur);
    const v = o.vol ?? 0.2;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(v, t0 + (o.attack ?? 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(this.out);
    if (o.wet !== false) g.connect(this.wet);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  private noise(dur: number, o: NoiseOpt = {}) {
    const ac = this.ac!;
    const t0 = ac.currentTime + (o.when ?? 0);
    const src = ac.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ac.createBiquadFilter();
    f.type = o.type ?? 'bandpass';
    f.frequency.setValueAtTime(o.freq ?? 1000, t0);
    if (o.slideTo) f.frequency.exponentialRampToValueAtTime(o.slideTo, t0 + dur);
    f.Q.value = o.q ?? 1;
    const g = ac.createGain();
    g.gain.setValueAtTime(o.vol ?? 0.2, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(this.out);
    g.connect(this.wet);
    src.start(t0, Math.random() * 0.5);
    src.stop(t0 + dur + 0.05);
  }

  match(level: number) {
    if (!this.ok('match', 0.05)) return;
    const scale = [0, 3, 5, 7, 10, 12, 15, 17, 19, 22, 24];
    const n = scale[Math.min(level - 1, scale.length - 1)];
    const f = 440 * Math.pow(2, n / 12);
    this.tone(f, 0.5, { vol: 0.16 });
    this.tone(f * 2, 0.3, { type: 'triangle', vol: 0.05 });
    this.tone(f * 3.01, 0.18, { vol: 0.025 });
  }
  swap() {
    if (this.ok('swap')) this.noise(0.14, { freq: 2000, q: 0.7, vol: 0.09, slideTo: 500 });
  }
  bad() {
    if (this.ok('bad')) this.tone(150, 0.2, { type: 'square', vol: 0.04, slide: -50, wet: false });
  }
  explode() {
    if (!this.ok('explode', 0.08)) return;
    this.noise(0.7, { freq: 1200, type: 'lowpass', vol: 0.4, slideTo: 60 });
    this.tone(120, 0.45, { vol: 0.3, slide: -85 });
  }
  hit() {
    if (!this.ok('hit', 0.06)) return;
    this.tone(95, 0.2, { vol: 0.4, slide: -55, wet: false });
    this.noise(0.09, { freq: 2600, vol: 0.14 });
  }
  coin() {
    if (!this.ok('coin', 0.07)) return;
    this.tone(1318, 0.09, { type: 'square', vol: 0.025 });
    this.tone(1976, 0.2, { type: 'square', vol: 0.025, when: 0.06 });
  }
  tick(c: number) {
    if (!this.ok('tick', 0.035)) return;
    this.tone([880, 740, 660, 990][c] ?? 880, 0.08, { type: 'triangle', vol: 0.04 });
  }
  cast(elem: number) {
    if (!this.ok('cast', 0.1)) return;
    const base = [220, 330, 165, 440, 196][elem] ?? 220;
    this.tone(base, 0.7, { type: 'sawtooth', vol: 0.05, slide: base * 2, attack: 0.08 });
    this.tone(base * 1.5, 0.8, { type: 'triangle', vol: 0.08, slide: base * 3, attack: 0.1 });
    this.noise(0.6, { freq: 3000, q: 2, vol: 0.06, slideTo: 8000 });
  }
  fire() {
    if (this.ok('fire', 0.1)) this.noise(0.9, { freq: 600, type: 'lowpass', vol: 0.35, slideTo: 3000 });
  }
  zap() {
    if (!this.ok('zap', 0.08)) return;
    this.noise(0.3, { freq: 5000, type: 'highpass', vol: 0.2 });
    this.tone(1400, 0.25, { type: 'sawtooth', vol: 0.05, slide: -1200, wet: false });
  }
  heal() {
    if (!this.ok('heal', 0.2)) return;
    [0, 4, 7, 12].forEach((n, i) => this.tone(523 * Math.pow(2, n / 12), 0.5, { when: i * 0.06, vol: 0.08 }));
  }
  shield() {
    if (!this.ok('shield', 0.2)) return;
    this.tone(330, 0.6, { type: 'triangle', vol: 0.12, slide: 110 });
    this.tone(495, 0.7, { vol: 0.08, when: 0.05 });
  }
  extra() {
    if (!this.ok('extra', 0.3)) return;
    [0, 4, 7, 12, 16].forEach((n, i) => this.tone(659 * Math.pow(2, n / 12), 0.35, { when: i * 0.065, vol: 0.1, type: 'triangle' }));
  }
  birth() {
    if (this.ok('birth', 0.1)) this.tone(1046, 0.6, { vol: 0.1, slide: 1046 });
  }
  win() {
    if (!this.ok('win', 1)) return;
    [0, 4, 7, 12, 7, 12, 16, 19].forEach((n, i) => this.tone(392 * Math.pow(2, n / 12), 0.5, { when: i * 0.1, vol: 0.12, type: i % 2 ? 'triangle' : 'sine' }));
  }
  lose() {
    if (!this.ok('lose', 1)) return;
    [0, -3, -7, -12].forEach((n, i) => this.tone(330 * Math.pow(2, n / 12), 0.8, { when: i * 0.22, vol: 0.12, type: 'triangle' }));
  }
  click() {
    if (this.ok('click', 0.05)) this.tone(700, 0.06, { type: 'triangle', vol: 0.06, wet: false });
  }
  step() {
    if (this.ok('step', 0.2)) this.noise(0.25, { freq: 400, vol: 0.1, slideTo: 200 });
  }
}

export const sfx = new Sfx();

export function buzz(ms: number) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* unsupported */
  }
}
