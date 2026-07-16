import test from "node:test";
import assert from "node:assert/strict";
import { extractNumbers, collectKnownNumbers, validateNumbers, VALIDATOR_THRESHOLD } from "../src/lib/calc/guardrail.js";

test("extractNumbers: dollars, commas, percents, k-shorthand, negatives", () => {
  const n = extractNumbers("Pay $1,234.56 (95%) or 12k, delta -$5.12");
  assert.ok(n.includes(1234.56));
  assert.ok(n.includes(95));
  assert.ok(n.includes(12000));
  assert.ok(n.includes(-5.12));
});

test("extractNumbers: statute range 4701-4733 is not mangled into a negative", () => {
  const n = extractNumbers("Articles 4701-4733 govern.");
  assert.ok(n.includes(4701));
  assert.ok(n.includes(4733));
  assert.ok(!n.includes(-4733));
});

test("collectKnownNumbers walks nested objects, arrays, and embedded strings", () => {
  const known = collectKnownNumbers({ a: 16000, b: [{ c: 17.5 }], d: "factor 1.19 applied" });
  assert.ok(known.has(16000));
  assert.ok(known.has(17.5));
  assert.ok(known.has(1.19));
});

test("validateNumbers passes when every figure traces to calc output", () => {
  const known = collectKnownNumbers({ annualizedNer: 16000, nerPerSfPerYear: 16, assetValueAtCap: 200000 });
  const v = validateNumbers("NER is $16,000/yr ($16/SF), asset value $200,000.", known);
  assert.equal(v.passed, true);
  assert.deepEqual(v.hallucinated, []);
});

test("validateNumbers fails closed on a fabricated figure", () => {
  const known = collectKnownNumbers({ annualizedNer: 16000 });
  const v = validateNumbers("NER is $16,000/yr, so asset value is roughly $450,000.", known);
  assert.equal(v.passed, false);
  assert.ok(v.hallucinated.includes(450000));
  assert.ok(v.score < VALIDATOR_THRESHOLD);
});

test("validateNumbers ignores years, CCP articles, and small counts (≤12)", () => {
  const v = validateNumbers("In 2026, per CCP 4701, serve within 5 days across 3 steps.", new Set());
  assert.equal(v.passed, true);
});

test("validateNumbers mid-size integers are NOT ignorable (M1 window)", () => {
  const v = validateNumbers("Call it $18/SF and 20 units.", new Set());
  assert.equal(v.passed, false);
});

test("validateNumbers: ≤0.5% rounding tolerance; ±$1.50 only for small magnitudes", () => {
  const known = collectKnownNumbers({ total: 118750, small: 42 });
  assert.equal(validateNumbers("about $118,800", known).passed, true);   // 0.04% off
  assert.equal(validateNumbers("about $43", known).passed, true);        // ±$1.50 small
  assert.equal(validateNumbers("about $120,300", known).passed, false);  // 1.3% off → fail
});
