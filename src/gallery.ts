import { ART, artSVG, svgURL, type Pal } from './gfx/art';
import { GEM_SVG } from './gfx/gemsvg';
import { PLACE_KINDS, PLACE_NAMES, placeSVG } from './gfx/places';

const PALS: Record<string, Pal> = {
  grill: { skin: '#f0b89a', acc: '#d8402c', eye: '#fff' },
  babcia: { skin: '#f2c4a8', acc: '#c8322a', eye: '#fff', hair: '#bdb6b0' },
  kombinator: { skin: '#e8b494', acc: '#2a4ab8', eye: '#fff', hair: '#2a1a12' },
  hydraulik: { skin: '#eab08e', acc: '#2a64c8', eye: '#7ac8ff', hair: '#3a2616' },
  bazarowa: { skin: '#f0bea0', acc: '#c83a6a', eye: '#ffd86a', hair: '#d8762e' },
  dres: { skin: '#e8b08c', acc: '#26262e', eye: '#ff6a3a', hair: '#3a2a1e' },
  wrozka: { skin: '#e8b89a', acc: '#7a2ab8', eye: '#d86aff', hair: '#1e1420' },
  imp: { skin: '#d8483a', acc: '#35a04a', eye: '#ffcf3a' },
  drowner: { skin: '#5aa08a', acc: '#2a6a8a', eye: '#c8d84a' },
  skeleton: { skin: '#e8dcc0', acc: '#8a2a3a', eye: '#7af0ff' },
  ghost: { skin: '#cfe3ea', acc: '#5a4a8a', eye: '#9fe8ff' },
  salesman: { skin: '#9ab09a', acc: '#c8263c', eye: '#ff5a3d' },
  golem: { skin: '#a8a296', acc: '#ff5a3d', eye: '#ffcf3a' },
  dragon: { skin: '#4a9a5a', acc: '#2a6a3a', eye: '#ffcf3a' },
  troll: { skin: '#8a9a7a', acc: '#4a5a6a', eye: '#fff', hair: '#3a3a2a' },
  goblin: { skin: '#7aaa4a', acc: '#6a2a8a', eye: '#fff' },
  clerk: { skin: '#f0c4a8', acc: '#b83a6a', eye: '#ff3b3b' },
  tesciowa: { skin: '#e8b4a0', acc: '#c8322a', eye: '#ff3b3b' },
  palace: { skin: '#b8b0a2', acc: '#e8b53e', eye: '#ffd86a' },
};

export function gallery() {
  document.documentElement.style.cssText = 'overflow:auto;height:auto'; document.body.style.cssText = 'overflow:auto;height:auto';
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;padding:8px;background:#0b0816';
  for (const id of Object.keys(ART)) {
    const pal = PALS[id];
    for (const blink of [false, true]) {
      if (blink && !['grill', 'hydraulik', 'bazarowa', 'dres', 'wrozka'].includes(id)) continue;
      const fig = document.createElement('figure');
      fig.style.cssText = 'margin:0;color:#f3e7cf;font:14px sans-serif;text-align:center';
      fig.innerHTML = `<img src="${svgURL(artSVG(id, pal, blink, { crown: id === 'dragon' }))}" style="width:100%;background:radial-gradient(#3a2a4a,#120c1c);border-radius:50%"><figcaption>${id}${blink ? ' (mruga)' : ''}</figcaption>`;
      wrap.appendChild(fig);
    }
  }
  const gems = document.createElement('div');
  gems.style.cssText = 'display:flex;flex-wrap:wrap;gap:12px;padding:12px;background:#140e22';
  gems.innerHTML = GEM_SVG.map((g) => `<img src="${svgURL(g)}" style="width:120px">`).join('') + GEM_SVG.map((g) => `<img src="${svgURL(g)}" style="width:44px">`).join('');
  const places = document.createElement('div');
  places.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;padding:12px;background:#7fa65a';
  places.innerHTML = PLACE_KINDS.map((k) => `<figure style="margin:0;text-align:center;font:12px sans-serif"><img src="${svgURL(placeSVG(k))}" style="width:100%"><figcaption>${PLACE_NAMES[k]}</figcaption></figure>`).join('');
  document.body.innerHTML = '';
  document.body.appendChild(places);
  document.body.appendChild(gems);
  document.body.appendChild(wrap);
}
