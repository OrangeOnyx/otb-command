import test from "node:test";
import assert from "node:assert/strict";
import {
  nextTourSlots, slotLabel, isBusinessHours, speechify, normalizePhone,
  tenantPersona, leasingPersona, MAINT_TOOL, TOUR_TOOL,
  DEFAULT_TOUR_WINDOWS, MAX_TURNS,
} from "../src/lib/voiceagent.js";
import sop from "../src/data/sop.json" with { type: "json" };

/* 2026-07-24 is a Friday. Wall-clock ms built with Date.UTC (the seam's contract). */
const FRI_9AM = Date.UTC(2026, 6, 24, 9, 0);

test("nextTourSlots: honors lead time, window order, and count", () => {
  const slots = nextTourSlots(DEFAULT_TOUR_WINDOWS, FRI_9AM, 5);
  assert.equal(slots.length, 5);
  // Friday 9 AM + 18h lead → Saturday 3 AM; first window is Tuesday the 28th
  assert.equal(slots[0].key, "2026-07-28T10:00");
  assert.equal(slots[1].key, "2026-07-28T10:30");
  // 30-min pitch stays inside the 10–12 and 14–16 windows
  assert.ok(slots.every(s => /T(1[014]|15):(00|30)$/.test(s.key)));
});

test("nextTourSlots: skips booked keys and crosses to the next week when full", () => {
  const tue = ["10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30"]
    .map(t => "2026-07-28T" + t);
  const thu = ["10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30"]
    .map(t => "2026-07-30T" + t);
  const slots = nextTourSlots(DEFAULT_TOUR_WINDOWS, FRI_9AM, 3, [...tue, ...thu]);
  assert.equal(slots[0].key, "2026-08-04T10:00"); // following Tuesday
});

test("nextTourSlots: same-day slots inside the lead window are excluded", () => {
  // Tuesday 28th at 9:50 AM local — 10:00 slot is 10 min away, well under 18h
  const slots = nextTourSlots(DEFAULT_TOUR_WINDOWS, Date.UTC(2026, 6, 28, 9, 50), 1);
  assert.equal(slots[0].key, "2026-07-30T10:00");
});

test("slotLabel speaks a slot key", () => {
  assert.equal(slotLabel("2026-07-28T10:00"), "Tuesday, July 28 at 10:00 AM");
  assert.equal(slotLabel("2026-07-30T14:30"), "Thursday, July 30 at 2:30 PM");
});

test("isBusinessHours: Mon–Sat 8–17", () => {
  assert.ok(isBusinessHours(Date.UTC(2026, 6, 24, 9, 0)));    // Fri 9 AM
  assert.ok(!isBusinessHours(Date.UTC(2026, 6, 24, 17, 0)));  // Fri 5 PM sharp = closed
  assert.ok(!isBusinessHours(Date.UTC(2026, 6, 26, 10, 0)));  // Sunday
  assert.ok(isBusinessHours(Date.UTC(2026, 6, 25, 8, 0)));    // Sat 8 AM
});

test("speechify strips markup, cards, and urls; caps length at a sentence", () => {
  assert.equal(speechify("**Bold** and [[brief:2026-07|July]] and https://x.co/y."),
    "Bold and and the link.");
  const long = ("A sentence here. ").repeat(200);
  const out = speechify(long);
  assert.ok(out.length <= 900);
  assert.ok(out.endsWith("."));
});

test("normalizePhone", () => {
  assert.equal(normalizePhone("+1 (337) 769-1554"), "3377691554");
  assert.equal(normalizePhone("337.769.1554"), "3377691554");
  assert.equal(normalizePhone("12345"), "");
});

test("tenant persona carries the SOP red lines and roster", () => {
  const p = tenantPersona(sop, { nowLine: "Friday 9 AM" });
  assert.ok(p.includes("NEVER state or imply any eviction step"));
  assert.ok(p.includes("Butcher Air Conditioning"));
  assert.ok(p.includes("electronic only"));
  assert.ok(p.includes("sewer backup"));
  assert.ok(p.includes("police report"));
  assert.ok(!p.includes("undefined"));
});

test("leasing persona: range language, exclusivity-only screen, slots verbatim", () => {
  const slots = [{ key: "2026-07-28T10:00", label: "Tuesday, July 28 at 10:00 AM" }];
  const p = leasingPersona(sop, { nowLine: "Friday 9 AM", slots });
  assert.ok(p.includes("high teens per square foot"));
  assert.ok(p.includes("HotWorx"));
  assert.ok(p.includes("2026-07-28T10:00 = Tuesday, July 28 at 10:00 AM"));
  assert.ok(p.includes("Do not screen anything else"));
  assert.ok(!p.includes("undefined"));
  // no slots → callback fallback, never an empty offer
  assert.ok(leasingPersona(sop, {}).includes("take a callback instead"));
});

test("tool schemas are well-formed", () => {
  for (const t of [MAINT_TOOL, TOUR_TOOL]) {
    assert.ok(t.name && t.input_schema?.type === "object");
    assert.ok(Array.isArray(t.input_schema.required));
    for (const r of t.input_schema.required) assert.ok(t.input_schema.properties[r]);
  }
  assert.deepEqual(MAINT_TOOL.input_schema.properties.urgency.enum,
    ["emergency", "urgent", "routine"]);
  assert.ok(MAX_TURNS > 4);
});
