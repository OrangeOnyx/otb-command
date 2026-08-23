// test/leasetemplate.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { unzipSync } from "fflate";

const manifest = JSON.parse(readFileSync("src/data/lease-manifest.json", "utf8"));
const body = JSON.parse(readFileSync("src/data/lease-body.json", "utf8"));
const zip = unzipSync(readFileSync("src/data/lease-template.docx"));
const xml = Buffer.from(zip["word/document.xml"]).toString("utf8");

/* Forbidden PII needles stored base64-encoded. */
const FORBIDDEN = ["bGVib3VlZg==","Q29uc3RpdHV0aW9uIERyaXZl","OTYyLTEzMTk=","MjEgQXJub3VsZCBCb3VsZXZhcmQ=","c2Fsb24="].map(s => Buffer.from(s, "base64").toString("utf8"));

test("template carries no residual PII or deal leftovers", () => {
  for (const bad of FORBIDDEN)
    assert.ok(!xml.toLowerCase().includes(bad.toLowerCase()), "found forbidden: " + bad);
});

test("manifest tokens exactly match tokens present in the template XML", () => {
  const found = [...new Set([...xml.matchAll(/\[\[([^\]]+)\]\]/g)].map(m => m[1]))].sort();
  assert.deepEqual(found, [...manifest.tokens].sort());
});

test("expected core tokens are present", () => {
  for (const t of ["LESSEE_LEGAL_NAME", "PREMISES_ADDRESS", "USE_STANDARD", "LESSEE_EMAIL",
    "LESSEE_PHONE", "BASE_RENT_STEP_ROWS", "RENT_ABATEMENT_ROWS", "MONTHLY_RENT_SCHEDULE",
    "CAM_PSF", "TAX_PSF", "INSURANCE_PSF", "SECURITY_DEPOSIT", "SUITE", "RSF",
    "PREMISES_RSF_WORDS_AND_NUMBERS", "PERMITTED_USE", "COMMENCEMENT_DATE", "EXPIRATION_DATE"])
    assert.ok(manifest.tokens.includes(t), "missing token: " + t);
});

test("no [[TOKEN]] is split across runs (every token sits inside one w:t)", () => {
  const inTexts = [...xml.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)]
    .flatMap(m => [...m[1].matchAll(/\[\[([^\]]+)\]\]/g)].map(x => x[1]));
  assert.deepEqual([...new Set(inTexts)].sort(), [...manifest.tokens].sort());
});

test("body.json preserves counsel-review flags and section text", () => {
  const all = body.join("\n");
  assert.ok(all.includes("[LOUISIANA COUNSEL REVIEW"));
  assert.ok(all.includes("Section 4.01 - Rent"));
  assert.ok(body.length > 100);
});

test("document.xml carries the DRAFT stamp as the first body paragraph", () => {
  assert.ok(xml.includes("DRAFT — SUBJECT TO LOUISIANA COUNSEL REVIEW"));
  const bodyOpenIdx = xml.indexOf("<w:body>");
  const firstParaIdx = xml.indexOf("<w:p>", bodyOpenIdx);
  const stampIdx = xml.indexOf("DRAFT — SUBJECT TO LOUISIANA COUNSEL REVIEW");
  assert.ok(firstParaIdx === bodyOpenIdx + "<w:body>".length, "stamp paragraph must be the first paragraph in the body");
  assert.ok(stampIdx > firstParaIdx && stampIdx < xml.indexOf("</w:p>", firstParaIdx));
});

test("body.json first paragraph carries the DRAFT stamp", () => {
  assert.equal(body[0], "DRAFT — SUBJECT TO LOUISIANA COUNSEL REVIEW");
});

test("body.json: SCHEDULE A caption keeps its line breaks instead of running on", () => {
  const schedA = body.find(p => p.startsWith("SCHEDULE A"));
  assert.ok(schedA, "SCHEDULE A caption paragraph not found");
  assert.match(schedA, /^SCHEDULE A\n/);
  assert.ok(schedA.includes("BOULEVARD SHOPPING CENTER PROPERTY"));
  assert.ok(schedA.includes("PLAT OF LEASED PREMISES"));
});

test("whole-zip scrub gate: no forbidden PII needle survives in ANY xml part", () => {
  for (const name of Object.keys(zip)) {
    if (!name.endsWith(".xml")) continue;
    const content = Buffer.from(zip[name]).toString("utf8");
    for (const bad of FORBIDDEN)
      assert.ok(!content.toLowerCase().includes(bad.toLowerCase()), `found forbidden "${bad}" in ${name}`);
  }
});

test("whole-zip scrub gate: no [[TOKEN]] leaks outside word/document.xml", () => {
  for (const name of Object.keys(zip)) {
    if (!name.endsWith(".xml") || name === "word/document.xml") continue;
    const content = Buffer.from(zip[name]).toString("utf8");
    assert.ok(!content.includes("[["), `unexpected [[ token found in ${name}`);
  }
});

test("no PII needles in tracked source (tools/lease-template.mjs and test file)", () => {
  const toolSource = readFileSync("tools/lease-template.mjs", "utf8");
  const testSource = readFileSync("test/leasetemplate.test.mjs", "utf8");
  const source = toolSource + testSource;
  for (const needle of FORBIDDEN) {
    assert.ok(!source.includes(needle), "plaintext PII found in tracked source: " + needle);
  }
});
