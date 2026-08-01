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

/* ---- queue #1: truthful booking (2026-08-01) ---- */
import { claimsBooking, BOOKING_GUARD_NOTE, BOOKING_FALLBACK } from "../src/lib/voiceagent.js";

test("claimsBooking: catches unbacked booking-claim language", () => {
  for (const s of [
    "Perfect, you're locked in for Tuesday at 10.",
    "I've booked you for Thursday at 2 PM.",
    "You're all set for the tour!",
    "Your tour is confirmed for Tuesday.",
    "I have you scheduled for Thursday, and Adam will meet you there.",
    "That slot is reserved for you.",
    "Great — I penciled you in for Tuesday morning.",
    "You are booked. See you then.",
  ]) assert.ok(claimsBooking(s), "should claim: " + s);
});

test("claimsBooking: ignores offers, questions, negations, and futures", () => {
  for (const s of [
    "Would you like to book a tour?",
    "Let me confirm your callback number.",
    "I can get you booked for Tuesday if that works.",
    "Once that's booked, Adam will reach out.",
    "Nothing is booked until you hear from Adam.",
    "That's not confirmed yet — Adam will call you.",
    "I haven't booked anything yet; what time suits you?",
    "It will be confirmed by Adam shortly.",
    "We can schedule a time that works for you.",
    "Which slot should I reserve for you?",
  ]) assert.ok(!claimsBooking(s), "should NOT claim: " + s);
});

test("claimsBooking: empty and junk are not claims", () => {
  assert.ok(!claimsBooking(""));
  assert.ok(!claimsBooking(null));
  assert.ok(!claimsBooking("Thanks for calling On The Boulevard."));
});

test("leasing persona: truth rule wired in", () => {
  const p = leasingPersona(sop, { nowLine: "Friday 9 AM", slots: [] });
  assert.ok(p.includes("ok:true"), "persona names the ok:true contract");
  assert.ok(/never say or imply/i.test(p), "persona bans claim language");
  assert.ok(/the (?:moment|instant) you have/i.test(p), "persona forces immediate book_tour");
});

test("booking guard constants are speakable and non-empty", () => {
  assert.ok(BOOKING_GUARD_NOTE.length > 50);
  assert.ok(BOOKING_FALLBACK.length > 30);
  // fallback goes straight to TTS — must survive speechify unchanged
  assert.equal(speechify(BOOKING_FALLBACK), BOOKING_FALLBACK);
  assert.ok(!/[*_#`>|\[\]]/.test(BOOKING_FALLBACK));
});

/* ---- queue #2: unbooked-lead safety net (2026-08-01) ---- */
import { voiceLeadCandidates } from "../src/lib/voiceagent.js";

test("voiceLeadCandidates: flags leasing calls with no booking, keyed by call_sid", () => {
  const now = "2026-08-01T12:00:00Z";
  const calls = [
    { call_sid: "CA111", caller: "3375551234", started_at: "2026-07-31T20:10:00Z" },
    { call_sid: "CA222", caller: "", started_at: "2026-08-01T02:00:00Z" },
  ];
  const out = voiceLeadCandidates(calls, now);
  assert.equal(out.length, 2);
  assert.equal(out[0].agent, "manager");
  assert.equal(out[0].triggerSource, "voice-lead:CA111");
  assert.ok(out[0].title.length > 10);
  assert.ok(out[0].detail.includes("CA111"));
  assert.ok(out[0].detail.includes("337-555-1234") || out[0].detail.includes("3375551234"));
  // unknown caller never renders as empty/undefined
  assert.ok(!/undefined/.test(out[1].detail));
});

test("voiceLeadCandidates: grace period — fresh calls are not flagged yet", () => {
  const now = "2026-08-01T12:00:00Z";
  const calls = [
    { call_sid: "CAfresh", caller: "x", started_at: "2026-08-01T11:30:00Z" }, // 30 min old
    { call_sid: "CAripe", caller: "x", started_at: "2026-08-01T09:00:00Z" },  // 3 h old
  ];
  const out = voiceLeadCandidates(calls, now);
  assert.equal(out.length, 1);
  assert.equal(out[0].triggerSource, "voice-lead:CAripe");
});

test("voiceLeadCandidates: null-safe on junk input", () => {
  assert.deepEqual(voiceLeadCandidates(null, "2026-08-01T12:00:00Z"), []);
  assert.deepEqual(voiceLeadCandidates([], "2026-08-01T12:00:00Z"), []);
  assert.deepEqual(voiceLeadCandidates([{}], "2026-08-01T12:00:00Z"), []);
});
