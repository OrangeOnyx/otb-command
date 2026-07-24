#!/usr/bin/env node
/* Voice-secret rotation drill (A-3). Sets/rotates the `voice_agent` value in
   app_secrets WITHOUT the secret touching chat, repo, or stdout. Gated on the
   operator-held auto_trigger secret (CRON_SECRET) — same trust root as A-0.

   Drill (from repo root; scope = adams-projects-0c52918e):
     npx vercel env pull <tmp>/env.rot --environment=production --yes --scope <scope>
     node tools/rotate-voice-secret.mjs <tmp>/env.rot <tmp>/new.secret
     npx vercel env rm VOICE_SECRET production --yes --scope <scope>   # skip on first run
     npx vercel env add VOICE_SECRET production --scope <scope> < <tmp>/new.secret
     flyctl secrets set VOICE_SECRET=$(cat <tmp>/new.secret) -a otb-voice-bridge
     rm <tmp>/env.rot <tmp>/new.secret
     npx vercel deploy --prod --yes --scope <scope>
     # smoke: curl /api/voice-agent junk Bearer → 401; bridge health call → 200 */
import { readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

const [envPath, outPath] = process.argv.slice(2);
if (!envPath || !outPath) {
  console.error("usage: rotate-voice-secret.mjs <pulled-env-file> <new-secret-out-file>");
  process.exit(2);
}
const env = {};
for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)="?(.*?)"?\s*$/);
  if (m) env[m[1]] = m[2];
}
const SUPA = env.VITE_SUPABASE_URL, ANON = env.VITE_SUPABASE_ANON_KEY, AUTO = env.CRON_SECRET;
if (!SUPA || !ANON || !AUTO) {
  console.error("missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY / CRON_SECRET in " + envPath);
  process.exit(1);
}
const NEW = randomBytes(32).toString("hex");
const r = await fetch(SUPA + "/rest/v1/rpc/rotate_voice_secret", {
  method: "POST",
  headers: { apikey: ANON, authorization: "Bearer " + ANON, "content-type": "application/json" },
  body: JSON.stringify({ p_auto_secret: AUTO, p_new: NEW }),
});
if (!r.ok) {
  console.error("rotate failed: HTTP " + r.status + " " + (await r.text()).slice(0, 200));
  process.exit(1);
}
// NO trailing newline — Vercel rejects padded env values at deploy time.
writeFileSync(outPath, NEW, { mode: 0o600 });
console.log("voice secret set — value in " + outPath + " (feed to vercel env add + flyctl secrets set, then delete both files)");
