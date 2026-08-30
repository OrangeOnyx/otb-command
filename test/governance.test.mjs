/* S-1 Governance — pure-half guard. Tests ONLY the fold/sort/anniversary/id
   logic in src/lib/governance.js (govDeadlines 30-day grace window + overdue
   flag + satisfied/waived exclusion, sortGov ordering, nextAnnual year math,
   injectable id generator, kind/status validation fallbacks, vocabulary
   coverage of the schema CHECKs). No Supabase, no DOM — the REMOTE data
   layer is exercised in the app, not here. Boundary reminder: these are
   OPERATOR-ENTERED records; audit-grade instrument facts stay in facts.js
   and are never seeded or mirrored here. */
import test from "node:test";
import assert from "node:assert/strict";
import {
  GOV_KINDS, GOV_STATUS, validGovKind, validGovStatus, newGovId,
  govDeadlines, sortGov, nextAnnual,
} from "../src/lib/governance.js";

const G = (id, over = {}) => ({
  id, title: "Item " + id, kind: "record", status: "open",
  entity: "", ref: "", due_on: null, recurring: "", notes: "", ...over,
});

/* ---- vocabulary ---- */
test("governance: vocabulary covers every kind and status the schema allows", () => {
  for (const k of ["entity", "covenant", "deadline", "record"]) assert.ok(GOV_KINDS[k], k);
  for (const s of ["open", "satisfied", "waived"]) assert.ok(GOV_STATUS[s], s);
});

/* ---- T-1 deadline feed ---- */
test("governance: deadlines keep open only — satisfied/waived/dateless drop out", () => {
  const rows = govDeadlines([
    G("a", { due_on: "2026-09-15" }),
    G("b", { due_on: "2026-09-01" }),
    G("c", { status: "satisfied", due_on: "2026-09-02" }), // satisfied → out
    G("d", { status: "waived", due_on: "2026-09-03" }),    // waived → out
    G("e"),                                                 // no date → out
    G("f", { due_on: "not-a-date" }),                       // invalid → out
  ], "2026-08-29");
  assert.deepEqual(rows.map(r => r.id), ["b", "a"]); // soonest first
});

test("governance: 30-day grace window — recent lapses stay, ancient ones age off", () => {
  const rows = govDeadlines([
    G("edge", { due_on: "2026-07-30" }), // today − 30d exactly → in
    G("old", { due_on: "2026-07-29" }),  // 31 days back → out
    G("yday", { due_on: "2026-08-28" }),
    G("today", { due_on: "2026-08-29" }),
    G("soon", { due_on: "2026-09-10" }),
  ], "2026-08-29");
  assert.deepEqual(rows.map(r => r.id), ["edge", "yday", "today", "soon"]);
  assert.deepEqual(rows.map(r => r.overdue), [true, true, false, false]); // today ≠ overdue
});

test("governance: deadline rows carry id/title/entity/ref/date/kind/overdue", () => {
  const [r] = govDeadlines(
    [G("x", { kind: "entity", entity: "Belle Realty of Lafayette, LLC", ref: "SOS #123", due_on: "2026-09-01" })],
    "2026-08-29");
  assert.deepEqual(r, {
    id: "x", title: "Item x", entity: "Belle Realty of Lafayette, LLC",
    ref: "SOS #123", date: "2026-09-01", kind: "entity", overdue: false,
  });
});

/* ---- list ordering ---- */
test("governance: sort — open, satisfied, waived; due nulls-last then title", () => {
  const sorted = sortGov([
    G("w1", { status: "waived", title: "Zed" }),
    G("o2", { due_on: "2026-12-01" }),
    G("s1", { status: "satisfied", due_on: "2026-09-01" }),
    G("o1", { due_on: "2026-09-15" }),
    G("o4", { title: "Bravo" }),  // no due → after dated opens
    G("o3", { title: "Alpha" }),  // no due, title before Bravo
  ]);
  assert.deepEqual(sorted.map(g => g.id), ["o1", "o2", "o3", "o4", "s1", "w1"]);
});

test("governance: sort does not mutate its input", () => {
  const input = [G("b", { status: "waived" }), G("a")];
  sortGov(input);
  assert.deepEqual(input.map(g => g.id), ["b", "a"]);
});

/* ---- nextAnnual (recurring 'annual' display math) ---- */
test("governance: nextAnnual — future or today's due IS the next occurrence", () => {
  assert.equal(nextAnnual("2026-11-01", "2026-08-29"), "2026-11-01");
  assert.equal(nextAnnual("2026-08-29", "2026-08-29"), "2026-08-29");
});

test("governance: nextAnnual — passed due rolls to the anniversary ahead", () => {
  // anniversary later this year still ahead → this year
  assert.equal(nextAnnual("2024-11-01", "2026-08-29"), "2026-11-01");
  // passed this year (and any prior year) → next year
  assert.equal(nextAnnual("2026-03-01", "2026-08-29"), "2027-03-01");
  assert.equal(nextAnnual("2020-05-15", "2026-08-29"), "2027-05-15");
  // anniversary today counts as the next occurrence, not a bump
  assert.equal(nextAnnual("2025-08-29", "2026-08-29"), "2026-08-29");
});

test("governance: nextAnnual — invalid inputs return null", () => {
  assert.equal(nextAnnual(null, "2026-08-29"), null);
  assert.equal(nextAnnual("garbage", "2026-08-29"), null);
  assert.equal(nextAnnual("2026-01-01", "nope"), null);
});

/* ---- id generator ---- */
test("governance: newGovId is gv-prefixed and deterministic under injection", () => {
  const a = newGovId(1700000000000, 0.5);
  assert.equal(a, "gv" + (1700000000000).toString(36) + Math.floor(0.5 * 1e6).toString(36));
  assert.equal(newGovId(1700000000000, 0.5), a); // deterministic
  assert.notEqual(newGovId(1700000000001, 0.5), a);
  assert.ok(newGovId().startsWith("gv"));
});

/* ---- kind/status validation fallbacks ---- */
test("governance: validGovKind/validGovStatus pass valid keys, fall back safely", () => {
  for (const k of Object.keys(GOV_KINDS)) assert.equal(validGovKind(k), k);
  assert.equal(validGovKind("bogus"), "record");
  assert.equal(validGovKind(undefined), "record");
  for (const s of Object.keys(GOV_STATUS)) assert.equal(validGovStatus(s), s);
  assert.equal(validGovStatus("junk"), "open");
  assert.equal(validGovStatus(null), "open");
});
