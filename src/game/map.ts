import { RNG } from '../core/rng';
import { BAL } from './balance';

export type NodeType = 'battle' | 'elite' | 'event' | 'shop' | 'rest' | 'treasure' | 'boss';
export type RunLen = 'short' | 'long';

export interface MapNode { id: number; row: number; x: number; type: NodeType; next: number[] }
/** `mid` is the row of the halfway boss (long runs only). */
export interface MapData { nodes: MapNode[]; rows: number; mid?: number }

export const NODE_NAME: Record<NodeType, string> = {
  battle: 'Zadyma', elite: 'Gruba ryba', event: 'Coś dziwnego', shop: 'Sklep', rest: 'Ognisko z kiełbasą', treasure: 'Słoik babci', boss: 'Szef wszystkich szefów',
};

export const nodeName = (m: MapData, n: MapNode) => (n.type === 'boss' && n.row === m.mid ? 'Szef dzielnicy' : NODE_NAME[n.type]);

/**
 * Short run: 8 rows (0–6 path, 7 boss), 2–3 places per row.
 * Long run: two acts of 8 rows each (boss on row 7 and row 15), 3–5 places per row.
 */
export const LENGTHS: Record<RunLen, { rows: number; mid?: number; width: [number, number] }> = {
  short: { rows: 8, width: [2, 3] },
  long: { rows: 16, mid: 7, width: [3, 5] },
};

/** shops only once there is money to spend (~60+ zł by floor 5); act 2 starts rich */
const SHOP_FROM = 4;

/** Enemy difficulty for a row: 0–7 over a short run, stretched over 16 rows (and ending higher) in a long one. */
export function diffOf(m: MapData, row: number) {
  return m.mid === undefined ? row : row * BAL.longStep;
}

export const isFinalBoss = (m: MapData, n: MapNode) => n.type === 'boss' && n.row === m.rows - 1;

export function genMap(seed: number, len: RunLen = 'short'): MapData {
  const L = LENGTHS[len];
  const ROWS = L.rows;
  const mid = L.mid;
  const rng = new RNG(seed);
  const nodes: MapNode[] = [];
  const rows: MapNode[][] = [];
  const isBoss = (r: number) => r === ROWS - 1 || r === mid;
  const isRest = (r: number) => isBoss(r + 1);
  for (let r = 0; r < ROWS; r++) {
    const [lo, hi] = L.width;
    const n = isBoss(r) ? 1 : r === 0 || r === (mid ?? -9) + 1 ? lo : isRest(r) ? rng.int(lo - 1, lo) : rng.int(lo, hi);
    const row: MapNode[] = [];
    for (let i = 0; i < n; i++) {
      const x = n === 1 ? 0.5 : 0.08 + (0.84 * (i + 0.5)) / n + rng.range(-0.07, 0.07) / n * 2;
      const node: MapNode = { id: nodes.length, row: r, x, type: 'battle', next: [] };
      nodes.push(node);
      row.push(node);
    }
    rows.push(row);
  }
  // monotonic edges so paths never cross
  for (let r = 0; r < ROWS - 1; r++) {
    const A = rows[r], B = rows[r + 1];
    const base = A.map((_, i) => (A.length === 1 ? 0 : Math.round((i * (B.length - 1)) / (A.length - 1))));
    const reached = new Set<number>();
    A.forEach((a, i) => {
      a.next.push(B[base[i]].id);
      reached.add(base[i]);
      const j = base[i] + 1;
      const nextBase = i + 1 < A.length ? base[i + 1] : Infinity;
      if (j < B.length && nextBase > base[i] && rng.chance(0.45)) {
        a.next.push(B[j].id);
        reached.add(j);
      }
    });
    B.forEach((b, k) => {
      if (reached.has(k)) return;
      let i = 0;
      for (let q = 0; q < A.length; q++) if (base[q] < k) i = q;
      A[i].next.push(b.id);
    });
  }
  // types: each act (rows after the previous boss) follows the same rhythm
  const acts = mid === undefined ? [[0, ROWS - 1]] : [[0, mid], [mid + 1, ROWS - 1]];
  acts.forEach(([a0, a1], act) => {
    for (let r = a0; r <= a1; r++) {
      const local = r - a0;
      for (const n of rows[r]) {
        if (r === a1) n.type = 'boss';
        else if (r === a1 - 1) n.type = 'rest';
        else if (local === 0) n.type = 'battle';
        else {
          const w: [NodeType, number][] = [['battle', 46], ['event', 22]];
          if (local >= 2 || act > 0) w.push(['elite', 13]);
          if (local >= (act > 0 ? 1 : SHOP_FROM)) w.push(['shop', 16]);
          if (local === 4) w.push(['rest', 7]);
          n.type = rng.weighted(w);
        }
      }
    }
    rng.pick(rows[a0 + 3]).type = 'treasure';
    const actRows = rows.slice(a0, a1 + 1).flat();
    if (!actRows.some((n) => n.type === 'shop')) {
      const from = a0 + (act > 0 ? 1 : SHOP_FROM);
      const cands = rows.slice(from, a1 - 1).flat().filter((n) => n.type !== 'treasure');
      rng.pick(cands).type = 'shop';
    }
  });
  return { nodes, rows: ROWS, ...(mid !== undefined ? { mid } : {}) };
}
