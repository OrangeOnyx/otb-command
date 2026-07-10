import test from "node:test";
import assert from "node:assert/strict";
import { LEASE_TOOL, leaseMath, packageFileName, buildProposalHTML, buildOwnerSummaryHTML, extractPackages } from "../src/lib/lease.js";

const P = {
  package_type: "proposal", unit: "131", tenant_company: "Bayou Furniture Co, LLC",
  tenant_contact: "Jane Doe", tenant_email: "jane@bayou.com", permitted_use: "retail sale of furniture",
  term_months: 60, base_psf: 14.5, free_rent_months: 2, escalation_pct: 3,
  deposit: 4000, ti_allowance: 10000, renewal_options: "one 5-year at then-market", notes: "",
};
const UNIT = { unit: "131", sf: 1907 };
const REC = { cam: 2.1, tax: 0.9, ins: 1.0 };
const HVAC = { repair: "750 per occurrence", replace: "50%", provider: "Butcher Air Conditioning" };

test("leaseMath derives monthly figures from SF + PSF", () => {
  const m = leaseMath(P, UNIT, REC);
  assert.equal(m.sf, 1907);
  assert.ok(Math.abs(m.baseMo - 1907 * 14.5 / 12) < 0.01);
  assert.ok(Math.abs(m.nnnPsf - 4.0) < 1e-9);
  assert.ok(Math.abs(m.totalMo - (m.baseMo + m.nnnMo)) < 0.01);
  assert.ok(m.year1 < m.totalMo * 12); // free rent reduces year 1
});

test("LEASE_TOOL is a strict schema with every property required", () => {
  assert.equal(LEASE_TOOL.strict, true);
  assert.equal(LEASE_TOOL.input_schema.additionalProperties, false);
  assert.deepEqual(
    [...LEASE_TOOL.input_schema.required].sort(),
    Object.keys(LEASE_TOOL.input_schema.properties).sort());
});

test("packageFileName is path-safe and descriptive", () => {
  const f = packageFileName(P, "2026-07-08");
  assert.match(f, /^unit-131-proposal-bayou-furniture-co-llc-2026-07-08\.html$/);
});

test("proposal HTML carries brand, draft stamp, terms, and escapes input", () => {
  const html = buildProposalHTML({ ...P, notes: "<script>x</script>" }, UNIT, REC, HVAC, "July 8, 2026");
  assert.match(html, /ON THE BOULEVARD/);
  assert.match(html, /DRAFT — SUBJECT TO LEGAL REVIEW/);
  assert.match(html, /1,907 SF/);
  assert.match(html, /\$14\.50 PSF\/yr/);
  assert.match(html, /Butcher Air Conditioning/);
  assert.match(html, /Managed by Orange Ocean, LLC on behalf of Belle Realty of Lafayette, LLC/);
  assert.ok(!html.includes("<script>x"));
});

test("owner summary HTML fills the form sections", () => {
  const html = buildOwnerSummaryHTML(P, UNIT, REC, HVAC, "July 8, 2026");
  assert.match(html, /OWNER LEASE SUMMARY/);
  assert.match(html, /CONFIDENTIAL — OWNER USE ONLY/);
  assert.match(html, /Belle Realty of Lafayette, LLC/);
  assert.match(html, /Parking variance 99-11797/);
  assert.match(html, /quarterly PM/);
});

test("extractPackages pulls package lines out of streamed text", () => {
  const { clean, packages } = extractPackages("Here is the package.\n\n[[package:https://x/y.html|Unit 131 proposal]]\nAnything else?");
  assert.equal(packages.length, 1);
  assert.equal(packages[0].url, "https://x/y.html");
  assert.equal(packages[0].label, "Unit 131 proposal");
  assert.ok(!clean.includes("[[package"));
  assert.match(clean, /Anything else\?/);
});

test("extractPackages is a no-op on plain text", () => {
  const { clean, packages } = extractPackages("plain answer");
  assert.equal(packages.length, 0);
  assert.equal(clean, "plain answer");
});

test("extractPackages allowlists https only (drops javascript:/data:)", () => {
  const ok = extractPackages("here [[package:https://x.supabase.co/f.html|Open]] done");
  assert.equal(ok.packages.length, 1);
  assert.equal(ok.packages[0].url, "https://x.supabase.co/f.html");
  const bad = extractPackages("x [[package:javascript:alert(1)|Open]] [[package:data:text/html,x|Y]]");
  assert.equal(bad.packages.length, 0);
  assert.ok(!bad.clean.includes("javascript"));
});
