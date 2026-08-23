// test/leasedochtml.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { assembleLease } from "../src/lib/leasedoc.js";
import { leaseHtml } from "../src/lib/leasedochtml.js";

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

test("leaseHtml: complete, merged, stamped", () => {
  const r = assembleLease(IN, UNIT, REC);
  const html = leaseHtml(r.tokens);
  assert.ok(!/\[\[/.test(html), "unmerged token in HTML");
  assert.match(html, /DRAFT — SUBJECT TO LOUISIANA COUNSEL REVIEW/);
  assert.ok(html.includes("Bayou Furniture Co, LLC"));
  assert.ok(html.includes("Section 4.01 - Rent"));
  assert.ok(html.includes("[LOUISIANA COUNSEL REVIEW"));     // flags preserved
  assert.ok(html.includes("SCHEDULE G"));
  assert.ok(!html.includes("Issuance checklist"), "checklist must not leak into signer copy");
  const stampCount = (html.match(/DRAFT — SUBJECT TO LOUISIANA COUNSEL REVIEW/g) || []).length;
  assert.ok(stampCount >= 2, "DRAFT stamp must appear in both the banner and the body text");
});

test("leaseHtml: operator copy renders the checklist when passed", () => {
  const r = assembleLease(IN, UNIT, REC);
  const html = leaseHtml(r.tokens, { checklist: r.checklist });
  assert.ok(html.includes("Issuance checklist"));
  assert.ok(html.includes("Jason&#39;s Deli") || html.includes("Jason's Deli"));
});

test("leaseHtml escapes HTML in values", () => {
  const r = assembleLease({ ...IN, lesseeLegalName: "Bad <script> Co" }, UNIT, REC);
  const html = leaseHtml(r.tokens);
  assert.ok(!html.includes("<script>"));
});
