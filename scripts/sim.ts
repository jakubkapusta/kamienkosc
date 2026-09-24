// Balance report: npm run sim -- [runsPerClass] [skill]
import { BAL } from '../src/game/balance';
import { CLASS_IDS, simRun, type RunOut } from '../src/sim/sim';

if (process.env.BAL) Object.assign(BAL, JSON.parse(process.env.BAL));

const runs = Number(process.argv[2] ?? 300);
const skills = process.argv[3] ? [Number(process.argv[3])] : [0.9, 0.6];
const pct = (a: number, b: number) => (b ? `${((a / b) * 100).toFixed(1)}%` : '—');
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

for (const skill of skills) {
  console.log(`\n=== skill ${skill} · ${runs} wypraw na klasę ===`);
  const all: RunOut[] = [];
  for (const cls of CLASS_IDS) {
    const res: RunOut[] = [];
    for (let i = 0; i < runs; i++) res.push(await simRun(cls, 1000 + i * 7919, skill));
    all.push(...res);
    const wins = res.filter((r) => r.won).length;
    const reachedBoss = res.filter((r) => r.bossHp !== null);
    console.log(`${cls.padEnd(6)} wygrane ${pct(wins, runs).padStart(6)} · doszło do bossa ${pct(reachedBoss.length, runs).padStart(6)} · boss pokonany ${pct(wins, reachedBoss.length).padStart(6)} · PŻ przed bossem ${(avg(reachedBoss.map((r) => r.bossHp!)) * 100).toFixed(0)}%`);
  }
  const deaths = all.filter((r) => !r.won);
  console.log('\nGdzie giną (piętro 1–8, rodzaj):');
  for (let row = 0; row < 8; row++) {
    const d = deaths.filter((r) => r.deathRow === row);
    if (!d.length) continue;
    const by = (t: string) => d.filter((r) => r.deathTier === t).length;
    console.log(`  piętro ${row + 1}: ${pct(d.length, all.length).padStart(6)} wszystkich wypraw  (zadyma ${by('normal')}, gruba ryba ${by('elite')}, szef ${by('boss')}, wydarzenie ${by('event')})`);
  }
  const battles = all.flatMap((r) => r.battles);
  console.log(`\nSupermoc: średnio ${avg(battles.map((b) => b.ults)).toFixed(2)} na walkę, w ${pct(battles.filter((b) => b.ults > 0).length, battles.length)} walk przynajmniej raz`);
  console.log('\nWalki wg piętra: śr. utrata PŻ (% maks.) · śr. tur gracza · przegrane');
  for (let row = 0; row < 8; row++) {
    for (const tier of ['normal', 'elite', 'boss'] as const) {
      const b = battles.filter((x) => x.row === row && x.tier === tier);
      if (b.length < 5) continue;
      console.log(`  piętro ${row + 1} ${tier.padEnd(6)} n=${String(b.length).padStart(4)}  −${(avg(b.map((x) => x.hpLoss)) * 100).toFixed(0).padStart(3)}% PŻ  ${avg(b.map((x) => x.turns)).toFixed(1).padStart(5)} tur  przegrane ${pct(b.filter((x) => !x.won).length, b.length)}`);
    }
  }
}
