/* /api/stripe-webhook — A-5 ACH intake (env-gated: dormant until the operator
   adds STRIPE_SECRET_KEY in Vercel and points a Stripe webhook here).
   Verification is by RE-FETCH, not signature: the webhook body is treated as
   untrusted; only the event id is taken from it, and the event is fetched
   back from api.stripe.com with the secret key. A forged POST can only make
   us read Stripe's own record. (This also sidesteps raw-body/CSP plumbing —
   the runtime's parsed body is fine because we never verify bytes.)
   Verified payment_intent.succeeded → post_ach_payments RPC (idempotent
   'ach:<pi_id>' ledger rows); unmapped/failed events open manager threads
   through the same open_trigger_thread gate the cron uses. */
import { configured, rpcSecret as rpc } from "./_supa.mjs";
import { classifyStripeEvent, achSummary } from "../src/lib/ach.js";
import UNITS from "../src/data/units.public.json" with { type: "json" };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const key = process.env.STRIPE_SECRET_KEY;
  const cron = process.env.CRON_SECRET;
  if (!key || !cron || !configured()) {
    // Dormant: acknowledge nothing, tell Stripe to retry later once configured.
    return res.status(503).json({ error: "ACH intake not configured" });
  }

  const id = String(req.body?.id || "");
  if (!/^evt_[A-Za-z0-9]+$/.test(id)) return res.status(400).json({ error: "no event id" });

  // Authoritative copy — never trust the delivered body.
  const er = await fetch("https://api.stripe.com/v1/events/" + id, {
    headers: { Authorization: "Bearer " + key },
  });
  if (!er.ok) return res.status(400).json({ error: "event not verifiable (" + er.status + ")" });
  const event = await er.json();

  const validUnits = UNITS.map(u => u.unit);
  const out = classifyStripeEvent(event, validUnits);

  try {
    if (out.kind === "payment") {
      const n = await rpc("post_ach_payments", { p_secret: cron, p_entries: [out.entry] });
      return res.status(200).json({ received: true, posted: n, summary: achSummary(out) });
    }
    if (out.kind === "unmapped" || out.kind === "failed") {
      await rpc("open_trigger_thread", {
        p_secret: cron, p_agent: "manager",
        p_title: out.alert.title, p_trigger: out.alert.triggerSource,
        p_content: out.alert.detail,
      });
      return res.status(200).json({ received: true, summary: achSummary(out) });
    }
    return res.status(200).json({ received: true, summary: achSummary(out) });
  } catch (e) {
    // 500 → Stripe retries with backoff; the deterministic ids keep it safe.
    return res.status(500).json({ error: "posting failed: " + e.message });
  }
}
