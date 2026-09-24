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
    id: 'shrine', title: 'Przydrożna kapliczka',
    text: 'Plastikowe kwiaty, znicz na baterie i tacka z drobnymi. Ktoś dba. Ktoś patrzy.',
    choices: [
      { label: 'Zmów zdrowaśkę', hint: 'Leczy 20 PŻ', pick: (r) => ({ text: `Robi ci się cieplej na sercu. Odzyskujesz ${heal(r, 20)} PŻ.` }) },
      {
        label: 'Zgarnij drobne z tacki', hint: '+45 zł, −6 maks. PŻ',
        pick: (r) => {
          r.gold += 45;
          r.maxHp -= 6;
          r.hp = Math.min(r.hp, r.maxHp);
          return { text: 'Znicz gaśnie. Coś cię strzyka w krzyżu i już nie przestanie.' };
        },
      },
    ],
  },
  {
    id: 'cups', title: 'Trzy kubki na bazarze',
    text: 'Pan w skórzanej kurtce przekłada kubki szybciej, niż myślisz. „Gdzie kulka, szefie? Pewny zarobek!"',
    choices: [
      {
        label: 'Postaw 30 zł', hint: '50% szans na podwojenie', ok: (r) => r.gold >= 30,
        pick: (r, rng) => {
          if (rng.chance(0.5)) {
            r.gold += 30;
            return { text: 'Kulka jest tam, gdzie wskazałeś. Pan patrzy na kolegę w tłumie. Kolega wzrusza ramionami. Wygrywasz 60 zł.' };
          }
          r.gold -= 30;
          return { text: 'Kubek jest pusty. Wszystkie są puste. Pana już nie ma, stolika też.' };
        },
      },
      { label: 'Nie dzisiaj', hint: 'Nic się nie dzieje', pick: () => ({ text: '„Frajer!" — słyszysz za plecami. Przynajmniej masz jeszcze portfel.' }) },
    ],
  },
  {
    id: 'spring', title: 'Cudowne źródełko',
    text: 'Z rury przy drodze leci woda, która podobno leczy wszystko. Kolejka emerytów z baniakami sięga do lasu.',
    choices: [
      { label: 'Napij się prosto z rury', hint: 'Ulepsz jeden czar', pick: () => ({ text: 'Smakuje żelazem i obietnicą. Czujesz przypływ mocy. Wybierz czar do ulepszenia.', then: 'upgrade' }) },
      { label: 'Nabierz do butelki po coli', hint: 'Leczy 12 PŻ', pick: (r) => ({ text: `Po trzech łykach przestaje strzykać w kolanie. Odzyskujesz ${heal(r, 12)} PŻ.` }) },
    ],
  },
  {
    id: 'zdzisio', title: 'Pan Zdzisio pod sklepem',
    text: 'Leży na ławce przed monopolowym i ściska w dłoni coś błyszczącego. „Młody… pomóż wstać… odwdzięczę się…"',
    choices: [
      {
        label: 'Pomóż mu wstać', hint: '−10 PŻ, dostajesz relikt', ok: (r) => r.hp > 10,
        pick: (r) => {
          r.hp -= 10;
          return { text: 'Pan Zdzisio waży więcej, niż wygląda, i ląduje na tobie dwa razy. W podzięce wciska ci swój skarb.', then: 'relic' };
        },
      },
      {
        label: 'Sprawdź, czy mu coś nie wypadło', hint: '+25 zł', pick: (r) => {
          r.gold += 25;
          return { text: 'Wypadło. Z kieszeni, prosto do twojej. Pan Zdzisio chrapie dalej.' };
        },
      },
    ],
  },
  {
    id: 'scrap', title: 'Skup złomu po godzinach',
    text: 'Brama uchylona, stróż śpi, a na placu leży kabel miedziany. Dużo kabla. Coś w stosie żeliwa oddycha.',
    choices: [
      {
        label: 'Wynieś miedź', hint: '+60 zł, ale ktoś się budzi',
        pick: (r) => {
          r.gold += 60;
          return { text: 'Kabel brzęczy o bramę. Stos żeliwa podnosi się i ma pretensje.', then: 'battle' };
        },
      },
      { label: 'Wycofaj się', hint: 'Bezpiecznie', pick: () => ({ text: 'Żeliwo przestaje oddychać. Może tylko ci się zdawało.' }) },
    ],
  },
  {
    id: 'paper', title: 'Stos makulatury',
    text: 'Pod blokiem ktoś wystawił paczki starych gazet i jedną grubą księgę: „Poradnik domowego czarodzieja, wyd. 1978".',
    choices: [
      { label: 'Poczytaj', hint: 'Naucz się nowego czaru', pick: () => ({ text: 'Między przepisem na bigos a instrukcją obsługi pralki Frania znajdujesz prawdziwe zaklęcia.', then: 'learn' }) },
      {
        label: 'Oddaj na skup', hint: '+35 zł', pick: (r) => {
          r.gold += 35;
          return { text: 'Pani w skupie waży księgę, marszczy brwi i płaci bez słowa. Podejrzanie dużo.' };
        },
      },
    ],
  },
  {
    id: 'fortune', title: 'Wróżka Esmeralda (z ogłoszenia)',
    text: 'Pokój z dywanem na ścianie, kryształowa kula z IKEA i kot, który wie za dużo. „Karty mówią, że czegoś potrzebujesz."',
    choices: [
      {
        label: 'Oddaj krew „do rytuału"', hint: '−12 PŻ, ulepsz czar', ok: (r) => r.hp > 12,
        pick: (r) => {
          r.hp -= 12;
          return { text: 'Esmeralda chowa fiolkę do lodówki obok jajek. Coś w tobie zaczyna iskrzyć.', then: 'upgrade' };
        },
      },
      {
        label: 'Zapłać za wróżbę', hint: '−40 zł, +8 maks. PŻ', ok: (r) => r.gold >= 40,
        pick: (r) => {
          r.gold -= 40;
          r.maxHp += 8;
          r.hp += 8;
          return { text: '„Będziesz żył długo." Wierzysz jej. Za te pieniądze musisz.' };
        },
      },
      { label: 'Wyjdź, zanim kot coś powie', hint: 'Nic się nie dzieje', pick: () => ({ text: 'Kot odprowadza cię wzrokiem aż do klatki schodowej.' }) },
    ],
  },
  {
    id: 'mushrooms', title: 'Grzybobranie',
    text: 'Pod sosną rośnie grzyb, którego nie ma w atlasie. Kapelusz ma w kropki. Wygląda smacznie. Wszystkie tak wyglądają.',
    choices: [
      {
        label: 'Zjedz na surowo', hint: 'Ryzykowne', pick: (r, rng) => {
          if (rng.chance(0.55)) {
            r.maxHp += 10;
            r.hp += 10;
            return { text: 'Przez godzinę rozmawiasz z jeżem o polityce. Potem czujesz się silniejszy: +10 maks. PŻ.' };
          }
          r.hp = Math.max(1, r.hp - 10);
          return { text: 'Jeż miał rację. Tracisz 10 PŻ i trochę godności.' };
        },
      },
      { label: 'Zanieś babci do sprawdzenia', hint: 'Leczy 8 PŻ', pick: (r) => ({ text: `Babcia wyrzuca grzyba, ale robi ci herbatę z sokiem. Odzyskujesz ${heal(r, 8)} PŻ.` }) },
    ],
  },
  {
    id: 'wedding', title: 'Wesele w remizie',
    text: 'Disco polo na cały regulator, wódka na stole, a wujek panny młodej wciąga cię do tańca. Nikt nie pyta, czyj jesteś.',
    choices: [
      {
        label: 'Zostań do oczepin', hint: '+30 zł, −8 PŻ',
        pick: (r) => {
          r.gold += 30;
          r.hp = Math.max(1, r.hp - 8);
          return { text: 'Łapiesz krawat, wygrywasz zakład z wujkiem i budzisz się w stodole. Kieszenie pełne, głowa pusta.' };
        },
      },
      { label: 'Zjedz i uciekaj', hint: 'Leczy 15 PŻ', pick: (r) => ({ text: `Rosół, schabowy, trzy rodzaje ciasta. Odzyskujesz ${heal(r, 15)} PŻ i wychodzisz przed „Jedzie pociąg z daleka".` }) },
    ],
  },
];
