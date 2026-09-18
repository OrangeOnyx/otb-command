/* Voice call records — pure-half guards (src/lib/voicecall.js). Protects the
   intent/urgency vocabulary the chips paint from, the summarizer's
   normalization (enum fallbacks, caps, digits-only callback), transcript
   text ↔ turns round-trip, outcome lines, the comm_log display model, the
   trailing-window stats the D-1 KPI shows, and the owner e-mail shape. */
import test from "node:test";
import assert from "node:assert/strict";
import {
  CALL_INTENTS, CALL_URGENCY, validIntent, validUrgency, SUMMARY_TOOL, summaryPrompt,
  normalizeSummary, transcriptText, parseTranscript, fmtDuration, fmtPhone,
  outcomeLines, isVoiceCall, callDisplay, callStats, callEmail,
} from "../src/lib/voicecall.js";

test("voicecall: vocabulary + fallbacks", () => {
  assert.deepEqual(Object.keys(CALL_INTENTS), ["maintenance", "leasing", "billing", "general"]);
  assert.deepEqual(Object.keys(CALL_URGENCY), ["emergency", "urgent", "routine"]);
  assert.equal(validIntent("leasing"), "leasing");
  assert.equal(validIntent("sales"), "general");
  assert.equal(validUrgency("emergency"), "emergency");
  assert.equal(validUrgency("high"), "routine");
  // the tool schema's enums are the same vocabulary — one source
  assert.deepEqual(SUMMARY_TOOL.input_schema.properties.intent.enum, Object.keys(CALL_INTENTS));
  assert.deepEqual(SUMMARY_TOOL.input_schema.properties.urgency.enum, Object.keys(CALL_URGENCY));
  assert.match(summaryPrompt("leasing"), /LEASING line/);
  assert.match(summaryPrompt("tenant"), /TENANT line/);
});

test("voicecall: normalizeSummary caps, falls back, and strips the callback", () => {
  const n = normalizeSummary({
    summary: " AC out at 105. ", intent: "Maintenance", urgency: "URGENT", unit: " 105 ",
    caller_name: "Mia", callback_phone: "+1 (337) 555-0101", follow_up: "Call Butcher",
  });
  assert.deepEqual(n, { summary: "AC out at 105.", intent: "maintenance", urgency: "urgent", unit: "105",
    caller_name: "Mia", callback: "3375550101", follow_up: "Call Butcher" });
  const bad = normalizeSummary({ intent: "x", urgency: "y", callback_phone: "555" });
  assert.equal(bad.intent, "general");
  assert.equal(bad.urgency, "routine");
  assert.equal(bad.callback, "");
  assert.equal(normalizeSummary(null).summary, "");
  assert.equal(normalizeSummary({ summary: "a".repeat(700) }).summary.length, 600);
});

test("voicecall: transcript text ↔ turns round-trip", () => {
  const msgs = [
    { role: "user", content: "Hi, AC is out at 105." },
    { role: "assistant", content: "Sorry to hear it.\nWhat's your callback number?" },
    { role: "system", content: "ignored" },
    { role: "user", content: "   " },
  ];
  const text = transcriptText(msgs);
  assert.equal(text, "Caller: Hi, AC is out at 105.\nAgent: Sorry to hear it.\nWhat's your callback number?");
  const turns = parseTranscript(text);
  assert.deepEqual(turns, [
    { role: "caller", text: "Hi, AC is out at 105." },
    { role: "agent", text: "Sorry to hear it.\nWhat's your callback number?" },
  ]);
  assert.deepEqual(parseTranscript(""), []);
  assert.deepEqual(parseTranscript("stray line"), [{ role: "caller", text: "stray line" }]);
});

test("voicecall: duration + phone formatting", () => {
  assert.equal(fmtDuration(0), "0:00");
  assert.equal(fmtDuration(222), "3:42");
  assert.equal(fmtDuration(-1), "");
  assert.equal(fmtDuration("x"), "");
  assert.equal(fmtPhone("+13375550101"), "(337) 555-0101");
  assert.equal(fmtPhone("3375550101"), "(337) 555-0101");
  assert.equal(fmtPhone("anonymous"), "anonymous");
});

test("voicecall: outcome lines cover work order, tour, lead, package states", () => {
  assert.deepEqual(outcomeLines(null), []);
  const lines = outcomeLines({
    work_order: "vr-20260918-ab12",
    tour: { slot_key: "2026-09-22T10:00", label: "Tuesday, September 22 at 10:00 AM" },
    lead: "vl20260918a1b2",
    package: { sent: true, email: "p@x.com" },
  });
  assert.deepEqual(lines.map(l => l.kind), ["work_order", "tour", "lead", "package"]);
  assert.equal(lines[0].sheet, "maint");
  assert.match(lines[1].label, /Tuesday, September 22/);
  assert.match(lines[3].label, /e-mailed to p@x.com/);
  assert.match(outcomeLines({ package: { sent: false, email: "p@x.com" } })[0].label, /send pending/);
  assert.match(outcomeLines({ package: { sent: false } })[0].label, /no e-mail given/);
});

const ROW = {
  id: "vc:CA1", source: "voice", channel: "voice", unit: "105", urgency: "urgent", status: "new",
  at: "2026-09-18T14:00:00Z", contact_name: "Mia", contact_phone: "3375550101",
  body: "Caller: AC is out.\nAgent: Filing it now.",
  payload: { call_sid: "CA1", line: "tenant", intent: "maintenance", duration_s: 95,
    recording_sid: "RE1", recording_status: "completed", outcome: { work_order: "vr-1" } },
};

test("voicecall: isVoiceCall + callDisplay", () => {
  assert.equal(isVoiceCall(ROW), true);
  assert.equal(isVoiceCall({ source: "ac", payload: {} }), false);
  assert.equal(isVoiceCall({ source: "voice", payload: {} }), false);
  const d = callDisplay(ROW);
  assert.equal(d.callSid, "CA1");
  assert.equal(d.line, "Tenant line");
  assert.equal(d.intentLabel, "Maintenance");
  assert.equal(d.urgencyLabel, "Urgent");
  assert.equal(d.who, "Mia");
  assert.equal(d.phone, "(337) 555-0101");
  assert.equal(d.duration, "1:35");
  assert.equal(d.recordingSid, "RE1");
  assert.equal(d.outcome.length, 1);
  assert.equal(d.turns.length, 2);
  assert.equal(d.handled, false);
  // recording only counts once Twilio reports it complete
  assert.equal(callDisplay({ ...ROW, payload: { ...ROW.payload, recording_status: "in-progress" } }).recordingSid, "");
  assert.equal(callDisplay({ ...ROW, contact_name: "", contact_phone: "" }).who, "unknown caller");
});

test("voicecall: callStats windows, counts intents and attention", () => {
  const rows = [
    ROW,
    { ...ROW, id: "vc:CA2", status: "handled", urgency: "emergency", at: "2026-09-17T14:00:00Z", payload: { ...ROW.payload, call_sid: "CA2", intent: "leasing" } },
    { ...ROW, id: "vc:CA3", at: "2026-09-01T14:00:00Z", payload: { ...ROW.payload, call_sid: "CA3" } }, // outside 7d
    { id: "ac1", source: "ac", channel: "voice", at: "2026-09-18T10:00:00Z", payload: { ac_kind: "x" } }, // imported history, not a call record
  ];
  const s = callStats(rows, "2026-09-18T20:00:00Z");
  assert.equal(s.total, 2);
  assert.equal(s.needsAttention, 1);
  assert.equal(s.emergencies, 1);
  assert.deepEqual(s.byIntent, { maintenance: 1, leasing: 1 });
  assert.equal(callStats(rows, "2026-09-18T20:00:00Z", 30).total, 3);
  assert.equal(callStats([], "bad").total, 0);
});

test("voicecall: owner e-mail subject, text and html", () => {
  const call = { line: "tenant", started_at: "2026-09-18T14:00:00Z", caller: "+13375550101", caller_name: "Mia",
    callback: "3375550101", unit: "105", intent: "maintenance", urgency: "emergency", duration_s: 95,
    summary: "Water coming through the ceiling at 105.", follow_up: "Dispatch plumber.",
    outcome: { work_order: "vr-1" } };
  const m = callEmail({ call, transcript: "Caller: Water!\nAgent: Filing <now>." });
  assert.equal(m.subject, "EMERGENCY — Maintenance call · Unit 105 — Mia");
  assert.match(m.text, /Next step: Dispatch plumber\./);
  assert.match(m.text, /- Work order vr-1/);
  assert.match(m.text, /#comms/);
  assert.match(m.text, /Caller: Water!/);
  assert.match(m.html, /Filing &lt;now&gt;\./);
  assert.match(m.html, /Cypress Command/);
  assert.doesNotMatch(m.html, /<now>/);
  const plain = callEmail({ call: { line: "leasing", intent: "leasing", urgency: "routine" }, transcript: "" });
  assert.equal(plain.subject, "Leasing call");
  assert.match(plain.html, /none captured/);
});
