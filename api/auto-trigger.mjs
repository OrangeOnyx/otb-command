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
import { maintTriggerCandidates } from "../src/lib/maintenance.js";
import { c3StaleCandidate } from "../src/lib/occupancy.js";
import { shapeUnifi, unifiTriggerCandidate } from "../src/lib/unifi.js";
import { voiceLeadCandidates } from "../src/lib/voiceagent.js";
import { buildBriefModel, momDeltas, briefHTML, prevMonthKey } from "../src/lib/brief.js";
import { achFirstCandidate } from "../src/lib/ach.js";
import { monthRentCharges, LEDGER_START_YM } from "../src/lib/ledger.js";

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

/* Ledger-lite (harvest #4, decision 2A): idempotently post the month's TOTAL-
   rent charges (deterministic ids + on-conflict-do-nothing in the RPC — daily
   re-runs insert 0). Gated to LEDGER_START_YM so switching the ledger on
   mid-month never manufactures receivables for rent already paid off-system. */
async function ensureMonthlyRent(units, secret, today, summary) {
  const ym = today.slice(0, 7);
  if (ym < LEDGER_START_YM) { summary.rent = "pre-start"; return; }
  try {
    const merged = units.map(u => ({ ...u, ...(SEED.unitsPrivate[u.unit] || {}) }));
    const inserted = await rpc("post_rent_charges", { p_secret: secret, p_charges: monthRentCharges(merged, ym) });
    summary.rent = { month: ym, inserted };
  } catch (e) { summary.rent = "failed: " + e.message; }
}

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !configured()) return res.status(500).json({ error: "not configured" });
  if ((req.headers.authorization || "") !== "Bearer " + secret)
    return res.status(401).json({ error: "unauthorized" });

  const today = new Date().toISOString().slice(0, 10);
  const units = UNITS.units || UNITS;
  const candidates = collectCandidates(units, SEED.unitsPrivate, today);

  /* A-2: aging unassigned work orders → manager thread (idempotent by
     trigger_source "maint:<id>"; a read failure never blocks the other scans) */
  try {
    const open = await rpc("get_open_maintenance", { p_secret: secret });
    candidates.push(...maintTriggerCandidates(open, today));
  } catch (e) { console.warn("maint scan:", e.message); }

  /* A-3 queue #2: leasing calls that never reached book_tour → one manager
     thread each (idempotent by "voice-lead:<call_sid>" — shared with the
     truthful-booking guard's inline alert, so nothing double-fires). */
  try {
    const calls = await rpc("get_unbooked_voice_leads", { p_secret: secret });
    candidates.push(...voiceLeadCandidates(calls, new Date().toISOString()));
  } catch (e) { console.warn("voice-lead scan:", e.message); }

  /* A-5 first-payment milestone: the first ach: ledger row EVER → one
     manager thread ('ach-first'). Success posts are otherwise silent by
     design; the smoke that proves the rail shouldn't be. Best-effort. */
  try {
    const first = await rpc("get_first_ach_payment", { p_secret: secret });
    const ach = achFirstCandidate(first);
    if (ach) candidates.push(ach);
  } catch (e) { console.warn("ach-first probe:", e.message); }

  /* C3 heartbeat: stale occupancy pipeline → one manager thread per outage
     (trigger_source keyed by last-sample day). A probe failure is itself
     logged but never blocks the other scans. */
  try {
    const fresh = await rpc("get_occupancy_freshness", { p_secret: secret });
    const stale = c3StaleCandidate(fresh, new Date().toISOString());
    if (stale) candidates.push(stale);
  } catch (e) { console.warn("c3 freshness:", e.message); }

  /* UniFi: network gear offline → one manager thread per outage set
     (trigger_source keyed by the down-device set, so a persistent outage
     alerts once ever and a CHANGED outage opens fresh). Best-effort: no key
     configured or an api.ui.com failure never blocks the other scans. */
  const uniKey = process.env.UNIFI_API_KEY;
  if (uniKey) {
    try {
      const opts = { headers: { "X-API-Key": uniKey, Accept: "application/json" } };
      const [hosts, sites, devices] = await Promise.all(
        ["/v1/hosts", "/v1/sites", "/v1/devices"].map(p =>
          fetch("https://api.ui.com" + p, opts).then(r => {
            if (!r.ok) throw new Error(p + ": HTTP " + r.status);
            return r.json();
          })));
      const uni = unifiTriggerCandidate(shapeUnifi(hosts, sites, devices));
      if (uni) candidates.push(uni);
    } catch (e) { console.warn("unifi scan:", e.message); }
  }

  const summary = { date: today, scanned: candidates.length, opened: 0, skippedExisting: 0, failed: 0, openedSources: [] };

  await ensureMonthlyRent(units, secret, today, summary);
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
  /* B-4 heartbeat: record the completed run (docs/phase-b/11). Best-effort —
     a heartbeat outage must never fail the cron it watches. */
  try { await rpc("post_cron_heartbeat", { p_secret: secret, p_id: "auto-trigger", p_summary: summary }); }
  catch (e) { console.warn("heartbeat:", e.message); }
  return res.status(200).json(summary);
}
