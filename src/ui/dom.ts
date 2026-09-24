import { sfx } from '../core/audio';
import { ELEM_COLOR } from '../core/types';
import { gemArt } from '../gfx/gems';
import { RELICS } from '../game/content';
import type { SpellInst } from '../game/fighter';
import { SPELLS } from '../game/spells';

export function el<T extends HTMLElement = HTMLElement>(html: string): T {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild as T;
}

export const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export function costHTML(cost: number[], hp?: number) {
  const parts = cost
    .map((n, c) => (n > 0 ? `<span class="cost"><img src="${gemArt.icon(c)}" alt=""><b>${n}</b></span>` : ''))
    .join('');
  const h = hp ? `<span class="cost hp"><i class="heart"></i><b>${hp}</b></span>` : '';
  return parts + h || '<span class="cost free">za darmo</span>';
}

export function spellHTML(inst: SpellInst, extra = '') {
  const d = SPELLS[inst.id];
  return `<div class="spell" style="--el:${ELEM_COLOR[d.elem]}">
    <div class="spell-head"><span class="orb"></span><span class="spell-name">${esc(d.name)}${inst.lvl > 1 ? '<em>+</em>' : ''}</span>${d.quick ? '<span class="tag">szybki</span>' : ''}</div>
    <div class="spell-cost">${costHTML(d.cost, d.hp)}</div>
    <p>${esc(d.desc(inst.lvl))}</p>${extra}
  </div>`;
}

export function relicHTML(id: string, extra = '') {
  const r = RELICS[id];
  return `<div class="relic" style="--el:${ELEM_COLOR[r.elem]}"><span class="rune"></span><div><strong>${esc(r.name)}</strong><p>${esc(r.desc)}</p></div>${extra}</div>`;
}

let tipEl: HTMLElement | null = null;

export function showTip(html: string, r: { x: number; y: number; w: number; h: number }, below: boolean) {
  hideTip();
  tipEl = el(`<div class="tip">${html}</div>`);
  document.getElementById('ui')!.appendChild(tipEl);
  const tw = tipEl.offsetWidth, th = tipEl.offsetHeight;
  const x = Math.max(10, Math.min(window.innerWidth - tw - 10, r.x + r.w / 2 - tw / 2));
  const y = below ? r.y + r.h + 8 : r.y - th - 8;
  tipEl.style.left = `${x}px`;
  tipEl.style.top = `${Math.max(10, Math.min(window.innerHeight - th - 10, y))}px`;
  tipEl.addEventListener('pointerdown', hideTip);
}

export function hideTip() {
  tipEl?.remove();
  tipEl = null;
}

/** Full-screen overlay panel. Resolves the returned promise via `close(value)`. */
export function overlay<T>(html: string, bind: (root: HTMLElement, close: (v: T) => void) => void, cls = ''): Promise<T> {
  return new Promise<T>((resolve) => {
    const root = el(`<div class="screen ${cls}"><div class="panel">${html}</div></div>`);
    document.getElementById('ui')!.appendChild(root);
    requestAnimationFrame(() => root.classList.add('in'));
    let done = false;
    const close = (v: T) => {
      if (done) return;
      done = true;
      root.classList.remove('in');
      root.classList.add('out');
      setTimeout(() => root.remove(), 260);
      resolve(v);
    };
    root.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('button, .pick')) sfx.click();
    });
    bind(root, close);
  });
}

export function toast(text: string) {
  const t = el(`<div class="toast">${esc(text)}</div>`);
  document.getElementById('ui')!.appendChild(t);
  requestAnimationFrame(() => t.classList.add('in'));
  setTimeout(() => {
    t.classList.remove('in');
    setTimeout(() => t.remove(), 400);
  }, 1800);
}
