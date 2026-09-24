import { app, type Scene } from '../app';
import { clamp, TAU } from '../core/rng';
import { MENU_THEME } from '../core/types';
import { glow } from '../gfx/sprites';

interface Win { lit: number; target: number; tv: boolean; next: number; curtain: number }
interface Star { x: number; y: number; r: number; ph: number }

/**
 * Title screen: an apartment block at night, the neon title on its roof,
 * windows switching on and off, a street lamp, a bench and the neighbourhood cat.
 */
export class MenuScene implements Scene {
  private t = 0;
  private wins: Win[] = [];
  private stars: Star[] = [];
  private cols = 7;
  private rows = 6;
  private shooting: { x: number; y: number; vx: number; vy: number; life: number } | null = null;

  constructor() {
    app.bg.setTheme(...MENU_THEME);
    for (let i = 0; i < 90; i++) this.stars.push({ x: Math.random(), y: Math.random() * 0.55, r: 0.4 + Math.random() * 1.3, ph: Math.random() * 10 });
    this.resize();
  }

  resize() {
    this.cols = app.W > 700 ? 11 : 7;
    this.rows = app.H > 700 ? 7 : 5;
    this.wins = Array.from({ length: this.cols * this.rows }, () => {
      const lit = Math.random() < 0.45 ? 1 : 0;
      return { lit, target: lit, tv: Math.random() < 0.12, next: 1 + Math.random() * 8, curtain: Math.random() };
    });
  }

  update(dt: number) {
    this.t += dt;
    for (const w of this.wins) {
      w.next -= dt;
      if (w.next <= 0) {
        w.target = Math.random() < 0.5 ? 1 : 0;
        w.next = 3 + Math.random() * 12;
      }
      w.lit += (w.target - w.lit) * Math.min(1, dt * 10);
    }
    if (!this.shooting && Math.random() < dt * 0.08) {
      this.shooting = { x: Math.random() * app.W * 0.7, y: Math.random() * app.H * 0.2, vx: 420 + Math.random() * 200, vy: 160, life: 0.9 };
    }
    if (this.shooting) {
      const s = this.shooting;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
      if (s.life <= 0) this.shooting = null;
    }
  }

  /** Roof line: just under the DOM title so the neon sits on the block. */
  private roofY() {
    const r = document.querySelector('.title-block')?.getBoundingClientRect();
    return r && r.height ? r.bottom + 16 : app.H * 0.3;
  }

  render(ctx: CanvasRenderingContext2D) {
    const W = app.W, H = app.H, t = this.t;

    // sky
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#07061a');
    sky.addColorStop(0.45, '#1c1440');
    sky.addColorStop(0.75, '#3a1f52');
    sky.addColorStop(1, '#4a2440');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    for (const s of this.stars) {
      ctx.globalAlpha = 0.35 + 0.35 * Math.sin(t * 1.5 + s.ph);
      ctx.fillStyle = '#fff6e0';
      ctx.beginPath();
      ctx.arc(s.x * W, s.y * H, s.r, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (this.shooting) {
      const s = this.shooting;
      const g = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 0.15, s.y - s.vy * 0.15);
      g.addColorStop(0, `rgba(255,255,255,${s.life})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = g;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - s.vx * 0.15, s.y - s.vy * 0.15);
      ctx.stroke();
    }
    // moon, rising from behind the block
    const roof = clamp(this.roofY(), H * 0.2, H * 0.55);
    const mr = Math.min(W, H) * 0.075;
    const mx = W > 700 ? W * 0.8 : W * 0.86, my = roof - mr * 0.35;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.5;
    ctx.drawImage(glow('#ffe6b0'), mx - mr * 4, my - mr * 4, mr * 8, mr * 8);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#fff4d6';
    ctx.beginPath();
    ctx.arc(mx, my, mr, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(200,180,140,0.35)';
    for (const [dx, dy, r] of [[-0.3, -0.2, 0.22], [0.25, 0.2, 0.16], [0.1, -0.35, 0.1]]) {
      ctx.beginPath();
      ctx.arc(mx + dx * mr, my + dy * mr, r * mr, 0, TAU);
      ctx.fill();
    }

    // distant blocks silhouette
    ctx.fillStyle = '#150f2c';
    let x = -20;
    let k = 0;
    while (x < W + 20) {
      const w = 50 + ((k * 37) % 40), h = H - roof - 40 + ((k * 53) % 70);
      ctx.fillRect(x, H - h, w, h);
      for (let wy = H - h + 10; wy < H - 20; wy += 16)
        for (let wx = x + 6; wx < x + w - 8; wx += 12)
          if (((wx * 7 + wy * 3 + k) | 0) % 9 === 0) {
            ctx.fillStyle = 'rgba(255,210,120,0.5)';
            ctx.fillRect(wx, wy, 5, 6);
            ctx.fillStyle = '#150f2c';
          }
      x += w + 8;
      k++;
    }

    // the block
    const bw = Math.min(W * 0.94, 640), bx = (W - bw) / 2, bh = H - roof;
    const wall = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    wall.addColorStop(0, '#6e6a84');
    wall.addColorStop(0.7, '#5e5a76');
    wall.addColorStop(1, '#46425e');
    ctx.fillStyle = wall;
    ctx.fillRect(bx, roof, bw, bh);
    // neon light spilling on the roof edge
    const spill = ctx.createLinearGradient(0, roof, 0, roof + 90);
    spill.addColorStop(0, 'rgba(255,80,170,0.35)');
    spill.addColorStop(1, 'rgba(255,80,170,0)');
    ctx.fillStyle = spill;
    ctx.fillRect(bx, roof, bw, 90);
    ctx.fillStyle = '#2e2a44';
    ctx.fillRect(bx - 6, roof - 6, bw + 12, 8);
    // panel seams
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 1;
    const cw = bw / this.cols;
    const top = roof + 20, rh = Math.min(64, (H - top - 150) / this.rows);
    for (let c = 1; c < this.cols; c++) {
      ctx.beginPath();
      ctx.moveTo(bx + c * cw, roof);
      ctx.lineTo(bx + c * cw, H);
      ctx.stroke();
    }
    // windows
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const w = this.wins[r * this.cols + c];
        const wx = bx + c * cw + cw * 0.2, wy = top + r * rh + rh * 0.18, ww = cw * 0.6, wh = rh * 0.52;
        ctx.fillStyle = '#1c1a30';
        ctx.fillRect(wx - 2, wy - 2, ww + 4, wh + 4);
        if (w.lit > 0.02) {
          const flick = w.tv ? 0.65 + 0.35 * Math.sin(t * 13 + c * 3 + r) * Math.sin(t * 7 + r) : 1;
          ctx.globalAlpha = w.lit * flick;
          ctx.fillStyle = w.tv ? '#8ab8ff' : '#ffd27a';
          ctx.fillRect(wx, wy, ww, wh);
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = w.lit * flick * 0.35;
          ctx.drawImage(glow(w.tv ? '#6a9aff' : '#ffb04a'), wx - ww * 0.6, wy - wh * 0.8, ww * 2.2, wh * 2.6);
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = w.lit;
          ctx.fillStyle = w.curtain > 0.5 ? 'rgba(200,80,90,0.55)' : 'rgba(240,230,210,0.45)';
          ctx.fillRect(wx, wy, ww * 0.22, wh);
          ctx.fillRect(wx + ww * 0.78, wy, ww * 0.22, wh);
          ctx.globalAlpha = 1;
        } else {
          ctx.fillStyle = '#2a2a44';
          ctx.fillRect(wx, wy, ww, wh);
        }
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(wx + ww / 2 - 0.5, wy, 1, wh);
        // balconies on every other column
        if (c % 2 === 1 && r > 0) {
          const byy = wy + wh + 2;
          ctx.fillStyle = '#4a465e';
          ctx.fillRect(wx - 6, byy, ww + 12, rh * 0.22);
          ctx.strokeStyle = '#2a2640';
          ctx.strokeRect(wx - 6, byy, ww + 12, rh * 0.22);
          if ((r + c) % 3 === 0) {
            ctx.strokeStyle = 'rgba(255,255,255,0.4)';
            ctx.beginPath();
            ctx.moveTo(wx - 4, byy - wh * 0.2);
            ctx.lineTo(wx + ww + 4, byy - wh * 0.2);
            ctx.stroke();
            const cols = ['#e05a5a', '#f2f2f2', '#5a9ae0', '#f2d24a'];
            for (let s = 0; s < 3; s++) {
              ctx.fillStyle = cols[(r + c + s) % 4];
              ctx.fillRect(wx + s * ww * 0.34, byy - wh * 0.2, ww * 0.22, wh * 0.3);
            }
          }
          if ((r * 5 + c) % 7 === 0) {
            ctx.fillStyle = '#c8ccd4';
            ctx.beginPath();
            ctx.ellipse(wx + ww + 2, byy - 4, 7, 5, -0.5, 0, TAU);
            ctx.fill();
          }
        }
      }
    }

    // ground, lamp, bench, trzepak, cat
    const gy = H - Math.max(40, H * 0.06);
    ctx.fillStyle = '#1a1424';
    ctx.fillRect(0, gy, W, H - gy);
    ctx.fillStyle = '#2a2236';
    ctx.fillRect(0, gy, W, 4);
    const lx = W * 0.12;
    const cone = ctx.createRadialGradient(lx + 10, gy - 150, 10, lx + 10, gy - 20, 160);
    cone.addColorStop(0, 'rgba(255,200,110,0.35)');
    cone.addColorStop(1, 'rgba(255,200,110,0)');
    ctx.fillStyle = cone;
    ctx.beginPath();
    ctx.moveTo(lx + 10, gy - 160);
    ctx.lineTo(lx - 70, gy);
    ctx.lineTo(lx + 100, gy);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#0e0a16';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(lx, gy);
    ctx.lineTo(lx, gy - 160);
    ctx.quadraticCurveTo(lx, gy - 172, lx + 14, gy - 170);
    ctx.stroke();
    ctx.fillStyle = '#ffe2a0';
    ctx.fillRect(lx + 6, gy - 168, 16, 5);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.75 + 0.1 * Math.sin(t * 20) * (Math.sin(t * 0.7) > 0.95 ? 1 : 0);
    ctx.drawImage(glow('#ffc870'), lx - 30, gy - 200, 90, 70);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    const bxn = W * 0.62;
    ctx.fillStyle = '#0e0a16';
    ctx.fillRect(bxn, gy - 22, 90, 6);
    ctx.fillRect(bxn, gy - 34, 90, 5);
    ctx.fillRect(bxn + 8, gy - 22, 5, 22);
    ctx.fillRect(bxn + 77, gy - 22, 5, 22);
    // cat on the bench
    const cx = bxn + 60, cy = gy - 22;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 9, 11, 9, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 8, cy - 20, 7, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 3, cy - 25);
    ctx.lineTo(cx + 4, cy - 33);
    ctx.lineTo(cx + 8, cy - 27);
    ctx.lineTo(cx + 12, cy - 33);
    ctx.lineTo(cx + 13, cy - 24);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy - 5);
    ctx.quadraticCurveTo(cx - 24, cy - 4 + Math.sin(t * 2) * 4, cx - 22, cy - 18);
    ctx.stroke();
    const blink = (t % 4.3) < 0.15;
    if (!blink) {
      ctx.fillStyle = '#c8f06a';
      ctx.fillRect(cx + 5, cy - 22, 2.4, 2);
      ctx.fillRect(cx + 10, cy - 22, 2.4, 2);
    }
    // trzepak
    const tx = W * 0.32;
    ctx.strokeStyle = '#0e0a16';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(tx, gy);
    ctx.lineTo(tx, gy - 60);
    ctx.moveTo(tx + 70, gy);
    ctx.lineTo(tx + 70, gy - 60);
    ctx.moveTo(tx - 4, gy - 60);
    ctx.lineTo(tx + 74, gy - 60);
    ctx.moveTo(tx, gy - 36);
    ctx.lineTo(tx + 70, gy - 36);
    ctx.stroke();

    // neon posts from the title down to the roof
    const logo = document.querySelector('.logo')?.getBoundingClientRect();
    if (logo && logo.width) {
      ctx.strokeStyle = '#1a1628';
      ctx.lineWidth = 3;
      for (const px of [logo.left + logo.width * 0.12, logo.left + logo.width * 0.88]) {
        ctx.beginPath();
        ctx.moveTo(px, logo.bottom - 6);
        ctx.lineTo(px, roof);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(logo.left + logo.width * 0.12, logo.bottom + 6);
      ctx.lineTo(logo.left + logo.width * 0.88, logo.bottom + 6);
      ctx.stroke();
    }
  }
}
