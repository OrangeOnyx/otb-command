/* c3-upload.mjs — push classified occupancy JSONL into Supabase.
   (C3 pipeline: sampler/backfill bank frames → c3-stalls.py --classify writes
   <capture>/occupancy/<date>.jsonl → THIS tool posts the rows to the
   secret-gated RPC post_occupancy_samples; the app reads occupancy_samples
   under owner/operator RLS for the A-1 overlay + D-1 card.)

   Usage:
     node tools/c3-upload.mjs --date 2026-07-22
   Env: CRON_SECRET (the app_secrets 'auto_trigger' value — pull with
     `npx vercel env pull`, load, DELETE the file; never commit/paste it).
   Supabase URL + anon key come from the repo .env (VITE_SUPABASE_URL /
   VITE_SUPABASE_ANON_KEY). Idempotent: PK (frame, stall) + ON CONFLICT
   DO NOTHING server-side — re-uploads insert 0.

   Timestamps: frame names carry NAIVE local time; new Date(naive) applies
   this machine's zone (America/Chicago) → correct UTC in Postgres. */

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const CAPTURE = "C:\\Users\\adam\\Downloads\\Drone Footage RAW\\OTB-cube-capture";

const args = process.argv.slice(2);
const date = args[args.indexOf("--date") + 1];
if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  console.error('Need --date YYYY-MM-DD (an occupancy JSONL day file).');
  process.exit(2);
}

const secret = process.env.CRON_SECRET;
if (!secret) { console.error("CRON_SECRET not in env (pull from Vercel env; never paste)."); process.exit(2); }

const env = {};
for (const line of readFileSync(join(root, ".env"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*(VITE_SUPABASE_URL|VITE_SUPABASE_ANON_KEY)\s*=\s*"?(.+?)"?\s*$/);
  if (m) env[m[1]] = m[2];
}
const URL_ = env.VITE_SUPABASE_URL, ANON = env.VITE_SUPABASE_ANON_KEY;
if (!URL_ || !ANON) { console.error("Supabase URL/key not found in .env"); process.exit(2); }

const path = join(CAPTURE, "occupancy", `${date}.jsonl`);
if (!existsSync(path)) { console.error("no file:", path); process.exit(2); }

const samples = [];
for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
  if (!line.trim()) continue;
  let r;
  try { r = JSON.parse(line); } catch { continue; }
  if (!r.frame || !r.stall || !r.ts || !r.state) continue;
  const d = new Date(r.ts); // naive local → UTC via machine zone
  if (isNaN(d)) continue;
  samples.push({ frame: r.frame, camera: r.camera || "", stall: r.stall, ts: d.toISOString(), state: r.state });
}
console.log(`${samples.length} samples from ${path}`);

let inserted = 0;
for (let i = 0; i < samples.length; i += 500) {
  const batch = samples.slice(i, i + 500);
  const res = await fetch(`${URL_}/rest/v1/rpc/post_occupancy_samples`, {
    method: "POST",
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_secret: secret, p_samples: batch }),
  });
  if (!res.ok) { console.error("RPC failed:", res.status, (await res.text()).slice(0, 200)); process.exit(1); }
  inserted += await res.json();
}
console.log(`inserted ${inserted} (${samples.length - inserted} already present)`);
