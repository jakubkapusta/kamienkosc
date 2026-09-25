import type { RNG } from '../core/rng';
import { CAP, COIN, SKULL } from '../core/types';
import { BAL } from './balance';
import { Board, findGroups } from './board';
import type { Fighter, SpellInst } from './fighter';
import { affordable, costOf, SPELLS } from './spells';

function needs(f: Fighter): number[] {
  const n = [0, 0, 0, 0];
  for (const s of f.spells) {
    const cost = costOf(f, SPELLS[s.id]);
    for (let c = 0; c < 4; c++) if (cost[c] > f.mana[c]) n[c] += 1;
  }
  return n;
}

export function chooseMove(b: Board, me: Fighter, foe: Fighter, rng: RNG, skill: number): [number, number] | null {
  const moves = b.moves();
  if (!moves.length) return null;
  const T = b.types();
  const need = needs(me), foeNeed = needs(foe);
  let best = moves[0], bs = -1e9;
  for (const [a, c] of moves) {
    const ta = T[a];
    T[a] = T[c];
    T[c] = ta;
    const groups = findGroups(T);
    T[c] = T[a];
    T[a] = ta;
    const counts = [0, 0, 0, 0, 0, 0, 0];
    let maxLen = 0, cells = 0, fuses = 0;
    for (const g of groups) {
      counts[g.t] += g.cells.length;
      cells += g.cells.length;
      maxLen = Math.max(maxLen, g.maxLen);
      // the gem now at `cell` came from the other end of the swap
      for (const cell of g.cells) if (b.g[cell === a ? c : cell === c ? a : cell]?.fuse) fuses++;
    }
    const dmg = counts[SKULL] * (me.skull + me.str.amt);
    let s = dmg * 1.7;
    if (dmg >= foe.hp + foe.shield) s += 500;
    for (let k = 0; k < 4; k++) {
      const full = me.mana[k] >= me.maxMana[k];
      s += counts[k] * (need[k] ? 1.5 : full ? 0.1 : 0.5);
      s += counts[k] * foeNeed[k] * 0.3 * skill;
    }
    s += counts[COIN] * (0.3 + me.coinHit * 1.7 + me.coinSteal * 1.2);
    // defuse petardy (the enemy would rather let them burn)
    s += fuses * (me.isPlayer ? 4 + 6 * skill : -3);
    s += counts[CAP] * (me.isPlayer ? (me.caps < me.capsNeeded ? 1.3 * (BAL.capsNeeded / me.capsNeeded) : 0.1) : 0.35 * skill);
    if (maxLen >= 4) s += 3 + 9 * skill + (me.expMana ? 4 : 0);
    if (me.rush > 0 && counts[SKULL]) s += 3 + 9 * skill;
    if (cells >= 5) s += 2;
    s += rng.next() * (1 - skill) * 9;
    if (s > bs) {
      bs = s;
      best = [a, c];
    }
  }
  return best;
}

export function chooseSpell(me: Fighter, foe: Fighter, b: Board, rng: RNG): SpellInst | null {
  let best: SpellInst | null = null, bs = 4;
  for (const inst of me.spells) {
    const d = SPELLS[inst.id];
    if (!affordable(me, d)) continue;
    const v = (d.ai ? d.ai(me, foe, b) : 9) + rng.next() * 2;
    if (v > bs) {
      bs = v;
      best = inst;
    }
  }
  return best;
}
