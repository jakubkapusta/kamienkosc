import type { RNG } from '../core/rng';
import type { Run } from './run';

export interface EvOutcome { text: string; then?: 'battle' | 'upgrade' | 'learn' | 'relic' }
export interface EvChoice { label: string; hint: string; ok?: (r: Run) => boolean; pick: (r: Run, rng: RNG) => EvOutcome }
export interface EventDef { id: string; title: string; text: string; choices: EvChoice[] }

const heal = (r: Run, n: number) => {
  const v = Math.min(n, r.maxHp - r.hp);
  r.hp += v;
  return v;
};

export const EVENTS: EventDef[] = [
  {
    id: 'shrine', title: 'Kapliczka zapomnianego boga',
    text: 'W kamiennej niszy tli się błękitny płomień. Ktoś zostawił tu ofiary — kilka monet i suszone kwiaty.',
    choices: [
      { label: 'Pomódl się', hint: 'Leczy 20 PŻ', pick: (r) => ({ text: `Ciepło rozlewa się po ciele. Odzyskujesz ${heal(r, 20)} PŻ.` }) },
      {
        label: 'Zabierz ofiary', hint: '+45 złota, −6 maks. PŻ',
        pick: (r) => {
          r.gold += 45;
          r.maxHp -= 6;
          r.hp = Math.min(r.hp, r.maxHp);
          return { text: 'Płomień gaśnie z sykiem. Czujesz, że coś zostało ci odebrane.' };
        },
      },
    ],
  },
  {
    id: 'gambler', title: 'Kościany szuler',
    text: 'Szkielet w podartym kapeluszu grzechocze kubkiem. „Zagrasz, wędrowcze? Podwajam albo biorę wszystko."',
    choices: [
      {
        label: 'Postaw 30 złota', hint: '50% szans na podwojenie', ok: (r) => r.gold >= 30,
        pick: (r, rng) => {
          if (rng.chance(0.5)) {
            r.gold += 30;
            return { text: 'Kości turlają się… szóstki! Szkielet klnie i wypłaca 60 złota.' };
          }
          r.gold -= 30;
          return { text: 'Jedynki. Szkielet chichocze, zgarniając twoje złoto.' };
        },
      },
      { label: 'Odejdź', hint: 'Nic się nie dzieje', pick: () => ({ text: 'Szkielet wzrusza ramionami — aż mu stukają obojczyki.' }) },
    ],
  },
  {
    id: 'well', title: 'Studnia many',
    text: 'Z głębi studni bije opalizujące światło. Woda brzęczy jak struna.',
    choices: [
      { label: 'Napij się', hint: 'Ulepsz jeden czar', pick: () => ({ text: 'Moc przepływa przez twoje dłonie. Wybierz czar do ulepszenia.', then: 'upgrade' }) },
      { label: 'Napełnij bukłak', hint: 'Leczy 12 PŻ', pick: (r) => ({ text: `Woda smakuje jak burza. Odzyskujesz ${heal(r, 12)} PŻ.` }) },
    ],
  },
  {
    id: 'knight', title: 'Ranny rycerz',
    text: 'Pod drzewem siedzi rycerz w pogiętej zbroi. Ściska amulet, a z rany sączy się czarna posoka.',
    choices: [
      {
        label: 'Opatrz go', hint: '−10 PŻ, dostajesz relikt', ok: (r) => r.hp > 10,
        pick: (r) => {
          r.hp -= 10;
          return { text: 'Wysysasz truciznę. Rycerz w podzięce wciska ci swój amulet.', then: 'relic' };
        },
      },
      {
        label: 'Przeszukaj go', hint: '+25 złota', pick: (r) => {
          r.gold += 25;
          return { text: 'Rycerz nie protestuje. Chyba już nie może.' };
        },
      },
    ],
  },
  {
    id: 'cave', title: 'Kryształowa grota',
    text: 'Ściany groty porastają pulsujące kryształy. W głębi coś oddycha.',
    choices: [
      {
        label: 'Wyłup kryształy', hint: '+60 złota, ale strażnik się budzi',
        pick: (r) => {
          r.gold += 60;
          return { text: 'Kryształy pękają z dźwiękiem dzwonów. Z ciemności wyłania się strażnik!', then: 'battle' };
        },
      },
      { label: 'Wycofaj się', hint: 'Bezpiecznie', pick: () => ({ text: 'Oddech w głębi cichnie. Może to i lepiej.' }) },
    ],
  },
  {
    id: 'tome', title: 'Porzucona księga',
    text: 'Na pniu leży księga oprawiona w smoczą łuskę. Strony same się przewracają.',
    choices: [
      { label: 'Czytaj', hint: 'Naucz się nowego czaru', pick: () => ({ text: 'Litery wypalają się w twojej pamięci.', then: 'learn' }) },
      {
        label: 'Sprzedaj ją', hint: '+35 złota', pick: (r) => {
          r.gold += 35;
          return { text: 'Wędrowny kupiec płaci bez targowania. Podejrzanie szybko.' };
        },
      },
    ],
  },
  {
    id: 'altar', title: 'Ołtarz krwi',
    text: 'Czarny kamień jest ciepły w dotyku. Wyryte runy układają się w jedno słowo: DAJ.',
    choices: [
      {
        label: 'Upuść krew', hint: '−12 PŻ, ulepsz czar', ok: (r) => r.hp > 12,
        pick: (r) => {
          r.hp -= 12;
          return { text: 'Runy rozbłyskują szkarłatem.', then: 'upgrade' };
        },
      },
      {
        label: 'Złóż złoto', hint: '−40 złota, +8 maks. PŻ', ok: (r) => r.gold >= 40,
        pick: (r) => {
          r.gold -= 40;
          r.maxHp += 8;
          r.hp += 8;
          return { text: 'Złoto topi się jak wosk. Serce bije ci mocniej.' };
        },
      },
      { label: 'Odejdź', hint: 'Nic się nie dzieje', pick: () => ({ text: 'Ołtarz stygnie za twoimi plecami.' }) },
    ],
  },
  {
    id: 'mushrooms', title: 'Grzybowy krąg',
    text: 'Fosforyzujące grzyby tworzą idealny krąg. Pachną miodem i żelazem.',
    choices: [
      {
        label: 'Zjedz jednego', hint: 'Ryzykowne', pick: (r, rng) => {
          if (rng.chance(0.55)) {
            r.maxHp += 10;
            r.hp += 10;
            return { text: 'Świat na chwilę staje się kolorowy. Czujesz się silniejszy: +10 maks. PŻ.' };
          }
          r.hp = Math.max(1, r.hp - 10);
          return { text: 'Skręca cię w pół. Tracisz 10 PŻ.' };
        },
      },
      { label: 'Zatańcz w kręgu', hint: 'Leczy 8 PŻ', pick: (r) => ({ text: `Wróżki chichoczą gdzieś w liściach. Odzyskujesz ${heal(r, 8)} PŻ.` }) },
    ],
  },
];
