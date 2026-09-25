# Kamień, Kość i Kasa — notes for agents

Browser roguelike match-3 in the spirit of Puzzle Quest, played mostly on a phone during a commute (15–20 min per run). Vite + TypeScript, Canvas 2D, no engine, no external image/audio assets. Deployed to GitHub Pages from `dist/` by `.github/workflows/pages.yml` on every push to `main`.

## Commands

```bash
npm run dev            # dev server (vite --host)
npx tsc --noEmit       # typecheck — run after every change
npm run build          # typecheck + static build to dist/
npm run sim            # balance report (headless runs), see "Balance"
npm run build:single   # everything inlined into dist-single/index.html
```

Dev-only helpers: `window.__sf = { app, game }` (inspect `__sf.app.scene`, call `__sf.game.shop(node)` etc.), and `localhost:5173/#galeria` shows every portrait, place and gem side by side.

## Tone and language

- All player-facing text is **Polish**, "swojski" everyday Poland with **black humour** (Diablik z Działki, Pani Halinka z okienka, klepsydra on death). Keep new text in that voice; code, comments and identifiers stay English.
- Enemy titles are built as `[trait adjective] + archetype + place` ("Skacowany Diablik z Działki"). Trait adjectives are written masculine and `agree()` bends them for archetypes marked `g: 'f'` (Skacowana Południca) or `g: 'n'` (Skacowane Licho); those also draw names from `NAMES_F` / `NAMES_N`.
- No real brands or logos: parodies only (sklep „Ropuszka”, stacja „Sokół”).
- UI is built from **street/paper objects**, not generic panels: enamel street signs (primary buttons, spells in battle, HUD buttons), MPK paper tickets (secondary buttons), price tags (shop), notebook pages (spells), fiscal receipts (relics), hero ID cards (class select), cork notice board (all dialogs), klepsydra / diploma (game over). New UI should pick an object from this world rather than a dark glass card.
- Fonts (bundled via @fontsource): Paytone One (display), Signika (body), Courier Prime (typewriter), Caveat (handwriting). Import the per-weight CSS (`@fontsource/x/400.css`), not `latin-400.css`/`latin-ext-400.css`: only weight files carry `unicode-range`, and without it Android draws Polish letters from a fallback font. Before adding a font, check it really has ąćęłńśźż (Lilita One didn't; its latin-ext file has 11 glyphs).

## Where things live

| Want to change | Edit |
| --- | --- |
| Difficulty numbers | `src/game/balance.ts` (`BAL`) — then run the sim |
| Heroes (HP, starting spells, perk text, portrait palette) | `src/game/content.ts` `CLASSES` — 7 heroes. Numeric perks go in `traits` (skull bonus, `costAdd`, `coinHit`, `expMana`, `caps`) and reach the `Fighter` via `heroSetup()`; the three original perks are still `run.cls` checks in `collect()` in `scenes/battle.ts` **and** `sim/sim.ts`. Move AI (`game/ai.ts`) reads the same fields so the sim plays each hero sensibly |
| Supermoves | `src/game/ult.ts` |
| Spells (player + enemy) | `src/game/spells.ts`; enemy spell pools per element: `ENEMY_POOL`. Always charge `costOf(f, def)`, not `def.cost` (Seba pays extra); `def.gold(uses)` = price in złoty from `Fighter.purse` (Łapówka) |
| Relics, battle modifiers | `src/game/content.ts` (`RELICS`, `MODS`); relic effects are checked with `has(run, 'id')` in battle/flow/sim |
| Enemies, bosses, names, traits | `src/game/enemies.ts` (13 archetypes, 4 bosses, 7 traits) |
| Monster habits (one signature mechanic per archetype/boss: petardy, freezing, mandat, żniwa…) | `src/game/habits.ts`; they act through `SpellCtx`, so battle and sim share the code. Fuses live on the gem (`Gem.fuse`) and burn in `burnFuses()` / the sim loop |
| Random events | `src/game/events.ts` |
| Map generation (rows, node types, run lengths `LENGTHS`) | `src/game/map.ts`; village drawing `src/gfx/village.ts`; place per node `placeOf()` in `scenes/map.ts` |
| Screens between battles (reward, shop, rest, event, game over, pause) | `src/flow.ts` |
| Battle rules, animation, battle HUD | `src/scenes/battle.ts` |
| Enemy / player move AI | `src/game/ai.ts` |
| Board logic (matches, specials, gravity) | `src/game/board.ts` |
| Portraits (SVG, palette-templated) | `src/gfx/art.ts`; canvas drawing/animation `src/gfx/portrait.ts` |
| Map places (SVG) | `src/gfx/places.ts` |
| Gems, skull, coin, cap (SVG) | `src/gfx/gemsvg.ts`; palette/sprites `src/gfx/gems.ts` |
| Sounds (all synthesized) | `src/core/audio.ts` |
| Menu scene (night block + neon) | `src/scenes/menu.ts` |
| Styles | `src/style.css` |

## Rules that bite

- **The sim mirrors the battle.** `src/sim/sim.ts` re-implements the rules of `scenes/battle.ts` without rendering. Any rule change (damage, perks, relic effects, modifiers, extra turns, supermoves) must be made in **both** places or the balance numbers lie.
- **New enemy checklist:** `ARCH` entry with a `habit` (and `g` if not masculine), portrait in `gfx/art.ts` (+ gallery palette), then check the „Nawyki potworów” block of the sim: a habit should cost roughly 25–35% HP in mid-run fights, like the others.
- **New hero checklist:** `CLASSES` entry (+ `short`, `she`, `traits`), portrait in `gfx/art.ts` (add to `ART` and the gallery palettes), supermove in `game/ult.ts`, starting spells, `SIGNATURES` in `flow.ts`, then tune HP with the sim until it sits with the others.
- **Gem types:** 7 (`FIRE WATER EARTH AIR SKULL COIN CAP` in `core/types.ts`). Adding one means: `GEM_TYPES`, `Board.weights`, the `counts` arrays (battle, sim, ai), `GEM_PAL`, `GEM_SVG`. Board save packs the type in 3 bits (max 8 types).
- **Saves** live in `localStorage` (`kamienkosc.run.v1`, `kamienkosc.meta.v1`, `kamienkosc.sound`). A run embeds its generated map; changing generators only affects new runs. Change `v`/key if the `Run` shape changes incompatibly. Mid-battle state is `BattleSave` in `game/run.ts`.
- **Everything generated comes from the run seed** (`rngFor(run, ...)`, `hash(...)`) so reloads reproduce the same map, enemies, shop and rewards. Don't use `Math.random()` for gameplay, only for visuals.
- **Art is inline SVG** rendered via data URLs and rasterized once per size (`portrait.ts`, `gems.ts`, `scenes/map.ts`). SVGs must be self-contained (no external refs; system fonts only for tiny text). No image files except the PWA icons in `public/`.
- **Mobile first.** Test at 375×812 (portrait layout) and a wide window (landscape layout: battle side panels, horizontal village map). The map scrolls vertically on phones.
- **Cisza nocna** (`BAL.quietAt`, `quietMult()` in `balance.ts`): after ~50 turns skulls hit ×2, then +1× every 20 turns, so healer-vs-shield fights can't stall. Keep it in both battle and sim.
- **Shops** appear only from floor 5 (`SHOP_FROM` in `game/map.ts`); earlier the player can't afford anything.
- **Two run lengths.** Short: 8 rows, 2–3 places per row, one boss. Long ("bilet dobowy"): 16 rows, 3–5 places, a halfway boss on row 7 („Szef dzielnicy” at the Dom Kultury, relic pick + `BAL.midHeal`) and a different final boss. Never assume 8 rows: use `run.map.rows`, `map.mid`, `isFinalBoss()`.
- **Enemy difficulty is not the row.** Always get enemies through `enemyFor(run, node, tier)`; it maps the row through `diffOf()` (short: row, long: row × `BAL.longStep`) and picks distinct bosses. Difficulty can be fractional and exceed 7 (`skullFor()`, boss `bossGrow`).
- Vite `base` is `./` — keep asset paths relative so Pages subpaths work.

## Balance

Target: a sensible player wins ~35% of short runs and ~30% of long ones, classes within a few points of each other, ordinary fights ~14 player turns (commute length), no sudden difficulty walls between floors, no stalled fights (check the „Długie walki” block: ≥40 turns should stay under ~1%).

```bash
npm run sim -- 1000 0.9                 # 1000 runs per class, player AI skill 0.9
npm run sim -- 500 0.9 long             # the same for the 16-floor run
BAL='{"bossHp":0.8}' npm run sim        # try knob values without editing code
```

The report shows win rate per class, where runs die (floor × enemy tier), HP lost and turns per fight by floor, and supermove usage. Tune in `BAL`, class HP/spells, or spell numbers; re-run until the table looks right, then commit the values.

## Verifying changes

Typecheck, build, and look at the change in the browser at phone size. For gameplay changes also run the sim. Commit messages are written in Polish, like the existing history.
