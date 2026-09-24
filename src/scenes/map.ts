import { app, type PEvent, type Scene } from '../app';
import { sfx } from '../core/audio';
import { easeInOut, TAU } from '../core/rng';
import { MENU_THEME } from '../core/types';
import { rgba } from '../gfx/color';
import { FX } from '../gfx/fx';
import { gemArt } from '../gfx/gems';
import { glow } from '../gfx/sprites';
import { CLASSES } from '../game/content';
import { NODE_NAME, ROWS, type MapNode, type NodeType } from '../game/map';
import type { Run } from '../game/run';
import { hideTip, showTip } from '../ui/dom';

const DISPLAY = '"Grenze Gotisch", Georgia, serif';

const NODE_COL: Record<NodeType, string> = {
  battle: '#e8dcc4', elite: '#ff5a6a', event: '#b88cff', shop: '#ffcf4a', rest: '#ff9a3d', treasure: '#ffd76a', boss: '#ff3b5c',
};

export class MapScene implements Scene {
  private t = 0;
  private fx = new FX();
  private pos = new Map<number, [number, number]>();
  private travel: { from: [number, number]; to: [number, number]; t: number; node: MapNode } | null = null;
  private marker: [number, number] = [0, 0];
  private locked = false;
  private down: { x: number; y: number; t: number; node: MapNode | null } | null = null;

  constructor(private run: Run, private onPick: (n: MapNode) => void) {
    app.bg.setTheme(...MENU_THEME);
    this.resize();
  }

  resize() {
    const W = app.W, H = app.H, s = app.safe;
    const top = s.t + 96, bottom = H - s.b - 104;
    const mw = Math.min(W - 60, 520);
    const cx = W / 2;
    for (const n of this.run.map.nodes) {
      this.pos.set(n.id, [cx + (n.x - 0.5) * mw, bottom - (n.row * (bottom - top)) / (ROWS - 1)]);
    }
    this.marker = this.run.pos >= 0 ? this.pos.get(this.run.pos)! : [cx, bottom + 62];
  }

  private available(): MapNode[] {
    const nodes = this.run.map.nodes;
    if (this.run.pos < 0) return nodes.filter((n) => n.row === 0);
    return nodes[this.run.pos].next.map((id) => nodes[id]);
  }

  private nodeAt(x: number, y: number): MapNode | null {
    let best: MapNode | null = null, bd = 34;
    for (const n of this.run.map.nodes) {
      const [nx, ny] = this.pos.get(n.id)!;
      const d = Math.hypot(nx - x, ny - y);
      if (d < bd) {
        bd = d;
        best = n;
      }
    }
    return best;
  }

  pointer(e: PEvent) {
    if (this.locked) return;
    if (e.type === 'down') {
      hideTip();
      this.down = { x: e.x, y: e.y, t: this.t, node: this.nodeAt(e.x, e.y) };
    } else if (e.type === 'up' && this.down) {
      const n = this.down.node;
      const long = this.t - this.down.t > 0.4;
      this.down = null;
      if (!n || this.nodeAt(e.x, e.y) !== n) return;
      const avail = this.available().includes(n);
      if (!avail || long) {
        const [x, y] = this.pos.get(n.id)!;
        showTip(`<strong>${NODE_NAME[n.type]}</strong>${avail ? '' : '<p>Poza zasięgiem.</p>'}`, { x: x - 20, y: y - 20, w: 40, h: 40 }, false);
        return;
      }
      this.locked = true;
      sfx.step();
      this.travel = { from: [...this.marker] as [number, number], to: this.pos.get(n.id)!, t: 0, node: n };
    }
  }

  update(dt: number) {
    this.t += dt;
    this.fx.update(dt);
    if (this.travel) {
      const tr = this.travel;
      tr.t += dt / 0.7;
      const p = easeInOut(Math.min(1, tr.t));
      this.marker = [tr.from[0] + (tr.to[0] - tr.from[0]) * p, tr.from[1] + (tr.to[1] - tr.from[1]) * p - Math.sin(p * Math.PI) * 18];
      if (Math.random() < 0.8) this.fx.motes(this.marker[0], this.marker[1], CLASSES[this.run.cls].look.aura, 1, 6, 20, 0.7);
      if (tr.t >= 1) {
        const n = tr.node;
        this.travel = null;
        const [x, y] = this.pos.get(n.id)!;
        this.fx.ring(x, y, NODE_COL[n.type], 16, 70, 0.6, 5);
        this.fx.glow(x, y, NODE_COL[n.type], 30, 0.5, 80);
        sfx.cast(4);
        setTimeout(() => this.onPick(n), 380);
      }
    }
    if (Math.random() < dt * 3) {
      for (const n of this.available()) {
        const [x, y] = this.pos.get(n.id)!;
        if (Math.random() < 0.4) this.fx.twinkle(x + (Math.random() - 0.5) * 40, y + (Math.random() - 0.5) * 40, 10, 0.6);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    const W = app.W, H = app.H, t = this.t;
    const nodes = this.run.map.nodes;
    // arcane circle
    const cx = W / 2, cy = H * 0.52, R = Math.min(W, H) * 0.44;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(233,193,107,0.07)';
    ctx.lineWidth = 1;
    for (const k of [1, 0.86, 0.6]) {
      ctx.beginPath();
      ctx.arc(0, 0, R * k, 0, TAU);
      ctx.stroke();
    }
    ctx.rotate(t * 0.03);
    ctx.strokeStyle = 'rgba(233,193,107,0.12)';
    for (let k = 0; k < 72; k++) {
      const a = (k * TAU) / 72;
      const l = k % 6 === 0 ? 14 : 5;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * R * 0.86, Math.sin(a) * R * 0.86);
      ctx.lineTo(Math.cos(a) * (R * 0.86 + l), Math.sin(a) * (R * 0.86 + l));
      ctx.stroke();
    }
    ctx.rotate(-t * 0.07);
    ctx.beginPath();
    for (let k = 0; k <= 7; k++) {
      const a = (k * 3 * TAU) / 7;
      ctx.lineTo(Math.cos(a) * R * 0.6, Math.sin(a) * R * 0.6);
    }
    ctx.strokeStyle = 'rgba(184,140,255,0.08)';
    ctx.stroke();
    ctx.restore();
    ctx.globalCompositeOperation = 'source-over';

    // edges
    const visited = new Set(this.run.visited);
    const avail = new Set(this.available().map((n) => n.id));
    for (const n of nodes) {
      const [x1, y1] = this.pos.get(n.id)!;
      for (const id of n.next) {
        const [x2, y2] = this.pos.get(id)!;
        const walked = visited.has(n.id) && visited.has(id);
        const open = n.id === this.run.pos && avail.has(id);
        ctx.save();
        ctx.lineCap = 'round';
        if (walked) {
          ctx.strokeStyle = 'rgba(255,215,106,0.8)';
          ctx.lineWidth = 3;
          ctx.shadowColor = '#ffd76a';
          ctx.shadowBlur = 10;
        } else if (open) {
          ctx.strokeStyle = rgba('#ffe7a8', 0.75 + 0.25 * Math.sin(t * 4));
          ctx.lineWidth = 2.5;
          ctx.setLineDash([2, 9]);
          ctx.lineDashOffset = -t * 26;
        } else {
          ctx.strokeStyle = 'rgba(200,185,230,0.22)';
          ctx.lineWidth = 2;
          ctx.setLineDash([2, 8]);
        }
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo((x1 + x2) / 2 + (x2 - x1) * 0.1, (y1 + y2) / 2, x2, y2);
        ctx.stroke();
        ctx.restore();
      }
    }
    if (this.run.pos < 0) {
      for (const id of avail) {
        const [x2, y2] = this.pos.get(id)!;
        ctx.save();
        ctx.strokeStyle = rgba('#ffe7a8', 0.6);
        ctx.setLineDash([2, 9]);
        ctx.lineDashOffset = -t * 26;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(W / 2, this.marker[1]);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.restore();
      }
    }

    // nodes
    for (const n of nodes) {
      const [x, y] = this.pos.get(n.id)!;
      const isAvail = avail.has(n.id) && !this.locked;
      const done = visited.has(n.id);
      const col = NODE_COL[n.type];
      const r = n.type === 'boss' ? 30 : 19;
      if (isAvail) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 4 + n.id);
        ctx.drawImage(glow(col), x - r * 2.6, y - r * 2.6, r * 5.2, r * 5.2);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
      const s = isAvail ? 1 + 0.06 * Math.sin(t * 4 + n.id) : 1;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(s, s);
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, TAU);
      const g = ctx.createRadialGradient(-r * 0.3, -r * 0.4, 0, 0, 0, r);
      g.addColorStop(0, done ? '#2a2238' : '#2e2344');
      g.addColorStop(1, '#0d0918');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.lineWidth = isAvail ? 2.5 : 1.5;
      ctx.strokeStyle = done ? 'rgba(255,215,106,0.6)' : isAvail ? col : rgba(col, 0.45);
      ctx.stroke();
      ctx.globalAlpha = done ? 0.4 : isAvail || n.type === 'boss' ? 1 : 0.6;
      drawIcon(ctx, n.type, r * 0.62, col, t);
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    // hero marker
    const [mx, my] = this.marker;
    const look = CLASSES[this.run.cls].look;
    const bob = Math.sin(t * 3) * 3;
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(glow(look.aura), mx - 26, my - 44 + bob - 26 + 10, 52, 52);
    ctx.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.translate(mx, my - 30 + bob);
    ctx.beginPath();
    ctx.moveTo(0, 16);
    ctx.lineTo(-9, 0);
    ctx.lineTo(0, -12);
    ctx.lineTo(9, 0);
    ctx.closePath();
    const mg = ctx.createLinearGradient(-9, -12, 9, 16);
    mg.addColorStop(0, '#fff6d8');
    mg.addColorStop(1, look.aura);
    ctx.fillStyle = mg;
    ctx.fill();
    ctx.strokeStyle = '#2a1608';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    this.fx.render(ctx);

    ctx.textAlign = 'center';
    ctx.font = `600 20px ${DISPLAY}`;
    ctx.fillStyle = rgba('#f3e7cf', 0.75);
    if (!this.locked) ctx.fillText(this.run.pos < 0 ? 'Wybierz ścieżkę' : 'Dokąd dalej?', W / 2, H - app.safe.b - 22);
  }

  exit() {
    hideTip();
  }
}

function drawIcon(ctx: CanvasRenderingContext2D, type: NodeType, s: number, col: string, t: number) {
  ctx.strokeStyle = col;
  ctx.fillStyle = col;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  switch (type) {
    case 'battle': {
      for (const d of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(-s * 0.8 * d, -s * 0.8);
        ctx.lineTo(s * 0.7 * d, s * 0.7);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(s * 0.35 * d, s * 0.75);
        ctx.lineTo(s * 0.75 * d, s * 0.35);
        ctx.stroke();
      }
      break;
    }
    case 'elite':
    case 'boss': {
      const k = type === 'boss' ? 1.05 : 0.9;
      ctx.beginPath();
      ctx.arc(0, -s * 0.1, s * 0.62 * k, Math.PI * 0.85, Math.PI * 2.15);
      ctx.lineTo(s * 0.4 * k, s * 0.7 * k);
      ctx.lineTo(-s * 0.4 * k, s * 0.7 * k);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-s * 0.25 * k, 0, s * 0.14 * k, 0, TAU);
      ctx.arc(s * 0.25 * k, 0, s * 0.14 * k, 0, TAU);
      ctx.fill();
      for (const d of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(d * s * 0.45 * k, -s * 0.55 * k);
        ctx.quadraticCurveTo(d * s * 1.0 * k, -s * 0.7 * k, d * s * 0.9 * k, -s * 1.2 * k);
        ctx.stroke();
      }
      if (type === 'boss') {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 3);
        ctx.drawImage(glow(col), -s * 1.4, -s * 1.4, s * 2.8, s * 2.8);
        ctx.globalCompositeOperation = 'source-over';
      }
      break;
    }
    case 'event': {
      ctx.font = `700 ${s * 2}px ${DISPLAY}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', 0, s * 0.1);
      break;
    }
    case 'shop': {
      ctx.drawImage(gemArt.big(5, 64), -s * 1.1, -s * 1.1, s * 2.2, s * 2.2);
      break;
    }
    case 'rest': {
      ctx.beginPath();
      ctx.moveTo(-s * 0.8, s * 0.8);
      ctx.lineTo(s * 0.8, s * 0.45);
      ctx.moveTo(s * 0.8, s * 0.8);
      ctx.lineTo(-s * 0.8, s * 0.45);
      ctx.stroke();
      const fl = 1 + 0.12 * Math.sin(t * 9);
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.95 * fl);
      ctx.quadraticCurveTo(s * 0.6, -s * 0.1, s * 0.3, s * 0.4);
      ctx.lineTo(-s * 0.3, s * 0.4);
      ctx.quadraticCurveTo(-s * 0.6, -s * 0.1, 0, -s * 0.95 * fl);
      ctx.fill();
      ctx.fillStyle = '#fff2b0';
      ctx.beginPath();
      ctx.ellipse(0, s * 0.15, s * 0.14, s * 0.26, 0, 0, TAU);
      ctx.fill();
      break;
    }
    case 'treasure': {
      ctx.strokeRect(-s * 0.85, -s * 0.2, s * 1.7, s * 0.95);
      ctx.beginPath();
      ctx.moveTo(-s * 0.85, -s * 0.2);
      ctx.quadraticCurveTo(0, -s * 1.05, s * 0.85, -s * 0.2);
      ctx.stroke();
      ctx.fillRect(-s * 0.14, -s * 0.3, s * 0.28, s * 0.4);
      break;
    }
  }
}
