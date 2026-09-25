// Weight files (not per-subset ones): only they declare unicode-range, without it Android
// renders Polish letters from a fallback font.
import '@fontsource/paytone-one/400.css';
import '@fontsource/signika/400.css';
import '@fontsource/signika/600.css';
import '@fontsource/signika/700.css';
import '@fontsource/courier-prime/400.css';
import '@fontsource/courier-prime/700.css';
import '@fontsource/caveat/700.css';
import './style.css';
import { initApp } from './app';
import { Game } from './flow';
import { gemArt } from './gfx/gems';

async function boot() {
  try {
    await Promise.race([
      Promise.all([
        // latin + latin-ext faces are separate files; ask for both so canvas text has Polish glyphs
        document.fonts.load('400 20px "Paytone One"', 'AaĄęŚńż'),
        document.fonts.load('700 16px "Signika"', 'AaĄęŚńż'),
        document.fonts.load('600 16px "Signika"', 'AaĄęŚńż'),
        document.fonts.load('400 16px "Signika"', 'AaĄęŚńż'),
      ]),
      new Promise((r) => setTimeout(r, 1500)),
    ]);
  } catch {
    /* fall back to system fonts */
  }
  await gemArt.load();
  const app = initApp();
  const game = new Game();
  game.start();
  if (import.meta.env.DEV) Object.assign(window, { __sf: { app, game } });
  try {
    if (window.self === window.top && 'serviceWorker' in navigator && location.protocol === 'https:') {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  } catch {
    /* sandboxed frame: no offline cache */
  }
}

if (import.meta.env.DEV && location.hash === '#galeria') import('./gallery').then((m) => m.gallery());
else boot();
