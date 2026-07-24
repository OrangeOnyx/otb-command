/* A-5 Stripe ACH seam (gate 3A, decided 2026-07-22: Stripe ACH now, paired
   with the Aug 1 ledger go-live). Pure classification of Stripe webhook
   events into ledger actions — the model/webhook never does arithmetic or
   invents rows:
     payment_intent.succeeded + metadata.unit → ledger 'payment' row with the
       deterministic id 'ach:<pi_id>' (re-delivered webhooks are no-ops, the
       same discipline as 'rent:YYYY-MM:unit').
     payment_intent.succeeded WITHOUT a mappable unit → 'unmapped' alert (the
       money landed; the operator maps it by hand from a manager thread).
     payment_intent.payment_failed → 'failed' alert (ACH returns fail DAYS
       after "success" UX — the thread is the tripwire).
   Everything else → ignore. Pure, no I/O, no Date.now(). */

const round2 = n => Math.round(n * 100) / 100;

export const epochToIsoDate = epochSec =>
  new Date(epochSec * 1000).toISOString().slice(0, 10);

/* event: a Stripe event object (re-fetched from the API — never trust the
   webhook body itself). validUnits: array of known unit ids, or null to skip
   the membership check. */
export function classifyStripeEvent(event, validUnits = null) {
  const type = event?.type || "";
  const pi = event?.data?.object;
  if (!pi || pi.object !== "payment_intent") return { kind: "ignore", reason: "not a payment_intent event" };

  const unit = String(pi.metadata?.unit || "").trim();
  const amount = round2((pi.amount_received || pi.amount || 0) / 100);
  const ref = pi.id || "";
  const when = epochToIsoDate(event.created || pi.created || 0);

  if (type === "payment_intent.succeeded") {
    const unitOk = unit && (!Array.isArray(validUnits) || validUnits.includes(unit));
    if (!unitOk) {
      return {
        kind: "unmapped",
        alert: {
          triggerSource: "ach-unmapped:" + ref,
          title: "ACH payment received — unit unknown",
          detail: "Stripe reports a completed payment of $" + amount.toFixed(2) + " (" + ref + ", " + when + ") " +
            (unit ? "with unrecognized unit “" + unit + "”. " : "with no unit metadata. ") +
            "Log it in the right unit's drawer → Ledger → Payment received, memo “" + ref + "”.",
        },
      };
    }
    if (!(amount > 0)) return { kind: "ignore", reason: "zero amount" };
    return {
      kind: "payment",
      entry: {
        id: "ach:" + ref,
        unit,
        type: "payment",
        code: "rent",
        amount,
        date: when,
        description: "Stripe ACH payment (" + ref + ")",
        entered_by: "stripe",
      },
    };
  }

  if (type === "payment_intent.payment_failed") {
    const msg = pi.last_payment_error?.message || "no failure detail from Stripe";
    return {
      kind: "failed",
      alert: {
        triggerSource: "ach-fail:" + ref,
        title: "ACH payment FAILED" + (unit ? " — unit " + unit : ""),
        detail: "Stripe reports a failed payment" + (unit ? " for unit " + unit : "") +
          " of $" + amount.toFixed(2) + " (" + ref + ", " + when + "): " + msg +
          " ACH failures can land days after the tenant sees “success” — if a payment " +
          "was already logged for this transfer, post an NSF entry in the unit's ledger.",
      },
    };
  }

  return { kind: "ignore", reason: "unhandled type " + type };
}

/* One-line webhook summary for logs / the endpoint response. */
export function achSummary(out) {
  if (!out) return "no result";
  if (out.kind === "payment") return "posted " + out.entry.id + " $" + out.entry.amount.toFixed(2) + " unit " + out.entry.unit;
  if (out.kind === "unmapped" || out.kind === "failed") return out.kind + " → thread " + out.alert.triggerSource;
  return "ignored (" + (out.reason || "n/a") + ")";
}
