import { RNG } from '../core/rng';
import { AIR, DARK, EARTH, ELEM_COLOR, FIRE, WATER } from '../core/types';
import { mixHex } from '../gfx/color';
import type { Look, LookKind } from '../gfx/portrait';
import type { SpellInst } from './fighter';
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
  kind: LookKind;
  hp: number;
  skin: string[];
  elems: number[];
  eyes: number[];
  horns: number[];
  ears: number[];
  teeth: number;
  fangs: boolean;
  head: [number, number];
  cloth?: string[];
  mask?: boolean;
  hood?: boolean;
}

const ARCH: Arch[] = [
  { title: 'Goblin', kind: 'beast', hp: 30, skin: ['#7da33f', '#5f8a2e', '#8fa84a'], elems: [AIR, EARTH, FIRE], eyes: [2], horns: [0], ears: [1, 2], teeth: 5, fangs: false, head: [0.9, 0.78] },
  { title: 'Ork', kind: 'beast', hp: 40, skin: ['#5b7d3c', '#6d6a3a', '#4f6e44'], elems: [FIRE, EARTH], eyes: [2], horns: [0, 1], ears: [1], teeth: 4, fangs: true, head: [1.05, 0.92] },
  { title: 'Diablik', kind: 'beast', hp: 28, skin: ['#c2452f', '#a63a52', '#d0572a'], elems: [FIRE, DARK], eyes: [2, 3], horns: [1], ears: [2], teeth: 6, fangs: false, head: [0.85, 0.8] },
  { title: 'Szkielet', kind: 'skull', hp: 32, skin: ['#dccfb2', '#cfc6b0'], elems: [DARK, WATER], eyes: [2], horns: [0], ears: [0], teeth: 7, fangs: false, head: [1, 1] },
  { title: 'Upiór', kind: 'hood', hp: 32, skin: ['#333'], elems: [WATER, DARK, AIR], eyes: [2, 3], horns: [0], ears: [0], teeth: 0, fangs: false, head: [1, 1], cloth: ['#1d2a44', '#2a1d44', '#16323a'] },
  { title: 'Kultysta', kind: 'hood', hp: 36, skin: ['#333'], elems: [DARK, FIRE], eyes: [2], horns: [0], ears: [0], teeth: 0, fangs: false, head: [1, 1], cloth: ['#4a1020', '#3a1244'], mask: true },
  { title: 'Golem', kind: 'golem', hp: 50, skin: ['#8c8174', '#7b8490', '#8a7a64'], elems: [EARTH, WATER, AIR], eyes: [2], horns: [0], ears: [0], teeth: 0, fangs: false, head: [1.05, 1] },
  { title: 'Jaszczur', kind: 'wyrm', hp: 42, skin: ['#4a8c6a', '#8c4a3a', '#3a6a8c'], elems: [FIRE, WATER, EARTH], eyes: [2], horns: [1, 2], ears: [0], teeth: 0, fangs: true, head: [1, 1] },
  { title: 'Troll', kind: 'beast', hp: 46, skin: ['#6a8a8a', '#7a8a6a'], elems: [WATER, EARTH], eyes: [2], horns: [0], ears: [1], teeth: 3, fangs: true, head: [1.15, 1.0] },
];

const BOSSES: (Arch & { name: string })[] = [
  { name: 'Mor-Vallach', title: 'Lisz', kind: 'skull', hp: 100, skin: ['#e8dcc0'], elems: [DARK], eyes: [2], horns: [1], ears: [0], teeth: 7, fangs: false, head: [1, 1], cloth: ['#2a1244'], hood: true },
  { name: 'Ignareth', title: 'Smok', kind: 'wyrm', hp: 110, skin: ['#b0382a'], elems: [FIRE], eyes: [2], horns: [2], ears: [0], teeth: 0, fangs: true, head: [1.1, 1] },
  { name: 'Baal-Khorr', title: 'Władca Otchłani', kind: 'beast', hp: 105, skin: ['#8a2a3a'], elems: [DARK, FIRE], eyes: [3], horns: [2], ears: [1], teeth: 6, fangs: true, head: [1.05, 0.95] },
  { name: 'Wielki Kolos', title: 'Golem Pradawnych', kind: 'golem', hp: 122, skin: ['#6d7a8c'], elems: [EARTH, AIR], eyes: [2], horns: [0], ears: [0], teeth: 0, fangs: false, head: [1.15, 1] },
];

const EPITHET = [
  ['Ognisty', 'Płonący', 'Popielny'],
  ['Lodowy', 'Mroźny', 'Topielczy'],
  ['Kamienny', 'Mszysty', 'Omszały'],
  ['Burzowy', 'Wichrowy', 'Gromowy'],
  ['Przeklęty', 'Mroczny', 'Plugawy'],
];

const TRAITS: Record<string, string> = {
  armored: 'Opancerzony',
  furious: 'Wściekły',
  ancient: 'Pradawny',
  vampiric: 'Wampiryczny',
  mystic: 'Mistyczny',
};
export const TRAIT_DESC: Record<string, string> = {
  armored: 'zaczyna z tarczą',
  furious: 'czaszki zadają +1 obrażeń',
  ancient: 'więcej zdrowia',
  vampiric: 'leczy się czaszkami',
  mystic: 'zaczyna z maną',
};

const SYL1 = ['Gra', 'Zu', 'Mor', 'Kha', 'Vel', 'Dro', 'Ur', 'Nar', 'Thr', 'Bal', 'Gor', 'Skre', 'Vy', 'Oth', 'Krag', 'Zel'];
const SYL2 = ['kk', 'zul', 'gath', 'rin', 'mar', 'th', 'ok', 'ash', 'ur', 'eth', 'ix', 'ogg', 'ven', 'ra'];

function lookFor(a: Arch, rng: RNG, elem: number, big: boolean): Look {
  const skin = mixHex(rng.pick(a.skin), ELEM_COLOR[elem], a.kind === 'skull' ? 0.05 : 0.18);
  return {
    kind: a.kind,
    skin,
    skin2: mixHex(skin, '#000000', 0.62),
    eye: mixHex(ELEM_COLOR[elem], '#ffffff', 0.2),
    aura: ELEM_COLOR[elem],
    eyes: rng.pick(a.eyes),
    horns: rng.pick(a.horns) + (big && a.kind !== 'golem' && a.kind !== 'hood' ? 1 : 0),
    hornLen: rng.range(0.5, 1.1) + (big ? 0.3 : 0),
    ears: rng.pick(a.ears),
    teeth: a.teeth,
    fangs: a.fangs,
    headW: a.head[0] * rng.range(0.94, 1.06),
    headH: a.head[1] * rng.range(0.94, 1.06),
    crown: false,
    seed: rng.int(1, 999),
    cloth: a.cloth ? mixHex(rng.pick(a.cloth), ELEM_COLOR[elem], 0.15) : undefined,
    mask: a.mask,
    hood: a.hood,
  };
}

export function genEnemy(seed: number, floor: number, tier: Tier): EnemySpec {
  const rng = new RNG(seed);
  const scale = 0.9 + floor * 0.13;
  if (tier === 'boss') {
    const b = rng.pick(BOSSES);
    const elem = rng.pick(b.elems);
    const look = lookFor(b, rng, elem, true);
    look.crown = true;
    look.horns = Math.max(look.horns, b.horns[0]);
    const pool = [...ENEMY_POOL[elem], ...ENEMY_POOL[DARK]].filter((v, i, a) => a.indexOf(v) === i);
    rng.shuffle(pool);
    return {
      name: b.name, title: b.title, elem, hp: b.hp, skull: 3, pow: 1.3,
      spells: pool.slice(0, 3).map((id) => ({ id, lvl: 2 })), look, tier, traits: [], startMana: 4, shield: 0, skill: 0.95,
    };
  }
  const a = rng.pick(ARCH);
  const elem = rng.pick(a.elems);
  const look = lookFor(a, rng, elem, tier === 'elite');
  const name = rng.pick(SYL1) + rng.pick(SYL2);
  const traits: string[] = [];
  if (tier === 'elite') traits.push(rng.pick(Object.keys(TRAITS)));
  else if (floor >= 3 && rng.chance(0.3)) traits.push(rng.pick(Object.keys(TRAITS)));
  const nSpells = tier === 'elite' ? 2 : floor >= 3 ? 2 : 1;
  const pool = ENEMY_POOL[elem].filter((id) => tier === 'elite' || floor >= 4 || SPELLS[id].tier === 1);
  rng.shuffle(pool);
  const spells = pool.slice(0, nSpells).map((id) => ({ id, lvl: tier === 'elite' || floor >= 5 ? 2 : 1 }));
  let hp = Math.round(a.hp * scale * (tier === 'elite' ? 1.3 : 1) * rng.range(0.92, 1.08));
  if (traits.includes('ancient')) hp = Math.round(hp * 1.3);
  const epi = rng.pick(EPITHET[elem]);
  const tr = traits.map((t) => TRAITS[t]).join(' ');
  return {
    name, title: `${tr ? tr + ' ' : ''}${epi} ${a.title}`,
    elem, hp, skull: (floor <= 2 ? 1 : floor <= 5 ? 2 : 3) + (traits.includes('furious') ? 1 : 0) + (tier === 'elite' && floor <= 1 ? 1 : 0),
    pow: 0.75 + floor * 0.08 + (tier === 'elite' ? 0.15 : 0),
    spells, look, tier, traits,
    startMana: traits.includes('mystic') ? 6 : 0,
    shield: traits.includes('armored') ? 10 + floor * 2 : 0,
    skill: Math.min(0.9, 0.35 + floor * 0.08 + (tier === 'elite' ? 0.2 : 0)),
  };
}
