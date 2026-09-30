import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  shiftYm, monthBounds, scheduledRent, worksheetRow, worksheet, parseMoney
} from "../src/lib/rentworksheet.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const units = JSON.parse(readFileSync(join(root, "src/data/units.json"), "utf8"));
const U = id => units.find(u => u.unit === id);

test("month arithmetic crosses year boundaries", () => {
  assert.equal(shiftYm("2026-01", -1), "2025-12");
  assert.equal(shiftYm("2026-12", 1), "2027-01");
  assert.deepEqual(monthBounds("2028-02"), { first: "2028-02-01", last: "2028-02-29" });
});

test("September 2026 worksheet ties to the scheduled monthly total", () => {
  const w = worksheet(units, "2026-09");
  assert.equal(w.curTotal, 88310.33);
  assert.equal(w.priorTotal, 88310.33);
  assert.equal(w.diffTotal, 0);
  assert.equal(w.rows.length, 27);
});

test("145 Upstream: abatement now, abatement-ends in Jan 2027 at +$2,236.50", () => {
  assert.equal(worksheetRow(U("145"), "2026-09").kind, "abatement");
  const jan = worksheetRow(U("145"), "2027-01");
  assert.equal(jan.kind, "abatement-ends");
  assert.equal(jan.prior.amount, 798.75);
  assert.equal(jan.cur.amount, 3035.25);
  assert.equal(jan.diff, 2236.5);
});

test("a month before the current term is 'not on file', never zero", () => {
  const r = worksheetRow(U("139"), "2026-08"); // Fast Pass renewal began 8/1/2026
  assert.equal(r.prior.amount, null);
  assert.equal(r.kind, "new-term");
  assert.equal(worksheet(units, "2026-08").priorUnknown, 2);
});

test("expired term carries the last rent forward and is flagged", () => {
  // fixture: 115 as it stood before its extension was executed (term ended 9/30/2026)
  const before = { ...U("115"), end: "2026-09-30", leaseEvidence: undefined };
  const r = worksheetRow(before, "2026-10");
  assert.equal(r.kind, "expired");
  assert.equal(r.cur.amount, before.monthly);
  assert.match(r.notes[0], /Term ended/);
});

test("115/117 executed extension: September on the final tier, October on the extension rent", () => {
  for (const [id, oct] of [["115", 3345.42], ["117", 3345.41]]) {
    assert.equal(worksheetRow(U(id), "2026-09").cur.amount, 3327.34, id);
    assert.equal(worksheetRow(U(id), "2026-10").cur.amount, oct, id);
  }
  assert.equal(worksheet(units, "2026-10").curTotal, 88346.48);
});

test("vacant / owner-occupied suites classify without amounts", () => {
  assert.equal(worksheetRow(U("131"), "2026-09").kind, "vacant");
  assert.equal(worksheetRow(U("135B"), "2026-09").kind, "owner");
});

test("rent step between months classifies as increase", () => {
  const u = { unit: "X", status: "active", monthly: 1100, start: "2025-01-01", end: "2030-12-31",
    leaseEvidence: { rentPhases: [
      { label: "Year 1", start: "2025-01-01", end: "2025-12-31", monthly: 1000 },
      { label: "Year 2", start: "2026-01-01", end: null, monthly: 1100 }] } };
  const r = worksheetRow(u, "2026-01");
  assert.equal(r.kind, "increase");
  assert.equal(r.diff, 100);
});

test("no private financials → unknown rows and null totals", () => {
  const pub = units.map(({ monthly, ...u }) => u);
  const w = worksheet(pub, "2026-09");
  assert.equal(w.curTotal, null);
  assert.equal(scheduledRent(pub[0], "2026-09").basis, "private");
});

test("owner input parsing", () => {
  assert.equal(parseMoney(""), null);
  assert.equal(parseMoney("$3,035.25"), 3035.25);
  assert.ok(Number.isNaN(parseMoney("about 3k")));
});
