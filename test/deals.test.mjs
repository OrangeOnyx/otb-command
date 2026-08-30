/* Leasing pipeline seam (src/lib/deals.js) — pure half. Guards the W-1 card
   shaping (dealActionCards: stage → lane, open-only, id/unit/title/detail
   shape), newDealId determinism under injected now/rnd, and the
   DEAL_STAGES / OPEN_STAGES vocabulary staying consistent. */
import test from "node:test";
import assert from "node:assert/strict";
import { DEAL_STAGES, OPEN_STAGES, newDealId, dealActionCards } from "../src/lib/deals.js";

const deal = (stage, extra) => ({
  id: "dlx1", prospect: "Jane Doe", business: "Bayou Books", target_unit: "131",
  proposed_rent: "$18.50/SF", stage, lead_source: "voice", created_at: "2026-08-20T15:00:00Z",
  ...extra,
});

test("DEAL_STAGES / OPEN_STAGES stay consistent", () => {
  assert.deepEqual(Object.keys(DEAL_STAGES), ["inquiry", "tour", "loi", "lease_draft", "signed", "lost"]);
  assert.deepEqual(OPEN_STAGES, ["inquiry", "tour", "loi", "lease_draft"]);
  OPEN_STAGES.forEach(s => assert.ok(DEAL_STAGES[s], s + " is a known stage"));
  assert.ok(!OPEN_STAGES.includes("signed") && !OPEN_STAGES.includes("lost"), "closed stages are not open");
});

test("newDealId is deterministic under injected now/rnd", () => {
  assert.equal(newDealId(0, 0), "dl00");
  assert.equal(newDealId(1753280000000, 0.5), newDealId(1753280000000, 0.5));
  assert.ok(newDealId(1753280000000, 0.5).startsWith("dl"));
  assert.notEqual(newDealId(1753280000000, 0.5), newDealId(1753280000001, 0.5));
  assert.notEqual(newDealId(), newDealId());
});

test("stage → lane mapping: inquiry watches, tour/loi need action, lease_draft is in progress", () => {
  const lanes = Object.fromEntries(
    dealActionCards(OPEN_STAGES.map((s, i) => deal(s, { id: "d" + i }))).map(c => [c.title.split("— ")[1], c.lane]));
  assert.equal(lanes["Inquiry"], "watch");
  assert.equal(lanes["Tour"], "action");
  assert.equal(lanes["LOI"], "action");
  assert.equal(lanes["Lease draft"], "progress");
});

test("closed stages (signed/lost) never reach the board", () => {
  assert.deepEqual(dealActionCards([deal("signed"), deal("lost")]), []);
  assert.equal(dealActionCards([deal("signed"), deal("tour", { id: "dl2" })]).length, 1);
});

test("card shape: id/kind/unit/due/title/detail", () => {
  const [c] = dealActionCards([deal("tour", { next_action_at: "2026-09-05" })]);
  assert.equal(c.id, "deal:dlx1");
  assert.equal(c.kind, "leasing");
  assert.equal(c.unit, "131");
  assert.equal(c.due, "2026-09-05");
  assert.equal(c.title, "Bayou Books — Tour");
  assert.equal(c.detail, "Jane Doe · Unit 131 · $18.50/SF");
});

test("sparse deals degrade: prospect-only title, null unit/due, thin detail", () => {
  const [c] = dealActionCards([{ id: "d9", prospect: "Walk-in", stage: "inquiry" }]);
  assert.equal(c.title, "Walk-in — Inquiry");
  assert.equal(c.unit, null);
  assert.equal(c.due, null);
  assert.equal(c.detail, "Walk-in");
  const [n] = dealActionCards([{ id: "d0", stage: "inquiry" }]);
  assert.equal(n.title, "Prospect — Inquiry");
});

test("null/empty input yields an empty board contribution", () => {
  assert.deepEqual(dealActionCards(null), []);
  assert.deepEqual(dealActionCards(undefined), []);
  assert.deepEqual(dealActionCards([]), []);
});
