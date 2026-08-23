import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { unzipSync } from "fflate";
import { assembleLease } from "../src/lib/leasedoc.js";
import { mergeDocx, leaseFileName } from "../src/lib/leasedocx.js";

const template = readFileSync("src/data/lease-template.docx");
const UNIT = { unit: "131", sf: 1907 };
const REC = { cam: 2.1, tax: 0.9, ins: 1.0 };
const IN = {
  unit: "131", lesseeLegalName: "Bayou Furniture Co, LLC", lesseeEntityType: "limited liability company",
  lesseeState: "Louisiana", lesseeNoticeAddress: "PO Box 1, Lafayette, LA 70501",
  lesseeEmail: "jane@bayou.com", lesseePhone: "337-555-0100", lesseeRep: "Jane Doe",
  signerName: "Jane Doe", signerTitle: "Managing Member",
  permittedUse: "retail sale of furniture", useStandard: "retail",
  executionDate: "2026-09-01", effectiveDate: "2026-09-01",
  commencementDate: "2026-10-01", expirationDate: "2031-09-30", additionalTermDates: "",
  basePsf: 14.5, termMonths: 60, escalationPct: 3, freeRentMonths: 2, constructionMonths: 0,
  deposit: 4000, renewalSummary: "", guarantyRequired: false,
};

test("mergeDocx fills every token, output is a valid zip with no [[..]] left", () => {
  const r = assembleLease(IN, UNIT, REC);
  assert.equal(r.ok, true);
  const out = mergeDocx(template, r.tokens);
  const xml = Buffer.from(unzipSync(out)["word/document.xml"]).toString("utf8");
  assert.ok(!/\[\[/.test(xml), "unmerged token survives");
  assert.ok(xml.includes("Bayou Furniture Co, LLC"));
  assert.ok(xml.includes("one thousand nine hundred seven (1,907)"));
  assert.ok(xml.includes("Months 1–12"));           // Schedule G landed
  assert.ok(xml.includes("<w:br/>"));               // multi-line rows became line breaks
  assert.ok(xml.includes("&amp;") || !xml.includes("& "), "XML escaping intact");
  assert.ok(xml.includes("DRAFT — SUBJECT TO LOUISIANA COUNSEL REVIEW"), "DRAFT stamp survives the merge");
});

test("mergeDocx throws when a token value is missing", () => {
  const r = assembleLease(IN, UNIT, REC);
  const bad = { ...r.tokens }; delete bad.SUITE;
  assert.throws(() => mergeDocx(template, bad), /unmerged tokens: .*SUITE/);
});

test("leaseFileName slugs the tenant", () => {
  assert.equal(leaseFileName({ SUITE: "131", LESSEE_LEGAL_NAME: "Bayou Furniture Co, LLC" }, "docx"),
    "lease-unit-131-bayou-furniture-co-llc-draft.docx");
});
