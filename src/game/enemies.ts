import { hash, RNG } from '../core/rng';
import { AIR, DARK, EARTH, ELEM_COLOR, FIRE, WATER } from '../core/types';
import { mixHex } from '../gfx/color';
import type { Look } from '../gfx/portrait';
import type { SpellInst } from './fighter';
import { BAL, skullFor } from './balance';
import { diffOf, type MapNode } from './map';
import { rngFor, type Run } from './run';
import { ENEMY_POOL, SPELLS } from './spells';

export type Tier = 'normal' | 'elite' | 'boss';

export interface EnemySpec {
  name: string;
  title: string;
  elem: number;
  hp: number;
  skull: number;
  pow: number;
  spells: SpellInst[];
  look: Look;
  tier: Tier;
  traits: string[];
  startMana: number;
  shield: number;
  skill: number;
}

interface Arch {
  title: string;
  art: string;
  hp: number;
  skins: string[];
  tint: number;
  elems: number[];
  places: string[];
  hair?: string;
}

const ARCH: Arch[] = [
  { title: 'Diablik', art: 'imp', hp: 28, skins: ['#d8483a', '#c23a52', '#e05a2a'], tint: 0.1, elems: [FIRE, DARK], places: ['z Działki', 'z Ogródka Jordanowskiego', 'spod Grilla'] },
  { title: 'Utopiec', art: 'drowner', hp: 34, skins: ['#5aa08a', '#4a8a9a', '#6aa06a'], tint: 0.15, elems: [WATER, EARTH], places: ['z Zalewu', 'z Glinianek', 'spod Mostu'] },
  { title: 'Szkielet', art: 'skeleton', hp: 32, skins: ['#e8dcc0'], tint: 0, elems: [DARK, WATER], places: ['z Szafy', 'z Piwnicy', 'z Pawlacza'] },
  { title: 'Upiór', art: 'ghost', hp: 30, skins: ['#cfe3ea', '#d8d0ea'], tint: 0.08, elems: [WATER, DARK, AIR], places: ['z Bloku', 'z Klatki Schodowej', 'spod Trójki'] },
  { title: 'Akwizytor', art: 'salesman', hp: 36, skins: ['#9ab09a', '#a8a0b8'], tint: 0.1, elems: [DARK, FIRE, AIR], places: ['z Zaświatów', 'od Garnków', 'od Polis na Życie'] },
  { title: 'Golem', art: 'golem', hp: 50, skins: ['#a8a296', '#9aa0a8', '#b0a490'], tint: 0.08, elems: [EARTH, AIR, WATER], places: ['z Wielkiej Płyty', 'z Osiedla', 'z Pustaków'] },
  { title: 'Smok', art: 'dragon', hp: 42, skins: ['#4a9a5a', '#9a4a3a', '#3a7a9a'], tint: 0.2, elems: [FIRE, WATER, EARTH], places: ['z Wawelu (nie tego)', 'spod Wisły', 'z Zoo'] },
  { title: 'Troll', art: 'troll', hp: 44, skins: ['#8a9a7a', '#9a8a7a'], tint: 0.1, elems: [AIR, EARTH, DARK], places: ['z Komentarzy', 'z Forum', 'spod Posta'], hair: '#3a3a2a' },
  { title: 'Chochlik', art: 'goblin', hp: 30, skins: ['#7aaa4a', '#8aa84a'], tint: 0.12, elems: [AIR, EARTH, DARK], places: ['z Urzędu', 'z Okienka Nr 3', 'z Kadr'] },
];

const BOSSES: { name: string; title: string; art: string; hp: number; skin: string; acc: string; elems: number[]; crown?: boolean }[] = [
  { name: 'Pani Halinka', title: 'Kierowniczka Okienka', art: 'clerk', hp: 100, skin: '#f0c4a8', acc: '#b83a6a', elems: [DARK] },
  { name: 'Smok Wawelski', title: 'Emerytowany Postrach Krakowa', art: 'dragon', hp: 110, skin: '#4a9a5a', acc: '#2a6a3a', elems: [FIRE], crown: true },
  { name: 'Teściowa', title: 'Władczyni Niedzielnego Obiadu', art: 'tesciowa', hp: 105, skin: '#e8b4a0', acc: '#c8322a', elems: [DARK, FIRE] },
  { name: 'Golem Kultury', title: 'Dar Bratniego Narodu', art: 'palace', hp: 122, skin: '#b8b0a2', acc: '#e8b53e', elems: [EARTH, AIR] },
];

const TRAITS: Record<string, string> = {
  armored: 'Opatulony',
  furious: 'Skacowany',
  ancient: 'Przedwojenny',
  vampiric: 'Krwiopijczy',
  mystic: 'Nawiedzony',
};
export const TRAIT_DESC: Record<string, string> = {
  armored: 'zaczyna z tarczą',
  furious: 'czaszki bolą bardziej',
  ancient: 'więcej zdrowia',
  vampiric: 'leczy się czaszkami',
  mystic: 'zaczyna z maną',
};

const NAMES = ['Mietek', 'Zdzichu', 'Heniek', 'Rysiek', 'Waldek', 'Józek', 'Staszek', 'Kaziu', 'Zbyszek', 'Janusz', 'Bogdan', 'Czesiek', 'Edek', 'Leszek', 'Tadek', 'Wiesiek', 'Grzesiek', 'Marian'];

/**
 * `floor` is the difficulty from diffOf(): the map row in short runs, fractional and above 7 late in long runs.
 * `boss` forces a boss (index into BOSSES) so a long run doesn't meet the same one twice.
 */
export function genEnemy(seed: number, floor: number, tier: Tier, boss?: number): EnemySpec {
  const rng = new RNG(seed);
  if (tier === 'boss') {
    const picked = rng.pick(BOSSES);
    const b = boss === undefined ? picked : BOSSES[boss % BOSSES.length];
    const grow = Math.max(0.6, 1 + (floor - 7) * BAL.bossGrow);
    const elem = rng.pick(b.elems);
    const look: Look = { art: b.art, pal: { skin: b.skin, acc: b.acc, eye: mixHex(ELEM_COLOR[elem], '#ffffff', 0.3) }, aura: ELEM_COLOR[elem], seed: rng.int(1, 999), crown: b.crown };
    const pool = [...ENEMY_POOL[elem], ...ENEMY_POOL[DARK]].filter((v, i, a) => a.indexOf(v) === i);
    rng.shuffle(pool);
    return {
      name: b.name, title: b.title, elem, hp: Math.round(b.hp * BAL.bossHp * grow), skull: Math.max(1.5, BAL.bossSkull + (floor - 7) * BAL.skullGrow), pow: BAL.bossPow * grow,
      spells: pool.slice(0, 3).map((id) => ({ id, lvl: 2 })), look, tier, traits: [], startMana: 4, shield: 0, skill: BAL.bossSkill,
    };
  }
  const a = rng.pick(ARCH);
  const elem = rng.pick(a.elems);
  const skin = mixHex(rng.pick(a.skins), ELEM_COLOR[elem], a.tint);
  const look: Look = {
    art: a.art,
    pal: { skin, acc: mixHex(ELEM_COLOR[elem], '#000000', 0.1), eye: mixHex(ELEM_COLOR[elem], '#ffffff', 0.3), hair: a.hair },
    aura: ELEM_COLOR[elem],
    seed: rng.int(1, 999),
  };
  const traits: string[] = [];
  if (tier === 'elite') traits.push(rng.pick(Object.keys(TRAITS)));
  else if (floor >= 3 && rng.chance(0.3)) traits.push(rng.pick(Object.keys(TRAITS)));
  const nSpells = tier === 'elite' ? 2 : floor >= BAL.twoSpellsFrom ? 2 : 1;
  const pool = ENEMY_POOL[elem].filter((id) => tier === 'elite' || floor >= BAL.tier2From || SPELLS[id].tier === 1);
  rng.shuffle(pool);
  const spells = pool.slice(0, nSpells).map((id) => ({ id, lvl: tier === 'elite' || floor >= 5 ? 2 : 1 }));
  const scale = BAL.hpBase + floor * BAL.hpFloor;
  let hp = Math.round(a.hp * scale * (tier === 'elite' ? BAL.eliteHp : 1) * rng.range(0.92, 1.08));
  if (traits.includes('ancient')) hp = Math.round(hp * 1.3);
  const tr = traits.map((t) => TRAITS[t]).join(' ');
  return {
    name: rng.pick(NAMES),
    title: `${tr ? tr + ' ' : ''}${a.title} ${rng.pick(a.places)}`,
    elem, hp, skull: skullFor(floor) + (traits.includes('furious') ? 1 : 0) + (tier === 'elite' && floor <= 1 ? 1 : 0),
    pow: BAL.powBase + floor * BAL.powFloor + (tier === 'elite' ? BAL.elitePow : 0),
    spells, look, tier, traits,
    startMana: traits.includes('mystic') ? 6 : 0,
    shield: traits.includes('armored') ? 10 + floor * 2 : 0,
    skill: Math.min(0.9, 0.35 + floor * 0.08 + (tier === 'elite' ? 0.2 : 0)),
  };
}

/** The enemy waiting at a map node (events that turn into a fight count one row later). */
export function enemyFor(run: Run, n: MapNode, tier: Tier): EnemySpec {
  const floor = diffOf(run.map, n.row + (n.type === 'event' ? 1 : 0));
  let boss: number | undefined;
  if (tier === 'boss' && run.map.mid !== undefined) boss = rngFor(run, 'bosses').shuffle([...BOSSES.keys()])[n.row === run.map.mid ? 0 : 1];
  return genEnemy(hash(run.seed, 'enemy', n.id, n.type), floor, tier, boss);
}
