/* Authenticated OTB owner/operator evidence read. Never a public archive. */
import { requireBundledPropertyAccess } from "./_seed-auth.mjs";
import { loadCommandEvidence } from "../tools/command-evidence-data.mjs";
import { readCurrentMaintenance } from './_maintenance-read.mjs';
import { attachMaintenanceRead } from '../src/lib/maintenance-evidence.js';
import { COMMAND_PREVIEW } from '../src/lib/command-evidence.js';

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Vary", "Authorization");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "GET required" });
  }
  const gate = await requireBundledPropertyAccess(req);
  if (gate.error) return res.status(gate.status).json({ error: gate.error });
  try {
    const evidence = await loadCommandEvidence({includeSnapshot:false});
    const currentRead = await readCurrentMaintenance({token:gate.token,property:gate.property,requestId:evidence.issue.liveRequestId});
    const preview=process.env.VERCEL_ENV==='preview'?COMMAND_PREVIEW:null;
    return res.status(200).json(attachMaintenanceRead(evidence,currentRead,{preview}));
  } catch {
    return res.status(503).json({ error: "Source evidence is currently unavailable." });
  }
}
