import test from "node:test";
import assert from "node:assert/strict";
import {
  ESIGN_STATUS, ESIGN_OPEN_STATES, esignDisplayStatus, canSign, canDecline,
  canResend, signingMessage, receiptText, summarizeEsign, signingUrl,
} from "../src/lib/esign.js";

const NOW = "2026-07-25T12:00:00.000Z";
const FUTURE = "2026-08-08T12:00:00.000Z";
const PAST = "2026-07-01T12:00:00.000Z";

test("esign: display status passes through, but open+past-expiry reads expired", () => {
  assert.equal(esignDisplayStatus({ status: "sent", expires_at: FUTURE }, NOW), "sent");
  assert.equal(esignDisplayStatus({ status: "sent", expires_at: PAST }, NOW), "expired");
  assert.equal(esignDisplayStatus({ status: "viewed", expires_at: PAST }, NOW), "expired");
  // terminal states never flip to expired
  assert.equal(esignDisplayStatus({ status: "signed", expires_at: PAST }, NOW), "signed");
  assert.equal(esignDisplayStatus({ status: "declined", expires_at: PAST }, NOW), "declined");
});

test("esign: canSign/canDecline only in live open states; canResend blocks signed only", () => {
  assert.equal(canSign({ status: "viewed", expires_at: FUTURE }, NOW), true);
  assert.equal(canSign({ status: "sent", expires_at: PAST }, NOW), false);
  assert.equal(canSign({ status: "signed", expires_at: FUTURE }, NOW), false);
  assert.equal(canDecline({ status: "pending", expires_at: FUTURE }, NOW), true);
  assert.equal(canResend({ status: "declined" }), true);
  assert.equal(canResend({ status: "expired" }), true);
  assert.equal(canResend({ status: "signed" }), false);
});

test("esign: signing message carries signer, title, url, expiry, Belle block", () => {
  const m = signingMessage({ signerName: "Jane Doe", title: "Lease Amendment #2", url: "https://x/api/esign?t=abc", expiresAt: "2026-08-08T00:00:00Z" });
  assert.match(m, /Dear Jane Doe/);
  assert.match(m, /Document: Lease Amendment #2/);
  assert.match(m, /https:\/\/x\/api\/esign\?t=abc/);
  assert.match(m, /August 8, 2026/);
  assert.match(m, /Belle Realty of Lafayette, LLC/);
});

test("esign: receipt is deterministic; drawn signatures are not embedded", () => {
  const base = { id: "es1", title: "Lease", signer_name: "Jane", signer_email: "j@x.com", signer_ip: "1.2.3.4", signed_at: "2026-07-25T12:00:00Z" };
  const typed = receiptText({ ...base, signature_data: "Jane Doe" });
  assert.match(typed, /ELECTRONIC SIGNATURE RECEIPT/);
  assert.match(typed, /Jane Doe/);
  assert.match(typed, /1\.2\.3\.4/);
  const drawn = receiptText({ ...base, signature_data: "data:image/png;base64,AAAA" });
  assert.match(drawn, /Drawn signature/);
  assert.doesNotMatch(drawn, /base64/);
});

test("esign: summarize counts by display status with open rollup", () => {
  const s = summarizeEsign([
    { status: "pending", expires_at: FUTURE },
    { status: "sent", expires_at: FUTURE },
    { status: "sent", expires_at: PAST },   // reads expired
    { status: "signed" },
    { status: "declined" },
  ], NOW);
  assert.equal(s.pending, 1);
  assert.equal(s.sent, 1);
  assert.equal(s.expired, 1);
  assert.equal(s.signed, 1);
  assert.equal(s.declined, 1);
  assert.equal(s.open, 2);
});

test("esign: signing url + status registry shape", () => {
  assert.equal(signingUrl("https://otb-command.vercel.app/", "tok"), "https://otb-command.vercel.app/api/esign?t=tok");
  for (const s of ["pending", "sent", "viewed", "signed", "declined", "expired"]) {
    assert.ok(Array.isArray(ESIGN_STATUS[s]) && ESIGN_STATUS[s].length === 2);
  }
  assert.deepEqual(ESIGN_OPEN_STATES, ["pending", "sent", "viewed"]);
});
