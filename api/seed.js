/* C1 — confidential seed endpoint. Serves the rent-roll $ figures, tenant PII,
   executed-lease Drive URLs, and AP vendor roster that are DELIBERATELY kept
   out of the public client bundle. Requires current owner/operator membership
   in the bundled OTB property. _seed.json stays in THIS serverless function — never in
   the browser bundle (Vite doesn't reach api/). Regenerate with
   `npm run split-seed` after editing any src/data seed. */
import { requireBundledPropertyAccess } from "./_seed-auth.mjs";
import SEED from "./_seed.json" with { type: "json" };

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Vary", "Authorization");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "GET only" });
  }
  const gate = await requireBundledPropertyAccess(req);
  if (gate.error) return res.status(gate.status).json({ error: gate.error });
  res.status(200).json(SEED);
}
