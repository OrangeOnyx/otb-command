import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  detectHoldovers, detectRenewalHorizon, detectOccupancy,
  buildOwnerBrief, collectCandidates, monthLabel,
} from "../src/lib/autotrigger.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const seed = JSON.parse(readFileSync(join(root, "src/data/units.public.json"), "utf8"));
const units = seed.units || seed;

const mk = (unit, status, end, sf = 1000, dba = "T" + unit) => ({ unit, status, end, sf, dba });

test("holdover: expired active lease trips; vacant/owner/future do not", () => {
  const out = detectHoldovers([
    mk("11", "active", "2026-06-30"),
    mk("12", "active", "2026-08-31"),
    mk("13", "vacant", ""),
    mk("14", "owner", "2020-01-01"),
  ], "2026-07-16");
  assert.equal(out.length, 1);
  assert.equal(out[0].triggerSource, "holdover:11:2026-06-30");
  assert.equal(out[0].agent, "leasing");
});

test("renewal horizon: inside 180d in, boundary in, outside out, expired out", () => {
  const out = detectRenewalHorizon([
    mk("21", "active", "2026-09-01"),   // inside
    mk("22", "anchor", "2027-01-12"),   // boundary: today+180
    mk("23", "active", "2027-01-13"),   // one day past horizon
    mk("24", "active", "2026-07-15"),   // already expired → holdover's job
  ], "2026-07-16");
  assert.deepEqual(out.map(c => c.triggerSource),
    ["renewal:21:2026-09-01", "renewal:22:2027-01-12"]);
});

test("occupancy: SF-weighted floor, month-keyed source", () => {
  const low = [mk("1", "active", "2027-01-01", 1000), mk("2", "vacant", "", 9000)];
  const out = detectOccupancy(low, "2026-07-16");
  assert.equal(out.length, 1);
  assert.equal(out[0].triggerSource, "occupancy:2026-07");
  assert.match(out[0].detail, /10\.0%/);
  // healthy set → no candidate
  assert.equal(detectOccupancy([mk("1", "active", "2027-01-01", 9000), mk("2", "vacant", "", 500)], "2026-07-16").length, 0);
});

test("owner brief: month-keyed, income from private map, leased-only", () => {
  const u = [mk("1", "active", "2027-03-31", 2000), mk("2", "owner", "", 1000), mk("3", "vacant", "", 500)];
  const priv = { 1: { monthly: 1234.5 }, 2: { monthly: 999 } }; // owner unit income must NOT count
  const b = buildOwnerBrief(u, priv, "2026-07-16");
  assert.equal(b.triggerSource, "brief:2026-07");
  assert.equal(b.agent, "concierge");
  assert.match(b.detail, /\$1,234\.50/);
  assert.match(b.detail, /2 of 3 units/);
  assert.match(b.detail, /85\.7% of GLA/);
  assert.match(b.detail, /1 \(T1\) 2027-03-31/);
});

test("monthLabel renders the brief month", () => {
  assert.equal(monthLabel("2026-07-16"), "July 2026");
  assert.equal(monthLabel("2026-12-01"), "December 2026");
});

test("REGRESSION — real seed today: two live renewal windows (115/117 @ 9/30/26) + the brief", () => {
  // SOT reconciled 2026-07-16: zero holdovers, occupancy 25/27; Clothing Loft
  // Exchange (115+117 combined) expires 2026-09-30 — inside 180d as of today.
  const out = collectCandidates(units, {}, "2026-07-16");
  assert.deepEqual(out.map(c => c.triggerSource).sort(),
    ["brief:2026-07", "renewal:115:2026-09-30", "renewal:117:2026-09-30"]);
  const brief = out.find(c => c.kind === "brief");
  assert.match(brief.detail, /Holdovers:\*\* none/);
  assert.match(brief.detail, /131 \(1,907 SF\)/);
});

test("REGRESSION — renewal window arms itself: 119 (2/28/27) enters at 180d", () => {
  const out = detectRenewalHorizon(units, "2026-09-02"); // 2027-02-28 within 180d of this date
  assert.ok(out.some(c => c.triggerSource.startsWith("renewal:119:")), "119 should be in window by 2026-09-02");
});
