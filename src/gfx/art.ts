import { mixHex } from './color';

/**
 * Hand-authored portrait illustrations. Every character is a 200×200 SVG bust,
 * templated with a palette so one drawing serves every elemental variant.
 */

export interface Pal { skin: string; acc: string; eye: string; hair?: string }
export interface ArtOpts { crown?: boolean }
interface P extends Pal { skL: string; skD: string; acL: string; acD: string; hair: string }
interface ArtDef { draw(p: P, blink: boolean, o: ArtOpts): string; glow?: [number, number, number][] }

const O = '#1f1218';
const S = `stroke="${O}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"`;
const S2 = `stroke="${O}" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"`;
const shade = (d: string, a = 0.16) => `<path d="${d}" fill="${O}" opacity="${a}"/>`;
const hi = (d: string, a = 0.35) => `<path d="${d}" fill="#fff" opacity="${a}"/>`;

function full(p: Pal): P {
  return {
    ...p,
    hair: p.hair ?? '#4a3322',
    skL: mixHex(p.skin, '#ffffff', 0.35),
    skD: mixHex(p.skin, '#000000', 0.38),
    acL: mixHex(p.acc, '#ffffff', 0.3),
    acD: mixHex(p.acc, '#000000', 0.45),
  };
}

function defs(p: P) {
  return `<defs>
<radialGradient id="sk" cx=".38" cy=".3" r=".78"><stop offset="0" stop-color="${p.skL}"/><stop offset=".55" stop-color="${p.skin}"/><stop offset="1" stop-color="${p.skD}"/></radialGradient>
<linearGradient id="ac" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.acL}"/><stop offset="1" stop-color="${p.acD}"/></linearGradient>
<linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff4c2"/><stop offset=".45" stop-color="#e8b53e"/><stop offset="1" stop-color="#8a5a12"/></linearGradient>
<radialGradient id="bone" cx=".4" cy=".3" r=".8"><stop offset="0" stop-color="#fffaf0"/><stop offset=".55" stop-color="#e6d9bb"/><stop offset="1" stop-color="#9c8664"/></radialGradient>
<linearGradient id="conc" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${mixHex(p.skin, '#ffffff', 0.25)}"/><stop offset="1" stop-color="${p.skD}"/></linearGradient>
<linearGradient id="wood" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#c98a4a"/><stop offset=".5" stop-color="#a0612c"/><stop offset="1" stop-color="#6e3d16"/></linearGradient>
<linearGradient id="steel" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e8eef2"/><stop offset=".5" stop-color="#9aa6b0"/><stop offset="1" stop-color="#5a646c"/></linearGradient>
<radialGradient id="glw" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="${p.eye}"/><stop offset="1" stop-color="${p.eye}" stop-opacity="0"/></radialGradient>
</defs>`;
}

// ---------- shared parts ----------
const SHOULDERS = 'M12 204 C16 170 44 151 78 146 L122 146 C156 151 184 170 188 204 Z';

/** Cartoon eye: white, iris, pupil, glint — or a closed lid line. */
function eye(cx: number, cy: number, rx: number, ry: number, blink: boolean, o: { iris?: string; pr?: number; dx?: number; dy?: number; slit?: boolean; lid?: number; skin?: string } = {}) {
  if (blink) return `<path d="M${cx - rx} ${cy} Q${cx} ${cy + ry * 0.7} ${cx + rx} ${cy}" fill="none" ${S}/>`;
  const px = cx + (o.dx ?? 0), py = cy + (o.dy ?? 0);
  const pr = o.pr ?? Math.min(rx, ry) * 0.55;
  let s = `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#fffdf6" ${S2}/>`;
  if (o.iris) s += `<circle cx="${px}" cy="${py}" r="${pr * 1.5}" fill="${o.iris}"/>`;
  s += o.slit
    ? `<ellipse cx="${px}" cy="${py}" rx="${pr * 0.35}" ry="${ry * 0.8}" fill="${O}"/>`
    : `<circle cx="${px}" cy="${py}" r="${pr}" fill="${O}"/>`;
  s += `<circle cx="${px - pr * 0.4}" cy="${py - pr * 0.45}" r="${Math.max(1, pr * 0.35)}" fill="#fff"/>`;
  if (o.lid) {
    const ly = cy - ry + ry * 2 * o.lid;
    s += `<path d="M${cx - rx - 1} ${cy} C${cx - rx} ${cy - ry * 1.3} ${cx + rx} ${cy - ry * 1.3} ${cx + rx + 1} ${cy} L${cx + rx} ${ly} C${cx + rx * 0.5} ${ly - 1.5} ${cx - rx * 0.5} ${ly - 1.5} ${cx - rx} ${ly} Z" fill="${o.skin ?? 'url(#sk)'}" ${S2}/>`;
  }
  return s;
}

/** Glowing socket eye for undead / monsters. */
function glowEye(cx: number, cy: number, r: number, blink: boolean) {
  if (blink) return `<ellipse cx="${cx}" cy="${cy}" rx="${r * 0.9}" ry="${r * 0.25}" fill="url(#glw)" opacity=".5"/>`;
  return `<circle cx="${cx}" cy="${cy}" r="${r * 1.6}" fill="url(#glw)" opacity=".7"/><circle cx="${cx}" cy="${cy}" r="${r * 0.55}" fill="#fff"/>`;
}

function flower(x: number, y: number, r: number, c = '#fff', mid = '#ffd23f') {
  return [0, 72, 144, 216, 288]
    .map((a) => `<circle cx="${(x + Math.cos((a * Math.PI) / 180) * r).toFixed(1)}" cy="${(y + Math.sin((a * Math.PI) / 180) * r).toFixed(1)}" r="${r * 0.72}" fill="${c}"/>`)
    .join('') + `<circle cx="${x}" cy="${y}" r="${r * 0.55}" fill="${mid}"/>`;
}

function crown(cx: number, y: number, w: number) {
  const h = w * 0.55;
  return `<path d="M${cx - w} ${y} L${cx - w * 1.05} ${y - h} L${cx - w * 0.5} ${y - h * 0.45} L${cx} ${y - h * 1.2} L${cx + w * 0.5} ${y - h * 0.45} L${cx + w * 1.05} ${y - h} L${cx + w} ${y} Z" fill="url(#gold)" ${S}/>
<circle cx="${cx}" cy="${y - h * 0.35}" r="${w * 0.14}" fill="#e0243c" ${S2}/><circle cx="${cx - w * 0.6}" cy="${y - h * 0.25}" r="${w * 0.1}" fill="#2e7bff" ${S2}/><circle cx="${cx + w * 0.6}" cy="${y - h * 0.25}" r="${w * 0.1}" fill="#2e7bff" ${S2}/>
<path d="M${cx - w} ${y - 3} L${cx + w} ${y - 3}" stroke="#fff3c0" stroke-width="1.5" opacity=".7"/>`;
}

// ---------- heroes ----------
const grill: ArtDef = {
  draw: (p, b) => `
<path d="${SHOULDERS}" fill="url(#ac)" ${S}/>
${shade('M12 204 C16 180 30 166 48 158 C40 172 38 188 40 204 Z', 0.2)}
<path d="M80 147 L100 166 L120 147 L113 141 L100 154 L87 141 Z" fill="${p.acL}" ${S2}/>
<path d="M68 160 C82 155 118 155 132 160 L138 204 L62 204 Z" fill="#f3eee4" ${S}/>
<path d="M72 160 L86 146 M128 160 L114 146" fill="none" ${S}/>
<path d="M88 176 L112 176 L110 192 L90 192 Z" fill="#e6dfd2" ${S2}/>
<path d="M104 164 c6 -4 13 0 10 6 c-2 4 4 6 0 9 c-4 3 -9 0 -11 -4 c-4 -4 -3 -9 1 -11z" fill="#c8261c" opacity=".85"/>
<path d="M84 122 L116 122 L118 150 C108 156 92 156 82 150 Z" fill="url(#sk)" ${S}/>
${shade('M84 130 C92 136 108 136 116 130 L117 142 C106 146 94 146 83 142 Z', 0.22)}
<path d="M62 90 C48 84 46 110 62 112 Z" fill="url(#sk)" ${S}/>
<path d="M138 90 C152 84 154 110 138 112 Z" fill="url(#sk)" ${S}/>
<path d="M100 42 C129 42 143 63 143 94 C143 123 125 141 100 141 C75 141 57 123 57 94 C57 63 71 42 100 42 Z" fill="url(#sk)" ${S}/>
${shade('M60 108 C68 130 86 141 100 141 C114 141 132 130 140 108 C132 124 116 132 100 132 C84 132 68 124 60 108 Z', 0.13)}
<path d="M59 98 C55 76 61 63 72 56 C68 70 68 82 71 96 Z" fill="${p.hair}" ${S2}/>
<path d="M141 98 C145 76 139 63 128 56 C132 70 132 82 129 96 Z" fill="${p.hair}" ${S2}/>
<path d="M68 70 C82 50 114 46 136 62" fill="none" stroke="${p.hair}" stroke-width="3.4" stroke-linecap="round"/>
<path d="M70 64 C86 50 110 48 132 57" fill="none" stroke="${p.hair}" stroke-width="2.6" stroke-linecap="round"/>
<ellipse cx="90" cy="54" rx="13" ry="5" fill="#fff" opacity=".4" transform="rotate(-14 90 54)"/>
<path d="M71 81 C77 72 90 71 96 78 L93 83 C87 78 79 78 74 85 Z" fill="${p.hair}" ${S2}/>
<path d="M129 81 C123 72 110 71 104 78 L107 83 C113 78 121 78 126 85 Z" fill="${p.hair}" ${S2}/>
${eye(84, 92, 6.5, 5.6, b, { dx: 1 })}
${eye(116, 92, 6.5, 5.6, b, { dx: 1 })}
<ellipse cx="73" cy="107" rx="9" ry="6" fill="#ff4a4a" opacity=".28"/>
<ellipse cx="127" cy="107" rx="9" ry="6" fill="#ff4a4a" opacity=".28"/>
<path d="M100 88 C89 88 87 104 92 111 C96 115 104 115 108 111 C113 104 111 88 100 88 Z" fill="#ea826e" ${S2}/>
<ellipse cx="96" cy="97" rx="3" ry="4" fill="#fff" opacity=".5"/>
<path d="M72 120 C79 106 94 106 100 113 C106 106 121 106 128 120 C123 128 112 128 106 123 C103 121 97 121 94 123 C88 128 77 128 72 120 Z" fill="${p.hair}" ${S}/>
<path d="M80 116 C86 112 92 112 96 116 M104 116 C108 112 114 112 120 116" fill="none" stroke="#fff" stroke-width="1.2" opacity=".35"/>
<path d="M89 128 C95 134 105 134 111 128" fill="none" ${S2}/>
<path d="M153 204 L161 118" stroke="${O}" stroke-width="7" stroke-linecap="round"/>
<path d="M165 204 L171 120" stroke="${O}" stroke-width="7" stroke-linecap="round"/>
<path d="M153 204 L161 118" stroke="url(#steel)" stroke-width="3.6" stroke-linecap="round"/>
<path d="M165 204 L171 120" stroke="url(#steel)" stroke-width="3.6" stroke-linecap="round"/>
<path d="M150 113 C150 101 175 99 178 110 C180 119 157 123 153 119 C150 117 150 115 150 113 Z" fill="#a8502c" ${S}/>
<path d="M159 105 L157 117 M167 103 L165 117" stroke="#4a1a0a" stroke-width="2.4"/>
<path d="M156 106 C160 103 168 102 172 104" fill="none" stroke="#fff" stroke-width="1.3" opacity=".5"/>
<path d="M147 152 C142 140 150 131 161 131 C174 131 178 142 174 153 C170 162 152 162 147 152 Z" fill="url(#sk)" ${S}/>
<path d="M152 140 C158 138 166 138 170 141 M151 147 C158 145 166 145 171 148" fill="none" ${S2}/>
<path d="M160 96 C156 88 164 84 160 76 M170 94 C166 86 174 82 170 72" fill="none" stroke="#d8d0c8" stroke-width="2.4" stroke-linecap="round" opacity=".7"/>`,
};

const babcia: ArtDef = {
  draw: (p, b) => {
    const scarf = p.acc;
    const flowers = [[70, 60], [92, 40], [118, 42], [138, 66], [58, 110], [142, 110], [128, 136], [72, 136]]
      .map(([x, y]) => flower(x, y, 4.2))
      .join('');
    return `
<path d="${SHOULDERS}" fill="#6b4a7a" ${S}/>
${shade('M12 204 C16 180 30 166 48 158 C40 172 38 188 40 204 Z', 0.22)}
<path d="M78 146 L100 174 L122 146 Z" fill="#f4efe6" ${S2}/>
<path d="M78 146 L94 204 M122 146 L106 204" fill="none" ${S}/>
<circle cx="97" cy="186" r="2.6" fill="#e8dcc0" ${S2}/><circle cx="103" cy="198" r="2.6" fill="#e8dcc0" ${S2}/>
<circle cx="100" cy="162" r="6" fill="url(#gold)" ${S2}/><circle cx="100" cy="162" r="2.8" fill="#c8263c"/>
<path d="M48 100 C44 54 74 28 100 28 C126 28 156 54 152 100 C150 124 138 138 124 146 L76 146 C62 138 50 124 48 100 Z" fill="${scarf}" ${S}/>
${shade('M48 100 C50 124 62 138 76 146 L86 146 C70 132 60 116 58 96 Z', 0.2)}
<path d="M86 124 L114 124 L116 146 L84 146 Z" fill="url(#sk)" ${S2}/>
<path d="M70 90 C70 66 84 56 100 56 C116 56 130 66 130 90 C130 116 116 133 100 133 C84 133 70 116 70 90 Z" fill="url(#sk)" ${S}/>
<path d="M63 86 C65 57 84 46 100 46 C116 46 135 57 137 86 C125 67 112 62 100 62 C88 62 75 67 63 86 Z" fill="${scarf}" ${S}/>
${flowers}
<path d="M86 132 C93 140 107 140 114 132 L124 152 L109 147 L100 158 L91 147 L76 152 Z" fill="${scarf}" ${S}/>
${flower(100, 146, 3.4)}
<path d="M86 72 C94 69 106 69 114 72 M89 77 C96 75 104 75 111 77" fill="none" stroke="${O}" stroke-width="1.2" opacity=".35"/>
<path d="M78 79 C82 75 89 75 93 78 M107 78 C111 75 118 75 122 79" fill="none" stroke="#9a8a80" stroke-width="2.4" stroke-linecap="round"/>
${eye(86, 91, 3.6, 3.8, b, { pr: 2.6 })}
${eye(114, 91, 3.6, 3.8, b, { pr: 2.6 })}
<path d="M72 96 L76 94 M71 100 L75 99 M128 96 L124 94 M129 100 L125 99" stroke="${O}" stroke-width="1.1" opacity=".45"/>
<circle cx="86" cy="91" r="11" fill="#e0f4ff" fill-opacity=".22" stroke="#7a5a2a" stroke-width="2.6"/>
<circle cx="114" cy="91" r="11" fill="#e0f4ff" fill-opacity=".22" stroke="#7a5a2a" stroke-width="2.6"/>
<path d="M97 90 C99 87 101 87 103 90 M75 89 L69 86 M125 89 L131 86" fill="none" stroke="#7a5a2a" stroke-width="2.2"/>
<path d="M80 85 L84 83 M108 85 L112 83" stroke="#fff" stroke-width="1.8" opacity=".7"/>
<path d="M100 92 C96 100 94 106 98 108 C101 109 104 108 105 105" fill="none" ${S2}/>
<ellipse cx="78" cy="108" rx="7" ry="5" fill="#ff5a6a" opacity=".3"/><ellipse cx="122" cy="108" rx="7" ry="5" fill="#ff5a6a" opacity=".3"/>
<path d="M84 106 C82 112 85 118 89 120 M116 106 C118 112 115 118 111 120" fill="none" stroke="${O}" stroke-width="1.2" opacity=".4"/>
<path d="M88 115 C94 123 106 123 112 115 C106 118 94 118 88 115 Z" fill="#7a2030" ${S2}/>
<rect x="101" y="116.5" width="4.2" height="3.6" rx=".8" fill="url(#gold)"/>
<circle cx="117" cy="115" r="1.8" fill="#5a3a2a"/><path d="M117 115 L119 112" stroke="#5a3a2a" stroke-width=".8"/>
<path d="M34 204 L54 138 M44 204 L60 136 M54 204 L66 140" stroke="#3d7a2a" stroke-width="2.4" fill="none"/>
<ellipse cx="50" cy="132" rx="6" ry="3" fill="#5cae3a" ${S2} transform="rotate(-50 50 132)"/>
<ellipse cx="62" cy="130" rx="6" ry="3" fill="#6cc04a" ${S2} transform="rotate(-80 62 130)"/>
<ellipse cx="70" cy="136" rx="6" ry="3" fill="#4e9a30" ${S2} transform="rotate(-20 70 136)"/>
<circle cx="56" cy="126" r="3" fill="#f2d24a" ${S2}/><circle cx="66" cy="124" r="2.6" fill="#b88cff" ${S2}/>
<path d="M40 170 C36 158 44 150 54 150 C66 150 70 160 66 170 C62 178 44 178 40 170 Z" fill="url(#sk)" ${S}/>
<path d="M44 160 C50 158 58 158 63 161" fill="none" ${S2}/>`;
  },
};

const kombinator: ArtDef = {
  draw: (p, b) => `
<path d="${SHOULDERS}" fill="url(#ac)" ${S}/>
<path d="M22 186 C32 166 52 155 74 150 M26 192 C36 172 54 160 76 155 M30 198 C40 178 56 166 78 160" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
<path d="M178 186 C168 166 148 155 126 150 M174 192 C164 172 146 160 124 155 M170 198 C160 178 144 166 122 160" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
<path d="M100 160 L100 204" stroke="${O}" stroke-width="2.4"/>
<path d="M97 166 L103 166 L103 176 L97 176 Z" fill="url(#steel)" ${S2}/>
<path d="M84 124 L116 124 L118 150 C108 156 92 156 82 150 Z" fill="url(#sk)" ${S}/>
<path d="M74 148 L80 130 L100 152 L120 130 L126 148 L113 162 L100 154 L87 162 Z" fill="url(#ac)" ${S}/>
<path d="M86 150 C90 168 110 168 114 150" fill="none" stroke="${O}" stroke-width="6"/>
<path d="M86 150 C90 168 110 168 114 150" fill="none" stroke="url(#gold)" stroke-width="3.6" stroke-dasharray="3.2 1.6"/>
<circle cx="100" cy="166" r="4" fill="url(#gold)" ${S2}/>
<path d="M62 92 C50 88 50 110 64 110 Z" fill="url(#sk)" ${S}/>
<path d="M138 92 C150 88 150 110 136 110 Z" fill="url(#sk)" ${S}/>
<path d="M66 78 C66 58 80 48 100 48 C120 48 134 58 134 78 L134 104 C134 123 120 136 100 136 C80 136 66 123 66 104 Z" fill="url(#sk)" ${S}/>
<path d="M68 104 C70 124 84 136 100 136 C116 136 130 124 132 104 C126 118 114 125 100 125 C86 125 74 118 68 104 Z" fill="${p.hair}" opacity=".32"/>
<path d="M66 80 L66 98 L71 96 L71 80 Z M134 80 L134 98 L129 96 L129 80 Z" fill="${p.hair}"/>
<path d="M58 72 C58 48 80 36 104 36 C128 36 144 50 142 70 C126 63 80 62 58 72 Z" fill="#5d5d66" ${S}/>
<path d="M70 52 L78 66 M84 44 L90 62 M100 40 L104 60 M116 42 L118 61 M130 48 L130 63" stroke="#fff" stroke-width="1" opacity=".18"/>
<path d="M56 72 C80 63 124 61 150 70 C144 78 122 79 100 79 C82 79 66 80 56 72 Z" fill="#48484f" ${S}/>
<circle cx="102" cy="38" r="3" fill="#48484f" ${S2}/>
<path d="M74 86 C80 82 88 82 94 85 M106 80 C112 75 120 75 126 80" fill="none" stroke="${p.hair}" stroke-width="3.6" stroke-linecap="round"/>
${eye(84, 93, 6.4, 5, b, { lid: 0.45, dx: 2, skin: p.skin })}
${eye(116, 92, 6.4, 5.4, b, { lid: 0.3, dx: 2, skin: p.skin })}
<path d="M100 88 C98 98 94 104 98 108 C101 110 105 109 105 105" fill="none" ${S2}/>
<path d="M88 118 C96 123 106 121 114 112" fill="none" ${S}/>
<path d="M113 116 L132 108" stroke="${O}" stroke-width="4" stroke-linecap="round"/>
<path d="M113 116 L132 108" stroke="#e9c48a" stroke-width="2.2" stroke-linecap="round"/>
<path d="M154 50 L142 72 L151 72 L140 94 L162 64 L152 64 L160 50 Z" fill="#ffe14a" ${S2}/>`,
};

// ---------- enemies ----------
const imp: ArtDef = {
  draw: (p, b) => `
<path d="${SHOULDERS}" fill="url(#sk)" ${S}/>
<path d="M62 204 L65 162 C73 158 80 152 82 146 C90 158 110 158 118 146 C120 152 127 158 135 162 L138 204 Z" fill="#ece6d8" ${S}/>
<path d="M92 176 c8 -2 16 4 12 10 c-3 5 -12 4 -15 0 c-3 -4 -1 -9 3 -10z" fill="#b5a47a" opacity=".6"/>
<path d="M84 124 L116 124 L118 150 C108 156 92 156 82 150 Z" fill="url(#sk)" ${S}/>
<path d="M64 94 C46 90 28 76 18 58 C38 60 56 70 70 82 Z" fill="url(#sk)" ${S}/>
<path d="M136 94 C154 90 172 76 182 58 C162 60 144 70 130 82 Z" fill="url(#sk)" ${S}/>
${shade('M60 88 C46 82 34 72 28 64 C42 68 54 74 64 82 Z', 0.25)}
${shade('M140 88 C154 82 166 72 172 64 C158 68 146 74 136 82 Z', 0.25)}
<path d="M100 50 C128 50 144 70 142 96 C140 121 124 139 100 139 C76 139 60 121 58 96 C56 70 72 50 100 50 Z" fill="url(#sk)" ${S}/>
<path d="M36 70 C36 58 68 52 100 52 C132 52 164 58 164 70 C164 80 132 84 100 84 C68 84 36 80 36 70 Z" fill="#e9c46a" ${S}/>
<path d="M44 72 C60 78 140 78 156 72" fill="none" stroke="#b58a34" stroke-width="1.4"/>
<path d="M68 68 C68 40 84 30 100 30 C116 30 132 40 132 68 C120 73 80 73 68 68 Z" fill="#e3b85a" ${S}/>
<path d="M69 60 C84 65 116 65 131 60 L132 68 C120 73 80 73 68 68 Z" fill="url(#ac)" ${S2}/>
<path d="M78 40 L80 60 M90 34 L91 60 M110 34 L109 60 M122 40 L120 60" stroke="#b58a34" stroke-width="1.2" opacity=".7"/>
<path d="M60 82 L54 90 M140 82 L148 88 M84 84 L82 92" stroke="#c8a04a" stroke-width="1.6"/>
<path d="M80 50 C74 36 76 20 88 12 C87 27 90 38 95 46 Z" fill="#f4ead0" ${S}/>
<path d="M120 50 C126 36 124 20 112 12 C113 27 110 38 105 46 Z" fill="#f4ead0" ${S}/>
${shade('M80 50 C76 40 77 28 84 18 C83 30 85 40 88 47 Z', 0.2)}
<path d="M70 88 L92 96 L90 100 L68 94 Z" fill="${O}"/>
<path d="M130 88 L108 96 L110 100 L132 94 Z" fill="${O}"/>
${eye(84, 103, 8.5, 8, b, { iris: '#ffcf3a', slit: true, pr: 3.4, dx: 2 })}
${eye(116, 103, 8.5, 8, b, { iris: '#ffcf3a', slit: true, pr: 3.4, dx: 2 })}
<path d="M96 112 C98 116 102 116 104 112" fill="none" ${S2}/>
<path d="M74 118 C88 130 112 130 126 116 C122 132 110 138 100 138 C88 138 78 130 74 118 Z" fill="#3a0a12" ${S}/>
<path d="M80 122 C90 128 110 128 120 121 L118 125 C108 131 92 131 82 126 Z" fill="#fffaf0"/>
<path d="M87 124 L91 134 L95 126 Z" fill="#fffaf0" ${S2}/>
<path d="M98 134 C102 128 112 127 114 131 C110 136 102 138 98 134 Z" fill="#ff6a7e"/>
<path d="M95 138 L100 152 L105 138 Z" fill="${p.skD}" ${S2}/>
<path d="M162 204 L170 112" stroke="${O}" stroke-width="7" stroke-linecap="round"/>
<path d="M162 204 L170 112" stroke="url(#wood)" stroke-width="4" stroke-linecap="round"/>
<path d="M154 120 C156 126 180 128 184 120 M156 120 L158 92 M169 118 L170 88 M183 120 L181 92" fill="none" stroke="${O}" stroke-width="5" stroke-linecap="round"/>
<path d="M154 120 C156 126 180 128 184 120 M156 120 L158 92 M169 118 L170 88 M183 120 L181 92" fill="none" stroke="url(#steel)" stroke-width="2.6" stroke-linecap="round"/>`,
};

const drowner: ArtDef = {
  draw: (p, b) => `
<path d="${SHOULDERS}" fill="url(#sk)" ${S}/>
<path d="M20 180 L60 150 M30 196 L84 150 M50 204 L110 150 M80 204 L136 152 M112 204 L160 160 M40 160 L90 204 M70 150 L130 204 M100 150 L160 204 M130 152 L178 190" stroke="#3a2a1a" stroke-width="1.6" opacity=".55"/>
<path d="M82 120 L118 120 L120 150 C108 156 92 156 80 150 Z" fill="url(#sk)" ${S}/>
<path d="M86 132 C90 136 90 142 86 146 M114 132 C110 136 110 142 114 146 M92 130 C96 136 96 142 92 148" fill="none" ${S2}/>
<path d="M54 92 L28 76 L40 92 L22 98 L40 104 L28 118 L56 110 Z" fill="${p.acD}" ${S}/>
<path d="M146 92 L172 76 L160 92 L178 98 L160 104 L172 118 L144 110 Z" fill="${p.acD}" ${S}/>
<path d="M100 54 C133 54 152 74 152 100 C152 125 129 142 100 142 C71 142 48 125 48 100 C48 74 67 54 100 54 Z" fill="url(#sk)" ${S}/>
${shade('M50 108 C58 130 78 142 100 142 C122 142 142 130 150 108 C140 126 122 134 100 134 C78 134 60 126 50 108 Z', 0.18)}
<circle cx="70" cy="74" r="3" fill="${p.skD}" opacity=".5"/><circle cx="128" cy="70" r="4" fill="${p.skD}" opacity=".5"/><circle cx="138" cy="82" r="2.4" fill="${p.skD}" opacity=".5"/>
${[[66, 60, 70, 96], [80, 56, 78, 104], [98, 54, 100, 86], [116, 56, 122, 100], [132, 62, 134, 108]]
  .map(([x1, y1, x2, y2]) => `<path d="M${x1} ${y1} C${x1 - 6} ${(y1 + y2) / 2} ${x2 + 6} ${(y1 + y2) / 2} ${x2} ${y2}" fill="none" stroke="${O}" stroke-width="8" stroke-linecap="round"/><path d="M${x1} ${y1} C${x1 - 6} ${(y1 + y2) / 2} ${x2 + 6} ${(y1 + y2) / 2} ${x2} ${y2}" fill="none" stroke="#3f8a34" stroke-width="5" stroke-linecap="round"/>`)
  .join('')}
<path d="M62 60 C80 46 120 46 138 60 C126 56 112 58 100 56 C88 58 74 56 62 60 Z" fill="#3f8a34" ${S2}/>
${eye(76, 92, 12, 11, b, { iris: '#c8d84a', pr: 3, dx: -1, lid: 0.35, skin: p.skin })}
${eye(124, 90, 13, 12, b, { iris: '#c8d84a', pr: 3, dx: 1, lid: 0.3, skin: p.skin })}
<path d="M96 104 L98 108 M104 104 L102 108" stroke="${O}" stroke-width="2"/>
<path d="M66 118 C80 110 120 110 134 118 C128 130 112 134 100 134 C88 134 72 130 66 118 Z" fill="#2a0c14" ${S}/>
<path d="M72 118 L76 124 L80 116 L84 123 L88 115 L92 122 L96 115 L100 122 L104 115 L108 122 L112 115 L116 123 L120 116 L124 124 L128 118" fill="#f4f0e0" stroke="#f4f0e0" stroke-width=".6"/>
<path d="M118 126 C127 125 129 134 122 136" fill="none" stroke="url(#steel)" stroke-width="2.4"/>
<path d="M127 125 L166 18" stroke="#e8f0f4" stroke-width=".9" opacity=".7"/>
<path d="M62 70 c-3 5 -2 8 1 8 c3 0 3 -4 -1 -8z M140 110 c-3 5 -2 8 1 8 c3 0 3 -4 -1 -8z" fill="#bfe8ff" ${S2}/>`,
};

const skeleton: ArtDef = {
  glow: [[80, 92, 5], [120, 92, 5]],
  draw: (p, b) => `
<path d="${SHOULDERS}" fill="#2a2a36" ${S}/>
<path d="M80 147 L100 182 L120 147 Z" fill="#f2efe8" ${S2}/>
<path d="M78 147 L97 200 L86 204 L62 158 Z" fill="#20202a" ${S}/>
<path d="M122 147 L103 200 L114 204 L138 158 Z" fill="#20202a" ${S}/>
<path d="M94 150 L106 150 L103 160 L110 196 L100 206 L90 196 L97 160 Z" fill="url(#ac)" ${S2}/>
<path d="M95 170 L106 176 M94 182 L107 188" stroke="#fff" stroke-width="1.4" opacity=".4"/>
<path d="M148 176 C156 172 162 176 158 182 C156 186 150 184 148 176 Z M148 176 C140 172 136 178 140 182 C144 186 148 182 148 176 Z" fill="#b8a888" ${S2}/>
<path d="M150 176 L158 168 M150 176 L156 166" stroke="${O}" stroke-width="1"/>
<path d="M14 196 L34 176 M14 186 L30 172 M24 200 L40 180 M16 184 C22 186 26 190 26 196 M20 178 C28 180 32 186 32 192" stroke="#e8e8f0" stroke-width=".8" fill="none" opacity=".6"/>
<rect x="92" y="126" width="16" height="10" rx="3" fill="url(#bone)" ${S2}/>
<rect x="92" y="136" width="16" height="10" rx="3" fill="url(#bone)" ${S2}/>
<path d="M76 124 C78 146 89 156 100 156 C111 156 122 146 124 124 Z" fill="url(#bone)" ${S}/>
<path d="M84 130 L84 138 M92 131 L92 140 M100 131 L100 141 M108 131 L108 140 M116 130 L116 138" stroke="${O}" stroke-width="1.6"/>
<path d="M100 38 C133 38 149 61 149 88 C149 104 143 112 137 118 L135 127 C129 133 119 135 115 131 L113 136 L87 136 L85 131 C81 135 71 133 65 127 L63 118 C57 112 51 104 51 88 C51 61 67 38 100 38 Z" fill="url(#bone)" ${S}/>
${shade('M51 88 C51 104 57 112 63 118 L65 127 C60 120 56 110 58 96 Z', 0.2)}
${shade('M149 88 C149 104 143 112 137 118 L135 127 C140 120 144 110 142 96 Z', 0.2)}
<path d="M86 124 L86 134 M93 125 L93 136 M100 125 L100 136 M107 125 L107 136 M114 124 L114 134" stroke="${O}" stroke-width="1.6"/>
<path d="M66 92 C66 77 82 72 91 79 C98 85 96 102 85 105 C74 107 66 101 66 92 Z" fill="#1a0c10" ${S2}/>
<path d="M134 92 C134 77 118 72 109 79 C102 85 104 102 115 105 C126 107 134 101 134 92 Z" fill="#1a0c10" ${S2}/>
${glowEye(80, 92, 5, b)}${glowEye(120, 92, 5, b)}
<path d="M100 104 C95 108 93 116 97 119 L100 116 L103 119 C107 116 105 108 100 104 Z" fill="#1a0c10"/>
<path d="M118 44 L113 57 L120 63 L115 72" fill="none" ${S2}/>
<ellipse cx="84" cy="54" rx="14" ry="6" fill="#fff" opacity=".45" transform="rotate(-18 84 54)"/>`,
};

const ghost: ArtDef = {
  glow: [[84, 94, 4], [116, 94, 4]],
  draw: (p, b) => {
    const robe = mixHex(p.acc, '#8a7a9a', 0.55);
    return `
<path d="${SHOULDERS}" fill="${robe}" ${S}/>
<path d="M76 147 L114 204 L98 204 L64 158 Z" fill="${mixHex(robe, '#ffffff', 0.18)}" ${S}/>
<path d="M124 147 L100 204 L86 204 L114 152 Z" fill="${mixHex(robe, '#ffffff', 0.1)}" ${S}/>
${Array.from({ length: 18 }, (_, i) => `<circle cx="${30 + ((i * 37) % 140)}" cy="${166 + ((i * 23) % 34)}" r="1.1" fill="#fff" opacity=".25"/>`).join('')}
<path d="M86 124 L114 124 L116 150 C106 156 94 156 84 150 Z" fill="url(#sk)" ${S}/>
<path d="M100 42 C126 42 139 62 139 92 C139 124 123 147 100 147 C77 147 61 124 61 92 C61 62 74 42 100 42 Z" fill="url(#sk)" ${S}/>
${shade('M66 104 C70 118 76 126 82 128 C78 118 76 110 76 102 Z', 0.2)}
${shade('M134 104 C130 118 124 126 118 128 C122 118 124 110 124 102 Z', 0.2)}
${[[66, 54, '#ff8fb8'], [82, 42, '#8fc8ff'], [100, 38, '#ffd86a'], [118, 42, '#8fc8ff'], [134, 54, '#ff8fb8']]
  .map(([x, y, c]) => `<rect x="${(x as number) - 11}" y="${(y as number) - 8}" width="22" height="15" rx="7" fill="${c}" ${S2}/><path d="M${(x as number) - 5} ${(y as number) - 8} L${(x as number) - 5} ${(y as number) + 7} M${x} ${(y as number) - 8} L${x} ${(y as number) + 7} M${(x as number) + 5} ${(y as number) - 8} L${(x as number) + 5} ${(y as number) + 7}" stroke="${O}" stroke-width=".9" opacity=".5"/><rect x="${(x as number) - 8}" y="${(y as number) - 6}" width="10" height="3" rx="1.5" fill="#fff" opacity=".45"/>`)
  .join('')}
<path d="M62 60 C76 42 124 42 138 60" fill="none" stroke="${O}" stroke-width=".8" stroke-dasharray="2 3" opacity=".5"/>
<path d="M72 84 C74 76 92 76 96 86 C96 100 76 102 72 94 Z" fill="${O}" opacity=".55"/>
<path d="M128 84 C126 76 108 76 104 86 C104 100 124 102 128 94 Z" fill="${O}" opacity=".55"/>
${glowEye(84, 92, 4, b)}${glowEye(116, 92, 4, b)}
<path d="M72 100 C78 104 88 104 94 102 M128 100 C122 104 112 104 106 102" fill="none" stroke="${O}" stroke-width="1.2" opacity=".35"/>
<path d="M100 96 C97 106 96 112 100 114" fill="none" ${S2}/>
<path d="M86 126 C92 120 108 120 114 126 C110 134 90 134 86 126 Z" fill="#1a0c14" ${S}/>
<path d="M100 147 C98 154 102 158 100 164 C98 158 96 154 100 147 Z" fill="${p.skL}" opacity=".8"/>
<path d="M114 128 L136 122" stroke="${O}" stroke-width="4" stroke-linecap="round"/><path d="M114 128 L136 122" stroke="#f4f0e8" stroke-width="2.4" stroke-linecap="round"/>
<circle cx="137" cy="121.6" r="1.8" fill="#ff7a3a"/>
<path d="M140 116 C138 108 146 104 142 96" fill="none" stroke="#d0d0d8" stroke-width="2" opacity=".6"/>`;
  },
};

const salesman: ArtDef = {
  glow: [[84, 94, 5], [116, 94, 5]],
  draw: (p, b) => `
<path d="${SHOULDERS}" fill="#3a3a44" ${S}/>
${Array.from({ length: 9 }, (_, i) => `<path d="M${24 + i * 18} 204 L${40 + i * 14} 150" stroke="#fff" stroke-width=".6" opacity=".15"/>`).join('')}
<path d="M80 147 L100 182 L120 147 Z" fill="#f2efe8" ${S2}/>
<path d="M78 147 L97 200 L86 204 L62 158 Z" fill="#30303a" ${S}/>
<path d="M122 147 L103 200 L114 204 L138 158 Z" fill="#30303a" ${S}/>
<path d="M94 150 L106 150 L103 160 L110 196 L100 206 L90 196 L97 160 Z" fill="url(#ac)" ${S2}/>
<path d="M84 146 L112 188 M116 146 L112 188" stroke="${p.acc}" stroke-width="2.2"/>
<rect x="104" y="184" width="26" height="18" rx="2" fill="#f4f4f0" ${S2}/>
<rect x="107" y="187" width="8" height="10" fill="${p.skin}"/>
<path d="M118 189 L127 189 M118 193 L127 193 M118 197 L124 197" stroke="${O}" stroke-width="1.2"/>
<path d="M86 124 L114 124 L116 150 C106 156 94 156 84 150 Z" fill="url(#sk)" ${S}/>
<path d="M64 94 C54 90 54 108 66 108 Z" fill="url(#sk)" ${S}/>
<path d="M136 94 C146 90 146 108 134 108 Z" fill="url(#sk)" ${S}/>
<path d="M100 44 C124 44 138 60 138 88 C138 118 122 140 100 140 C78 140 62 118 62 88 C62 60 76 44 100 44 Z" fill="url(#sk)" ${S}/>
<path d="M60 84 C58 54 80 40 102 40 C127 40 143 56 139 84 C131 68 116 62 94 64 C82 65 70 70 60 84 Z" fill="#141018" ${S}/>
<path d="M92 64 C88 56 90 48 96 44" fill="none" stroke="#fff" stroke-width="1.2" opacity=".5"/>
<path d="M104 48 C118 46 130 54 134 66" fill="none" stroke="#fff" stroke-width="2.2" opacity=".35"/>
<path d="M72 82 C78 74 90 74 94 80 M106 80 C110 74 122 74 128 82" fill="none" stroke="#141018" stroke-width="3" stroke-linecap="round"/>
<ellipse cx="84" cy="94" rx="9" ry="7" fill="#140a10"/><ellipse cx="116" cy="94" rx="9" ry="7" fill="#140a10"/>
${glowEye(84, 94, 5, b)}${glowEye(116, 94, 5, b)}
<path d="M100 96 C97 106 96 110 100 112" fill="none" ${S2}/>
<path d="M68 112 C84 124 116 124 132 112 C128 130 114 138 100 138 C86 138 72 130 68 112 Z" fill="#fffef6" ${S}/>
<path d="M74 118 C88 124 112 124 126 118" fill="none" stroke="${O}" stroke-width="1.4"/>
${[78, 86, 94, 102, 110, 118].map((x) => `<path d="M${x} ${x < 90 || x > 112 ? 117 : 120} L${x + 1} ${x < 90 || x > 112 ? 128 : 132}" stroke="${O}" stroke-width="1.1"/>`).join('')}
<path d="M70 112 C84 118 116 118 130 112" fill="none" stroke="#e05a6a" stroke-width="2"/>`,
};

const golem: ArtDef = {
  glow: [[78, 84, 7], [122, 84, 7]],
  draw: (p, b) => {
    const wins: string[] = [];
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 4; c++) {
        const x = 62 + c * 20, y = 52 + r * 30;
        if (r === 1 && (c === 0 || c === 3)) continue;
        if (r === 1) continue;
        const lit = (r * 7 + c * 3) % 5 === 0;
        wins.push(`<rect x="${x}" y="${y}" width="14" height="11" fill="${lit ? '#ffd86a' : '#2a3a52'}" ${S2}/><path d="M${x + 7} ${y} L${x + 7} ${y + 11}" stroke="${O}" stroke-width="1"/>`);
      }
    const eyeWin = (x: number) =>
      b
        ? `<rect x="${x - 10}" y="${77}" width="20" height="14" fill="#2a3a52" ${S2}/><path d="M${x - 10} 84 L${x + 10} 84" stroke="#4a5a72" stroke-width="3"/>`
        : `<rect x="${x - 10}" y="${77}" width="20" height="14" fill="${mixHex(p.eye, '#ffffff', 0.45)}" ${S2}/><path d="M${x} 77 L${x} 91" stroke="${O}" stroke-width="1.2"/>`;
    return `
<path d="M8 204 L18 158 L76 146 L82 204 Z" fill="url(#conc)" ${S}/>
<path d="M192 204 L182 158 L124 146 L118 204 Z" fill="url(#conc)" ${S}/>
<path d="M78 146 L122 146 L120 204 L80 204 Z" fill="url(#conc)" ${S}/>
<path d="M30 170 L60 166 M28 186 L62 182 M140 166 L170 170 M138 182 L172 186" stroke="${O}" stroke-width="1.2" opacity=".4"/>
<path d="M94 162 L96 180 L90 196 M104 166 L108 184" fill="none" stroke="${O}" stroke-width="1.4" opacity=".6"/>
<path d="M54 38 L146 34 L150 140 L50 142 Z" fill="url(#conc)" ${S}/>
${shade('M120 36 L146 34 L150 140 L126 141 Z', 0.14)}
<path d="M52 72 L148 69 M51 106 L149 104 M100 36 L100 141" stroke="${O}" stroke-width="1.3" opacity=".45"/>
${wins.join('')}
${eyeWin(78)}${eyeWin(122)}
<path d="M66 96 L90 96 L90 100 L66 100 Z M110 96 L134 96 L134 100 L110 100 Z" fill="#8a8a92" ${S2}/>
<path d="M70 96 L70 92 M78 96 L78 92 M86 96 L86 92 M114 96 L114 92 M122 96 L122 92 M130 96 L130 92" stroke="${O}" stroke-width="1.2"/>
<path d="M114 94 C118 90 124 90 128 94" fill="none" stroke="#f4f4f4" stroke-width="1"/>
<rect x="116" y="92" width="3" height="4" fill="#ff7a8a"/><rect x="123" y="92" width="3" height="4" fill="#7ad0ff"/>
<path d="M68 120 L78 116 L86 124 L96 114 L104 124 L114 116 L122 124 L132 118 L130 130 L70 130 Z" fill="#1a1216" ${S}/>
<path d="M76 118 L78 124 M92 118 L94 126 M110 120 L112 126 M124 120 L124 126" stroke="#d8d0c0" stroke-width="2"/>
<ellipse cx="156" cy="56" rx="14" ry="9" fill="#d8dce0" ${S} transform="rotate(-30 156 56)"/>
<path d="M156 56 L148 44 M146 64 L150 70" stroke="${O}" stroke-width="2"/>
<path d="M70 38 L66 20 M72 38 L76 24 M128 36 L132 16" stroke="#8a4a22" stroke-width="3.2" stroke-linecap="round"/>
<path d="M60 134 C66 128 74 132 78 126 M64 136 L70 128" stroke="${p.acc}" stroke-width="2" fill="none" opacity=".8"/>`;
  },
};

const dragon: ArtDef = {
  draw: (p, b, o) => `
<path d="${SHOULDERS}" fill="url(#sk)" ${S}/>
<path d="M76 150 C84 170 116 170 124 150 L128 204 L72 204 Z" fill="${p.skL}" ${S}/>
<path d="M76 164 L124 164 M74 178 L126 178 M73 192 L127 192" stroke="${O}" stroke-width="1.4" opacity=".5"/>
<path d="M80 118 L120 118 L124 152 C110 160 90 160 76 152 Z" fill="url(#sk)" ${S}/>
<path d="M60 58 C48 40 46 22 54 8 C58 24 68 36 80 44 Z" fill="#f4ead0" ${S}/>
<path d="M140 58 C152 40 154 22 146 8 C142 24 132 36 120 44 Z" fill="#f4ead0" ${S}/>
<path d="M56 88 L30 72 L44 90 L26 100 L48 102 Z" fill="${p.acD}" ${S}/>
<path d="M144 88 L170 72 L156 90 L174 100 L152 102 Z" fill="${p.acD}" ${S}/>
<path d="M100 40 C129 40 147 58 147 84 C147 100 141 108 137 114 C143 124 139 142 123 146 C112 150 88 150 77 146 C61 142 57 124 63 114 C59 108 53 100 53 84 C53 58 71 40 100 40 Z" fill="url(#sk)" ${S}/>
<path d="M88 44 L92 34 L96 44 M104 44 L108 32 L112 44" fill="${p.acD}" ${S2}/>
<path d="M70 112 C74 100 126 100 130 112 C136 128 128 145 100 147 C72 145 64 128 70 112 Z" fill="${p.skL}" ${S2}/>
${[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => `<path d="M${76 + c * 16 + (r % 2) * 8} ${58 + r * 9} q6 6 12 0" fill="none" stroke="${O}" stroke-width="1.1" opacity=".35"/>`).join('')).join('')}
<path d="M66 80 L92 90 L90 95 L64 86 Z" fill="${O}"/>
<path d="M134 80 L108 90 L110 95 L136 86 Z" fill="${O}"/>
${eye(80, 96, 9, 7.5, b, { iris: '#ffcf3a', slit: true, pr: 3.2 })}
${eye(120, 96, 9, 7.5, b, { iris: '#ffcf3a', slit: true, pr: 3.2 })}
<ellipse cx="90" cy="118" rx="4" ry="3" fill="${O}" transform="rotate(20 90 118)"/>
<ellipse cx="110" cy="118" rx="4" ry="3" fill="${O}" transform="rotate(-20 110 118)"/>
<circle cx="84" cy="106" r="5" fill="#b8b8c0" opacity=".55"/><circle cx="78" cy="98" r="6" fill="#c8c8d0" opacity=".4"/>
<circle cx="118" cy="104" r="4.5" fill="#b8b8c0" opacity=".55"/>
<path d="M74 132 C88 141 112 141 126 132" fill="none" ${S}/>
<path d="M82 135 L85 143 L88 136 Z M112 136 L115 143 L118 135 Z" fill="#fffaf0" ${S2}/>
<path d="M116 140 c-2 -4 3 -6 5 -4 c2 -3 7 -1 6 3 c3 1 2 6 -2 6 c-2 3 -7 2 -7 -1 c-3 0 -4 -3 -2 -4z" fill="#fbfbf4" ${S2}/>
${o.crown ? crown(100, 44, 22) : ''}`,
};

const troll: ArtDef = {
  draw: (p, b) => `
<path d="${SHOULDERS}" fill="url(#ac)" ${S}/>
<path d="M46 146 C40 110 60 76 100 74 C140 76 160 110 154 146 C140 132 124 128 100 128 C76 128 60 132 46 146 Z" fill="${p.acD}" ${S}/>
<path d="M90 150 L88 180 M110 150 L112 180" stroke="#f4f0e4" stroke-width="2.2"/>
<circle cx="88" cy="182" r="2.4" fill="#f4f0e4" ${S2}/><circle cx="112" cy="182" r="2.4" fill="#f4f0e4" ${S2}/>
<path d="M100 48 C131 48 147 68 147 97 C147 127 128 146 100 146 C72 146 53 127 53 97 C53 68 69 48 100 48 Z" fill="url(#sk)" ${S}/>
<path d="M72 56 L66 40 L80 50 L84 34 L94 50 L102 32 L108 50 L120 36 L122 52 L136 44 L130 60 C114 52 86 52 72 56 Z" fill="${p.hair}" ${S}/>
<path d="M53 100 C44 96 42 114 54 116 Z" fill="url(#sk)" ${S}/>
<path d="M147 100 C156 96 158 114 146 116 Z" fill="url(#sk)" ${S}/>
<path d="M70 124 C80 142 120 142 130 124 C124 134 112 138 100 138 C88 138 76 134 70 124 Z" fill="#9fd8ff" opacity=".35"/>
${eye(86, 88, 5, 4.4, b, { pr: 2.4 })}
${eye(114, 88, 5, 4.4, b, { pr: 2.4 })}
<rect x="72" y="79" width="26" height="18" rx="5" fill="#bfe8ff" fill-opacity=".18" stroke="${O}" stroke-width="3.2"/>
<rect x="102" y="79" width="26" height="18" rx="5" fill="#bfe8ff" fill-opacity=".18" stroke="${O}" stroke-width="3.2"/>
<path d="M98 86 L102 86" stroke="${O}" stroke-width="3"/>
<path d="M76 92 L84 82 M106 92 L114 82" stroke="#e8f6ff" stroke-width="2.4" opacity=".75"/>
<path d="M100 84 C86 84 82 108 88 118 C92 124 108 124 112 118 C118 108 114 84 100 84 Z" fill="url(#sk)" ${S}/>
<circle cx="108" cy="100" r="2.6" fill="${p.skD}" ${S2}/><circle cx="92" cy="110" r="1.8" fill="${p.skD}"/>
<path d="M76 128 C88 136 112 136 124 128 C120 140 80 140 76 128 Z" fill="#2a0c10" ${S}/>
<path d="M84 132 L86 120 L91 131 Z M116 132 L114 120 L109 131 Z" fill="#f4eed8" ${S2}/>
<rect x="116" y="164" width="36" height="40" rx="6" fill="#1a1a22" ${S} transform="rotate(-8 134 184)"/>
<rect x="120" y="168" width="28" height="30" rx="3" fill="#9fdcff" transform="rotate(-8 134 184)"/>
<path d="M124 176 L142 174 M125 182 L140 180 M126 188 L136 187" stroke="#2a5a7a" stroke-width="1.6" transform="rotate(-8 134 184)"/>
<path d="M110 186 C106 176 110 168 118 168 L128 170 C132 176 132 184 128 190 C122 196 112 194 110 186 Z" fill="url(#sk)" ${S}/>
<path d="M116 170 C120 166 126 166 128 170 M114 178 L126 176 M113 185 L125 183" fill="none" ${S2}/>`,
};

const goblin: ArtDef = {
  draw: (p, b) => `
<path d="${SHOULDERS}" fill="#8a6a44" ${S}/>
${Array.from({ length: 7 }, (_, i) => `<path d="M${30 + i * 22} 170 l6 6 l6 -6" fill="none" stroke="#fff" stroke-width="1" opacity=".2"/>`).join('')}
<path d="M82 147 L100 176 L118 147 Z" fill="#e8eef4" ${S2}/>
<path d="M97 152 L103 152 L102 162 L105 190 L100 196 L95 190 L98 162 Z" fill="url(#ac)" ${S2}/>
<path d="M88 126 L112 126 L114 150 C106 155 94 155 86 150 Z" fill="url(#sk)" ${S}/>
<path d="M68 94 C50 86 26 86 12 94 C28 102 50 108 68 104 Z" fill="url(#sk)" ${S}/>
<path d="M132 94 C150 86 174 86 188 94 C172 102 150 108 132 104 Z" fill="url(#sk)" ${S}/>
${shade('M64 96 C50 92 34 92 24 94 C36 98 50 102 64 101 Z', 0.28)}
${shade('M136 96 C150 92 166 92 176 94 C164 98 150 102 136 101 Z', 0.28)}
<path d="M100 56 C124 56 136 74 136 96 C136 120 120 137 100 137 C80 137 64 120 64 96 C64 74 76 56 100 56 Z" fill="url(#sk)" ${S}/>
<path d="M92 58 C90 50 94 46 96 44 M100 57 C100 50 102 46 106 44 M108 58 C110 52 114 50 116 50" fill="none" ${S2}/>
<path d="M60 76 C78 64 122 64 140 76 L142 84 C122 74 78 74 58 84 Z" fill="#2e8a4a" fill-opacity=".85" ${S}/>
<path d="M140 90 L154 70" stroke="${O}" stroke-width="5" stroke-linecap="round"/><path d="M140 90 L154 70" stroke="#ffcf3a" stroke-width="3" stroke-linecap="round"/><path d="M152 72 L156 66" stroke="#ffb0b8" stroke-width="3"/>
${eye(86, 92, 6, 5.4, b, { lid: 0.5, dy: 1, skin: p.skin })}
${eye(114, 92, 6, 5.4, b, { lid: 0.5, dy: 1, skin: p.skin })}
<path d="M78 84 L94 86 M106 86 L122 84" stroke="${O}" stroke-width="2.4" stroke-linecap="round"/>
<path d="M98 94 C104 104 116 114 120 118 C112 120 102 118 96 112 Z" fill="url(#sk)" ${S}/>
<path d="M82 106 C82 100 96 100 96 106 C96 112 82 112 82 106 Z M104 106 C104 100 118 100 118 106 C118 112 104 112 104 106 Z" fill="#bfe8ff" fill-opacity=".25" stroke="#8a6a2a" stroke-width="1.8"/>
<path d="M96 105 L104 105" stroke="#8a6a2a" stroke-width="1.6"/>
<path d="M88 124 C96 127 104 127 112 122" fill="none" ${S2}/>
<path d="M156 186 L160 132" stroke="${O}" stroke-width="12" stroke-linecap="round"/>
<path d="M156 186 L160 132" stroke="url(#wood)" stroke-width="8" stroke-linecap="round"/>
<circle cx="160" cy="128" r="9" fill="#8a5a2a" ${S}/><circle cx="157" cy="125" r="3" fill="#fff" opacity=".3"/>
<path d="M136 184 L178 186 L177 198 L135 196 Z" fill="#6a4a2a" ${S}/>
<path d="M135 196 L177 198 L176 204 L134 202 Z" fill="#c8263c" ${S2}/>
<path d="M146 160 C144 150 150 144 160 144 C170 144 174 152 172 160 C170 168 150 170 146 160 Z" fill="url(#sk)" ${S}/>
<path d="M149 152 C155 150 164 150 170 152 M148 158 C155 156 164 156 171 158" fill="none" ${S2}/>`,
};

// ---------- bosses ----------
const clerk: ArtDef = {
  glow: [[86, 96, 4], [114, 96, 4]],
  draw: (p, b) => {
    const hair = '#8a4ab8';
    const curls = [[62, 72], [58, 92], [62, 112], [70, 56], [84, 46], [100, 42], [116, 46], [130, 56], [138, 72], [142, 92], [138, 112], [76, 66], [124, 66], [92, 54], [108, 54]]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="12" fill="${hair}" ${S}/>`)
      .join('');
    const hl = [[64, 70], [84, 44], [104, 40], [128, 52], [58, 94]].map(([x, y]) => `<circle cx="${x - 3}" cy="${y - 4}" r="4" fill="#fff" opacity=".25"/>`).join('');
    return `
<path d="M8 204 C8 166 34 146 70 144 L130 144 C166 146 192 166 192 204 Z" fill="url(#ac)" ${S}/>
<path d="M18 170 C24 152 46 144 64 146 C54 156 48 166 46 178 Z M182 170 C176 152 154 144 136 146 C146 156 152 166 154 178 Z" fill="${p.acL}" ${S2}/>
<path d="M80 146 L100 168 L120 146 Z" fill="#fff6f0" ${S2}/>
<path d="M100 160 C88 150 80 156 82 164 C84 172 94 168 100 162 C106 168 116 172 118 164 C120 156 112 150 100 160 Z" fill="#e0243c" ${S}/>
<circle cx="100" cy="162" r="3.2" fill="#b8182c" ${S2}/>
<path d="M88 124 L112 124 L114 150 C106 155 94 155 86 150 Z" fill="url(#sk)" ${S}/>
${curls}${hl}
<path d="M100 54 C122 54 134 72 134 96 C134 120 118 137 100 137 C82 137 66 120 66 96 C66 72 78 54 100 54 Z" fill="url(#sk)" ${S}/>
<path d="M74 64 C84 56 116 56 126 64 C116 62 110 66 100 64 C90 66 84 62 74 64 Z" fill="${hair}" ${S2}/>
${crown(100, 50, 14)}
<circle cx="66" cy="112" r="5.5" fill="url(#gold)" ${S2}/><circle cx="134" cy="112" r="5.5" fill="url(#gold)" ${S2}/>
<path d="M76 86 C80 80 90 80 94 86 M106 86 C110 80 120 80 124 86" fill="none" stroke="${O}" stroke-width="2.6" stroke-linecap="round"/>
<ellipse cx="86" cy="96" rx="7" ry="5" fill="#1a0c10"/><ellipse cx="114" cy="96" rx="7" ry="5" fill="#1a0c10"/>
${glowEye(86, 96, 4, b)}${glowEye(114, 96, 4, b)}
<path d="M72 90 C72 84 100 84 100 92 C100 104 72 106 72 98 Z M128 90 C128 84 100 84 100 92 C100 104 128 106 128 98 Z" fill="#dff4ff" fill-opacity=".2" stroke="#b8862a" stroke-width="3"/>
<path d="M72 96 C60 118 62 140 70 150 M128 96 C140 118 138 140 130 150" fill="none" stroke="url(#gold)" stroke-width="1.6" stroke-dasharray="1.5 2"/>
<path d="M100 98 C97 108 96 112 100 114" fill="none" ${S2}/>
<path d="M88 122 C94 118 106 118 112 122 C108 128 92 128 88 122 Z" fill="#d8243c" ${S2}/>
<path d="M90 122 L110 122" stroke="#8a0c1c" stroke-width="1.2"/>
<circle cx="118" cy="116" r="1.8" fill="#5a3a2a"/>
<g transform="rotate(-8 58 168)"><rect x="28" y="156" width="62" height="24" rx="3" fill="#f4efe2" ${S}/>
<rect x="32" y="160" width="54" height="16" rx="1.5" fill="none" stroke="#c8182c" stroke-width="1.2"/>
<text x="59" y="172.5" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="10.5" fill="#c8182c" text-anchor="middle">NIECZYNNE</text></g>`;
  },
};

const tesciowa: ArtDef = {
  glow: [[86, 98, 4], [114, 98, 4]],
  draw: (p, b) => `
<path d="${SHOULDERS}" fill="#3a6a8a" ${S}/>
${[[40, 172], [62, 188], [140, 170], [160, 188], [30, 194], [172, 200]].map(([x, y]) => flower(x, y, 4.4, '#ffd0e0', '#ffcf3a')).join('')}
<path d="M70 150 C84 146 116 146 130 150 L136 204 L64 204 Z" fill="#f4efe6" ${S}/>
<path d="M70 150 C84 158 116 158 130 150" fill="none" ${S2}/>
<path d="M84 128 L116 128 L118 150 C108 156 92 156 82 150 Z" fill="url(#sk)" ${S}/>
<path d="M84 146 C90 156 110 156 116 146" fill="none" stroke="#fffaf0" stroke-width="4.4" stroke-dasharray=".1 5.4" stroke-linecap="round"/>
<path d="M100 50 C126 50 138 70 138 98 C138 124 122 142 100 142 C78 142 62 124 62 98 C62 70 74 50 100 50 Z" fill="url(#sk)" ${S}/>
<path d="M74 52 C68 36 70 22 80 14 C80 28 84 38 90 46 Z M126 52 C132 36 130 22 120 14 C120 28 116 38 110 46 Z" fill="#8a1c24" ${S}/>
${[[70, 60, '#ff8fb8'], [84, 50, '#8fe0ff'], [100, 46, '#ffd86a'], [116, 50, '#8fe0ff'], [130, 60, '#ff8fb8'], [64, 78, '#ffd86a'], [136, 78, '#ffd86a']]
  .map(([x, y, c]) => `<rect x="${(x as number) - 9}" y="${(y as number) - 6}" width="18" height="12" rx="6" fill="${c}" ${S2}/><path d="M${(x as number) - 3} ${(y as number) - 6} L${(x as number) - 3} ${(y as number) + 6} M${(x as number) + 3} ${(y as number) - 6} L${(x as number) + 3} ${(y as number) + 6}" stroke="${O}" stroke-width=".8" opacity=".5"/>`)
  .join('')}
<path d="M72 84 L94 92 L92 96 L70 89 Z" fill="${O}"/>
<path d="M128 84 L106 92 L108 96 L130 89 Z" fill="${O}"/>
<ellipse cx="86" cy="99" rx="7" ry="5" fill="#1a0c10"/><ellipse cx="114" cy="99" rx="7" ry="5" fill="#1a0c10"/>
${glowEye(86, 98, 4, b)}${glowEye(114, 98, 4, b)}
<path d="M100 100 C96 110 95 116 100 118 C103 118 105 116 104 113" fill="none" ${S2}/>
<path d="M84 128 C92 122 108 122 116 128" fill="none" stroke="#8a1c34" stroke-width="3.2" stroke-linecap="round"/>
<path d="M80 112 C82 120 84 126 84 130 M120 112 C118 120 116 126 116 130" fill="none" stroke="${O}" stroke-width="1.2" opacity=".4"/>
<circle cx="64" cy="112" r="4" fill="#fffaf0" ${S2}/><circle cx="136" cy="112" r="4" fill="#fffaf0" ${S2}/>
<path d="M136 204 L178 108" stroke="${O}" stroke-width="18" stroke-linecap="round"/>
<path d="M136 204 L178 108" stroke="url(#wood)" stroke-width="14" stroke-linecap="round"/>
<path d="M176 112 L186 90 M138 200 L130 214" stroke="${O}" stroke-width="8" stroke-linecap="round"/>
<path d="M176 112 L186 90" stroke="#c98a4a" stroke-width="4.4" stroke-linecap="round"/>
<path d="M146 170 C140 160 146 150 156 150 C168 150 172 162 168 170 C164 178 150 178 146 170 Z" fill="url(#sk)" ${S}/>
${crown(100, 44, 13)}`,
};

const palace: ArtDef = {
  glow: [[88, 104, 6], [112, 104, 6]],
  draw: (p, b) => {
    const win = (x: number, y: number, w = 6, h = 8, lit = false) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${lit ? '#ffd86a' : '#2a3448'}"/>`;
    const rows: string[] = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) if (!(r === 1 && c > 1 && c < 6)) rows.push(win(58 + c * 11, 118 + r * 11, 6, 7, (r + c) % 4 === 0));
    const eyeW = (x: number) =>
      b ? `<rect x="${x - 7}" y="98" width="14" height="12" fill="#2a3448" ${S2}/>` : `<rect x="${x - 7}" y="98" width="14" height="12" fill="${mixHex(p.eye, '#ffffff', 0.5)}" ${S2}/>`;
    return `
<path d="M6 204 L10 150 L50 146 L54 204 Z M194 204 L190 150 L150 146 L146 204 Z" fill="url(#conc)" ${S}/>
${[20, 32, 160, 172].map((x) => win(x, 162, 6, 9) + win(x, 180, 6, 9, x === 32)).join('')}
<path d="M50 150 L150 150 L152 204 L48 204 Z" fill="url(#conc)" ${S}/>
<path d="M50 112 L150 112 L150 152 L50 152 Z" fill="url(#conc)" ${S}/>
${rows.join('')}
<path d="M66 82 L134 82 L134 114 L66 114 Z" fill="url(#conc)" ${S}/>
${shade('M118 82 L134 82 L134 114 L118 114 Z M130 112 L150 112 L150 152 L130 152 Z', 0.15)}
<path d="M48 112 L54 106 L60 112 L66 106 L72 112 M128 112 L134 106 L140 112 L146 106 L152 112 M64 82 L70 76 L76 82 M124 82 L130 76 L136 82" fill="url(#conc)" ${S2}/>
${eyeW(88)}${eyeW(112)}
<path d="M76 90 L96 96 L96 100 L76 95 Z M124 90 L104 96 L104 100 L124 95 Z" fill="${O}"/>
<path d="M88 136 C88 124 112 124 112 136 L112 152 L88 152 Z" fill="#1a1216" ${S}/>
<path d="M92 140 L92 150 M100 132 L100 150 M108 140 L108 150" stroke="#ffcf6a" stroke-width="1.6" opacity=".7"/>
<path d="M78 56 L122 56 L122 84 L78 84 Z" fill="url(#conc)" ${S}/>
<circle cx="100" cy="70" r="9" fill="#f4efe2" ${S2}/><path d="M100 70 L100 64 M100 70 L105 72" stroke="${O}" stroke-width="1.6"/>
<path d="M86 36 L114 36 L114 58 L86 58 Z" fill="url(#conc)" ${S}/>
<path d="M92 36 L100 6 L108 36 Z" fill="url(#conc)" ${S}/>
<path d="M100 6 L100 -4" stroke="${O}" stroke-width="2"/><circle cx="100" cy="4" r="2" fill="url(#gold)"/>
${[64, 88, 112, 136].map((x) => `<path d="M${x} 82 L${x} 56" stroke="${O}" stroke-width="1" opacity=".2"/>`).join('')}
<path d="M58 142 C54 128 62 120 70 124" fill="none" stroke="${p.acc}" stroke-width="2" opacity=".8"/>`;
  },
};

export const ART: Record<string, ArtDef> = {
  grill, babcia, kombinator,
  imp, drowner, skeleton, ghost, salesman, golem, dragon, troll, goblin,
  clerk, tesciowa, palace,
};

export function artSVG(id: string, pal: Pal, blink: boolean, o: ArtOpts = {}): string {
  const p = full(pal);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">${defs(p)}${ART[id].draw(p, blink, o)}</svg>`;
}

export function artGlow(id: string): [number, number, number][] {
  return ART[id].glow ?? [];
}

export const svgURL = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
