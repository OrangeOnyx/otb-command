import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildBriefModel, momDeltas, briefHTML, extractBriefs,
  prevMonthKey, OCC_EPSILON,
} from "../src/lib/brief.js";

test("prevMonthKey: mid-year and january rollover", () => {
  assert.equal(prevMonthKey("2026-07"), "2026-06");
  assert.equal(prevMonthKey("2026-01"), "2025-12");
  assert.equal(prevMonthKey("2026-10"), "2026-09");
});

const TODAY = "2026-07-17";

const UNITS = [
  { unit: "101", dba: "Alpha", status: "active", sf: 2000, end: "2027-03-31" },
  { unit: "103", dba: "Bravo", status: "active", sf: 1000, end: "2026-09-30" }, // inside 12mo
  { unit: "105", dba: "Charlie", status: "anchor", sf: 4000, end: "2029-01-31" },
  { unit: "131", dba: "", status: "vacant", sf: 1500 },
  { unit: "135B", dba: "Belle", status: "owner", sf: 1580 }, // occupied, not leased
  { unit: "143", dba: "Delta", status: "active", sf: 900, end: "2026-06-30" }, // holdover
];
const PRIV = {
  101: { monthly: 3000 }, 103: { monthly: 1500 },
  105: { monthly: 5000 }, 143: { monthly: 1000 },
};
const STATE = {
  financials: { opex: { insurance: 24000, cam: 36000, zero: 0 }, capRatePct: 7.5 },
  actions: {
    custom: [
      { id: "a", title: "Roofer walk", lane: "now", due: "2026-07-25" },
      { id: "b", title: "Old thing", lane: "watch" },
    ],
    lane: { b: "done" },
  },
};

test("model: occupancy, income, vacants, holdovers, expirations", () => {
  const m = buildBriefModel(UNITS, PRIV, STATE, TODAY);
  assert.equal(m.month, "2026-07");
  assert.equal(m.monthLabel, "July 2026");
  assert.equal(m.totalSf, 10980);
  assert.equal(m.occupiedSf, 10980 - 1500);            // vacant 131 only
  assert.equal(m.occupiedUnits, 5);
  assert.equal(m.occupancyPct, Math.round((9480 / 10980) * 10000) / 10000);
  assert.equal(m.scheduledMonthly, 10500);             // leased only — owner unit excluded
  assert.equal(m.scheduledAnnual, 126000);
  assert.deepEqual(m.vacants, [{ unit: "131", sf: 1500 }]);
  assert.deepEqual(m.holdovers, ["143"]);
  // 103 (2026-09-30) and 101 (2027-03-31) both inside today+365 = 2027-07-17, date-sorted
  assert.deepEqual(m.expirations.map(e => e.unit), ["103", "101"]);
  assert.equal(m.expiringMonthly, 4500);
});

test("model: financials worksheet → NOI and cap value; zero opex rows dropped", () => {
  const m = buildBriefModel(UNITS, PRIV, STATE, TODAY);
  assert.equal(m.opexTotal, 60000);
  assert.equal(m.opex.zero, undefined);
  assert.equal(m.noi, 126000 - 60000);
  assert.equal(m.capValue, Math.round((66000 / 0.075) * 100) / 100);
});

test("model: no worksheet → NOI omitted, never fabricated", () => {
  const m = buildBriefModel(UNITS, PRIV, {}, TODAY);
  assert.equal(m.opexTotal, null);
  assert.equal(m.noi, null);
  assert.equal(m.capValue, null);
});

test("model: done actions filtered, lane override wins", () => {
  const m = buildBriefModel(UNITS, PRIV, STATE, TODAY);
  assert.deepEqual(m.actions, [{ lane: "now", title: "Roofer walk", due: "2026-07-25" }]);
});

test("mom: direction words precomputed, epsilon reads flat", () => {
  const cur = buildBriefModel(UNITS, PRIV, STATE, TODAY);
  const prior = { ...cur, month: "2026-06", occupancyPct: cur.occupancyPct - 0.02, scheduledMonthly: cur.scheduledMonthly + 500 };
  const d = momDeltas(cur, prior);
  assert.equal(d.occDirection, "up");
  assert.equal(d.incDirection, "down");
  assert.equal(d.incDelta, -500);
  const flat = momDeltas(cur, { ...cur, month: "2026-06", occupancyPct: cur.occupancyPct + OCC_EPSILON / 2, scheduledMonthly: cur.scheduledMonthly + 0.5 });
  assert.equal(flat.occDirection, "flat");
  assert.equal(flat.incDirection, "flat");
  assert.equal(momDeltas(cur, null), null);
});

test("html: carries the OO brand, the figures, and escapes tenant input", () => {
  const m = buildBriefModel(
    UNITS.map(u => u.unit === "103" ? { ...u, dba: 'Ev<il> & "Co"' } : u),
    PRIV, STATE, TODAY);
  const html = briefHTML(m, momDeltas(m, { ...m, month: "2026-06", occupancyPct: m.occupancyPct - 0.02, scheduledMonthly: m.scheduledMonthly - 500 }));
  assert.match(html, /Owner Intelligence Brief — July 2026/);
  assert.match(html, /#1C2D4F/); // Ocean Navy
  assert.match(html, /#E8820C/); // Sunset Orange
  assert.match(html, /Property Manager for Belle Realty of Lafayette, LLC/);
  assert.match(html, /adam@orangeocean\.com/);
  assert.match(html, /\$10,500/);          // scheduled monthly
  assert.match(html, /\$66,000/);          // NOI
  assert.match(html, /▲/);                 // MoM chips present
  assert.ok(!html.includes("Ev<il>"));     // escaped
  assert.match(html, /Ev&lt;il&gt;/);
});

test("html: baseline month has no MoM arrows; empty vacancy reads as full", () => {
  const full = UNITS.map(u => u.status === "vacant" ? { ...u, status: "active", dba: "New", end: "2028-12-31" } : u);
  const m = buildBriefModel(full, { ...PRIV, 131: { monthly: 2000 } }, {}, TODAY);
  const html = briefHTML(m, null);
  assert.match(html, /baseline month/);
  assert.match(html, /fully occupied/);
});

test("extractBriefs: strict month gate, junk dropped, text cleaned", () => {
  const { clean, briefs } = extractBriefs(
    "Here is the brief.\n\n[[brief:2026-07|Owner Intelligence Brief — July 2026]]\n" +
    "[[brief:javascript:alert(1)|evil]] [[brief:2026-13|bad month]]");
  assert.deepEqual(briefs, [{ month: "2026-07", label: "Owner Intelligence Brief — July 2026" }]);
  assert.equal(clean, "Here is the brief.");
});
