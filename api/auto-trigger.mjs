/* auto-trigger.mjs — daily proactive scan (Vercel cron, 11:00 UTC ≈ 6AM CT).
   belle-realty-pwa AutoTriggerService harvest #2 (2026-07-16).

   Vercel invokes this with `Authorization: Bearer ${CRON_SECRET}` (automatic
   once the CRON_SECRET env var exists). Detection is pure (src/lib/
   autotrigger.js); each candidate is handed to the open_trigger_thread RPC,
   which verifies the same secret against app_secrets, then idempotently opens
   an AI-1 thread (chat_threads.trigger_source unique) seeded with one
   assistant message. Re-runs and missed days are safe: sources are keyed by
   unit+end or by month, never by run date.

   Manual smoke: curl -H "Authorization: Bearer $CRON_SECRET" \
     https://otb-command.vercel.app/api/auto-trigger */

import UNITS from "../src/data/units.public.json" with { type: "json" };
import SEED from "./_seed.json" with { type: "json" };
import { collectCandidates } from "../src/lib/autotrigger.js";

const SUPA = process.env.VITE_SUPABASE_URL;
const ANON = process.env.VITE_SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !SUPA || !ANON) return res.status(500).json({ error: "not configured" });
  if ((req.headers.authorization || "") !== "Bearer " + secret)
    return res.status(401).json({ error: "unauthorized" });

  const today = new Date().toISOString().slice(0, 10);
  const units = UNITS.units || UNITS;
  const candidates = collectCandidates(units, SEED.unitsPrivate, today);

  const summary = { date: today, scanned: candidates.length, opened: 0, skippedExisting: 0, failed: 0, openedSources: [] };
  for (const c of candidates) {
    try {
      const r = await fetch(`${SUPA}/rest/v1/rpc/open_trigger_thread`, {
        method: "POST",
        headers: { apikey: ANON, authorization: "Bearer " + ANON, "content-type": "application/json" },
        body: JSON.stringify({
          p_secret: secret, p_agent: c.agent, p_title: c.title,
          p_trigger: c.triggerSource, p_content: c.detail,
        }),
      });
      if (!r.ok) { summary.failed++; continue; }
      const id = await r.json();
      if (id) { summary.opened++; summary.openedSources.push(c.triggerSource); }
      else summary.skippedExisting++;
    } catch { summary.failed++; }
  }
  return res.status(200).json(summary);
}
