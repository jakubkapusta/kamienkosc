import { hash, RNG } from '../core/rng';
import { CLASSES, RELICS } from './content';
import type { SpellInst } from './fighter';
import { genMap, type MapData, type RunLen } from './map';

export interface BattleSave {
  turn: 0 | 1;
  board: number[];
  f: { hp: number; mana: number[]; shield: number; poison: [number, number]; stun: number; str: [number, number] }[];
  rng: number;
  turnNo: number;
  gold: number;
  freeSpell: boolean;
  caps?: number;
  bribes?: number;
  rush?: number;
}

export type Step = 'battle' | 'reward' | 'event' | 'shop' | 'rest' | 'treasure' | 'upgrade' | 'learn' | 'relic';

export interface Run {
  v: 1;
  seed: number;
  daily: string | null;
  cls: string;
  hp: number;
  maxHp: number;
  gold: number;
  spells: SpellInst[];
  relics: string[];
  map: MapData;
  pos: number;
  visited: number[];
  stage: { node: number; step: Step; gold?: number; heal?: number; tier?: 'normal' | 'elite' | 'boss' } | null;
  battle: BattleSave | null;
  bought: string[];
  stats: { kills: number; maxCombo: number; turns: number; gems: number; start: number };
}

const KEY = 'kamienkosc.run.v1';
const META = 'kamienkosc.meta.v1';

export function newRun(cls: string, seed: number, daily: string | null, len: RunLen = 'short'): Run {
  const c = CLASSES[cls];
  return {
    v: 1, seed, daily, cls, hp: c.hp, maxHp: c.hp, gold: 20,
    spells: c.spells.map((id) => ({ id, lvl: 1 })),
    relics: [],
    map: genMap(hash(seed, 'map'), len),
    pos: -1, visited: [], stage: null, battle: null, bought: [],
    stats: { kills: 0, maxCombo: 0, turns: 0, gems: 0, start: Date.now() },
  };
}

export const has = (r: Run, id: string) => r.relics.includes(id);

export function rngFor(r: Run, ...parts: (string | number)[]) {
  return new RNG(hash(r.seed, ...parts));
}

export function floorOf(r: Run) {
  return r.pos < 0 ? 0 : r.map.nodes[r.pos].row + 1;
}

export function addRelic(r: Run, id: string) {
  if (r.relics.includes(id)) return;
  r.relics.push(id);
  if (id === 'heartstone') {
    r.maxHp += 15;
    r.hp += 15;
  }
}

export function randomRelics(r: Run, rng: RNG, n: number): string[] {
  const pool = Object.keys(RELICS).filter((k) => !r.relics.includes(k));
  return rng.shuffle(pool).slice(0, n);
}

export function saveRun(r: Run | null) {
  try {
    if (r) localStorage.setItem(KEY, JSON.stringify(r));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable — the run just won't survive a reload */
  }
}

export function loadRun(): Run | null {
  try {
    const s = localStorage.getItem(KEY);
    if (!s) return null;
    const r = JSON.parse(s) as Run;
    return r.v === 1 ? r : null;
  } catch {
    return null;
  }
}

export interface Meta { runs: number; wins: number; best: number; daily: Record<string, number> }

export function loadMeta(): Meta {
  try {
    const m = JSON.parse(localStorage.getItem(META) || 'null');
    if (m) return { runs: 0, wins: 0, best: 0, daily: {}, ...m };
  } catch {
    /* ignore */
  }
  return { runs: 0, wins: 0, best: 0, daily: {} };
}

export function saveMeta(m: Meta) {
  try {
    localStorage.setItem(META, JSON.stringify(m));
  } catch {
    /* ignore */
  }
}

export function score(r: Run, won: boolean) {
  const floors = r.visited.length;
  return floors * 60 + r.stats.kills * 40 + r.stats.maxCombo * 25 + Math.floor(r.gold / 2) + (won ? 1000 + r.hp * 5 : 0);
}

export function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
