import type { Look } from '../gfx/portrait';

export interface SpellInst { id: string; lvl: number }

export class Fighter {
  hp: number;
  mana = [0, 0, 0, 0];
  maxMana = [20, 20, 20, 20];
  shield = 0;
  poison = { dmg: 0, turns: 0 };
  stun = 0;
  str = { amt: 0, turns: 0 };
  skull = 2;
  pow = 1;
  vampiric = false;

  // presentation
  hpShown: number;
  hpVis: number;
  hpGhost: number;
  manaVis = [0, 0, 0, 0];
  manaPulse = [0, 0, 0, 0];
  hit = 0;
  flash = 0;
  flashColor = '#ffffff';
  dead = 0;
  shieldVis = 0;
  active = 0;

  constructor(
    public name: string,
    public title: string,
    public maxHp: number,
    public spells: SpellInst[],
    public look: Look,
    public isPlayer: boolean,
    hp = maxHp,
  ) {
    this.hp = hp;
    this.hpShown = hp;
    this.hpVis = hp;
    this.hpGhost = hp;
  }
}
