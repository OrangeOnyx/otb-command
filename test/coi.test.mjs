/* COI status math (lib/coi.js). */
import test from "node:test";
import assert from "node:assert/strict";
import { coiStatus, coiBadge, COI_CRITICAL_DAYS, COI_EXPIRING_DAYS } from "../src/lib/coi.js";

const T = "2026-07-20";

test("classifies none / expired / critical / expiring / ok", () => {
  assert.equal(coiStatus(null, T).state, "none");
  assert.equal(coiStatus("", T).state, "none");
  assert.equal(coiStatus("not-a-date", T).state, "none");
  assert.deepEqual(coiStatus("2026-07-19", T), { state: "expired", days: -1 });
  assert.equal(coiStatus("2026-08-01", T).state, "critical");
  assert.equal(coiStatus("2026-09-10", T).state, "expiring");
  assert.deepEqual(coiStatus("2027-07-20", T), { state: "ok", days: 365 });
});

test("window boundaries are inclusive", () => {
  const critEdge = "2026-08-19";  // +30
  const expEdge = "2026-09-18";   // +60
  assert.equal(coiStatus(critEdge, T).days, COI_CRITICAL_DAYS);
  assert.equal(coiStatus(critEdge, T).state, "critical");
  assert.equal(coiStatus("2026-08-20", T).state, "expiring"); // +31
  assert.equal(coiStatus(expEdge, T).days, COI_EXPIRING_DAYS);
  assert.equal(coiStatus(expEdge, T).state, "expiring");
  assert.equal(coiStatus("2026-09-19", T).state, "ok"); // +61
  assert.equal(coiStatus(T, T).state, "critical"); // expires today = 0 days, urgent not expired
});

test("badges carry palette colors and day counts", () => {
  assert.deepEqual(coiBadge({ state: "none" }), { label: "COI —", color: "#5F6E64" });
  assert.equal(coiBadge({ state: "expired", days: -3 }).label, "COI EXPIRED");
  assert.equal(coiBadge({ state: "critical", days: 12 }).label, "COI 12d");
  assert.equal(coiBadge({ state: "expiring", days: 52 }).color, "#C99A33");
  assert.equal(coiBadge({ state: "ok", days: 365 }).label, "COI ✓");
});
