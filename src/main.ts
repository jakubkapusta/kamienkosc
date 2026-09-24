import '@fontsource/lilita-one/latin-400.css';
import '@fontsource/lilita-one/latin-ext-400.css';
import '@fontsource/signika/latin-400.css';
import '@fontsource/signika/latin-ext-400.css';
import '@fontsource/signika/latin-600.css';
import '@fontsource/signika/latin-ext-600.css';
import '@fontsource/signika/latin-700.css';
import '@fontsource/signika/latin-ext-700.css';
import '@fontsource/courier-prime/latin-400.css';
import '@fontsource/courier-prime/latin-ext-400.css';
import '@fontsource/courier-prime/latin-700.css';
import '@fontsource/courier-prime/latin-ext-700.css';
import '@fontsource/caveat/latin-700.css';
import '@fontsource/caveat/latin-ext-700.css';
import './style.css';
import { initApp } from './app';
import { Game } from './flow';
import { gemArt } from './gfx/gems';

async function boot() {
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('400 20px "Lilita One"', 'Ąę'),
        document.fonts.load('700 16px "Signika"', 'Ąę'),
        document.fonts.load('600 16px "Signika"', 'Ąę'),
        document.fonts.load('400 16px "Signika"', 'Ąę'),
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
