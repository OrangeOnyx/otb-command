// Render a film page frame-by-frame to MP4.
//   node render.mjs                                   → reel.html  → out/cypress-command-reel.mp4 (+ out/score.wav)
//   node render.mjs --page film.html --palette bayou  → film.html  → out/film-bayou.mp4 (+ out/film-score.wav)
//   options: [--fps 60] [--blur 4] [--workers 4] [--from 0 --to <dur>] [--share]  (--share also writes <name>-share.mp4, ≈2.5 Mb/s, for uploads with a 30 MB cap)
// Needs: playwright (global), python3 + imageio-ffmpeg (bundled ffmpeg), the score wav (python3 score.py / film_score.py).
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn, execFileSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const sarg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const arg = (k, d) => Number(sarg(k, d));
const PAGE = sarg('page', 'reel.html'), PALETTE = sarg('palette', '');
const isFilm = PAGE !== 'reel.html';
const FPS = arg('fps', 60), BLUR = arg('blur', 4), WORKERS = arg('workers', 4), FROM = arg('from', 0), TO = arg('to', isFilm ? 90 : 48);
const FF = process.env.FFMPEG || execFileSync('python3', ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())']).toString().trim();
const out = path.join(here, 'out'); mkdirSync(out, { recursive: true });
const total = Math.round((TO - FROM) * FPS);
const per = Math.ceil(total / WORKERS);
const url = pathToFileURL(path.join(here, PAGE)).href + '?render' + (PALETTE ? '&palette=' + PALETTE : '');
const tag = isFilm ? `film-${PALETTE || 'terra'}` : 'reel';
const t0 = Date.now();

const browser = await chromium.launch();
async function worker(w) {
  const a = w * per, b = Math.min(total, a + per);
  if (a >= b) return null;
  const seg = path.join(out, `seg-${tag}-${w}.mp4`);
  const ff = spawn(FF, ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', String(FPS), seg], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', c => c ? rej(new Error('ffmpeg ' + c)) : res()));
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', e => console.error(`[w${w}]`, e.message));
  await page.goto(url);
  await page.evaluate(() => window.READY);
  const canvas = page.locator('canvas');
  for (let f = a; f < b; f++) {
    await page.evaluate(([t, s]) => window.renderFrame(t, s), [FROM + f / FPS, BLUR]);
    const buf = await canvas.screenshot({ type: 'jpeg', quality: 96 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (w === 0 && (f - a) % 60 === 0) console.log(`frame ${f - a}/${b - a} (worker 0) · ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end(); await done; await page.close();
  return seg;
}
const segs = (await Promise.all([...Array(WORKERS).keys()].map(worker))).filter(Boolean);
await browser.close();

const list = path.join(out, `segs-${tag}.txt`);
writeFileSync(list, segs.map(s => `file '${s}'`).join('\n'));
const score = path.join(out, isFilm ? 'film-score.wav' : 'score.wav');
const final = path.join(out, isFilm ? `${tag}.mp4` : 'cypress-command-reel.mp4');
const audioArgs = existsSync(score) && FROM === 0 ? ['-i', score, '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '256k', '-shortest'] : [];
execFileSync(FF, ['-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, ...audioArgs, '-c:v', 'copy', '-movflags', '+faststart', final], { stdio: 'inherit' });
console.log(`wrote ${final} · ${total} frames · ${((Date.now() - t0) / 1000).toFixed(0)}s`);
if (process.argv.includes('--share')) {
  const share = final.replace(/\.mp4$/, '-share.mp4');
  execFileSync(FF, ['-loglevel', 'error', '-y', '-i', final, '-c:v', 'libx264', '-preset', 'slow', '-b:v', '2350k', '-maxrate', '3200k', '-bufsize', '6000k',
    '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', share], { stdio: 'inherit' });
  console.log(`wrote ${share}`);
}
