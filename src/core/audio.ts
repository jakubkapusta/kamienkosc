// Every sound is synthesized on the fly, nothing is loaded. The palette is deliberately
// homely: toy xylophone, a Fiat 126p horn, a frying pan, a bottle cap, kitchen noises.
// Keep often-heard sounds short and percussive: sustained, buzzy tones get tiresome fast.
interface ToneOpt {
  type?: OscillatorType;
  vol?: number;
  attack?: number;
  slide?: number;
  when?: number;
  wet?: boolean;
  detune?: number;
  vib?: number; // vibrato rate, Hz
  vibDepth?: number; // vibrato depth, Hz
  lp?: number; // low-pass cutoff, Hz
  hold?: number; // fraction of the duration held at full volume before the decay
}
interface NoiseOpt { freq?: number; q?: number; vol?: number; type?: BiquadFilterType; slideTo?: number; when?: number; wet?: boolean }

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

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
      this.out.gain.value = 0.6;
      const comp = ac.createDynamicsCompressor();
      this.out.connect(comp).connect(ac.destination);
      // small room: the kitchen, not a cathedral
      const rev = ac.createConvolver();
      const len = ac.sampleRate * 0.9;
      const ir = ac.createBuffer(2, len, ac.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = ir.getChannelData(ch);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
      }
      rev.buffer = ir;
      this.wet = ac.createGain();
      this.wet.gain.value = 0.2;
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

  // ---------- building blocks ----------
  private tone(f: number, dur: number, o: ToneOpt = {}) {
    const ac = this.ac!;
    const t0 = ac.currentTime + (o.when ?? 0);
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = o.type ?? 'sine';
    osc.frequency.setValueAtTime(f, t0);
    if (o.detune) osc.detune.value = o.detune;
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, f + o.slide), t0 + dur);
    if (o.vib) {
      const lfo = ac.createOscillator();
      const lg = ac.createGain();
      lfo.frequency.value = o.vib;
      lg.gain.value = o.vibDepth ?? 4;
      lfo.connect(lg).connect(osc.frequency);
      lfo.start(t0);
      lfo.stop(t0 + dur + 0.05);
    }
    const v = o.vol ?? 0.2;
    const a = o.attack ?? 0.005;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(v, t0 + a);
    if (o.hold) g.gain.setValueAtTime(v, t0 + a + dur * o.hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let node: AudioNode = osc;
    if (o.lp) {
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = o.lp;
      node = osc.connect(lp);
    }
    node.connect(g).connect(this.out);
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
    if (o.wet !== false) g.connect(this.wet);
    src.start(t0, Math.random() * 0.5);
    src.stop(t0 + dur + 0.05);
  }

  /** Toy xylophone (cymbałki): bright fundamental plus inharmonic metal partials. */
  private bar(f: number, when = 0, vol = 0.12) {
    this.tone(f, 0.55, { when, vol });
    this.tone(f * 2.76, 0.22, { when, vol: vol * 0.35 });
    this.tone(f * 5.4, 0.1, { when, vol: vol * 0.15 });
  }

  /** Bell / pot lid: sine partials with bell-like (inharmonic) ratios, long soft decay. */
  private bell(f: number, dur: number, when = 0, vol = 0.08) {
    [[1, 1], [2.4, 0.5], [2.98, 0.3], [5.95, 0.15]].forEach(([r, v], i) => this.tone(f * r, dur / (1 + i * 0.6), { when, vol: vol * v }));
  }

  /** Wooden spoon on a chopping board. */
  private knock(when = 0, vol = 0.12, f = 620) {
    this.tone(f, 0.07, { type: 'triangle', when, vol, slide: -120, wet: false });
    this.noise(0.03, { freq: f * 2, q: 3, vol: vol * 0.8, when, wet: false });
  }

  // ---------- game events ----------
  /** Gems matched: xylophone climbing a pentatonic scale with each cascade. */
  match(level: number) {
    if (!this.ok('match', 0.05)) return;
    const scale = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
    const n = scale[Math.min(level - 1, scale.length - 1)];
    this.bar(midi(72 + n), 0, 0.13);
    if (level >= 3) this.bar(midi(79 + n), 0.07, 0.07);
  }

  /** Gems slide past each other. */
  swap() {
    if (this.ok('swap')) this.noise(0.1, { freq: 900, q: 0.8, vol: 0.06, slideTo: 450, wet: false });
  }

  /** Illegal swap: a Fiat 126p honk. */
  bad() {
    if (!this.ok('bad', 0.15)) return;
    for (const f of [392, 494]) this.tone(f, 0.2, { type: 'square', vol: 0.035, vib: 28, vibDepth: 6, lp: 1800, hold: 0.7, wet: false });
  }

  /** Special gem goes off: a firecracker. */
  explode() {
    if (!this.ok('explode', 0.08)) return;
    this.noise(0.05, { freq: 2500, type: 'highpass', vol: 0.5 });
    this.noise(0.5, { freq: 400, type: 'lowpass', vol: 0.35, slideTo: 60 });
    this.tone(90, 0.35, { vol: 0.25, slide: -50 });
    for (let k = 0; k < 6; k++) this.noise(0.03, { freq: 3000 + Math.random() * 3000, type: 'highpass', vol: 0.12, when: 0.12 + Math.random() * 0.45 });
  }

  /** Damage lands; big hits get the frying pan. */
  hit(heavy = false) {
    if (!this.ok('hit', 0.06)) return;
    this.tone(110, 0.2, { vol: 0.35, slide: -60, wet: false });
    this.noise(0.07, { freq: 1800, vol: 0.12 });
    if (heavy) for (const [f, v] of [[520, 0.09], [1240, 0.05], [2230, 0.03]] as const) this.tone(f, 0.6, { vol: v, when: 0.01 });
  }

  /** Złotówka: a clink and the till's beep. */
  coin() {
    if (!this.ok('coin', 0.08)) return;
    this.tone(1800, 0.12, { vol: 0.04 });
    this.tone(2700, 0.09, { vol: 0.025 });
    this.tone(2640, 0.07, { type: 'square', vol: 0.018, when: 0.07, wet: false, lp: 4000 });
  }

  /** Bottle cap: pssst of the bottle, then the cap bouncing on the table. */
  cap() {
    if (!this.ok('cap', 0.06)) return;
    const p = 0.9 + Math.random() * 0.2;
    this.noise(0.12, { freq: 3500, type: 'highpass', vol: 0.12, slideTo: 7000 });
    this.tone(2350 * p, 0.14, { vol: 0.05, when: 0.08 });
    this.tone(3720 * p, 0.1, { vol: 0.03, when: 0.08 });
    this.tone(2400 * p, 0.08, { vol: 0.025, when: 0.19 });
    this.tone(2450 * p, 0.05, { vol: 0.015, when: 0.26 });
  }

  /** Mana orb arrives: one xylophone note per colour. */
  tick(c: number) {
    if (!this.ok('tick', 0.035)) return;
    this.bar(midi([84, 88, 79, 91][c] ?? 84), 0, 0.035);
  }

  /** Spell cast: a short household sound per element. */
  cast(elem: number) {
    if (!this.ok('cast', 0.1)) return;
    switch (elem) {
      case 0: // fire: striking a match, then the flame catching
        this.noise(0.07, { freq: 2600, q: 0.8, vol: 0.22, wet: false });
        this.noise(0.35, { freq: 500, slideTo: 2200, q: 0.9, vol: 0.12, when: 0.06 });
        break;
      case 1: // water: two drops into a bucket
        this.tone(380, 0.12, { vol: 0.14, slide: 900 });
        this.tone(520, 0.1, { vol: 0.1, slide: 1000, when: 0.13 });
        break;
      case 2: // earth: wooden spoon, tok-tok, and a thud
        this.knock(0, 0.12, 620);
        this.knock(0.1, 0.1, 540);
        this.tone(90, 0.18, { vol: 0.14, slide: -30, when: 0.1 });
        break;
      case 3: // air: a short whistle
        this.tone(2300, 0.22, { vol: 0.045, vib: 28, vibDepth: 90, attack: 0.02, hold: 0.5 });
        this.noise(0.2, { freq: 2300, q: 2, vol: 0.05 });
        break;
      default: // dark: the parish bell, far away
        this.bell(midi(45), 1.1, 0, 0.07);
    }
  }

  /** Fire spells: the grill sizzling. */
  fire() {
    if (!this.ok('fire', 0.1)) return;
    this.noise(0.9, { freq: 3200, q: 0.6, vol: 0.12 });
    for (let k = 0; k < 8; k++) this.noise(0.02, { freq: 5000, type: 'highpass', vol: 0.1, when: Math.random() * 0.8 });
  }

  /** Lightning: dodgy wiring buzzing and crackling. */
  zap() {
    if (!this.ok('zap', 0.08)) return;
    this.tone(100, 0.32, { type: 'sawtooth', vol: 0.06, lp: 2500, wet: false });
    this.tone(150, 0.32, { type: 'square', vol: 0.025, lp: 2000, wet: false });
    for (let k = 0; k < 5; k++) this.noise(0.025, { freq: 4000, type: 'highpass', vol: 0.18, when: Math.random() * 0.28 });
  }

  /** Healing: a pot of rosół bubbling. */
  heal() {
    if (!this.ok('heal', 0.2)) return;
    for (let k = 0; k < 6; k++) this.tone(260 + Math.random() * 160, 0.08, { vol: 0.07, slide: 500, when: k * 0.07 + Math.random() * 0.03 });
    this.bar(midi(76), 0.35, 0.05);
  }

  /** Shield: padded kufajka, a soft flump. */
  shield() {
    if (!this.ok('shield', 0.2)) return;
    this.noise(0.25, { freq: 350, type: 'lowpass', vol: 0.3 });
    this.tone(85, 0.25, { vol: 0.2, slide: -20 });
  }

  /** Extra turn: a disco polo keyboard riff. */
  extra() {
    if (!this.ok('extra', 0.3)) return;
    [72, 76, 79, 84, 79].forEach((n, i) => this.tone(midi(n), 0.14, { type: 'square', vol: 0.035, when: i * 0.075, vib: 7, vibDepth: 4, lp: 3200 }));
    this.tone(midi(48), 0.35, { type: 'square', vol: 0.03, lp: 700 });
  }

  /** A special gem is born: quick xylophone glissando. */
  birth() {
    if (!this.ok('birth', 0.1)) return;
    [84, 88, 91].forEach((n, i) => this.bar(midi(n), i * 0.045, 0.06));
  }

  /** Supermove: a xylophone glissando, a pot-lid gong and a cymbal. */
  ult() {
    if (!this.ok('ult', 0.5)) return;
    [60, 64, 67, 72, 76, 79, 84].forEach((n, i) => this.bar(midi(n), i * 0.035, 0.07));
    this.bell(midi(43), 1.4, 0.25, 0.12);
    this.tone(midi(31), 0.5, { vol: 0.16, when: 0.25, slide: -10 });
    this.noise(1.2, { freq: 6000, type: 'highpass', vol: 0.12, when: 0.25 });
  }

  /** Victory: "Sto lat" on a wedding-band keyboard, with oom-pah bass. */
  win() {
    if (!this.ok('win', 1)) return;
    const mel: [number, number][] = [[67, 0.3], [64, 0.3], [67, 0.3], [64, 0.3], [67, 0.2], [69, 0.2], [67, 0.2], [65, 0.2], [64, 0.2], [65, 0.6]];
    let t = 0;
    for (const [n, d] of mel) {
      this.tone(midi(n + 5), d * 0.95, { type: 'square', vol: 0.04, when: t, vib: 6, vibDepth: 3, lp: 3000, hold: 0.5 });
      t += d;
    }
    for (let k = 0; k < 6; k++) {
      this.tone(midi(k % 2 ? 48 : 43) + 0, 0.18, { type: 'triangle', vol: 0.12, when: k * 0.4 });
      this.bar(midi(k % 2 ? 72 : 67), k * 0.4 + 0.2, 0.03);
    }
  }

  /** Defeat: sad trombone. */
  lose() {
    if (!this.ok('lose', 1)) return;
    [[55, 0.4], [54, 0.4], [53, 0.4], [52, 1.1]].reduce((t, [n, d], i) => {
      this.tone(midi(n), d, { type: 'sawtooth', vol: 0.07, when: t, lp: 1100, attack: 0.05, hold: 0.6, vib: i === 3 ? 6 : 0, vibDepth: 5 });
      return t + d;
    }, 0);
  }

  /** UI clicks: a typewriter key. */
  click() {
    if (!this.ok('click', 0.05)) return;
    this.noise(0.025, { freq: 3500, type: 'highpass', vol: 0.14, wet: false });
    this.tone(1900, 0.03, { type: 'square', vol: 0.012, wet: false });
  }

  /** Walking the map: footsteps on gravel. */
  step() {
    if (!this.ok('step', 0.2)) return;
    for (let k = 0; k < 4; k++) this.noise(0.07, { freq: 1400 + Math.random() * 600, q: 0.7, vol: 0.09, when: k * 0.17 });
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
