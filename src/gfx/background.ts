import { RNG } from '../core/rng';
import { rgb } from './color';
import { glow } from './sprites';

function valueNoise(seed: number) {
  const N = 64;
  const r = new RNG(seed);
  const v = new Float32Array(N * N);
  for (let i = 0; i < v.length; i++) v[i] = r.next();
  return (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), w = yf * yf * (3 - 2 * yf);
    const x0 = xi & 63, x1 = (xi + 1) & 63, y0 = (yi & 63) * N, y1 = ((yi + 1) & 63) * N;
    const a = v[y0 + x0], b = v[y0 + x1], c = v[y1 + x0], d = v[y1 + x1];
    return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w;
  };
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Low-res fBm cloud; upscaled on draw, which gives the soft nebula look for free. */
function nebula(seed: number, c1: string, c2: string, size = 150): HTMLCanvasElement {
  const n1 = valueNoise(seed), n2 = valueNoise(seed + 77);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const A = rgb(c1), B = rgb(c2);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = (x / size) * 4, ny = (y / size) * 4;
      let f = 0, amp = 0.5, fr = 1;
      for (let o = 0; o < 5; o++) {
        f += amp * n1(nx * fr + 10, ny * fr + 3);
        amp *= 0.5;
        fr *= 2.03;
      }
      const dx = x / size - 0.5, dy = y / size - 0.5;
      const fall = Math.max(0, 1 - (dx * dx + dy * dy) * 3.6);
      const a = smooth(0.34, 0.82, f) * fall;
      const m = smooth(0.25, 0.75, n2(nx * 1.3, ny * 1.3));
      const k = (y * size + x) * 4;
      img.data[k] = A[0] + (B[0] - A[0]) * m;
      img.data[k + 1] = A[1] + (B[1] - A[1]) * m;
      img.data[k + 2] = A[2] + (B[2] - A[2]) * m;
      img.data[k + 3] = a * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

interface Ember { x: number; y: number; vy: number; s: number; ph: number; c: string }

export class Background {
  private layers: HTMLCanvasElement[] = [];
  private old: HTMLCanvasElement[] = [];
  private fade = 1;
  private key = '';
  private embers: Ember[] = [];
  private colors: [string, string] = ['#fff', '#fff'];
  t = 0;
  intensity = 1;

  constructor() {
    for (let i = 0; i < 46; i++) this.embers.push(this.ember(Math.random()));
  }

  private ember(y: number): Ember {
    return { x: Math.random(), y, vy: 0.012 + Math.random() * 0.03, s: 2 + Math.random() * 5, ph: Math.random() * 7, c: '#fff' };
  }

  setTheme(c1: string, c2: string) {
    const key = c1 + c2;
    if (key === this.key) return;
    const seed = this.key ? Math.floor(Math.random() * 1e6) : 7;
    this.key = key;
    this.old = this.layers;
    this.layers = [nebula(seed, c1, c2), nebula(seed + 13, c2, c1)];
    this.colors = [c1, c2];
    this.fade = this.old.length ? 0 : 1;
  }

  update(dt: number) {
    this.t += dt;
    this.fade = Math.min(1, this.fade + dt * 0.8);
    for (const e of this.embers) {
      e.y -= e.vy * dt;
      if (e.y < -0.05) Object.assign(e, this.ember(1.05));
    }
  }

  render(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const t = this.t;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#120a26');
    g.addColorStop(0.55, '#0a0716');
    g.addColorStop(1, '#040309');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    const S = Math.max(w, h) * 1.55;
    ctx.globalCompositeOperation = 'lighter';
    const draw = (set: HTMLCanvasElement[], alpha: number) => {
      if (!set.length || alpha <= 0) return;
      ctx.save();
      ctx.globalAlpha = 0.62 * alpha * this.intensity;
      ctx.translate(w / 2 + Math.sin(t * 0.05) * w * 0.06, h * 0.42);
      ctx.rotate(t * 0.011);
      ctx.drawImage(set[0], -S / 2, -S / 2, S, S);
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = 0.4 * alpha * this.intensity;
      ctx.translate(w / 2, h * 0.6 + Math.cos(t * 0.04) * h * 0.05);
      ctx.rotate(-t * 0.014 + 1.3);
      ctx.drawImage(set[1], -S * 0.65, -S * 0.65, S * 1.3, S * 1.3);
      ctx.restore();
    };
    draw(this.old, 1 - this.fade);
    draw(this.layers, this.fade);

    for (const e of this.embers) {
      const x = (e.x + Math.sin(t * 0.4 + e.ph) * 0.02) * w;
      const a = 0.35 + 0.35 * Math.sin(t * 2 + e.ph * 3);
      ctx.globalAlpha = a * this.intensity;
      const img = glow(e.ph > 3.5 ? this.colors[1] : '#ffd9a0');
      ctx.drawImage(img, x - e.s * 2, e.y * h - e.s * 2, e.s * 4, e.s * 4);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.72)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  }
}
