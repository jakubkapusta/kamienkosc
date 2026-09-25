/**
 * Every difficulty knob in one place. Tuned with the headless sim (npm run sim):
 * ~40% of runs won by a sensible player (7 gem types, supermoves), no sudden difficulty walls,
 * ~14 player turns per ordinary fight.
 * The sim can override these per experiment: BAL='{"bossHp":0.8}' npm run sim
 */
export const BAL = {
  /** enemy HP multiplier = hpBase + floor * hpFloor */
  hpBase: 0.62,
  hpFloor: 0.07,
  eliteHp: 1.15,
  /** damage per enemy skull, by floor (row 0–7); fractions round per hit */
  skullAt: [1.25, 1.25, 1.5, 1.75, 2, 2.5, 2.75, 3],
  /** enemy spell power = powBase + floor * powFloor */
  powBase: 0.9,
  powFloor: 0.1,
  elitePow: 0.1,
  /** floor from which normal enemies know two spells / tier-2 spells */
  twoSpellsFrom: 4,
  tier2From: 4,
  bossHp: 0.68,
  bossSkull: 2.5,
  bossPow: 1.35,
  bossSkill: 0.95,
  playerSkull: 2,
  /** bottle caps needed to charge the class supermove */
  capsNeeded: 8,
  /** share of max HP recovered after each won battle */
  winHeal: 0.25,
  /** "Cisza nocna": from this turn (both sides, extra turns count) skulls hit double, +1× every quietStep turns after */
  quietAt: 50,
  quietStep: 20,
};

/** Skull damage multiplier from the anti-stall rule (1 before BAL.quietAt). */
export const quietMult = (turnNo: number) => (turnNo < BAL.quietAt ? 1 : 2 + Math.floor((turnNo - BAL.quietAt) / BAL.quietStep));
