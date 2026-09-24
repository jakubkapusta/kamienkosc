import { TAU } from '../core/rng';
import { mixHex, rgba } from './color';
import { glow } from './sprites';

export type LookKind = 'beast' | 'skull' | 'hood' | 'golem' | 'wyrm';

export interface Look {
  kind: LookKind;
  skin: string;
  skin2: string;
  eye: string;
  aura: string;
  eyes: number;
  horns: number; // pairs
  hornLen: number;
  ears: number;
  teeth: number;
  fangs: boolean;
  headW: number;
  headH: number;
  crown: boolean;
  seed: number;
  cloth?: string;
  mask?: boolean;
  orb?: string;
  hood?: boolean; // hood behind a skull/beast head
}

export interface PState {
  hit: number;
  dead: number;
  poison: boolean;
  flash: number;
  flashColor: string;
}

type C = CanvasRenderingContext2D;

function ell(ctx: C, x: number, y: number, rx: number, ry: number, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot, 0, TAU);
}

function skinGrad(ctx: C, L: Look, cx: number, cy: number, r: number) {
  const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.45, r * 0.05, cx, cy, r * 1.25);
  g.addColorStop(0, mixHex(L.skin, '#ffffff', 0.3));
  g.addColorStop(0.45, L.skin);
  g.addColorStop(1, L.skin2);
  return g;
}

function blink(t: number, seed: number) {
  const cyc = 3.4 + (seed % 7) * 0.3;
  const ph = (t + seed * 0.37) % cyc;
  return ph < 0.13 ? 0.12 : 1;
}

function eyes(ctx: C, L: Look, y: number, spread: number, t: number, slit = false) {
  const b = blink(t, L.seed);
  const xs = L.eyes === 1 ? [0] : L.eyes === 2 ? [-spread, spread] : [-spread * 1.15, 0, spread * 1.15];
  const flick = 0.85 + 0.15 * Math.sin(t * 9 + L.seed);
  for (const x of xs) {
    const yy = y - (L.eyes === 3 && x === 0 ? 0.12 : 0);
    const s = x === 0 && L.eyes === 3 ? 0.8 : 1;
    const rot = x < 0 ? 0.28 : x > 0 ? -0.28 : 0;
    ell(ctx, x, yy, 0.11 * s, 0.075 * s, rot);
    ctx.fillStyle = '#0a0204';
    ctx.fill();
    ell(ctx, x, yy, 0.08 * s, 0.05 * s * b, rot);
    const g = ctx.createRadialGradient(x, yy, 0, x, yy, 0.08 * s);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.35, mixHex(L.eye, '#ffffff', 0.4));
    g.addColorStop(1, L.eye);
    ctx.fillStyle = g;
    ctx.fill();
    if (slit && b > 0.5) {
      ell(ctx, x, yy, 0.014, 0.045 * s, 0);
      ctx.fillStyle = '#100204';
      ctx.fill();
    }
  }
  ctx.globalCompositeOperation = 'lighter';
  for (const x of xs) {
    const yy = y - (L.eyes === 3 && x === 0 ? 0.12 : 0);
    ctx.globalAlpha = 0.9 * b * flick;
    ctx.drawImage(glow(L.eye), x - 0.3, yy - 0.3, 0.6, 0.6);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

function horns(ctx: C, L: Look, y: number, w: number) {
  for (let pair = L.horns - 1; pair >= 0; pair--) {
    for (const s of [-1, 1]) {
      const bx = s * (w * 0.42 + pair * 0.16), by = y + 0.1 + pair * 0.12;
      const len = L.hornLen * (1 - pair * 0.3);
      const tx = s * (w * 0.5 + 0.3 + len * 0.3 + pair * 0.14), ty = by - 0.28 - len * 0.5;
      const cx = s * (w * 0.5 + 0.55 + len * 0.18), cy = by - 0.05;
      const b = 0.1 - pair * 0.025;
      ctx.beginPath();
      ctx.moveTo(bx - s * b, by);
      ctx.quadraticCurveTo(cx - s * b * 0.8, cy - b * 1.4, tx, ty);
      ctx.quadraticCurveTo(cx + s * b * 0.9, cy + b, bx + s * b, by + 0.04);
      ctx.closePath();
      const g = ctx.createLinearGradient(bx, by, tx, ty);
      g.addColorStop(0, '#2d2118');
      g.addColorStop(0.55, '#a8936f');
      g.addColorStop(1, '#f4ead2');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.lineWidth = 0.014;
      ctx.stroke();
      // ridges
      ctx.strokeStyle = 'rgba(40,25,15,0.35)';
      ctx.lineWidth = 0.01;
      for (let k = 1; k < 4; k++) {
        const f = k / 4;
        const px = bx + (tx - bx) * f * 0.8 + (cx - bx) * 0.25 * f;
        const py = by + (ty - by) * f * 0.8;
        ctx.beginPath();
        ctx.moveTo(px - s * b * (1 - f), py - 0.01);
        ctx.lineTo(px + s * b * (1 - f), py + 0.02);
        ctx.stroke();
      }
    }
  }
}

function mouth(ctx: C, L: Look, y: number, mw: number) {
  ctx.beginPath();
  ctx.moveTo(-mw, y - 0.035);
  ctx.quadraticCurveTo(0, y + 0.03, mw, y - 0.035);
  ctx.quadraticCurveTo(0, y + 0.19, -mw, y - 0.035);
  ctx.closePath();
  ctx.fillStyle = '#1c0406';
  ctx.fill();
  const inner = ctx.createRadialGradient(0, y + 0.06, 0, 0, y + 0.06, mw);
  inner.addColorStop(0, rgba(L.eye, 0.45));
  inner.addColorStop(1, rgba(L.eye, 0));
  ctx.fillStyle = inner;
  ctx.fill();
  ctx.fillStyle = '#f2e9d2';
  const n = L.teeth;
  for (let i = 0; i < n; i++) {
    const tx = -mw * 0.78 + (i * 1.56 * mw) / Math.max(1, n - 1);
    const f = tx / mw;
    const ty = y - 0.035 + 0.032 * (1 - f * f);
    ctx.beginPath();
    ctx.moveTo(tx - 0.022, ty);
    ctx.lineTo(tx + 0.022, ty);
    ctx.lineTo(tx, ty + 0.05);
    ctx.closePath();
    ctx.fill();
  }
  if (L.fangs) {
    for (const s of [-1, 1]) {
      const fx = s * mw * 0.62;
      ctx.beginPath();
      ctx.moveTo(fx - 0.04, y + 0.1);
      ctx.quadraticCurveTo(fx - s * 0.01, y - 0.05, fx + s * 0.03, y - 0.14);
      ctx.lineTo(fx + 0.04, y + 0.1);
      ctx.closePath();
      const g = ctx.createLinearGradient(fx, y + 0.1, fx, y - 0.14);
      g.addColorStop(0, '#b8a27a');
      g.addColorStop(1, '#fffaf0');
      ctx.fillStyle = g;
      ctx.fill();
    }
  }
}

function crown(ctx: C, y: number, w: number, t: number) {
  const g = ctx.createLinearGradient(0, y - 0.3, 0, y + 0.08);
  g.addColorStop(0, '#fff3c0');
  g.addColorStop(0.5, '#e2ac3f');
  g.addColorStop(1, '#7a4a10');
  ctx.beginPath();
  ctx.moveTo(-w, y + 0.06);
  const n = 5;
  for (let i = 0; i <= n * 2; i++) {
    const x = -w + (i * 2 * w) / (n * 2);
    const yy = i % 2 ? y - 0.1 : y - 0.24 - (i === n ? 0.08 : 0);
    ctx.lineTo(x, yy);
  }
  ctx.lineTo(w, y + 0.06);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(60,30,0,0.7)';
  ctx.lineWidth = 0.014;
  ctx.stroke();
  for (let i = -1; i <= 1; i++) {
    ell(ctx, i * w * 0.55, y - 0.03, 0.035, 0.035);
    ctx.fillStyle = i === 0 ? '#ff3050' : '#40a0ff';
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 3);
  ctx.drawImage(glow('#ff3050'), -0.12, y - 0.15, 0.24, 0.24);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

function body(ctx: C, L: Look) {
  const c = L.cloth ?? L.skin2;
  ctx.beginPath();
  ctx.moveTo(-1.25, 1.3);
  ctx.bezierCurveTo(-1.15, 0.58, -0.62, 0.42, -0.3, 0.38);
  ctx.lineTo(0.3, 0.38);
  ctx.bezierCurveTo(0.62, 0.42, 1.15, 0.58, 1.25, 1.3);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, 0.35, 0, 1.2);
  g.addColorStop(0, mixHex(c, '#ffffff', 0.12));
  g.addColorStop(1, mixHex(c, '#000000', 0.75));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = rgba(L.aura, 0.35);
  ctx.lineWidth = 0.025;
  ctx.beginPath();
  ctx.moveTo(-1.2, 1.0);
  ctx.bezierCurveTo(-1.1, 0.58, -0.62, 0.42, -0.3, 0.38);
  ctx.moveTo(1.2, 1.0);
  ctx.bezierCurveTo(1.1, 0.58, 0.62, 0.42, 0.3, 0.38);
  ctx.stroke();
}

function hoodShape(ctx: C, L: Look, big = 1) {
  const c = L.cloth ?? '#2a1d3a';
  ctx.beginPath();
  ctx.moveTo(-0.74 * big, 0.62);
  ctx.bezierCurveTo(-0.84 * big, -0.2, -0.46 * big, -0.86 * big, 0, -0.96 * big);
  ctx.bezierCurveTo(0.46 * big, -0.86 * big, 0.84 * big, -0.2, 0.74 * big, 0.62);
  ctx.quadraticCurveTo(0, 0.36, -0.74 * big, 0.62);
  ctx.closePath();
  const g = ctx.createRadialGradient(-0.25, -0.55, 0.05, 0, -0.1, 1.0);
  g.addColorStop(0, mixHex(c, '#ffffff', 0.18));
  g.addColorStop(0.5, c);
  g.addColorStop(1, mixHex(c, '#000000', 0.7));
  ctx.fillStyle = g;
  ctx.fill();
  // fold lines
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 0.02;
  ctx.beginPath();
  ctx.moveTo(-0.5, 0.5);
  ctx.quadraticCurveTo(-0.62, -0.1, -0.3, -0.7);
  ctx.moveTo(0.5, 0.5);
  ctx.quadraticCurveTo(0.62, -0.1, 0.3, -0.7);
  ctx.stroke();
}

function beast(ctx: C, L: Look, t: number) {
  const w = L.headW * 0.5, h = L.headH * 0.52, hy = -0.1;
  if (L.hood) hoodShape(ctx, L, 1.08);
  if (L.horns) horns(ctx, L, hy - h * 0.6, w);
  if (L.ears) {
    for (const s of [-1, 1]) {
      const e = L.ears;
      ctx.beginPath();
      ctx.moveTo(s * w * 0.8, hy - 0.1);
      ctx.quadraticCurveTo(s * (w + 0.35 + 0.12 * e), hy - 0.28 - 0.1 * e, s * (w + 0.5 + 0.18 * e), hy - 0.4 - 0.14 * e);
      ctx.quadraticCurveTo(s * (w + 0.22), hy + 0.02, s * w * 0.78, hy + 0.14);
      ctx.closePath();
      ctx.fillStyle = skinGrad(ctx, L, s * (w + 0.2), hy - 0.1, 0.5);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(s * w * 0.9, hy - 0.04);
      ctx.quadraticCurveTo(s * (w + 0.3), hy - 0.2 - 0.08 * e, s * (w + 0.4 + 0.15 * e), hy - 0.34 - 0.12 * e);
      ctx.quadraticCurveTo(s * (w + 0.16), hy + 0.02, s * w * 0.88, hy + 0.08);
      ctx.fillStyle = rgba('#300808', 0.5);
      ctx.fill();
    }
  }
  // head + jaw
  ell(ctx, 0, hy, w, h);
  ctx.fillStyle = skinGrad(ctx, L, 0, hy, Math.max(w, h));
  ctx.fill();
  ell(ctx, 0, hy + h * 0.55, w * 0.82, h * 0.52);
  ctx.fill();
  // cheek shade
  const cs = ctx.createLinearGradient(0, hy - h, 0, hy + h * 1.1);
  cs.addColorStop(0, 'rgba(0,0,0,0)');
  cs.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = cs;
  ell(ctx, 0, hy + h * 0.55, w * 0.82, h * 0.52);
  ctx.fill();
  // brow
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 0.03, hy - 0.08);
    ctx.lineTo(s * w * 0.9, hy - 0.22);
    ctx.lineTo(s * w * 0.85, hy - 0.1);
    ctx.lineTo(s * 0.05, hy + 0.0);
    ctx.closePath();
    ctx.fill();
  }
  eyes(ctx, L, hy - 0.01, Math.min(0.2, w * 0.42), t);
  ctx.fillStyle = 'rgba(20,0,0,0.6)';
  ell(ctx, -0.05, hy + 0.16, 0.022, 0.014);
  ctx.fill();
  ell(ctx, 0.05, hy + 0.16, 0.022, 0.014);
  ctx.fill();
  mouth(ctx, L, hy + h * 0.72, w * 0.55);
  if (L.crown) crown(ctx, hy - h * 0.82, w * 0.75, t);
}

function skullHead(ctx: C, L: Look, t: number) {
  const hy = -0.14;
  if (L.hood) hoodShape(ctx, L, 1.05);
  if (L.horns) horns(ctx, L, hy - 0.3, 0.46);
  const g = ctx.createRadialGradient(-0.18, hy - 0.3, 0.02, 0, hy, 0.75);
  g.addColorStop(0, '#fffaf0');
  g.addColorStop(0.5, L.skin);
  g.addColorStop(1, L.skin2);
  ctx.fillStyle = g;
  ell(ctx, 0, hy, 0.46, 0.46);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-0.36, hy + 0.14);
  ctx.lineTo(-0.3, hy + 0.5);
  ctx.quadraticCurveTo(0, hy + 0.66, 0.3, hy + 0.5);
  ctx.lineTo(0.36, hy + 0.14);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(40,20,5,0.3)';
  ell(ctx, -0.36, hy + 0.1, 0.1, 0.2);
  ctx.fill();
  ell(ctx, 0.36, hy + 0.1, 0.1, 0.2);
  ctx.fill();
  for (const s of [-1, 1]) {
    ell(ctx, s * 0.18, hy + 0.06, 0.14, 0.12, s * 0.15);
    ctx.fillStyle = '#0b0304';
    ctx.fill();
  }
  // pinpoint eyes
  ctx.globalCompositeOperation = 'lighter';
  const fl = 0.8 + 0.2 * Math.sin(t * 7 + L.seed);
  for (const s of [-1, 1]) {
    ctx.globalAlpha = fl;
    ctx.drawImage(glow(L.eye), s * 0.18 - 0.2, hy + 0.07 - 0.2, 0.4, 0.4);
    ctx.drawImage(glow('#ffffff'), s * 0.18 - 0.04, hy + 0.07 - 0.04, 0.08, 0.08);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.beginPath();
  ctx.moveTo(0, hy + 0.2);
  ctx.lineTo(-0.05, hy + 0.32);
  ctx.lineTo(0.05, hy + 0.32);
  ctx.closePath();
  ctx.fillStyle = '#140604';
  ctx.fill();
  // teeth
  ctx.fillStyle = '#efe4c8';
  ctx.strokeStyle = 'rgba(30,15,5,0.8)';
  ctx.lineWidth = 0.012;
  for (let i = -3; i <= 3; i++) {
    const x = i * 0.07;
    ctx.beginPath();
    ctx.rect(x - 0.03, hy + 0.4, 0.06, 0.09);
    ctx.fill();
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(30,15,5,0.7)';
  ctx.lineWidth = 0.015;
  ctx.beginPath();
  ctx.moveTo(0.12, hy - 0.44);
  ctx.lineTo(0.18, hy - 0.28);
  ctx.lineTo(0.1, hy - 0.18);
  ctx.stroke();
  if (L.crown) crown(ctx, hy - 0.38, 0.36, t);
}

function hooded(ctx: C, L: Look, t: number) {
  hoodShape(ctx, L);
  ell(ctx, 0, -0.1, 0.36, 0.45);
  const v = ctx.createRadialGradient(0, -0.05, 0, 0, -0.1, 0.45);
  v.addColorStop(0, '#000000');
  v.addColorStop(1, mixHex(L.cloth ?? '#222', '#000000', 0.75));
  ctx.fillStyle = v;
  ctx.fill();
  ctx.strokeStyle = rgba(L.aura, 0.25);
  ctx.lineWidth = 0.02;
  ctx.beginPath();
  ctx.ellipse(0, -0.1, 0.36, 0.45, 0, Math.PI * 1.1, Math.PI * 1.9);
  ctx.stroke();
  if (L.mask) {
    ell(ctx, 0, -0.04, 0.24, 0.3);
    const g = ctx.createLinearGradient(-0.2, -0.3, 0.2, 0.25);
    g.addColorStop(0, '#f6efe2');
    g.addColorStop(1, '#8c7a62');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,20,30,0.8)';
    ctx.lineWidth = 0.02;
    ctx.beginPath();
    ctx.moveTo(0, -0.3);
    ctx.lineTo(0, 0.24);
    ctx.stroke();
  }
  eyes(ctx, L, -0.08, 0.13, t);
  if (L.orb) {
    const pulse = 1 + 0.12 * Math.sin(t * 3);
    ctx.strokeStyle = '#5b3a1e';
    ctx.lineWidth = 0.06;
    ctx.beginPath();
    ctx.moveTo(0.78, 1.2);
    ctx.lineTo(0.66, 0.36);
    ctx.stroke();
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(glow(L.orb), 0.64 - 0.34 * pulse, 0.3 - 0.34 * pulse, 0.68 * pulse, 0.68 * pulse);
    ctx.drawImage(glow('#ffffff'), 0.64 - 0.07, 0.3 - 0.07, 0.14, 0.14);
    ctx.globalCompositeOperation = 'source-over';
  }
}

function golem(ctx: C, L: Look, t: number) {
  const stone = (pts: number[], cx: number, cy: number, r: number) => {
    ctx.beginPath();
    for (let i = 0; i < pts.length; i += 2) (i ? ctx.lineTo(pts[i], pts[i + 1]) : ctx.moveTo(pts[i], pts[i + 1]));
    ctx.closePath();
    ctx.fillStyle = skinGrad(ctx, L, cx, cy, r);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 0.02;
    ctx.stroke();
  };
  stone([-1.1, 1.2, -1.05, 0.5, -0.8, 0.3, -0.42, 0.4, -0.35, 1.2], -0.7, 0.6, 0.6);
  stone([1.1, 1.2, 1.05, 0.5, 0.8, 0.3, 0.42, 0.4, 0.35, 1.2], 0.7, 0.6, 0.6);
  const W = L.headW * 0.52;
  stone([-W, -0.52, W * 0.85, -0.62, W * 1.05, 0.02, W * 0.8, 0.5, -W * 0.78, 0.52, -W * 1.05, 0.0], 0, -0.05, 0.7);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.moveTo(W * 1.05, 0.02);
  ctx.lineTo(W * 0.8, 0.5);
  ctx.lineTo(-W * 0.2, 0.51);
  ctx.lineTo(W * 0.3, 0.1);
  ctx.closePath();
  ctx.fill();
  // brow block
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(-W * 0.8, -0.2, W * 1.6, 0.07);
  // glowing cracks
  const pulse = 0.65 + 0.35 * Math.sin(t * 2.2 + L.seed);
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = rgba(L.eye, 0.9 * pulse);
  ctx.lineWidth = 0.022;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-W * 0.6, -0.5);
  ctx.lineTo(-W * 0.4, -0.3);
  ctx.lineTo(-W * 0.5, -0.24);
  ctx.moveTo(W * 0.3, 0.46);
  ctx.lineTo(W * 0.1, 0.25);
  ctx.lineTo(W * 0.35, 0.12);
  ctx.moveTo(-0.9, 0.5);
  ctx.lineTo(-0.7, 0.72);
  ctx.lineTo(-0.78, 0.95);
  ctx.moveTo(0.85, 0.45);
  ctx.lineTo(0.66, 0.66);
  ctx.stroke();
  ctx.globalAlpha = pulse;
  for (const s of [-1, 1]) {
    ctx.fillStyle = mixHex(L.eye, '#ffffff', 0.5);
    ctx.fillRect(s * 0.18 - 0.09, -0.11, 0.18, 0.045 * blink(t, L.seed));
    ctx.drawImage(glow(L.eye), s * 0.18 - 0.3, -0.09 - 0.3, 0.6, 0.6);
  }
  ctx.fillStyle = rgba(L.eye, 0.8);
  ctx.fillRect(-0.16, 0.24, 0.32, 0.03);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  if (L.crown) crown(ctx, -0.6, W * 0.7, t);
}

function wyrm(ctx: C, L: Look, t: number) {
  const hy = -0.2;
  const w = 0.44 * L.headW;
  if (L.horns) horns(ctx, L, hy - 0.2, w);
  // frills
  for (const s of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.moveTo(s * w * 0.8, hy + 0.05 + k * 0.12);
      ctx.lineTo(s * (w + 0.3 - k * 0.05), hy - 0.05 + k * 0.16);
      ctx.lineTo(s * w * 0.85, hy + 0.16 + k * 0.12);
      ctx.closePath();
      ctx.fillStyle = mixHex(L.skin2, '#000000', 0.2);
      ctx.fill();
    }
  }
  ell(ctx, 0, hy, w, 0.4);
  ctx.fillStyle = skinGrad(ctx, L, 0, hy, 0.5);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-w * 0.72, hy + 0.1);
  ctx.quadraticCurveTo(-w * 0.8, hy + 0.62, -0.17, hy + 0.8);
  ctx.quadraticCurveTo(0, hy + 0.88, 0.17, hy + 0.8);
  ctx.quadraticCurveTo(w * 0.8, hy + 0.62, w * 0.72, hy + 0.1);
  ctx.closePath();
  ctx.fillStyle = skinGrad(ctx, L, 0, hy + 0.4, 0.55);
  ctx.fill();
  // scales
  ctx.strokeStyle = 'rgba(0,0,0,0.22)';
  ctx.lineWidth = 0.012;
  for (let r = 0; r < 3; r++) {
    for (let i = -2; i <= 2; i++) {
      const x = i * 0.1 + (r % 2) * 0.05, y = hy - 0.3 + r * 0.08;
      ctx.beginPath();
      ctx.arc(x, y, 0.05, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();
    }
  }
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 0.04, hy - 0.02);
    ctx.lineTo(s * w * 0.85, hy - 0.16);
    ctx.lineTo(s * w * 0.8, hy - 0.04);
    ctx.closePath();
    ctx.fill();
  }
  eyes(ctx, L, hy + 0.04, 0.2, t, true);
  // nostrils with smoke
  for (const s of [-1, 1]) {
    ell(ctx, s * 0.08, hy + 0.68, 0.03, 0.018, s * 0.4);
    ctx.fillStyle = '#140404';
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 3; k++) {
    const ph = (t * 0.6 + k / 3) % 1;
    ctx.globalAlpha = 0.35 * (1 - ph);
    const s = 0.12 + ph * 0.3;
    ctx.drawImage(glow(L.aura), -s + Math.sin(ph * 6 + k) * 0.05, hy + 0.6 - ph * 0.6 - s, s * 2, s * 2);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = '#180404';
  ctx.lineWidth = 0.022;
  ctx.beginPath();
  ctx.moveTo(-0.24, hy + 0.66);
  ctx.quadraticCurveTo(0, hy + 0.76, 0.24, hy + 0.66);
  ctx.stroke();
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 0.2, hy + 0.66);
    ctx.lineTo(s * 0.15, hy + 0.84);
    ctx.lineTo(s * 0.13, hy + 0.68);
    ctx.fillStyle = '#f7efdc';
    ctx.fill();
  }
  if (L.crown) crown(ctx, hy - 0.34, w * 0.7, t);
}

export function drawPortrait(ctx: C, L: Look, cx: number, cy: number, R: number, t: number, st: PState) {
  ctx.save();
  const h = st.hit;
  ctx.translate(cx + (h ? (Math.random() - 0.5) * R * 0.18 * h : 0), cy + (h ? (Math.random() - 0.5) * R * 0.18 * h : 0));
  const alive = 1 - st.dead;

  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = (0.5 + 0.15 * Math.sin(t * 2 + L.seed)) * alive;
  ctx.drawImage(glow(L.aura), -R * 1.9, -R * 1.9, R * 3.8, R * 3.8);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, TAU);
  ctx.clip();
  const bg = ctx.createRadialGradient(0, R * 0.25, 0, 0, 0, R * 1.1);
  bg.addColorStop(0, mixHex(L.aura, '#000000', 0.5));
  bg.addColorStop(1, '#07050d');
  ctx.fillStyle = bg;
  ctx.fillRect(-R, -R, 2 * R, 2 * R);

  // swirling motes behind the creature
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 5; k++) {
    const a = t * 0.5 + k * 1.3 + L.seed;
    ctx.globalAlpha = 0.25;
    const s = R * 0.5;
    ctx.drawImage(glow(L.aura), Math.cos(a) * R * 0.6 - s, Math.sin(a * 1.3) * R * 0.4 - R * 0.2 - s, s * 2, s * 2);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  ctx.save();
  ctx.globalAlpha = alive;
  ctx.scale(R, R);
  const br = Math.sin(t * 1.7 + L.seed) * 0.018;
  ctx.translate(0, 0.12 + st.dead * 0.3);
  ctx.scale(1 + br * 0.4 - st.dead * 0.1, 1 + br - st.dead * 0.1);
  body(ctx, L);
  if (L.kind === 'beast') beast(ctx, L, t);
  else if (L.kind === 'skull') skullHead(ctx, L, t);
  else if (L.kind === 'hood') hooded(ctx, L, t);
  else if (L.kind === 'golem') golem(ctx, L, t);
  else wyrm(ctx, L, t);
  ctx.restore();

  ctx.globalCompositeOperation = 'lighter';
  if (h > 0) {
    ctx.fillStyle = `rgba(255,40,40,${h * 0.55})`;
    ctx.fillRect(-R, -R, 2 * R, 2 * R);
  }
  if (st.flash > 0) {
    ctx.fillStyle = rgba(st.flashColor, st.flash * 0.5);
    ctx.fillRect(-R, -R, 2 * R, 2 * R);
  }
  if (st.poison) {
    ctx.fillStyle = `rgba(60,255,110,${0.1 + 0.06 * Math.sin(t * 4)})`;
    ctx.fillRect(-R, -R, 2 * R, 2 * R);
  }
  ctx.globalCompositeOperation = 'source-over';
  const vg = ctx.createRadialGradient(0, 0, R * 0.55, 0, 0, R);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.65)');
  ctx.fillStyle = vg;
  ctx.fillRect(-R, -R, 2 * R, 2 * R);
  ctx.restore();

  // frame
  const fg = ctx.createLinearGradient(-R, -R, R, R);
  fg.addColorStop(0, '#fff0c2');
  fg.addColorStop(0.3, '#e2b563');
  fg.addColorStop(0.62, '#7d4f1c');
  fg.addColorStop(1, '#f3d289');
  ctx.lineWidth = Math.max(3, R * 0.09);
  ctx.strokeStyle = fg;
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, TAU);
  ctx.stroke();
  ctx.lineWidth = Math.max(1, R * 0.025);
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.beginPath();
  ctx.arc(0, 0, R * 1.055, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = rgba(L.aura, 0.8);
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.945, 0, TAU);
  ctx.stroke();
  // little gem at the bottom of the frame
  ctx.beginPath();
  ctx.moveTo(0, R * 0.9);
  ctx.lineTo(R * 0.1, R * 1.02);
  ctx.lineTo(0, R * 1.14);
  ctx.lineTo(-R * 0.1, R * 1.02);
  ctx.closePath();
  ctx.fillStyle = L.aura;
  ctx.fill();
  ctx.strokeStyle = '#3a2208';
  ctx.stroke();
  ctx.restore();
}
