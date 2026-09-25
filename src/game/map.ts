import { RNG } from '../core/rng';

export type NodeType = 'battle' | 'elite' | 'event' | 'shop' | 'rest' | 'treasure' | 'boss';

export interface MapNode { id: number; row: number; x: number; type: NodeType; next: number[] }
export interface MapData { nodes: MapNode[]; rows: number }

export const NODE_NAME: Record<NodeType, string> = {
  battle: 'Zadyma', elite: 'Gruba ryba', event: 'Coś dziwnego', shop: 'Sklep', rest: 'Ognisko z kiełbasą', treasure: 'Słoik babci', boss: 'Szef wszystkich szefów',
};

export const ROWS = 8; // 0..6 path, 7 boss
const SHOP_FROM = 4;

export function genMap(seed: number): MapData {
  const rng = new RNG(seed);
  const nodes: MapNode[] = [];
  const rows: MapNode[][] = [];
  for (let r = 0; r < ROWS; r++) {
    const n = r === ROWS - 1 ? 1 : r === 0 ? 2 : r === ROWS - 2 ? rng.int(1, 2) : rng.int(2, 3);
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
  // types
  for (let r = 0; r < ROWS; r++) {
    for (const n of rows[r]) {
      if (r === 0) n.type = 'battle';
      else if (r === ROWS - 1) n.type = 'boss';
      else if (r === ROWS - 2) n.type = 'rest';
      else {
        const w: [NodeType, number][] = [['battle', 46], ['event', 22]];
        if (r >= 2) w.push(['elite', 13]);
        // shops only once there is money to spend (~60+ zł by floor 5)
        if (r >= SHOP_FROM) w.push(['shop', 16]);
        if (r === 4) w.push(['rest', 7]);
        n.type = rng.weighted(w);
      }
    }
  }
  const mid = rows[3];
  rng.pick(mid).type = 'treasure';
  if (!nodes.some((n) => n.type === 'shop')) rng.pick(rows[rng.int(SHOP_FROM, ROWS - 3)]).type = 'shop';
  return { nodes, rows: ROWS };
}
