/* L-1 Comm Log — pure-half guards (lib/comms.js above the REMOTE banner).
   What this protects: the channel vocabulary the sheet's chips are built
   from; filterComms semantics (exact channel, case-blind substring unit,
   case-blind q over summary/contact_name/body); the commLine display model
   the list rows render verbatim (when slice, chip label, direction arrow +
   who fallback chain, unit/source tags); newCommId determinism under
   injected now/rnd; and validChannel's fall-back-to-note rule that keeps a
   bad channel string from ever reaching the DB check constraint. */
import test from "node:test";
import assert from "node:assert/strict";
import { CHANNELS, validChannel, newCommId, filterComms, commLine } from "../src/lib/comms.js";

/* ---- vocabulary ---- */
test("comms: CHANNELS covers every channel the schema allows", () => {
  for (const c of ["voice", "sms", "email", "letter", "note", "meeting"])
    assert.ok(CHANNELS[c], c);
  assert.equal(Object.keys(CHANNELS).length, 6);
});

test("comms: validChannel passes known channels and falls back to note", () => {
  assert.equal(validChannel("voice"), "voice");
  assert.equal(validChannel("sms"), "sms");
  assert.equal(validChannel("fax"), "note");
  assert.equal(validChannel(""), "note");
  assert.equal(validChannel(undefined), "note");
});

/* ---- id generator ---- */
test("comms: newCommId is deterministic under injected now/rnd and cm-prefixed", () => {
  const a = newCommId(1700000000000, 0.5);
  assert.equal(a, newCommId(1700000000000, 0.5)); // same inputs → same id
  assert.ok(a.startsWith("cm"));
  assert.equal(a, "cm" + (1700000000000).toString(36) + Math.floor(0.5 * 1e6).toString(36));
  assert.notEqual(a, newCommId(1700000000001, 0.5)); // clock moves → new id
  assert.notEqual(a, newCommId(1700000000000, 0.25)); // rnd moves → new id
});

/* ---- filterComms ---- */
const ROWS = [
  { id: "r1", channel: "voice", unit: "129", summary: "HVAC complaint", contact_name: "Jane Wolf", body: "unit hot since Tuesday", source: "ac" },
  { id: "r2", channel: "email", unit: "119.5", summary: "Renewal terms", contact_name: "Cat Clinic", body: "" },
  { id: "r3", channel: "note", unit: null, summary: "Walked the field", contact_name: "", body: "pylon flicker on panel 3" },
  { id: "r4", channel: "sms", unit: "129", summary: "Follow-up sent", contact_name: "HotWorx mgr", body: null },
];

test("comms: filterComms channel is exact-match, empty channel passes all", () => {
  assert.deepEqual(filterComms(ROWS, { channel: "voice" }).map(r => r.id), ["r1"]);
  assert.deepEqual(filterComms(ROWS, { channel: "" }).map(r => r.id), ["r1", "r2", "r3", "r4"]);
  assert.deepEqual(filterComms(ROWS, {}), ROWS);
  assert.deepEqual(filterComms(ROWS), ROWS); // no spec at all
  assert.deepEqual(filterComms(null, { channel: "voice" }), []); // null rows fail soft
});

test("comms: filterComms unit is case-blind substring; null units never match a unit filter", () => {
  assert.deepEqual(filterComms(ROWS, { unit: "129" }).map(r => r.id), ["r1", "r4"]);
  assert.deepEqual(filterComms(ROWS, { unit: "119" }).map(r => r.id), ["r2"]); // prefix hits 119.5
  assert.deepEqual(filterComms(ROWS, { unit: "999" }), []);
  assert.deepEqual(filterComms(ROWS, { unit: "  " }).map(r => r.id), ["r1", "r2", "r3", "r4"]); // whitespace = no filter
});

test("comms: filterComms q searches summary + contact_name + body, case-blind", () => {
  assert.deepEqual(filterComms(ROWS, { q: "hvac" }).map(r => r.id), ["r1"]); // summary
  assert.deepEqual(filterComms(ROWS, { q: "CAT CLINIC" }).map(r => r.id), ["r2"]); // contact_name
  assert.deepEqual(filterComms(ROWS, { q: "Pylon" }).map(r => r.id), ["r3"]); // body
  assert.deepEqual(filterComms(ROWS, { q: "zebra" }), []);
  // null body/name fields never throw, never match
  assert.deepEqual(filterComms(ROWS, { q: "null" }), []);
});

test("comms: filterComms composes channel + unit + q with AND semantics", () => {
  assert.deepEqual(filterComms(ROWS, { channel: "voice", unit: "129", q: "tuesday" }).map(r => r.id), ["r1"]);
  assert.deepEqual(filterComms(ROWS, { channel: "sms", unit: "129", q: "tuesday" }), []);
});

/* ---- commLine display model ---- */
test("comms: commLine shapes a full row — when slice, chip, arrowed who, tags", () => {
  const L = commLine({
    id: "r1", at: "2026-08-29T14:05:33.120+00:00", channel: "voice", direction: "in",
    contact_name: "Jane Wolf", summary: "HVAC complaint", unit: "129", source: "ac",
  });
  assert.deepEqual(L, {
    when: "2026-08-29 14:05",
    chip: "📞 Voice",
    who: "← Jane Wolf",
    summary: "HVAC complaint",
    unitTag: "Unit 129",
    sourceTag: "AC",
  });
});

test("comms: commLine who — direction arrows and name→email→phone→dash fallback", () => {
  assert.equal(commLine({ direction: "out", contact_name: "Butcher AC" }).who, "→ Butcher AC");
  assert.equal(commLine({ direction: "", contact_email: "x@y.com" }).who, "x@y.com");
  assert.equal(commLine({ contact_phone: "337-555-0100" }).who, "337-555-0100");
  assert.equal(commLine({}).who, "—");
});

test("comms: commLine degrades — unknown channel chips as note, empty fields go blank", () => {
  const L = commLine({ channel: "fax", at: null, unit: null, source: "app" });
  assert.equal(L.chip, "📝 Note"); // validChannel fallback rides through the chip
  assert.equal(L.when, "");
  assert.equal(L.unitTag, "");
  assert.equal(L.sourceTag, ""); // only source='ac' tags
  assert.equal(L.summary, "");
  assert.equal(commLine(null).who, "—"); // null row never throws
});
