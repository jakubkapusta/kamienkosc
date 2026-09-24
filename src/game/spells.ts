import type { RNG } from '../core/rng';
import { AIR, COIN, DARK, EARTH, FIRE, SKULL, WATER } from '../core/types';
import type { Board } from './board';
import type { Fighter } from './fighter';

export type FxKind = 'fire' | 'ice' | 'bolt' | 'rock' | 'dark' | 'nature';

export interface SpellCtx {
  me: Fighter;
  foe: Fighter;
  board: Board;
  rng: RNG;
  damage(n: number, fx: FxKind): Promise<void>;
  heal(n: number): Promise<void>;
  shield(n: number): Promise<void>;
  poison(dmg: number, turns: number): Promise<void>;
  stun(turns: number): Promise<void>;
  strength(n: number, turns: number): Promise<void>;
  gain(c: number, n: number): Promise<void>;
  drain(n: number, steal: boolean, color?: number): Promise<void>;
  destroy(cells: number[], fx: FxKind): Promise<void>;
  convert(cells: number[], to: number): Promise<void>;
  special(cells: number[], sp: number): Promise<void>;
  shuffle(): Promise<void>;
  cells(pred?: (t: number, i: number) => boolean): number[];
  pick(n: number, pred?: (t: number, i: number) => boolean): number[];
}

export interface SpellDef {
  id: string;
  name: string;
  elem: number;
  cost: number[];
  hp?: number;
  quick?: boolean;
  /** p = player loot, e = enemy only, b = both */
  pool: 'p' | 'e' | 'b';
  tier: number;
  desc(l: number): string;
  cast(c: SpellCtx, l: number): Promise<void>;
  ai?(me: Fighter, foe: Fighter, b: Board): number;
}

const L = (l: number, a: number, b: number) => (l >= 2 ? b : a);
const missing = (f: Fighter) => f.maxHp - f.hp;
const count = (b: Board, t: number) => b.g.filter((g) => g && g.t === t).length;

const list: SpellDef[] = [
  {
    id: 'fireball', name: 'Kula ognia', elem: FIRE, cost: [7, 0, 0, 0], pool: 'b', tier: 1,
    desc: (l) => `Zadaje ${L(l, 9, 13)} obrażeń.`,
    cast: (c, l) => c.damage(L(l, 9, 13), 'fire'),
  },
  {
    id: 'frostbolt', name: 'Lodowy grot', elem: WATER, cost: [0, 6, 0, 0], pool: 'b', tier: 1,
    desc: (l) => `Zadaje ${L(l, 5, 7)} obrażeń i wymraża przeciwnikowi ${L(l, 4, 6)} many ognia.`,
    cast: async (c, l) => {
      await c.damage(L(l, 5, 7), 'ice');
      await c.drain(L(l, 4, 6), false, FIRE);
    },
  },
  {
    id: 'stoneskin', name: 'Kamienna skóra', elem: EARTH, cost: [0, 0, 6, 0], pool: 'b', tier: 1,
    desc: (l) => `Zyskujesz ${L(l, 10, 15)} punktów tarczy.`,
    cast: (c, l) => c.shield(L(l, 10, 15)),
    ai: (me) => (me.shield < 5 ? 9 : 1),
  },
  {
    id: 'chain', name: 'Łańcuch piorunów', elem: AIR, cost: [0, 0, 0, 8], pool: 'p', tier: 1,
    desc: (l) => `Pioruny rozbijają ${L(l, 6, 9)} losowych kamieni — zbierasz ich moc.`,
    cast: (c, l) => c.destroy(c.pick(L(l, 6, 9)), 'bolt'),
  },
  {
    id: 'mend', name: 'Kojące wody', elem: WATER, cost: [0, 5, 4, 0], pool: 'b', tier: 1,
    desc: (l) => `Leczy ${L(l, 12, 18)} PŻ.`,
    cast: (c, l) => c.heal(L(l, 12, 18)),
    ai: (me) => (missing(me) >= 12 ? 11 : 0),
  },
  {
    id: 'quake', name: 'Trzęsienie ziemi', elem: EARTH, cost: [0, 0, 10, 0], pool: 'p', tier: 2,
    desc: (l) => `Kruszy dolny rząd planszy (zbierasz go) i zadaje ${L(l, 4, 7)} obrażeń.`,
    cast: async (c, l) => {
      await c.destroy(c.cells((_, i) => i >= 56), 'rock');
      await c.damage(L(l, 4, 7), 'rock');
    },
  },
  {
    id: 'alchemy', name: 'Alchemia', elem: AIR, cost: [0, 0, 3, 5], pool: 'p', tier: 1, quick: true,
    desc: (l) => `Wszystkie monety zmieniają się w czaszki.${l >= 2 ? ' Zyskujesz 4 many powietrza.' : ''} Nie kończy tury.`,
    cast: async (c, l) => {
      await c.convert(c.cells((t) => t === COIN), SKULL);
      if (l >= 2) await c.gain(AIR, 4);
    },
  },
  {
    id: 'theft', name: 'Kradzież many', elem: AIR, cost: [0, 0, 0, 6], pool: 'b', tier: 1, quick: true,
    desc: (l) => `Kradnie ${L(l, 5, 8)} many z największej puli przeciwnika. Nie kończy tury.`,
    cast: (c, l) => c.drain(L(l, 5, 8), true),
    ai: (_, foe) => (Math.max(...foe.mana) >= 5 ? 8 : 0),
  },
  {
    id: 'venom', name: 'Jad', elem: EARTH, cost: [0, 3, 5, 0], pool: 'b', tier: 1,
    desc: (l) => `Zatruwa przeciwnika: ${L(l, 3, 4)} obrażeń na początku jego tury przez 4 tury.`,
    cast: (c, l) => c.poison(L(l, 3, 4), 4),
    ai: (_, foe) => (foe.poison.turns > 1 ? 0 : 9),
  },
  {
    id: 'inferno', name: 'Pożoga', elem: FIRE, cost: [12, 0, 0, 0], pool: 'p', tier: 2,
    desc: (l) => `Spala wszystkie czerwone kamienie (zbierasz je) i zadaje ${L(l, 4, 8)} obrażeń.`,
    cast: async (c, l) => {
      await c.destroy(c.cells((t) => t === FIRE), 'fire');
      await c.damage(L(l, 4, 8), 'fire');
    },
  },
  {
    id: 'frenzy', name: 'Szał bitewny', elem: FIRE, cost: [5, 0, 4, 0], pool: 'b', tier: 1, quick: true,
    desc: (l) => `Przez 3 tury każda czaszka zadaje +${L(l, 2, 3)} obrażeń. Nie kończy tury.`,
    cast: (c, l) => c.strength(L(l, 2, 3), 3),
    ai: (me) => (me.str.turns > 0 ? 0 : 7),
  },
  {
    id: 'meteor', name: 'Meteor', elem: FIRE, cost: [8, 0, 6, 0], pool: 'p', tier: 2,
    desc: (l) => `Meteor wybucha na planszy (obszar 3×3, zbierasz go) i zadaje ${L(l, 8, 12)} obrażeń.`,
    cast: async (c, l) => {
      const x = c.rng.int(1, 6), y = c.rng.int(1, 6);
      const cells: number[] = [];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) cells.push((y + dy) * 8 + x + dx);
      await c.destroy(cells, 'fire');
      await c.damage(L(l, 8, 12), 'fire');
    },
  },
  {
    id: 'whirl', name: 'Wir', elem: AIR, cost: [0, 0, 0, 6], pool: 'p', tier: 1, quick: true,
    desc: (l) => `Tasuje całą planszę.${l >= 2 ? ' Zyskujesz 3 many powietrza.' : ''} Nie kończy tury.`,
    cast: async (c, l) => {
      await c.shuffle();
      if (l >= 2) await c.gain(AIR, 3);
    },
  },
  {
    id: 'bloodpact', name: 'Krwawy pakt', elem: FIRE, cost: [0, 0, 0, 0], hp: 6, pool: 'p', tier: 1, quick: true,
    desc: (l) => `Poświęcasz 6 PŻ, zyskujesz ${L(l, 8, 11)} many ognia. Nie kończy tury.`,
    cast: (c, l) => c.gain(FIRE, L(l, 8, 11)),
  },
  {
    id: 'necro', name: 'Nekromancja', elem: DARK, cost: [0, 4, 0, 4], pool: 'b', tier: 1, quick: true,
    desc: (l) => `Zamienia ${L(l, 5, 7)} losowych kamieni w czaszki. Nie kończy tury.`,
    cast: (c, l) => c.convert(c.pick(L(l, 5, 7), (t) => t !== SKULL), SKULL),
    ai: () => 7,
  },
  {
    id: 'blizzard', name: 'Zamieć', elem: WATER, cost: [0, 9, 0, 3], pool: 'b', tier: 2,
    desc: (l) => `Zadaje ${L(l, 4, 7)} obrażeń i ogłusza przeciwnika na 1 turę.`,
    cast: async (c, l) => {
      await c.damage(L(l, 4, 7), 'ice');
      await c.stun(1);
    },
    ai: (_, foe) => (foe.stun ? 0 : 12),
  },
  {
    id: 'tide', name: 'Przypływ', elem: WATER, cost: [0, 5, 0, 0], pool: 'p', tier: 1, quick: true,
    desc: (l) => `Wszystkie czerwone kamienie stają się niebieskie.${l >= 2 ? ' Zyskujesz 4 many wody.' : ''} Nie kończy tury.`,
    cast: async (c, l) => {
      await c.convert(c.cells((t) => t === FIRE), WATER);
      if (l >= 2) await c.gain(WATER, 4);
    },
  },
  {
    id: 'verdant', name: 'Dar lasu', elem: EARTH, cost: [0, 0, 5, 0], pool: 'p', tier: 1, quick: true,
    desc: (l) => `Wszystkie żółte kamienie stają się zielone.${l >= 2 ? ' Leczy 5 PŻ.' : ''} Nie kończy tury.`,
    cast: async (c, l) => {
      await c.convert(c.cells((t) => t === AIR), EARTH);
      if (l >= 2) await c.heal(5);
    },
  },
  {
    id: 'storm', name: 'Burzowe cięcie', elem: AIR, cost: [0, 0, 0, 7], pool: 'p', tier: 2,
    desc: (l) => `Rozcina planszę krzyżem przez losowy kamień (zbierasz) i zadaje ${L(l, 3, 6)} obrażeń.`,
    cast: async (c, l) => {
      const i = c.pick(1)[0] ?? 27;
      const x = i % 8, y = (i / 8) | 0;
      const cells = new Set<number>();
      for (let k = 0; k < 8; k++) {
        cells.add(y * 8 + k);
        cells.add(k * 8 + x);
      }
      await c.destroy([...cells], 'bolt');
      await c.damage(L(l, 3, 6), 'bolt');
    },
  },
  {
    id: 'leech', name: 'Wysysanie życia', elem: DARK, cost: [5, 0, 5, 0], pool: 'b', tier: 2,
    desc: (l) => `Zadaje ${L(l, 6, 9)} obrażeń i leczy cię o tyle samo.`,
    cast: async (c, l) => {
      await c.damage(L(l, 6, 9), 'dark');
      await c.heal(L(l, 6, 9));
    },
  },
  {
    id: 'prism', name: 'Pryzmat', elem: DARK, cost: [3, 3, 3, 3], pool: 'p', tier: 2, quick: true,
    desc: (l) => `Zamienia ${L(l, 2, 3)} losowe kamienie w bomby. Nie kończy tury.`,
    cast: (c, l) => c.special(c.pick(L(l, 2, 3), (t) => t !== COIN), 1),
  },
  // enemy repertoire
  {
    id: 'breath', name: 'Ognisty oddech', elem: FIRE, cost: [8, 0, 0, 0], pool: 'e', tier: 1,
    desc: (l) => `Zadaje ${L(l, 8, 11)} obrażeń.`,
    cast: (c, l) => c.damage(L(l, 8, 11), 'fire'),
  },
  {
    id: 'boulder', name: 'Głaz', elem: EARTH, cost: [0, 0, 7, 0], pool: 'e', tier: 1,
    desc: (l) => `Zadaje ${L(l, 7, 10)} obrażeń.`,
    cast: (c, l) => c.damage(L(l, 7, 10), 'rock'),
  },
  {
    id: 'thunder', name: 'Grzmot', elem: AIR, cost: [0, 0, 0, 7], pool: 'e', tier: 1,
    desc: (l) => `Zadaje ${L(l, 6, 9)} obrażeń.`,
    cast: (c, l) => c.damage(L(l, 6, 9), 'bolt'),
  },
  {
    id: 'regen', name: 'Regeneracja', elem: WATER, cost: [0, 7, 0, 0], pool: 'e', tier: 1,
    desc: (l) => `Leczy ${L(l, 10, 15)} PŻ.`,
    cast: (c, l) => c.heal(L(l, 10, 15)),
    ai: (me) => (missing(me) >= 10 ? 10 : 0),
  },
  {
    id: 'curse', name: 'Klątwa', elem: DARK, cost: [3, 0, 0, 3], pool: 'e', tier: 1,
    desc: (l) => `Przeciwnik traci ${L(l, 3, 5)} many każdego koloru.`,
    cast: async (c, l) => {
      for (let k = 0; k < 4; k++) await c.drain(L(l, 3, 5), false, k);
    },
    ai: (_, foe) => (foe.mana.reduce((a, b) => a + b, 0) >= 12 ? 9 : 2),
  },
  {
    id: 'roar', name: 'Przerażający ryk', elem: DARK, cost: [0, 0, 6, 6], pool: 'e', tier: 2,
    desc: () => `Ogłusza przeciwnika na 1 turę.`,
    cast: (c) => c.stun(1),
    ai: (_, foe) => (foe.stun ? 0 : 10),
  },
  {
    id: 'burn', name: 'Podpalenie', elem: FIRE, cost: [5, 0, 0, 0], pool: 'e', tier: 1,
    desc: (l) => `Podpala przeciwnika: ${L(l, 2, 3)} obrażeń na turę przez 3 tury.`,
    cast: (c, l) => c.poison(L(l, 2, 3), 3),
    ai: (_, foe) => (foe.poison.turns > 1 ? 0 : 8),
  },
  {
    id: 'bones', name: 'Grad kości', elem: DARK, cost: [0, 4, 0, 4], pool: 'e', tier: 1,
    desc: (l) => `Zadaje ${L(l, 5, 8)} obrażeń i zamienia 3 kamienie w czaszki.`,
    cast: async (c, l) => {
      await c.damage(L(l, 5, 8), 'dark');
      await c.convert(c.pick(3, (t) => t !== SKULL), SKULL);
    },
  },
];

export const SPELLS: Record<string, SpellDef> = Object.fromEntries(list.map((s) => [s.id, s]));
export const PLAYER_SPELLS = list.filter((s) => s.pool !== 'e').map((s) => s.id);

export const ENEMY_POOL: string[][] = [
  ['breath', 'burn', 'frenzy', 'fireball'],
  ['frostbolt', 'regen', 'blizzard'],
  ['stoneskin', 'boulder', 'venom'],
  ['thunder', 'theft', 'roar'],
  ['curse', 'bones', 'leech', 'necro'],
];

export function affordable(f: Fighter, def: SpellDef) {
  for (let c = 0; c < 4; c++) if (f.mana[c] < def.cost[c]) return false;
  if (def.hp && f.hp <= def.hp + 1) return false;
  return true;
}

export function spellPrice(def: SpellDef) {
  return 40 + def.tier * 18;
}
