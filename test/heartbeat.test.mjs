import test from "node:test";
import assert from "node:assert/strict";
import { heartbeatKpi, hoursSince, HEARTBEAT_STALE_HOURS } from "../src/lib/heartbeat.js";

const NOW = Date.parse("2026-08-04T18:00:00Z");
const iso = hoursAgo => new Date(NOW - hoursAgo * 3600e3).toISOString();

test("fresh heartbeat → green OK with age + scan line", () => {
  const k = heartbeatKpi({ ran_at: iso(7), summary: { scanned: 4, opened: 1 } }, NOW);
  assert.equal(k[0], "green");
  assert.equal(k[2], "OK");
  assert.ok(k[3].includes("7h ago"));
  assert.ok(k[3].includes("4 candidates"));
  assert.ok(k[3].includes("1 opened"));
});

test("stale past 26h → brick STALE naming the blast radius", () => {
  const k = heartbeatKpi({ ran_at: iso(HEARTBEAT_STALE_HOURS + 1), summary: {} }, NOW);
  assert.equal(k[0], "brick");
  assert.equal(k[2], "STALE");
  assert.ok(k[3].includes("cron silent"));
});

test("sub-hour age reads in minutes; singular candidate", () => {
  const k = heartbeatKpi({ ran_at: iso(0.5), summary: { scanned: 1, opened: 0 } }, NOW);
  assert.ok(k[3].includes("30m ago"));
  assert.ok(k[3].includes("1 candidate ·"));
});

test("missing row / bad timestamp → null (card doesn't render)", () => {
  assert.equal(heartbeatKpi(null, NOW), null);
  assert.equal(heartbeatKpi({ ran_at: "garbage" }, NOW), null);
  assert.equal(heartbeatKpi({}, NOW), null);
});

test("hoursSince clamps future timestamps to 0", () => {
  assert.equal(hoursSince(iso(-2), NOW), 0);
});
