/* COI AI-parse seam (src/lib/coiparse.js) — normalization is the trust
   boundary between the model's output and the operator's confirm UI. */
import test from "node:test";
import assert from "node:assert/strict";
import { COI_EXTRACT_TOOL, COI_PARSE_MAX_PDF_BYTES, fmtLimit, normalizeCoiDate, coiNoteLine, normalizeCoiExtraction, coiParseSummary } from "../src/lib/coiparse.js";

const FULL = {
  carrier: " Hartford ",
  insured: "Grizzly Roofing LLC",
  policy_number: "20SBWAB1234",
  gl_each_occurrence: 1000000,
  gl_aggregate: 2000000,
  expiry: "2027-03-01",
  additional_insured: true,
  notes: null,
};

test("tool schema: forced-call contract is complete and closed", () => {
  assert.equal(COI_EXTRACT_TOOL.name, "record_coi");
  assert.equal(COI_EXTRACT_TOOL.input_schema.additionalProperties, false);
  assert.deepEqual(
    [...COI_EXTRACT_TOOL.input_schema.required].sort(),
    Object.keys(COI_EXTRACT_TOOL.input_schema.properties).sort());
  assert.equal(COI_PARSE_MAX_PDF_BYTES, 3 * 1024 * 1024);
});

test("fmtLimit: COI vernacular", () => {
  assert.equal(fmtLimit(1000000), "$1M");
  assert.equal(fmtLimit(2500000), "$2.5M");
  assert.equal(fmtLimit(500000), "$500K");
  assert.equal(fmtLimit(0), null);
  assert.equal(fmtLimit("1M"), null);
});

test("normalizeCoiDate: ISO passes, ACORD MM/DD/YYYY converts, junk drops", () => {
  assert.equal(normalizeCoiDate("2027-03-01"), "2027-03-01");
  assert.equal(normalizeCoiDate("3/1/2027"), "2027-03-01");
  assert.equal(normalizeCoiDate("03/15/2026"), "2026-03-15");
  assert.equal(normalizeCoiDate("March 1, 2027"), null);
  assert.equal(normalizeCoiDate(20270301), null);
});

test("full clean extraction → date + composed note, no scare warnings", () => {
  const x = normalizeCoiExtraction(FULL, "2026-07-23");
  assert.equal(x.expires, "2027-03-01");
  assert.equal(x.note, "Hartford · GL $1M/$2M · pol 20SBWAB1234 · addl insured");
  assert.equal(x.fields.carrier, "Hartford"); // trimmed
  assert.deepEqual(x.warnings, []);
  assert.equal(coiParseSummary(x).startsWith("Parsed: Hartford · expires 2027-03-01"), true);
  assert.equal(coiParseSummary(x).includes("⚠"), false);
});

test("expired cert and missing additional-insured are flagged, not blocked", () => {
  const x = normalizeCoiExtraction({ ...FULL, expiry: "2026-01-01", additional_insured: false }, "2026-07-23");
  assert.equal(x.expires, "2026-01-01"); // date still prefills — operator decides
  assert.equal(x.warnings.some(w => w.includes("already expired")), true);
  assert.equal(x.warnings.some(w => w.includes("additional-insured")), true);
  assert.equal(coiParseSummary(x).includes("⚠"), true);
});

test("unreadable or implausible expiry → null date + warning", () => {
  const bad = normalizeCoiExtraction({ ...FULL, expiry: "expires next spring" }, "2026-07-23");
  assert.equal(bad.expires, null);
  assert.equal(bad.warnings.some(w => w.includes("unreadable expiry")), true);
  const far = normalizeCoiExtraction({ ...FULL, expiry: "2099-01-01" }, "2026-07-23");
  assert.equal(far.expires, null);
  assert.equal(far.warnings.some(w => w.includes("implausible")), true);
});

test("hostile/malformed payload degrades to nulls, never throws", () => {
  for (const raw of [null, "text", 42, [], { gl_each_occurrence: "1M", policy_number: 7, carrier: "   " }]) {
    const x = normalizeCoiExtraction(raw, "2026-07-23");
    assert.equal(x.expires, null);
    assert.equal(x.fields.carrier, null);
    assert.equal(x.fields.glEachOccurrence, null);
    assert.equal(typeof x.note, "string");
    assert.equal(x.warnings.length > 0, true);
  }
});

test("model notes surface as a warning; note line skips missing parts", () => {
  const x = normalizeCoiExtraction(
    { ...FULL, carrier: null, policy_number: null, notes: "two GL policies listed" }, "2026-07-23");
  assert.equal(x.note, "GL $1M/$2M · addl insured");
  assert.equal(x.warnings.some(w => w === "two GL policies listed"), true);
  assert.equal(coiNoteLine({}), "");
});
