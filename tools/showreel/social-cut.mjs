// Cut the ~31s social edit from a rendered film master. Every cut sits on the 120 BPM beat grid,
// so the score stays in time across edits; 12 ms audio fades at each seam prevent clicks.
//   node social-cut.mjs [--palette bayou]                     → out/social-<palette>.mp4          (cuts out/film-<palette>.mp4)
//   node social-cut.mjs [--palette bayou] --format vertical   → out/social-<palette>-vertical.mp4 (renders each shot at
//     1080×1920 via render.mjs, then cuts them to out/film-score.wav) — for Reels, Shorts, TikTok and LinkedIn mobile
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const i = process.argv.indexOf('--palette'), PALETTE = i > 0 ? process.argv[i + 1] : 'bayou';
const j = process.argv.indexOf('--format'), FORMAT = j > 0 ? process.argv[j + 1] : '';
const FF = process.env.FFMPEG || execFileSync('python3', ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())']).toString().trim();
const SEGMENTS = [ // [in, out] in film seconds
  [4, 8],   // hook: "…a thousand small promises." + the e-piano question → shatter
  [22, 28], // the pile peaks · dead stop · "What if every promise had a place?"
  [28, 34], // the snap · the wall · "Everything has a place." · cards fly into the suites
  [40, 42], // night: "Nothing slips."
  [44, 46], // the dive through the roof into the app
  [52, 54], // carousel spin → AI-1
  [80, 89], // the mark slams home · sign-off · the clock · cut to black
];
const out = path.join(here, 'out');
const enc = ['-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-maxrate', '6500k', '-bufsize', '12000k', '-pix_fmt', 'yuv420p', '-r', '60',
  '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart'];
const aseg = (inp, [a, b], k) => `[${inp}:a]atrim=${a}:${b},asetpts=PTS-STARTPTS,afade=t=in:d=0.012,afade=t=out:st=${(b - a - 0.012).toFixed(3)}:d=0.012[a${k}];`;
let args, dst;
if (FORMAT === 'vertical') {
  // each shot is its own render (frames are pure functions of t); audio comes from the score itself
  const shots = SEGMENTS.map(([a, b]) => {
    const f = path.join(out, `film-${PALETTE}-vertical-${a}-${b}.mp4`);
    if (!existsSync(f) || process.argv.includes('--fresh'))
      execFileSync('node', [path.join(here, 'render.mjs'), '--page', 'film.html', '--palette', PALETTE, '--format', 'vertical', '--from', String(a), '--to', String(b)], { stdio: 'inherit' });
    return f;
  });
  const n = shots.length;
  const f = shots.map((_, k) => `[${k}:v]setpts=PTS-STARTPTS[v${k}];`).join('') + SEGMENTS.map((sg, k) => aseg(n, sg, k)).join('') +
    SEGMENTS.map((_, k) => `[v${k}][a${k}]`).join('') + `concat=n=${n}:v=1:a=1[v][a]`;
  dst = path.join(out, `social-${PALETTE}-vertical.mp4`);
  args = [...shots.flatMap(s => ['-i', s]), '-i', path.join(out, 'film-score.wav'), '-filter_complex', f, '-map', '[v]', '-map', '[a]', ...enc, dst];
} else {
  const f = SEGMENTS.map(([a, b], k) => `[0:v]trim=${a}:${b},setpts=PTS-STARTPTS[v${k}];` + aseg(0, [a, b], k)).join('') +
    SEGMENTS.map((_, k) => `[v${k}][a${k}]`).join('') + `concat=n=${SEGMENTS.length}:v=1:a=1[v][a]`;
  dst = path.join(out, `social-${PALETTE}.mp4`);
  args = ['-i', path.join(out, `film-${PALETTE}.mp4`), '-filter_complex', f, '-map', '[v]', '-map', '[a]', ...enc, dst];
}
execFileSync(FF, ['-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
console.log(`wrote ${dst} · ${SEGMENTS.reduce((s, [a, b]) => s + b - a, 0)}s`);
