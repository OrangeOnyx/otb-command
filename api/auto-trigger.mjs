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
import RECOVERIES from "../src/data/recoveries.json" with { type: "json" };
import SEED from "./_seed.json" with { type: "json" };
import { collectCandidates } from "../src/lib/autotrigger.js";
import { buildBriefModel, momDeltas, briefHTML, prevMonthKey } from "../src/lib/brief.js";

import { configured, rpcSecret as rpc } from "./_supa.mjs";

/* A2: first run of a month generates the Owner Intelligence Brief document
   (deterministic — src/lib/brief.js) and stores it in owner_briefs via the
   secret-gated RPCs. MoM deltas come from the PRIOR month's stored model.
   Idempotent by month; a stored month is never regenerated. Returns the
   [[brief:...]] card line for the monthly thread seed (or "" if the brief
   already existed / failed — the thread text stands alone either way). */
async function ensureMonthlyBrief(units, secret, today, summary) {
  const model = buildBriefModel(units, SEED.unitsPrivate, null, today, RECOVERIES); // state woven in below
  try {
    const existing = await rpc("get_owner_brief_model", { p_secret: secret, p_month: model.month });
    if (existing) { summary.brief = "exists"; return ""; }
    const [state, prior] = await Promise.all([
      rpc("get_brief_state", { p_secret: secret }),
      rpc("get_owner_brief_model", { p_secret: secret, p_month: prevMonthKey(model.month) }),
    ]);
    const full = buildBriefModel(units, SEED.unitsPrivate, state, today, RECOVERIES);
    const html = briefHTML(full, momDeltas(full, prior));
    await rpc("put_owner_brief", { p_secret: secret, p_month: full.month, p_html: html, p_model: full });
    summary.brief = "generated";
    return `\n\n[[brief:${full.month}|Owner Intelligence Brief — ${full.monthLabel}]]`;
  } catch (e) {
    summary.brief = "failed: " + e.message;
    return "";
  }
}

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !configured()) return res.status(500).json({ error: "not configured" });
  if ((req.headers.authorization || "") !== "Bearer " + secret)
    return res.status(401).json({ error: "unauthorized" });

  const today = new Date().toISOString().slice(0, 10);
  const units = UNITS.units || UNITS;
  const candidates = collectCandidates(units, SEED.unitsPrivate, today);

  const summary = { date: today, scanned: candidates.length, opened: 0, skippedExisting: 0, failed: 0, openedSources: [] };

  const briefLine = await ensureMonthlyBrief(units, secret, today, summary);
  if (briefLine) {
    const b = candidates.find(c => c.kind === "brief");
    if (b) b.detail += briefLine + "\n\nThe full document also lives under 📊 Briefs at the top of this sheet.";
  }
  for (const c of candidates) {
    try {
      const id = await rpc("open_trigger_thread", {
        p_secret: secret, p_agent: c.agent, p_title: c.title,
        p_trigger: c.triggerSource, p_content: c.detail,
      });
      if (id) { summary.opened++; summary.openedSources.push(c.triggerSource); }
      else summary.skippedExisting++;
    } catch { summary.failed++; }
  }
  return res.status(200).json(summary);
}
