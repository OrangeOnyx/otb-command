import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { latestByStall, occSummary, rowStallRect, rowOverlay, stallOverlay, zoneStallRect, occLine, c3StaleCandidate, weeklyRollup, rollupLine } from "../src/lib/occupancy.js";

const MAP = {
  rowMeta: { count: 56, tickX0: 135.66, pitch: 16.59, y: 330 },
  stalls: {
    "105-s1": { rank: "row56", index: 16 },
    "105-s2": { rank: "row56", index: 15 },
    "pol-s1": { rank: "lot8", index: 1 },
    "149p-s4": { rank: "field-149", index: 4 },
  },
};

const ROWS = [
  { stall: "105-s1", state: "empty", ts: "2026-07-22T10:00:00" },
  { stall: "105-s1", state: "occupied", ts: "2026-07-22T14:00:00" },
  { stall: "105-s2", state: "empty", ts: "2026-07-22T14:00:00" },
  { stall: "pol-s1", state: "unclear", ts: "2026-07-22T14:00:00" },
];

test("latestByStall keeps the newest sample per stall", () => {
  const latest = latestByStall(ROWS);
  assert.equal(latest.get("105-s1").state, "occupied");
  assert.equal(latest.get("105-s2").state, "empty");
  assert.equal(latest.size, 3);
  assert.equal(latestByStall(null).size, 0);
});

test("occSummary tallies per rank; unclear/stale never count as known", () => {
  const { ranks, asOf } = occSummary(latestByStall(ROWS), MAP);
  assert.deepEqual(ranks.row56, { covered: 2, occupied: 1, empty: 1, unclear: 0, stale: 0 });
  assert.deepEqual(ranks.lot8, { covered: 1, occupied: 0, empty: 0, unclear: 1, stale: 0 });
  assert.deepEqual(ranks["field-149"], { covered: 1, occupied: 0, empty: 0, unclear: 0, stale: 1 });
  assert.equal(asOf, "2026-07-22T14:00:00");
});

test("rowStallRect: stall 1 starts at the first tick; out-of-row is null", () => {
  const r1 = rowStallRect(MAP.rowMeta, 1);
  assert.ok(Math.abs(r1.x - (135.66 + 1.5)) < 1e-9);
  assert.ok(Math.abs(r1.w - (16.59 - 3)) < 1e-9);
  assert.equal(rowStallRect(MAP.rowMeta, 0), null);
  assert.equal(rowStallRect(MAP.rowMeta, 57), null);
});

test("rowOverlay: row56 only, index-sorted, stale when no sample", () => {
  const o = rowOverlay(latestByStall(ROWS), MAP);
  assert.deepEqual(o.map(s => s.index), [15, 16]);
  assert.equal(o[1].state, "occupied");
  assert.ok(o[0].rect.w > 0);
});

test("occLine folds unclear/stale into a qualifier", () => {
  const line = occLine(occSummary(latestByStall(ROWS), MAP));
  assert.match(line, /storefront row 1\/2/);
  assert.match(line, /1 unclear/);
  assert.match(line, /1 no data/);
});

test("zoneStallRect: reads zoneRects with symmetric inset; unknown rank/index null", () => {
  const map = { zoneRects: { lot8: { "1": { x: 100, y: 200, w: 13, h: 32 } } } };
  const r = zoneStallRect(map, "lot8", 1);
  assert.deepEqual(r, { x: 101.5, y: 201.5, w: 10, h: 29 });
  assert.equal(zoneStallRect(map, "lot8", 2), null);
  assert.equal(zoneStallRect(map, "field-149", 1), null);
  assert.equal(zoneStallRect(MAP, "lot8", 1), null, "no zoneRects block → no paint");
});

test("stallOverlay covers row56 AND zone-rect ranks; geometry-less ranks skip", () => {
  const map = {
    ...MAP,
    zoneRects: { lot8: { "1": { x: 1186.5, y: 184.87, w: 13.05, h: 32.34 } } },
  };
  const o = stallOverlay(latestByStall(ROWS), map);
  // 105-s1/s2 (row56) + pol-s1 (lot8, has rect); 149p-s4 has no field-149 rect → skipped
  assert.deepEqual(o.map(s => s.id).sort(), ["105-s1", "105-s2", "pol-s1"]);
  const pol = o.find(s => s.id === "pol-s1");
  assert.equal(pol.state, "unclear");
  assert.ok(pol.rect.x > 1186 && pol.rect.w > 0);
});

test("c3StaleCandidate: quiet while fresh, one candidate per outage when stale", () => {
  const now = "2026-07-23T11:00:00Z";
  // fresh (7h old) → healthy
  assert.equal(c3StaleCandidate({ latest_ts: "2026-07-23T04:00:02+00:00" }, now), null);
  // 36h+ old → manager thread keyed by the LAST-SAMPLE day (not today):
  // re-runs during the same outage dedupe on trigger_source
  const c = c3StaleCandidate({ latest_ts: "2026-07-20T04:00:00Z" }, now);
  assert.equal(c.agent, "manager");
  assert.equal(c.triggerSource, "c3-stale:2026-07-20");
  assert.match(c.detail, /OTB-C3-Nightly/);
  assert.match(c.detail, /2026-07-20 \(79h ago\)/);
  // never any samples → still alerts, stable key
  const never = c3StaleCandidate({ latest_ts: null }, now);
  assert.equal(never.triggerSource, "c3-stale:never");
  assert.equal(c3StaleCandidate(null, now).triggerSource, "c3-stale:never");
  // threshold override honored
  assert.equal(c3StaleCandidate({ latest_ts: "2026-07-23T04:00:00Z" }, now, { hours: 6 })?.triggerSource,
    "c3-stale:2026-07-23");
});

test("weeklyRollup: sample-weighted UTC days, unclear excluded, gaps null", () => {
  const now = Date.parse("2026-07-23T12:00:00Z");
  const rows = [
    { stall: "a", state: "occupied", ts: "2026-07-23T10:00:00+00:00" },
    { stall: "b", state: "empty", ts: "2026-07-23T10:00:00+00:00" },
    { stall: "a", state: "occupied", ts: "2026-07-22T10:00:00+00:00" },
    { stall: "a", state: "unclear", ts: "2026-07-22T11:00:00+00:00" }, // never counts
    { stall: "a", state: "occupied", ts: "2026-07-20T10:00:00+00:00" },
    { stall: "b", state: "occupied", ts: "2026-07-20T10:00:00+00:00" },
    { stall: "c", state: "empty", ts: "2026-07-20T10:00:00+00:00" },
    { stall: "c", state: "empty", ts: "2026-07-20T11:00:00+00:00" },
  ];
  const r = weeklyRollup(rows, now);
  assert.equal(r.length, 7);
  assert.equal(r[6].day, "2026-07-23");
  assert.equal(r[6].pct, 50);
  assert.equal(r[5].pct, 100, "unclear sample must not dilute 07-22");
  assert.equal(r[4].pct, null, "07-21 has no data");
  assert.equal(r[3].pct, 50); // 07-20: 2 occ / 4 known
  assert.equal(r[0].day, "2026-07-17");
});

test("rollupLine: bars for data, midline dot for gaps, week average", () => {
  const now = Date.parse("2026-07-23T12:00:00Z");
  const rows = [
    { stall: "a", state: "occupied", ts: "2026-07-23T10:00:00Z" },
    { stall: "b", state: "empty", ts: "2026-07-23T10:30:00Z" },
    { stall: "a", state: "occupied", ts: "2026-07-22T10:00:00Z" },
  ];
  const line = rollupLine(weeklyRollup(rows, now));
  assert.match(line, /^7d /);
  assert.match(line, /avg 67%$/); // 2 occupied of 3 known
  assert.equal((line.match(/·/g) || []).length, 5, "five no-data days");
  assert.equal(rollupLine(weeklyRollup([], now)), "", "no data → no line");
});

test("committed stall-map: every lot8/field-149 stall has an in-bounds zone rect", () => {
  const map = JSON.parse(readFileSync(new URL("../src/data/stall-map.json", import.meta.url)));
  for (const [id, m] of Object.entries(map.stalls)) {
    if (m.rank !== "lot8" && m.rank !== "field-149") continue;
    const r = map.zoneRects[m.rank][m.index];
    assert.ok(r, id + " (index " + m.index + ") needs a zoneRects entry");
    assert.ok(r.x > 0 && r.y > 0 && r.w > 3 && r.h > 3, id + " rect degenerate");
    assert.ok(r.x + r.w < 1452 && r.y + r.h < 752, id + " rect outside the plan sheet");
  }
  // rects within a rank must not overlap (distinct stalls)
  for (const rank of ["lot8", "field-149"]) {
    const rects = Object.values(map.zoneRects[rank]);
    for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i], b = rects[j];
      const overlap = a.x < b.x + b.w - 0.01 && b.x < a.x + a.w - 0.01 &&
                      a.y < b.y + b.h - 0.01 && b.y < a.y + a.h - 0.01;
      assert.ok(!overlap, rank + " rects " + i + "/" + j + " overlap");
    }
  }
});

test("committed stall-map: 34 stalls, row56 indices unique and in range", () => {
  const map = JSON.parse(readFileSync(new URL("../src/data/stall-map.json", import.meta.url)));
  const entries = Object.entries(map.stalls);
  assert.equal(entries.length, 34);
  const row = entries.filter(([, m]) => m.rank === "row56");
  const idx = row.map(([, m]) => m.index);
  assert.equal(new Set(idx).size, idx.length, "row56 indices must be unique");
  assert.ok(idx.every(i => i >= 1 && i <= map.rowMeta.count));
  // zones file and map must agree on ids
  const zones = JSON.parse(readFileSync(new URL("../docs/c3-stall-zones.json", import.meta.url)));
  const zoneIds = Object.values(zones.cameras).flat().map(s => s.id).sort();
  assert.deepEqual(Object.keys(map.stalls).sort(), zoneIds);
});
