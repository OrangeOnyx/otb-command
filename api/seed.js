/* C1 — confidential seed endpoint. Serves the rent-roll $ figures, tenant PII,
   executed-lease Drive URLs, and AP vendor roster that are DELIBERATELY kept
   out of the public client bundle. Owner/operator only (same gate as the
   concierge). _seed.json is bundled into THIS serverless function — never into
   the browser bundle (Vite doesn't reach api/). Regenerate with
   `npm run split-seed` after editing any src/data seed. */
import { requireOwnerOrOperator } from "./_auth.mjs";
import SEED from "./_seed.json" with { type: "json" };

export default async function handler(req, res) {
  const gate = await requireOwnerOrOperator(req);
  if (gate.error) return res.status(gate.status).json({ error: gate.error });
  res.setHeader("Cache-Control", "private, no-store");
  res.status(200).json(SEED);
}
