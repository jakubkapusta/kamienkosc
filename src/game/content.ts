import { AIR, DARK, EARTH, FIRE, WATER } from '../core/types';
import type { Look } from '../gfx/portrait';

export interface RelicDef { name: string; desc: string; elem: number }

export const RELICS: Record<string, RelicDef> = {
  emberheart: { name: 'Serce żaru', desc: 'Zaczynasz każdą walkę z 6 maną ognia.', elem: FIRE },
  tidestone: { name: 'Kamień przypływu', desc: 'Zaczynasz każdą walkę z 6 maną wody.', elem: WATER },
  rootcharm: { name: 'Amulet korzeni', desc: 'Zaczynasz każdą walkę z 6 maną ziemi.', elem: EARTH },
  stormfeather: { name: 'Pióro burzy', desc: 'Zaczynasz każdą walkę z 6 maną powietrza.', elem: AIR },
  skullring: { name: 'Pierścień z czaszką', desc: 'Twoje czaszki zadają +1 obrażeń.', elem: DARK },
  goldtooth: { name: 'Złoty ząb', desc: 'Monety dają podwójne złoto.', elem: AIR },
  bandage: { name: 'Bandaż kapłana', desc: 'Po każdej wygranej walce leczysz dodatkowe 8 PŻ.', elem: WATER },
  aegis: { name: 'Tarcza przodków', desc: 'Zaczynasz każdą walkę z 8 punktami tarczy.', elem: EARTH },
  hourglass: { name: 'Klepsydra', desc: 'Pierwszy czar w każdej walce nie kończy tury.', elem: AIR },
  lens: { name: 'Soczewka many', desc: '+6 do maksymalnej many każdego koloru.', elem: WATER },
  chalice: { name: 'Kielich wampira', desc: 'Leczysz 1 PŻ za każdą zebraną czaszkę.', elem: DARK },
  warhorn: { name: 'Róg wojenny', desc: 'Każda twoja dodatkowa tura zadaje wrogowi 3 obrażenia.', elem: FIRE },
  heartstone: { name: 'Kamień serca', desc: '+15 do maksymalnego zdrowia (i leczy 15).', elem: FIRE },
  thorns: { name: 'Cierniowa zbroja', desc: 'Gdy czaszki wroga cię ranią, oddajesz 2 obrażenia.', elem: EARTH },
  luckycoin: { name: 'Szczęśliwa moneta', desc: 'Na planszy pojawia się więcej monet.', elem: AIR },
  runeflame: { name: 'Runa płomieni', desc: 'Każdy twój wybuch kamienia specjalnego zadaje 3 obrażenia.', elem: FIRE },
  compass: { name: 'Kompas pielgrzyma', desc: 'Odpoczynek leczy 50% zdrowia zamiast 30%.', elem: EARTH },
  prismeye: { name: 'Pryzmatyczne oko', desc: 'Dopasowania 4+ dają 2 many każdego koloru.', elem: DARK },
};

export interface ClassDef { name: string; desc: string; perk: string; hp: number; spells: string[]; elem: number; look: Look }

export const CLASSES: Record<string, ClassDef> = {
  pyro: {
    name: 'Piromanta',
    desc: 'Szklane działo. Pali wszystko, co stanie na drodze.',
    perk: 'Każde dopasowanie czerwonych daje +2 many ognia.',
    hp: 60, spells: ['fireball', 'frenzy'], elem: FIRE,
    look: { kind: 'hood', skin: '#ccc', skin2: '#333', eye: '#ffb43a', aura: '#ff5a3d', eyes: 2, horns: 0, hornLen: 0, ears: 0, teeth: 0, fangs: false, headW: 1, headH: 1, crown: false, seed: 11, cloth: '#6a1d12', orb: '#ff7a2a' },
  },
  druid: {
    name: 'Druid',
    desc: 'Wytrzymały strażnik gaju. Wygrywa na wyczerpanie.',
    perk: 'Każde dopasowanie zielonych leczy 2 PŻ.',
    hp: 74, spells: ['stoneskin', 'mend'], elem: EARTH,
    look: { kind: 'hood', skin: '#ccc', skin2: '#333', eye: '#8dffb8', aura: '#35d27a', eyes: 2, horns: 0, hornLen: 0, ears: 0, teeth: 0, fangs: false, headW: 1, headH: 1, crown: false, seed: 23, cloth: '#1d4a2a', orb: '#5fe08a' },
  },
  storm: {
    name: 'Burzołap',
    desc: 'Zwinny złodziej many. Kontroluje planszę.',
    perk: 'Dopasowania 4+ dają dodatkowo 3 many powietrza.',
    hp: 56, spells: ['chain', 'theft'], elem: AIR,
    look: { kind: 'hood', skin: '#ccc', skin2: '#333', eye: '#fff27a', aura: '#ffcf3a', eyes: 2, horns: 0, hornLen: 0, ears: 0, teeth: 0, fangs: false, headW: 1, headH: 1, crown: false, seed: 37, cloth: '#27305e', orb: '#ffe14a' },
  },
};

export interface ModDef { name: string; desc: string }

export const MODS: Record<string, ModDef> = {
  ice: { name: 'Wieczna zmarzlina', desc: 'Część kamieni skuł lód — nie da się ich przesuwać. Lód pęka, gdy obok zniknie kamień.' },
  storm: { name: 'Burza', desc: 'Co kilka tur piorun rozbija losowe kamienie.' },
  bloodmoon: { name: 'Krwawy księżyc', desc: 'Czaszki zadają podwójne obrażenia. Obu stronom.' },
  gold: { name: 'Gorączka złota', desc: 'Na planszy roi się od monet.' },
  arcane: { name: 'Przypływ many', desc: 'Mniej czaszek, więcej kamieni many.' },
  cataclysm: { name: 'Kataklizm', desc: 'Plansza zaczyna z kilkoma bombami.' },
};
