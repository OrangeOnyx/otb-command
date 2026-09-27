// Cut the ~31s social edit from a rendered film master. Every cut sits on the 120 BPM beat grid,
// so the score stays in time across edits; 12 ms audio fades at each seam prevent clicks.
//   node social-cut.mjs [--palette bayou]   → out/social-<palette>.mp4  (needs out/film-<palette>.mp4)
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const i = process.argv.indexOf('--palette'), PALETTE = i > 0 ? process.argv[i + 1] : 'bayou';
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
const src = path.join(here, 'out', `film-${PALETTE}.mp4`), dst = path.join(here, 'out', `social-${PALETTE}.mp4`);
const f = SEGMENTS.map(([a, b], k) =>
  `[0:v]trim=${a}:${b},setpts=PTS-STARTPTS[v${k}];` +
  `[0:a]atrim=${a}:${b},asetpts=PTS-STARTPTS,afade=t=in:d=0.012,afade=t=out:st=${(b - a - 0.012).toFixed(3)}:d=0.012[a${k}];`).join('') +
  SEGMENTS.map((_, k) => `[v${k}][a${k}]`).join('') + `concat=n=${SEGMENTS.length}:v=1:a=1[v][a]`;
execFileSync(FF, ['-loglevel', 'error', '-y', '-i', src, '-filter_complex', f, '-map', '[v]', '-map', '[a]',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-maxrate', '6500k', '-bufsize', '12000k', '-pix_fmt', 'yuv420p', '-r', '60',
  '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', dst], { stdio: 'inherit' });
console.log(`wrote ${dst} · ${SEGMENTS.reduce((s, [a, b]) => s + b - a, 0)}s`);
