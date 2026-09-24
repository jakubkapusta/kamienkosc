/**
 * Headless balance simulator. Mirrors the battle rules of scenes/battle.ts without
 * any rendering, plus a "sensible player" that walks whole runs: picks roads, shops,
 * rests, takes rewards and answers events.
 */
import { hash, RNG } from '../core/rng';
import { AIR, CAP, COIN, EARTH, FIRE, SKULL } from '../core/types';
import { chooseMove, chooseSpell } from '../game/ai';
import { Board, BOMB, N, type Birth, type Gem } from '../game/board';
import { BAL } from '../game/balance';
import { CLASSES, MODS } from '../game/content';
import { genEnemy, type EnemySpec, type Tier } from '../game/enemies';
import { EVENTS } from '../game/events';
import { Fighter } from '../game/fighter';
import type { MapNode } from '../game/map';
import { addRelic, has, newRun, randomRelics, rngFor, type Run } from '../game/run';
import { affordable, PLAYER_SPELLS, SPELLS, spellPrice, type SpellCtx } from '../game/spells';
import { ULTS } from '../game/ult';

export interface BattleOut { won: boolean; hp: number; turns: number; gold: number; ults: number }

const LOOK = { art: 'grill', pal: { skin: '#000', acc: '#000', eye: '#000' }, aura: '#000', seed: 1 };

export async function simBattle(run: Run, spec: EnemySpec, mods: string[], seed: number, skill: number): Promise<BattleOut> {
  const rng = new RNG(seed);
  const board = new Board(rng);
  const P = new Fighter('P', '', run.maxHp, run.spells.map((s) => ({ ...s })), LOOK, true, run.hp);
  const E = new Fighter('E', '', spec.hp, spec.spells, LOOK, false);
  E.skull = spec.skull;
  E.pow = spec.pow;
  E.vampiric = spec.traits.includes('vampiric');
  P.skull = BAL.playerSkull;
  if (has(run, 'skullring')) P.skull += 1;
  if (has(run, 'lens')) P.maxMana = P.maxMana.map((m) => m + 6);
  if (spec.tier === 'boss') E.maxMana = E.maxMana.map((m) => m + 6);
  let freeSpell = has(run, 'hourglass');
  const w = board.weights;
  if (mods.includes('gold')) w[COIN] *= 3;
  if (mods.includes('arcane')) {
    w[SKULL] *= 0.4;
    for (let c = 0; c < 4; c++) w[c] *= 1.2;
  }
  if (has(run, 'luckycoin')) w[COIN] *= 1.6;
  if (mods.includes('ice')) board.iceChance = 0.02;
  board.fillFresh();
  const start = (f: Fighter, c: number, n: number) => (f.mana[c] = Math.min(f.maxMana[c], f.mana[c] + n));
  if (has(run, 'emberheart')) start(P, FIRE, 6);
  if (has(run, 'tidestone')) start(P, 1, 6);
  if (has(run, 'rootcharm')) start(P, EARTH, 6);
  if (has(run, 'stormfeather')) start(P, AIR, 6);
  if (has(run, 'aegis')) P.shield = 8;
  for (let c = 0; c < 4; c++) start(E, c, spec.startMana);
  E.shield = spec.shield;
  if (mods.includes('ice')) for (const i of rng.shuffle([...Array(64).keys()]).slice(0, 7)) board.g[i]!.ice = true;
  if (mods.includes('cataclysm')) for (const i of rng.shuffle([...Array(64).keys()]).slice(0, 4)) board.g[i]!.sp = BOMB;

  let over = 0;
  let ultsUsed = 0;
  let gold = 0;
  const other = (f: Fighter) => (f === P ? E : P);

  const hurt = (f: Fighter, amount: number) => {
    amount = Math.round(amount);
    if (amount <= 0 || over) return 0;
    const ab = Math.min(f.shield, amount);
    f.shield -= ab;
    const d = amount - ab;
    f.hp = Math.max(0, f.hp - d);
    if (f.hp <= 0) over = f === E ? 1 : 2;
    return d;
  };
  const heal = (f: Fighter, n: number) => {
    const v = Math.min(Math.round(n), f.maxHp - f.hp);
    if (v > 0) f.hp += v;
  };

  const collect = (actor: Fighter, counts: number[], maxLen: number, nExp: number) => {
    const foe = other(actor);
    const isP = actor === P;
    for (let c = 0; c < 4; c++) if (counts[c]) start(actor, c, counts[c]);
    if (isP && run.cls === 'pyro' && counts[FIRE]) start(actor, FIRE, 2);
    if (isP && run.cls === 'storm' && maxLen >= 4) start(actor, AIR, 3);
    if (isP && has(run, 'prismeye') && maxLen >= 4) for (let c = 0; c < 4; c++) start(actor, c, 2);
    if (isP && run.cls === 'druid' && counts[EARTH]) heal(actor, 1);
    if (counts[SKULL]) {
      let dmg = counts[SKULL] * (actor.skull + actor.str.amt);
      if (mods.includes('bloodmoon')) dmg *= 2;
      const dealt = hurt(foe, dmg);
      if (isP && has(run, 'chalice')) heal(actor, counts[SKULL]);
      if (!isP && actor.vampiric && dealt) heal(actor, Math.ceil(dealt / 2));
      if (!isP && dealt && has(run, 'thorns')) hurt(actor, 2);
    }
    if (counts[COIN] && isP) gold += counts[COIN] * (has(run, 'goldtooth') ? 2 : 1);
    if (counts[CAP] && isP) P.caps = Math.min(BAL.capsNeeded, P.caps + counts[CAP]);
    if (isP && nExp && has(run, 'runeflame')) hurt(foe, 3 * nExp);
  };

  const clearCells = (actor: Fighter, clear: Set<number>, births: Birth[], maxLen = 3) => {
    for (const i of clear) if (!board.g[i]) clear.delete(i);
    const exps = board.expand(clear, new Set(births.map((x) => x.i)));
    const counts = [0, 0, 0, 0, 0, 0, 0];
    for (const i of clear) {
      const g = board.g[i];
      if (!g) continue;
      counts[g.t]++;
      board.g[i] = null;
    }
    for (const bi of births) {
      const g = board.g[bi.i];
      if (g) {
        g.t = bi.t;
        g.sp = bi.sp;
      }
    }
    for (const i of clear) {
      const x = i % N, y = (i / N) | 0;
      for (const j of [x > 0 ? i - 1 : -1, x < N - 1 ? i + 1 : -1, y > 0 ? i - N : -1, y < N - 1 ? i + N : -1]) {
        const g = j >= 0 ? board.g[j] : null;
        if (g) g.ice = false;
      }
    }
    collect(actor, counts, maxLen, exps.length);
    board.fall();
  };

  const reshuffle = () => {
    const gems = board.g.filter((g): g is Gem => !!g);
    for (let tries = 0; tries < 60; tries++) {
      rng.shuffle(gems);
      gems.forEach((g, i) => (board.g[i] = g));
      if (!board.groups().length && board.hasMoves()) return;
    }
    board.fillFresh();
  };

  const resolve = (actor: Fighter, prefer: number[] = []) => {
    let extra = false;
    for (let guard = 0; guard < 50; guard++) {
      const groups = board.groups();
      if (!groups.length) break;
      const plan = board.plan(groups, prefer);
      if (plan.maxLen >= 4) extra = true;
      clearCells(actor, plan.clear, plan.births, plan.maxLen);
      prefer = [];
      if (over) break;
    }
    if (!over && !board.hasMoves()) reshuffle();
    return extra;
  };

  const ctxFor = (me: Fighter): SpellCtx => {
    const foe = other(me);
    const pow = me.pow;
    const cells = (pred?: (t: number, i: number) => boolean) => board.g.map((g, i) => (g && (!pred || pred(g.t, i)) ? i : -1)).filter((i) => i >= 0);
    return {
      me, foe, board, rng,
      damage: async (n) => void hurt(foe, n * pow),
      heal: async (n) => heal(me, n * pow),
      shield: async (n) => void (me.shield += Math.round(n * pow)),
      poison: async (d, t) => void (foe.poison = { dmg: Math.max(foe.poison.dmg, Math.round(d * pow)), turns: foe.poison.turns + t }),
      stun: async (t) => void (foe.stun += t),
      strength: async (n, t) => void (me.str = { amt: n, turns: t + 1 }),
      gain: async (c, n) => void start(me, c, n),
      drain: async (n, steal, color) => {
        const c = color ?? foe.mana.indexOf(Math.max(...foe.mana));
        const v = Math.min(foe.mana[c], n);
        if (v <= 0) return;
        foe.mana[c] -= v;
        if (steal) start(me, c, v);
      },
      destroy: async (list) => {
        const set = new Set(list.filter((i) => i >= 0 && i < 64 && board.g[i]));
        if (!set.size) return;
        clearCells(me, set, []);
        resolve(me);
      },
      convert: async (list, to) => {
        let k = 0;
        for (const i of list) {
          const g = board.g[i];
          if (g && g.t !== to) {
            g.t = to;
            k++;
          }
        }
        if (k) resolve(me);
      },
      special: async (list, sp) => {
        for (const i of list) if (board.g[i]) board.g[i]!.sp = sp;
      },
      shuffle: async () => reshuffle(),
      cells,
      pick: (n, pred) => rng.shuffle(cells(pred)).slice(0, n),
    };
  };

  const cast = async (f: Fighter, id: string, lvl: number) => {
    const def = SPELLS[id];
    for (let c = 0; c < 4; c++) f.mana[c] -= def.cost[c];
    if (def.hp) f.hp = Math.max(1, f.hp - def.hp);
    await def.cast(ctxFor(f), lvl);
  };

  const act = async (f: Fighter, s: number): Promise<boolean> => {
    const ult = ULTS[run.cls];
    if (f === P && P.caps >= BAL.capsNeeded && (!ult.worth || ult.worth(P, E))) {
      P.caps = 0;
      ultsUsed++;
      await ult.cast(ctxFor(P));
      if (over) return false;
    }
    for (let k = 0; k < 4; k++) {
      const sp = chooseSpell(f, other(f), board, rng);
      if (!sp) break;
      await cast(f, sp.id, sp.lvl);
      if (over) return false;
      if (SPELLS[sp.id].quick) continue;
      if (f === P && freeSpell) {
        freeSpell = false;
        continue;
      }
      return false;
    }
    const mv = chooseMove(board, f, other(f), rng, s);
    if (!mv) {
      reshuffle();
      return false;
    }
    board.swap(mv[0], mv[1]);
    return resolve(f, [mv[0], mv[1]]);
  };

  let cur = P;
  let turnNo = 0, pTurns = 0;
  while (!over && turnNo < 400) {
    turnNo++;
    const f = cur;
    if (mods.includes('storm') && turnNo % 4 === 0) {
      clearCells(f, new Set(rng.shuffle(board.g.map((_, i) => i)).slice(0, 3)), []);
      resolve(f);
      if (over) break;
    }
    let extra = false;
    if (f.poison.turns > 0) {
      f.poison.turns--;
      hurt(f, f.poison.dmg);
      if (!f.poison.turns) f.poison.dmg = 0;
      if (over) break;
    }
    if (f.stun > 0) f.stun--;
    else {
      if (f === P) pTurns++;
      extra = await act(f, f === P ? skill : spec.skill);
    }
    if (f.str.turns > 0 && --f.str.turns === 0) f.str.amt = 0;
    if (over) break;
    if (extra) {
      if (f === P && has(run, 'warhorn')) hurt(E, 3);
    } else cur = other(cur);
  }
  return { won: over === 1, hp: P.hp, turns: pTurns, gold, ults: ultsUsed };
}

// ---------------------------------------------------------------- whole runs

/** How much the sim player values a spell (rough power ranking). */
const RANK = ['meteor', 'inferno', 'blizzard', 'leech', 'storm', 'fireball', 'chain', 'quake', 'frenzy', 'venom', 'necro', 'prism', 'frostbolt', 'mend', 'stoneskin', 'theft', 'alchemy', 'tide', 'verdant', 'whirl', 'bloodpact'];
const rankOf = (id: string) => RANK.length - RANK.indexOf(id);

export interface RunOut {
  cls: string;
  won: boolean;
  deathRow: number;
  deathTier: Tier | 'event' | null;
  battles: { row: number; tier: Tier; turns: number; hpLoss: number; won: boolean; ults: number }[];
  bossHp: number | null;
  relics: number;
}

function learn(run: Run, id: string) {
  if (run.spells.some((s) => s.id === id)) return;
  if (run.spells.length < 4) {
    run.spells.push({ id, lvl: 1 });
    return;
  }
  let worst = 0;
  run.spells.forEach((s, i) => {
    if (rankOf(s.id) + s.lvl * 3 < rankOf(run.spells[worst].id) + run.spells[worst].lvl * 3) worst = i;
  });
  if (rankOf(id) > rankOf(run.spells[worst].id) + run.spells[worst].lvl * 3) run.spells[worst] = { id, lvl: 1 };
}

function upgradeBest(run: Run) {
  const cands = run.spells.filter((s) => s.lvl < 2).sort((a, b) => rankOf(b.id) - rankOf(a.id));
  if (cands[0]) cands[0].lvl = 2;
  return !!cands[0];
}

export async function simRun(cls: string, seed: number, skill: number): Promise<RunOut> {
  const run = newRun(cls, seed, null);
  const out: RunOut = { cls, won: false, deathRow: -1, deathTier: null, battles: [], bossHp: null, relics: 0 };
  const choose = new RNG(hash(seed, 'player'));

  const fight = async (n: MapNode, tier: Tier, floor: number) => {
    const enemy = genEnemy(hash(run.seed, 'enemy', n.id, n.type), floor, tier);
    const mrng = rngFor(run, 'mods', n.id);
    const mods: string[] = [];
    const chance = tier === 'boss' ? 1 : tier === 'elite' ? 0.7 : n.row >= 1 ? 0.35 : 0;
    if (mrng.chance(chance)) mods.push(mrng.pick(Object.keys(MODS)));
    if (tier === 'boss') out.bossHp = run.hp / run.maxHp;
    const before = run.hp;
    const r = await simBattle(run, enemy, mods, hash(run.seed, 'battle', n.id), skill);
    out.battles.push({ row: n.row, tier, turns: r.turns, hpLoss: (before - r.hp) / run.maxHp, won: r.won, ults: r.ults });
    if (!r.won) {
      out.deathRow = n.row;
      out.deathTier = tier;
      return false;
    }
    run.hp = Math.min(run.maxHp, r.hp + Math.round(run.maxHp * BAL.winHeal) + (has(run, 'bandage') ? 8 : 0));
    const grng = rngFor(run, 'gold', n.id);
    run.gold += r.gold + (tier === 'elite' ? 30 : tier === 'boss' ? 60 : 12) + n.row * 3 + grng.int(0, 8);
    if (tier === 'boss') return true;
    const rr = rngFor(run, 'reward', n.id);
    if (tier === 'elite') {
      const rel = randomRelics(run, rr, 2);
      if (rel[0]) addRelic(run, rel[0]);
    }
    const opts = rr.shuffle(PLAYER_SPELLS.filter((id) => !run.spells.some((s) => s.id === id))).slice(0, 3);
    const best = opts.sort((a, b) => rankOf(b) - rankOf(a))[0];
    if (best) learn(run, best);
    return true;
  };

  let pos = -1;
  const nodes = run.map.nodes;
  for (;;) {
    const avail = pos < 0 ? nodes.filter((n) => n.row === 0) : nodes[pos].next.map((id) => nodes[id]);
    if (!avail.length) break;
    const r = run.hp / run.maxHp;
    const score = (n: MapNode) => {
      const base: Record<string, number> = {
        battle: 2 + (r > 0.7 ? 1 : 0), elite: r > 0.75 ? 3 : -3, rest: r < 0.55 ? 5 : 0.5,
        shop: run.gold >= 70 ? 3 : 0.5, event: 1.5, treasure: 4, boss: 0,
      };
      return base[n.type] + choose.next();
    };
    const n = [...avail].sort((a, b) => score(b) - score(a))[0];
    pos = n.id;
    run.pos = n.id;
    run.visited.push(n.id);
    const rng = rngFor(run, 'node', n.id, n.type);

    if (n.type === 'battle' || n.type === 'elite' || n.type === 'boss') {
      const tier: Tier = n.type === 'battle' ? 'normal' : n.type;
      if (!(await fight(n, tier, n.row))) break;
      if (tier === 'boss') {
        out.won = true;
        break;
      }
    } else if (n.type === 'rest') {
      const heal = Math.min(run.maxHp - run.hp, Math.round(run.maxHp * (has(run, 'compass') ? 0.5 : 0.3)));
      if (r < 0.7 || !upgradeBest(run)) run.hp += heal;
    } else if (n.type === 'treasure') {
      const rel = randomRelics(run, rng, 1)[0];
      if (rel) addRelic(run, rel);
      run.gold += rng.int(25, 45);
    } else if (n.type === 'shop') {
      const srng = rngFor(run, 'shop', n.id);
      const spells = srng.shuffle(PLAYER_SPELLS.filter((id) => !run.spells.some((s) => s.id === id))).slice(0, 3);
      const relics = randomRelics(run, srng, 2);
      const relicPrice = relics.map(() => 90 + srng.int(0, 35));
      if (run.hp / run.maxHp < 0.75 && run.gold >= 28) {
        run.gold -= 28;
        run.hp = Math.min(run.maxHp, run.hp + 20);
      }
      relics.forEach((id, i) => {
        if (run.gold >= relicPrice[i]) {
          run.gold -= relicPrice[i];
          addRelic(run, id);
        }
      });
      if (run.gold >= 60 && run.spells.some((s) => s.lvl < 2)) {
        run.gold -= 60;
        upgradeBest(run);
      }
      const best = spells.sort((a, b) => rankOf(b) - rankOf(a))[0];
      if (best && run.gold >= spellPrice(SPELLS[best]) && (run.spells.length < 4 || rankOf(best) > Math.min(...run.spells.map((s) => rankOf(s.id))))) {
        run.gold -= spellPrice(SPELLS[best]);
        learn(run, best);
      }
    } else if (n.type === 'event') {
      const ev = rngFor(run, 'event', n.id).pick(EVENTS);
      const hpR = run.hp / run.maxHp;
      const val = (hint: string) => {
        let v = 0;
        if (/Leczy/.test(hint)) v += 1 + (1 - hpR) * 6;
        if (/ulepsz|relikt|Naucz/i.test(hint)) v += 3;
        if (/zł/.test(hint) && /\+/.test(hint)) v += 1.5;
        if (/−\d+ PŻ|−\d+ maks/.test(hint)) v -= 1 + (1 - hpR) * 8;
        if (/budzi/.test(hint)) v += hpR > 0.7 ? 1.5 : -4;
        if (/Ryzykowne/.test(hint)) v += 0.5;
        return v;
      };
      const choices = ev.choices.filter((c) => !c.ok || c.ok(run));
      const c = choices.sort((a, b) => val(b.hint) - val(a.hint))[0];
      const res = c.pick(run, rngFor(run, 'event-out', n.id));
      if (run.hp <= 0) {
        out.deathRow = n.row;
        out.deathTier = 'event';
        break;
      }
      if (res.then === 'battle') {
        if (!(await fight(n, 'normal', n.row + 1))) break;
      } else if (res.then === 'upgrade') upgradeBest(run);
      else if (res.then === 'learn') {
        const opts = rngFor(run, 'node', n.id, 'learn').shuffle(PLAYER_SPELLS.filter((id) => !run.spells.some((s) => s.id === id))).slice(0, 3);
        const best = opts.sort((a, b) => rankOf(b) - rankOf(a))[0];
        if (best) learn(run, best);
      } else if (res.then === 'relic') {
        const rel = randomRelics(run, rngFor(run, 'node', n.id, 'relic'), 1)[0];
        if (rel) addRelic(run, rel);
      }
    }
  }
  out.relics = run.relics.length;
  return out;
}

export const CLASS_IDS = Object.keys(CLASSES);
