/* A-2 maintenance seam (src/lib/maintenance.js) — event-sourced derivation,
   W-1 card shaping, and the cron aging detector. */
import test from "node:test";
import assert from "node:assert/strict";
import { newRequestId, deriveRequest, describeMrEvent, mrCard, maintTriggerCandidates, MR_OPEN_STATES } from "../src/lib/maintenance.js";

const ROW = { id: "mr1", unit: "107", title: "AC not cooling", urgency: "urgent", created_at: "2026-07-20T14:00:00Z" };
const ev = (id, kind, extra) => ({ id, request_id: "mr1", kind, note: "", created_at: "2026-07-2" + id + "T10:00:00Z", ...extra });

test("newRequestId is deterministic in prefix and unique-ish", () => {
  assert.equal(newRequestId(0, 0), "mr00");
  assert.equal(newRequestId(1753280000000, 0.5).startsWith("mr"), true);
  assert.notEqual(newRequestId(), newRequestId());
});

test("deriveRequest: no events → open, unassigned", () => {
  const r = deriveRequest(ROW, []);
  assert.equal(r.status, "open");
  assert.equal(r.vendorId, null);
  assert.equal(r.displayStatus, "open");
  assert.equal(r.lastAt, ROW.created_at);
});

test("deriveRequest: assign folds into displayStatus, raw status stays open", () => {
  const r = deriveRequest(ROW, [ev(1, "assign", { vendor_id: "v-butcher" })]);
  assert.equal(r.status, "open");
  assert.equal(r.vendorId, "v-butcher");
  assert.equal(r.displayStatus, "assigned");
});

test("deriveRequest: latest status event wins; other requests' events ignored", () => {
  const r = deriveRequest(ROW, [
    ev(1, "assign", { vendor_id: "v-butcher" }),
    ev(2, "status", { status: "in_progress" }),
    ev(3, "status", { status: "done" }),
    { id: 9, request_id: "OTHER", kind: "status", status: "closed", created_at: "2026-07-29T10:00:00Z" },
  ]);
  assert.equal(r.status, "done");
  assert.equal(r.displayStatus, "done");
  assert.equal(r.events.length, 3);
  assert.equal(r.lastAt, "2026-07-23T10:00:00Z");
});

test("describeMrEvent renders status/assign/note lines with actor stem", () => {
  assert.equal(describeMrEvent(ev(1, "status", { status: "in_progress", actor: "adam@adamabdalla.com" })).line, "status → In Progress");
  assert.equal(describeMrEvent(ev(1, "status", { status: "in_progress", actor: "adam@adamabdalla.com" })).who, "adam");
  assert.equal(describeMrEvent(ev(1, "assign", { vendor_id: "v-b" }), { "v-b": "Butcher Air" }).line, "assigned to Butcher Air");
  assert.equal(describeMrEvent(ev(1, "note", { note: "parts ordered" })).line, "parts ordered");
});

test("mrCard: open → action lane; moving → progress; finished → null", () => {
  const open = mrCard(deriveRequest(ROW, []));
  assert.equal(open.lane, "action");
  assert.equal(open.id, "mr:mr1");
  assert.equal(open.kind, "maintenance");
  const assigned = mrCard(deriveRequest(ROW, [ev(1, "assign", { vendor_id: "v" })]));
  assert.equal(assigned.lane, "progress");
  const done = mrCard(deriveRequest(ROW, [ev(1, "status", { status: "done" })]));
  assert.equal(done, null);
  assert.deepEqual(MR_OPEN_STATES, ["open", "assigned", "in_progress"]);
});

test("maintTriggerCandidates: only aging unassigned-open rows fire", () => {
  const rows = [
    { id: "a", unit: "107", title: "AC", urgency: "routine", created_at: "2026-07-20T14:00:00Z", status: "open", vendor_id: null },
    { id: "b", unit: "109", title: "leak", urgency: "routine", created_at: "2026-07-22T14:00:00Z", status: "open", vendor_id: null }, // 1d — too fresh
    { id: "c", unit: "111", title: "sign", urgency: "routine", created_at: "2026-07-01T14:00:00Z", status: "open", vendor_id: "v-x" }, // assigned
    { id: "d", unit: "113", title: "fire", urgency: "emergency", created_at: "2026-07-22T14:00:00Z", status: "open", vendor_id: null }, // emergency 1d fires
    { id: "e", unit: "115", title: "old", urgency: "routine", created_at: "2026-07-01T14:00:00Z", status: "in_progress", vendor_id: null }, // moving
  ];
  const out = maintTriggerCandidates(rows, "2026-07-23");
  assert.deepEqual(out.map(c => c.triggerSource).sort(), ["maint:a", "maint:d"]);
  assert.equal(out.every(c => c.agent === "manager"), true);
  assert.equal(out[0].detail.includes("unit 107"), true);
  assert.deepEqual(maintTriggerCandidates([], "2026-07-23"), []);
  assert.deepEqual(maintTriggerCandidates(null, "2026-07-23"), []);
});
