import test from "node:test";
import assert from "node:assert/strict";
import {
  SOP_FREQ, SOP_STATUS, periodFor, dueEndFor, sopOccurrenceId, newSopId,
  foldCompletions, deriveOccurrence, sopNewOccurrences, sopOverdueCandidate, sopStreak,
} from "../src/lib/sop.js";

/* ---- period math ---- */
test("sop: period ends per frequency (UTC ymd)", () => {
  assert.deepEqual(periodFor("daily", "2026-08-25"), { start: "2026-08-25", end: "2026-08-25" });
  // 2026-08-25 is a Tuesday → Mon 08-24 .. Sun 08-30
  assert.deepEqual(periodFor("weekly", "2026-08-25"), { start: "2026-08-24", end: "2026-08-30" });
  assert.equal(dueEndFor("monthly", "2026-08-25"), "2026-08-31");
  assert.equal(dueEndFor("monthly", "2028-02-15"), "2028-02-29"); // leap
  assert.equal(dueEndFor("quarterly", "2026-08-25"), "2026-09-30");
  assert.equal(dueEndFor("quarterly", "2026-11-01"), "2026-12-31");
  assert.deepEqual(periodFor("annually", "2026-08-25"), { start: "2026-01-01", end: "2026-12-31" });
  assert.equal(periodFor("as_needed", "2026-08-25"), null);
  assert.equal(periodFor("bogus", "2026-08-25"), null);
});

test("sop: biweekly blocks anchor to epoch Monday 1970-01-05 (week 0 even)", () => {
  assert.deepEqual(periodFor("biweekly", "1970-01-05"), { start: "1970-01-05", end: "1970-01-18" });
  assert.deepEqual(periodFor("biweekly", "1970-01-18"), { start: "1970-01-05", end: "1970-01-18" });
  assert.deepEqual(periodFor("biweekly", "1970-01-19"), { start: "1970-01-19", end: "1970-02-01" });
  // block is stable: any day inside maps to the same end, ends are Sundays
  const p = periodFor("biweekly", "2026-08-25");
  assert.equal(dueEndFor("biweekly", p.start), p.end);
  assert.equal(dueEndFor("biweekly", p.end), p.end);
  assert.equal(new Date(p.end + "T00:00:00Z").getUTCDay(), 0);
});

test("sop: vocabulary covers every frequency and status the schema allows", () => {
  for (const f of ["daily", "weekly", "biweekly", "monthly", "quarterly", "annually", "as_needed"])
    assert.ok(SOP_FREQ[f], f);
  for (const s of ["completed", "due", "overdue", "pending"]) assert.ok(SOP_STATUS[s], s);
});

/* ---- derivation ---- */
test("sop: occurrence status derives from completion link + date, never a stored enum", () => {
  const t = "2026-08-25";
  assert.equal(deriveOccurrence({ due_on: "2026-08-24", done: true }, t), "completed");
  assert.equal(deriveOccurrence({ due_on: "2026-08-24", done: false }, t), "overdue");
  assert.equal(deriveOccurrence({ due_on: "2026-08-25", done: false }, t), "due");
  assert.equal(deriveOccurrence({ due_on: "2026-08-26", done: false }, t), "pending");
});

test("sop: foldCompletions marks linked occurrences done, keeps prior done, ignores ad-hoc", () => {
  const occ = [{ id: "a1", due_on: "2026-08-01" }, { id: "a2", due_on: "2026-08-08", done: true }, { id: "a3", due_on: "2026-08-15" }];
  const folded = foldCompletions(occ, [
    { id: "c1", assignment_id: "a1" },
    { id: "c2", assignment_id: null }, // ad-hoc completion links nothing
  ]);
  assert.deepEqual(folded.map(o => o.done), [true, true, false]);
});

/* ---- materializer ---- */
const proc = (id, frequency, over = {}) => ({ id, title: "P " + id, frequency, assignee: "", is_active: true, ...over });

test("sop: materializer emits the current period once per scheduled procedure", () => {
  const rows = sopNewOccurrences(
    [proc("p1", "daily"), proc("p2", "monthly"), proc("p3", "as_needed"), proc("p4", "weekly", { is_active: false })],
    [], "2026-08-25");
  assert.deepEqual(rows, [
    { id: "sa:p1:2026-08-25", procedure_id: "p1", assignee: "", due_on: "2026-08-25" },
    { id: "sa:p2:2026-08-31", procedure_id: "p2", assignee: "", due_on: "2026-08-31" },
  ]);
  assert.equal(rows[0].id, sopOccurrenceId("p1", "2026-08-25"));
});

test("sop: coverage is period-based — an imported AC occurrence with a foreign id covers", () => {
  const occ = [{ id: "ac-legacy-uuid", procedure_id: "p2", due_on: "2026-08-31" }];
  assert.deepEqual(sopNewOccurrences([proc("p2", "monthly")], occ, "2026-08-25"), []);
  // mid-period due date covers too (AC dated some occurrences inside the month)
  const mid = [{ id: "x", procedure_id: "p2", due_on: "2026-08-07" }];
  assert.deepEqual(sopNewOccurrences([proc("p2", "monthly")], mid, "2026-08-25"), []);
  // last month's occurrence does NOT cover this month
  const old = [{ id: "y", procedure_id: "p2", due_on: "2026-07-31" }];
  assert.equal(sopNewOccurrences([proc("p2", "monthly")], old, "2026-08-25").length, 1);
});

test("sop: materializer is idempotent against its own output and carries the assignee", () => {
  const procs = [proc("p1", "weekly", { assignee: "adam@adamabdalla.com" })];
  const first = sopNewOccurrences(procs, [], "2026-08-25");
  assert.equal(first[0].assignee, "adam@adamabdalla.com");
  assert.deepEqual(sopNewOccurrences(procs, first, "2026-08-25"), []);
  assert.deepEqual(sopNewOccurrences(procs, first, "2026-08-30"), []); // same week
  assert.equal(sopNewOccurrences(procs, first, "2026-08-31").length, 1); // next week
});

/* ---- overdue digest ---- */
test("sop: digest fires once per lapse wave, keyed by the newest overdue due date", () => {
  const procs = [proc("p1", "daily", { title: "Walk the field" }), proc("p2", "monthly", { title: "Test pylon" })];
  const occ = [
    { id: "a1", procedure_id: "p1", due_on: "2026-08-20", done: false },
    { id: "a2", procedure_id: "p1", due_on: "2026-08-23", done: false },
    { id: "a3", procedure_id: "p2", due_on: "2026-08-24", done: false },
    { id: "a4", procedure_id: "p1", due_on: "2026-08-25", done: false }, // due today ≠ overdue
    { id: "a5", procedure_id: "p2", due_on: "2026-08-22", done: true },  // completed never listed
  ];
  const c = sopOverdueCandidate(procs, occ, "2026-08-25");
  assert.equal(c.agent, "manager");
  assert.equal(c.triggerSource, "sop-overdue:2026-08-24");
  assert.equal(c.title, "SOPs overdue — 2 procedures");
  assert.match(c.detail, /3 scheduled SOP occurrences are overdue/);
  assert.match(c.detail, /Walk the field — due 2026-08-20/);
  assert.match(c.detail, /Test pylon — due 2026-08-24/);
  assert.match(c.detail, /O-1 Operations/);
  // static backlog → same key (no re-fire); a new lapse moves the key
  assert.equal(sopOverdueCandidate(procs, occ, "2026-08-26").triggerSource, "sop-overdue:2026-08-25");
});

test("sop: digest is null when clean and truncates a long backlog", () => {
  assert.equal(sopOverdueCandidate([], [], "2026-08-25"), null);
  const done = [{ id: "a", procedure_id: "p", due_on: "2026-08-01", done: true }];
  assert.equal(sopOverdueCandidate([], done, "2026-08-25"), null);
  const many = Array.from({ length: 20 }, (_, i) => ({
    id: "a" + i, procedure_id: "p" + i, due_on: "2026-08-0" + ((i % 9) + 1), done: false }));
  const c = sopOverdueCandidate([], many, "2026-08-25", { max: 15 });
  assert.match(c.detail, /…and 5 more/);
});

/* ---- streaks ---- */
test("sop: streak counts consecutive completed, skips still-open, breaks on a miss", () => {
  const occ = [
    { id: "a1", procedure_id: "p1", due_on: "2026-08-18", done: false }, // the break
    { id: "a2", procedure_id: "p1", due_on: "2026-08-19", done: true },
    { id: "a3", procedure_id: "p1", due_on: "2026-08-20", done: true },
    { id: "a4", procedure_id: "p1", due_on: "2026-08-25", done: false }, // due today, open — skip
    { id: "zz", procedure_id: "p2", due_on: "2026-08-21", done: false }, // other procedure
  ];
  assert.equal(sopStreak("p1", occ, "2026-08-25"), 2);
  assert.equal(sopStreak("p2", occ, "2026-08-25"), 0);
  assert.equal(sopStreak("p3", occ, "2026-08-25"), 0);
});

test("sop: newSopId is prefixed and unique-ish", () => {
  const a = newSopId("sc", 1700000000000, 0.5), b = newSopId("sc", 1700000000001, 0.5);
  assert.ok(a.startsWith("sc"));
  assert.notEqual(a, b);
});
