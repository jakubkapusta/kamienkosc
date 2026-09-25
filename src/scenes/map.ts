import { app, type PEvent, type Scene } from '../app';
import { sfx } from '../core/audio';
import { clamp, easeInOut, hash, RNG, TAU } from '../core/rng';
import { MENU_THEME } from '../core/types';
import { svgURL } from '../gfx/art';
import { rgba } from '../gfx/color';
import { FX } from '../gfx/fx';
import { PLACE_NAMES, placeSVG } from '../gfx/places';
import { portraitURL } from '../gfx/portrait';
import { glow, roundRect } from '../gfx/sprites';
import { makeRoad, roadPoint, villageSVG, type P2, type Road } from '../gfx/village';
import { CLASSES } from '../game/content';
import { nodeName, type MapNode, type NodeType } from '../game/map';
import type { Run } from '../game/run';
import { esc, hideTip, showTip } from '../ui/dom';

const DISPLAY = '"Paytone One", "Arial Black", sans-serif';
const BODY = '"Signika", system-ui, sans-serif';

const NODE_COL: Record<NodeType, string> = {
  battle: '#f2e6c8', elite: '#ff5a6a', event: '#c9a6ff', shop: '#7adf7a', rest: '#ff9a3d', treasure: '#ffd76a', boss: '#ff3b5c',
};

const KINDS: Record<NodeType, string[]> = {
  battle: ['przystanek', 'trzepak', 'dzialka', 'boisko', 'bar'],
  elite: ['remiza', 'zlom'],
  event: ['kapliczka'],
  shop: ['ropuszka', 'stacja'],
  rest: ['ognisko'],
  treasure: ['chata'],
  boss: ['urzad'],
};

const placeCache = new Map<number, Map<number, string>>();

function assignPlaces(run: Run): Map<number, string> {
  let m = placeCache.get(run.seed);
  if (m) return m;
  m = new Map();
  const nodes = run.map.nodes;
  const parents = new Map<number, number[]>();
  for (const n of nodes) for (const id of n.next) parents.set(id, [...(parents.get(id) ?? []), n.id]);
  for (const n of nodes) {
    const list = n.type === 'boss' && n.row === run.map.mid ? ['domkultury'] : KINDS[n.type];
    const taken = new Set([
      ...nodes.filter((o) => (o.row === n.row || o.row === n.row - 1) && m!.has(o.id)).map((o) => m!.get(o.id)),
      ...(parents.get(n.id) ?? []).map((id) => m!.get(id)),
    ]);
    const start = hash(run.seed, 'place', n.id) % list.length;
    let kind = list[start];
    for (let k = 0; k < list.length; k++) {
      const c = list[(start + k) % list.length];
      if (!taken.has(c)) {
        kind = c;
        break;
      }
    }
    m.set(n.id, kind);
  }
  placeCache.set(run.seed, m);
  return m;
}

export function placeOf(run: Run, n: MapNode) {
  return assignPlaces(run).get(n.id)!;
}

// rasterized place sprites, shared between map visits
const placeImgs = new Map<string, HTMLImageElement>();
const placeRasters = new Map<string, HTMLCanvasElement>();
function placeSprite(kind: string, px: number): HTMLCanvasElement | null {
  let img = placeImgs.get(kind);
  if (!img) {
    img = new Image();
    img.src = svgURL(placeSVG(kind));
    placeImgs.set(kind, img);
  }
  if (!img.complete || !img.naturalWidth) return null;
  const k = `${kind}@${px}`;
  let c = placeRasters.get(k);
  if (!c) {
    c = document.createElement('canvas');
    c.width = c.height = px;
    c.getContext('2d')!.drawImage(img, 0, 0, px, px);
    placeRasters.set(k, c);
  }
  return c;
}

export class MapScene implements Scene {
  private t = 0;
  private fx = new FX();
  private pos = new Map<number, P2>();
  private home: P2 = [0, 0];
  private roads = new Map<string, Road>();
  private bg: HTMLCanvasElement | null = null;
  private bgKey = '';
  private sz = 60;
  private travel: { road: Road; reverse: boolean; t: number; node: MapNode } | null = null;
  private marker: P2 = [0, 0];
  private locked = false;
  private down: { t: number; node: MapNode | null } | null = null;
  private hero = new Image();
  private worldH = 0;
  private camY = 0;
  private follow = true;
  private drag: { y0: number; cam0: number; moved: boolean } | null = null;
  private onWheel = (e: WheelEvent) => {
    this.follow = false;
    this.camY = clamp(this.camY + e.deltaY, 0, this.worldH - app.H);
  };
  private clouds = Array.from({ length: 3 }, (_, i) => ({ x: Math.random(), y: 0.2 + i * 0.3, s: 0.8 + Math.random() * 0.6, v: 0.006 + Math.random() * 0.006 }));

  constructor(private run: Run, private onPick: (n: MapNode) => void) {
    app.bg.setTheme(...MENU_THEME);
    this.hero.src = portraitURL(CLASSES[run.cls].look);
    this.resize();
    this.camY = this.camTarget();
    addEventListener('wheel', this.onWheel, { passive: true });
  }

  private camTarget() {
    return clamp(this.marker[1] - app.H * 0.62, 0, Math.max(0, this.worldH - app.H));
  }

  resize() {
    const W = app.W, H = app.H, s = app.safe;
    const map = this.run.map, ROWS = map.rows;
    // index of each node within its row (left → right) and the widest row
    const slot = new Map<number, number>();
    const perRow: number[] = [];
    for (let r = 0; r < ROWS; r++) {
      const row = map.nodes.filter((n) => n.row === r).sort((a, b) => a.x - b.x);
      row.forEach((n, i) => slot.set(n.id, i));
      perRow[r] = row.length;
    }
    const maxN = Math.max(3, ...perRow);
    // wide rows zig-zag so neighbouring places don't overlap
    const zig = (n: MapNode) => (perRow[n.row] >= 4 ? (slot.get(n.id)! % 2 ? 1 : -1) : 0);
    const left = s.l + 110, right = W - s.r - 120;
    const colGap = (right - left) / (ROWS - 1);
    if (W > H * 1.15 && colGap >= 72) {
      // landscape: the road runs left → right, home on the left, the boss on the right
      const mh = Math.min(H - s.t - s.b - 190, 560);
      const cy = s.t + 70 + (H - s.t - s.b - 110) / 2;
      this.sz = clamp(Math.min(colGap * (maxN > 3 ? 1 : 0.85), mh / (maxN * 0.95)), 52, 112);
      for (const n of map.nodes) this.pos.set(n.id, [left + n.row * colGap + zig(n) * colGap * 0.2, cy + (n.x - 0.5) * mh + this.sz * 0.4]);
      this.home = [s.l + 44, cy + this.sz * 0.4];
      this.worldH = H;
    } else {
      // portrait (and long runs on narrow landscape screens): a tall village you scroll through
      const mw = Math.min(W - 70, maxN > 3 ? 620 : 560);
      const cx = W / 2;
      this.sz = clamp(mw / (maxN > 3 ? maxN * 0.92 : 3.3), 56, 96);
      const top = s.t + 76 + this.sz * 1.4 * 0.86;
      const rowGap = Math.max(this.sz * (maxN > 3 ? 1.85 : 1.55), (H - s.b - 118 - top) / (ROWS - 1));
      const bottom = top + rowGap * (ROWS - 1);
      for (const n of map.nodes) this.pos.set(n.id, [cx + (n.x - 0.5) * mw, bottom - n.row * rowGap + zig(n) * rowGap * 0.2]);
      // three starting places need room for stacked name tags above the hero
      this.home = [cx, bottom + rowGap * (perRow[0] >= 3 ? 0.85 : 0.62)];
      this.worldH = Math.max(H, this.home[1] + s.b + 60);
    }
    const rng = new RNG(hash(this.run.seed, 'roads'));
    this.roads.clear();
    for (const n of this.run.map.nodes) {
      if (n.row === 0) this.roads.set(`h-${n.id}`, makeRoad(this.home, this.pos.get(n.id)!, rng));
      for (const id of n.next) this.roads.set(`${n.id}-${id}`, makeRoad(this.pos.get(n.id)!, this.pos.get(id)!, rng));
    }
    this.marker = this.run.pos >= 0 ? this.pos.get(this.run.pos)! : this.home;
    // the layout may have switched between scrolling and fixed: keep the camera inside the world
    this.camY = this.follow ? this.camTarget() : clamp(this.camY, 0, Math.max(0, this.worldH - H));
    this.buildBg();
  }

  private buildBg() {
    const W = Math.round(app.W), H = Math.round(this.worldH);
    const key = `${W}x${H}:${this.run.seed}`;
    if (key === this.bgKey) return;
    this.bgKey = key;
    const spots = [...this.pos.values(), this.home];
    const svg = villageSVG(W, H, spots, [...this.roads.values()], hash(this.run.seed, 'village'));
    const img = new Image();
    img.onload = () => {
      if (this.bgKey !== key) return;
      const c = document.createElement('canvas');
      c.width = Math.round(W * app.dpr);
      c.height = Math.round(H * app.dpr);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      this.bg = c;
    };
    img.src = svgURL(svg);
  }

  private available(): MapNode[] {
    const nodes = this.run.map.nodes;
    if (this.run.pos < 0) return nodes.filter((n) => n.row === 0);
    return nodes[this.run.pos].next.map((id) => nodes[id]);
  }

  private nodeAt(x: number, y: number): MapNode | null {
    let best: MapNode | null = null, bd = this.sz * 0.62;
    for (const n of this.run.map.nodes) {
      const [nx, ny] = this.pos.get(n.id)!;
      const d = Math.hypot(nx - x, ny - this.sz * 0.35 - y);
      if (d < bd) {
        bd = d;
        best = n;
      }
    }
    return best;
  }

  private roadTo(n: MapNode): Road {
    return this.roads.get(this.run.pos < 0 ? `h-${n.id}` : `${this.run.pos}-${n.id}`)!;
  }

  pointer(e: PEvent) {
    const wy = e.y + this.camY;
    if (e.type === 'down') {
      hideTip();
      this.drag = { y0: e.y, cam0: this.camY, moved: false };
      if (!this.locked) this.down = { t: this.t, node: this.nodeAt(e.x, wy) };
      return;
    }
    if (e.type === 'move') {
      const d = this.drag;
      if (!d || this.worldH <= app.H) return;
      if (!d.moved && Math.abs(e.y - d.y0) > 8) {
        d.moved = true;
        this.down = null;
        this.follow = false;
      }
      if (d.moved) this.camY = clamp(d.cam0 - (e.y - d.y0), 0, this.worldH - app.H);
      return;
    }
    this.drag = null;
    if (this.locked) return;
    if (e.type === 'up' && this.down) {
      const n = this.down.node;
      const long = this.t - this.down.t > 0.4;
      this.down = null;
      if (!n || this.nodeAt(e.x, wy) !== n) return;
      const avail = this.available().includes(n);
      if (!avail || long) {
        const [x, y] = this.pos.get(n.id)!;
        const note = this.run.visited.includes(n.id) ? 'Już tu byłeś.' : avail ? '' : 'Za daleko. Na piechotę nie dojdziesz.';
        showTip(`<strong>${esc(PLACE_NAMES[placeOf(this.run, n)])}</strong><p>${nodeName(this.run.map, n)}${note ? ` · ${note}` : ''}</p>`, { x: x - 20, y: y - this.sz - this.camY, w: 40, h: this.sz }, false);
        return;
      }
      this.locked = true;
      sfx.step();
      this.travel = { road: this.roadTo(n), reverse: false, t: 0, node: n };
      this.follow = true;
    }
  }

  update(dt: number) {
    this.t += dt;
    this.fx.update(dt);
    if (this.follow) this.camY += (this.camTarget() - this.camY) * Math.min(1, dt * 4);
    for (const c of this.clouds) {
      c.x += c.v * dt;
      if (c.x > 1.4) c.x = -0.4;
    }
    if (this.travel) {
      const tr = this.travel;
      const len = Math.hypot(tr.road.b[0] - tr.road.a[0], tr.road.b[1] - tr.road.a[1]);
      tr.t += dt / clamp(len / 140, 0.5, 1.1);
      const p = easeInOut(Math.min(1, tr.t));
      this.marker = roadPoint(tr.road, p);
      if (Math.random() < 0.5) this.fx.motes(this.marker[0], this.marker[1], '#fff4c8', 1, 4, 10, 0.5);
      if (tr.t >= 1) {
        const n = tr.node;
        this.travel = null;
        const [x, y] = this.pos.get(n.id)!;
        this.fx.ring(x, y - this.sz * 0.3, NODE_COL[n.type], 16, this.sz, 0.6, 5);
        this.fx.glow(x, y - this.sz * 0.3, NODE_COL[n.type], 30, 0.5, this.sz * 1.2);
        sfx.cast(4);
        setTimeout(() => this.onPick(n), 380);
      }
    }
    if (Math.random() < dt * 2) {
      for (const n of this.available()) {
        const [x, y] = this.pos.get(n.id)!;
        if (Math.random() < 0.4) this.fx.twinkle(x + (Math.random() - 0.5) * this.sz, y - Math.random() * this.sz, 9, 0.6);
      }
    }
    // chimney & campfire smoke
    if (Math.random() < dt * 4) {
      for (const n of this.run.map.nodes) {
        const kind = placeOf(this.run, n);
        if (kind !== 'ognisko' && kind !== 'chata') continue;
        const [x, y] = this.pos.get(n.id)!;
        const ox = kind === 'ognisko' ? 0 : this.sz * 0.1;
        const oy = kind === 'ognisko' ? this.sz * 0.5 : this.sz * 0.76;
        this.fx.motes(x + ox, y - oy, kind === 'ognisko' ? '#ffb04a' : '#d8d8e0', 1, 4, 22, 1.4);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    const W = app.W, t = this.t;
    const H = this.worldH;
    ctx.save();
    ctx.translate(0, -Math.round(this.camY));
    if (this.bg) ctx.drawImage(this.bg, 0, 0, W, H);
    else {
      ctx.fillStyle = '#86ad5e';
      ctx.fillRect(0, 0, W, H);
    }

    const nodes = this.run.map.nodes;
    const visited = new Set(this.run.visited);
    const avail = new Set(this.available().map((n) => n.id));

    // walked trail & open roads
    const trace = (r: Road, style: () => void) => {
      ctx.save();
      style();
      ctx.beginPath();
      ctx.moveTo(r.a[0], r.a[1]);
      ctx.quadraticCurveTo(r.c[0], r.c[1], r.b[0], r.b[1]);
      ctx.stroke();
      ctx.restore();
    };
    const walked: Road[] = [];
    let prev = -1;
    for (const id of this.run.visited) {
      const r = this.roads.get(prev < 0 ? `h-${id}` : `${prev}-${id}`);
      if (r) walked.push(r);
      prev = id;
    }
    for (const r of walked)
      trace(r, () => {
        ctx.strokeStyle = 'rgba(255,224,122,0.95)';
        ctx.lineWidth = 3.4;
        ctx.setLineDash([1, 7]);
        ctx.lineCap = 'round';
        ctx.shadowColor = '#ffd76a';
        ctx.shadowBlur = 8;
      });
    if (!this.locked)
      for (const n of this.available())
        trace(this.roadTo(n), () => {
          ctx.strokeStyle = rgba('#ffffff', 0.75 + 0.25 * Math.sin(t * 4));
          ctx.lineWidth = 3;
          ctx.setLineDash([8, 10]);
          ctx.lineDashOffset = -t * 30;
          ctx.lineCap = 'round';
        });

    // drifting cloud shadows
    for (const c of this.clouds) {
      const x = c.x * W, y = c.y * H, r = 140 * c.s;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(10,20,30,0.16)');
      g.addColorStop(1, 'rgba(10,20,30,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x, y, r * 1.6, r, 0, 0, TAU);
      ctx.fill();
    }

    // home
    this.drawPlace(ctx, 'dom', this.home[0], this.home[1], this.sz * 0.85, 1, false);

    // places, back to front
    const order = [...nodes].sort((a, b) => this.pos.get(a.id)![1] - this.pos.get(b.id)![1]);
    for (const n of order) {
      const [x, y] = this.pos.get(n.id)!;
      const isAvail = avail.has(n.id) && !this.locked;
      const done = visited.has(n.id);
      const col = NODE_COL[n.type];
      const size = this.sz * (n.type === 'boss' ? 1.4 : 1);
      if (isAvail || n.type === 'boss') {
        const pulse = 0.5 + 0.5 * Math.sin(t * 4 + n.id);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = (isAvail ? 0.55 : 0.3) + pulse * 0.25;
        ctx.drawImage(glow(col), x - size * 0.9, y - size * 0.9, size * 1.8, size * 1.2);
        ctx.restore();
        ctx.strokeStyle = rgba(col, isAvail ? 0.9 : 0.5);
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(x, y + 1, size * (0.46 + pulse * 0.06), size * (0.12 + pulse * 0.02), 0, 0, TAU);
        ctx.stroke();
      }
      const bob = isAvail ? Math.sin(t * 3 + n.id) * 2.5 : 0;
      this.drawPlace(ctx, placeOf(this.run, n), x, y + bob, size, done ? 0.55 : 1, done);
      this.badge(ctx, n.type, x + size * 0.34, y - size * 0.8 + bob, done, isAvail);
    }
    if (!this.locked) {
      // name tags under the reachable places; push a tag down if it would cover its neighbour
      const placed: [number, number, number][] = [];
      for (const n of [...this.available()].sort((a, b) => this.pos.get(a.id)![0] - this.pos.get(b.id)![0])) {
        const [x, y0] = this.pos.get(n.id)!;
        let y = y0 + (n.type === 'boss' ? 1.4 : 1) * this.sz * 0.2 + 12;
        const [lx, w] = this.labelBox(ctx, PLACE_NAMES[placeOf(this.run, n)], x);
        while (placed.some(([px, pw, py]) => lx < px + pw + 3 && px < lx + w + 3 && Math.abs(py - y) < 20)) y += 20;
        placed.push([lx, w, y]);
        this.label(ctx, PLACE_NAMES[placeOf(this.run, n)], x, y);
      }
    }

    this.fx.render(ctx);
    this.drawHero(ctx);
    ctx.restore();

    // fixed screen overlays: shade under the HUD and the prompt at the bottom
    const SH = app.H;
    const tg = ctx.createLinearGradient(0, 0, 0, 96 + app.safe.t);
    tg.addColorStop(0, 'rgba(11,8,22,0.8)');
    tg.addColorStop(1, 'rgba(11,8,22,0)');
    ctx.fillStyle = tg;
    ctx.fillRect(0, 0, W, 96 + app.safe.t);
    const bgd = ctx.createLinearGradient(0, SH - 70 - app.safe.b, 0, SH);
    bgd.addColorStop(0, 'rgba(11,8,22,0)');
    bgd.addColorStop(1, 'rgba(11,8,22,0.6)');
    ctx.fillStyle = bgd;
    ctx.fillRect(0, SH - 70 - app.safe.b, W, 70 + app.safe.b);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `400 19px ${DISPLAY}`;
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(15,10,24,0.8)';
    const msg = this.run.pos < 0 ? 'Którędy, szefie?' : 'No to gdzie teraz?';
    if (!this.locked) {
      ctx.strokeText(msg, W / 2, SH - app.safe.b - 16);
      ctx.fillStyle = '#fff4d8';
      ctx.fillText(msg, W / 2, SH - app.safe.b - 16);
    }
  }

  private drawPlace(ctx: CanvasRenderingContext2D, kind: string, x: number, y: number, size: number, alpha: number, done: boolean) {
    const px = Math.round(size * Math.min(2, app.dpr));
    const img = placeSprite(kind, px);
    if (!img) return;
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, x - size / 2, y - size * 0.86, size, size);
    ctx.globalAlpha = 1;
    if (done) {
      ctx.fillStyle = 'rgba(40,160,80,0.95)';
      ctx.beginPath();
      ctx.arc(x - size * 0.34, y - size * 0.72, 8, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(x - size * 0.34 - 3.5, y - size * 0.72);
      ctx.lineTo(x - size * 0.34 - 1, y - size * 0.72 + 3);
      ctx.lineTo(x - size * 0.34 + 4, y - size * 0.72 - 3);
      ctx.stroke();
    }
  }

  private badge(ctx: CanvasRenderingContext2D, type: NodeType, x: number, y: number, done: boolean, avail: boolean) {
    if (done) return;
    const r = type === 'boss' ? 13 : 11;
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fillStyle = '#1a1226';
    ctx.fill();
    ctx.lineWidth = avail ? 2.2 : 1.6;
    ctx.strokeStyle = NODE_COL[type];
    ctx.stroke();
    drawIcon(ctx, type, r * 0.6, NODE_COL[type], this.t);
    ctx.restore();
  }

  private labelBox(ctx: CanvasRenderingContext2D, text: string, x: number): [number, number] {
    ctx.font = `600 11px ${BODY}`;
    const w = ctx.measureText(text).width + 14;
    return [clamp(x - w / 2, 4, app.W - w - 4), w];
  }

  private label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
    const [lx, w] = this.labelBox(ctx, text, x);
    roundRect(ctx, lx, y - 9, w, 18, 9);
    ctx.fillStyle = 'rgba(20,14,34,0.88)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,215,106,0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#fff4d8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, lx + w / 2, y + 0.5);
  }

  private drawHero(ctx: CanvasRenderingContext2D) {
    const [mx, my] = this.marker;
    const bob = Math.sin(this.t * 3) * 3;
    const r = 16;
    const cy = my - r - 10 + bob;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(mx, my - 2, 9, 3, 0, 0, TAU);
    ctx.fill();
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath();
    ctx.moveTo(mx - 7, cy + r - 2);
    ctx.lineTo(mx, cy + r + 10);
    ctx.lineTo(mx + 7, cy + r - 2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(mx, cy, r + 2.5, 0, TAU);
    ctx.fill();
    ctx.restore();
    if (this.hero.complete && this.hero.naturalWidth) {
      const s = r * 2 * (224 / 200);
      ctx.drawImage(this.hero, mx - s / 2, cy - s / 2, s, s);
    }
  }

  exit() {
    hideTip();
    removeEventListener('wheel', this.onWheel);
  }
}

function drawIcon(ctx: CanvasRenderingContext2D, type: NodeType, s: number, col: string, t: number) {
  ctx.strokeStyle = col;
  ctx.fillStyle = col;
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  switch (type) {
    case 'battle':
      for (const d of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(-s * 0.8 * d, -s * 0.8);
        ctx.lineTo(s * 0.7 * d, s * 0.7);
        ctx.moveTo(s * 0.35 * d, s * 0.75);
        ctx.lineTo(s * 0.75 * d, s * 0.35);
        ctx.stroke();
      }
      break;
    case 'elite':
    case 'boss': {
      ctx.beginPath();
      ctx.arc(0, -s * 0.1, s * 0.62, Math.PI * 0.85, Math.PI * 2.15);
      ctx.lineTo(s * 0.4, s * 0.7);
      ctx.lineTo(-s * 0.4, s * 0.7);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-s * 0.25, 0, s * 0.14, 0, TAU);
      ctx.arc(s * 0.25, 0, s * 0.14, 0, TAU);
      ctx.fill();
      for (const d of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(d * s * 0.45, -s * 0.55);
        ctx.quadraticCurveTo(d * s, -s * 0.7, d * s * 0.9, -s * 1.2);
        ctx.stroke();
      }
      if (type === 'boss') {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.5 + 0.4 * Math.sin(t * 3);
        ctx.drawImage(glow(col), -s * 1.6, -s * 1.6, s * 3.2, s * 3.2);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
      break;
    }
    case 'event':
      ctx.font = `400 ${s * 2}px ${DISPLAY}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', 0, s * 0.12);
      break;
    case 'shop':
      ctx.font = `700 ${s * 1.3}px ${BODY}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('zł', 0, s * 0.05);
      break;
    case 'rest': {
      const fl = 1 + 0.12 * Math.sin(t * 9);
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.95 * fl);
      ctx.quadraticCurveTo(s * 0.7, -s * 0.05, s * 0.3, s * 0.7);
      ctx.lineTo(-s * 0.3, s * 0.7);
      ctx.quadraticCurveTo(-s * 0.7, -s * 0.05, 0, -s * 0.95 * fl);
      ctx.fill();
      break;
    }
    case 'treasure':
      ctx.beginPath();
      ctx.moveTo(-s * 0.55, -s * 0.5);
      ctx.lineTo(-s * 0.65, -s * 0.25);
      ctx.lineTo(-s * 0.65, s * 0.8);
      ctx.lineTo(s * 0.65, s * 0.8);
      ctx.lineTo(s * 0.65, -s * 0.25);
      ctx.lineTo(s * 0.55, -s * 0.5);
      ctx.stroke();
      ctx.fillRect(-s * 0.6, -s * 0.85, s * 1.2, s * 0.3);
      break;
  }
}
