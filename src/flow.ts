import { app } from './app';
import { sfx } from './core/audio';
import { hash, RNG } from './core/rng';
import { gemArt } from './gfx/gems';
import { artSVG, svgURL } from './gfx/art';
import { portraitURL } from './gfx/portrait';
import { CLASSES, MODS, RELICS } from './game/content';
import { BAL } from './game/balance';
import { genEnemy, type Tier } from './game/enemies';
import { EVENTS } from './game/events';
import type { MapNode } from './game/map';
import {
  addRelic, floorOf, has, loadMeta, loadRun, newRun, randomRelics, rngFor, saveMeta, saveRun, score, todayKey,
  type Run, type Step,
} from './game/run';
import { PLAYER_SPELLS, SPELLS, spellPrice } from './game/spells';
import { ULTS } from './game/ult';
import { BattleScene, battleSeed, type BattleResult } from './scenes/battle';
import { MapScene, placeOf } from './scenes/map';
import { MenuScene } from './scenes/menu';
import { el, esc, overlay, relicHTML, spellHTML, toast } from './ui/dom';

const portraitOf = (cls: string) => portraitURL(CLASSES[cls].look);
const SIGNATURES: Record<string, string> = { pyro: 'Wujek Staszek', druid: 'B. Zielińska', storm: 'Kombi' };

const SHOPS: Record<string, { where: string; who: string; greet: string; potion: string; potionNote: string; upgrade: string; bye: string }> = {
  ropuszka: {
    where: 'sklep „Ropuszka”',
    who: 'Pani Grażynka przy kasie',
    greet: '„Ma pan naszą aplikację? Nie? To płaci pan jak frajer. Następny!”',
    potion: 'Hot-dog z mikrofali',
    potionNote: 'Parówka niewiadomego pochodzenia.',
    upgrade: 'Gazetka z krzyżówką',
    bye: 'Dziękuję, do widzenia',
  },
  stacja: {
    where: 'stacja paliw „Sokół”',
    who: 'Pan Zbyszek z nocnej zmiany',
    greet: '„Który dystrybutor? Żaden? To może kawka, hot-dog, płyn do spryskiwaczy?”',
    potion: 'Kawa z automatu',
    potionNote: 'Serce przyspiesza, ręce przestają się trząść.',
    upgrade: 'Atlas drogowy z 1998',
    bye: 'Nic nie tankuję, dzięki',
  },
};

const coinImg = () => `<img class="coin" src="${gemArt.icon(5)}" alt="">`;

export class Game {
  run: Run | null = null;
  private hud: HTMLElement | null = null;
  private menuEl: HTMLElement | null = null;

  start() {
    this.menu();
  }

  // ---------------- menu ----------------
  private async menu() {
    this.clearHud();
    await app.fade(true);
    app.setScene(new MenuScene());
    const saved = loadRun();
    const meta = loadMeta();
    const today = todayKey();
    const dailyDone = meta.daily[today];
    this.menuEl?.remove();
    const m = el(`<div class="screen menu in">
      <div class="menu-inner">
        <div class="title-block">
          <h1 class="logo" aria-label="Kamień, Kość i Kasa"><span class="n1">Kamie<span class="flick">ń</span>, Kość</span><span class="n2">i Kasa</span></h1>
          <p class="tagline">Tłucz diabliki z działek i urzędników z zaświatów. Każda wyprawa jest inna, każda kończy się tak samo.</p>
        </div>
        <div class="menu-actions">
          ${saved ? `<button class="btn primary" data-a="continue">Kontynuuj wyprawę<small>${esc(CLASSES[saved.cls].name)} · ${saved.hp}/${saved.maxHp} PŻ · piętro ${Math.max(1, floorOf(saved))}/8</small></button>` : ''}
          <button class="btn ${saved ? '' : 'primary'}" data-a="new">Nowa wyprawa</button>
          <button class="btn" data-a="daily">Wyzwanie dnia<small>${dailyDone ? `dzisiejszy wynik: ${dailyDone}` : 'jedna mapa na dziś, dla wszystkich ta sama'}</small></button>
        </div>
        <div class="menu-foot">
          <span>Wyprawy <b>${meta.runs}</b></span><span>Zwycięstwa <b>${meta.wins}</b></span><span>Rekord <b>${meta.best}</b></span>
          <button class="link" data-a="sound">${sfx.on ? 'Dźwięk wł.' : 'Dźwięk wył.'}</button>
        </div>
      </div>
    </div>`);
    app.ui.appendChild(m);
    this.menuEl = m;
    await app.fade(false);
    m.addEventListener('click', async (e) => {
      const b = (e.target as HTMLElement).closest('[data-a]') as HTMLElement | null;
      if (!b) return;
      sfx.click();
      const a = b.dataset.a;
      if (a === 'sound') {
        b.textContent = sfx.toggle() ? 'Dźwięk wł.' : 'Dźwięk wył.';
        return;
      }
      if (a === 'continue' && saved) {
        this.closeMenu();
        this.run = saved;
        this.resume();
      } else if (a === 'new') {
        if (saved && !(await this.confirm('Porzucić obecną wyprawę?', 'Zapisana wyprawa przepadnie. Na zawsze.'))) return;
        const cls = await this.pickClass();
        if (!cls) return;
        this.closeMenu();
        this.begin(newRun(cls, (Math.random() * 2 ** 32) >>> 0, null));
      } else if (a === 'daily') {
        if (saved && !(await this.confirm('Porzucić obecną wyprawę?', 'Zapisana wyprawa przepadnie. Na zawsze.'))) return;
        const seed = hash('daily', today);
        const cls = new RNG(seed).pick(Object.keys(CLASSES));
        this.closeMenu();
        toast(`Wyzwanie dnia: ${CLASSES[cls].name}`);
        this.begin(newRun(cls, seed, today));
      }
    });
  }

  private closeMenu() {
    const m = this.menuEl;
    this.menuEl = null;
    if (!m) return;
    m.classList.add('out');
    setTimeout(() => m.remove(), 300);
  }

  private pickClass(): Promise<string | null> {
    const cards = Object.entries(CLASSES)
      .map(([id, c], i) => `<button class="pick class-card" data-c="${id}">
          <div class="id-head"><span>Legitymacja bohatera</span><span>Nr ${String(i + 1).padStart(4, '0')}/87</span></div>
          <div class="id-body">
            <div class="id-photo"><img src="${svgURL(artSVG(c.look.art, c.look.pal, false))}" alt=""><span class="stamp">zatwier&shy;dzono</span></div>
            <dl class="id-fields">
              <div class="id-name"><dt>Imię i nazwisko</dt><dd>${esc(c.name)}</dd></div>
              <div><dt>Zdrowie:</dt> <dd>${c.hp} PŻ</dd></div>
              <div><dt>Supermoc:</dt> <dd class="id-ult">${esc(ULTS[id].name)}</dd></div>
              <div><dt>Wyposażenie:</dt> <dd>${c.spells.map((s) => esc(SPELLS[s].name)).join(', ')}</dd></div>
            </dl>
            <dl class="id-fields id-wide">
              <div><dt>Znaki szczególne:</dt> <dd>${esc(c.desc)}</dd></div>
              <div><dt>Uprawnienia:</dt> <dd>${esc(c.perk)}</dd></div>
            </dl>
          </div>
          <div class="id-sign">podpis posiadacza <span>${SIGNATURES[id] ?? c.name}</span></div>
        </button>`)
      .join('');
    return overlay<string | null>(`<h2>Kto dziś idzie?</h2><div class="choices">${cards}</div><button class="btn ghost" data-x>Wróć</button>`, (root, close) => {
      root.querySelectorAll<HTMLElement>('[data-c]').forEach((b) => b.addEventListener('click', () => close(b.dataset.c!)));
      root.querySelector('[data-x]')!.addEventListener('click', () => close(null));
    });
  }

  private confirm(title: string, text: string): Promise<boolean> {
    return overlay<boolean>(`<h2>${esc(title)}</h2><p class="lead">${esc(text)}</p><div class="row"><button class="btn" data-n>Anuluj</button><button class="btn danger" data-y>Tak</button></div>`, (root, close) => {
      root.querySelector('[data-y]')!.addEventListener('click', () => close(true));
      root.querySelector('[data-n]')!.addEventListener('click', () => close(false));
    });
  }

  // ---------------- run ----------------
  private begin(run: Run) {
    this.run = run;
    const meta = loadMeta();
    meta.runs++;
    saveMeta(meta);
    saveRun(run);
    this.toMap();
  }

  private resume() {
    const r = this.run!;
    if (r.stage && r.stage.step !== 'battle') app.setScene(new MapScene(r, () => {}));
    if (r.stage) this.stage(r.map.nodes[r.stage.node], r.stage.step);
    else this.toMap();
  }

  private async toMap() {
    const run = this.run!;
    await app.fade(true);
    app.setScene(new MapScene(run, (n) => this.pickNode(n)));
    this.showHud('map');
    await app.fade(false);
  }

  private pickNode(n: MapNode) {
    const run = this.run!;
    run.pos = n.id;
    run.visited.push(n.id);
    const step: Step = n.type === 'battle' || n.type === 'elite' || n.type === 'boss' ? 'battle' : (n.type as Step);
    run.stage = { node: n.id, step, tier: n.type === 'elite' ? 'elite' : n.type === 'boss' ? 'boss' : 'normal' };
    saveRun(run);
    this.stage(n, step);
  }

  private setStep(step: Step, extra: Partial<NonNullable<Run['stage']>> = {}) {
    const run = this.run!;
    run.stage = { ...run.stage!, step, ...extra };
    saveRun(run);
  }

  private async finishNode() {
    const run = this.run!;
    run.stage = null;
    run.battle = null;
    saveRun(run);
    this.toMap();
  }

  private async stage(n: MapNode, step: Step): Promise<void> {
    const run = this.run!;
    const rng = rngFor(run, 'node', n.id, step);
    switch (step) {
      case 'battle':
        return this.battle(n);
      case 'reward':
        await this.reward(n);
        return this.finishNode();
      case 'event':
        return this.event(n);
      case 'shop':
        this.showHud('map');
        await this.shop(n);
        return this.finishNode();
      case 'rest':
        this.showHud('map');
        await this.rest();
        return this.finishNode();
      case 'treasure': {
        this.showHud('map');
        const relic = randomRelics(run, rng, 1)[0];
        const gold = rng.int(25, 45);
        await overlay<void>(`<div class="eyebrow">słoik babci</div><h2>Za ogórkami</h2><p class="lead">W piwnicy, za rzędem ogórków z 2011 roku, stoi słoik. Nie ma w nim ogórków.</p>
          ${relic ? relicHTML(relic) : ''}<p class="gain">${coinImg()} +${gold} zł</p><button class="btn primary" data-ok>Babcia by chciała</button>`, (root, close) => {
          root.querySelector('[data-ok]')!.addEventListener('click', () => close());
        });
        if (relic) addRelic(run, relic);
        run.gold += gold;
        sfx.coin();
        return this.finishNode();
      }
      case 'upgrade':
        this.showHud('map');
        await this.upgrade('Wybierz czar do ulepszenia');
        return this.finishNode();
      case 'learn': {
        this.showHud('map');
        const opts = rng.shuffle(PLAYER_SPELLS.filter((id) => !run.spells.some((s) => s.id === id))).slice(0, 3);
        await this.learnFrom(opts, 'Poradnik domowego czarodzieja', true);
        return this.finishNode();
      }
      case 'relic': {
        this.showHud('map');
        const relic = randomRelics(run, rng, 1)[0];
        if (relic) {
          addRelic(run, relic);
          await overlay<void>(`<h2>Skarb pana Zdzisia</h2>${relicHTML(relic)}<button class="btn primary" data-ok>Dalej</button>`, (root, close) => {
            root.querySelector('[data-ok]')!.addEventListener('click', () => close());
          });
        }
        return this.finishNode();
      }
    }
  }

  // ---------------- battle ----------------
  private async battle(n: MapNode) {
    const run = this.run!;
    const tier = (run.stage?.tier ?? 'normal') as Tier;
    const floor = n.row + (n.type === 'event' ? 1 : 0);
    const enemy = genEnemy(hash(run.seed, 'enemy', n.id, n.type), floor, tier);
    const mrng = rngFor(run, 'mods', n.id);
    const mods: string[] = [];
    const modChance = tier === 'boss' ? 1 : tier === 'elite' ? 0.7 : n.row >= 1 ? 0.35 : 0;
    if (mrng.chance(modChance)) mods.push(mrng.pick(Object.keys(MODS)));

    await app.fade(true);
    this.showHud('battle');
    const scene = new BattleScene(
      {
        run, enemy, mods, seed: battleSeed(run, n.id), save: run.battle,
        onSave: (s) => {
          run.battle = s;
          saveRun(run);
        },
      },
      (res) => this.afterBattle(n, tier, res),
    );
    app.setScene(scene);
    await app.fade(false);
  }

  private async afterBattle(n: MapNode, tier: Tier, res: BattleResult) {
    const run = this.run!;
    run.battle = null;
    run.stats.turns += res.turns;
    run.stats.gems += res.gems;
    run.stats.maxCombo = Math.max(run.stats.maxCombo, res.maxCombo);
    if (!res.won) {
      run.hp = 0;
      return this.gameOver(false);
    }
    run.hp = res.hp;
    run.stats.kills++;
    const before = run.hp;
    run.hp = Math.min(run.maxHp, run.hp + Math.round(run.maxHp * BAL.winHeal) + (has(run, 'bandage') ? 8 : 0));
    const healed = run.hp - before;
    const rng = rngFor(run, 'gold', n.id);
    const base = (tier === 'elite' ? 30 : tier === 'boss' ? 60 : 12) + n.row * 3 + rng.int(0, 8);
    run.gold += res.gold + base;
    if (tier === 'boss') {
      saveRun(run);
      return this.gameOver(true);
    }
    this.setStep('reward', { gold: base + res.gold, heal: healed });
    await app.fade(true);
    app.setScene(new MapScene(run, () => {}));
    this.showHud('map');
    await app.fade(false);
    this.stage(n, 'reward');
  }

  private async reward(n: MapNode) {
    const run = this.run!;
    const st = run.stage!;
    const rng = rngFor(run, 'reward', n.id);
    if (st.tier === 'elite') {
      const opts = randomRelics(run, rng, 2);
      if (opts.length) {
        const pick = await overlay<string>(`<div class="eyebrow">po grubej rybie zostało</div><h2>Weź pamiątkę</h2>
          <div class="choices">${opts.map((id) => `<button class="pick" data-r="${id}">${relicHTML(id)}</button>`).join('')}</div>`, (root, close) => {
          root.querySelectorAll<HTMLElement>('[data-r]').forEach((b) => b.addEventListener('click', () => close(b.dataset.r!)));
        });
        addRelic(run, pick);
        saveRun(run);
      }
    }
    const opts = rng.shuffle(PLAYER_SPELLS.filter((id) => !run.spells.some((s) => s.id === id))).slice(0, 3);
    await this.learnFrom(opts, 'Pozamiatane!', false, st.gold, st.heal);
  }

  private async learnFrom(opts: string[], title: string, fromEvent: boolean, gold?: number, heal?: number) {
    const run = this.run!;
    const pick = await overlay<string | null>(`<div class="eyebrow">${fromEvent ? 'nowa wiedza' : 'po walce'}</div><h2>${esc(title)}</h2>
      ${gold || heal ? `<p class="gain">${gold ? `${coinImg()} +${gold} zł` : ''}${heal ? `<span class="heal"><i class="heart"></i>+${heal} PŻ</span>` : ''}</p>` : ''}
      <p class="lead">Wybierz czar do zeszytu (mieści 4).</p>
      <div class="choices">${opts.map((id) => `<button class="pick" data-s="${id}">${spellHTML({ id, lvl: 1 })}</button>`).join('')}</div>
      <button class="btn ghost" data-x>Pomiń${fromEvent ? '' : ' (+10 zł)'}</button>`, (root, close) => {
      root.querySelectorAll<HTMLElement>('[data-s]').forEach((b) => b.addEventListener('click', () => close(b.dataset.s!)));
      root.querySelector('[data-x]')!.addEventListener('click', () => close(null));
    });
    if (!pick) {
      if (!fromEvent) run.gold += 10;
      return;
    }
    await this.addSpell(pick);
  }

  private async addSpell(id: string): Promise<boolean> {
    const run = this.run!;
    if (run.spells.length < 4) {
      run.spells.push({ id, lvl: 1 });
      saveRun(run);
      return true;
    }
    const idx = await overlay<number>(`<h2>Zeszyt jest pełny</h2><p class="lead">Który czar zastąpić zaklęciem <b>${esc(SPELLS[id].name)}</b>?</p>
      <div class="choices">${run.spells.map((s, i) => `<button class="pick" data-i="${i}">${spellHTML(s)}</button>`).join('')}</div>
      <button class="btn ghost" data-x>Zachowaj obecne</button>`, (root, close) => {
      root.querySelectorAll<HTMLElement>('[data-i]').forEach((b) => b.addEventListener('click', () => close(+b.dataset.i!)));
      root.querySelector('[data-x]')!.addEventListener('click', () => close(-1));
    });
    if (idx < 0) return false;
    run.spells[idx] = { id, lvl: 1 };
    saveRun(run);
    return true;
  }

  private async upgrade(title: string, price = 0): Promise<boolean> {
    const run = this.run!;
    const up = run.spells.map((s, i) => [s, i] as const).filter(([s]) => s.lvl < 2);
    if (!up.length) {
      toast('Wszystkie czary są już ulepszone');
      return false;
    }
    const idx = await overlay<number>(`<h2>${esc(title)}</h2>${price ? `<p class="lead">Koszt: ${price} zł</p>` : ''}
      <div class="choices">${up.map(([s, i]) => `<button class="pick" data-i="${i}">${spellHTML(s, `<p class="next">Po ulepszeniu: ${esc(SPELLS[s.id].desc(2))}</p>`)}</button>`).join('')}</div>
      <button class="btn ghost" data-x>Anuluj</button>`, (root, close) => {
      root.querySelectorAll<HTMLElement>('[data-i]').forEach((b) => b.addEventListener('click', () => close(+b.dataset.i!)));
      root.querySelector('[data-x]')!.addEventListener('click', () => close(-1));
    });
    if (idx < 0) return false;
    run.spells[idx].lvl = 2;
    saveRun(run);
    sfx.extra();
    return true;
  }

  // ---------------- non-combat nodes ----------------
  private async event(n: MapNode): Promise<void> {
    const run = this.run!;
    this.showHud('map');
    const rng = rngFor(run, 'event', n.id);
    const ev = rng.pick(EVENTS);
    const choice = await overlay<number>(`<div class="eyebrow">wydarzenie</div><h2>${esc(ev.title)}</h2><p class="lead story">${esc(ev.text)}</p>
      <div class="choices">${ev.choices
        .map((c, i) => {
          const ok = !c.ok || c.ok(run);
          return `<button class="pick option" data-i="${i}" ${ok ? '' : 'disabled'}><strong>${esc(c.label)}</strong><span>${esc(c.hint)}</span></button>`;
        })
        .join('')}</div>`, (root, close) => {
      root.querySelectorAll<HTMLElement>('[data-i]').forEach((b) => b.addEventListener('click', () => close(+b.dataset.i!)));
    });
    const out = ev.choices[choice].pick(run, rngFor(run, 'event-out', n.id));
    const next: Step | null = out.then === 'battle' ? 'battle' : out.then === 'upgrade' ? 'upgrade' : out.then === 'learn' ? 'learn' : out.then === 'relic' ? 'relic' : null;
    if (next) this.setStep(next, { tier: 'normal' });
    else {
      run.stage = null;
      saveRun(run);
    }
    this.updateHud();
    await overlay<void>(`<h2>${esc(ev.title)}</h2><p class="lead story">${esc(out.text)}</p><button class="btn primary" data-ok>Dalej</button>`, (root, close) => {
      root.querySelector('[data-ok]')!.addEventListener('click', () => close());
    });
    if (run.hp <= 0) return this.gameOver(false);
    if (next) return this.stage(n, next);
    this.toMap();
  }

  private async rest() {
    const run = this.run!;
    const pct = has(run, 'compass') ? 0.5 : 0.3;
    const heal = Math.min(run.maxHp - run.hp, Math.round(run.maxHp * pct));
    const canUp = run.spells.some((s) => s.lvl < 2);
    for (;;) {
      const a = await overlay<string>(`<div class="eyebrow">ognisko</div><h2>Kiełbasa na patyku</h2><p class="lead">Ogień trzaska, kiełbasa skwierczy, gdzieś ktoś gra na gitarze „Hej, sokoły”. Chwila spokoju.</p>
        <div class="choices">
          <button class="pick option" data-a="heal"><strong>Zjedz i się zdrzemnij</strong><span>Leczy ${heal} PŻ (${Math.round(pct * 100)}% zdrowia)</span></button>
          <button class="pick option" data-a="up" ${canUp ? '' : 'disabled'}><strong>Poczytaj notatki</strong><span>Ulepsz jeden czar</span></button>
        </div>`, (root, close) => {
        root.querySelectorAll<HTMLElement>('[data-a]').forEach((b) => b.addEventListener('click', () => close(b.dataset.a!)));
      });
      if (a === 'heal') {
        run.hp += heal;
        sfx.heal();
        return;
      }
      if (await this.upgrade('Wybierz czar do ulepszenia')) return;
    }
  }

  private async shop(n: MapNode) {
    const run = this.run!;
    const rng = rngFor(run, 'shop', n.id);
    const spells = rng.shuffle(PLAYER_SPELLS.filter((id) => !run.spells.some((s) => s.id === id))).slice(0, 3);
    const relics = randomRelics(run, rng, 2);
    const relicPrice = relics.map(() => 90 + rng.int(0, 35));
    const shop = SHOPS[placeOf(run, n)] ?? SHOPS.ropuszka;
    const key = (k: string) => `${n.id}:${k}`;
    const bought = (k: string) => run.bought.includes(key(k));
    const buy = (k: string, price: number) => {
      run.gold -= price;
      run.bought.push(key(k));
      sfx.coin();
      saveRun(run);
      this.updateHud();
    };
    for (;;) {
      const row = (k: string, inner: string, price: number) =>
        `<div class="shop-row ${bought(k) ? 'sold' : ''}">${inner}<button class="btn price" data-k="${k}" ${bought(k) || run.gold < price ? 'disabled' : ''}>${bought(k) ? 'sprzedane' : `${price} zł`}</button></div>`;
      const html = `<div class="eyebrow">${shop.where}</div><h2>${shop.who}</h2><p class="lead">${shop.greet} Masz ${coinImg()} <b>${run.gold} zł</b>.</p>
        <div class="shop">
          ${spells.map((id) => row(`s:${id}`, spellHTML({ id, lvl: 1 }), spellPrice(SPELLS[id]))).join('')}
          ${relics.map((id, i) => row(`r:${id}`, relicHTML(id), relicPrice[i])).join('')}
          ${row('potion', `<div class="option-like"><strong>${shop.potion}</strong><p>Leczy 20 PŻ. ${shop.potionNote}</p></div>`, 28)}
          ${row('upgrade', `<div class="option-like"><strong>${shop.upgrade}</strong><p>Ulepsz jeden czar.</p></div>`, 60)}
        </div>
        <button class="btn primary" data-leave>${shop.bye}</button>`;
      const k = await overlay<string>(html, (root, close) => {
        root.querySelectorAll<HTMLElement>('[data-k]').forEach((b) => b.addEventListener('click', () => close(b.dataset.k!)));
        root.querySelector('[data-leave]')!.addEventListener('click', () => close(''));
      });
      if (!k) return;
      if (k.startsWith('s:')) {
        const id = k.slice(2);
        if (await this.addSpell(id)) buy(k, spellPrice(SPELLS[id]));
      } else if (k.startsWith('r:')) {
        const id = k.slice(2);
        buy(k, relicPrice[relics.indexOf(id)]);
        addRelic(run, id);
        saveRun(run);
        toast(RELICS[id].name);
      } else if (k === 'potion') {
        buy(k, 28);
        run.hp = Math.min(run.maxHp, run.hp + 20);
        sfx.heal();
      } else if (k === 'upgrade') {
        if (await this.upgrade('Który czar ulepszyć?', 60)) buy(k, 60);
      }
      this.updateHud();
    }
  }

  // ---------------- end ----------------
  private async gameOver(won: boolean) {
    const run = this.run!;
    const sc = score(run, won);
    const meta = loadMeta();
    if (won) meta.wins++;
    const record = sc > meta.best;
    meta.best = Math.max(meta.best, sc);
    if (run.daily) meta.daily[run.daily] = Math.max(meta.daily[run.daily] ?? 0, sc);
    saveMeta(meta);
    saveRun(null);
    this.clearHud();
    const mins = Math.max(1, Math.round((Date.now() - run.stats.start) / 60000));
    const she = run.cls === 'druid';
    const floor = Math.max(1, floorOf(run));
    const mourners = ['diabliki z działek', 'koledzy z przystanku', 'pani z okienka nr 3', 'teściowa (bez żalu)', 'sąsiedzi z bloku'];
    const head = won
      ? `<div class="eyebrow">dyplom uznania</div>
      <h2 class="win">Szef pokonany!</h2>
      <p class="lead">Za zasługi w tłuczeniu diablików, utopców i urzędników wyróżnia się: <b>${esc(CLASSES[run.cls].name)}</b>. Wracasz do domu z tarczą. I z reklamówką łupów.</p>`
      : `<div class="eyebrow">z głębokim żalem zawiadamiamy, że</div>
      <h2 class="lose">ś.p. ${esc(CLASSES[run.cls].name)}</h2>
      <p class="lead">${she ? 'odeszła' : 'odszedł'} na piętrze ${floor} wyprawy, tak jak ${she ? 'żyła' : 'żył'}: w pośpiechu.<br>Pogrążeni w smutku: ${mourners[run.seed % mourners.length]}.</p>`;
    const a = await overlay<string>(`${head}
      <p class="score">${sc}<small>${record ? 'nowy rekord!' : 'punktów'}</small></p>
      <dl class="stats">
        <div><dt>Spuszczony łomot</dt><dd>${run.stats.kills}</dd></div>
        <div><dt>Najdłuższe combo</dt><dd>×${run.stats.maxCombo}</dd></div>
        <div><dt>Rozbite kamienie</dt><dd>${run.stats.gems}</dd></div>
        <div><dt>Kasa</dt><dd>${run.gold}</dd></div>
        <div><dt>Czas</dt><dd>${mins} min</dd></div>
      </dl>
      <div class="row"><button class="btn" data-a="menu">Menu</button><button class="btn primary" data-a="again">Jeszcze raz</button></div>`, (root, close) => {
      root.querySelectorAll<HTMLElement>('[data-a]').forEach((b) => b.addEventListener('click', () => close(b.dataset.a!)));
    }, won ? 'victory' : 'defeat');
    this.run = null;
    if (a === 'again') {
      const cls = await this.pickClass();
      if (cls) return this.begin(newRun(cls, (Math.random() * 2 ** 32) >>> 0, null));
    }
    this.menu();
  }

  // ---------------- HUD ----------------
  private showHud(mode: 'map' | 'battle') {
    this.clearHud();
    const h = el(`<div class="hud ${mode}"></div>`);
    app.ui.appendChild(h);
    this.hud = h;
    h.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest('[data-h]') as HTMLElement | null;
      if (!b) return;
      sfx.click();
      if (b.dataset.h === 'bag') this.inventory();
      else this.pause();
    });
    this.updateHud();
  }

  private updateHud() {
    const h = this.hud, run = this.run;
    if (!h || !run) return;
    if (h.classList.contains('battle')) {
      h.innerHTML = `<button class="icon-btn" data-h="menu" aria-label="Pauza"><i class="bars"></i></button>`;
      return;
    }
    h.innerHTML = `<div class="hud-stats">
        <img class="hud-por" src="${portraitOf(run.cls)}" alt="">
        <span class="hud-hp"><i class="heart"></i>${run.hp}<small>/${run.maxHp}</small></span>
        <span class="hud-gold">${coinImg()}${run.gold} zł</span>
        <span class="hud-floor">Piętro ${Math.max(1, floorOf(run))}/8</span>
      </div>
      <div class="hud-btns"><button class="icon-btn wide" data-h="bag">Zeszyt</button><button class="icon-btn" data-h="menu" aria-label="Menu"><i class="bars"></i></button></div>`;
  }

  private clearHud() {
    this.hud?.remove();
    this.hud = null;
  }

  private inventory() {
    const run = this.run!;
    overlay<void>(`<div class="eyebrow">${esc(CLASSES[run.cls].name)}</div><h2>Zeszyt i graty</h2>
      <p class="lead">${esc(CLASSES[run.cls].perk)}</p>
      <div class="ult-card"><span class="ult-stamp">supermoc</span><strong>${esc(ULTS[run.cls].name)}</strong><p>${esc(ULTS[run.cls].desc)}</p><p>Ładuje się fioletowymi kapslami (${BAL.capsNeeded}). Odpalasz ją, dotykając portretu.</p></div>
      <h3>Czary w zeszycie</h3><div class="choices">${run.spells.map((s) => spellHTML(s)).join('')}</div>
      <h3>Graty w kieszeniach</h3><div class="choices">${run.relics.length ? run.relics.map((r) => relicHTML(r)).join('') : '<p class="muted">Puste kieszenie. Graty znajdziesz w słoikach babci, w sklepach i u grubych ryb.</p>'}</div>
      <button class="btn primary" data-ok>Zamknij</button>`, (root, close) => {
      root.querySelector('[data-ok]')!.addEventListener('click', () => close());
    });
  }

  private async pause(): Promise<void> {
    const a = await overlay<string>(`<h2>Przerwa na papierosa</h2><p class="lead">Postęp zapisuje się sam. Możesz wysiąść na swojej stacji.</p>
      <div class="choices">
        <button class="btn primary" data-a="back">Wróć do gry</button>
        <button class="btn" data-a="sound">${sfx.on ? 'Wyłącz dźwięk' : 'Włącz dźwięk'}</button>
        <button class="btn" data-a="menu">Menu główne</button>
        <button class="btn danger" data-a="quit">Poddaj się</button>
      </div>`, (root, close) => {
      root.querySelectorAll<HTMLElement>('[data-a]').forEach((b) => b.addEventListener('click', () => close(b.dataset.a!)));
    });
    if (a === 'sound') {
      sfx.toggle();
      return this.pause();
    }
    if (a === 'menu') {
      this.run = null;
      return this.menu();
    }
    if (a === 'quit') {
      if (!(await this.confirm('Na pewno?', 'Tej wyprawy nie da się wznowić. Babcia będzie zawiedziona.'))) return;
      this.gameOver(false);
    }
  }
}
