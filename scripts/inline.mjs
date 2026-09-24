// Builds dist-single/index.html: the whole game (JS, CSS, fonts, icon) in one self-contained file.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const dist = resolve('dist');
let html = readFileSync(join(dist, 'index.html'), 'utf8');

const dataUri = (file) => {
  const ext = file.split('.').pop();
  const mime = { woff2: 'font/woff2', woff: 'font/woff', svg: 'image/svg+xml', png: 'image/png' }[ext] ?? 'application/octet-stream';
  return `data:${mime};base64,${readFileSync(file).toString('base64')}`;
};

html = html.replace(/<link rel="stylesheet"[^>]*href="\.\/([^"]+)"[^>]*>/g, (_, href) => {
  const cssPath = join(dist, href);
  let css = readFileSync(cssPath, 'utf8');
  css = css.replace(/,\s*url\([^)]+\.woff\)\s*format\(["']woff["']\)/g, '');
  css = css.replace(/url\(([^)]+)\)/g, (m, u) => {
    const clean = u.replace(/["']/g, '');
    if (clean.startsWith('data:')) return m;
    return `url(${dataUri(join(dirname(cssPath), clean))})`;
  });
  return `<style>${css}</style>`;
});

html = html.replace(/<script type="module" crossorigin src="\.\/([^"]+)"><\/script>/g, (_, src) => {
  const js = readFileSync(join(dist, src), 'utf8').replace(/<\/script/g, '<\\/script');
  return `<script type="module">${js}</script>`;
});

html = html
  .replace(/<link rel="manifest"[^>]*>\s*/g, '')
  .replace(/<link rel="apple-touch-icon"[^>]*>\s*/g, '')
  .replace(/<link rel="icon"[^>]*>/, `<link rel="icon" href="${dataUri(join(dist, 'icon.svg'))}" type="image/svg+xml">`);

mkdirSync('dist-single', { recursive: true });
writeFileSync('dist-single/index.html', html);
console.log(`dist-single/index.html  ${(html.length / 1024).toFixed(0)} KB`);

// Fragment variant for hosts that supply their own <html>/<head>/<body> skeleton.
const head = html.match(/<head>([\s\S]*?)<\/head>/)[1]
  .replace(/<meta charset[^>]*>\s*/, '')
  .replace(/<meta name="viewport"[^>]*>\s*/, '');
const body = html.match(/<body>([\s\S]*?)<\/body>/)[1];
writeFileSync('dist-single/fragment.html', `${head.trim()}\n${body.trim()}\n`);
