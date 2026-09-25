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
  caps = 0;
  // hero traits (see heroSetup in content.ts)
  /** bottle caps needed to charge the supermove */
  capsNeeded = 8;
  /** extra mana on each spell's main colour */
  costAdd = 0;
  /** damage dealt to the foe per coin collected */
  coinHit = 0;
  /** water mana per special gem explosion */
  expMana = 0;
  /** gold available for spells paid in cash (run purse + coins from this fight) */
  purse = 0;
  /** how many times a cash spell was used this fight (the price goes up) */
  bribes = 0;
  /** turns left in which a skull match grants an extra turn */
  rush = 0;

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
