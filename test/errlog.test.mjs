import test from "node:test";
import assert from "node:assert/strict";
import { makeReporterState, shouldReport, SESSION_CAP } from "../src/lib/errlog.js";

test("first occurrence reports; repeats of the same message don't", () => {
  const s = makeReporterState();
  assert.equal(shouldReport(s, "TypeError: x is null"), true);
  assert.equal(shouldReport(s, "TypeError: x is null"), false);
  assert.equal(shouldReport(s, "Different error"), true);
});

test("session cap holds even for distinct messages", () => {
  const s = makeReporterState();
  for (let i = 0; i < SESSION_CAP; i++) assert.equal(shouldReport(s, "err " + i), true);
  assert.equal(shouldReport(s, "one more"), false);
});

test("blank/whitespace messages never report", () => {
  const s = makeReporterState();
  assert.equal(shouldReport(s, ""), false);
  assert.equal(shouldReport(s, "   "), false);
  assert.equal(shouldReport(s, null), false);
  assert.equal(s.sent, 0);
});

test("long messages dedupe on the clamped key", () => {
  const s = makeReporterState();
  const long = "x".repeat(300);
  assert.equal(shouldReport(s, long), true);
  assert.equal(shouldReport(s, long + "different tail past 200"), false);
});
