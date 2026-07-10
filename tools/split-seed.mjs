/* C1 fix — keep confidential seed data OUT of the public client bundle.
   Re-runnable: node tools/split-seed.mjs  (run after editing any src/data seed)

   Splits the SOT seed into:
     src/data/units.public.json   — bundle-safe skeleton (no $ / legal / notes)
     api/_seed.json               — the CONFIDENTIAL payload, imported ONLY by
                                     api/seed.js (server function bundle, never
                                     shipped to the browser)

   The client boot fetches api/seed after auth and merges the confidential
   payload back in. Both generated files are COMMITTED (same pattern as
   api/_context.mjs). Full src/data/*.json remain the SOT for tools + server. */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const rd = f => JSON.parse(readFileSync(join(root, "src/data", f), "utf8"));

// Fields that must NOT ship in the public bundle. Everything else (unit, dba,
// use, cat, status, start, end, sf) is already marketing-/buyer-grade public.
const SENSITIVE_UNIT_FIELDS = ["base", "total", "monthly", "legal", "notes"];

const units = rd("units.json");
const publicUnits = units.map(u => {
  const pub = { ...u };
  for (const f of SENSITIVE_UNIT_FIELDS) delete pub[f];
  return pub;
});
const unitsPrivate = {};
for (const u of units) {
  const priv = {};
  for (const f of SENSITIVE_UNIT_FIELDS) if (u[f] !== undefined) priv[f] = u[f];
  unitsPrivate[u.unit] = priv;
}

const seed = {
  unitsPrivate,                       // per-unit { base,total,monthly,legal,notes }
  contacts: rd("contacts-info.json"), // tenant PII
  leaseLinks: rd("lease-links.json"), // executed-lease Drive URLs
  floorplanLinks: rd("floorplan-links.json"),
  vendors: rd("vendors.json"),        // AP roster (owner/operator only)
};

writeFileSync(join(root, "src/data/units.public.json"), JSON.stringify(publicUnits) + "\n");
writeFileSync(join(root, "api/_seed.json"), JSON.stringify(seed) + "\n");
console.log(`units.public.json: ${publicUnits.length} units (stripped ${SENSITIVE_UNIT_FIELDS.join(",")})`);
console.log(`api/_seed.json: ${Object.keys(unitsPrivate).length} private units · ${Object.keys(seed.contacts).length} contacts · ${seed.vendors.length} vendors`);
