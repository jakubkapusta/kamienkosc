import { app, type PEvent, type Scene } from '../app';
import { buzz, sfx } from '../core/audio';
import { clamp, easeBack, easeInOut, hash, RNG, TAU } from '../core/rng';
import { AIR, CAP, COIN, EARTH, ELEM_COLOR, FIRE, SKULL, THEMES } from '../core/types';
import { mixHex, rgba } from '../gfx/color';
import { FX } from '../gfx/fx';
import { GEM_PAL, gemArt } from '../gfx/gems';
import { drawPortrait, preloadLook } from '../gfx/portrait';
import { glow, roundRect, star } from '../gfx/sprites';
import { chooseMove, chooseSpell } from '../game/ai';
import { Board, BOMB, N, NOVA, type Birth, type Explosion, type Gem } from '../game/board';
import { BAL, quietMult } from '../game/balance';
import { CLASSES, MODS } from '../game/content';
import { TRAIT_DESC, type EnemySpec } from '../game/enemies';
import { Fighter, type SpellInst } from '../game/fighter';
import { has, type BattleSave, type Run } from '../game/run';
import { affordable, SPELLS, type FxKind, type SpellCtx } from '../game/spells';
import { ULTS } from '../game/ult';
import { costHTML, esc, hideTip, showTip } from '../ui/dom';

type Action = { k: 'swap'; a: number; b: number } | { k: 'spell'; i: number } | { k: 'ult' };
interface Rect { x: number; y: number; w: number; h: number }
interface Side {
  por: { x: number; y: number; r: number };
  name: { x: number; y: number; align: CanvasTextAlign; size: number };
  hp: Rect;
  mana: Rect[];
  status: { x: number; y: number; dir: number };
  spells: Rect[];
  chip: boolean;
}
interface Lay { wide: boolean; bx: number; by: number; bs: number; cell: number; P: Side; E: Side; gold: { x: number; y: number } }
interface Banner { text: string; sub: string; color: string; t: number; dur: number; size: number }

export interface BattleSetup {
  run: Run;
  enemy: EnemySpec;
  mods: string[];
  seed: number;
  save: BattleSave | null;
  onSave: (s: BattleSave) => void;
}
export interface BattleResult { won: boolean; gold: number; hp: number; maxCombo: number; turns: number; gems: number }

const ENAMEL = ['#b3261e', '#1d4fa3', '#1f7a3e', '#a8740a', '#6a2a9a'];
const inRect = (r: Rect, x: number, y: number) => x >= r.x && y >= r.y && x <= r.x + r.w && y <= r.y + r.h;
const DISPLAY = '"Paytone One", "Arial Black", sans-serif';
const BODY = '"Signika", system-ui, sans-serif';

export class BattleScene implements Scene {
  fx = new FX();
  t = 0;
  board: Board;
  P: Fighter;
  E: Fighter;
  cur: Fighter;
  L!: Lay;
  phase: 'intro' | 'input' | 'busy' | 'end' = 'intro';
  sel = -1;
  private down: { x: number; y: number; i: number; side: 'P' | 'E' | ''; spell: number; t: number; long: boolean } | null = null;
  private resolver: ((a: Action) => void) | null = null;
  private banners: Banner[] = [];
  private waits: { t: number; r: () => void }[] = [];
  private conds: { c: () => boolean; r: () => void }[] = [];
  private idle = 0;
  private hint: [number, number] | null = null;
  private twinkleT = 0;
  private over: 0 | 1 | 2 = 0;
  private turnNo = 0;
  private freeSpell: boolean;
  private gold = 0;
  private rng: RNG;
  private run: Run;
  private stats = { maxCombo: 0, gems: 0 };
  private pressed: { side: 'P' | 'E'; i: number } | null = null;
  private introK = 0;
  private boardGlow = 0;

  constructor(private setup: BattleSetup, private done: (r: BattleResult) => void) {
    const run = (this.run = setup.run);
    const spec = setup.enemy;
    const sv = setup.save;
    this.rng = new RNG(sv ? sv.rng : setup.seed);
    this.board = new Board(this.rng);
    const cls = CLASSES[run.cls];
    this.P = new Fighter('Ty', cls.name, run.maxHp, run.spells.map((s) => ({ ...s })), cls.look, true, run.hp);
    this.E = new Fighter(spec.name, spec.title, spec.hp, spec.spells, spec.look, false);
    this.E.skull = spec.skull;
    this.E.pow = spec.pow;
    this.E.vampiric = spec.traits.includes('vampiric');
    this.P.skull = BAL.playerSkull;
    if (has(run, 'skullring')) this.P.skull += 1;
    if (has(run, 'lens')) this.P.maxMana = this.P.maxMana.map((m) => m + 6);
    if (spec.tier === 'boss') this.E.maxMana = this.E.maxMana.map((m) => m + 6);
    this.cur = this.P;
    this.freeSpell = has(run, 'hourglass');

    const mods = setup.mods;
    const w = this.board.weights;
    if (mods.includes('gold')) w[COIN] *= 3;
    if (mods.includes('arcane')) {
      w[SKULL] *= 0.4;
      for (let c = 0; c < 4; c++) w[c] *= 1.2;
    }
    if (has(run, 'luckycoin')) w[COIN] *= 1.6;
    if (mods.includes('ice')) this.board.iceChance = 0.02;

    if (sv) {
      this.board.load(sv.board);
      const apply = (f: Fighter, s: BattleSave['f'][number]) => {
        f.hp = f.hpShown = f.hpVis = f.hpGhost = s.hp;
        f.mana = [...s.mana];
        f.manaVis = [...s.mana];
        f.shield = s.shield;
        f.poison = { dmg: s.poison[0], turns: s.poison[1] };
        f.stun = s.stun;
        f.str = { amt: s.str[0], turns: s.str[1] };
      };
      apply(this.P, sv.f[0]);
      apply(this.E, sv.f[1]);
      this.cur = sv.turn === 0 ? this.P : this.E;
      this.turnNo = sv.turnNo;
      this.gold = sv.gold;
      this.freeSpell = sv.freeSpell;
      this.P.caps = sv.caps ?? 0;
    } else {
      this.board.fillFresh();
      const P = this.P, E = this.E;
      const start = (f: Fighter, c: number, n: number) => (f.mana[c] = f.manaVis[c] = Math.min(f.maxMana[c], f.mana[c] + n));
      if (has(run, 'emberheart')) start(P, FIRE, 6);
      if (has(run, 'tidestone')) start(P, 1, 6);
      if (has(run, 'rootcharm')) start(P, EARTH, 6);
      if (has(run, 'stormfeather')) start(P, AIR, 6);
      if (has(run, 'aegis')) P.shield = 8;
      for (let c = 0; c < 4; c++) start(E, c, spec.startMana);
      E.shield = spec.shield;
      if (mods.includes('ice')) for (const i of this.rng.shuffle([...Array(64).keys()]).slice(0, 7)) this.board.g[i]!.ice = true;
      if (mods.includes('cataclysm')) for (const i of this.rng.shuffle([...Array(64).keys()]).slice(0, 4)) this.board.g[i]!.sp = BOMB;
      // gems rain in from above
      for (const g of this.board.g) if (g) g.py -= 9 + g.px * 0.35 + Math.random() * 0.4;
    }
    app.bg.setTheme(...THEMES[spec.elem]);
    preloadLook(this.P.look);
    preloadLook(this.E.look);
    this.resize();
    this.main();
  }

  // ---------- timing helpers ----------
  private wait(s: number) {
    return new Promise<void>((r) => this.waits.push({ t: s, r }));
  }
  private until(c: () => boolean) {
    return new Promise<void>((r) => this.conds.push({ c, r }));
  }
  private settle() {
    return this.until(() => this.board.settled() && !this.fx.pending);
  }

  // ---------- layout ----------
  resize() {
    const W = app.W, H = app.H, s = app.safe;
    const top = s.t + 8, bot = H - s.b - 10, left = s.l + 10, right = W - s.r - 10;
    const nP = Math.max(1, this.P.spells.length), nE = this.E.spells.length;
    void right;
    const wideBs = Math.min(bot - top - 10, W - 2 * 270, W * 0.52);
    let L: Lay;
    if (W / H > 1.1 && wideBs >= 300) {
      const bs = Math.floor(wideBs / 8) * 8, cell = bs / 8;
      const bx = Math.round((W - bs) / 2), by = Math.round(top + (bot - top - bs) / 2);
      const pw = Math.min(340, bx - left - 28);
      const mk = (x0: number, n: number, player: boolean): Side => {
        const r = clamp(pw * 0.22, 40, 70);
        const cx = x0 + pw / 2;
        const por = { x: cx, y: by + r + 14, r };
        const nameY = por.y + r + 30;
        const hp = { x: x0, y: nameY + 44, w: pw, h: 18 };
        const mana = [0, 1, 2, 3].map((k) => ({ x: x0, y: hp.y + 34 + k * 24, w: pw, h: 14 }));
        const sy = mana[3].y + 38;
        const sh = player ? 58 : 50;
        const spells = Array.from({ length: n }, (_, k) => ({ x: x0, y: sy + k * (sh + 10), w: pw, h: sh }));
        return {
          por, name: { x: cx, y: nameY, align: 'center', size: 26 }, hp, mana,
          status: { x: x0, y: hp.y - 16, dir: 1 }, spells, chip: false,
        };
      };
      const P = mk(bx - 28 - pw, nP, true), E = mk(bx + bs + 28, nE, false);
      L = { wide: true, bx, by, bs, cell, P, E, gold: { x: P.hp.x + pw, y: P.hp.y - 16 } };
    } else {
      L = this.tallLayout(0);
      const slack = L.by - (L.E.spells.length ? L.E.spells[0].y + 34 + 8 : L.E.por.y + L.E.por.r + 12);
      if (slack > 24) L = this.tallLayout(Math.min(1, (slack - 12) / 70));
    }
    this.L = L;
    gemArt.ensure(L.cell, app.dpr);
  }

  private tallLayout(grow: number): Lay {
    const W = app.W, H = app.H, s = app.safe;
    const top = s.t + 8, bot = H - s.b - 10, left = s.l + 10, right = W - s.r - 10;
    const nP = Math.max(1, this.P.spells.length), nE = this.E.spells.length;
    {
      const er = clamp(W * 0.115, 32, 50) + grow * 12;
      const Epor = { x: left + er + 4, y: top + er + 4, r: er };
      const tx = Epor.x + er + 14, tw = right - 46 - tx;
      const ew = (tw - 3 * 8) / 4;
      const E: Side = {
        por: Epor, name: { x: tx, y: top + 12, align: 'left', size: 19 },
        hp: { x: tx, y: top + 44, w: tw, h: 14 },
        mana: [0, 1, 2, 3].map((k) => ({ x: tx + k * (ew + 8), y: top + 66, w: ew, h: 11 })),
        status: { x: tx, y: top + 88, dir: 1 }, spells: [], chip: true,
      };
      const chipY = Math.max(Epor.y + er + 14, top + 102) + grow * 6;
      const cw = (right - left - (nE - 1) * 6) / Math.max(1, nE);
      E.spells = Array.from({ length: nE }, (_, k) => ({ x: left + k * (cw + 6), y: chipY, w: cw, h: 34 }));
      const enemyBottom = nE ? chipY + 34 + 8 : Epor.y + er + 12;
      const rows = Math.ceil(nP / 2);
      const sh = (H < 700 ? 48 : 54) + grow * 8;
      const spTop = bot - (rows * sh + (rows - 1) * 8);
      const pr = clamp(W * 0.085, 26, 36) + grow * 8;
      const prowTop = spTop - 12 - (2 * pr + 8);
      const Ppor = { x: left + pr + 3, y: prowTop + pr + 4, r: pr };
      const ptx = Ppor.x + pr + 12, ptw = right - ptx;
      const pw4 = (ptw - 3 * 8) / 4;
      const colW = (right - left - 8) / 2;
      const P: Side = {
        por: Ppor, name: { x: ptx, y: prowTop + 12, align: 'left', size: 17 },
        hp: { x: ptx, y: prowTop + 24, w: ptw, h: 13 },
        mana: [0, 1, 2, 3].map((k) => ({ x: ptx + k * (pw4 + 8), y: prowTop + 46, w: pw4, h: 13 })),
        status: { x: right - 66, y: prowTop + 12, dir: -1 },
        spells: Array.from({ length: nP }, (_, k) => ({ x: left + (k % 2) * (colW + 8), y: spTop + Math.floor(k / 2) * (sh + 8), w: colW, h: sh })),
        chip: false,
      };
      const avail = prowTop - 12 - enemyBottom;
      const bs = Math.floor(Math.min(W - 12, avail) / 8) * 8, cell = bs / 8;
      return { wide: false, bx: Math.round((W - bs) / 2), by: Math.round(enemyBottom + (avail - bs) / 2), bs, cell, P, E, gold: { x: right, y: prowTop + 12 } };
    }
  }

  private cellXY(i: number): [number, number] {
    const L = this.L;
    return [L.bx + ((i % N) + 0.5) * L.cell, L.by + (((i / N) | 0) + 0.5) * L.cell];
  }
  private gemXY(g: Gem): [number, number] {
    const L = this.L;
    return [L.bx + (g.px + 0.5) * L.cell, L.by + (g.py + 0.5) * L.cell];
  }
  private side(f: Fighter) {
    return f === this.P ? this.L.P : this.L.E;
  }
  private other(f: Fighter) {
    return f === this.P ? this.E : this.P;
  }
  private manaXY(f: Fighter, c: number): [number, number] {
    const r = this.side(f).mana[c];
    const is = r.h + 8;
    return [r.x + is / 2, r.y + r.h / 2];
  }
  private porXY(f: Fighter): [number, number] {
    const p = this.side(f).por;
    return [p.x, p.y];
  }

  // ---------- game flow ----------
  private async main() {
    await this.intro();
    while (!this.over) {
      this.save();
      const extra = await this.turn(this.cur);
      if (this.over) break;
      if (extra) {
        this.banner('Jeszcze raz!', '', this.cur === this.P ? '#ffd76a' : '#ff6a6a', 30, 1.1);
        sfx.extra();
        if (this.cur === this.P && has(this.run, 'warhorn')) {
          this.hurt(this.E, 3, 0.3);
          this.fx.orb(...this.porXY(this.P), ...this.porXY(this.E), '#ffb04a', 0.3, null, 14);
        }
        await this.wait(0.5);
        if (this.over) break;
      } else {
        this.cur = this.other(this.cur);
      }
    }
    await this.finish();
  }

  private async intro() {
    this.phase = 'intro';
    const spec = this.setup.enemy;
    this.introK = 0;
    if (!this.setup.save) {
      await this.wait(0.15);
      const tier = spec.tier === 'boss' ? 'SZEF' : spec.tier === 'elite' ? 'GRUBA RYBA' : '';
      const traits = spec.traits.map((t) => TRAIT_DESC[t]).join(', ');
      this.banner(spec.name, `${tier ? tier + ' · ' : ''}${spec.title}${traits ? ` — ${traits}` : ''}`, ELEM_COLOR[spec.elem], 38, 2.1);
      sfx.cast(spec.elem);
      await this.settle();
      await this.wait(0.4);
      for (const m of this.setup.mods) {
        this.banner(MODS[m].name, MODS[m].desc, '#c9a6ff', 26, 2.2);
        await this.wait(1.4);
      }
    } else {
      await this.wait(0.3);
    }
  }

  private save() {
    const f = (x: Fighter) => ({
      hp: x.hp, mana: [...x.mana], shield: x.shield, poison: [x.poison.dmg, x.poison.turns] as [number, number],
      stun: x.stun, str: [x.str.amt, x.str.turns] as [number, number],
    });
    this.setup.onSave({
      turn: this.cur === this.P ? 0 : 1, board: this.board.dump(), f: [f(this.P), f(this.E)],
      rng: this.rng.s, turnNo: this.turnNo, gold: this.gold, freeSpell: this.freeSpell, caps: this.P.caps,
    });
  }

  private async turn(f: Fighter): Promise<boolean> {
    this.turnNo++;
    this.phase = 'busy';
    if (this.turnNo >= BAL.quietAt && (this.turnNo - BAL.quietAt) % BAL.quietStep === 0) {
      const m = quietMult(this.turnNo);
      if (m === 2) this.banner('Cisza nocna!', 'Sąsiad dzwoni po straż miejską. Kończcie to: czaszki biją podwójnie.', '#ff8a5a', 28, 2.4);
      else this.banner('Straż miejska już jedzie', `czaszki biją ×${m}`, '#ff8a5a', 26, 1.8);
      sfx.bad();
      await this.wait(m === 2 ? 1.6 : 1.1);
    }
    if (this.setup.mods.includes('storm') && this.turnNo % 4 === 0) {
      await this.stormStrike(f);
      if (this.over) return false;
    }
    if (f.poison.turns > 0) {
      f.poison.turns--;
      const [x, y] = this.porXY(f);
      this.fx.motes(x, y, '#5dff7a', 14, this.side(f).por.r, 50);
      this.hurt(f, f.poison.dmg, 0, '#7dff9a');
      if (!f.poison.turns) f.poison.dmg = 0;
      await this.wait(0.55);
      if (this.over) return false;
    }
    if (f.stun > 0) {
      f.stun--;
      this.banner(f === this.P ? 'Zamroczyło cię' : 'Wroga zamroczyło', 'tura przepada', '#ffe27a', 26, 1.2);
      await this.wait(1.1);
      this.tickStr(f);
      return false;
    }
    const extra = f === this.P ? await this.playerTurn() : await this.enemyTurn();
    this.tickStr(f);
    return extra;
  }

  private tickStr(f: Fighter) {
    if (f.str.turns > 0 && --f.str.turns === 0) f.str.amt = 0;
  }

  private async playerTurn(): Promise<boolean> {
    for (;;) {
      this.phase = 'input';
      this.idle = 0;
      this.hint = null;
      const a = await new Promise<Action>((res) => (this.resolver = res));
      this.resolver = null;
      this.phase = 'busy';
      this.sel = -1;
      this.hint = null;
      if (a.k === 'ult') {
        await this.ultimate();
        if (this.over) return false;
        continue;
      }
      if (a.k === 'spell') {
        const inst = this.P.spells[a.i];
        const def = SPELLS[inst.id];
        await this.cast(this.P, inst);
        if (this.over) return false;
        if (def.quick) continue;
        if (this.freeSpell) {
          this.freeSpell = false;
          this.banner('Zegarek z komunii', 'czar nie kończy tury', '#ffe27a', 22, 1);
          continue;
        }
        return false;
      }
      await this.animSwap(a.a, a.b);
      return this.resolve(this.P, [a.a, a.b]);
    }
  }

  private async enemyTurn(): Promise<boolean> {
    await this.wait(0.55);
    for (let k = 0; k < 3; k++) {
      const s = chooseSpell(this.E, this.P, this.board, this.rng);
      if (!s) break;
      await this.cast(this.E, s);
      if (this.over) return false;
      if (!SPELLS[s.id].quick) return false;
      await this.wait(0.3);
    }
    const mv = chooseMove(this.board, this.E, this.P, this.rng, this.setup.enemy.skill);
    if (!mv) {
      await this.reshuffle();
      return false;
    }
    this.sel = mv[0];
    await this.wait(0.28);
    this.sel = mv[1];
    await this.wait(0.16);
    this.sel = -1;
    await this.animSwap(mv[0], mv[1]);
    return this.resolve(this.E, [mv[0], mv[1]]);
  }

  private async finish() {
    this.phase = 'end';
    hideTip();
    await Promise.race([this.settle(), this.wait(2)]);
    const won = this.over === 1;
    const loser = won ? this.E : this.P;
    const [x, y] = this.porXY(loser);
    const r = this.side(loser).por.r;
    const col = loser.look.aura;
    for (let k = 0; k < 4; k++) {
      this.fx.after(k * 0.18, () => {
        this.fx.shards(x + (Math.random() - 0.5) * r, y + (Math.random() - 0.5) * r, col, 14, 380, 7);
        this.fx.motes(x, y, col, 16, r * 1.4, 90, 1.6);
        this.fx.ring(x, y, col, r, r * 2.6, 0.7, 6);
        this.fx.shake(10);
      });
    }
    this.fx.flash(won ? '#fff2c0' : '#ff2030', 0.8);
    if (won) sfx.win();
    else sfx.lose();
    buzz(won ? 60 : 200);
    const dying = { v: 0 };
    const anim = () => {
      dying.v = Math.min(1, dying.v + 0.02);
      loser.dead = dying.v;
      if (dying.v < 1) requestAnimationFrame(anim);
    };
    anim();
    if (won) {
      this.banner('Pozamiatane!', this.gold ? `+${this.gold} zł z monet` : '', '#ffd76a', 48, 2.4);
      for (let k = 0; k < 20; k++) {
        const L = this.L;
        this.fx.after(0.3 + k * 0.04, () => this.fx.twinkle(L.bx + Math.random() * L.bs, L.by + Math.random() * L.bs, 18 + Math.random() * 20, 0.8));
      }
    } else {
      this.banner('Leżysz', 'i już nie wstaniesz', '#ff5468', 48, 2.4);
    }
    await this.wait(2.3);
    this.done({ won, gold: this.gold, hp: this.P.hp, maxCombo: this.stats.maxCombo, turns: this.turnNo, gems: this.stats.gems });
  }

  // ---------- board resolution ----------
  private async resolve(actor: Fighter, prefer: number[] = []): Promise<boolean> {
    let extra = false, level = 0;
    for (;;) {
      const groups = this.board.groups();
      if (!groups.length) break;
      level++;
      const plan = this.board.plan(groups, prefer);
      if (plan.maxLen >= 4) extra = true;
      await this.clearCells(actor, plan.clear, plan.births, level, plan.maxLen);
      prefer = [];
      if (this.over) break;
    }
    if (actor === this.P) this.stats.maxCombo = Math.max(this.stats.maxCombo, level);
    if (!this.over && !this.board.hasMoves()) await this.reshuffle();
    return extra;
  }

  private async clearCells(actor: Fighter, clear: Set<number>, births: Birth[], level: number, maxLen = 3) {
    const b = this.board;
    for (const i of clear) if (!b.g[i]) clear.delete(i);
    const protect = new Set(births.map((x) => x.i));
    const exps = b.expand(clear, protect);
    for (const i of clear) {
      const g = b.g[i];
      if (g) g.flashing = true;
    }
    sfx.match(level);
    await this.wait(0.17);

    for (const e of exps) this.explosionFx(e);
    if (exps.length) {
      sfx.explode();
      this.fx.shake(6 + 3 * exps.length);
      this.fx.stop(0.06);
      buzz(30);
    }
    const counts = [0, 0, 0, 0, 0, 0, 0];
    const pos: [number, number, number][] = [];
    for (const i of clear) {
      const g = b.g[i];
      if (!g) continue;
      counts[g.t]++;
      const [x, y] = this.gemXY(g);
      pos.push([x, y, g.t]);
      this.shatter(x, y, g.t);
      b.g[i] = null;
    }
    for (const bi of births) {
      const g = b.g[bi.i];
      if (!g) continue;
      g.t = bi.t;
      g.sp = bi.sp;
      g.flashing = false;
      g.flash = 1;
      g.birth = 1;
      const [x, y] = this.gemXY(g);
      const col = GEM_PAL[g.t].glow;
      this.fx.ring(x, y, col, this.L.cell * 0.2, this.L.cell * 1.3, 0.5, 5);
      this.fx.glow(x, y, col, this.L.cell * 0.6, 0.5, this.L.cell * 1.4);
      sfx.birth();
    }
    // ice shatters when a neighbouring gem breaks
    for (const i of clear) {
      const x = i % N, y = (i / N) | 0;
      for (const j of [x > 0 ? i - 1 : -1, x < N - 1 ? i + 1 : -1, y > 0 ? i - N : -1, y < N - 1 ? i + N : -1]) {
        const g = j >= 0 ? b.g[j] : null;
        if (!g || !g.ice) continue;
        g.ice = false;
        const [gx, gy] = this.gemXY(g);
        this.fx.shards(gx, gy, '#cfefff', 6, this.L.cell * 5, this.L.cell * 0.1);
        this.fx.ring(gx, gy, '#e6f7ff', this.L.cell * 0.3, this.L.cell * 0.8, 0.35, 3);
      }
    }
    this.stats.gems += actor === this.P ? pos.length : 0;
    this.collect(actor, counts, pos, maxLen, exps.length);
    if (level >= 2) this.combo(level);
    await this.wait(0.06);
    b.fall();
    await this.until(() => b.settled());
  }

  private collect(actor: Fighter, counts: number[], pos: [number, number, number][], maxLen: number, nExp: number) {
    const foe = this.other(actor);
    const isP = actor === this.P;
    const run = this.run;
    const add = (f: Fighter, c: number, n: number) => (f.mana[c] = Math.min(f.maxMana[c], f.mana[c] + n));
    const cellSz = this.L.cell;
    for (const [x, y, t] of pos) {
      if (t < 4) {
        const [ex, ey] = this.manaXY(actor, t);
        this.fx.orb(x, y, ex, ey, GEM_PAL[t].glow, 0.45 + Math.random() * 0.3, () => {
          actor.manaPulse[t] = 1;
          sfx.tick(t);
        }, cellSz * 0.2);
      }
    }
    for (let c = 0; c < 4; c++) if (counts[c]) add(actor, c, counts[c]);
    if (isP && run.cls === 'pyro' && counts[FIRE]) add(actor, FIRE, 2);
    if (isP && run.cls === 'storm' && maxLen >= 4) add(actor, AIR, 3);
    if (isP && has(run, 'prismeye') && maxLen >= 4) for (let c = 0; c < 4; c++) add(actor, c, 2);
    if (isP && run.cls === 'druid' && counts[EARTH]) this.heal(actor, 1, 0.5);

    if (counts[SKULL]) {
      let dmg = counts[SKULL] * (actor.skull + actor.str.amt);
      if (this.setup.mods.includes('bloodmoon')) dmg *= 2;
      dmg *= quietMult(this.turnNo);
      const [tx, ty] = this.porXY(foe);
      let first = true;
      for (const [x, y, t] of pos) {
        if (t !== SKULL) continue;
        this.fx.orb(x, y, tx, ty, '#ff3b30', 0.42, first ? null : () => this.fx.shards(tx, ty, '#e8dcc4', 4, 200, 4), cellSz * 0.28, 0.2);
        first = false;
      }
      const dealt = this.hurt(foe, dmg, 0.42);
      if (isP && has(run, 'chalice')) this.heal(actor, counts[SKULL], 0.5);
      if (!isP && actor.vampiric && dealt) this.heal(actor, Math.ceil(dealt / 2), 0.6);
      if (!isP && dealt && has(run, 'thorns')) this.hurt(actor, 2, 0.6, '#b3ff8a');
    }
    if (counts[COIN]) {
      if (isP) {
        const g = counts[COIN] * (has(run, 'goldtooth') ? 2 : 1);
        this.gold += g;
        const gx = this.L.gold.x - 30, gy = this.L.gold.y;
        for (const [x, y, t] of pos) if (t === COIN) this.fx.orb(x, y, gx, gy, '#e4ecff', 0.5, () => sfx.coin(), cellSz * 0.2);
        this.fx.text(gx - 10, gy + 18, `+${g} zł`, '#eef3f8', 16, 0.9, 30);
      } else {
        const [tx, ty] = this.porXY(actor);
        for (const [x, y, t] of pos) if (t === COIN) this.fx.orb(x, y, tx, ty, '#e4ecff', 0.5, null, cellSz * 0.18);
      }
    }
    if (counts[CAP]) {
      const [tx, ty] = this.porXY(actor);
      if (isP) {
        const before = actor.caps;
        actor.caps = Math.min(BAL.capsNeeded, actor.caps + counts[CAP]);
        const ready = before < BAL.capsNeeded && actor.caps >= BAL.capsNeeded;
        let k = 0;
        for (const [x, y, t] of pos)
          if (t === CAP)
            this.fx.orb(x, y, tx, ty, '#d86aff', 0.5 + k++ * 0.05, () => {
              sfx.cap();
              actor.flash = 0.6;
              actor.flashColor = '#d86aff';
            }, cellSz * 0.22);
        if (ready)
          this.fx.after(0.7, () => {
            this.banner('Supermoc gotowa!', 'dotknij portretu', '#d86aff', 26, 1.3);
            sfx.extra();
          });
      } else {
        for (const [x, y, t] of pos) if (t === CAP) this.fx.orb(x, y, tx, ty, '#d86aff', 0.5, null, cellSz * 0.18);
      }
    }
    if (isP && nExp && has(run, 'runeflame')) this.hurt(foe, 3 * nExp, 0.4);
  }

  private async ultimate() {
    const u = ULTS[this.run.cls];
    const P = this.P;
    P.caps = 0;
    const [x, y] = this.porXY(P);
    const r = this.side(P).por.r;
    for (let k = 0; k < 3; k++) this.fx.after(k * 0.12, () => this.fx.ring(x, y, '#d86aff', r, r * (2.4 + k), 0.7, 7));
    this.fx.motes(x, y, '#f0b8ff', 30, r * 2, 120, 1.4);
    this.fx.flash('#d86aff', 0.55);
    this.fx.shake(8);
    sfx.ult();
    P.flash = 1;
    P.flashColor = '#d86aff';
    this.banner(u.name, 'SUPERMOC', '#e08aff', 36, 1.5);
    await this.wait(0.7);
    await u.cast(this.ctxFor(P));
    await this.settle();
  }

  private shatter(x: number, y: number, t: number) {
    const c = this.L.cell;
    const p = GEM_PAL[t];
    this.fx.shards(x, y, t === SKULL ? '#e8dcc4' : p.base, 7, c * 7, c * 0.13);
    this.fx.glow(x, y, p.glow, c * 0.45, 0.35, c * 1.1);
    this.fx.sparks(x, y, p.light, 5, c * 6, 0.45);
  }

  private explosionFx(e: Explosion) {
    const [x, y] = this.cellXY(e.i);
    const c = this.L.cell;
    const g = this.board.g[e.i];
    const col = g ? GEM_PAL[g.t].glow : '#ffffff';
    if (e.sp === BOMB) {
      this.fx.ring(x, y, '#ffffff', c * 0.3, c * 2.2, 0.45, 8);
      this.fx.ring(x, y, col, c * 0.5, c * 3, 0.65, 5);
      this.fx.glow(x, y, col, c * 1.2, 0.4, c * 2.6);
      this.fx.sparks(x, y, '#fff2c0', 18, c * 12, 0.6);
    } else if (e.sp === NOVA) {
      const L = this.L;
      this.fx.beam(L.bx + L.bs / 2, y, L.bs + c, true, col, c * 0.55, 0.5);
      this.fx.beam(x, L.by + L.bs / 2, L.bs + c, false, col, c * 0.55, 0.5);
      this.fx.glow(x, y, '#ffffff', c, 0.4, c * 2.5);
      this.fx.flash(col, 0.35);
    }
  }

  private combo(level: number) {
    const L = this.L;
    const words = ['', '', 'No proszę', 'Ale jazda', 'Jak w totka', 'Grubo', 'Kosmos'];
    const w = words[Math.min(level, words.length - 1)];
    this.banner(`${w} ×${level}`, '', mixHex('#ffd76a', '#ff5ad2', Math.min(1, (level - 2) / 4)), 26 + Math.min(level, 7) * 3, 0.9);
    if (level >= 4) this.fx.flash('#ffe0a0', 0.25);
    this.fx.twinkle(L.bx + L.bs * 0.2, L.by + L.bs * 0.4, 30);
    this.fx.twinkle(L.bx + L.bs * 0.8, L.by + L.bs * 0.6, 30);
  }

  private async reshuffle() {
    const b = this.board;
    this.banner('Pat', 'tasujemy od nowa', '#c9a6ff', 24, 1.1);
    await this.wait(0.4);
    const gems = b.g.filter((g): g is Gem => !!g);
    for (let tries = 0; tries < 60; tries++) {
      this.rng.shuffle(gems);
      gems.forEach((g, i) => (b.g[i] = g));
      if (!b.groups().length && b.hasMoves()) break;
      if (tries === 59) {
        b.fillFresh();
        return;
      }
    }
    b.g.forEach((g, i) => {
      if (!g) return;
      g.tw = { fx: g.px, fy: g.py, tx: i % N, ty: (i / N) | 0, t: 0, d: 0.55 + Math.random() * 0.2, arc: 1.2 };
    });
    sfx.swap();
    await this.until(() => b.settled());
  }

  private async stormStrike(f: Fighter) {
    const cells = this.rng.shuffle(this.board.g.map((_, i) => i)).slice(0, 3);
    for (const i of cells) {
      const [x, y] = this.cellXY(i);
      this.fx.bolt(x + (Math.random() - 0.5) * 60, 0, x, y, '#b8d8ff', 0.4, 2.5);
    }
    this.fx.flash('#d0e4ff', 0.6);
    sfx.zap();
    await this.wait(0.2);
    await this.clearCells(f, new Set(cells), [], 1);
    await this.resolve(f);
  }

  // ---------- combat ----------
  /** Applies damage immediately; the visual hit lands after `delay`. */
  private hurt(f: Fighter, amount: number, delay = 0, color = '#ff5a5a'): number {
    amount = Math.round(amount);
    if (amount <= 0 || this.over) return 0;
    const absorbed = Math.min(f.shield, amount);
    f.shield -= absorbed;
    const dmg = amount - absorbed;
    f.hp = Math.max(0, f.hp - dmg);
    const hpNow = f.hp;
    if (f.hp <= 0) this.over = f === this.E ? 1 : 2;
    const show = () => {
      const [x, y] = this.porXY(f);
      const r = this.side(f).por.r;
      f.hpShown = Math.min(f.hpShown, hpNow);
      if (dmg > 0) {
        f.hit = 1;
        this.fx.text(x + (Math.random() - 0.5) * r * 0.6, y - r * 0.2, `-${dmg}`, color, clamp(18 + dmg * 1.2, 20, 44), 1.1, 60);
        this.fx.shake(Math.min(14, 3 + dmg * 0.8));
        if (dmg >= 8) this.fx.stop(0.07);
        this.fx.glow(x, y, '#ff3020', r * 0.8, 0.35, r * 2);
        buzz(dmg >= 8 ? 45 : 20);
        sfx.hit(dmg >= 8);
      }
      if (absorbed > 0) {
        this.fx.ring(x, y, '#7cc4ff', r * 1.05, r * 1.5, 0.45, 5);
        this.fx.text(x + r * 0.9, y - r * 0.8, `⛨${absorbed}`, '#9fd4ff', 18, 0.9, 40);
      }
    };
    if (delay) this.fx.after(delay, show);
    else show();
    return dmg;
  }

  private heal(f: Fighter, n: number, delay = 0) {
    const v = Math.min(Math.round(n), f.maxHp - f.hp);
    if (v <= 0) return;
    f.hp += v;
    const show = () => {
      f.hpShown = f.hp;
      const [x, y] = this.porXY(f);
      const r = this.side(f).por.r;
      this.fx.motes(x, y + r * 0.3, '#6dff9a', 12, r * 1.4, 70);
      this.fx.text(x, y - r * 0.4, `+${v}`, '#7dffa8', 22, 1, 50);
      sfx.heal();
    };
    if (delay) this.fx.after(delay, show);
    else show();
  }

  private projectile(from: Fighter, to: Fighter, kind: FxKind): Promise<void> {
    const [sx, sy] = this.porXY(from);
    const [ex, ey] = this.porXY(to);
    const r = this.side(to).por.r;
    return new Promise((res) => {
      if (kind === 'bolt') {
        this.fx.bolt(sx, sy, ex, ey, '#bcd8ff', 0.45, 3);
        this.fx.bolt(sx, sy, ex, ey, '#ffe98a', 0.3, 2);
        this.fx.flash('#dfe8ff', 0.6);
        sfx.zap();
        this.fx.after(0.12, () => {
          this.fx.sparks(ex, ey, '#ffffff', 20, 400, 0.5);
          res();
        });
        return;
      }
      const spec: Record<string, [string, number, number]> = {
        fire: ['#ff6a2a', 0.55, 1.0], ice: ['#9fe3ff', 0.4, 0.6], rock: ['#c89a5a', 0.5, 0.9],
        dark: ['#b86bff', 0.55, 0.8], nature: ['#5dff7a', 0.5, 0.6],
      };
      const [col, dur, size] = spec[kind];
      if (kind === 'fire') sfx.fire();
      const n = kind === 'ice' ? 3 : 1;
      let arrived = 0;
      for (let k = 0; k < n; k++) {
        this.fx.after(k * 0.09, () => {
          const orb = this.fx.orb(sx, sy, ex, ey, col, dur, () => {
            this.fx.ring(ex, ey, col, r * 0.4, r * 1.8, 0.5, 6);
            this.fx.sparks(ex, ey, mixHex(col, '#ffffff', 0.5), 16, 380, 0.6);
            this.fx.glow(ex, ey, col, r, 0.4, r * 2.2);
            if (++arrived === n) res();
          }, r * 0.5 * size, 0.25);
          if (kind === 'fire') {
            // ember trail
            const trail = () => {
              if (orb.life <= 0) return;
              this.fx.motes(orb.x, orb.y, '#ffb04a', 2, 10, 30, 0.5);
              this.fx.after(0.03, trail);
            };
            trail();
          }
        });
      }
    });
  }

  private async cast(f: Fighter, inst: SpellInst) {
    const def = SPELLS[inst.id];
    for (let c = 0; c < 4; c++) f.mana[c] -= def.cost[c];
    if (def.hp) {
      f.hp = Math.max(1, f.hp - def.hp);
      f.hpShown = f.hp;
      const [x, y] = this.porXY(f);
      this.fx.text(x, y, `-${def.hp}`, '#ff5a5a', 22);
    }
    const col = ELEM_COLOR[def.elem];
    f.flash = 1;
    f.flashColor = col;
    const [x, y] = this.porXY(f);
    const r = this.side(f).por.r;
    this.fx.ring(x, y, col, r * 0.9, r * 2.2, 0.6, 4);
    this.fx.motes(x, y, col, 18, r * 2, 80);
    sfx.cast(def.elem);
    this.banner(def.name + (inst.lvl > 1 ? '+' : ''), f === this.E ? this.E.name : '', col, 30, 1.1);
    await this.wait(0.45);
    await def.cast(this.ctxFor(f), inst.lvl);
    await this.settle();
  }

  private ctxFor(me: Fighter): SpellCtx {
    const foe = this.other(me);
    const pow = me.pow;
    const b = this.board;
    const cells = (pred?: (t: number, i: number) => boolean) => b.g.map((g, i) => (g && (!pred || pred(g.t, i)) ? i : -1)).filter((i) => i >= 0);
    return {
      me, foe, board: b, rng: this.rng,
      damage: async (n, kind) => {
        await this.projectile(me, foe, kind);
        this.hurt(foe, n * pow);
        await this.wait(0.3);
      },
      heal: async (n) => {
        this.heal(me, n * pow);
        await this.wait(0.5);
      },
      shield: async (n) => {
        const v = Math.round(n * pow);
        me.shield += v;
        const [x, y] = this.porXY(me);
        const r = this.side(me).por.r;
        this.fx.ring(x, y, '#7cc4ff', r * 0.6, r * 1.5, 0.6, 8);
        this.fx.text(x, y - r, `+${v} ⛨`, '#9fd4ff', 22);
        sfx.shield();
        await this.wait(0.5);
      },
      unshield: async () => {
        if (foe.shield <= 0) return;
        foe.shield = 0;
        const [x, y] = this.porXY(foe);
        const r = this.side(foe).por.r;
        this.fx.ring(x, y, '#9fd4ff', r * 1.4, r * 0.4, 0.4, 6);
        this.fx.text(x, y + r * 0.6, 'Bez kufajki!', '#9fd4ff', 22);
        sfx.hit(true);
        await this.wait(0.35);
      },
      poison: async (d, turns) => {
        await this.projectile(me, foe, 'nature');
        foe.poison = { dmg: Math.max(foe.poison.dmg, Math.round(d * pow)), turns: foe.poison.turns + turns };
        const [x, y] = this.porXY(foe);
        this.fx.text(x, y, 'Zatruty!', '#7dff9a', 22);
        await this.wait(0.4);
      },
      stun: async (turns) => {
        foe.stun += turns;
        const [x, y] = this.porXY(foe);
        this.fx.text(x, y, 'Zamroczony!', '#ffe27a', 22);
        for (let k = 0; k < 5; k++) this.fx.twinkle(x + (Math.random() - 0.5) * 60, y - 30 + (Math.random() - 0.5) * 30, 20);
        await this.wait(0.5);
      },
      strength: async (n, turns) => {
        me.str = { amt: n, turns: turns + 1 };
        const [x, y] = this.porXY(me);
        this.fx.text(x, y, `Czaszki +${n}`, '#ff8a5a', 22);
        this.fx.motes(x, y, '#ff5a3d', 20, 60, 90);
        await this.wait(0.4);
      },
      gain: async (c, n) => {
        me.mana[c] = Math.min(me.maxMana[c], me.mana[c] + n);
        const [x, y] = this.porXY(me);
        for (let k = 0; k < Math.min(n, 8); k++) this.fx.orb(x, y, ...this.manaXY(me, c), GEM_PAL[c].glow, 0.4 + k * 0.05, () => (me.manaPulse[c] = 1), 8);
        await this.wait(0.5);
      },
      drain: async (n, steal, color) => {
        const c = color ?? foe.mana.indexOf(Math.max(...foe.mana));
        const v = Math.min(foe.mana[c], n);
        if (v <= 0) return;
        foe.mana[c] -= v;
        if (steal) me.mana[c] = Math.min(me.maxMana[c], me.mana[c] + v);
        const [sx, sy] = this.manaXY(foe, c);
        const [ex, ey] = steal ? this.manaXY(me, c) : [sx, sy - 40];
        for (let k = 0; k < Math.min(v, 8); k++) this.fx.orb(sx, sy, ex, ey, GEM_PAL[c].glow, 0.45 + k * 0.05, null, 8);
        this.fx.text(sx, sy - 14, `-${v}`, GEM_PAL[c].light, 16, 0.9, 30);
        await this.wait(0.55);
      },
      destroy: async (list, kind) => {
        const set = new Set(list.filter((i) => i >= 0 && i < 64 && b.g[i]));
        if (!set.size) return;
        const col = kind === 'fire' ? '#ff6a2a' : kind === 'rock' ? '#d6a35a' : '#cfe4ff';
        for (const i of set) {
          const [x, y] = this.cellXY(i);
          if (kind === 'bolt') this.fx.bolt(...this.porXY(me), x, y, col, 0.35, 2);
          else this.fx.glow(x, y, col, this.L.cell * 0.5, 0.4, this.L.cell * 1.3);
        }
        if (kind === 'bolt') sfx.zap();
        else if (kind === 'fire') sfx.fire();
        else sfx.explode();
        this.fx.shake(kind === 'rock' ? 12 : 6);
        await this.wait(0.2);
        await this.clearCells(me, set, [], 1);
        await this.resolve(me);
      },
      convert: async (list, to) => {
        let k = 0;
        for (const i of list) {
          const g = b.g[i];
          if (!g || g.t === to) continue;
          g.delay = k++ * 0.045;
          g.flip = 1;
          g.flipTo = to;
        }
        if (!k) return;
        sfx.cast(to < 4 ? to : 4);
        await this.until(() => b.settled());
        await this.resolve(me);
      },
      special: async (list, sp) => {
        for (const i of list) {
          const g = b.g[i];
          if (!g) continue;
          g.sp = sp;
          g.birth = 1;
          g.flash = 1;
          const [x, y] = this.cellXY(i);
          this.fx.ring(x, y, GEM_PAL[g.t].glow, 4, this.L.cell, 0.5, 5);
        }
        sfx.birth();
        await this.wait(0.5);
      },
      shuffle: () => this.reshuffle(),
      cells,
      pick: (n, pred) => this.rng.shuffle(cells(pred)).slice(0, n),
    };
  }

  // ---------- swaps ----------
  private animSwap(a: number, b: number, back = false): Promise<void> {
    const A = this.board.g[a]!, B = this.board.g[b]!;
    const ax = a % N, ay = (a / N) | 0, bx = b % N, by = (b / N) | 0;
    sfx.swap();
    if (!back) {
      this.board.swap(a, b);
      A.tw = { fx: ax, fy: ay, tx: bx, ty: by, t: 0, d: 0.2, arc: 0 };
      B.tw = { fx: bx, fy: by, tx: ax, ty: ay, t: 0, d: 0.2, arc: 0 };
      return this.until(() => !A.tw && !B.tw);
    }
    A.tw = { fx: ax, fy: ay, tx: bx, ty: by, t: 0, d: 0.16, arc: 0 };
    B.tw = { fx: bx, fy: by, tx: ax, ty: ay, t: 0, d: 0.16, arc: 0 };
    return this.until(() => !A.tw && !B.tw).then(() => {
      sfx.bad();
      A.tw = { fx: bx, fy: by, tx: ax, ty: ay, t: 0, d: 0.18, arc: 0 };
      B.tw = { fx: ax, fy: ay, tx: bx, ty: by, t: 0, d: 0.18, arc: 0 };
      return this.until(() => !A.tw && !B.tw);
    });
  }

  private async trySwap(a: number, b: number) {
    this.sel = -1;
    if (this.phase !== 'input' || !this.board.adjacent(a, b)) return;
    const A = this.board.g[a], B = this.board.g[b];
    if (!A || !B) return;
    if (A.ice || B.ice) {
      sfx.bad();
      const g = A.ice ? A : B;
      const [x, y] = this.gemXY(g);
      this.fx.sparks(x, y, '#cfefff', 8, 150, 0.4);
      return;
    }
    if (this.board.canSwap(a, b)) {
      this.resolver?.({ k: 'swap', a, b });
      return;
    }
    this.phase = 'busy';
    await this.animSwap(a, b, true);
    this.phase = 'input';
  }

  private cellAt(x: number, y: number) {
    const L = this.L;
    if (x < L.bx || y < L.by || x >= L.bx + L.bs || y >= L.by + L.bs) return -1;
    return Math.floor((y - L.by) / L.cell) * N + Math.floor((x - L.bx) / L.cell);
  }

  private spellAt(x: number, y: number): { side: 'P' | 'E'; i: number } | null {
    for (const [side, S] of [['P', this.L.P], ['E', this.L.E]] as const) {
      const i = S.spells.findIndex((r) => inRect(r, x, y));
      if (i >= 0) return { side, i };
    }
    return null;
  }

  private tip(side: 'P' | 'E', i: number) {
    const f = side === 'P' ? this.P : this.E;
    const inst = f.spells[i];
    if (!inst) return;
    const d = SPELLS[inst.id];
    const r = this.side(f).spells[i];
    showTip(
      `<strong style="color:${ELEM_COLOR[d.elem]}">${esc(d.name)}${inst.lvl > 1 ? '+' : ''}</strong>${d.quick ? ' <span class="tag">szybki</span>' : ''}
       <div class="spell-cost">${costHTML(d.cost, d.hp)}</div><p>${esc(d.desc(inst.lvl))}</p>`,
      r, side === 'E' && !this.L.wide ? true : false,
    );
  }

  pointer(e: PEvent) {
    if (e.type === 'down') {
      hideTip();
      const por = this.L.P.por;
      if (Math.hypot(e.x - por.x, e.y - por.y) < por.r * 1.2) {
        const u = ULTS[this.run.cls];
        if (this.phase === 'input' && this.P.caps >= BAL.capsNeeded) this.resolver?.({ k: 'ult' });
        else
          showTip(
            `<strong style="color:#e08aff">Supermoc: ${esc(u.name)}</strong><p>${esc(u.desc)}</p><p>Kapsle: <b>${this.P.caps}/${BAL.capsNeeded}</b>. Zbieraj fioletowe kapsle, a gdy pierścień się zapełni, dotknij portretu.</p>`,
            { x: por.x - por.r, y: por.y - por.r, w: por.r * 2, h: por.r * 2 }, false,
          );
        return;
      }
      const sp = this.spellAt(e.x, e.y);
      if (sp) {
        this.pressed = sp;
        this.down = { x: e.x, y: e.y, i: -1, side: sp.side, spell: sp.i, t: this.t, long: false };
        return;
      }
      const i = this.cellAt(e.x, e.y);
      this.down = { x: e.x, y: e.y, i, side: '', spell: -1, t: this.t, long: false };
      if (i < 0 || this.phase !== 'input') {
        this.sel = -1;
        return;
      }
      this.idle = 0;
      if (this.sel >= 0 && this.sel !== i && this.board.adjacent(this.sel, i)) {
        const s = this.sel;
        this.down = null;
        this.trySwap(s, i);
      } else if (this.sel === i) {
        this.sel = -1;
      } else {
        this.sel = i;
        sfx.click();
      }
    } else if (e.type === 'move') {
      const d = this.down;
      if (!d || d.i < 0 || this.phase !== 'input') return;
      const dx = e.x - d.x, dy = e.y - d.y;
      if (Math.hypot(dx, dy) < this.L.cell * 0.32) return;
      const x = d.i % N, y = (d.i / N) | 0;
      let j = -1;
      if (Math.abs(dx) > Math.abs(dy)) j = dx > 0 ? (x < N - 1 ? d.i + 1 : -1) : x > 0 ? d.i - 1 : -1;
      else j = dy > 0 ? (y < N - 1 ? d.i + N : -1) : y > 0 ? d.i - N : -1;
      this.down = null;
      if (j >= 0) this.trySwap(d.i, j);
    } else {
      const d = this.down;
      this.down = null;
      this.pressed = null;
      if (!d || d.spell < 0 || d.long) return;
      const sp = this.spellAt(e.x, e.y);
      if (!sp || sp.side !== d.side || sp.i !== d.spell) return;
      if (sp.side === 'P' && this.phase === 'input' && affordable(this.P, SPELLS[this.P.spells[sp.i].id])) {
        this.resolver?.({ k: 'spell', i: sp.i });
      } else {
        this.tip(sp.side, sp.i);
      }
    }
  }

  // ---------- presentation ----------
  private banner(text: string, sub: string, color: string, size: number, dur: number) {
    this.banners.push({ text, sub, color, t: 0, dur, size });
  }

  update(rdt: number) {
    let dt = rdt;
    if (this.fx.hitstop > 0) {
      this.fx.hitstop -= rdt;
      dt = rdt * 0.08;
    }
    this.t += dt;
    this.introK = Math.min(1, this.introK + dt * 1.5);
    this.fx.update(dt);
    for (let i = this.waits.length - 1; i >= 0; i--) {
      const w = this.waits[i];
      w.t -= dt;
      if (w.t <= 0) {
        this.waits.splice(i, 1);
        w.r();
      }
    }

    // gems
    const b = this.board;
    for (let i = 0; i < 64; i++) {
      const g = b.g[i];
      if (!g) continue;
      const gx = i % N, gy = (i / N) | 0;
      if (g.tw) {
        const tw = g.tw;
        tw.t += dt;
        const p = easeInOut(Math.min(1, tw.t / tw.d));
        g.px = tw.fx + (tw.tx - tw.fx) * p;
        g.py = tw.fy + (tw.ty - tw.fy) * p - Math.sin(p * Math.PI) * tw.arc;
        if (tw.t >= tw.d) {
          g.tw = null;
          g.px = tw.tx;
          g.py = tw.ty;
        }
      } else {
        g.px = gx;
        if (g.py < gy) {
          g.vy = Math.min(g.vy + 70 * dt, 26);
          g.py += g.vy * dt;
          if (g.py >= gy) {
            g.py = gy;
            if (g.vy > 4) g.land = 1;
            g.vy = 0;
          }
        } else if (g.py > gy) g.py = gy;
      }
      if (g.flashing) g.flash = Math.min(1, g.flash + dt * 7);
      else g.flash = Math.max(0, g.flash - dt * 3);
      g.land = Math.max(0, g.land - dt * 5);
      g.birth = Math.max(0, g.birth - dt * 2);
      if (g.flip > 0) {
        if (g.delay > 0) g.delay -= dt;
        else {
          const before = g.flip;
          g.flip = Math.max(0, g.flip - dt * 3.2);
          if (before > 0.5 && g.flip <= 0.5) {
            g.t = g.flipTo;
            const [x, y] = this.gemXY(g);
            this.fx.glow(x, y, GEM_PAL[g.t].glow, this.L.cell * 0.4, 0.3, this.L.cell);
          }
        }
      }
    }
    for (let i = this.conds.length - 1; i >= 0; i--) {
      const c = this.conds[i];
      if (c.c()) {
        this.conds.splice(i, 1);
        c.r();
      }
    }

    // fighters
    for (const f of [this.P, this.E]) {
      f.hpVis += (f.hpShown - f.hpVis) * Math.min(1, dt * 10);
      if (f.hpGhost > f.hpVis) f.hpGhost = Math.max(f.hpVis, f.hpGhost - f.maxHp * dt * 0.35);
      else f.hpGhost = f.hpVis;
      for (let c = 0; c < 4; c++) {
        f.manaVis[c] += (f.mana[c] - f.manaVis[c]) * Math.min(1, dt * 6);
        f.manaPulse[c] = Math.max(0, f.manaPulse[c] - dt * 3);
      }
      f.hit = Math.max(0, f.hit - dt * 3);
      f.flash = Math.max(0, f.flash - dt * 2);
      f.shieldVis += ((f.shield > 0 ? 1 : 0) - f.shieldVis) * Math.min(1, dt * 6);
      f.active += ((this.cur === f && this.phase !== 'end' ? 1 : 0) - f.active) * Math.min(1, dt * 5);
    }
    this.boardGlow += ((this.cur === this.P ? 1 : 0) - this.boardGlow) * Math.min(1, dt * 4);

    for (const bn of this.banners) bn.t += rdt;
    this.banners = this.banners.filter((bn) => bn.t < bn.dur);

    if (this.down && this.down.spell >= 0 && !this.down.long && this.t - this.down.t > 0.45) {
      this.down.long = true;
      this.tip(this.down.side as 'P' | 'E', this.down.spell);
    }

    if (this.phase === 'input') {
      this.idle += dt;
      if (this.idle > 7 && !this.hint) {
        const mv = this.board.moves();
        if (mv.length) this.hint = mv[Math.floor(Math.random() * mv.length)];
      }
    }
    this.twinkleT -= dt;
    if (this.twinkleT <= 0 && gemArt.px) {
      this.twinkleT = 0.18 + Math.random() * 0.25;
      const i = Math.floor(Math.random() * 64);
      const g = b.g[i];
      if (g && g.t < 4 && !g.tw) {
        const [x, y] = this.gemXY(g);
        const c = this.L.cell;
        this.fx.twinkle(x - c * 0.18 + Math.random() * c * 0.2, y - c * 0.22 + Math.random() * c * 0.15, c * 0.32, 0.6);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    const L = this.L;
    ctx.save();
    ctx.translate(this.fx.sx, this.fx.sy);
    this.drawBoard(ctx);
    this.drawSide(ctx, this.E);
    this.drawSide(ctx, this.P);
    this.fx.render(ctx);
    this.drawBanners(ctx);
    ctx.restore();
    this.fx.renderFlash(ctx, app.W, app.H);
    void L;
  }

  private drawBoard(ctx: CanvasRenderingContext2D) {
    const L = this.L, c = L.cell, t = this.t;
    const pad = 6;
    const turnCol = mixHex('#ff4a5a', '#ffcf6a', this.boardGlow);
    // frame
    ctx.save();
    ctx.shadowColor = rgba(turnCol, 0.55 + 0.2 * Math.sin(t * 3));
    ctx.shadowBlur = 26;
    roundRect(ctx, L.bx - pad, L.by - pad, L.bs + pad * 2, L.bs + pad * 2, 14);
    ctx.fillStyle = 'rgba(9,6,18,0.86)';
    ctx.fill();
    ctx.restore();
    const fg = ctx.createLinearGradient(L.bx, L.by - pad, L.bx + L.bs, L.by + L.bs);
    fg.addColorStop(0, '#f6dc9a');
    fg.addColorStop(0.5, '#8a5d24');
    fg.addColorStop(1, '#e8c071');
    roundRect(ctx, L.bx - pad, L.by - pad, L.bs + pad * 2, L.bs + pad * 2, 14);
    ctx.strokeStyle = fg;
    ctx.lineWidth = 2;
    ctx.stroke();
    roundRect(ctx, L.bx - pad + 4, L.by - pad + 4, L.bs + pad * 2 - 8, L.bs + pad * 2 - 8, 10);
    ctx.strokeStyle = rgba(turnCol, 0.35);
    ctx.lineWidth = 1;
    ctx.stroke();
    for (const [x, y] of [[L.bx - pad, L.by - pad], [L.bx + L.bs + pad, L.by - pad], [L.bx - pad, L.by + L.bs + pad], [L.bx + L.bs + pad, L.by + L.bs + pad]]) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#e8c071';
      ctx.fillRect(-5, -5, 10, 10);
      ctx.fillStyle = turnCol;
      ctx.fillRect(-2.5, -2.5, 5, 5);
      ctx.restore();
    }
    // checker
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        if ((x + y) % 2) continue;
        ctx.fillStyle = 'rgba(255,255,255,0.035)';
        ctx.fillRect(L.bx + x * c, L.by + y * c, c, c);
      }
    // whose move
    const label = this.phase === 'end' ? '' : this.cur === this.P ? 'Twój ruch' : 'Ruch tamtego';
    if (label && this.phase !== 'intro') {
      ctx.font = `700 12px ${BODY}`;
      const tw = ctx.measureText(label).width + 20;
      const lx = L.bx + L.bs / 2 - tw / 2, ly = L.by + L.bs + pad - 1;
      roundRect(ctx, lx, ly - 2, tw, 18, 9);
      ctx.fillStyle = mixHex('#3a0a14', '#3a2a08', this.boardGlow);
      ctx.fill();
      ctx.strokeStyle = rgba(turnCol, 0.8);
      ctx.stroke();
      ctx.fillStyle = turnCol;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label.toUpperCase(), lx + tw / 2, ly + 7);
    }

    // gems
    ctx.save();
    ctx.beginPath();
    ctx.rect(L.bx - pad, L.by - 2, L.bs + pad * 2, L.bs + pad + 2);
    ctx.clip();
    const hint = this.hint;
    const pulse = 0.5 + 0.5 * Math.sin(t * 7);
    if (this.sel >= 0) {
      const [x, y] = this.cellXY(this.sel);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5 + pulse * 0.3;
      ctx.drawImage(glow('#fff2c0'), x - c, y - c, c * 2, c * 2);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = rgba('#fff2c0', 0.8);
      ctx.lineWidth = 2;
      roundRect(ctx, x - c / 2 + 2, y - c / 2 + 2, c - 4, c - 4, 8);
      ctx.stroke();
    }
    for (let i = 0; i < 64; i++) {
      const g = this.board.g[i];
      if (!g) continue;
      const [x, y] = this.gemXY(g);
      if (y < L.by - c) continue;
      let sx = 1, sy = 1;
      if (g.flashing) sx = sy = 1 + g.flash * 0.25;
      if (g.land) {
        sx *= 1 + g.land * 0.12;
        sy *= 1 - g.land * 0.14;
      }
      if (g.birth) sx = sy = 1 + Math.sin(g.birth * Math.PI) * 0.35;
      if (i === this.sel || (hint && (hint[0] === i || hint[1] === i))) sx = sy = 1.08 + pulse * 0.06;
      if (g.flip > 0 && g.delay <= 0) sx *= Math.abs(Math.cos((1 - g.flip) * Math.PI));
      if (g.tw && g.tw.arc) sx = sy = 1 + Math.sin((g.tw.t / g.tw.d) * Math.PI) * 0.15;
      const w = c * sx, h = c * sy;
      const oy = g.land ? (c - h) / 2 : 0;
      const col = GEM_PAL[g.t].glow;
      if (g.sp) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.55 + 0.35 * Math.sin(t * 5 + i);
        const s = c * (g.sp === NOVA ? 1.5 : 1.25);
        ctx.drawImage(glow(col), x - s / 2 * 1.2, y - s / 2 * 1.2, s * 1.2, s * 1.2);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.drawImage(gemArt.spr[g.t], x - w / 2, y - h / 2 + oy, w, h);
      if (g.flash > 0) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = g.flash;
        ctx.drawImage(gemArt.wht[g.t], x - w / 2, y - h / 2 + oy, w, h);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
      if (g.sp === BOMB) {
        ctx.globalCompositeOperation = 'lighter';
        for (let k = 0; k < 4; k++) {
          const a = t * 2.4 + (k * TAU) / 4 + i;
          const rr = c * 0.46;
          ctx.drawImage(glow('#fff0b0'), x + Math.cos(a) * rr - 5, y + Math.sin(a) * rr - 5, 10, 10);
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = rgba('#ffe6a0', 0.7);
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 5]);
        ctx.lineDashOffset = -t * 20;
        ctx.beginPath();
        ctx.arc(x, y, c * 0.46, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (g.sp === NOVA) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(t * 0.8);
        const s = c * (0.9 + 0.15 * Math.sin(t * 6));
        ctx.drawImage(star(), -s, -s, s * 2, s * 2);
        ctx.restore();
        ctx.globalCompositeOperation = 'source-over';
      }
      if (g.ice) ctx.drawImage(gemArt.ice, x - c / 2, y - c / 2, c, c);
    }
    ctx.restore();
  }

  private drawSide(ctx: CanvasRenderingContext2D, f: Fighter) {
    const S = this.side(f);
    const t = this.t;
    const { x, y, r } = S.por;
    const intro = f === this.E ? easeBack(Math.min(1, this.introK)) : 1;

    // active ring
    if (f.active > 0.02) {
      ctx.save();
      ctx.globalAlpha = f.active;
      ctx.strokeStyle = f === this.P ? '#ffd76a' : '#ff5a6a';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 8]);
      ctx.lineDashOffset = -t * 30;
      ctx.beginPath();
      ctx.arc(x, y, r * 1.22, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(intro, intro);
    drawPortrait(ctx, f.look, 0, 0, r, t, { hit: f.hit, dead: f.dead, poison: f.poison.turns > 0, flash: f.flash, flashColor: f.flashColor });
    ctx.restore();

    if (f.isPlayer) this.drawCaps(ctx, x, y, r, f);
    if (f.shieldVis > 0.02) {
      ctx.save();
      ctx.globalAlpha = f.shieldVis;
      ctx.globalCompositeOperation = 'lighter';
      ctx.translate(x, y);
      ctx.rotate(t * 0.4);
      const R = r * 1.28;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) ctx.lineTo(Math.cos((k * TAU) / 6) * R, Math.sin((k * TAU) / 6) * R);
      ctx.closePath();
      ctx.strokeStyle = rgba('#7cc4ff', 0.6 + 0.2 * Math.sin(t * 3));
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.fillStyle = rgba('#3e8cff', 0.1);
      ctx.fill();
      ctx.restore();
    }
    if (f.stun > 0) {
      ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 3; k++) {
        const a = t * 3 + (k * TAU) / 3;
        const s = 12;
        ctx.drawImage(star(), x + Math.cos(a) * r * 0.8 - s, y - r * 0.95 + Math.sin(a) * r * 0.2 - s, s * 2, s * 2);
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    // name
    const N_ = S.name;
    ctx.textAlign = N_.align;
    ctx.textBaseline = 'middle';
    ctx.font = `400 ${N_.size}px ${DISPLAY}`;
    ctx.fillStyle = '#f3e7cf';
    const nm = f.isPlayer ? f.title : f.name;
    ctx.fillText(nm, N_.x, N_.y);
    if (this.L.wide) {
      ctx.font = `500 15px ${BODY}`;
      ctx.fillStyle = '#a497bd';
      const sub = f.isPlayer ? `Wyprawa · piętro ${Math.max(1, this.run.visited.length)}` : f.title;
      ctx.fillText(sub, N_.x, N_.y + 22);
    } else if (!f.isPlayer) {
      let fs = 13;
      const room = this.L.E.hp.w + 44;
      ctx.font = `600 ${fs}px ${BODY}`;
      while (fs > 10 && ctx.measureText(f.title).width > room) ctx.font = `600 ${--fs}px ${BODY}`;
      ctx.fillStyle = '#b9aed0';
      ctx.fillText(f.title, N_.x, N_.y + 17);
    }

    this.drawHp(ctx, S.hp, f);
    for (let c = 0; c < 4; c++) this.drawMana(ctx, S.mana[c], f, c);
    this.drawStatus(ctx, S.status, f);
    S.spells.forEach((r, i) => this.drawSpell(ctx, r, f, i, S.chip));

    if (f.isPlayer) {
      const G = this.L.gold;
      ctx.textAlign = 'right';
      ctx.font = `800 15px ${BODY}`;
      ctx.fillStyle = '#eef3f8';
      const txt = `${this.run.gold + this.gold} zł`;
      ctx.fillText(txt, G.x, G.y);
      const w = ctx.measureText(txt).width;
      ctx.drawImage(gemArt.spr[COIN], G.x - w - 22, G.y - 10, 20, 20);
    }
  }

  /** Ten-notch ring of bottle caps; when full the portrait itself becomes the supermove button. */
  private drawCaps(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, f: Fighter) {
    const need = BAL.capsNeeded;
    const full = f.caps >= need;
    const R = r * 1.15;
    const gap = 0.07;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(3.5, r * 0.09);
    for (let k = 0; k < need; k++) {
      const a0 = -Math.PI / 2 + (k * TAU) / need + gap, a1 = -Math.PI / 2 + ((k + 1) * TAU) / need - gap;
      ctx.strokeStyle = k < f.caps ? (full ? mixHex('#d86aff', '#ffffff', 0.25 + 0.25 * Math.sin(this.t * 6)) : '#c050e8') : 'rgba(30,20,40,0.75)';
      ctx.beginPath();
      ctx.arc(x, y, R, a0, a1);
      ctx.stroke();
    }
    if (full) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.45 + 0.3 * Math.sin(this.t * 5);
      ctx.drawImage(glow('#d86aff'), x - r * 2, y - r * 2, r * 4, r * 4);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      const label = 'SUPERMOC';
      ctx.font = `400 ${Math.max(10, r * 0.3)}px ${DISPLAY}`;
      const w = ctx.measureText(label).width + 12;
      roundRect(ctx, x - w / 2, y + r * 0.95, w, r * 0.42, r * 0.2);
      ctx.fillStyle = '#b23ad0';
      ctx.fill();
      ctx.strokeStyle = '#f6f3ea';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x, y + r * 0.95 + r * 0.22);
    }
    ctx.restore();
  }

  private drawHp(ctx: CanvasRenderingContext2D, r: Rect, f: Fighter) {
    roundRect(ctx, r.x, r.y, r.w, r.h, r.h / 2);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.stroke();
    const k = (v: number) => clamp(v / f.maxHp, 0, 1) * r.w;
    if (f.hpGhost > f.hpVis) {
      roundRect(ctx, r.x, r.y, Math.max(r.h, k(f.hpGhost)), r.h, r.h / 2);
      ctx.fillStyle = 'rgba(255,230,210,0.75)';
      ctx.fill();
    }
    if (f.hpVis > 0) {
      roundRect(ctx, r.x, r.y, Math.max(r.h, k(f.hpVis)), r.h, r.h / 2);
      const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
      g.addColorStop(0, '#ff7a86');
      g.addColorStop(0.5, '#e0213d');
      g.addColorStop(1, '#8a0b22');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(r.x + r.h / 2, r.y + 2, Math.max(0, k(f.hpVis) - r.h), 1.5);
    }
    ctx.font = `800 ${Math.max(10, r.h - 2)}px ${BODY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    const txt = `${Math.ceil(f.hpVis)} / ${f.maxHp}`;
    ctx.strokeText(txt, r.x + r.w / 2, r.y + r.h / 2 + 1);
    ctx.fillStyle = '#fff';
    ctx.fillText(txt, r.x + r.w / 2, r.y + r.h / 2 + 1);
    if (f.shield > 0) {
      const sx = r.x + r.w - 2, sy = r.y + r.h / 2;
      ctx.beginPath();
      for (let k2 = 0; k2 < 6; k2++) ctx.lineTo(sx + Math.cos((k2 * TAU) / 6 + Math.PI / 6) * 11, sy + Math.sin((k2 * TAU) / 6 + Math.PI / 6) * 11);
      ctx.closePath();
      ctx.fillStyle = '#1a4f9c';
      ctx.fill();
      ctx.strokeStyle = '#9fd4ff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.font = `800 11px ${BODY}`;
      ctx.fillStyle = '#fff';
      ctx.fillText(`${f.shield}`, sx, sy + 1);
    }
  }

  private drawMana(ctx: CanvasRenderingContext2D, r: Rect, f: Fighter, c: number) {
    const is = r.h + 8;
    const bx = r.x + is + 2, bw = r.w - is - 2;
    const pal = GEM_PAL[c];
    const v = f.manaVis[c], max = f.maxMana[c];
    const pulse = f.manaPulse[c];
    ctx.drawImage(gemArt.spr[c], r.x - pulse * 3, r.y + r.h / 2 - is / 2 - pulse * 3, is + pulse * 6, is + pulse * 6);
    roundRect(ctx, bx, r.y, bw, r.h, r.h / 2);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fill();
    ctx.strokeStyle = rgba(pal.base, 0.25);
    ctx.lineWidth = 1;
    ctx.stroke();
    const fw = clamp(v / max, 0, 1) * bw;
    if (fw > 1) {
      ctx.save();
      roundRect(ctx, bx, r.y, bw, r.h, r.h / 2);
      ctx.clip();
      const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
      g.addColorStop(0, pal.light);
      g.addColorStop(0.45, pal.base);
      g.addColorStop(1, pal.dark);
      ctx.fillStyle = g;
      ctx.fillRect(bx, r.y, fw, r.h);
      if (v >= max - 0.05) {
        const sx = bx + ((this.t * 0.6) % 1.4) * bw - bw * 0.2;
        const sg = ctx.createLinearGradient(sx - 20, 0, sx + 20, 0);
        sg.addColorStop(0, 'rgba(255,255,255,0)');
        sg.addColorStop(0.5, 'rgba(255,255,255,0.6)');
        sg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = sg;
        ctx.fillRect(bx, r.y, bw, r.h);
      }
      ctx.restore();
      if (pulse > 0) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = pulse;
        ctx.drawImage(glow(pal.glow), bx + fw - 16, r.y + r.h / 2 - 16, 32, 32);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    ctx.font = `800 ${Math.max(9, r.h - 1)}px ${BODY}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    const txt = `${Math.round(v)}`;
    ctx.strokeText(txt, bx + bw - 4, r.y + r.h / 2 + 1);
    ctx.fillStyle = '#fff';
    ctx.fillText(txt, bx + bw - 4, r.y + r.h / 2 + 1);
  }

  private drawStatus(ctx: CanvasRenderingContext2D, s: Side['status'], f: Fighter) {
    const items: [string, string, string][] = [];
    if (f.poison.turns > 0) items.push(['#4ddc6a', `☠${f.poison.dmg}`, `${f.poison.turns}`]);
    if (f.str.turns > 0) items.push(['#ff6a3d', `+${f.str.amt}`, `${f.str.turns}`]);
    if (f.stun > 0) items.push(['#ffd23f', '✦', `${f.stun}`]);
    let x = s.x;
    ctx.textBaseline = 'middle';
    for (const [col, label, n] of items) {
      ctx.font = `800 11px ${BODY}`;
      const w = ctx.measureText(label).width + 22;
      const bx = s.dir > 0 ? x : x - w;
      roundRect(ctx, bx, s.y - 9, w, 18, 9);
      ctx.fillStyle = rgba(col, 0.22);
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'left';
      ctx.fillText(label, bx + 6, s.y + 1);
      ctx.fillStyle = col;
      ctx.textAlign = 'right';
      ctx.fillText(n, bx + w - 6, s.y + 1);
      x += (w + 5) * s.dir;
    }
  }

  /** Spells are enamel street plates: element-coloured when ready, faded when you can't afford them. */
  private drawSpell(ctx: CanvasRenderingContext2D, r: Rect, f: Fighter, i: number, chip: boolean) {
    const inst = f.spells[i];
    if (!inst) return;
    const def = SPELLS[inst.id];
    const can = affordable(f, def);
    const lit = can && (f.isPlayer ? this.phase === 'input' : true);
    const pressed = this.pressed && this.pressed.i === i && (this.pressed.side === 'P') === f.isPlayer;
    const base = ENAMEL[def.elem];
    const en = lit || !f.isPlayer ? base : mixHex(base, '#4a4858', 0.72);
    const enD = mixHex(en, '#000000', 0.55);
    const lip = chip ? 2 : 3;
    const y = r.y + (pressed ? lip - 1 : 0);
    const rad = chip ? 7 : 9;
    ctx.save();
    // ledge under the plate
    if (!pressed) {
      roundRect(ctx, r.x, r.y + lip, r.w, r.h, rad);
      ctx.fillStyle = enD;
      ctx.fill();
    }
    if (lit) {
      const warn = !f.isPlayer;
      ctx.shadowColor = rgba(warn ? '#ff4a5a' : mixHex(base, '#ffffff', 0.4), 0.55 + 0.35 * Math.sin(this.t * 4));
      ctx.shadowBlur = 16;
    }
    roundRect(ctx, r.x, y, r.w, r.h, rad);
    const g = ctx.createLinearGradient(0, y, 0, y + r.h);
    g.addColorStop(0, mixHex(en, '#ffffff', 0.2));
    g.addColorStop(0.45, en);
    g.addColorStop(1, mixHex(en, '#000000', 0.18));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#120c18';
    ctx.stroke();
    roundRect(ctx, r.x + 3.5, y + 3.5, r.w - 7, r.h - 7, rad - 3);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = rgba('#f6f3ea', lit || !f.isPlayer ? 0.95 : 0.45);
    ctx.stroke();
    // rivets
    const rivet = (x: number, yy: number) => {
      const rg = ctx.createRadialGradient(x - 0.6, yy - 0.6, 0, x, yy, 2.4);
      rg.addColorStop(0, '#ffffff');
      rg.addColorStop(0.5, '#b8bec6');
      rg.addColorStop(1, '#4a5058');
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(x, yy, 2.2, 0, TAU);
      ctx.fill();
    };
    if (chip) {
      rivet(r.x + 8, y + r.h / 2);
      rivet(r.x + r.w - 8, y + r.h / 2);
    } else {
      rivet(r.x + 9, y + 9);
      rivet(r.x + r.w - 9, y + 9);
      rivet(r.x + 9, y + r.h - 9);
      rivet(r.x + r.w - 9, y + r.h - 9);
      // chipped enamel
      ctx.fillStyle = 'rgba(28,20,30,0.7)';
      ctx.beginPath();
      const cx = r.x + r.w * (0.62 + (i % 2) * 0.12), cy = y + r.h - 3;
      ctx.moveTo(cx - 6, cy);
      ctx.lineTo(cx - 3, cy - 4);
      ctx.lineTo(cx + 1, cy - 2);
      ctx.lineTo(cx + 6, cy - 3.5);
      ctx.lineTo(cx + 4, cy);
      ctx.closePath();
      ctx.fill();
    }

    const padL = chip ? 16 : 16;
    const nameX = r.x + padL;
    const cy = chip ? y + r.h / 2 - (4) : y + 19;
    let fs = chip ? 13 : 17;
    ctx.font = `400 ${fs}px ${DISPLAY}`;
    const label = def.name + (inst.lvl > 1 ? '+' : '');
    const room = r.w - padL * 2 - (def.quick && !chip ? 40 : 0);
    while (fs > 10 && ctx.measureText(label).width > room) {
      fs--;
      ctx.font = `400 ${fs}px ${DISPLAY}`;
    }
    ctx.textAlign = chip ? 'center' : 'left';
    ctx.textBaseline = 'middle';
    const tx = chip ? r.x + r.w / 2 : nameX;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillText(label, tx, cy + 1.5);
    ctx.fillStyle = lit || !f.isPlayer ? '#ffffff' : 'rgba(255,255,255,0.6)';
    ctx.fillText(label, tx, cy);
    if (def.quick && !chip) {
      ctx.save();
      ctx.translate(r.x + r.w - 26, y + 7);
      ctx.rotate(0.12);
      ctx.fillStyle = '#ffd23f';
      ctx.fillRect(-20, -6, 40, 12);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 1;
      ctx.strokeRect(-20, -6, 40, 12);
      ctx.font = `700 8.5px ${BODY}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#2a1a08';
      ctx.fillText('SZYBKI', 0, 0.5);
      ctx.restore();
    }

    if (chip) {
      // how close the enemy is to casting it
      let prog = 1;
      for (let c = 0; c < 4; c++) if (def.cost[c]) prog = Math.min(prog, f.manaVis[c] / def.cost[c]);
      const bx = r.x + 16, by = y + r.h - 10, bw = r.w - 32;
      roundRect(ctx, bx, by, bw, 3.5, 2);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fill();
      roundRect(ctx, bx, by, Math.max(3.5, bw * clamp(prog, 0, 1)), 3.5, 2);
      ctx.fillStyle = can ? '#ffe0e0' : 'rgba(255,255,255,0.75)';
      ctx.fill();
    } else {
      let x = nameX;
      const yy = y + r.h - 16;
      ctx.font = `700 13px ${BODY}`;
      ctx.textAlign = 'left';
      for (let c = 0; c < 4; c++) {
        const n = def.cost[c];
        if (!n) continue;
        ctx.drawImage(gemArt.spr[c], x - 3, yy - 9, 18, 18);
        ctx.fillStyle = f.mana[c] >= n ? '#ffffff' : '#ffc4c4';
        ctx.fillText(`${n}`, x + 15, yy + 1);
        x += 15 + ctx.measureText(`${n}`).width + 9;
      }
      if (def.hp) {
        ctx.fillStyle = '#ffd0d4';
        ctx.fillText(`♥ ${def.hp} PŻ`, x, yy + 1);
      }
      if (!def.hp && def.cost.every((n) => !n)) {
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.fillText('za darmo', x, yy + 1);
      }
    }
    ctx.restore();
  }

  private drawBanners(ctx: CanvasRenderingContext2D) {
    const L = this.L;
    const cx = L.bx + L.bs / 2;
    let y = L.by + L.bs / 2;
    for (const b of this.banners.slice(-2)) {
      const p = b.t / b.dur;
      const s = p < 0.14 ? easeBack(p / 0.14) : 1;
      const a = p > 0.75 ? (1 - p) / 0.25 : Math.min(1, p * 8);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.font = `600 14px ${BODY}`;
      const subLines = b.sub ? Math.min(2, wrap(ctx, b.sub, L.bs - 28).length) : 0;
      const bandH = b.size * 1.6 + subLines * 17 + (subLines ? 6 : 0);
      const band = ctx.createLinearGradient(L.bx - 20, 0, L.bx + L.bs + 20, 0);
      band.addColorStop(0, 'rgba(8,5,16,0)');
      band.addColorStop(0.2, 'rgba(8,5,16,0.78)');
      band.addColorStop(0.8, 'rgba(8,5,16,0.78)');
      band.addColorStop(1, 'rgba(8,5,16,0)');
      ctx.fillStyle = band;
      ctx.fillRect(L.bx - 20, y - bandH / 2, L.bs + 40, bandH);
      // light streak sweeping through the band
      const sx = L.bx + (p * 2.2 - 0.6) * L.bs;
      const sg = ctx.createLinearGradient(sx - 60, 0, sx + 60, 0);
      sg.addColorStop(0, rgba(b.color, 0));
      sg.addColorStop(0.5, rgba(b.color, 0.35));
      sg.addColorStop(1, rgba(b.color, 0));
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = sg;
      ctx.fillRect(L.bx - 20, y - bandH / 2, L.bs + 40, bandH);
      ctx.globalCompositeOperation = 'source-over';
      ctx.translate(cx, y - subLines * 10);
      ctx.scale(s, s);
      let fs = b.size;
      ctx.font = `400 ${fs}px ${DISPLAY}`;
      while (fs > 14 && ctx.measureText(b.text).width > L.bs - 20) {
        fs -= 2;
        ctx.font = `400 ${fs}px ${DISPLAY}`;
      }
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(10,4,16,0.9)';
      ctx.strokeText(b.text, 0, 0);
      const tg = ctx.createLinearGradient(0, -fs / 2, 0, fs / 2);
      tg.addColorStop(0, mixHex(b.color, '#ffffff', 0.7));
      tg.addColorStop(0.5, b.color);
      tg.addColorStop(1, mixHex(b.color, '#000000', 0.3));
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 18;
      ctx.fillStyle = tg;
      ctx.fillText(b.text, 0, 0);
      ctx.shadowBlur = 0;
      if (b.sub) {
        ctx.font = `600 14px ${BODY}`;
        ctx.fillStyle = '#e8dcc4';
        const lines = wrap(ctx, b.sub, L.bs - 28).slice(0, 2);
        lines.forEach((ln, k) => ctx.fillText(ln, 0, fs * 0.8 + 2 + k * 17));
      }
      ctx.restore();
      y += bandH + 6;
    }
  }

  exit() {
    hideTip();
  }
}

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const w of text.split(' ')) {
    const next = line ? `${line} ${w}` : w;
    if (line && ctx.measureText(next).width > width) {
      out.push(line);
      line = w;
    } else line = next;
  }
  if (line) out.push(line);
  return out;
}

export function battleSeed(run: Run, node: number) {
  return hash(run.seed, 'battle', node);
}
