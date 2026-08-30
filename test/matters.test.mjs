/* N-1 Matters — pure-half guard. Tests ONLY the fold/sort/id logic in
   src/lib/matters.js (matterDeadlines 30-day grace window + overdue flag,
   sortMatters ordering, deadlineTone, injectable id generator, vocabulary
   coverage of the schema CHECKs). No Supabase, no DOM — the REMOTE data
   layer is exercised in the app, not here. */
import test from "node:test";
import assert from "node:assert/strict";
import {
  MATTER_KINDS, MATTER_STATUS, newMatterId,
  matterDeadlines, sortMatters, deadlineTone,
  ATTACH_PREFIX, attachSummary, commDocLink,
} from "../src/lib/matters.js";
import { buildDocLink } from "../src/lib/docs.js";

const M = (id, over = {}) => ({
  id, title: "Matter " + id, kind: "general", status: "open",
  summary: "", next_deadline: null, next_deadline_note: "", ...over,
});

/* ---- vocabulary ---- */
test("matters: vocabulary covers every kind and status the schema allows", () => {
  for (const k of ["general", "zoning", "legal", "insurance", "capital", "governance", "leasing"])
    assert.ok(MATTER_KINDS[k], k);
  for (const s of ["open", "monitoring", "closed"]) assert.ok(MATTER_STATUS[s], s);
});

/* ---- T-1 deadline feed ---- */
test("matters: deadlines keep open+monitoring, drop closed and dateless", () => {
  const rows = matterDeadlines([
    M("a", { next_deadline: "2026-09-15" }),
    M("b", { status: "monitoring", next_deadline: "2026-09-01" }),
    M("c", { status: "closed", next_deadline: "2026-09-02" }),   // closed → out
    M("d"),                                                       // no date → out
    M("e", { next_deadline: "not-a-date" }),                      // invalid → out
  ], "2026-08-29");
  assert.deepEqual(rows.map(r => r.id), ["b", "a"]); // soonest first
});

test("matters: 30-day grace window — recent lapses stay, ancient ones age off", () => {
  const rows = matterDeadlines([
    M("edge", { next_deadline: "2026-07-30" }), // today − 30d exactly → in
    M("old", { next_deadline: "2026-07-29" }),  // 31 days back → out
    M("yday", { next_deadline: "2026-08-28" }),
    M("today", { next_deadline: "2026-08-29" }),
    M("soon", { next_deadline: "2026-09-10" }),
  ], "2026-08-29");
  assert.deepEqual(rows.map(r => r.id), ["edge", "yday", "today", "soon"]);
  assert.deepEqual(rows.map(r => r.overdue), [true, true, false, false]); // today ≠ overdue
});

test("matters: deadline rows carry id/title/kind/date/note", () => {
  const [r] = matterDeadlines(
    [M("x", { kind: "zoning", next_deadline: "2026-09-01", next_deadline_note: "variance hearing" })],
    "2026-08-29");
  assert.deepEqual(r, {
    id: "x", title: "Matter x", kind: "zoning",
    date: "2026-09-01", note: "variance hearing", overdue: false,
  });
});

/* ---- card ordering ---- */
test("matters: sort — open, monitoring, closed; deadline nulls-last then title", () => {
  const sorted = sortMatters([
    M("c1", { status: "closed", title: "Zed" }),
    M("o2", { next_deadline: "2026-12-01" }),
    M("m1", { status: "monitoring", next_deadline: "2026-09-01" }),
    M("o1", { next_deadline: "2026-09-15" }),
    M("o4", { title: "Bravo" }),  // no deadline → after dated opens
    M("o3", { title: "Alpha" }),  // no deadline, title before Bravo
  ]);
  assert.deepEqual(sorted.map(m => m.id), ["o1", "o2", "o3", "o4", "m1", "c1"]);
});

test("matters: sort does not mutate its input", () => {
  const input = [M("b", { status: "closed" }), M("a")];
  sortMatters(input);
  assert.deepEqual(input.map(m => m.id), ["b", "a"]);
});

/* ---- deadline tone (card color: brick overdue · brass ≤30d) ---- */
test("matters: deadlineTone — overdue / soon (≤30d incl. today) / later / null", () => {
  const t = "2026-08-29";
  assert.equal(deadlineTone("2026-08-28", t), "overdue");
  assert.equal(deadlineTone("2026-08-29", t), "soon");   // today counts as soon
  assert.equal(deadlineTone("2026-09-28", t), "soon");   // +30d boundary
  assert.equal(deadlineTone("2026-09-29", t), "later");
  assert.equal(deadlineTone(null, t), null);
  assert.equal(deadlineTone("garbage", t), null);
});

/* ---- N-2 v1.5 attachments (pure half; storage calls not tested here) ---- */
test("matters: commDocLink — path for doc-link bodies, null otherwise", () => {
  assert.equal(
    commDocLink({ body: buildDocLink("matter-mt1/abc__plat-rev9.pdf") }),
    "matter-mt1/abc__plat-rev9.pdf");
  assert.equal(commDocLink({ body: "doc://matter-mt2/x__handout.pdf" }), "matter-mt2/x__handout.pdf");
  assert.equal(commDocLink({ body: "Discussed the variance at the hearing." }), null); // prose
  assert.equal(commDocLink({ body: "https://drive.google.com/x" }), null); // external URL
  assert.equal(commDocLink({ body: "" }), null);
  assert.equal(commDocLink({ body: null }), null);
  assert.equal(commDocLink({}), null);     // row without a body column
  assert.equal(commDocLink(null), null);   // no row at all
});

test("matters: attachSummary carries the 'Attached: ' prefix + file name", () => {
  assert.equal(ATTACH_PREFIX, "Attached: ");
  assert.equal(attachSummary("plat-rev9.pdf"), "Attached: plat-rev9.pdf");
  assert.equal(attachSummary(""), "Attached: file"); // never a bare prefix
  const long = attachSummary("x".repeat(600));
  assert.ok(long.startsWith(ATTACH_PREFIX));
  assert.equal(long.length, 500); // comm_log summary cap
});

/* ---- id generator ---- */
test("matters: newMatterId is prefixed, deterministic under injection, unique-ish", () => {
  const a = newMatterId("mt", 1700000000000, 0.5);
  assert.equal(a, "mt" + (1700000000000).toString(36) + Math.floor(0.5 * 1e6).toString(36));
  assert.equal(newMatterId("mt", 1700000000000, 0.5), a); // deterministic
  assert.notEqual(newMatterId("mt", 1700000000001, 0.5), a);
  assert.ok(newMatterId("cm", 1700000000000, 0.5).startsWith("cm")); // meeting-note rows
  assert.ok(newMatterId().startsWith("mt")); // default prefix
});
