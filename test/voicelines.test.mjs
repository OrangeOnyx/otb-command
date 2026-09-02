import test from "node:test";
import assert from "node:assert/strict";
import {
  LINE_DEFS, normalizeUsNumber, formatUsNumber, telHref, linesFromRow,
  hasLines, lineRows, validateLines, publishNote,
} from "../src/lib/voicelines.js";

test("normalizeUsNumber accepts every common US format and rejects the rest", () => {
  for (const s of ["(337) 555-0100", "337-555-0100", "337.555.0100", "+1 337 555 0100", "13375550100", "3375550100"])
    assert.equal(normalizeUsNumber(s), "+13375550100", s);
  for (const s of ["", null, undefined, "555-0100", "0375550100", "3370550100", "+44 20 7946 0958", "337555010"])
    assert.equal(normalizeUsNumber(s), null, String(s));
});

test("formatUsNumber / telHref render from E.164 and go blank on junk", () => {
  assert.equal(formatUsNumber("+13375550100"), "(337) 555-0100");
  assert.equal(formatUsNumber("337-555-0100"), "(337) 555-0100");
  assert.equal(formatUsNumber("nope"), "");
  assert.equal(telHref("(337) 555-0100"), "tel:+13375550100");
  assert.equal(telHref(""), "");
});

test("linesFromRow reads the RPC shape and the raw row shape alike", () => {
  const fromRpc = linesFromRow({ tenant: "+13375550100", leasing: "", updated_at: "2026-09-01T20:00:00Z" });
  assert.deepEqual(fromRpc.tenant, { e164: "+13375550100", display: "(337) 555-0100", href: "tel:+13375550100" });
  assert.equal(fromRpc.leasing, null);
  assert.equal(fromRpc.updatedAt, "2026-09-01T20:00:00Z");
  const fromRow = linesFromRow({ tenant_number: "", leasing_number: "+13375550199" });
  assert.equal(fromRow.tenant, null);
  assert.equal(fromRow.leasing.display, "(337) 555-0199");
  assert.equal(fromRow.updatedAt, null);
  assert.deepEqual(linesFromRow(null), { updatedAt: null, tenant: null, leasing: null });
});

test("hasLines / lineRows: tenants get only the tenant line, set lines only", () => {
  const none = linesFromRow({});
  assert.equal(hasLines(none), false);
  assert.deepEqual(lineRows(none), []);
  const both = linesFromRow({ tenant: "+13375550100", leasing: "+13375550199" });
  assert.equal(hasLines(both), true);
  assert.deepEqual(lineRows(both).map(r => r.key), ["tenant", "leasing"]);
  assert.deepEqual(lineRows(both, "tenant").map(r => r.key), ["tenant"]);
  assert.equal(lineRows(both)[0].label, LINE_DEFS[0][1]);
  assert.equal(lineRows(both)[1].hint, LINE_DEFS[1][2]);
  const leasingOnly = linesFromRow({ leasing: "+13375550199" });
  assert.deepEqual(lineRows(leasingOnly, "tenant"), []);
  assert.deepEqual(lineRows(leasingOnly).map(r => r.display), ["(337) 555-0199"]);
});

test("validateLines: blanks allowed, shape enforced per line, pair must differ", () => {
  assert.equal(validateLines("", ""), null);
  assert.equal(validateLines("(337) 555-0100", ""), null);
  assert.equal(validateLines("", "337-555-0199"), null);
  assert.equal(validateLines("(337) 555-0100", "337-555-0199"), null);
  assert.equal(validateLines("555-0100", ""), "tenant line: enter a 10-digit US number");
  assert.equal(validateLines("", "12"), "leasing line: enter a 10-digit US number");
  assert.equal(validateLines("337-555-0100", "+1 (337) 555-0100"), "tenant and leasing lines must differ");
});

test("publishNote reads unpublished vs published states", () => {
  assert.match(publishNote(linesFromRow({})), /^Not published yet/);
  const note = publishNote(linesFromRow({ tenant: "+13375550100", leasing: "", updated_at: "2026-09-01T20:00:00Z" }));
  assert.equal(note, "Published · tenant (337) 555-0100 · updated 2026-09-01");
});
