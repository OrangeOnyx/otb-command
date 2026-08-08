import test from "node:test";
import assert from "node:assert/strict";
import { classifyStripeEvent, achSummary, epochToIsoDate, achFirstCandidate } from "../src/lib/ach.js";

const succeeded = (over = {}, metaUnit = "131") => ({
  id: "evt_1", type: "payment_intent.succeeded", created: 1785000000, // 2026-07-25 UTC
  data: { object: { object: "payment_intent", id: "pi_abc123", amount: 318700, amount_received: 318700,
    created: 1785000000, metadata: metaUnit === null ? {} : { unit: metaUnit }, ...over } },
});

test("ach: succeeded + known unit → deterministic idempotent payment row", () => {
  const out = classifyStripeEvent(succeeded(), ["131", "133"]);
  assert.equal(out.kind, "payment");
  assert.equal(out.entry.id, "ach:pi_abc123");
  assert.equal(out.entry.unit, "131");
  assert.equal(out.entry.amount, 3187);
  assert.equal(out.entry.type, "payment");
  assert.equal(out.entry.code, "rent");
  assert.equal(out.entry.entered_by, "stripe");
  assert.match(out.entry.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(achSummary(out), /posted ach:pi_abc123 \$3187\.00 unit 131/);
});

test("ach: succeeded with missing or unknown unit → unmapped alert with idempotent key", () => {
  const noUnit = classifyStripeEvent(succeeded({}, null), ["131"]);
  assert.equal(noUnit.kind, "unmapped");
  assert.equal(noUnit.alert.triggerSource, "ach-unmapped:pi_abc123");
  assert.match(noUnit.alert.detail, /\$3187\.00/);
  const badUnit = classifyStripeEvent(succeeded({}, "999"), ["131"]);
  assert.equal(badUnit.kind, "unmapped");
  assert.match(badUnit.alert.detail, /999/);
  // no validUnits list → skip membership check
  const unchecked = classifyStripeEvent(succeeded({}, "999"), null);
  assert.equal(unchecked.kind, "payment");
});

test("ach: payment_failed → failed alert carrying Stripe's message", () => {
  const evt = succeeded({ last_payment_error: { message: "R01 insufficient funds" } });
  evt.type = "payment_intent.payment_failed";
  const out = classifyStripeEvent(evt, ["131"]);
  assert.equal(out.kind, "failed");
  assert.equal(out.alert.triggerSource, "ach-fail:pi_abc123");
  assert.match(out.alert.detail, /R01 insufficient funds/);
  assert.match(out.alert.detail, /NSF/);
});

test("ach: unrelated events and zero amounts are ignored; date math is UTC", () => {
  assert.equal(classifyStripeEvent({ type: "charge.refunded", data: { object: { object: "charge" } } }).kind, "ignore");
  const zero = classifyStripeEvent(succeeded({ amount_received: 0, amount: 0 }), ["131"]);
  assert.equal(zero.kind, "ignore");
  assert.equal(epochToIsoDate(0), "1970-01-01");
});

test("achFirstCandidate: milestone thread from the first ach row", () => {
  const c = achFirstCandidate({ id: "ach:pi_1", unit: "105", amount: 3231.16, date: "2026-08-12" });
  assert.equal(c.agent, "manager");
  assert.equal(c.triggerSource, "ach-first");
  assert.ok(c.title.includes("First ACH payment"));
  assert.ok(c.detail.includes("unit 105"));
  assert.ok(c.detail.includes("$3,231.16"));
  assert.ok(c.detail.includes("2026-08-12"));
});

test("achFirstCandidate: null-safe before any payment exists", () => {
  assert.equal(achFirstCandidate(null), null);
  assert.equal(achFirstCandidate({}), null);
  assert.equal(achFirstCandidate({ id: "ach:x" }), null);
});
