import { svgURL } from './art';
import { GEM_SVG } from './gemsvg';

export interface GemPal { base: string; light: string; dark: string; glow: string }

export const GEM_PAL: GemPal[] = [
  { base: '#ff3b2f', light: '#ffc9b0', dark: '#5e0602', glow: '#ff6a3d' }, // fire ruby
  { base: '#2e8bff', light: '#c0e6ff', dark: '#051a5c', glow: '#4fb4ff' }, // water sapphire
  { base: '#1fc767', light: '#bff9d4', dark: '#023a1c', glow: '#3cf08a' }, // earth emerald
  { base: '#ffc414', light: '#fff6c0', dark: '#6e3f00', glow: '#ffd84a' }, // air topaz
  { base: '#e8dcc4', light: '#ffffff', dark: '#4d3d2c', glow: '#ff3b3b' }, // skull
  { base: '#c8d0d8', light: '#ffffff', dark: '#4a545e', glow: '#e4ecff' }, // coin (silver złotówka)
  { base: '#b23ad0', light: '#f0b8ff', dark: '#4a0a5e', glow: '#d86aff' }, // bottle cap
];

function render(t: number, px: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = px;
  const img = images[t];
  if (img && img.complete && img.naturalWidth) c.getContext('2d')!.drawImage(img, px * 0.02, px * 0.02, px * 0.96, px * 0.96);
  return c;
}

const images: HTMLImageElement[] = [];

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

  /** Decode the vector art once; every sprite is rasterized from it. */
  async load() {
    GEM_SVG.forEach((svg, t) => {
      const img = new Image();
      img.src = svgURL(svg);
      images[t] = img;
    });
    await Promise.all(images.map((i) => i.decode().catch(() => undefined)));
    this.px = 0;
    this.bigCache.clear();
  }

  ensure(cellCss: number, dpr: number) {
    const px = Math.max(16, Math.round(cellCss * dpr));
    if (px === this.px) return;
    this.px = px;
    for (let t = 0; t < GEM_SVG.length; t++) {
      this.spr[t] = render(t, px);
      this.wht[t] = whiteOf(this.spr[t]);
    }
    this.ice = makeIce(px);
  }

  /** PNG data URL, for DOM cost chips. */
  icon(t: number): string {
    if (!this.iconCache[t]) this.iconCache[t] = svgURL(GEM_SVG[t]);
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
