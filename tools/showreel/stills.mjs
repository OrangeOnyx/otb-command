// Dev aid: node stills.mjs 3 7.5 16 … → out/still-<t>.png
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
mkdirSync(new URL('out/', import.meta.url), { recursive: true });
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
p.on('pageerror', e => console.error('PAGEERROR', e.message));
await p.goto(pathToFileURL(new URL('reel.html', import.meta.url).pathname).href + '?render');
await p.evaluate(() => window.READY);
for (const t of process.argv.slice(2).map(Number)) {
  await p.evaluate(t => window.renderFrame(t, 1), t);
  await p.locator('canvas').screenshot({ path: new URL(`out/still-${t}.png`, import.meta.url).pathname });
}
await b.close();
