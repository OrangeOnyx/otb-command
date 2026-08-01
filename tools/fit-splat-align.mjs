/* Fit the splat↔world similarity transform — re-runnable after any re-train:
     node tools/fit-splat-align.mjs [src.ply]
   Writes src/data/splat-align.json (COMMITTED) + export/splat-align-preview.svg
   (visual check: fitted structure/ground points over the plan footprints).

   Method (no GPS needed — the property pins all 7 DoF):
     1. Density-crop to the site, then fit the ground plane via a mini-DTM
        (per-column ground estimates + RANSAC) → level rotation.
     2. Height histogram above ground → candidate parapet peaks (16.4' typical)
        → scale hypotheses.
     3. Grid-search yaw/scale/translation maximizing FACADE alignment: the DJI
        orbit reconstructs walls, not roofs (no nadir coverage), so the score is
        structure points (9–26 ft) on the footprint OUTLINE band × outline
        coverage × a penalty for ground points inside footprints (occluded in
        reality). Winner refined fine. */
import * as GS from "@mkkellogg/gaussian-splats-3d";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { qRotate, levelQuat, composeAlign, realityBoxes, TRUE_FT_WORLD } from "../src/lib/splat-align.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = process.argv[2] || "E:/OTB-CAPTURE/Drone-Footage-RAW-2026-07/OTB-splat-v1.ply";

/* ── plan footprints in world coords ─────────────────────────── */
const geometry = JSON.parse(readFileSync(join(root, "src/data/geometry.json"), "utf8"));
const heights = JSON.parse(readFileSync(join(root, "src/data/heights.json"), "utf8"));
const units = Object.entries(geometry.units).map(([unit, p]) =>
  ({ unit, x: p.x, y: p.y, w: p.w, h: p.h, heightFt: heights[unit] || 16.4 }));
const { boxes } = realityBoxes(units);

const CELL = 2 * TRUE_FT_WORLD; // ≈2 ft occupancy cells
const gx0 = Math.min(...boxes.map(b => b.x - b.w / 2)) - 4 * CELL;
const gz0 = Math.min(...boxes.map(b => b.z - b.d / 2)) - 4 * CELL;
const gx1 = Math.max(...boxes.map(b => b.x + b.w / 2)) + 4 * CELL;
const gz1 = Math.max(...boxes.map(b => b.z + b.d / 2)) + 4 * CELL;
const NX = Math.ceil((gx1 - gx0) / CELL), NZ = Math.ceil((gz1 - gz0) / CELL);
const grid = new Uint8Array(NX * NZ); // 1 = footprint
for (const b of boxes) {
  const i0 = Math.max(0, Math.floor((b.x - b.w / 2 - gx0) / CELL)), i1 = Math.min(NX - 1, Math.floor((b.x + b.w / 2 - gx0) / CELL));
  const k0 = Math.max(0, Math.floor((b.z - b.d / 2 - gz0) / CELL)), k1 = Math.min(NZ - 1, Math.floor((b.z + b.d / 2 - gz0) / CELL));
  for (let i = i0; i <= i1; i++) for (let k = k0; k <= k1; k++) grid[k * NX + i] = 1;
}
/* outline band (±3 cells ≈ ±6 ft around the union boundary) + eroded interior */
const edge = new Uint8Array(NX * NZ), interior = new Uint8Array(NX * NZ);
const at = (i, k) => (i < 0 || i >= NX || k < 0 || k >= NZ) ? 0 : grid[k * NX + i];
const boundary = [];
for (let k = 0; k < NZ; k++) for (let i = 0; i < NX; i++) {
  if (!grid[k * NX + i]) continue;
  if (!at(i - 1, k) || !at(i + 1, k) || !at(i, k - 1) || !at(i, k + 1)) boundary.push([i, k]);
}
const R = 3;
for (const [bi, bk] of boundary) {
  for (let di = -R; di <= R; di++) for (let dk = -R; dk <= R; dk++) {
    const i = bi + di, k = bk + dk;
    if (i >= 0 && i < NX && k >= 0 && k < NZ) edge[k * NX + i] = 1;
  }
}
for (let k = 0; k < NZ; k++) for (let i = 0; i < NX; i++) {
  if (grid[k * NX + i] && !edge[k * NX + i]) interior[k * NX + i] = 1;
}
const edgeCells = edge.reduce((a, v) => a + v, 0);
console.log("grid", NX + "×" + NZ, "· edge band cells:", edgeCells, "· interior cells:", interior.reduce((a, v) => a + v, 0));

/* ── load splat points ───────────────────────────────────────── */
const buf = readFileSync(src);
const arr = GS.PlyParser.parseToUncompressedSplatArray(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), 0);
let pts = [];
for (let i = 0; i < arr.splatCount; i++) {
  const s = arr.splats[i];
  if (s[13] > 50) pts.push([s[0], s[1], s[2]]);
}
console.log("opaque splats:", pts.length, "/", arr.splatCount);

/* site crop: keep the connected dense region of the (x,z) density grid */
const pct = (a, f) => { const s = a.slice().sort((p, q) => p - q); return s[Math.floor(f * (s.length - 1))]; };
const lim = [0, 1, 2].map(i => [pct(pts.map(p => p[i]), 0.02), pct(pts.map(p => p[i]), 0.98)]);
const trimmed = pts.filter(p => p.every((v, i) => v >= lim[i][0] && v <= lim[i][1]));
const DG = 80;
const dCell = p => {
  const i = Math.min(DG - 1, Math.max(0, Math.floor((p[0] - lim[0][0]) / (lim[0][1] - lim[0][0]) * DG)));
  const k = Math.min(DG - 1, Math.max(0, Math.floor((p[2] - lim[2][0]) / (lim[2][1] - lim[2][0]) * DG)));
  return k * DG + i;
};
const dens = new Uint32Array(DG * DG);
trimmed.forEach(p => dens[dCell(p)]++);
const maxDens = Math.max(...dens);
const keep = new Uint8Array(DG * DG);
{
  const stack = [dens.indexOf(maxDens)];
  keep[stack[0]] = 1;
  while (stack.length) {
    const c = stack.pop(), ci = c % DG, ck = (c - ci) / DG;
    for (const [di, dk] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const ni = ci + di, nk = ck + dk;
      if (ni < 0 || ni >= DG || nk < 0 || nk >= DG) continue;
      const nc = nk * DG + ni;
      if (!keep[nc] && dens[nc] >= maxDens * 0.04) { keep[nc] = 1; stack.push(nc); }
    }
  }
}
const central = trimmed.filter(p => keep[dCell(p)]);
const cLim = [0, 2].map(i => [pct(central.map(p => p[i]), 0.01), pct(central.map(p => p[i]), 0.99)]);
const spanR = Math.hypot(cLim[0][1] - cLim[0][0], cLim[1][1] - cLim[1][0]);
console.log("site crop:", central.length, "of", trimmed.length, "· site span:", spanR.toFixed(1));

let rand = 1234567;
const rnd = () => (rand = (rand * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;

/* ── ground plane via mini-DTM ───────────────────────────────── */
function fitPlane(upSign) {
  const CG = 90;
  const cx0 = cLim[0][0], cx1 = cLim[0][1], cz0 = cLim[1][0], cz1 = cLim[1][1];
  const cols = new Map();
  for (const p of central) {
    const i = Math.floor((p[0] - cx0) / (cx1 - cx0) * CG), k = Math.floor((p[2] - cz0) / (cz1 - cz0) * CG);
    if (i < 0 || i >= CG || k < 0 || k >= CG) continue;
    const key = k * CG + i;
    let a = cols.get(key);
    if (!a) cols.set(key, a = []);
    a.push(p[1]);
  }
  const cells = [];
  for (const [key, ys] of cols) {
    if (ys.length < 6) continue;
    ys.sort((a, b) => a - b);
    const gy = ys[Math.floor((upSign === 1 ? 0.9 : 0.1) * (ys.length - 1))];
    const i = key % CG, k = (key - i) / CG;
    cells.push([cx0 + (i + 0.5) / CG * (cx1 - cx0), gy, cz0 + (k + 0.5) / CG * (cz1 - cz0)]);
  }
  let eps = spanR * 0.006;
  let best = null;
  for (let it = 0; it < 3000; it++) {
    const a = cells[Math.floor(rnd() * cells.length)], c = cells[Math.floor(rnd() * cells.length)], d = cells[Math.floor(rnd() * cells.length)];
    const u = [c[0] - a[0], c[1] - a[1], c[2] - a[2]], v = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];
    let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const nl = Math.hypot(...n);
    if (nl < 1e-9) continue;
    n = n.map(x => x / nl);
    if (Math.abs(n[1]) < 0.8) continue;
    const off = n[0] * a[0] + n[1] * a[1] + n[2] * a[2];
    let inl = 0;
    for (const p of cells) if (Math.abs(n[0] * p[0] + n[1] * p[1] + n[2] * p[2] - off) < eps) inl++;
    if (!best || inl > best.inl) best = { n, off, inl };
  }
  let { n: normal, off } = best;
  for (let round = 0; round < 3; round++) {
    const inls = cells.filter(p => Math.abs(normal[0] * p[0] + normal[1] * p[1] + normal[2] * p[2] - off) < eps);
    if (inls.length < 40) break;
    const m = [0, 0, 0];
    inls.forEach(p => { m[0] += p[0]; m[1] += p[1]; m[2] += p[2]; });
    m.forEach((v, i) => m[i] = v / inls.length);
    let xx = 0, xz = 0, zz = 0, xy = 0, zy = 0;
    inls.forEach(p => { const px = p[0] - m[0], py = p[1] - m[1], pz = p[2] - m[2]; xx += px * px; xz += px * pz; zz += pz * pz; xy += px * py; zy += pz * py; });
    const det = xx * zz - xz * xz;
    if (Math.abs(det) < 1e-12) break;
    const sx = (zz * xy - xz * zy) / det, sz = (xx * zy - xz * xy) / det;
    let n2 = [sx, -1, sz];
    const l2 = Math.hypot(...n2);
    normal = n2.map(x => x / l2);
    off = normal[0] * m[0] + normal[1] * m[1] + normal[2] * m[2];
    eps *= 0.6;
  }
  if (normal[1] * upSign > 0) { normal = normal.map(x => -x); off = -off; }
  return { normal, off };
}

/* ── facade score ────────────────────────────────────────────── */
function makeScorer(structSub, groundSub) {
  return (theta, sw, tx, tz) => {
    const c = Math.cos(theta), s = Math.sin(theta);
    let onEdge = 0;
    const hit = new Set();
    for (const p of structSub) {
      const wx = (c * p[0] + s * p[2]) * sw + tx;
      const wz = (-s * p[0] + c * p[2]) * sw + tz;
      const i = Math.floor((wx - gx0) / CELL), k = Math.floor((wz - gz0) / CELL);
      if (i >= 0 && i < NX && k >= 0 && k < NZ && edge[k * NX + i]) { onEdge++; hit.add(k * NX + i); }
    }
    let gIn = 0;
    for (const p of groundSub) {
      const wx = (c * p[0] + s * p[2]) * sw + tx;
      const wz = (-s * p[0] + c * p[2]) * sw + tz;
      const i = Math.floor((wx - gx0) / CELL), k = Math.floor((wz - gz0) / CELL);
      if (i >= 0 && i < NX && k >= 0 && k < NZ && interior[k * NX + i]) gIn++;
    }
    const se = onEdge / structSub.length;
    const ce = hit.size / edgeCells;
    const gi = gIn / groundSub.length;
    return se * Math.sqrt(ce) * Math.max(0, 1 - 4 * gi);
  };
}
const seq = (a, b, st) => { const r = []; for (let v = a; v <= b + 1e-12; v += st) r.push(v); return r; };
const fpCx = (gx0 + gx1) / 2, fpCz = (gz0 + gz1) / 2;
const subN = (a, n) => { const r = []; for (let i = 0; i < a.length; i += Math.max(1, Math.floor(a.length / n))) r.push(a[i]); return r; };

function coarseSearch(score, structSub) {
  const rc = [0, 0];
  structSub.forEach(p => { rc[0] += p[0]; rc[1] += p[2]; });
  rc[0] /= structSub.length; rc[1] /= structSub.length;
  const D = 60 * TRUE_FT_WORLD;
  let best = { s: -1 };
  for (const th of seq(0, 2 * Math.PI, Math.PI / 120)) {
    const c = Math.cos(th), s = Math.sin(th);
    for (const swf of seq(0.75, 1.25, 0.05)) {
      const sw = swf * best0;
      const bx = (c * rc[0] + s * rc[1]) * sw, bz = (-s * rc[0] + c * rc[1]) * sw;
      for (const dx of seq(-D, D, D / 6)) for (const dz of seq(-D, D, D / 6)) {
        const sc = score(th, sw, fpCx - bx + dx, fpCz - bz + dz);
        if (sc > best.s) best = { s: sc, th, sw, tx: fpCx - bx + dx, tz: fpCz - bz + dz };
      }
    }
  }
  return best;
}
function fineSearch(score, seed) {
  let best = { ...seed };
  const step = TRUE_FT_WORLD;
  for (let round = 0; round < 2; round++) {
    const b0 = { ...best };
    for (const th of seq(b0.th - 0.05, b0.th + 0.05, 0.0025)) {
      for (const sw of seq(b0.sw * 0.95, b0.sw * 1.05, b0.sw * 0.008)) {
        for (const tx of seq(b0.tx - 8 * step, b0.tx + 8 * step, step)) {
          for (const tz of seq(b0.tz - 8 * step, b0.tz + 8 * step, step)) {
            const sc = score(th, sw, tx, tz);
            if (sc > best.s) best = { s: sc, th, sw, tx, tz };
          }
        }
      }
    }
  }
  return best;
}

/* ── hypothesis loop ─────────────────────────────────────────── */
let winner = null, best0 = 0;
for (const upSign of [1, -1]) {
  const { normal, off } = fitPlane(upSign);
  const tilt = Math.acos(Math.min(1, Math.abs(normal[1]))) * 180 / Math.PI;
  const lq = levelQuat(normal);
  const lvl = central.map(p => qRotate(lq, p));
  const groundY = qRotate(lq, [normal[0] * off, normal[1] * off, normal[2] * off])[1];
  const hs = lvl.map(p => p[1] - groundY);

  const H = 300, hHi = spanR * 0.12;
  const hh = new Array(H).fill(0);
  hs.forEach(h => { const k = Math.floor(h / hHi * H); if (k >= 0 && k < H) hh[k]++; });
  const hOf = k => (k + 0.5) * hHi / H;
  const g0 = hh.indexOf(Math.max(...hh));
  const cands = [];
  for (let k = g0 + 6; k < H - 1; k++) if (hh[k] >= hh[k - 1] && hh[k] >= hh[k + 1] && hh[k] > 40) cands.push({ k, n: hh[k] });
  cands.sort((a, b) => b.n - a.n);
  const top = cands.slice(0, 4);
  console.log(`upSign ${upSign}: tilt ${tilt.toFixed(2)}° · parapet candidates:`, top.map(c => hOf(c.k).toFixed(3) + " (" + c.n + ")").join(", ") || "none");

  for (const cand of top) {
    const unitsPerFt = hOf(cand.k) / 16.4;
    const struct = [], ground = [];
    for (let i = 0; i < lvl.length; i++) {
      if (hs[i] > 9 * unitsPerFt && hs[i] < 26 * unitsPerFt) struct.push(lvl[i]);
      else if (Math.abs(hs[i]) < 2 * unitsPerFt) ground.push(lvl[i]);
    }
    if (struct.length < 400) continue;
    const structSub = subN(struct, 2500), groundSub = subN(ground, 2000);
    best0 = TRUE_FT_WORLD / unitsPerFt;
    const score = makeScorer(structSub, groundSub);
    const best = coarseSearch(score, structSub);
    console.log(`  cand h=${hOf(cand.k).toFixed(3)} (${struct.length} struct / ${ground.length} ground) → score ${best.s.toFixed(4)} yaw ${(best.th * 180 / Math.PI).toFixed(1)}° scale ${best.sw.toFixed(3)}`);
    if (!winner || best.s > winner.best.s) winner = { upSign, lq, groundY, best, unitsPerFt, lvl, hs };
  }
}
if (!winner) throw new Error("no viable facade hypothesis found");

/* fine refinement with denser samples */
{
  const { lvl, hs, unitsPerFt } = winner;
  const struct = [], ground = [];
  for (let i = 0; i < lvl.length; i++) {
    if (hs[i] > 9 * unitsPerFt && hs[i] < 26 * unitsPerFt) struct.push(lvl[i]);
    else if (Math.abs(hs[i]) < 2 * unitsPerFt) ground.push(lvl[i]);
  }
  const structSub = subN(struct, 7000), groundSub = subN(ground, 5000);
  const score = makeScorer(structSub, groundSub);
  winner.best = fineSearch(score, winner.best);
  winner.structSub = structSub;
  winner.groundSub = groundSub;
}
const { best, lq, groundY } = winner;
console.log("WINNER:", JSON.stringify({ upSign: winner.upSign, score: +best.s.toFixed(4), yawDeg: +(best.th * 180 / Math.PI).toFixed(2), scale: +best.sw.toFixed(5), splatUnitsPerFt: +(TRUE_FT_WORLD / best.sw).toFixed(5) }));

/* ── compose + write ─────────────────────────────────────────── */
const align = composeAlign(lq, best.th, best.sw, [best.tx, -best.sw * groundY, best.tz]);
const out = {
  quaternion: align.quaternion.map(v => +v.toFixed(8)),
  scale: +align.scale.toFixed(6),
  position: align.position.map(v => +v.toFixed(5)),
  meta: {
    fit: "tools/fit-splat-align.mjs", source: src.split("/").pop(),
    score: +best.s.toFixed(4), yawDeg: +(best.th * 180 / Math.PI).toFixed(2),
    splatUnitsPerFt: +(TRUE_FT_WORLD / best.sw).toFixed(5),
  },
};
writeFileSync(join(root, "src/data/splat-align.json"), JSON.stringify(out, null, 2) + "\n");
console.log("wrote src/data/splat-align.json", JSON.stringify(out.meta));

/* ── visual check SVG ────────────────────────────────────────── */
mkdirSync(join(root, "export"), { recursive: true });
const toWorld = p => {
  const c = Math.cos(best.th), s = Math.sin(best.th);
  return [(c * p[0] + s * p[2]) * best.sw + best.tx, (-s * p[0] + c * p[2]) * best.sw + best.tz];
};
const W = 950, pad = 2;
const allW = [...winner.structSub, ...winner.groundSub].map(toWorld);
const wx0 = Math.min(gx0, ...allW.map(p => p[0])) - pad, wx1 = Math.max(gx1, ...allW.map(p => p[0])) + pad;
const wz0 = Math.min(gz0, ...allW.map(p => p[1])) - pad, wz1 = Math.max(gz1, ...allW.map(p => p[1])) + pad;
const sc = W / (wx1 - wx0), Hh = Math.round((wz1 - wz0) * sc);
const px = v => ((v - wx0) * sc).toFixed(1), pz = v => ((v - wz0) * sc).toFixed(1);
let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${Hh}"><rect width="${W}" height="${Hh}" fill="#EDEFE8"/>`;
winner.groundSub.map(toWorld).forEach(p => { svg += `<circle cx="${px(p[0])}" cy="${pz(p[1])}" r="0.8" fill="#B9BFAD"/>`; });
boxes.forEach(bx => { svg += `<rect x="${px(bx.x - bx.w / 2)}" y="${pz(bx.z - bx.d / 2)}" width="${(bx.w * sc).toFixed(1)}" height="${(bx.d * sc).toFixed(1)}" fill="none" stroke="#1C2B26" stroke-width="1.2"/>`; });
winner.structSub.map(toWorld).forEach(p => { svg += `<circle cx="${px(p[0])}" cy="${pz(p[1])}" r="1" fill="#A87E2F" fill-opacity="0.55"/>`; });
svg += `<text x="10" y="${Hh - 10}" font-family="monospace" font-size="12" fill="#1C2B26">fit score ${best.s.toFixed(3)} · yaw ${(best.th * 180 / Math.PI).toFixed(1)}° · brass=structure(9-26ft) grey=ground</text></svg>`;
writeFileSync(join(root, "export/splat-align-preview.svg"), svg);
console.log("wrote export/splat-align-preview.svg");
