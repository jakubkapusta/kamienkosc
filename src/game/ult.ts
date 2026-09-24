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
};
