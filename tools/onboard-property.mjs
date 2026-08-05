/* onboard-property.mjs — C-1 onboarding rail driver (docs/phase-c/01).
   Usage:
     node tools/onboard-property.mjs <intake.json> --dry-run   # validate + plan
     node tools/onboard-property.mjs <intake.json>             # run for real
   Env (live run only): CRON_SECRET — the app_secrets 'auto_trigger' value.
   Pull with `npx vercel env pull`, load into env, DELETE the file; never
   commit/paste the secret (standard drill).
   The RPC is all-or-nothing (org reused by slug; duplicate property RAISES),
   and validation runs client-side first — junk never reaches the DB. */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { validateIntake, intakePlan } from "../src/lib/onboard.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith("--"));
const dry = args.includes("--dry-run");

if (!file) { console.error("Usage: node tools/onboard-property.mjs <intake.json> [--dry-run]"); process.exit(2); }

let intake;
try { intake = JSON.parse(readFileSync(file, "utf8")); }
catch (e) { console.error("Cannot read intake:", e.message); process.exit(2); }

const v = validateIntake(intake);
if (!v.ok) {
  console.error("Intake INVALID — nothing touched:");
  for (const e of v.errors) console.error("  ✗ " + e);
  process.exit(1);
}
console.log("Intake valid. Plan:");
for (const line of intakePlan(intake)) console.log("  " + line);

if (dry) { console.log("\n--dry-run: no DB writes."); process.exit(0); }

const secret = process.env.CRON_SECRET;
if (!secret) { console.error("\nCRON_SECRET not in env (pull from Vercel env; never paste)."); process.exit(2); }

const env = {};
for (const line of readFileSync(join(root, ".env"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*(VITE_SUPABASE_URL|VITE_SUPABASE_ANON_KEY)\s*=\s*"?(.+?)"?\s*$/);
  if (m) env[m[1]] = m[2];
}
if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) {
  console.error("Supabase URL/key not found in .env"); process.exit(2);
}

const res = await fetch(env.VITE_SUPABASE_URL + "/rest/v1/rpc/onboard_property", {
  method: "POST",
  headers: { apikey: env.VITE_SUPABASE_ANON_KEY, "Content-Type": "application/json" },
  body: JSON.stringify({ p_secret: secret, p_intake: intake }),
});
const body = await res.text();
if (!res.ok) { console.error("Onboard FAILED (HTTP " + res.status + "):", body); process.exit(1); }
const out = JSON.parse(body);
console.log("\nOnboarded ✓  org_id=" + out.org_id + "  property_id=" + out.property_id +
  "  authorized=" + out.authorized);
console.log("Next: authorized users magic-link in as usual (membership rows are " +
  "created on first sign-in); the property appears on D-0 and in the switcher.");
