import { mixHex, rgba } from './color';

const glowCache = new Map<string, HTMLCanvasElement>();

/** Soft additive light blob, tinted. Drawn with 'lighter' it reads as bloom. */
export function glow(color: string): HTMLCanvasElement {
  let c = glowCache.get(color);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, rgba(mixHex(color, '#ffffff', 0.55), 1));
  gr.addColorStop(0.16, rgba(color, 0.85));
  gr.addColorStop(0.42, rgba(color, 0.28));
  gr.addColorStop(1, rgba(color, 0));
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  glowCache.set(color, c);
  return c;
}

let starSprite: HTMLCanvasElement | null = null;
/** Four-point twinkle. */
export function star(): HTMLCanvasElement {
  if (starSprite) return starSprite;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  g.translate(32, 32);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.2, 'rgba(255,255,255,0.35)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.beginPath();
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4 - Math.PI / 2;
    const r = k % 2 ? 5 : 32;
    g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  g.closePath();
  g.fill();
  starSprite = c;
  return c;
}

export function blit(ctx: CanvasRenderingContext2D, img: CanvasImageSource, x: number, y: number, size: number) {
  ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
