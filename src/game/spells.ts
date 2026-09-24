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
    id: 'fireball', name: 'Rozpałka', elem: FIRE, cost: [7, 0, 0, 0], pool: 'b', tier: 1,
    desc: (l) => `Zadaje ${L(l, 9, 13)} obrażeń. Brwi odrosną. Kiedyś.`,
    cast: (c, l) => c.damage(L(l, 9, 13), 'fire'),
  },
  {
    id: 'frostbolt', name: 'Sopel z rynny', elem: WATER, cost: [0, 6, 0, 0], pool: 'b', tier: 1,
    desc: (l) => `Zadaje ${L(l, 5, 7)} obrażeń i wymraża przeciwnikowi ${L(l, 4, 6)} many ognia.`,
    cast: async (c, l) => {
      await c.damage(L(l, 5, 7), 'ice');
      await c.drain(L(l, 4, 6), false, FIRE);
    },
  },
  {
    id: 'stoneskin', name: 'Kufajka', elem: EARTH, cost: [0, 0, 6, 0], pool: 'b', tier: 1,
    desc: (l) => `Zyskujesz ${L(l, 10, 15)} punktów tarczy.`,
    cast: (c, l) => c.shield(L(l, 10, 15)),
    ai: (me) => (me.shield < 5 ? 9 : 1),
  },
  {
    id: 'chain', name: 'Zwarcie w instalacji', elem: AIR, cost: [0, 0, 0, 8], pool: 'p', tier: 1,
    desc: (l) => `Iskrzy w ${L(l, 6, 9)} losowych kamieniach — zbierasz ich moc. Bez uprawnień SEP.`,
    cast: (c, l) => c.destroy(c.pick(L(l, 6, 9)), 'bolt'),
  },
  {
    id: 'mend', name: 'Rosołek', elem: WATER, cost: [0, 5, 4, 0], pool: 'b', tier: 1,
    desc: (l) => `Leczy ${L(l, 12, 18)} PŻ. Jak u mamy.`,
    cast: (c, l) => c.heal(L(l, 12, 18)),
    ai: (me) => (missing(me) >= 12 ? 11 : 0),
  },
  {
    id: 'quake', name: 'Remont u sąsiada', elem: EARTH, cost: [0, 0, 10, 0], pool: 'p', tier: 2,
    desc: (l) => `Wiertarka o siódmej rano kruszy dolny rząd (zbierasz go) i zadaje ${L(l, 4, 7)} obrażeń.`,
    cast: async (c, l) => {
      await c.destroy(c.cells((_, i) => i >= 56), 'rock');
      await c.damage(L(l, 4, 7), 'rock');
    },
  },
  {
    id: 'alchemy', name: 'Inflacja', elem: AIR, cost: [0, 0, 3, 5], pool: 'p', tier: 1, quick: true,
    desc: (l) => `Wszystkie monety zmieniają się w czaszki.${l >= 2 ? ' Zyskujesz 4 many powietrza.' : ''} Nie kończy tury.`,
    cast: async (c, l) => {
      await c.convert(c.cells((t) => t === COIN), SKULL);
      if (l >= 2) await c.gain(AIR, 4);
    },
  },
  {
    id: 'theft', name: 'Kopsnij manę', elem: AIR, cost: [0, 0, 0, 6], pool: 'b', tier: 1, quick: true,
    desc: (l) => `Kradnie ${L(l, 5, 8)} many z największej puli przeciwnika. Nie kończy tury.`,
    cast: (c, l) => c.drain(L(l, 5, 8), true),
    ai: (_, foe) => (Math.max(...foe.mana) >= 5 ? 8 : 0),
  },
  {
    id: 'venom', name: 'Bimber', elem: EARTH, cost: [0, 3, 5, 0], pool: 'b', tier: 1,
    desc: (l) => `Częstujesz przeciwnika: ${L(l, 3, 4)} obrażeń na początku jego tury przez 4 tury.`,
    cast: (c, l) => c.poison(L(l, 3, 4), 4),
    ai: (_, foe) => (foe.poison.turns > 1 ? 0 : 9),
  },
  {
    id: 'inferno', name: 'Wypalanie traw', elem: FIRE, cost: [12, 0, 0, 0], pool: 'p', tier: 2,
    desc: (l) => `Tradycja to tradycja. Spala wszystkie czerwone kamienie (zbierasz je) i zadaje ${L(l, 4, 8)} obrażeń.`,
    cast: async (c, l) => {
      await c.destroy(c.cells((t) => t === FIRE), 'fire');
      await c.damage(L(l, 4, 8), 'fire');
    },
  },
  {
    id: 'frenzy', name: 'Dzień świra', elem: FIRE, cost: [5, 0, 4, 0], pool: 'b', tier: 1, quick: true,
    desc: (l) => `Przez 3 tury każda czaszka zadaje +${L(l, 2, 3)} obrażeń. Nie kończy tury.`,
    cast: (c, l) => c.strength(L(l, 2, 3), 3),
    ai: (me) => (me.str.turns > 0 ? 0 : 7),
  },
  {
    id: 'meteor', name: 'Pustak z balkonu', elem: FIRE, cost: [8, 0, 6, 0], pool: 'p', tier: 2,
    desc: (l) => `Ktoś remontuje balkon. Wybuch 3×3 na planszy (zbierasz go) i ${L(l, 8, 12)} obrażeń.`,
    cast: async (c, l) => {
      const x = c.rng.int(1, 6), y = c.rng.int(1, 6);
      const cells: number[] = [];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) cells.push((y + dy) * 8 + x + dx);
      await c.destroy(cells, 'fire');
      await c.damage(L(l, 8, 12), 'fire');
    },
  },
  {
    id: 'whirl', name: 'Przemeblowanie', elem: AIR, cost: [0, 0, 0, 6], pool: 'p', tier: 1, quick: true,
    desc: (l) => `Tasuje całą planszę.${l >= 2 ? ' Zyskujesz 3 many powietrza.' : ''} Nie kończy tury.`,
    cast: async (c, l) => {
      await c.shuffle();
      if (l >= 2) await c.gain(AIR, 3);
    },
  },
  {
    id: 'bloodpact', name: 'Honorowy krwiodawca', elem: FIRE, cost: [0, 0, 0, 0], hp: 6, pool: 'p', tier: 1, quick: true,
    desc: (l) => `Oddajesz 6 PŻ, dostajesz ${L(l, 8, 11)} many ognia i czekoladę. Nie kończy tury.`,
    cast: (c, l) => c.gain(FIRE, L(l, 8, 11)),
  },
  {
    id: 'necro', name: 'Wszystkich Świętych', elem: DARK, cost: [0, 4, 0, 4], pool: 'b', tier: 1, quick: true,
    desc: (l) => `Zamienia ${L(l, 5, 7)} losowych kamieni w czaszki. Nie kończy tury.`,
    cast: (c, l) => c.convert(c.pick(L(l, 5, 7), (t) => t !== SKULL), SKULL),
    ai: () => 7,
  },
  {
    id: 'blizzard', name: 'Zima zaskoczyła drogowców', elem: WATER, cost: [0, 9, 0, 3], pool: 'b', tier: 2,
    desc: (l) => `Jak co roku. Zadaje ${L(l, 4, 7)} obrażeń i ogłusza przeciwnika na 1 turę.`,
    cast: async (c, l) => {
      await c.damage(L(l, 4, 7), 'ice');
      await c.stun(1);
    },
    ai: (_, foe) => (foe.stun ? 0 : 12),
  },
  {
    id: 'tide', name: 'Zalana piwnica', elem: WATER, cost: [0, 5, 0, 0], pool: 'p', tier: 1, quick: true,
    desc: (l) => `Wszystkie czerwone kamienie stają się niebieskie.${l >= 2 ? ' Zyskujesz 4 many wody.' : ''} Nie kończy tury.`,
    cast: async (c, l) => {
      await c.convert(c.cells((t) => t === FIRE), WATER);
      if (l >= 2) await c.gain(WATER, 4);
    },
  },
  {
    id: 'verdant', name: 'Ogródek babci', elem: EARTH, cost: [0, 0, 5, 0], pool: 'p', tier: 1, quick: true,
    desc: (l) => `Wszystkie żółte kamienie stają się zielone.${l >= 2 ? ' Leczy 5 PŻ.' : ''} Nie kończy tury.`,
    cast: async (c, l) => {
      await c.convert(c.cells((t) => t === AIR), EARTH);
      if (l >= 2) await c.heal(5);
    },
  },
  {
    id: 'storm', name: 'Burza nad Mazurami', elem: AIR, cost: [0, 0, 0, 7], pool: 'p', tier: 2,
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
    id: 'leech', name: 'Pożyczka do pierwszego', elem: DARK, cost: [5, 0, 5, 0], pool: 'b', tier: 2,
    desc: (l) => `Zadaje ${L(l, 6, 9)} obrażeń i leczy cię o tyle samo. Oddasz, jak będziesz miał.`,
    cast: async (c, l) => {
      await c.damage(L(l, 6, 9), 'dark');
      await c.heal(L(l, 6, 9));
    },
  },
  {
    id: 'prism', name: 'Petarda z bazaru', elem: DARK, cost: [3, 3, 3, 3], pool: 'p', tier: 2, quick: true,
    desc: (l) => `Zamienia ${L(l, 2, 3)} losowe kamienie w bomby. Palców masz dziesięć, spokojnie. Nie kończy tury.`,
    cast: (c, l) => c.special(c.pick(L(l, 2, 3), (t) => t !== COIN), 1),
  },
  // enemy repertoire
  {
    id: 'breath', name: 'Czosnkowy oddech', elem: FIRE, cost: [8, 0, 0, 0], pool: 'e', tier: 1,
    desc: (l) => `Zadaje ${L(l, 8, 11)} obrażeń.`,
    cast: (c, l) => c.damage(L(l, 8, 11), 'fire'),
  },
  {
    id: 'boulder', name: 'Rzut kapciem', elem: EARTH, cost: [0, 0, 7, 0], pool: 'e', tier: 1,
    desc: (l) => `Zadaje ${L(l, 7, 10)} obrażeń.`,
    cast: (c, l) => c.damage(L(l, 7, 10), 'rock'),
  },
  {
    id: 'thunder', name: 'Opieprz', elem: AIR, cost: [0, 0, 0, 7], pool: 'e', tier: 1,
    desc: (l) => `Zadaje ${L(l, 6, 9)} obrażeń.`,
    cast: (c, l) => c.damage(L(l, 6, 9), 'bolt'),
  },
  {
    id: 'regen', name: 'Zwolnienie lekarskie', elem: WATER, cost: [0, 7, 0, 0], pool: 'e', tier: 1,
    desc: (l) => `Leczy ${L(l, 10, 15)} PŻ.`,
    cast: (c, l) => c.heal(L(l, 10, 15)),
    ai: (me) => (missing(me) >= 10 ? 10 : 0),
  },
  {
    id: 'curse', name: 'Urok od sąsiadki', elem: DARK, cost: [3, 0, 0, 3], pool: 'e', tier: 1,
    desc: (l) => `Przeciwnik traci ${L(l, 3, 5)} many każdego koloru.`,
    cast: async (c, l) => {
      for (let k = 0; k < 4; k++) await c.drain(L(l, 3, 5), false, k);
    },
    ai: (_, foe) => (foe.mana.reduce((a, b) => a + b, 0) >= 12 ? 9 : 2),
  },
  {
    id: 'roar', name: 'Kazanie', elem: DARK, cost: [0, 0, 6, 6], pool: 'e', tier: 2,
    desc: () => `Ogłusza przeciwnika na 1 turę. Czterdzieści minut o przyzwoitości.`,
    cast: (c) => c.stun(1),
    ai: (_, foe) => (foe.stun ? 0 : 10),
  },
  {
    id: 'burn', name: 'Podpalony śmietnik', elem: FIRE, cost: [5, 0, 0, 0], pool: 'e', tier: 1,
    desc: (l) => `Podpala przeciwnika: ${L(l, 2, 3)} obrażeń na turę przez 3 tury.`,
    cast: (c, l) => c.poison(L(l, 2, 3), 3),
    ai: (_, foe) => (foe.poison.turns > 1 ? 0 : 8),
  },
  {
    id: 'bones', name: 'Kości z rosołu', elem: DARK, cost: [0, 4, 0, 4], pool: 'e', tier: 1,
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
