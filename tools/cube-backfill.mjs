/* cube-backfill.mjs — recover missed sampler ticks from the Cube's ARCHIVE.
   (Companion to cube-frames.mjs; discovered 2026-07-22 after the third silent
   sampler death: DW Spectrum serves archive frames by timestamp via
   GET /ec2/cameraThumbnail?cameraId=<id>&time=<epochMs>&height=1520 — native
   2688x1520. The /rest/v2 image endpoint IGNORES timestampMs and returns live.)

   Usage:
     node tools/cube-backfill.mjs --from "2026-07-22 02:43" --to "2026-07-22 14:50"
       [--every 300] [--out "<dir>"]   (out defaults to the standing capture dir)

   Idempotent: a tick is skipped when a frame for that camera already exists
   within ±every/2 s (so live-captured frames are never duplicated). Frames are
   named exactly like the live collector's, so C3 tooling reads them unchanged.
   Credentials/host: same as cube-frames.mjs (~/.otb-cube.env, CUBE_HOST). */

import { readFileSync, mkdirSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // tailnet self-signed cert

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const registry = JSON.parse(readFileSync(join(root, "src/data/cameras.json"), "utf8"));

const HOST = process.env.CUBE_HOST || "100.73.185.15:7001";
const args = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = args.indexOf("--" + name);
  return i >= 0 ? args[i + 1] : dflt;
};
const OUT = flag("out", "E:\\OTB-CAPTURE\\Drone-Footage-RAW-2026-07\\OTB-cube-capture");
const EVERY = +flag("every", 300);
const FROM = flag("from", null);
const TO = flag("to", null);
if (!FROM || !TO) {
  console.error('Need --from "YYYY-MM-DD HH:MM" --to "YYYY-MM-DD HH:MM" (local time).');
  process.exit(2);
}
const t0 = new Date(FROM.replace(" ", "T"));
const t1 = new Date(TO.replace(" ", "T"));
if (isNaN(t0) || isNaN(t1) || t1 <= t0) {
  console.error("Bad --from/--to range.");
  process.exit(2);
}

function creds() {
  let user = process.env.CUBE_USER, pass = process.env.CUBE_PASS;
  const f = join(homedir(), ".otb-cube.env");
  if ((!user || !pass) && existsSync(f)) {
    for (const line of readFileSync(f, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*(CUBE_USER|CUBE_PASS)\s*=\s*(.+?)\s*$/);
      if (m) { if (m[1] === "CUBE_USER") user = m[2]; else pass = m[2]; }
    }
  }
  if (!user || !pass) { console.error("No Cube credentials (see cube-frames.mjs header)."); process.exit(2); }
  return { user, pass };
}

const FETCH_TIMEOUT_MS = 30_000;
async function login() {
  const { user, pass } = creds();
  const r = await fetch(`https://${HOST}/rest/v2/login/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: user, password: pass, setCookie: false }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!r.ok) throw new Error(`login failed: ${r.status}`);
  return (await r.json()).token;
}

const pad = n => String(n).padStart(2, "0");
const stamp = d =>
  d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + "-" +
  pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());

// index existing frames per camera: cam.id -> sorted epoch-ms list (parsed from names)
function indexExisting(dir) {
  const byCam = new Map();
  if (!existsSync(dir)) return byCam;
  for (const f of readdirSync(dir)) {
    const m = f.match(/^(.+)-(\d{8})-(\d{6})\.jpg$/);
    if (!m) continue;
    const [, cam, d8, t6] = m;
    const t = new Date(
      +d8.slice(0, 4), +d8.slice(4, 6) - 1, +d8.slice(6, 8),
      +t6.slice(0, 2), +t6.slice(2, 4), +t6.slice(4, 6)
    ).getTime();
    if (!byCam.has(cam)) byCam.set(cam, []);
    byCam.get(cam).push(t);
  }
  for (const arr of byCam.values()) arr.sort((a, b) => a - b);
  return byCam;
}
const hasNear = (arr, t, tol) => arr && arr.some(x => Math.abs(x - t) <= tol);

const cams = registry.cameras.filter(c => !c.interior);
let token = await login();
console.log(`Backfilling ${cams.length} cams, ${FROM} → ${TO}, every ${EVERY}s`);

let pulled = 0, skipped = 0, failed = 0;
const tol = (EVERY * 1000) / 2;
const dirCache = new Map(); // date-dir -> existing index

for (let t = t0.getTime(); t <= t1.getTime(); t += EVERY * 1000) {
  const when = new Date(t);
  const dir = join(OUT, when.toISOString().slice(0, 10)); // same convention as the live collector
  if (!dirCache.has(dir)) { mkdirSync(dir, { recursive: true }); dirCache.set(dir, indexExisting(dir)); }
  const idx = dirCache.get(dir);
  for (const cam of cams) {
    if (hasNear(idx.get(cam.id), t, tol)) { skipped++; continue; }
    try {
      let r = await fetch(
        `https://${HOST}/ec2/cameraThumbnail?cameraId=${cam.dwViewId}&time=${t}&height=1520`,
        { headers: { Authorization: "Bearer " + token }, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }
      );
      if (r.status === 401 || r.status === 403) {
        token = await login();
        r = await fetch(
          `https://${HOST}/ec2/cameraThumbnail?cameraId=${cam.dwViewId}&time=${t}&height=1520`,
          { headers: { Authorization: "Bearer " + token }, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }
        );
      }
      if (!r.ok) throw new Error("HTTP " + r.status);
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf[0] !== 0xff || buf[1] !== 0xd8) throw new Error("not a JPEG (no archive at ts?)");
      writeFileSync(join(dir, `${cam.id}-${stamp(when)}.jpg`), buf);
      idx.set(cam.id, [...(idx.get(cam.id) ?? []), t]);
      pulled++;
    } catch (e) {
      failed++;
      if (failed <= 10) console.log(`  ✗ ${cam.id} @ ${stamp(when)}: ${e.message}`);
    }
  }
  if (((t - t0.getTime()) / (EVERY * 1000)) % 12 === 0)
    console.log(`  … ${stamp(when)} — pulled ${pulled}, skipped ${skipped}, failed ${failed}`);
}
console.log(`DONE: pulled ${pulled}, skipped ${skipped} (already on disk), failed ${failed}`);
