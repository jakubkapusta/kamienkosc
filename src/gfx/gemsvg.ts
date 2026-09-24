import { mixHex } from './color';

/**
 * Gem, skull and coin illustrations as SVG (100×100). Cuts are generated facet by facet
 * and lit from the top-left, so every stone reads like a real faceted gem.
 */

type V = [number, number];
interface GP { dark: string; base: string; light: string; glint: string }

const OUT = '#1a0f16';
const C: V = [50, 50];
const LX = -0.55, LY = -0.83;

const pts = (a: V[]) => a.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
const mid = (a: V, b: V): V => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
const toward = (v: V, k: number, c: V = C): V => [c[0] + (v[0] - c[0]) * k, c[1] + (v[1] - c[1]) * k];
const centroid = (a: V[]): V => [a.reduce((s, p) => s + p[0], 0) / a.length, a.reduce((s, p) => s + p[1], 0) / a.length];

function lightAt(p: V, c: V = C) {
  const dx = p[0] - c[0], dy = p[1] - c[1];
  const d = Math.hypot(dx, dy) || 1;
  return (dx / d) * LX + (dy / d) * LY; // -1 … 1
}

function tone(g: GP, s: number) {
  s = Math.max(0, Math.min(1, s));
  return s < 0.5 ? mixHex(g.dark, g.base, s * 2) : mixHex(g.base, g.light, (s - 0.5) * 2);
}

function facet(poly: V[], g: GP, s: number) {
  return `<polygon points="${pts(poly)}" fill="${tone(g, s)}" stroke="${mixHex(g.light, '#ffffff', 0.4)}" stroke-opacity=".28" stroke-width=".5" stroke-linejoin="round"/>`;
}

function defs(g: GP, id: string) {
  return `<defs>
<linearGradient id="${id}t" x1=".1" y1=".05" x2=".85" y2=".95"><stop offset="0" stop-color="${g.light}"/><stop offset=".55" stop-color="${g.base}"/><stop offset="1" stop-color="${mixHex(g.base, g.dark, 0.4)}"/></linearGradient>
<radialGradient id="${id}s" cx=".3" cy=".22" r=".42"><stop offset="0" stop-color="#fff" stop-opacity=".62"/><stop offset=".35" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<radialGradient id="${id}i" cx=".55" cy=".7" r=".6"><stop offset="0" stop-color="${g.light}" stop-opacity=".35"/><stop offset="1" stop-color="${g.light}" stop-opacity="0"/></radialGradient>
<radialGradient id="${id}sh" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
</defs>`;
}

const shadow = (id: string, y = 93) => `<ellipse cx="50" cy="${y}" rx="36" ry="6.5" fill="url(#${id}sh)"/>`;

function sparkle(x: number, y: number, r: number) {
  const k = r * 0.16;
  return `<path d="M${x} ${y - r} L${x + k} ${y - k} L${x + r} ${y} L${x + k} ${y + k} L${x} ${y + r} L${x - k} ${y + k} L${x - r} ${y} L${x - k} ${y - k} Z" fill="#fff"/>
<circle cx="${x}" cy="${y}" r="${r * 0.28}" fill="#fff"/>`;
}

/** Brilliant-style crown: table, star facets, kites and upper-girdle facets. */
function brilliant(outer: V[], g: GP, id: string, o: { tableK?: number; round?: number } = {}) {
  const n = outer.length;
  const tk = o.tableK ?? 0.5;
  const onRim = (a: V, b: V): V => {
    const m = mid(a, b);
    if (!o.round) return m;
    const d = Math.hypot(m[0] - C[0], m[1] - C[1]) || 1;
    return [C[0] + ((m[0] - C[0]) / d) * o.round, C[1] + ((m[1] - C[1]) / d) * o.round];
  };
  const T = outer.map((v) => toward(v, tk, [50, 47]));
  const M = outer.map((v, i) => onRim(v, outer[(i + 1) % n]));
  const S = M.map((m, i) => toward(mid(m, mid(T[i], T[(i + 1) % n])), 1, C));
  let f = '';
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, h = (i + n - 1) % n;
    const g1: V[] = [S[i], outer[i], M[i]], g2: V[] = [S[i], M[i], outer[j]];
    f += facet(g1, g, 0.24 + 0.42 * lightAt(centroid(g1)) + (i % 2 ? 0.06 : -0.05));
    f += facet(g2, g, 0.2 + 0.42 * lightAt(centroid(g2)) + (i % 2 ? -0.04 : 0.07));
    const kite: V[] = [T[i], S[h], outer[i], S[i]];
    f += facet(kite, g, 0.36 + 0.46 * lightAt(centroid(kite)));
    const star: V[] = [T[i], T[j], S[i]];
    f += facet(star, g, 0.5 + 0.4 * lightAt(centroid(star)));
  }
  const tc = centroid(T);
  const refl = T.map((t, i) => `<line x1="${tc[0]}" y1="${tc[1]}" x2="${t[0].toFixed(2)}" y2="${t[1].toFixed(2)}" stroke="${i % 2 ? g.dark : '#fff'}" stroke-opacity="${i % 2 ? 0.18 : 0.22}" stroke-width=".7"/>`).join('');
  const inner = T.map((t) => toward(t, 0.55, tc));
  return { facets: f, table: `<polygon points="${pts(T)}" fill="url(#${id}t)" stroke="#fff" stroke-opacity=".5" stroke-width=".6"/>${refl}<polygon points="${pts(inner)}" fill="none" stroke="${g.base}" stroke-opacity=".35" stroke-width=".6"/>` };
}

function gemSVG(outline: string, outer: V[], g: GP, id: string, o: { tableK?: number; round?: number; clip?: string } = {}) {
  const b = brilliant(outer, g, id, o);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">${defs(g, id)}
${shadow(id)}
<clipPath id="${id}c">${outline}</clipPath>
<g clip-path="url(#${id}c)">
<rect width="100" height="100" fill="${g.dark}"/>
${b.facets}${b.table}
<rect width="100" height="100" fill="url(#${id}i)"/>
<rect width="100" height="100" fill="url(#${id}s)"/>
</g>
${outline.replace('/>', ` fill="none" stroke="${OUT}" stroke-width="2.6" stroke-linejoin="round"/>`)}
${outline.replace('/>', ` fill="none" stroke="${g.glint}" stroke-opacity=".45" stroke-width=".9" stroke-linejoin="round" transform="translate(50 50) scale(.93) translate(-50 -50)"/>`)}
${sparkle(34, 30, 9)}
</svg>`;
}

const RUBY: GP = { dark: '#3e020c', base: '#d4142a', light: '#ff7a7e', glint: '#ffe0dc' };
const SAPPHIRE: GP = { dark: '#04124a', base: '#1a66e8', light: '#7cc4ff', glint: '#e0f4ff' };
const EMERALD: GP = { dark: '#02361a', base: '#14ae54', light: '#9cf0b8', glint: '#eafff0' };
const TOPAZ: GP = { dark: '#6a3200', base: '#f7a800', light: '#ffe27a', glint: '#fffbe0' };

function ruby() {
  const outer: V[] = Array.from({ length: 6 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 3;
    return [50 + Math.cos(a) * 43, 49 + Math.sin(a) * 45];
  });
  return gemSVG(`<polygon points="${pts(outer)}"/>`, outer, RUBY, 'r');
}

function sapphire() {
  const R = 42;
  const outer: V[] = Array.from({ length: 8 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 4;
    return [50 + Math.cos(a) * R, 49 + Math.sin(a) * R];
  });
  return gemSVG(`<circle cx="50" cy="49" r="${R}"/>`, outer, SAPPHIRE, 's', { round: R, tableK: 0.52 });
}

function topaz() {
  const outer: V[] = [[50, 7], [92, 82], [8, 82]];
  const d = `M50 6 Q57 7 94 76 Q97 84 88 85 L12 85 Q3 84 6 76 Q43 7 50 6 Z`;
  return gemSVG(`<path d="${d}"/>`, outer, TOPAZ, 'y', { tableK: 0.46 });
}

function emerald() {
  const g = EMERALD, id = 'e';
  // step cut: concentric octagons, each band split into sides and corners
  const oct = (w: number, h: number, c: number): V[] => [
    [50 - w + c, 49 - h], [50 + w - c, 49 - h], [50 + w, 49 - h + c], [50 + w, 49 + h - c],
    [50 + w - c, 49 + h], [50 - w + c, 49 + h], [50 - w, 49 + h - c], [50 - w, 49 - h + c],
  ];
  const rings = [oct(38, 43, 13), oct(31, 36, 10.5), oct(24.5, 29, 8), oct(18, 22.5, 6)];
  let f = '';
  for (let r = 0; r < rings.length - 1; r++) {
    const A = rings[r], B = rings[r + 1];
    for (let i = 0; i < 8; i++) {
      const j = (i + 1) % 8;
      const q: V[] = [A[i], A[j], B[j], B[i]];
      f += facet(q, g, 0.28 + r * 0.1 + 0.42 * lightAt(centroid(q)));
    }
  }
  const T = rings[3];
  const outline = `<polygon points="${pts(rings[0])}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">${defs(g, id)}
${shadow(id)}
<clipPath id="ec">${outline}</clipPath>
<g clip-path="url(#ec)">
<rect width="100" height="100" fill="${g.dark}"/>${f}
<polygon points="${pts(T)}" fill="url(#et)" stroke="#fff" stroke-opacity=".45" stroke-width=".6"/>
<path d="M36 34 L64 64 M40 30 L68 58" stroke="#fff" stroke-opacity=".18" stroke-width="1.2"/>
<rect width="100" height="100" fill="url(#ei)"/><rect width="100" height="100" fill="url(#es)"/>
</g>
${outline.replace('/>', ` fill="none" stroke="${OUT}" stroke-width="2.6" stroke-linejoin="round"/>`)}
${sparkle(33, 26, 8.5)}
</svg>`;
}

function skull() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
<defs>
<radialGradient id="b" cx=".36" cy=".26" r=".85"><stop offset="0" stop-color="#fffdf5"/><stop offset=".5" stop-color="#e9dcbc"/><stop offset="1" stop-color="#9a8260"/></radialGradient>
<radialGradient id="eg" cx=".5" cy=".55" r=".5"><stop offset="0" stop-color="#ffd0a0"/><stop offset=".3" stop-color="#ff3a22"/><stop offset="1" stop-color="#ff0000" stop-opacity="0"/></radialGradient>
<linearGradient id="au" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff4c2"/><stop offset=".5" stop-color="#e8b53e"/><stop offset="1" stop-color="#8a5a12"/></linearGradient>
<radialGradient id="ksh" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
</defs>
<ellipse cx="50" cy="93" rx="30" ry="6" fill="url(#ksh)"/>
<path d="M33 70 C33 82 40 88 50 88 C60 88 67 82 67 70 Z" fill="url(#b)" stroke="${OUT}" stroke-width="2.4" stroke-linejoin="round"/>
<path d="M50 8 C72 8 86 23 86 43 C86 54 81 60 76 64 L75 71 C70 75 63 76 60 73 L59 77 L41 77 L40 73 C37 76 30 75 25 71 L24 64 C19 60 14 54 14 43 C14 23 28 8 50 8 Z" fill="url(#b)" stroke="${OUT}" stroke-width="2.6" stroke-linejoin="round"/>
<path d="M14 43 C14 54 19 60 24 64 L25 71 C21 66 18 58 19 49 Z M86 43 C86 54 81 60 76 64 L75 71 C79 66 82 58 81 49 Z" fill="${OUT}" opacity=".22"/>
<path d="M22 34 C30 30 38 31 42 36" fill="none" stroke="${OUT}" stroke-width="1" opacity=".3"/>
<path d="M22 45 C22 35 33 31 40 35 C46 39 45 52 37 55 C28 58 22 53 22 45 Z" fill="#1b090b" stroke="${OUT}" stroke-width="1.6"/>
<path d="M78 45 C78 35 67 31 60 35 C54 39 55 52 63 55 C72 58 78 53 78 45 Z" fill="#1b090b" stroke="${OUT}" stroke-width="1.6"/>
<circle cx="32" cy="45" r="8" fill="url(#eg)"/><circle cx="68" cy="45" r="8" fill="url(#eg)"/>
<circle cx="32" cy="45" r="2" fill="#fff4e0"/><circle cx="68" cy="45" r="2" fill="#fff4e0"/>
<path d="M50 54 C46 58 45 64 48 66 L50 64 L52 66 C55 64 54 58 50 54 Z" fill="#1b090b"/>
<path d="M36 69 L64 69" stroke="${OUT}" stroke-width="1.4"/>
<path d="M38 66 L38 76 M44 67 L44 77 M50 67 L50 77 M56 67 L56 77 M62 66 L62 76" stroke="${OUT}" stroke-width="1.3"/>
<path d="M36 72 C40 80 60 80 64 72 M40 74 L40 81 M46 75 L46 83 M54 75 L54 83 M60 74 L60 81" fill="none" stroke="${OUT}" stroke-width="1.2" opacity=".7"/>
<rect x="44.8" y="67.5" width="4.6" height="8.6" rx="1" fill="url(#au)" stroke="${OUT}" stroke-width=".8"/>
<path d="M46 69 L46 74" stroke="#fff" stroke-width=".9" opacity=".8"/>
<path d="M61 11 L58 20 L63 25 L60 31" fill="none" stroke="${OUT}" stroke-width="1.4" stroke-linejoin="round"/>
<ellipse cx="36" cy="19" rx="11" ry="5" fill="#fff" opacity=".6" transform="rotate(-22 36 19)"/>
${sparkle(28, 22, 7)}
</svg>`;
}

function coin() {
  const reed = Array.from({ length: 56 }, (_, i) => {
    const a = (i / 56) * Math.PI * 2;
    return `<line x1="${(50 + Math.cos(a) * 38.6).toFixed(2)}" y1="${(49 + Math.sin(a) * 38.6).toFixed(2)}" x2="${(50 + Math.cos(a) * 42).toFixed(2)}" y2="${(49 + Math.sin(a) * 42).toFixed(2)}" stroke="#3a444e" stroke-width="1" stroke-opacity=".5"/>`;
  }).join('');
  const txt = (dx: number, dy: number, fill: string, op = 1) => `
<text x="${50 + dx}" y="${52 + dy}" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="30" text-anchor="middle" fill="${fill}" fill-opacity="${op}">1</text>
<text x="${50 + dx}" y="${68 + dy}" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="12" letter-spacing="1" text-anchor="middle" fill="${fill}" fill-opacity="${op}">ZŁ</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
<defs>
<linearGradient id="ce" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#b8c2cc"/><stop offset="1" stop-color="#4a545e"/></linearGradient>
<radialGradient id="cf" cx=".36" cy=".3" r=".85"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#d4dce4"/><stop offset="1" stop-color="#7a8692"/></radialGradient>
<linearGradient id="cb" x1="0" y1="0" x2="1" y2="0"><stop offset=".25" stop-color="#fff" stop-opacity="0"/><stop offset=".42" stop-color="#fff" stop-opacity=".6"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/></linearGradient>
<radialGradient id="csh" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
<clipPath id="cc"><circle cx="50" cy="49" r="42"/></clipPath>
</defs>
<ellipse cx="50" cy="93" rx="32" ry="6" fill="url(#csh)"/>
<circle cx="50" cy="49" r="42" fill="url(#ce)" stroke="${OUT}" stroke-width="2.6"/>
${reed}
<circle cx="50" cy="49" r="34.5" fill="url(#cf)" stroke="#5a646e" stroke-width="1.3"/>
<circle cx="50" cy="49" r="31" fill="none" stroke="#fff" stroke-width=".8" stroke-opacity=".8"/>
<path d="M27 58 C24 46 28 34 36 28 M73 58 C76 46 72 34 64 28" fill="none" stroke="#6a7682" stroke-width="1.6" stroke-linecap="round"/>
<path d="M29 50 l-4 -3 M28 44 l-4 -2 M30 38 l-3 -3 M71 50 l4 -3 M72 44 l4 -2 M70 38 l3 -3" stroke="#6a7682" stroke-width="1.4" stroke-linecap="round"/>
${txt(1.3, 1.4, '#3a444e', 0.55)}${txt(-0.8, -0.8, '#ffffff')}${txt(0, 0, '#9aa6b2')}
<g clip-path="url(#cc)"><rect x="0" y="0" width="100" height="100" fill="url(#cb)" transform="rotate(-35 50 50)"/></g>
${sparkle(31, 28, 8)}
</svg>`;
}

function cap() {
  // crown cork: 21 crimped teeth, glossy violet top, white star print
  const teeth = 21;
  const edge = Array.from({ length: teeth * 2 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / teeth;
    const r = i % 2 ? 40.5 : 44;
    return `${(50 + Math.cos(a) * r).toFixed(2)},${(49 + Math.sin(a) * r).toFixed(2)}`;
  }).join(' ');
  const star = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? 7.5 : 17;
    return `${(50 + Math.cos(a) * r).toFixed(2)},${(49 + Math.sin(a) * r).toFixed(2)}`;
  }).join(' ');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
<defs>
<linearGradient id="ke" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4e8ff"/><stop offset=".4" stop-color="#b8a4c8"/><stop offset="1" stop-color="#4a3a5a"/></linearGradient>
<radialGradient id="kt" cx=".36" cy=".3" r=".8"><stop offset="0" stop-color="#f4b8ff"/><stop offset=".45" stop-color="#b23ad0"/><stop offset="1" stop-color="#4a0a5e"/></radialGradient>
<radialGradient id="ksh2" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
</defs>
<ellipse cx="50" cy="93" rx="32" ry="6" fill="url(#ksh2)"/>
<polygon points="${edge}" fill="url(#ke)" stroke="${OUT}" stroke-width="2.4" stroke-linejoin="round"/>
<circle cx="50" cy="49" r="35.5" fill="url(#kt)" stroke="${OUT}" stroke-width="1.6"/>
<circle cx="50" cy="49" r="31" fill="none" stroke="#fff" stroke-width="2.4" stroke-opacity=".9"/>
<circle cx="50" cy="49" r="27.5" fill="none" stroke="#fff" stroke-width=".8" stroke-opacity=".6" stroke-dasharray="2 2.4"/>
<polygon points="${star}" fill="#fff" stroke="#6a1a80" stroke-width="1"/>
<path d="M24 34 C30 24 40 19 50 18" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".55"/>
${sparkle(30, 27, 8)}
</svg>`;
}

/** SVG markup per gem type: fire, water, earth, air, skull, coin. */
export const GEM_SVG: string[] = [ruby(), sapphire(), emerald(), topaz(), skull(), coin(), cap()];
