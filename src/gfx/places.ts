/**
 * Map locations: small illustrated places (100×100 SVG, ground line ≈ y 84).
 */

const O = '#1f1218';
const S = `stroke="${O}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"`;
const S2 = `stroke="${O}" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"`;
const shadow = (rx = 42) => `<ellipse cx="50" cy="86" rx="${rx}" ry="7" fill="#000" opacity=".28"/>`;
const shade = (d: string, a = 0.18) => `<path d="${d}" fill="${O}" opacity="${a}"/>`;
const T = (x: number, y: number, size: number, fill: string, text: string, extra = '') =>
  `<text x="${x}" y="${y}" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="${size}" text-anchor="middle" fill="${fill}" ${extra}>${text}</text>`;

const win = (x: number, y: number, w: number, h: number, lit = false) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${lit ? '#ffd86a' : '#3a5a7a'}" ${S2}/><path d="M${x + w / 2} ${y} L${x + w / 2} ${y + h}" stroke="${O}" stroke-width=".8"/>`;

const PLACES: Record<string, string> = {
  przystanek: `${shadow()}
<path d="M16 40 L78 34 L78 80 L16 84 Z" fill="#b8b0a4" ${S}/>
${[0, 1, 2, 3, 4, 5].map((i) => [0, 1, 2].map((j) => `<rect x="${22 + i * 8.5}" y="${44 + j * 8 - i * 0.6}" width="7" height="6.5" fill="${['#e8763a', '#3a8ac8', '#f2c84a', '#c83a4a'][(i + j * 2) % 4]}" opacity=".85"/>`).join('')).join('')}
<path d="M24 72 C30 66 36 74 42 68 C46 64 50 72 56 66" fill="none" stroke="#ff4ab8" stroke-width="2" opacity=".8"/>
<path d="M78 34 L86 36 L86 78 L78 80 Z" fill="#8e877c" ${S}/>
<path d="M10 38 L84 30 L88 36 L12 44 Z" fill="#8e877c" ${S}/>
<path d="M22 72 L72 68 L72 72 L22 76 Z" fill="#a0612c" ${S2}/>
<path d="M26 76 L26 82 M68 72 L68 79" stroke="${O}" stroke-width="2"/>
<rect x="4" y="68" width="8" height="14" rx="2" fill="#5a7a5a" ${S2}/>
<path d="M93 86 L93 26" stroke="${O}" stroke-width="3.4"/><path d="M93 86 L93 26" stroke="#c8ccd0" stroke-width="1.6"/>
<rect x="85" y="14" width="16" height="15" rx="1.5" fill="#2a5ab8" ${S2}/>
<path d="M88 24 L88 19 C88 17 90 17 92 17 L98 17 L98 24 Z" fill="#fff"/><circle cx="90" cy="25" r="1.3" fill="#fff"/><circle cx="96" cy="25" r="1.3" fill="#fff"/>`,

  trzepak: `${shadow(44)}
<rect x="6" y="10" width="86" height="56" fill="#cfc6b4" ${S}/>
${shade('M70 10 L92 10 L92 66 L70 66 Z', 0.14)}
${[0, 1, 2, 3, 4, 5].map((i) => [0, 1, 2, 3].map((j) => win(11 + i * 13.5, 15 + j * 12.5, 8, 7, (i * 3 + j * 5) % 7 === 0)).join('')).join('')}
<path d="M4 66 L96 66 L100 86 L0 86 Z" fill="#6aa04a" ${S2}/>
<path d="M22 86 L22 44 M78 86 L78 44" stroke="${O}" stroke-width="5.4" stroke-linecap="round"/>
<path d="M20 44 L80 44 M22 62 L78 62" stroke="${O}" stroke-width="5.4" stroke-linecap="round"/>
<path d="M22 86 L22 44 M78 86 L78 44 M20 44 L80 44 M22 62 L78 62" stroke="#6a8aa8" stroke-width="3" stroke-linecap="round"/>
<path d="M36 44 L66 44 L68 78 L34 78 Z" fill="#b8323a" ${S}/>
<path d="M40 52 L50 46 L60 52 L50 58 Z M40 66 L50 60 L60 66 L50 72 Z" fill="#f2c84a" ${S2}/>
<path d="M36 78 L36 82 M40 78 L40 82 M44 78 L44 82 M48 78 L48 82 M52 78 L52 82 M56 78 L56 82 M60 78 L60 82 M64 78 L64 82" stroke="#f2e8d0" stroke-width="1.2"/>
<path d="M84 80 C84 74 92 74 92 80 L92 84 L84 84 Z" fill="#3a3a3a" ${S2}/><path d="M85 75 L84 71 L87 74 M91 75 L92 71 L89 74" fill="#3a3a3a" ${S2}/>`,

  dzialka: `${shadow(44)}
<path d="M4 72 L96 72 L98 86 L2 86 Z" fill="#6a4a2a" ${S2}/>
${[10, 16, 22].map((x) => `<circle cx="${x}" cy="78" r="3.6" fill="#6ab04a" ${S2}/>`).join('')}
<path d="M30 48 L66 48 L66 80 L30 80 Z" fill="#c08a4e" ${S}/>
<path d="M36 48 L36 80 M42 48 L42 80 M48 48 L48 80 M54 48 L54 80 M60 48 L60 80" stroke="${O}" stroke-width=".8" opacity=".35"/>
<path d="M24 50 L48 28 L72 50 Z" fill="#3a8a4a" ${S}/>
${shade('M48 28 L72 50 L62 50 Z', 0.2)}
<rect x="40" y="60" width="11" height="20" fill="#7a4a2a" ${S2}/><circle cx="48" cy="70" r="1" fill="#f2c84a"/>
<rect x="54" y="56" width="9" height="8" fill="#bfe8ff" ${S2}/><path d="M54 56 L63 56 L60 62 L57 56" fill="#ff8ab8" opacity=".8"/>
<path d="M82 84 L80 42" stroke="#3a7a2a" stroke-width="2.2"/>
<circle cx="80" cy="38" r="8" fill="#ffcf2a" ${S2}/><circle cx="80" cy="38" r="3.8" fill="#6a3a1a"/>
<path d="M81 60 C86 56 90 58 88 62 Z" fill="#4a9a3a" ${S2}/>
<path d="M14 70 L18 58 L22 70 Z" fill="#e0243c" ${S2}/><path d="M15 70 C16 76 20 76 21 70 Z" fill="#f4f4f4" ${S2}/><circle cx="18" cy="68" r="2" fill="#f0b89a"/>
${[4, 12, 20, 28, 70, 78, 86, 94].map((x) => `<path d="M${x} 86 L${x} 74 L${x + 2} 72 L${x + 4} 74 L${x + 4} 86 Z" fill="#f2ead8" ${S2}/>`).join('')}
<path d="M4 79 L98 79" stroke="${O}" stroke-width="1.2"/>`,

  boisko: `${shadow(46)}
<path d="M10 58 L90 58 L98 88 L2 88 Z" fill="#5aa04a" ${S}/>
<path d="M14 64 L86 64 M50 58 L50 88 M8 76 L92 76" stroke="#f4f4ea" stroke-width="1.2" opacity=".8"/>
<ellipse cx="50" cy="73" rx="10" ry="4" fill="none" stroke="#f4f4ea" stroke-width="1.2" opacity=".8"/>
${[34, 40, 46, 52, 58, 64].map((x) => `<path d="M${x} 38 L${x - 2} 62" stroke="#fff" stroke-width=".7" opacity=".7"/>`).join('')}
${[44, 50, 56].map((y) => `<path d="M30 ${y} L70 ${y}" stroke="#fff" stroke-width=".7" opacity=".7"/>`).join('')}
<path d="M28 64 L28 36 L72 36 L72 64" fill="none" stroke="${O}" stroke-width="5"/>
<path d="M28 64 L28 36 L72 36 L72 64" fill="none" stroke="#f8f8f8" stroke-width="3"/>
<circle cx="62" cy="79" r="5" fill="#fff" ${S2}/><path d="M60 77 L63 76 L65 79 L62 81 L60 80 Z" fill="${O}"/>
<rect x="80" y="44" width="10" height="16" fill="#2a3a8a" ${S2}/>${T(85, 55, 6, '#fff', '1:0')}`,

  bar: `${shadow()}
<path d="M12 42 L72 42 L72 84 L12 84 Z" fill="#ead9b4" ${S}/>
${shade('M60 42 L72 42 L72 84 L60 84 Z', 0.12)}
<path d="M8 42 L76 42 L76 36 L8 36 Z" fill="#8a6a4a" ${S}/>
<rect x="18" y="16" width="48" height="16" rx="2" fill="#f4efe2" ${S}/>${T(42, 28, 10, '#c8182c', 'BAR')}
<path d="M24 32 L24 36 M60 32 L60 36" stroke="${O}" stroke-width="2"/>
${win(18, 50, 22, 14, true)}
<rect x="46" y="54" width="14" height="30" fill="#6a3a1a" ${S2}/>
<path d="M18 44 L40 44" stroke="#c8182c" stroke-width="2"/>
<path d="M82 84 L82 52" stroke="${O}" stroke-width="2.2"/>
<path d="M62 54 Q82 36 102 54 Z" fill="#e0243c" ${S}/>
<path d="M72 50 Q82 36 76 54 M88 54 Q82 36 92 50" fill="#f4f4f4"/>
<rect x="74" y="68" width="16" height="3" fill="#f4f4f4" ${S2}/><path d="M76 71 L76 84 M88 71 L88 84" stroke="${O}" stroke-width="1.6"/>
<path d="M92 84 L92 72 L98 72 M92 76 L98 76 L98 84" fill="none" stroke="#f4f4f4" stroke-width="2.4"/>
<path d="M66 84 L66 74 L60 74 M66 78 L60 78 L60 84" fill="none" stroke="#f4f4f4" stroke-width="2.4"/>`,

  remiza: `${shadow(46)}
<path d="M8 40 L70 40 L70 84 L8 84 Z" fill="#b8483a" ${S}/>
${[46, 52, 58, 64, 70, 76].map((y) => `<path d="M8 ${y} L70 ${y}" stroke="${O}" stroke-width=".6" opacity=".3"/>`).join('')}
<path d="M4 42 L39 20 L74 42 Z" fill="#4a3a3a" ${S}/>
${T(39, 37, 9, '#fff', 'OSP')}
<rect x="18" y="50" width="42" height="34" fill="#9aa4ae" ${S}/>
${[56, 62, 68, 74, 80].map((y) => `<path d="M18 ${y} L60 ${y}" stroke="${O}" stroke-width="1" opacity=".5"/>`).join('')}
<path d="M70 84 L70 18 L88 18 L88 84 Z" fill="#a83a2e" ${S}/>
<path d="M68 18 L79 4 L90 18 Z" fill="#4a3a3a" ${S}/>
${win(74, 26, 10, 10)}
<rect x="74" y="44" width="10" height="7" fill="#c8ccd0" ${S2}/><path d="M84 46 L92 42 L92 53 L84 49" fill="#c8ccd0" ${S2}/>
<path d="M88 30 L96 30" stroke="${O}" stroke-width="1.4"/><path d="M96 30 L96 16" stroke="${O}" stroke-width="1.4"/><path d="M96 16 L104 18 L96 22 Z" fill="#e0243c"/>`,

  zlom: `${shadow(46)}
<path d="M4 50 L96 50" stroke="${O}" stroke-width="1.2"/>
<path d="M4 50 l4 -4 l4 4 l4 -4 l4 4 l4 -4 l4 4 l4 -4 l4 4 l4 -4 l4 4 l4 -4 l4 4 l4 -4 l4 4 l4 -4 l4 4 l4 -4 l4 4 l4 -4 l4 4 l4 -4 l4 4" fill="none" stroke="#8a8a8a" stroke-width="1"/>
${[6, 26, 46, 66, 86].map((x) => `<path d="M${x} 84 L${x} 48" stroke="#6a6a6a" stroke-width="2"/>`).join('')}
<path d="M4 54 L96 54 M4 70 L96 70" stroke="#8a8a8a" stroke-width=".8" opacity=".6"/>
<path d="M10 80 C10 64 18 56 34 55 C50 54 60 62 64 80 Z" fill="#b8683a" ${S}/>
<path d="M22 62 C26 58 34 58 38 58 L38 66 L20 68 Z M42 58 C48 58 54 62 56 68 L42 67 Z" fill="#2a3a4a" ${S2}/>
<circle cx="22" cy="80" r="6" fill="${O}"/><circle cx="22" cy="80" r="2.4" fill="#6a6a6a"/>
<path d="M30 74 C34 72 38 76 42 72" fill="none" stroke="#6a3a1a" stroke-width="2" opacity=".6"/>
${[0, 1, 2, 3].map((i) => `<ellipse cx="82" cy="${80 - i * 6}" rx="11" ry="4" fill="#2a2a2e" ${S2}/><ellipse cx="82" cy="${80 - i * 6}" rx="5" ry="1.6" fill="#555"/>`).join('')}
<rect x="54" y="18" width="42" height="18" rx="1.5" fill="#f2e8c8" ${S}/>${T(75, 26, 6.4, '#c8182c', 'SKUP')}${T(75, 33, 6.4, '#1f1218', 'ZŁOMU')}
<path d="M60 36 L60 50 M90 36 L90 50" stroke="${O}" stroke-width="1.8"/>`,

  kapliczka: `${shadow(34)}
${[20, 26, 74, 80].map((x) => `<path d="M${x} 86 L${x} 70" stroke="#f2ead8" stroke-width="2.2"/>`).join('')}
<path d="M18 74 L32 74 M68 74 L82 74" stroke="#f2ead8" stroke-width="1.8"/>
<path d="M36 86 L64 86 L62 48 L38 48 Z" fill="#f4f0e6" ${S}/>
${shade('M54 48 L62 48 L64 86 L56 86 Z', 0.12)}
<path d="M42 62 C42 54 58 54 58 62 L58 74 L42 74 Z" fill="#3a6ab8" ${S2}/>
<path d="M50 58 C47 58 47 62 50 62 C53 62 53 58 50 58 Z M46 72 C46 66 54 66 54 72 Z" fill="#f4e8c8" ${S2}/>
<path d="M32 50 L50 30 L68 50 Z" fill="#7a8a9a" ${S}/>
<path d="M50 30 L50 16 M44 21 L56 21" stroke="${O}" stroke-width="3.2" stroke-linecap="round"/>
<path d="M50 30 L50 16 M44 21 L56 21" stroke="#e8c070" stroke-width="1.6" stroke-linecap="round"/>
<rect x="46" y="77" width="8" height="8" rx="1" fill="#c8182c" ${S2}/><circle cx="50" cy="74" r="2.6" fill="#ffd86a"/>
${[[40, 80, '#ff4a8a'], [60, 80, '#ffd23f'], [36, 82, '#8a4aff'], [64, 82, '#ff6a3a']].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="3" fill="${c}" ${S2}/>`).join('')}`,

  ropuszka: `${shadow(46)}
<path d="M8 40 L92 40 L92 84 L8 84 Z" fill="#f4f4ec" ${S}/>
${shade('M78 40 L92 40 L92 84 L78 84 Z', 0.1)}
<path d="M6 26 L94 26 L94 42 L6 42 Z" fill="#2e9a3a" ${S}/>
<circle cx="17" cy="34" r="6" fill="#7ac84a" ${S2}/><circle cx="14.5" cy="30.5" r="2.2" fill="#fff" ${S2}/><circle cx="19.5" cy="30.5" r="2.2" fill="#fff" ${S2}/><circle cx="14.5" cy="30.8" r=".9" fill="${O}"/><circle cx="19.5" cy="30.8" r=".9" fill="${O}"/><path d="M14 36 Q17 38 20 36" fill="none" stroke="${O}" stroke-width="1"/>
${T(56, 38, 11, '#fff', 'Ropuszka')}
<rect x="14" y="48" width="38" height="30" fill="#bfe0f4" ${S2}/>
${[54, 62, 70].map((y) => `<path d="M16 ${y} L50 ${y}" stroke="#8a8a8a" stroke-width="1.4"/>` + [18, 24, 30, 36, 42].map((x, i) => `<rect x="${x}" y="${y - 5}" width="4" height="5" fill="${['#e0243c', '#f2c84a', '#3a8ac8', '#6ab04a', '#ff8a3a'][(i + y) % 5]}"/>`).join('')).join('')}
<rect x="58" y="48" width="18" height="36" fill="#bfe0f4" ${S2}/><path d="M67 48 L67 84" stroke="${O}" stroke-width="1.2"/>
<rect x="80" y="50" width="9" height="12" fill="#ffd23f" ${S2}/>${T(84.5, 57.5, 3.6, '#c8182c', '-50%')}
<path d="M8 84 L92 84" stroke="#2e9a3a" stroke-width="3"/>`,

  stacja: `${shadow(48)}
<rect x="62" y="44" width="34" height="40" fill="#f2f2f2" ${S}/>${win(68, 52, 22, 12, true)}
<path d="M4 20 L84 20 L84 34 L4 34 Z" fill="#f4f4f4" ${S}/>
<path d="M4 30 L84 30 L84 34 L4 34 Z" fill="#e0243c"/>
<path d="M4 20 L84 20 L84 34 L4 34 Z" fill="none" ${S}/>
<path d="M20 34 L20 84 M68 34 L68 44" stroke="${O}" stroke-width="4.4"/><path d="M20 34 L20 84 M68 34 L68 44" stroke="#d8dce0" stroke-width="2.4"/>
<rect x="36" y="54" width="16" height="30" rx="2" fill="#e0243c" ${S}/><rect x="39" y="58" width="10" height="8" fill="#1f2a36" ${S2}/>
<path d="M52 62 C58 62 58 72 54 74" fill="none" stroke="${O}" stroke-width="1.8"/>
<rect x="4" y="38" width="12" height="46" fill="#e0243c" ${S}/>
<path d="M6 44 C8 40 12 40 14 44 L10 48 Z" fill="#fff"/>
${T(10, 58, 4.2, '#fff', '6,49')}${T(10, 66, 4.2, '#fff', '6,59')}${T(10, 74, 4.2, '#fff', '3,99')}
${T(44, 28.6, 7.6, '#e0243c', 'SOKÓŁ')}`,

  ognisko: `${shadow(40)}
<path d="M8 76 C8 70 32 70 32 76 C32 82 8 82 8 76 Z" fill="#8a5a2a" ${S}/><ellipse cx="10" cy="76" rx="2.6" ry="5" fill="#c8a06a" ${S2}/>
${[[34, 82], [42, 86], [54, 86], [64, 83], [68, 76], [30, 76]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="5" ry="3.2" fill="#8a8a92" ${S2}/>`).join('')}
<path d="M34 80 L64 72 M36 72 L66 80" stroke="${O}" stroke-width="7" stroke-linecap="round"/>
<path d="M34 80 L64 72 M36 72 L66 80" stroke="#8a5a2a" stroke-width="4.6" stroke-linecap="round"/>
<path d="M50 34 C60 46 64 56 58 70 C54 78 44 78 41 70 C37 60 44 52 46 44 C48 52 52 54 52 48 C52 42 50 38 50 34 Z" fill="#ff6a1a" ${S}/>
<path d="M50 50 C56 58 56 66 52 72 C48 74 45 70 46 64 C47 58 50 56 50 50 Z" fill="#ffc83a"/>
<path d="M50 62 C52 66 52 70 50 72 C48 70 48 66 50 62 Z" fill="#fff6c8"/>
<path d="M78 84 L60 48 M88 82 L70 46" stroke="#6a4a2a" stroke-width="1.8"/>
<path d="M58 44 C58 40 64 40 64 46 L66 52 C66 56 60 56 60 52 Z" fill="#b84a2a" ${S2}/>
<path d="M68 42 C68 38 74 38 74 44 L76 50 C76 54 70 54 70 50 Z" fill="#b84a2a" ${S2}/>`,

  chata: `${shadow(46)}
<path d="M14 50 L70 50 L70 84 L14 84 Z" fill="#ece4d0" ${S}/>
${shade('M58 50 L70 50 L70 84 L58 84 Z', 0.12)}
<path d="M6 54 L42 22 L78 54 Z" fill="#b8903a" ${S}/>
${[30, 36, 42, 48].map((y) => `<path d="M${42 - (y - 22) * 1.1} ${y} L${42 + (y - 22) * 1.1} ${y}" stroke="#7a5a1a" stroke-width=".8" opacity=".6"/>`).join('')}
<path d="M56 34 L56 22 L63 22 L63 40" fill="#9a6a4a" ${S2}/>
<rect x="20" y="58" width="14" height="12" fill="#bfe0f4" ${S2}/><rect x="18.5" y="56.5" width="17" height="15" fill="none" stroke="#3a6ab8" stroke-width="2"/>
<path d="M27 58 L27 70 M20 64 L34 64" stroke="#3a6ab8" stroke-width="1.4"/>
<rect x="29" y="71" width="5" height="6" rx="1" fill="#e8f4ff" ${S2}/><rect x="29" y="70" width="5" height="2" fill="#e0243c"/>
<rect x="42" y="60" width="12" height="24" fill="#3a6ab8" ${S2}/><circle cx="51" cy="72" r="1" fill="#f2c84a"/>
<path d="M80 84 L80 64 C80 60 96 60 96 64 L96 84 Z" fill="#9a9aa2" ${S}/>
<path d="M80 70 L96 70 M80 76 L96 76" stroke="${O}" stroke-width=".8" opacity=".5"/>
<path d="M78 58 L88 50 L98 58 Z" fill="#7a5a3a" ${S2}/><path d="M82 58 L82 64 M94 58 L94 64" stroke="${O}" stroke-width="1.4"/>
<circle cx="60" cy="14" r="4" fill="#d8d8e0" opacity=".7"/><circle cx="64" cy="7" r="5" fill="#d8d8e0" opacity=".5"/>`,

  urzad: `${shadow(48)}
<path d="M6 40 L94 40 L94 86 L6 86 Z" fill="#e8dcc6" ${S}/>
${[12, 26, 66, 80].map((x) => win(x, 46, 8, 11) + win(x, 64, 8, 11, x === 26)).join('')}
<path d="M34 86 L34 44 L66 44 L66 86 Z" fill="#f2ead8" ${S}/>
${[38, 46, 54, 62].map((x) => `<rect x="${x - 2}" y="46" width="4" height="34" fill="#fffaf0" ${S2}/>`).join('')}
<path d="M30 46 L50 26 L70 46 Z" fill="#d8ccb4" ${S}/>
<circle cx="50" cy="38" r="4.6" fill="#fffaf0" ${S2}/><path d="M50 38 L50 35 M50 38 L52.4 39" stroke="${O}" stroke-width=".9"/>
<rect x="4" y="30" width="30" height="8" fill="#f4efe2" ${S2}/>${T(19, 36.4, 4.6, '#1f1218', 'URZĄD')}
<rect x="66" y="30" width="30" height="8" fill="#f4efe2" ${S2}/>${T(81, 36.4, 4.6, '#1f1218', 'GMINY')}
<path d="M28 86 L72 86 L70 82 L30 82 Z" fill="#c8bca4" ${S2}/>
<path d="M50 26 L50 6" stroke="${O}" stroke-width="1.6"/>
<path d="M50 7 L64 8 L64 12 L50 11 Z" fill="#fff" ${S2}/><path d="M50 11 L64 12 L64 16 L50 15 Z" fill="#e0243c" ${S2}/>`,

  dom: `${shadow(36)}
<path d="M24 50 L70 50 L70 84 L24 84 Z" fill="#f2e2c4" ${S}/>
<path d="M18 52 L47 28 L76 52 Z" fill="#c8483a" ${S}/>
${shade('M47 28 L76 52 L66 52 Z', 0.2)}
<rect x="30" y="58" width="12" height="11" fill="#ffd86a" ${S2}/><path d="M36 58 L36 69 M30 63.5 L42 63.5" stroke="${O}" stroke-width="1"/>
<rect x="50" y="62" width="11" height="22" fill="#7a4a2a" ${S2}/>
<path d="M60 38 L60 30 L66 30 L66 42" fill="#9a6a4a" ${S2}/>
${[10, 16, 78, 84].map((x) => `<path d="M${x} 86 L${x} 74 L${x + 2} 72 L${x + 4} 74 L${x + 4} 86 Z" fill="#f2ead8" ${S2}/>`).join('')}`,
};

export type PlaceKind = keyof typeof PLACES;

export const PLACE_NAMES: Record<string, string> = {
  przystanek: 'Przystanek PKS',
  trzepak: 'Trzepak za blokiem',
  dzialka: 'Ogródki działkowe',
  boisko: 'Boisko szkolne',
  bar: 'Bar „Pod Kogutem”',
  remiza: 'Remiza OSP',
  zlom: 'Skup złomu',
  kapliczka: 'Kapliczka przy drodze',
  ropuszka: 'Sklep „Ropuszka”',
  stacja: 'Stacja paliw „Sokół”',
  ognisko: 'Ognisko nad rzeką',
  chata: 'Chata babci',
  urzad: 'Urząd Gminy',
  dom: 'Twój dom',
};

export function placeSVG(kind: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">${PLACES[kind]}</svg>`;
}

export const PLACE_KINDS = Object.keys(PLACES);
