import { AIR, DARK, EARTH, FIRE, WATER } from '../core/types';
import type { Look } from '../gfx/portrait';
import { BAL } from './balance';
import type { Fighter } from './fighter';

export interface RelicDef { name: string; desc: string; elem: number }

export const RELICS: Record<string, RelicDef> = {
  emberheart: { name: 'Zapalniczka z odpustu', desc: 'Zaczynasz każdą walkę z 6 maną ognia. Działa za trzecim pstryknięciem.', elem: FIRE },
  tidestone: { name: 'Syfon z wodą sodową', desc: 'Zaczynasz każdą walkę z 6 maną wody.', elem: WATER },
  rootcharm: { name: 'Krasnal ogrodowy', desc: 'Zaczynasz każdą walkę z 6 maną ziemi. Patrzy na ciebie z wyrzutem.', elem: EARTH },
  stormfeather: { name: 'Wiatraczek z festynu', desc: 'Zaczynasz każdą walkę z 6 maną powietrza.', elem: AIR },
  skullring: { name: 'Sygnet po dziadku', desc: 'Twoje czaszki zadają +1 obrażeń. Dziadek by się ucieszył.', elem: DARK },
  goldtooth: { name: 'Złoty ząb wujka', desc: 'Monety dają podwójną kasę. Wujek i tak już nie gryzie.', elem: AIR },
  bandage: { name: 'Apteczka z malucha', desc: 'Po każdej wygranej walce leczysz dodatkowe 8 PŻ. Termin ważności: 1987.', elem: WATER },
  aegis: { name: 'Kożuch z bazaru', desc: 'Zaczynasz każdą walkę z 8 punktami tarczy.', elem: EARTH },
  hourglass: { name: 'Zegarek z komunii', desc: 'Pierwszy czar w każdej walce nie kończy tury.', elem: AIR },
  lens: { name: 'Słoik na zapas', desc: '+6 do maksymalnej many każdego koloru.', elem: WATER },
  chalice: { name: 'Kieliszek do nalewki', desc: 'Leczysz 1 PŻ za każdą zebraną czaszkę. Na zdrowie.', elem: DARK },
  warhorn: { name: 'Wuwuzela z Euro 2012', desc: 'Każda twoja dodatkowa tura zadaje wrogowi 3 obrażenia. Sąsiedzi też cierpią.', elem: FIRE },
  heartstone: { name: 'Tabletki na serce', desc: '+15 do maksymalnego zdrowia (i leczy 15). Brać po jedzeniu.', elem: FIRE },
  thorns: { name: 'Sweter od cioci', desc: 'Gdy czaszki wroga cię ranią, oddajesz 2 obrażenia. Gryzie wszystkich.', elem: EARTH },
  luckycoin: { name: 'Szczęśliwe pięć groszy', desc: 'Na planszy pojawia się więcej monet.', elem: AIR },
  runeflame: { name: 'Zimne ognie', desc: 'Każdy twój wybuch kamienia specjalnego zadaje 3 obrażenia.', elem: FIRE },
  compass: { name: 'Leżak z PRL-u', desc: 'Ognisko leczy 50% zdrowia zamiast 30%.', elem: EARTH },
  prismeye: { name: 'Horoskop z gazety', desc: 'Dopasowania 4+ dają 2 many każdego koloru. Gwiazdy mówią, że warto.', elem: DARK },
};

/** Numeric hero traits applied to the player's Fighter at the start of every fight (battle and sim). */
export interface HeroTraits { skull?: number; costAdd?: number; coinHit?: number; expMana?: number; caps?: number }

export interface ClassDef {
  name: string;
  desc: string;
  perk: string;
  hp: number;
  spells: string[];
  elem: number;
  look: Look;
  /** feminine grammar in end-of-run texts */
  she?: boolean;
  /** short name for tight HUD spots */
  short: string;
  traits?: HeroTraits;
}

export const CLASSES: Record<string, ClassDef> = {
  pyro: {
    name: 'Wujek Grillmistrz', short: 'Wujek',
    desc: 'Na każdej imprezie rodzinnej pilnuje rusztu. Brwi stracił w 2004.',
    perk: 'Każde dopasowanie czerwonych daje +2 many ognia.',
    hp: 61, spells: ['fireball', 'frenzy'], elem: FIRE,
    look: { art: 'grill', pal: { skin: '#f0b89a', acc: '#d8402c', eye: '#ffb43a' }, aura: '#ff5a3d', seed: 11 },
  },
  druid: {
    name: 'Babcia Zielarka', short: 'Babcia',
    desc: 'Przeżyła trzy ustroje i dwóch mężów. Ciebie też przeżyje.',
    perk: 'Każde dopasowanie zielonych leczy 1 PŻ.',
    hp: 64, spells: ['slipper', 'mend'], elem: EARTH, she: true,
    look: { art: 'babcia', pal: { skin: '#f2c4a8', acc: '#c8322a', eye: '#8dffb8', hair: '#bdb6b0' }, aura: '#35d27a', seed: 23 },
  },
  storm: {
    name: 'Kombinator', short: 'Kombinator',
    desc: 'Załatwi wszystko. Prąd bierze od sąsiada, manę od wroga.',
    perk: 'Dopasowania 4+ dają dodatkowo 3 many powietrza.',
    hp: 64, spells: ['chain', 'theft'], elem: AIR,
    look: { art: 'kombinator', pal: { skin: '#e8b494', acc: '#2a4ab8', eye: '#fff27a', hair: '#2a1a12' }, aura: '#ffcf3a', seed: 37 },
  },
  plumber: {
    name: 'Złota Rączka Mietek', short: 'Mietek',
    desc: 'Przyjdzie we wtorek. Nie mówił, który. Kuje, spawa, uszczelnia, bierze gotówką.',
    perk: 'Każdy wybuch bomby lub kamienia specjalnego daje 3 many wody.',
    hp: 73, spells: ['drip', 'chisel'], elem: WATER, traits: { expMana: 3 },
    look: { art: 'hydraulik', pal: { skin: '#eab08e', acc: '#2a64c8', eye: '#7ac8ff', hair: '#3a2616' }, aura: '#3a9aff', seed: 41 },
  },
  trader: {
    name: 'Pani Jadzia z bazaru', short: 'Jadzia',
    desc: 'Za pięć złotych to ja panu mogę co najwyżej współczuć. Stoisko nr 14, od 1991.',
    perk: 'Każda zebrana moneta rani wroga za 1. Rzuca drobnymi, celnie.',
    hp: 64, spells: ['change', 'bribe'], elem: AIR, she: true, traits: { coinHit: 1 },
    look: { art: 'bazarowa', pal: { skin: '#f0bea0', acc: '#c83a6a', eye: '#ffd86a', hair: '#d8762e' }, aura: '#dfe6ee', seed: 53 },
  },
  dres: {
    name: 'Seba z osiedla', short: 'Seba',
    desc: '„Na co się gapisz?” Magii nie ufa, ufa pięści i słonecznikowi.',
    perk: 'Jego czaszki biją o 1 mocniej, ale każdy czar kosztuje go 2 many więcej.',
    hp: 68, spells: ['rumble', 'stripes'], elem: FIRE, traits: { skull: 1, costAdd: 2 },
    look: { art: 'dres', pal: { skin: '#e8b08c', acc: '#26262e', eye: '#ff6a3a', hair: '#3a2a1e' }, aura: '#f2e6c8', seed: 61 },
  },
  seer: {
    name: 'Pani Bożenka, wróżka', short: 'Bożenka',
    desc: '„Widzę… widzę tu dużo czaszek. Pańskich.” Przyjmuje w środy, po serialu.',
    perk: 'Supermoc ładuje się już od 5 kapsli, ale los wybiera, która to będzie.',
    hp: 54, spells: ['grounds', 'tarot'], elem: DARK, she: true, traits: { caps: 5 },
    look: { art: 'wrozka', pal: { skin: '#e8b89a', acc: '#7a2ab8', eye: '#d86aff', hair: '#1e1420' }, aura: '#d86aff', seed: 71 },
  },
};

/** Applies a hero's numeric traits to the player's fighter (same in battle and sim). */
export function heroSetup(f: Fighter, cls: string) {
  const t = CLASSES[cls].traits ?? {};
  f.skull += t.skull ?? 0;
  f.costAdd = t.costAdd ?? 0;
  f.coinHit = t.coinHit ?? 0;
  f.expMana = t.expMana ?? 0;
  f.capsNeeded = t.caps ?? BAL.capsNeeded;
}

export interface ModDef { name: string; desc: string }

export const MODS: Record<string, ModDef> = {
  ice: { name: 'Gołoledź', desc: 'Część kamieni przymarzła. Nie ruszysz ich, ale lód pęka, gdy obok coś zniknie.' },
  storm: { name: 'Burza z gradem', desc: 'Co kilka tur piorun trafia w planszę. Wyłącz telewizor.' },
  bloodmoon: { name: 'Pełnia w poniedziałek', desc: 'Czaszki biją podwójnie. Obie strony, bez wyjątków.' },
  gold: { name: 'Dziesiąty', desc: 'Dzień wypłaty. Monety sypią się z każdej strony.' },
  arcane: { name: 'Turnus w sanatorium', desc: 'Mniej czaszek, więcej many. Wszyscy są jacyś spokojniejsi.' },
  cataclysm: { name: 'Sylwester u sąsiada', desc: 'Na planszy leżą niewypały. Znaczy się bomby.' },
};
