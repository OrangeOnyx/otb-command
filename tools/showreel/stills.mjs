// Dev aid: node stills.mjs [--page film.html] [--palette terra] [--format vertical] 3 7.5 16 … → out/still-<t>.png
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
const argv = process.argv.slice(2), opt = k => { const i = argv.indexOf('--' + k); if (i < 0) return null; const v = argv[i + 1]; argv.splice(i, 2); return v; };
const page = opt('page') || 'reel.html', palette = opt('palette'), prefix = opt('prefix') || 'still', format = opt('format');
const [VW, VH] = format === 'vertical' ? [1080, 1920] : [1920, 1080];
mkdirSync(new URL('out/', import.meta.url), { recursive: true });
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: VW, height: VH } });
p.on('pageerror', e => console.error('PAGEERROR', e.message));
await p.goto(pathToFileURL(new URL(page, import.meta.url).pathname).href + '?render' + (palette ? '&palette=' + palette : '') + (format ? '&format=' + format : ''));
await p.evaluate(() => window.READY);
for (const t of argv.map(Number)) {
  await p.evaluate(t => window.renderFrame(t, 1), t);
  await p.locator('canvas').screenshot({ path: new URL(`out/${prefix}-${t}.png`, import.meta.url).pathname });
}
await b.close();
