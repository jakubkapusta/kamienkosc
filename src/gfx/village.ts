import { RNG } from '../core/rng';

/**
 * Procedural top-down Polish village painted as one SVG: patchwork fields, a river,
 * woods, cottages and the roads that connect the map's places.
 */

export type P2 = [number, number];
export interface Road { a: P2; b: P2; c: P2; kind: 'asphalt' | 'dirt' }

export function roadPoint(r: Road, t: number): P2 {
  const u = 1 - t;
  return [u * u * r.a[0] + 2 * u * t * r.c[0] + t * t * r.b[0], u * u * r.a[1] + 2 * u * t * r.c[1] + t * t * r.b[1]];
}

export function makeRoad(a: P2, b: P2, rng: RNG): Road {
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const d = Math.hypot(dx, dy) || 1;
  const off = rng.range(-0.22, 0.22) * d;
  return { a, b, c: [mx - (dy / d) * off, my + (dx / d) * off], kind: rng.chance(0.45) ? 'asphalt' : 'dirt' };
}

const f = (n: number) => n.toFixed(1);

function smoothPath(pts: P2[]): string {
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    const c1: P2 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: P2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

export function villageSVG(W: number, H: number, spots: P2[], roads: Road[], seed: number): string {
  const rng = new RNG(seed);
  const roadPts: P2[] = [];
  for (const r of roads) for (let k = 0; k <= 12; k++) roadPts.push(roadPoint(r, k / 12));
  const near = (p: P2, list: P2[], d: number) => list.some((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < d);
  const free = (p: P2, spot = 52, road = 16) => !near(p, spots, spot) && !near(p, roadPts, road);

  let defs = '';
  let out = `<rect width="${W}" height="${H}" fill="#86ad5e"/>`;
  for (let i = 0; i < 9; i++) {
    const id = `bl${i}`;
    const light = i % 2 === 0;
    defs += `<radialGradient id="${id}"><stop offset="0" stop-color="${light ? '#a4c66e' : '#6a9448'}" stop-opacity=".7"/><stop offset="1" stop-color="${light ? '#a4c66e' : '#6a9448'}" stop-opacity="0"/></radialGradient>`;
    out += `<circle cx="${f(rng.range(0, W))}" cy="${f(rng.range(0, H))}" r="${f(rng.range(80, 200))}" fill="url(#${id})"/>`;
  }

  // patchwork fields
  const kinds = [
    ['#d9c274', '#c3a854'], ['#a9c96c', '#93b35a'], ['#8d6c4a', '#72573a'], ['#e6d64c', '#cfbd34'], ['#7aa04c', '#658a3c'], ['#c9b98a', '#b3a276'],
  ];
  const cw = 104, ch = 78;
  let fid = 0;
  for (let gy = -ch / 2; gy < H + ch; gy += ch) {
    for (let gx = -cw / 2 + ((gy / ch) % 2 ? cw / 3 : 0); gx < W + cw; gx += cw) {
      if (!rng.chance(0.5)) continue;
      const cx = gx + rng.range(-10, 10), cy = gy + rng.range(-8, 8);
      const hw = cw * rng.range(0.36, 0.46), hh = ch * rng.range(0.34, 0.44);
      const a = rng.range(-0.22, 0.22);
      const corner = (sx: number, sy: number): P2 => {
        const x = sx * hw + rng.range(-5, 5), y = sy * hh + rng.range(-4, 4);
        return [cx + x * Math.cos(a) - y * Math.sin(a), cy + x * Math.sin(a) + y * Math.cos(a)];
      };
      const poly = [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)];
      const [c1, c2] = rng.pick(kinds);
      const id = `fd${fid++}`;
      const pts = poly.map((p) => `${f(p[0])},${f(p[1])}`).join(' ');
      defs += `<clipPath id="${id}"><polygon points="${pts}"/></clipPath>`;
      let stripes = '';
      const step = rng.pick([6, 7, 8]);
      const sa = a + (rng.chance(0.5) ? 0 : Math.PI / 2);
      for (let k = -24; k <= 24; k++) {
        const ox = cx + Math.cos(sa + Math.PI / 2) * k * step, oy = cy + Math.sin(sa + Math.PI / 2) * k * step;
        stripes += `<line x1="${f(ox - Math.cos(sa) * 90)}" y1="${f(oy - Math.sin(sa) * 90)}" x2="${f(ox + Math.cos(sa) * 90)}" y2="${f(oy + Math.sin(sa) * 90)}"/>`;
      }
      out += `<polygon points="${pts}" fill="${c1}" fill-opacity=".85"/><g clip-path="url(#${id})" stroke="${c2}" stroke-width="1.1" stroke-opacity=".55">${stripes}</g><polygon points="${pts}" fill="none" stroke="#5f7f3e" stroke-width="1.2" stroke-opacity=".35"/>`;
    }
  }

  // river
  const ry = rng.range(H * 0.38, H * 0.58);
  const riv: P2[] = [];
  for (let k = 0; k <= 8; k++) riv.push([-30 + (k * (W + 60)) / 8, ry + Math.sin(k * 1.3 + rng.range(0, 3)) * rng.range(14, 34)]);
  const rp = smoothPath(riv);
  out += `<path d="${rp}" fill="none" stroke="#5e7e40" stroke-width="34" stroke-opacity=".55" stroke-linecap="round"/>
<path d="${rp}" fill="none" stroke="#c9b98a" stroke-width="28" stroke-linecap="round"/>
<path d="${rp}" fill="none" stroke="#4a86c4" stroke-width="22" stroke-linecap="round"/>
<path d="${rp}" fill="none" stroke="#7ab6e6" stroke-width="3" stroke-dasharray="18 26" stroke-linecap="round" transform="translate(0 -4)"/>`;
  for (let k = 0; k < 12; k++) {
    const p = riv[rng.int(0, riv.length - 1)];
    const x = p[0] + rng.range(-40, 40), y = p[1] + (rng.chance(0.5) ? -14 : 14) + rng.range(-3, 3);
    if (!free([x, y], 40, 10)) continue;
    out += `<path d="M${f(x)} ${f(y)} l-1.5 -7 M${f(x + 2)} ${f(y)} l0 -9 M${f(x + 4)} ${f(y)} l1.5 -7" stroke="#4a6a2a" stroke-width="1.4" stroke-linecap="round"/>`;
  }

  // pond
  for (let tries = 0; tries < 30; tries++) {
    const p: P2 = [rng.range(40, W - 40), rng.range(H * 0.15, H * 0.9)];
    if (!free(p, 80, 40) || Math.abs(p[1] - ry) < 70) continue;
    const rx = rng.range(22, 34), ryy = rx * 0.62;
    out += `<ellipse cx="${f(p[0])}" cy="${f(p[1])}" rx="${f(rx + 5)}" ry="${f(ryy + 4)}" fill="#c9b98a"/><ellipse cx="${f(p[0])}" cy="${f(p[1])}" rx="${f(rx)}" ry="${f(ryy)}" fill="#4a86c4"/><ellipse cx="${f(p[0] - rx * 0.3)}" cy="${f(p[1] - ryy * 0.3)}" rx="${f(rx * 0.35)}" ry="${f(ryy * 0.2)}" fill="#8cc4ef" opacity=".7"/>`;
    out += `<path d="M${f(p[0] + rx * 0.3)} ${f(p[1] + 2)} q4 -3 8 0 q-4 3 -8 0" fill="#f4f4f4" stroke="#1f1218" stroke-width=".8"/>`;
    break;
  }

  // roads
  const road = (r: Road) => `M${f(r.a[0])} ${f(r.a[1])} Q${f(r.c[0])} ${f(r.c[1])} ${f(r.b[0])} ${f(r.b[1])}`;
  for (const r of roads) out += `<path d="${road(r)}" fill="none" stroke="${r.kind === 'asphalt' ? '#3a3a40' : '#6a5236'}" stroke-width="${r.kind === 'asphalt' ? 14 : 12}" stroke-linecap="round"/>`;
  for (const r of roads) {
    if (r.kind === 'asphalt') out += `<path d="${road(r)}" fill="none" stroke="#6d6d74" stroke-width="10.5" stroke-linecap="round"/><path d="${road(r)}" fill="none" stroke="#f2f0e4" stroke-width="1.3" stroke-dasharray="7 8"/>`;
    else out += `<path d="${road(r)}" fill="none" stroke="#c9a870" stroke-width="9" stroke-linecap="round"/><path d="${road(r)}" fill="none" stroke="#a8884e" stroke-width="1.4" stroke-dasharray="3 5" transform="translate(-2 0)"/><path d="${road(r)}" fill="none" stroke="#a8884e" stroke-width="1.4" stroke-dasharray="3 5" transform="translate(2 0)"/>`;
  }

  // woods
  for (let c = 0; c < 4; c++) {
    const cx = rng.range(0, W), cy = rng.range(H * 0.1, H);
    const n = rng.int(6, 12);
    for (let k = 0; k < n; k++) {
      const x = cx + rng.range(-46, 46), y = cy + rng.range(-30, 30);
      if (!free([x, y], 46, 16)) continue;
      const r = rng.range(6, 10.5);
      if (rng.chance(0.35)) {
        out += `<ellipse cx="${f(x + 3)}" cy="${f(y + r * 0.9)}" rx="${f(r * 0.9)}" ry="${f(r * 0.35)}" fill="#000" opacity=".22"/><path d="M${f(x)} ${f(y - r * 1.5)} L${f(x + r)} ${f(y + r * 0.7)} L${f(x - r)} ${f(y + r * 0.7)} Z" fill="#2f5e34" stroke="#1f3a22" stroke-width="1"/>`;
      } else {
        const col = rng.pick(['#3f7a3a', '#4a8a3e', '#356a32', '#5a943e']);
        out += `<ellipse cx="${f(x + 3)}" cy="${f(y + r * 0.8)}" rx="${f(r)}" ry="${f(r * 0.4)}" fill="#000" opacity=".22"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${col}" stroke="#1f3a22" stroke-width="1"/><circle cx="${f(x - r * 0.3)}" cy="${f(y - r * 0.35)}" r="${f(r * 0.45)}" fill="#fff" opacity=".14"/>`;
      }
    }
  }

  // cottages along the roads
  let houses = 0;
  for (let tries = 0; tries < 160 && houses < 6; tries++) {
    const base = rng.pick(roadPts);
    const a = rng.range(0, Math.PI * 2), d = rng.range(18, 30);
    const p: P2 = [base[0] + Math.cos(a) * d, base[1] + Math.sin(a) * d];
    if (p[0] < 10 || p[0] > W - 10 || !free(p, 50, 13)) continue;
    houses++;
    const roof = rng.pick(['#b8483a', '#8a4a3a', '#6a6a7a', '#a8603a']);
    const w = rng.range(12, 16), h = w * 0.7;
    out += `<rect x="${f(p[0] - w / 2 + 2)}" y="${f(p[1] - h / 2 + 3)}" width="${f(w)}" height="${f(h)}" fill="#000" opacity=".22"/>
<rect x="${f(p[0] - w / 2)}" y="${f(p[1] - h / 2)}" width="${f(w)}" height="${f(h)}" fill="${roof}" stroke="#1f1218" stroke-width="1"/>
<path d="M${f(p[0] - w / 2)} ${f(p[1])} L${f(p[0] + w / 2)} ${f(p[1])}" stroke="#1f1218" stroke-width=".8" opacity=".5"/>
<rect x="${f(p[0] - w / 2)}" y="${f(p[1] - h / 2)}" width="${f(w)}" height="${f(h / 2)}" fill="#fff" opacity=".12"/>`;
  }

  defs += `<radialGradient id="vig" cx=".5" cy=".5" r=".75"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></radialGradient>
<linearGradient id="top" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b0816" stop-opacity=".75"/><stop offset="1" stop-color="#0b0816" stop-opacity="0"/></linearGradient>
<linearGradient id="warm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffcf8a" stop-opacity=".12"/><stop offset="1" stop-color="#3a2a6a" stop-opacity=".18"/></linearGradient>`;
  out += `<rect width="${W}" height="${H}" fill="url(#warm)"/><rect width="${W}" height="${H}" fill="url(#vig)"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs>${defs}</defs>${out}</svg>`;
}
