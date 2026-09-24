import '@fontsource/grenze-gotisch/latin-600.css';
import '@fontsource/grenze-gotisch/latin-ext-600.css';
import '@fontsource/grenze-gotisch/latin-700.css';
import '@fontsource/grenze-gotisch/latin-ext-700.css';
import '@fontsource/alegreya-sans/latin-400.css';
import '@fontsource/alegreya-sans/latin-ext-400.css';
import '@fontsource/alegreya-sans/latin-500.css';
import '@fontsource/alegreya-sans/latin-ext-500.css';
import '@fontsource/alegreya-sans/latin-700.css';
import '@fontsource/alegreya-sans/latin-ext-700.css';
import '@fontsource/alegreya-sans/latin-800.css';
import '@fontsource/alegreya-sans/latin-ext-800.css';
import '@fontsource/alegreya-sans/latin-400-italic.css';
import './style.css';
import { initApp } from './app';
import { Game } from './flow';

async function boot() {
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('600 20px "Grenze Gotisch"', 'Ąę'),
        document.fonts.load('700 20px "Grenze Gotisch"', 'Ąę'),
        document.fonts.load('800 16px "Alegreya Sans"', 'Ąę'),
        document.fonts.load('600 16px "Alegreya Sans"', 'Ąę'),
      ]),
      new Promise((r) => setTimeout(r, 1500)),
    ]);
  } catch {
    /* fall back to system fonts */
  }
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

boot();
