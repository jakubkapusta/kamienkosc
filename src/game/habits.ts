import { CAP, WATER } from '../core/types';
import type { Board } from './board';
import type { EnemySpec } from './enemies';
import type { Fighter } from './fighter';
import type { RNG } from '../core/rng';
import type { SpellCtx } from './spells';

/**
 * Monster habits: one signature mechanic per archetype (and boss), so every enemy type asks
 * for a different answer. Everything goes through SpellCtx, so battle and sim run the same code.
 * `act` fires at the start of the enemy's own (not stunned) turn, every `every` turns.
 */
export interface HabitDef {
  name: string;
  desc(floor: number): string;
  color: string;
  every?: number;
  act?(c: SpellCtx, floor: number): Promise<void>;
  /** damage taken per hit is reduced by this (never below 1) */
  armor?: number;
  /** złoty taken from the player for each coin this enemy collects */
  coinSteal?: number;
  /** on firing turns the enemy moves twice */
  extra?: boolean;
  /** show a banner when it fires (skip for every-turn habits) */
  loud?: boolean;
}

/** Damage when a petarda's fuse runs out (scales with difficulty). */
export const breathDamage = (floor: number) => Math.round(3 + floor * 0.4);
export const fuseDamage = (floor: number) => Math.round(3 + floor * 0.6);

const free = (c: SpellCtx) => (_: number, i: number) => {
  const g = c.board.g[i]!;
  return !g.sp && !g.ice && !g.fuse;
};

export const HABITS: Record<string, HabitDef> = {
  fuse: {
    name: 'Petardy',
    desc: (f) => `Co 3 tury podpala lont na losowym kamieniu. Po 3 jego turach petarda wybucha za ${fuseDamage(f)}. Rozbroisz ją, zbierając ten kamień.`,
    color: '#ff7a3a', every: 3, loud: true,
    act: (c) => c.fuse(c.pick(1, free(c)), 3),
  },
  flood: {
    name: 'Mokra robota',
    desc: () => 'Co 2 tury zamienia 3 kamienie w niebieskie.',
    color: '#3a9aff', every: 2,
    act: (c) => c.convert(c.pick(3, (t) => t !== WATER && t !== CAP), WATER),
  },
  rise: {
    name: 'Zrasta się',
    desc: () => 'Raz na walkę, gdy spadnie poniżej 1/3 zdrowia, składa kości z powrotem i odzyskuje 1/3 zdrowia.',
    color: '#e8dcc0', every: 1,
    act: async (c) => {
      if (c.me.memo.rose || c.me.hp > c.me.maxHp / 3) return;
      c.me.memo.rose = 1;
      await c.announce('Zrasta się!', 'kość do kości, jak nowy');
      await c.heal(Math.round(c.me.maxHp / 3 / c.me.pow));
    },
  },
  chill: {
    name: 'Zimny dotyk',
    desc: () => 'Co 2 tury zamraża 2 kamienie. Lód pęka, gdy obok coś zniknie.',
    color: '#9fe8ff', every: 2,
    act: (c) => c.freeze(c.pick(2, free(c))),
  },
  installments: {
    name: 'Raty zero procent',
    desc: () => 'Każda moneta, którą zbierze, zabiera ci złotówkę. Nie zostawiaj mu monet.',
    color: '#dfe6ee', coinSteal: 1,
  },
  stone: {
    name: 'Kamienna skóra',
    desc: () => 'Każde trafienie w niego jest słabsze o 1.',
    color: '#b0a490', armor: 1,
  },
  breath: {
    name: 'Zionie',
    desc: (f) => `Co 4 tury zieje ogniem za ${breathDamage(f)}.`,
    color: '#ff5a3d', every: 4, loud: true,
    act: (c, f) => c.damage(breathDamage(f) / c.me.pow, 'fire'),
  },
  regen: {
    name: 'Karmi się hejtem',
    desc: () => 'Co 2 tury leczy 3 PŻ.',
    color: '#8adf6a', every: 2,
    act: (c) => c.heal(3 / c.me.pow),
  },
  fingers: {
    name: 'Lepkie palce',
    desc: () => 'Na początku każdej swojej tury podkrada ci 1 many z największej puli.',
    color: '#c9a6ff', every: 1,
    act: (c) => c.drain(1, true),
  },
  fine: {
    name: 'Mandat',
    desc: () => 'Co 3 tury wlepia mandat: zabiera 10 zł, a jak nie masz, to 5 PŻ.',
    color: '#ffd23f', every: 3, loud: true,
    act: async (c) => {
      const got = await c.rob(10);
      if (got < 10) await c.damage(5 / c.me.pow, 'bolt');
    },
  },
  harvest: {
    name: 'Żniwa',
    desc: () => 'Co 4 tury ścina sierpem cały dolny rząd planszy i zbiera go dla siebie.',
    color: '#e8c86a', every: 4, loud: true,
    act: (c) => c.destroy(c.cells((_, i) => i >= 56), 'nature'),
  },
  restless: {
    name: 'Licho nie śpi',
    desc: () => 'Co 3 tury rusza się dwa razy.',
    color: '#b870e0', every: 3, loud: true, extra: true,
  },
  charge: {
    name: 'Szarża',
    desc: () => 'Co 3 tury szarżuje: w tej turze jego czaszki biją o 2 mocniej.',
    color: '#ff8a5a', every: 3, loud: true,
    act: (c) => c.strength(2, 0),
  },
  stamp: {
    name: 'Brak pieczątki',
    desc: () => 'Co 3 tury zamraża 3 kamienie. Wróć z kompletem dokumentów.',
    color: '#ff5a8a', every: 3, loud: true,
    act: (c) => c.freeze(c.pick(3, free(c))),
  },
};

/** Gives the enemy fighter its habit and habit-derived stats (battle and sim). */
export function habitSetup(E: Fighter, spec: EnemySpec) {
  E.habit = spec.habit ? HABITS[spec.habit] : null;
  E.armor = E.habit?.armor ?? 0;
  E.coinSteal = E.habit?.coinSteal ?? 0;
  E.fuseDmg = spec.fuseDmg;
}

/** Opening tricks of elite traits, applied to a fresh board. */
export function openingTraits(board: Board, spec: EnemySpec, rng: RNG) {
  const free = () => rng.shuffle([...Array(64).keys()].filter((i) => board.g[i] && !board.g[i]!.sp && !board.g[i]!.ice && !board.g[i]!.fuse));
  if (spec.traits.includes('explosive')) for (const i of free().slice(0, 2)) board.g[i]!.fuse = 3;
  if (spec.traits.includes('icy')) for (const i of free().slice(0, 6)) board.g[i]!.ice = true;
}

/** True when the habit fires on the enemy's current own turn. */
export const habitFires = (E: Fighter) => !!E.habit?.every && E.habitTurn > 0 && E.habitTurn % E.habit.every === 0;
