/* Guard for the tenant-health presentation helpers (src/lib/tenanthealth.js,
   pick 8 of the Asset Command review): grade → band mapping and the summary
   tiles over a scored list. */
import test from "node:test";
import assert from "node:assert/strict";
import { tenantHealth, healthBand, healthSummary, BAND_LABEL } from "../src/lib/tenanthealth.js";

test("bands: A/B ok · C watch · D/E at risk", () => {
  assert.equal(healthBand("A"), "ok");
  assert.equal(healthBand("B"), "ok");
  assert.equal(healthBand("C"), "watch");
  assert.equal(healthBand("D"), "risk");
  assert.equal(healthBand("E"), "risk");
  assert.deepEqual(BAND_LABEL, { ok: "OK", watch: "Watch", risk: "At risk" });
});

test("summary tiles over a real scoring run", () => {
  const T = "2026-09-20";
  const units = [
    { unit: "101", dba: "A", status: "active", monthly: 5000, end: "2029-02-28" },   // clean, long runway → A
    { unit: "115", dba: "B", status: "active", monthly: 3000, end: "2026-09-30" },   // clean, <1 mo → 60+4+15 = 79 B
    { unit: "129", dba: "C", status: "active", monthly: 2800, end: "2029-08-31" },   // 4 late, 1 unpaid → 21+25+5 = 51 D
    { unit: "131", dba: "V", status: "vacant", monthly: 0, end: "" },
  ];
  const stats = {
    101: { late: 0, partial: 0, unpaid: 0, lateFees: 0 },
    115: { late: 0, partial: 0, unpaid: 0, lateFees: 0 },
    129: { late: 4, partial: 0, unpaid: 1, lateFees: 250 },
  };
  const h = tenantHealth(units, stats, T);
  assert.deepEqual(h.map(x => x.unit), ["129", "115", "101"], "worst first");
  const s = healthSummary(h);
  assert.equal(s.n, 3);
  assert.equal(s.risk, 1);
  assert.equal(s.ok, 2);
  assert.equal(s.watch, 0);
  assert.equal(s.critical, 0);
  assert.equal(s.avg, Math.round(h.reduce((t, x) => t + x.score, 0) / 3));
  assert.deepEqual(healthSummary([]), { n: 0, avg: null, ok: 0, watch: 0, risk: 0, critical: 0 });
});
