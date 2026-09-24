import { app, type Scene } from '../app';
import { TAU } from '../core/rng';
import { MENU_THEME } from '../core/types';
import { gemArt, GEM_PAL } from '../gfx/gems';
import { glow, star } from '../gfx/sprites';

interface Float { x: number; y: number; z: number; t: number; rot: number; vr: number; ph: number }

/** Attract-mode backdrop: gems drifting through the nebula at different depths. */
export class MenuScene implements Scene {
  private items: Float[] = [];
  private t = 0;

  constructor() {
    app.bg.setTheme(...MENU_THEME);
    for (let i = 0; i < 22; i++) this.items.push(this.spawn(Math.random()));
    this.items.sort((a, b) => a.z - b.z);
  }

  private spawn(y: number): Float {
    return { x: Math.random(), y, z: Math.random(), t: Math.floor(Math.random() * 6), rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 0.6, ph: Math.random() * 10 };
  }

  update(dt: number) {
    this.t += dt;
    for (const f of this.items) {
      f.y += dt * (0.015 + f.z * 0.05);
      f.rot += f.vr * dt;
      if (f.y > 1.15) Object.assign(f, this.spawn(-0.15), { z: f.z });
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    const W = app.W, H = app.H;
    for (const f of this.items) {
      const size = 26 + f.z * 70;
      const x = f.x * W + Math.sin(this.t * 0.5 + f.ph) * 20 * f.z;
      const y = f.y * H;
      const px = size > 64 ? 128 : 64;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.25 + f.z * 0.35;
      ctx.drawImage(glow(GEM_PAL[f.t].glow), x - size, y - size, size * 2, size * 2);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.35 + f.z * 0.65;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin(f.rot) * 0.4);
      ctx.drawImage(gemArt.big(f.t, px), -size / 2, -size / 2, size, size);
      ctx.restore();
      if (Math.sin(this.t * 1.3 + f.ph * 5) > 0.97) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 1;
        ctx.drawImage(star(), x - size * 0.5, y - size * 0.55, size * 0.6, size * 0.6);
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    ctx.globalAlpha = 1;
  }
}
