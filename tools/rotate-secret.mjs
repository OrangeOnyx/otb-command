#!/usr/bin/env node
/* Shared-secret rotation drill (build plan A-0). Rotates the `auto_trigger`
   value in app_secrets WITHOUT the secret ever touching chat, repo, or stdout.

   Drill (from repo root; scope = adams-projects-0c52918e):
     npx vercel env pull <tmp>/env.rot --environment=production --yes --scope <scope>
     node tools/rotate-secret.mjs <tmp>/env.rot <tmp>/new.secret
     npx vercel env rm CRON_SECRET production --yes --scope <scope>
     npx vercel env add CRON_SECRET production --scope <scope> < <tmp>/new.secret
     rm <tmp>/env.rot <tmp>/new.secret
     npx vercel deploy --prod --yes --scope <scope>
     # smoke: pull env fresh, curl /api/auto-trigger with Bearer → 200; junk → 401

   Reads VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY / CRON_SECRET from the
   pulled env file, generates 32 random bytes, calls the secret-gated
   rotate_shared_secret RPC (migration 20260723014510), and writes the new
   value ONLY to the out-file (stdin fodder for `vercel env add`). */
import { readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

const [envPath, outPath] = process.argv.slice(2);
if (!envPath || !outPath) {
  console.error("usage: rotate-secret.mjs <pulled-env-file> <new-secret-out-file>");
  process.exit(2);
}
const env = {};
for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)="?(.*?)"?\s*$/);
  if (m) env[m[1]] = m[2];
}
const SUPA = env.VITE_SUPABASE_URL, ANON = env.VITE_SUPABASE_ANON_KEY, OLD = env.CRON_SECRET;
if (!SUPA || !ANON || !OLD) {
  console.error("missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY / CRON_SECRET in " + envPath);
  process.exit(1);
}
const NEW = randomBytes(32).toString("hex");
const r = await fetch(SUPA + "/rest/v1/rpc/rotate_shared_secret", {
  method: "POST",
  headers: { apikey: ANON, authorization: "Bearer " + ANON, "content-type": "application/json" },
  body: JSON.stringify({ p_old: OLD, p_new: NEW }),
});
if (!r.ok) {
  console.error("rotate failed: HTTP " + r.status + " " + (await r.text()).slice(0, 200));
  process.exit(1);
}
// NO trailing newline — Vercel rejects env values with leading/trailing
// whitespace at deploy time (learned 2026-07-22, first run of this drill).
writeFileSync(outPath, NEW, { mode: 0o600 });
console.log("rotated ok — new value in " + outPath + " (feed to `vercel env add`, then delete both files)");
