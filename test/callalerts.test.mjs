/* Call alerts (2026-10-06) — pure-half guards.
   What this protects: the masthead bell counts every voice call not marked
   handled (no age cut) and only voice rows; "fresh" = calls newer than this
   device last opened L-1, newest first, and everything is fresh on a device
   that has never looked; toast copy carries urgency/intent/unit and only
   emergencies stick; the lock-screen push payload never carries the
   transcript and truncates long summaries; the VAPID key decoder; iOS needs
   a Home Screen install before push; the package-leg sentence never claims
   a leg that didn't go out; and the L-1 change signature that stops the
   60 s poll from repainting (wiping a search / a playing recording) when
   nothing changed. */
import test from "node:test";
import assert from "node:assert/strict";
import { alertModel, toastLine, urlBase64ToBytes, pushSupport } from "../src/lib/callalerts.js";
import { callPush } from "../src/lib/voicecall.js";
import { packageLegs, commsSignature } from "../src/lib/comms.js";

const call = (id, at, extra = {}) => ({
  id, at, source: "voice", channel: "voice", status: "new", urgency: "routine",
  summary: "Caller asked about suite 131.", contact_name: "Dana", unit: "",
  payload: { call_sid: "CA" + id, intent: "leasing" }, ...extra,
});

test("alertModel: unhandled voice calls only, emergency flag, fresh newest-first", () => {
  const rows = [
    call("a", "2026-10-01T10:00:00Z"),
    call("b", "2026-10-05T10:00:00Z", { status: "handled" }),
    call("c", "2026-10-06T09:00:00Z", { urgency: "emergency" }),
    { id: "n", at: "2026-10-06T11:00:00Z", source: "app", channel: "note", status: "" },
  ];
  const m = alertModel(rows, "2026-10-04T00:00:00Z");
  assert.equal(m.unhandled, 2); // a (old but still open) + c
  assert.equal(m.emergency, true);
  assert.deepEqual(m.fresh.map(r => r.id), ["c", "b"]);
  assert.equal(alertModel(rows, "").fresh.length, 3, "never-seen device: every call is fresh");
  assert.equal(alertModel([], "").unhandled, 0);
});

test("toastLine: title by urgency/intent/unit; only emergencies stick", () => {
  const t = toastLine(call("x", "2026-10-06T09:00:00Z", { unit: "131" }));
  assert.equal(t.title, "New leasing call · Unit 131");
  assert.equal(t.who, "Dana");
  assert.equal(t.sticky, false);
  const e = toastLine(call("y", "2026-10-06T09:00:00Z", { urgency: "emergency", payload: { call_sid: "CAy", intent: "maintenance" } }));
  assert.equal(e.title, "EMERGENCY · New maintenance call");
  assert.equal(e.sticky, true);
});

test("callPush: lock-screen payload — no transcript, capped summary, urgent flag, L-1 link", () => {
  const p = callPush({ call: { intent: "maintenance", urgency: "urgent", unit: "105", callback: "3375551212", summary: "x".repeat(200) }, callSid: "CA1", appUrl: "https://a.test" });
  assert.equal(p.title, "Urgent · New maintenance call · Unit 105");
  assert.ok(p.body.startsWith("(337) 555-1212 — "));
  assert.ok(p.body.length < 165 && p.body.endsWith("…"));
  assert.equal(p.url, "https://a.test/#comms");
  assert.equal(p.tag, "call:CA1");
  assert.equal(p.urgent, true);
  const quiet = callPush({ call: { intent: "nope", summary: "" } });
  assert.equal(quiet.title, "New general call");
  assert.equal(quiet.body, "Unknown caller");
  assert.equal(quiet.urgent, false);
});

test("urlBase64ToBytes decodes base64url without padding", () => {
  assert.deepEqual([...urlBase64ToBytes("AQID_w")], [1, 2, 3, 255]);
});

test("pushSupport: iOS Safari tab must install to Home Screen first", () => {
  const iosTab = { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)", standalone: false };
  const win = { matchMedia: () => ({ matches: false }) };
  assert.equal(pushSupport(iosTab, win), "ios-install");
  assert.equal(pushSupport({ userAgent: "Chrome", serviceWorker: {} }, { matchMedia: () => ({ matches: false }), PushManager: 1, Notification: 1 }), "ok");
  assert.equal(pushSupport({ userAgent: "Old" }, { matchMedia: () => ({ matches: false }) }), "none");
});

test("packageLegs never claims a leg that didn't go out", () => {
  assert.equal(packageLegs({ sent: true, email: "a@b.co", sms: true, phone: "3375551212" }), "e-mailed to a@b.co and texted to 3375551212");
  assert.equal(packageLegs({ sent: false, email: "a@b.co", sms: false }), "");
  assert.equal(packageLegs(null), "");
});

test("commsSignature: stable for identical data, moves on status / recording / new row", () => {
  const a = [call("a", "2026-10-01T10:00:00Z")];
  assert.equal(commsSignature(a), commsSignature(JSON.parse(JSON.stringify(a))));
  assert.notEqual(commsSignature(a), commsSignature([{ ...a[0], status: "handled" }]));
  assert.notEqual(commsSignature(a), commsSignature([{ ...a[0], payload: { ...a[0].payload, recording_status: "completed" } }]));
  assert.notEqual(commsSignature(a), commsSignature(a.concat(call("b", "2026-10-02T10:00:00Z"))));
});
