import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { latestByStall, occSummary, rowStallRect, rowOverlay, occLine } from "../src/lib/occupancy.js";

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
