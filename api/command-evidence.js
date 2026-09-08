/* Authenticated OTB owner/operator evidence read. Never a public archive. */
import { requireBundledPropertyAccess } from "./_seed-auth.mjs";
import { loadCommandEvidence } from "../tools/command-evidence-data.mjs";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "GET required" });
  }
  const gate = await requireBundledPropertyAccess(req);
  if (gate.error) return res.status(gate.status).json({ error: gate.error });
  try {
    return res.status(200).json(await loadCommandEvidence());
  } catch {
    return res.status(503).json({ error: "Source evidence is currently unavailable." });
  }
}
