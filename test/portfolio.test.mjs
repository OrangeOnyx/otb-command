import test from "node:test";
import assert from "node:assert/strict";
import { byProperty, arSummary, woSummary, portfolioModel, cardHTML } from "../src/lib/portfolio.js";

const P1 = "11111111-1111-1111-1111-111111111111";
const P2 = "22222222-2222-2222-2222-222222222222";

test("byProperty groups stamped rows and tolerates empty input", () => {
  const g = byProperty([{ property_id: P1, x: 1 }, { property_id: P2, x: 2 }, { property_id: P1, x: 3 }]);
  assert.equal(g[P1].length, 2);
  assert.equal(g[P2].length, 1);
  assert.deepEqual(byProperty(null), {});
});

test("arSummary: positive unit balances only; voids cancel; credits don't cross units", () => {
  const entries = [
    { id: "a", unit: "101", type: "charge", amount: 1000 },
    { id: "b", unit: "101", type: "payment", amount: 400 },   // 101 owes 600
    { id: "c", unit: "103", type: "charge", amount: 500 },
    { id: "d", unit: "103", type: "payment", amount: 700 },   // 103 credit −200 (ignored)
    { id: "e", unit: "105", type: "charge", amount: 250 },
    { id: "f", unit: "105", type: "void", voidOf: "e" },      // voided → 105 clear
  ];
  const s = arSummary(entries);
  assert.equal(s.outstanding, 600);
  assert.equal(s.unitsInArrears, 1);
});

test("arSummary: empty ledger reads as clear", () => {
  assert.deepEqual(arSummary([]), { outstanding: 0, unitsInArrears: 0 });
});

test("woSummary counts open states and unassigned from the event trail", () => {
  const rows = [{ id: "mr1" }, { id: "mr2" }, { id: "mr3" }];
  const events = [
    { request_id: "mr2", kind: "assign", vendor_id: "v9", created_at: "2026-08-01" },
    { request_id: "mr3", kind: "status", status: "done", created_at: "2026-08-02" },
  ];
  const s = woSummary(rows, events);
  assert.equal(s.open, 2);        // mr1 open, mr2 open+assigned, mr3 done
  assert.equal(s.unassigned, 1);  // mr1
});

test("portfolioModel folds per property and floats the active card first", () => {
  const properties = [
    { id: P1, slug: "otb", name: "On The Boulevard", address: "101–149 Arnould Blvd" },
    { id: P2, slug: "second", name: "Second Center", address: "" },
  ];
  const m = portfolioModel({
    properties,
    ledgerByProp: { [P2]: [{ id: "a", unit: "1", type: "charge", amount: 100 }] },
    maintByProp: { [P1]: { rows: [{ id: "mr1" }], events: [] } },
    activeSlug: "second",
  });
  assert.equal(m[0].slug, "second");         // active first
  assert.equal(m[0].active, true);
  assert.equal(m[0].ar.outstanding, 100);
  assert.equal(m[1].wo.open, 1);
  assert.equal(m[1].active, false);
});

test("cardHTML escapes content and gates the Open button on active", () => {
  const active = cardHTML({ slug: "otb", name: "A <b>", address: "", active: true,
    ar: { outstanding: 0, unitsInArrears: 0 }, wo: { open: 0, unassigned: 0 } });
  assert.ok(active.includes("A &lt;b&gt;"));
  assert.ok(active.includes("ACTIVE"));
  assert.ok(!active.includes("pf-open"));
  const other = cardHTML({ slug: "second", name: "S", address: "1 Main", active: false,
    ar: { outstanding: 1234.4, unitsInArrears: 2 }, wo: { open: 3, unassigned: 2 } });
  assert.ok(other.includes('data-slug="second"'));
  assert.ok(other.includes("pf-open"));
  assert.ok(other.includes("$1,234"));
  assert.ok(other.includes("2 units in arrears"));
  assert.ok(other.includes("2 unassigned"));
});
