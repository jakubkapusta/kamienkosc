import { TAU } from '../core/rng';
import { mixHex, rgba } from './color';
import { glow, star } from './sprites';

const GLOW = 0, SHARD = 1, RING = 2, SPARK = 3, ORB = 4, TEXT = 5, BOLT = 6, BEAM = 7, STAR = 8;

interface Part {
  k: number;
  x: number; y: number; vx: number; vy: number;
  life: number; max: number;
  size: number; size2: number;
  color: string;
  rot: number; vr: number; g: number; drag: number;
  // orb path
  sx: number; sy: number; cx: number; cy: number; ex: number; ey: number;
  trail: number[] | null;
  cb: (() => void) | null;
  text: string; font: string;
  pts: number[] | null;
  w: number;
  add: boolean;
}

function mk(k: number, x: number, y: number, color: string, life: number): Part {
  return {
    k, x, y, vx: 0, vy: 0, life, max: life, size: 10, size2: 10, color,
    rot: 0, vr: 0, g: 0, drag: 0,
    sx: x, sy: y, cx: x, cy: y, ex: x, ey: y, trail: null, cb: null,
    text: '', font: '', pts: null, w: 0, add: true,
  };
}

export const reducedMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export class FX {
  parts: Part[] = [];
  shakeAmt = 0;
  sx = 0;
  sy = 0;
  flashA = 0;
  flashColor = '#fff';
  hitstop = 0;
  private timers: { t: number; fn: () => void }[] = [];

  get pending() {
    return this.timers.length > 0 || this.parts.some((p) => p.k === ORB);
  }

  after(sec: number, fn: () => void) {
    this.timers.push({ t: sec, fn });
  }

  shake(a: number) {
    this.shakeAmt = Math.min(22, Math.max(this.shakeAmt, reducedMotion ? a * 0.25 : a));
  }

  flash(color: string, a: number) {
    this.flashColor = color;
    this.flashA = Math.max(this.flashA, a);
  }

  stop(sec: number) {
    this.hitstop = Math.max(this.hitstop, sec);
  }

  glow(x: number, y: number, color: string, size: number, life: number, size2 = size * 1.6) {
    const p = mk(GLOW, x, y, color, life);
    p.size = size;
    p.size2 = size2;
    this.parts.push(p);
    return p;
  }

  sparks(x: number, y: number, color: string, n: number, speed: number, life = 0.6) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, s = speed * (0.3 + Math.random() * 0.9);
      const p = mk(SPARK, x, y, color, life * (0.5 + Math.random() * 0.7));
      p.vx = Math.cos(a) * s;
      p.vy = Math.sin(a) * s;
      p.drag = 3;
      p.g = 120;
      p.size = 1.5 + Math.random() * 2;
      this.parts.push(p);
    }
  }

  motes(x: number, y: number, color: string, n: number, spread: number, rise = 60, life = 1.1) {
    for (let i = 0; i < n; i++) {
      const p = mk(GLOW, x + (Math.random() - 0.5) * spread, y + (Math.random() - 0.5) * spread, color, life * (0.6 + Math.random() * 0.6));
      p.vx = (Math.random() - 0.5) * 30;
      p.vy = -rise * (0.4 + Math.random());
      p.size = 6 + Math.random() * 10;
      p.size2 = 1;
      this.parts.push(p);
    }
  }

  shards(x: number, y: number, color: string, n: number, speed: number, size: number) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, s = speed * (0.35 + Math.random() * 0.8);
      const p = mk(SHARD, x, y, i % 3 === 0 ? mixHex(color, '#ffffff', 0.55) : color, 0.55 + Math.random() * 0.45);
      p.vx = Math.cos(a) * s;
      p.vy = Math.sin(a) * s - speed * 0.35;
      p.g = 900;
      p.drag = 1.2;
      p.rot = Math.random() * TAU;
      p.vr = (Math.random() - 0.5) * 18;
      p.size = size * (0.5 + Math.random() * 0.7);
      p.add = false;
      this.parts.push(p);
    }
  }

  ring(x: number, y: number, color: string, r0: number, r1: number, life: number, width = 4) {
    const p = mk(RING, x, y, color, life);
    p.size = r0;
    p.size2 = r1;
    p.w = width;
    this.parts.push(p);
  }

  twinkle(x: number, y: number, size: number, life = 0.5, color = '#ffffff') {
    const p = mk(STAR, x, y, color, life);
    p.size = size;
    p.rot = Math.random() * 0.6;
    this.parts.push(p);
  }

  /** Homing mote travelling on a curved path, with a light trail. */
  orb(sx: number, sy: number, ex: number, ey: number, color: string, dur: number, cb: (() => void) | null, size = 14, curve = 0.35) {
    const p = mk(ORB, sx, sy, color, dur);
    const dx = ex - sx, dy = ey - sy;
    const d = Math.hypot(dx, dy) || 1;
    const side = (Math.random() - 0.5) * 2 * curve;
    p.sx = sx; p.sy = sy; p.ex = ex; p.ey = ey;
    p.cx = sx + dx * 0.4 - (dy / d) * d * side;
    p.cy = sy + dy * 0.4 + (dx / d) * d * side;
    p.trail = [];
    p.cb = cb;
    p.size = size;
    this.parts.push(p);
    return p;
  }

  text(x: number, y: number, text: string, color: string, size: number, life = 1.1, rise = 50) {
    const p = mk(TEXT, x, y, color, life);
    p.text = text;
    p.size = size;
    p.vy = -rise;
    p.drag = 1.5;
    p.add = false;
    p.font = `800 ${size}px "Alegreya Sans", system-ui, sans-serif`;
    this.parts.push(p);
  }

  bolt(x1: number, y1: number, x2: number, y2: number, color: string, life = 0.35, width = 3) {
    const p = mk(BOLT, x1, y1, color, life);
    p.sx = x1; p.sy = y1; p.ex = x2; p.ey = y2;
    p.w = width;
    p.pts = jag(x1, y1, x2, y2);
    this.parts.push(p);
  }

  beam(x: number, y: number, len: number, horizontal: boolean, color: string, width: number, life = 0.45) {
    const p = mk(BEAM, x, y, color, life);
    p.size = len;
    p.w = width;
    p.rot = horizontal ? 0 : Math.PI / 2;
    this.parts.push(p);
  }

  update(dt: number) {
    for (let i = this.timers.length - 1; i >= 0; i--) {
      const tm = this.timers[i];
      tm.t -= dt;
      if (tm.t <= 0) {
        this.timers.splice(i, 1);
        tm.fn();
      }
    }
    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 45);
    const s = this.shakeAmt;
    this.sx = (Math.random() - 0.5) * 2 * s;
    this.sy = (Math.random() - 0.5) * 2 * s;
    this.flashA = Math.max(0, this.flashA - dt * 2.8);

    const arr = this.parts;
    let w = 0;
    for (let i = 0; i < arr.length; i++) {
      const p = arr[i];
      p.life -= dt;
      if (p.k === ORB) {
        const t = 1 - Math.max(0, p.life) / p.max;
        const e = t * t * (3 - 2 * t) * 0.6 + t * t * 0.4;
        const u = 1 - e;
        const nx = u * u * p.sx + 2 * u * e * p.cx + e * e * p.ex;
        const ny = u * u * p.sy + 2 * u * e * p.cy + e * e * p.ey;
        p.trail!.push(p.x, p.y);
        if (p.trail!.length > 20) p.trail!.splice(0, 2);
        p.x = nx;
        p.y = ny;
        if (p.life <= 0) {
          if (p.cb) p.cb();
          this.glow(p.ex, p.ey, p.color, p.size * 2.2, 0.3, p.size * 3.5);
          continue;
        }
      } else if (p.k === BOLT) {
        if (Math.random() < dt * 22) p.pts = jag(p.sx, p.sy, p.ex, p.ey);
      } else {
        p.vx -= p.vx * p.drag * dt;
        p.vy -= p.vy * p.drag * dt;
        p.vy += p.g * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
      }
      if (p.life > 0) arr[w++] = p;
    }
    arr.length = w;
  }

  render(ctx: CanvasRenderingContext2D) {
    for (const p of this.parts) {
      const t = 1 - Math.max(0, p.life) / p.max; // 0 → 1
      const a = Math.min(1, (p.life / p.max) * 1.6);
      ctx.globalCompositeOperation = p.add ? 'lighter' : 'source-over';
      switch (p.k) {
        case GLOW: {
          const s = p.size + (p.size2 - p.size) * t;
          ctx.globalAlpha = a;
          ctx.drawImage(glow(p.color), p.x - s, p.y - s, s * 2, s * 2);
          break;
        }
        case STAR: {
          const s = p.size * Math.sin(Math.PI * t);
          ctx.globalAlpha = 1;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot + t * 0.8);
          ctx.drawImage(star(), -s, -s, s * 2, s * 2);
          ctx.restore();
          break;
        }
        case SPARK: {
          ctx.globalAlpha = a;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.size;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04);
          ctx.stroke();
          break;
        }
        case SHARD: {
          ctx.globalAlpha = a;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          const s = p.size;
          ctx.beginPath();
          ctx.moveTo(0, -s);
          ctx.lineTo(s * 0.7, s * 0.5);
          ctx.lineTo(-s * 0.6, s * 0.7);
          ctx.closePath();
          ctx.fillStyle = p.color;
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.45)';
          ctx.beginPath();
          ctx.moveTo(0, -s);
          ctx.lineTo(s * 0.7, s * 0.5);
          ctx.lineTo(0, s * 0.1);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
          break;
        }
        case RING: {
          const e = 1 - (1 - t) * (1 - t);
          const r = p.size + (p.size2 - p.size) * e;
          ctx.globalAlpha = (1 - t) * 0.9;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.w * (1 - t) + 0.5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, TAU);
          ctx.stroke();
          break;
        }
        case ORB: {
          const tr = p.trail!;
          ctx.globalAlpha = 1;
          ctx.lineCap = 'round';
          ctx.strokeStyle = p.color;
          for (let i = 2; i < tr.length; i += 2) {
            const f = i / tr.length;
            ctx.globalAlpha = f * 0.7;
            ctx.lineWidth = p.size * 0.55 * f;
            ctx.beginPath();
            ctx.moveTo(tr[i - 2], tr[i - 1]);
            ctx.lineTo(tr[i], tr[i + 1] ?? p.y);
            ctx.stroke();
          }
          if (tr.length) {
            ctx.globalAlpha = 0.7;
            ctx.beginPath();
            ctx.moveTo(tr[tr.length - 2], tr[tr.length - 1]);
            ctx.lineTo(p.x, p.y);
            ctx.lineWidth = p.size * 0.55;
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
          const s = p.size;
          ctx.drawImage(glow(p.color), p.x - s * 1.5, p.y - s * 1.5, s * 3, s * 3);
          break;
        }
        case TEXT: {
          const pop = t < 0.12 ? 1 + (1 - t / 0.12) * 0.7 : 1;
          ctx.globalAlpha = t > 0.65 ? (1 - t) / 0.35 : 1;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.scale(pop, pop);
          ctx.font = p.font;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.lineJoin = 'round';
          ctx.lineWidth = Math.max(3, p.size * 0.18);
          ctx.strokeStyle = 'rgba(10,4,16,0.9)';
          ctx.strokeText(p.text, 0, 0);
          ctx.fillStyle = p.color;
          ctx.fillText(p.text, 0, 0);
          ctx.restore();
          break;
        }
        case BOLT: {
          const pts = p.pts!;
          ctx.globalAlpha = a;
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';
          for (const [wm, col] of [[5, rgba(p.color, 0.35)], [2, p.color], [0.8, '#ffffff']] as [number, string][]) {
            ctx.strokeStyle = col;
            ctx.lineWidth = p.w * wm * (wm === 5 ? 1 : 1);
            ctx.beginPath();
            for (let i = 0; i < pts.length; i += 2) (i ? ctx.lineTo(pts[i], pts[i + 1]) : ctx.moveTo(pts[i], pts[i + 1]));
            ctx.stroke();
          }
          break;
        }
        case BEAM: {
          const th = p.w * (1 - t) * (1 + Math.sin(t * 40) * 0.1);
          ctx.globalAlpha = 1 - t * 0.5;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          const g = ctx.createLinearGradient(0, -th, 0, th);
          g.addColorStop(0, rgba(p.color, 0));
          g.addColorStop(0.4, rgba(p.color, 0.8));
          g.addColorStop(0.5, 'rgba(255,255,255,1)');
          g.addColorStop(0.6, rgba(p.color, 0.8));
          g.addColorStop(1, rgba(p.color, 0));
          ctx.fillStyle = g;
          ctx.fillRect(-p.size / 2, -th, p.size, th * 2);
          ctx.restore();
          break;
        }
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  renderFlash(ctx: CanvasRenderingContext2D, w: number, h: number) {
    if (this.flashA <= 0.01) return;
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = rgba(this.flashColor, this.flashA * 0.55);
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  }
}

function jag(x1: number, y1: number, x2: number, y2: number): number[] {
  const d = Math.hypot(x2 - x1, y2 - y1);
  const n = Math.max(4, Math.round(d / 18));
  const nx = -(y2 - y1) / (d || 1), ny = (x2 - x1) / (d || 1);
  const out: number[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const off = i === 0 || i === n ? 0 : (Math.random() - 0.5) * Math.min(40, d * 0.12);
    out.push(x1 + (x2 - x1) * t + nx * off, y1 + (y2 - y1) * t + ny * off);
  }
  return out;
}
