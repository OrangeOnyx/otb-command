/* Event-sourced compliance helpers (lib/compevents.js) — otb-ops harvest #3. */
import test from "node:test";
import assert from "node:assert/strict";
import { eventRow, describeEvent, STATE_WORDS } from "../src/lib/compevents.js";

test("eventRow shapes a real change and drops no-ops/malformed", () => {
  assert.deepEqual(eventRow({ unit: "131", field: "fire", from: "u", to: "ok" }),
    { unit: "131", field: "fire", old_state: "u", new_state: "ok" });
  assert.equal(eventRow({ unit: "131", field: "fire", from: "ok", to: "ok" }), null, "no-op");
  assert.equal(eventRow({ unit: "", field: "fire", from: "u", to: "ok" }), null, "no unit");
  assert.equal(eventRow({ unit: "131", field: "", from: "u", to: "ok" }), null, "no field");
  assert.equal(eventRow({ unit: "131", field: "fire", from: null, to: "ok" }), null, "no from");
});

test("describeEvent renders state words, field labels, and the actor", () => {
  const d = describeEvent(
    { unit: "149", field: "coi", old_state: "u", new_state: "ok", changed_by: "adam@adamabdalla.com", created_at: "2026-07-20T12:00:00Z" },
    { coi: "COI on file" });
  assert.equal(d.line, "149 · COI on file: unverified → on file");
  assert.equal(d.who, "adam");
  assert.ok(d.when.includes("Jul"));
});

test("describeEvent survives unknown states and missing timestamp", () => {
  const d = describeEvent({ unit: "101", field: "x", old_state: "weird", new_state: "ok" });
  assert.equal(d.line, "101 · x: weird → on file");
  assert.equal(d.when, "");
  assert.equal(d.who, "");
});

test("STATE_WORDS covers the four matrix states", () => {
  assert.deepEqual(Object.keys(STATE_WORDS).sort(), ["flag", "na", "ok", "u"]);
});
