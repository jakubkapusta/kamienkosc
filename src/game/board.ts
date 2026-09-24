import { RNG } from '../core/rng';

export const N = 8;
export const NONE = 0, BOMB = 1, NOVA = 2;

export interface Tween { fx: number; fy: number; tx: number; ty: number; t: number; d: number; arc: number }

export interface Gem {
  id: number;
  t: number;
  sp: number;
  ice: boolean;
  // visual state (cell units)
  px: number;
  py: number;
  vy: number;
  tw: Tween | null;
  flash: number;
  flashing: boolean;
  land: number;
  birth: number;
  flip: number; // >0 while flipping into flipTo
  flipTo: number;
  delay: number;
}

export interface Group { cells: number[]; t: number; maxLen: number; cross: boolean }
export interface Birth { i: number; t: number; sp: number }
export interface Explosion { i: number; sp: number }

export function findGroups(T: ArrayLike<number>): Group[] {
  const runs: { cells: number[]; t: number; len: number; dir: number }[] = [];
  for (let y = 0; y < N; y++) {
    let x = 0;
    while (x < N) {
      const t = T[y * N + x];
      let e = x + 1;
      if (t >= 0) while (e < N && T[y * N + e] === t) e++;
      if (t >= 0 && e - x >= 3) {
        const cells = [];
        for (let k = x; k < e; k++) cells.push(y * N + k);
        runs.push({ cells, t, len: e - x, dir: 0 });
      }
      x = e;
    }
  }
  for (let x = 0; x < N; x++) {
    let y = 0;
    while (y < N) {
      const t = T[y * N + x];
      let e = y + 1;
      if (t >= 0) while (e < N && T[e * N + x] === t) e++;
      if (t >= 0 && e - y >= 3) {
        const cells = [];
        for (let k = y; k < e; k++) cells.push(k * N + x);
        runs.push({ cells, t, len: e - y, dir: 1 });
      }
      y = e;
    }
  }
  if (!runs.length) return [];
  const parent = runs.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const owner = new Int16Array(N * N).fill(-1);
  runs.forEach((r, ri) => {
    for (const c of r.cells) {
      if (owner[c] >= 0) parent[find(ri)] = find(owner[c]);
      else owner[c] = ri;
    }
  });
  const groups = new Map<number, { cells: Set<number>; t: number; maxLen: number; dirs: number }>();
  runs.forEach((r, ri) => {
    const root = find(ri);
    let g = groups.get(root);
    if (!g) groups.set(root, (g = { cells: new Set(), t: r.t, maxLen: 0, dirs: 0 }));
    r.cells.forEach((c) => g!.cells.add(c));
    g.maxLen = Math.max(g.maxLen, r.len);
    g.dirs |= 1 << r.dir;
  });
  return [...groups.values()].map((g) => ({ cells: [...g.cells], t: g.t, maxLen: g.maxLen, cross: g.dirs === 3 }));
}

function lineAt(T: ArrayLike<number>, i: number): boolean {
  const t = T[i];
  if (t < 0) return false;
  const x = i % N, y = (i / N) | 0;
  let a = x, b = x;
  while (a > 0 && T[y * N + a - 1] === t) a--;
  while (b < N - 1 && T[y * N + b + 1] === t) b++;
  if (b - a >= 2) return true;
  a = y;
  b = y;
  while (a > 0 && T[(a - 1) * N + x] === t) a--;
  while (b < N - 1 && T[(b + 1) * N + x] === t) b++;
  return b - a >= 2;
}

export class Board {
  g: (Gem | null)[] = new Array(N * N).fill(null);
  weights = [1, 1, 1, 1, 0.8, 0.65, 0.8];
  iceChance = 0;
  private nextId = 1;

  constructor(public rng: RNG) {}

  mk(t: number, i: number): Gem {
    return {
      id: this.nextId++, t, sp: NONE, ice: false,
      px: i % N, py: (i / N) | 0, vy: 0, tw: null,
      flash: 0, flashing: false, land: 0, birth: 0, flip: 0, flipTo: 0, delay: 0,
    };
  }

  randType(): number {
    let s = 0;
    for (const w of this.weights) s += w;
    let r = this.rng.next() * s;
    for (let t = 0; t < this.weights.length; t++) {
      r -= this.weights[t];
      if (r <= 0) return t;
    }
    return 0;
  }

  types(): Int8Array {
    const T = new Int8Array(N * N);
    for (let i = 0; i < N * N; i++) T[i] = this.g[i] ? this.g[i]!.t : -1;
    return T;
  }

  fillFresh() {
    for (let tries = 0; tries < 50; tries++) {
      const T = new Int8Array(N * N);
      for (let i = 0; i < N * N; i++) {
        const x = i % N, y = (i / N) | 0;
        let t = 0;
        for (let k = 0; k < 20; k++) {
          t = this.randType();
          if (x >= 2 && T[i - 1] === t && T[i - 2] === t) continue;
          if (y >= 2 && T[i - N] === t && T[i - 2 * N] === t) continue;
          break;
        }
        T[i] = t;
      }
      for (let i = 0; i < N * N; i++) this.g[i] = this.mk(T[i], i);
      if (!findGroups(T).length && this.hasMoves()) return;
    }
  }

  groups() {
    return findGroups(this.types());
  }

  static swapMakesMatch(T: Int8Array, a: number, b: number): boolean {
    const ta = T[a];
    T[a] = T[b];
    T[b] = ta;
    const ok = lineAt(T, a) || lineAt(T, b);
    T[b] = T[a];
    T[a] = ta;
    return ok;
  }

  adjacent(a: number, b: number) {
    const ax = a % N, ay = (a / N) | 0, bx = b % N, by = (b / N) | 0;
    return Math.abs(ax - bx) + Math.abs(ay - by) === 1;
  }

  canSwap(a: number, b: number): boolean {
    const A = this.g[a], B = this.g[b];
    if (!A || !B || A.ice || B.ice || !this.adjacent(a, b) || A.t === B.t) return false;
    return Board.swapMakesMatch(this.types(), a, b);
  }

  moves(): [number, number][] {
    const T = this.types();
    const out: [number, number][] = [];
    for (let i = 0; i < N * N; i++) {
      const x = i % N, y = (i / N) | 0;
      for (const j of [x < N - 1 ? i + 1 : -1, y < N - 1 ? i + N : -1]) {
        if (j < 0) continue;
        const A = this.g[i], B = this.g[j];
        if (!A || !B || A.ice || B.ice || A.t === B.t) continue;
        if (Board.swapMakesMatch(T, i, j)) out.push([i, j]);
      }
    }
    return out;
  }

  hasMoves() {
    return this.moves().length > 0;
  }

  swap(a: number, b: number) {
    const t = this.g[a];
    this.g[a] = this.g[b];
    this.g[b] = t;
  }

  plan(groups: Group[], prefer: number[]) {
    const clear = new Set<number>();
    const births: Birth[] = [];
    let maxLen = 0;
    for (const gr of groups) {
      maxLen = Math.max(maxLen, gr.maxLen);
      gr.cells.forEach((c) => clear.add(c));
      const sp = gr.maxLen >= 5 ? NOVA : gr.maxLen === 4 || gr.cross ? BOMB : NONE;
      if (sp) {
        let at = prefer.find((p) => gr.cells.includes(p));
        if (at === undefined) at = [...gr.cells].sort((a, b) => a - b)[Math.floor(gr.cells.length / 2)];
        births.push({ i: at, t: gr.t, sp });
      }
    }
    for (const b of births) clear.delete(b.i);
    return { clear, births, maxLen };
  }

  /** Chain-react special gems caught in the clear set. Mutates `clear`. */
  expand(clear: Set<number>, protect: Set<number>): Explosion[] {
    const out: Explosion[] = [];
    const queue = [...clear];
    const done = new Set<number>();
    const add = (j: number) => {
      if (!protect.has(j) && this.g[j] && !clear.has(j)) {
        clear.add(j);
        queue.push(j);
      }
    };
    while (queue.length) {
      const i = queue.pop()!;
      if (done.has(i)) continue;
      done.add(i);
      const g = this.g[i];
      if (!g || !g.sp) continue;
      out.push({ i, sp: g.sp });
      const x = i % N, y = (i / N) | 0;
      if (g.sp === BOMB) {
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < N && ny < N) add(ny * N + nx);
          }
      } else {
        for (let k = 0; k < N; k++) {
          add(y * N + k);
          add(k * N + x);
        }
      }
    }
    return out;
  }

  /** Gravity + refill. New gems start above the board and fall in. */
  fall() {
    for (let x = 0; x < N; x++) {
      let w = N - 1;
      for (let y = N - 1; y >= 0; y--) {
        const i = y * N + x;
        const g = this.g[i];
        if (g) {
          if (y !== w) {
            this.g[w * N + x] = g;
            this.g[i] = null;
          }
          w--;
        }
      }
      const empties = w + 1;
      for (let y = w; y >= 0; y--) {
        const g = this.mk(this.randType(), y * N + x);
        g.py = y - empties - 0.4;
        if (this.iceChance && this.rng.chance(this.iceChance)) g.ice = true;
        this.g[y * N + x] = g;
      }
    }
  }

  settled() {
    for (let i = 0; i < N * N; i++) {
      const g = this.g[i];
      if (g && (g.tw || g.py !== ((i / N) | 0) || g.flip > 0)) return false;
    }
    return true;
  }

  dump(): number[] {
    return this.g.map((g) => (g ? g.t | (g.sp << 3) | ((g.ice ? 1 : 0) << 5) : 0));
  }

  load(arr: number[]) {
    arr.forEach((v, i) => {
      const g = this.mk(v & 7, i);
      g.sp = (v >> 3) & 3;
      g.ice = !!((v >> 5) & 1);
      this.g[i] = g;
    });
  }
}
