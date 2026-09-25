import { COIN } from '../core/types';
import { BOMB } from './board';
import type { Fighter } from './fighter';
import type { SpellCtx } from './spells';

/** Class supermoves, charged by collecting bottle caps. None of them ends the turn. */
export interface UltDef {
  name: string;
  desc: string;
  cast(c: SpellCtx): Promise<void>;
  /** when a sensible player would fire it (used by the sim) */
  worth?(me: Fighter, foe: Fighter): boolean;
}

export const ULTS: Record<string, UltDef> = {
  pyro: {
    name: 'Grill na pełnej',
    desc: 'Zadaje 16 obrażeń i podpala wroga: 3 obrażenia na turę przez 3 tury. Nie kończy tury.',
    cast: async (c) => {
      await c.damage(16, 'fire');
      await c.poison(3, 3);
    },
  },
  druid: {
    name: 'Rosół dla całej rodziny',
    desc: 'Leczy 14 PŻ, zdejmuje truciznę i daje 6 punktów tarczy. Nie kończy tury.',
    cast: async (c) => {
      c.me.poison = { dmg: 0, turns: 0 };
      await c.heal(14);
      await c.shield(6);
    },
    worth: (me) => me.maxHp - me.hp >= 14 || me.poison.turns > 0,
  },
  storm: {
    name: 'Przekręt',
    desc: 'Zabiera wrogowi całą manę i zadaje 6 obrażeń. Nie kończy tury.',
    cast: async (c) => {
      for (let k = 0; k < 4; k++) await c.drain(99, true, k);
      await c.damage(6, 'bolt');
    },
  },
  plumber: {
    name: 'Pion do wymiany',
    desc: 'Wstawia 3 bomby i odpala wszystkie kamienie specjalne na planszy. Zbierasz wszystko, co wyleci. Nie kończy tury.',
    cast: async (c) => {
      await c.special(c.pick(3, (_, i) => !c.board.g[i]!.sp), BOMB);
      await c.destroy(c.cells((_, i) => !!c.board.g[i]!.sp), 'ice');
    },
  },
  trader: {
    name: 'Wyprzedaż',
    desc: 'Zbiera wszystkie monety z planszy: każda daje złotówkę i zadaje 2 obrażenia. Nie kończy tury.',
    cast: async (c) => {
      const coins = c.cells((t) => t === COIN);
      await c.destroy(coins, 'ice');
      // the first point per coin comes from her perk when they are collected
      await c.damage(coins.length * (c.me.coinHit ? 1 : 2), 'bolt');
    },
  },
  dres: {
    name: 'Wjazd na chatę',
    desc: 'Przez 3 tury każde dopasowanie czaszek daje dodatkową turę. Nie kończy tury.',
    cast: async (c) => {
      c.me.rush = 3;
      await c.announce('Wjazd na chatę!', 'czaszki dają dodatkowe tury');
    },
  },
  seer: {
    name: 'Koło fortuny',
    desc: 'Losuje supermoc jednego z pozostałych bohaterów. Kapsli trzeba tylko 5. Nie kończy tury.',
    cast: async (c) => {
      const ids = Object.keys(ULTS).filter((id) => id !== 'seer');
      const u = ULTS[ids[c.rng.int(0, ids.length - 1)]];
      await c.announce(u.name, 'wylosowało koło fortuny');
      await u.cast(c);
    },
  },
};
