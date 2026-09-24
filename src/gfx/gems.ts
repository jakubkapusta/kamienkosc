import { mixHex, rgba } from './color';

export interface GemPal { base: string; light: string; dark: string; glow: string }

export const GEM_PAL: GemPal[] = [
  { base: '#ff3b2f', light: '#ffc9b0', dark: '#5e0602', glow: '#ff6a3d' }, // fire ruby
  { base: '#2e8bff', light: '#c0e6ff', dark: '#051a5c', glow: '#4fb4ff' }, // water sapphire
  { base: '#1fc767', light: '#bff9d4', dark: '#023a1c', glow: '#3cf08a' }, // earth emerald
  { base: '#ffc414', light: '#fff6c0', dark: '#6e3f00', glow: '#ffd84a' }, // air topaz
  { base: '#e8dcc4', light: '#ffffff', dark: '#4d3d2c', glow: '#ff3b3b' }, // skull
  { base: '#f0ad2a', light: '#fff1b8', dark: '#7a4600', glow: '#ffcf4a' }, // coin
];

type Pt = [number, number];
const ngon = (n: number, rot: number, sx = 1, sy = 1): Pt[] =>
  Array.from({ length: n }, (_, i) => {
    const a = rot + (i * Math.PI * 2) / n;
    return [Math.cos(a) * sx, Math.sin(a) * sy] as Pt;
  });

// Distinct silhouettes per color, so the board reads even without color.
const SHAPES: Pt[][] = [
  ngon(6, -Math.PI / 2, 0.98, 1.02),
  ngon(10, -Math.PI / 2 + Math.PI / 10, 0.95, 0.95),
  [[-0.56, -0.84], [0.56, -0.84], [0.84, -0.56], [0.84, 0.56], [0.56, 0.84], [-0.56, 0.84], [-0.84, 0.56], [-0.84, -0.56]],
  [[0, -1.04], [0.92, -0.1], [0, 1.02], [-0.92, -0.1]],
];

function poly(ctx: CanvasRenderingContext2D, pts: Pt[]) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
}

function shade(p: GemPal, s: number) {
  return s < 0.5 ? mixHex(p.dark, p.base, s * 2) : mixHex(p.base, p.light, Math.min(1, (s - 0.5) * 2));
}

function dropShadow(ctx: CanvasRenderingContext2D, r: number) {
  ctx.save();
  ctx.translate(0, r * 0.86);
  ctx.scale(1, 0.3);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.95);
  g.addColorStop(0, 'rgba(0,0,0,0.6)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function glint(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, a = 0.95) {
  ctx.save();
  ctx.translate(x, y);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s);
  g.addColorStop(0, `rgba(255,255,255,${a})`);
  g.addColorStop(0.3, `rgba(255,255,255,${a * 0.4})`);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  for (let k = 0; k < 8; k++) {
    const an = (k * Math.PI) / 4 - Math.PI / 2;
    const rr = k % 2 ? s * 0.16 : s;
    ctx.lineTo(Math.cos(an) * rr, Math.sin(an) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function faceted(ctx: CanvasRenderingContext2D, t: number, r: number) {
  const p = GEM_PAL[t];
  const P = SHAPES[t].map(([x, y]) => [x * r, y * r] as Pt);
  const n = P.length;
  const k = t === 3 ? 0.44 : 0.53;
  const I = P.map(([x, y]) => [x * k, y * k - r * 0.05] as Pt);
  const Lx = -0.5, Ly = -0.866;

  poly(ctx, P);
  ctx.fillStyle = p.dark;
  ctx.fill();

  // crown facets, lit by a key light from the top-left
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const mx = (P[i][0] + P[j][0]) / 2, my = (P[i][1] + P[j][1]) / 2;
    const len = Math.hypot(mx, my) || 1;
    const d = (mx / len) * Lx + (my / len) * Ly;
    const s = 0.5 + 0.5 * d;
    const ix = (I[i][0] + I[j][0]) / 2, iy = (I[i][1] + I[j][1]) / 2;
    const g = ctx.createLinearGradient(mx, my, ix, iy);
    g.addColorStop(0, shade(p, 0.1 + s * 0.6));
    g.addColorStop(1, shade(p, 0.3 + s * 0.72));
    ctx.beginPath();
    ctx.moveTo(P[i][0], P[i][1]);
    ctx.lineTo(P[j][0], P[j][1]);
    ctx.lineTo(I[j][0], I[j][1]);
    ctx.lineTo(I[i][0], I[i][1]);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = rgba(p.light, 0.14 + 0.3 * Math.max(0, d));
    ctx.lineWidth = r * 0.022;
    ctx.stroke();
  }

  // table
  const tg = ctx.createLinearGradient(-r * 0.45, -r * 0.55, r * 0.35, r * 0.45);
  tg.addColorStop(0, p.light);
  tg.addColorStop(0.45, shade(p, 0.64));
  tg.addColorStop(1, shade(p, 0.34));
  poly(ctx, I);
  ctx.fillStyle = tg;
  ctx.fill();

  ctx.save();
  poly(ctx, I);
  ctx.clip();
  const cy = -r * 0.05;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(I[i][0], I[i][1]);
    ctx.lineTo(I[j][0], I[j][1]);
    ctx.closePath();
    ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.10)' : rgba(p.dark, 0.14);
    ctx.fill();
  }
  ctx.restore();

  // internal fire: light scattering inside the stone
  ctx.globalCompositeOperation = 'lighter';
  const ig = ctx.createRadialGradient(r * 0.1, r * 0.25, 0, 0, r * 0.15, r * 0.85);
  ig.addColorStop(0, rgba(p.glow, 0.55));
  ig.addColorStop(1, rgba(p.glow, 0));
  poly(ctx, P);
  ctx.fillStyle = ig;
  ctx.fill();

  ctx.save();
  poly(ctx, P);
  ctx.clip();
  const sg = ctx.createRadialGradient(-r * 0.34, -r * 0.48, 0, -r * 0.34, -r * 0.48, r * 0.6);
  sg.addColorStop(0, 'rgba(255,255,255,0.7)');
  sg.addColorStop(0.35, 'rgba(255,255,255,0.16)');
  sg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(-r, -r, 2 * r, 2 * r);
  const bg = ctx.createRadialGradient(r * 0.35, r * 0.75, 0, r * 0.35, r * 0.75, r * 0.6);
  bg.addColorStop(0, rgba(p.light, 0.4));
  bg.addColorStop(1, rgba(p.light, 0));
  ctx.fillStyle = bg;
  ctx.fillRect(-r, -r, 2 * r, 2 * r);
  ctx.restore();

  ctx.globalCompositeOperation = 'source-over';
  poly(ctx, P);
  ctx.strokeStyle = rgba(p.dark, 0.95);
  ctx.lineWidth = r * 0.05;
  ctx.stroke();

  ctx.globalCompositeOperation = 'lighter';
  glint(ctx, -r * 0.36, -r * 0.42, r * 0.3);
  ctx.globalCompositeOperation = 'source-over';
}

function skull(ctx: CanvasRenderingContext2D, r: number) {
  const bone = ctx.createRadialGradient(-r * 0.3, -r * 0.55, 0, 0, 0, r * 1.25);
  bone.addColorStop(0, '#fffaf0');
  bone.addColorStop(0.45, '#e2d3b3');
  bone.addColorStop(1, '#7d6446');
  ctx.fillStyle = bone;
  ctx.strokeStyle = '#3b2a1a';
  ctx.lineWidth = r * 0.06;
  ctx.lineJoin = 'round';

  // cranium + cheeks + jaw as one silhouette
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.16, r * 0.8, r * 0.72, 0, Math.PI * 0.86, Math.PI * 2.14);
  ctx.lineTo(r * 0.6, r * 0.28);
  ctx.quadraticCurveTo(r * 0.5, r * 0.4, r * 0.46, r * 0.5);
  ctx.lineTo(r * 0.44, r * 0.74);
  ctx.quadraticCurveTo(0, r * 0.94, -r * 0.44, r * 0.74);
  ctx.lineTo(-r * 0.46, r * 0.5);
  ctx.quadraticCurveTo(-r * 0.5, r * 0.4, -r * 0.6, r * 0.28);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // temple shading
  ctx.save();
  ctx.clip();
  const sh = ctx.createLinearGradient(0, -r, 0, r);
  sh.addColorStop(0, 'rgba(0,0,0,0)');
  sh.addColorStop(1, 'rgba(60,30,10,0.35)');
  ctx.fillStyle = sh;
  ctx.fillRect(-r, -r, 2 * r, 2 * r);
  ctx.restore();

  // sockets with ember glow
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.translate(s * r * 0.3, r * 0.02);
    ctx.rotate(s * 0.18);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.22, r * 0.25, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#1a0806';
    ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    const eg = ctx.createRadialGradient(0, r * 0.03, 0, 0, r * 0.03, r * 0.2);
    eg.addColorStop(0, 'rgba(255,120,80,0.95)');
    eg.addColorStop(0.35, 'rgba(255,40,30,0.55)');
    eg.addColorStop(1, 'rgba(255,0,0,0)');
    ctx.fillStyle = eg;
    ctx.fill();
    ctx.restore();
  }
  ctx.globalCompositeOperation = 'source-over';

  // nose
  ctx.beginPath();
  ctx.moveTo(0, r * 0.22);
  ctx.lineTo(-r * 0.1, r * 0.4);
  ctx.lineTo(r * 0.1, r * 0.4);
  ctx.closePath();
  ctx.fillStyle = '#2a140c';
  ctx.fill();

  // teeth
  ctx.strokeStyle = 'rgba(40,20,10,0.8)';
  ctx.lineWidth = r * 0.04;
  ctx.beginPath();
  ctx.moveTo(-r * 0.36, r * 0.6);
  ctx.quadraticCurveTo(0, r * 0.66, r * 0.36, r * 0.6);
  for (let i = -2; i <= 2; i++) {
    ctx.moveTo(i * r * 0.14, r * 0.5);
    ctx.lineTo(i * r * 0.14, r * 0.78);
  }
  ctx.stroke();

  // crack
  ctx.beginPath();
  ctx.moveTo(r * 0.2, -r * 0.84);
  ctx.lineTo(r * 0.28, -r * 0.6);
  ctx.lineTo(r * 0.18, -r * 0.46);
  ctx.lineWidth = r * 0.03;
  ctx.stroke();

  ctx.globalCompositeOperation = 'lighter';
  glint(ctx, -r * 0.4, -r * 0.5, r * 0.26, 0.8);
  ctx.globalCompositeOperation = 'source-over';
}

function coin(ctx: CanvasRenderingContext2D, r: number) {
  const R = r * 0.84;
  const p = GEM_PAL[5];
  const edge = ctx.createLinearGradient(-R, -R, R, R);
  edge.addColorStop(0, p.light);
  edge.addColorStop(0.5, p.base);
  edge.addColorStop(1, p.dark);
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.fillStyle = edge;
  ctx.fill();
  ctx.strokeStyle = '#5a3200';
  ctx.lineWidth = r * 0.05;
  ctx.stroke();

  const face = ctx.createRadialGradient(-R * 0.3, -R * 0.35, 0, 0, 0, R * 0.9);
  face.addColorStop(0, '#fff6cf');
  face.addColorStop(0.4, '#f7c247');
  face.addColorStop(1, '#a8650c');
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.8, 0, Math.PI * 2);
  ctx.fillStyle = face;
  ctx.fill();
  ctx.strokeStyle = 'rgba(110,60,0,0.6)';
  ctx.lineWidth = r * 0.04;
  ctx.stroke();

  // embossed star
  const starPath = (dx: number, dy: number) => {
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      const rr = k % 2 ? R * 0.2 : R * 0.46;
      ctx.lineTo(Math.cos(a) * rr + dx, Math.sin(a) * rr + dy);
    }
    ctx.closePath();
  };
  starPath(R * 0.04, R * 0.05);
  ctx.fillStyle = 'rgba(100,50,0,0.6)';
  ctx.fill();
  starPath(-R * 0.03, -R * 0.03);
  ctx.fillStyle = '#fff3c4';
  ctx.fill();
  starPath(0, 0);
  const sf = ctx.createLinearGradient(-R * 0.4, -R * 0.4, R * 0.4, R * 0.4);
  sf.addColorStop(0, '#ffe07a');
  sf.addColorStop(1, '#d08a14');
  ctx.fillStyle = sf;
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.clip();
  ctx.rotate(-0.7);
  ctx.globalCompositeOperation = 'lighter';
  const band = ctx.createLinearGradient(-R, 0, R, 0);
  band.addColorStop(0.2, 'rgba(255,255,255,0)');
  band.addColorStop(0.35, 'rgba(255,255,255,0.35)');
  band.addColorStop(0.45, 'rgba(255,255,255,0)');
  ctx.fillStyle = band;
  ctx.fillRect(-R, -R, 2 * R, 2 * R);
  ctx.restore();
  ctx.globalCompositeOperation = 'lighter';
  glint(ctx, -R * 0.45, -R * 0.45, r * 0.26, 0.85);
  ctx.globalCompositeOperation = 'source-over';
}

function render(t: number, px: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = px;
  const ctx = c.getContext('2d')!;
  ctx.translate(px / 2, px / 2);
  const r = px * 0.4;
  dropShadow(ctx, r);
  if (t < 4) faceted(ctx, t, r);
  else if (t === 4) skull(ctx, r);
  else coin(ctx, r);
  return c;
}

function whiteOf(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  return c;
}

function makeIce(px: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = px;
  const ctx = c.getContext('2d')!;
  ctx.translate(px / 2, px / 2);
  const s = px * 0.46, r = s * 0.28;
  ctx.beginPath();
  ctx.moveTo(-s + r, -s);
  ctx.arcTo(s, -s, s, s, r);
  ctx.arcTo(s, s, -s, s, r);
  ctx.arcTo(-s, s, -s, -s, r);
  ctx.arcTo(-s, -s, s, -s, r);
  ctx.closePath();
  const g = ctx.createLinearGradient(-s, -s, s, s);
  g.addColorStop(0, 'rgba(215,240,255,0.55)');
  g.addColorStop(0.5, 'rgba(140,200,255,0.22)');
  g.addColorStop(1, 'rgba(90,150,240,0.4)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(235,250,255,0.9)';
  ctx.lineWidth = px * 0.03;
  ctx.stroke();
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = px * 0.045;
  ctx.beginPath();
  ctx.moveTo(-s * 0.72, -s * 0.2);
  ctx.lineTo(-s * 0.2, -s * 0.72);
  ctx.stroke();
  ctx.lineWidth = px * 0.016;
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.moveTo(s * 0.1, -s * 0.95);
  ctx.lineTo(s * 0.26, -s * 0.3);
  ctx.lineTo(s * 0.02, s * 0.12);
  ctx.lineTo(s * 0.42, s * 0.62);
  ctx.moveTo(s * 0.26, -s * 0.3);
  ctx.lineTo(s * 0.72, -s * 0.1);
  ctx.stroke();
  return c;
}

export class GemArt {
  px = 0;
  spr: HTMLCanvasElement[] = [];
  wht: HTMLCanvasElement[] = [];
  ice!: HTMLCanvasElement;
  private iconCache: string[] = [];
  private bigCache = new Map<string, HTMLCanvasElement>();

  ensure(cellCss: number, dpr: number) {
    const px = Math.max(16, Math.round(cellCss * dpr));
    if (px === this.px) return;
    this.px = px;
    for (let t = 0; t < 6; t++) {
      this.spr[t] = render(t, px);
      this.wht[t] = whiteOf(this.spr[t]);
    }
    this.ice = makeIce(px);
  }

  /** PNG data URL, for DOM cost chips. */
  icon(t: number): string {
    if (!this.iconCache[t]) this.iconCache[t] = render(t, 48).toDataURL();
    return this.iconCache[t];
  }

  big(t: number, px: number): HTMLCanvasElement {
    const key = `${t}:${px}`;
    let c = this.bigCache.get(key);
    if (!c) {
      c = render(t, px);
      this.bigCache.set(key, c);
    }
    return c;
  }
}

export const gemArt = new GemArt();
