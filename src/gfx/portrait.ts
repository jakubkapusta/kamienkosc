import { TAU } from '../core/rng';
import { artGlow, artSVG, svgURL, type Pal } from './art';
import { mixHex, rgba } from './color';
import { glow } from './sprites';

export interface Look {
  art: string;
  pal: Pal;
  aura: string;
  seed: number;
  crown?: boolean;
}

export interface PState {
  hit: number;
  dead: number;
  poison: boolean;
  flash: number;
  flashColor: string;
}

const images = new Map<string, HTMLImageElement>();
const rasters = new Map<string, HTMLCanvasElement>();

const keyOf = (L: Look, blink: boolean) => `${L.art}|${L.pal.skin}|${L.pal.acc}|${L.pal.eye}|${L.pal.hair ?? ''}|${L.crown ? 1 : 0}|${blink ? 1 : 0}`;

function image(L: Look, blink: boolean): HTMLImageElement {
  const k = keyOf(L, blink);
  let img = images.get(k);
  if (!img) {
    img = new Image();
    img.decoding = 'async';
    img.src = svgURL(artSVG(L.art, L.pal, blink, { crown: L.crown }));
    images.set(k, img);
  }
  return img;
}

/** Vector art rasterized once per size, so the per-frame cost is a single drawImage. */
function raster(L: Look, blink: boolean, px: number): HTMLCanvasElement | null {
  const img = image(L, blink);
  if (!img.complete || !img.naturalWidth) return null;
  const k = `${keyOf(L, blink)}@${px}`;
  let c = rasters.get(k);
  if (!c) {
    c = document.createElement('canvas');
    c.width = c.height = px;
    c.getContext('2d')!.drawImage(img, 0, 0, px, px);
    rasters.set(k, c);
  }
  return c;
}

export function preloadLook(L: Look): Promise<void> {
  const imgs = [image(L, false), image(L, true)];
  return Promise.all(imgs.map((i) => (i.complete ? Promise.resolve() : i.decode().catch(() => undefined)))).then(() => undefined);
}

/** Framed portrait as a standalone SVG (for DOM images). */
export function portraitURL(L: Look): string {
  const inner = artSVG(L.art, L.pal, false, { crown: L.crown }).replace('<svg ', '<svg x="0" y="0" ');
  const bg = mixHex(L.aura, '#000000', 0.5);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-12 -12 224 224" width="224" height="224">
<defs><clipPath id="pc"><circle cx="100" cy="100" r="100"/></clipPath>
<radialGradient id="pbg" cx=".5" cy=".62" r=".6"><stop offset="0" stop-color="${bg}"/><stop offset="1" stop-color="#07050d"/></radialGradient>
<linearGradient id="pring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0c2"/><stop offset=".3" stop-color="#e2b563"/><stop offset=".62" stop-color="#7d4f1c"/><stop offset="1" stop-color="#f3d289"/></linearGradient></defs>
<circle cx="100" cy="100" r="100" fill="url(#pbg)"/>
<g clip-path="url(#pc)">${inner}</g>
<circle cx="100" cy="100" r="101" fill="none" stroke="url(#pring)" stroke-width="9"/>
<circle cx="100" cy="100" r="95.5" fill="none" stroke="${L.aura}" stroke-width="2" opacity=".8"/>
</svg>`;
  return svgURL(svg);
}

function blinking(t: number, seed: number) {
  const cyc = 3.2 + (seed % 7) * 0.35;
  const ph = (t + seed * 0.37) % cyc;
  return ph < 0.14;
}

export function drawPortrait(ctx: CanvasRenderingContext2D, L: Look, cx: number, cy: number, R: number, t: number, st: PState) {
  ctx.save();
  const h = st.hit;
  ctx.translate(cx + (h ? (Math.random() - 0.5) * R * 0.18 * h : 0), cy + (h ? (Math.random() - 0.5) * R * 0.18 * h : 0));
  const alive = 1 - st.dead;

  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = (0.45 + 0.15 * Math.sin(t * 2 + L.seed)) * alive;
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

  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 4; k++) {
    const a = t * 0.5 + k * 1.6 + L.seed;
    ctx.globalAlpha = 0.2;
    const s = R * 0.55;
    ctx.drawImage(glow(L.aura), Math.cos(a) * R * 0.6 - s, Math.sin(a * 1.3) * R * 0.4 - R * 0.25 - s, s * 2, s * 2);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  const px = Math.round(R * 2 * Math.min(2, window.devicePixelRatio || 1));
  const blink = blinking(t, L.seed);
  const img = raster(L, blink, px) ?? raster(L, false, px);
  ctx.save();
  ctx.globalAlpha = alive;
  const br = Math.sin(t * 1.7 + L.seed) * 0.014;
  ctx.translate(0, R + st.dead * R * 0.35);
  ctx.scale(1 + br * 0.4 - st.dead * 0.08, 1 + br - st.dead * 0.08);
  ctx.translate(0, -R);
  if (img) ctx.drawImage(img, -R, -R, 2 * R, 2 * R);
  const k = R / 100;
  const eyes = artGlow(L.art);
  if (eyes.length && !blink) {
    ctx.globalCompositeOperation = 'lighter';
    const fl = 0.75 + 0.25 * Math.sin(t * 7 + L.seed);
    for (const [x, y, r] of eyes) {
      const s = r * k * 3.2;
      ctx.globalAlpha = alive * fl * 0.85;
      ctx.drawImage(glow(L.pal.eye), (x - 100) * k - s, (y - 100) * k - s, s * 2, s * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();

  ctx.globalCompositeOperation = 'lighter';
  if (h > 0) {
    ctx.fillStyle = `rgba(255,40,40,${h * 0.5})`;
    ctx.fillRect(-R, -R, 2 * R, 2 * R);
  }
  if (st.flash > 0) {
    ctx.fillStyle = rgba(st.flashColor, st.flash * 0.45);
    ctx.fillRect(-R, -R, 2 * R, 2 * R);
  }
  if (st.poison) {
    ctx.fillStyle = `rgba(60,255,110,${0.1 + 0.06 * Math.sin(t * 4)})`;
    ctx.fillRect(-R, -R, 2 * R, 2 * R);
  }
  ctx.globalCompositeOperation = 'source-over';
  const vg = ctx.createRadialGradient(0, 0, R * 0.7, 0, 0, R);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = vg;
  ctx.fillRect(-R, -R, 2 * R, 2 * R);
  ctx.restore();

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
