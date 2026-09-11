import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { suiteEvidence, buildOwnerUpdate, commandDate } from "../src/lib/command-evidence.js";
import { COMMAND_ISSUE_ID, loadCommandEvidence } from "../tools/command-evidence-data.mjs";

const geometry = JSON.parse(await readFile(new URL("../src/data/geometry.json", import.meta.url), "utf8"));
const units = JSON.parse(await readFile(new URL("../src/data/units.public.json", import.meta.url), "utf8"));

test("command dates use the property calendar across UTC midnight and seasonal offsets", async () => {
  assert.equal(commandDate("2026-09-08T00:01:00Z"), "2026-09-07");
  assert.equal(commandDate("2026-09-08T04:59:59Z"), "2026-09-07");
  assert.equal(commandDate("2026-09-08T05:00:00Z"), "2026-09-08");
  assert.equal(commandDate("2026-01-08T05:59:59Z"), "2026-01-07");
  assert.equal(commandDate("2026-01-08T06:00:00Z"), "2026-01-08");
  assert.equal(commandDate("2026-09-08"), "2026-09-08");
  assert.equal(commandDate(new Date("2026-09-08T00:01:00Z")), "2026-09-07");
  for (const invalid of [null, "", "not a date", "2026-02-30", "2026-09-08T00:01:00", new Date(NaN)]) {
    assert.throws(() => commandDate(invalid), RangeError);
  }
  const { issue } = await loadCommandEvidence();
  const draft = buildOwnerUpdate({ issue, generatedAt: "2026-09-08T00:01:00Z" });
  assert.equal(draft.generatedAt, "2026-09-07");
  assert.match(draft.text, /Prepared 2026-09-07/);
  assert.equal(buildOwnerUpdate({ issue, generatedAt: "2026-09-08" }).generatedAt, "2026-09-08");
});

test("evidence reads one real archived work order without shipping test tickets or private data", async () => {
  const data = await loadCommandEvidence();
  assert.equal(data.issue.id, COMMAND_ISSUE_ID);
  assert.equal(data.issue.archivedStatus, "open");
  assert.equal(data.issue.asOf, "2026-08-29");
  assert.deepEqual(data.issue.location.suiteIds, ["101", "103"]);
  assert.equal(data.issue.cost, null);
  assert.equal(data.issue.completedAt, null);
  assert.equal(data.issue.location.precision, "Exact location unverified");
  assert.ok(data.sources.every(source => source.id && source.title && source.path && source.asOf && source.excerpt));
  const text = data.sources.map(source => source.excerpt).join("\n") + JSON.stringify(data.issue);
  for (const omitted of ["Burst pipe flooding", "passwordHash", "allocated_monthly_reporting_amount", '"monthly":', '"legal":', '"base":']) {
    assert.ok(!text.includes(omitted), omitted + " must stay out of the evidence response");
  }
  assert.ok(!Object.hasOwn(data.issue.location, "x"));
  assert.ok(!Object.hasOwn(data.issue.location, "lat"));
  const geometrySource = data.sources.find(source => source.id === "geometry");
  for (const caveat of ["314", "324", "344", "62,810", "62,883", "S38°32", "not adjudicated"]) assert.ok(geometrySource.excerpt.includes(caveat), caveat);
  assert.equal(data.sources.find(source => source.id === "plan-source").path, "reference/plat-full-72.png");
});

test("suite evidence preserves derived divisions and doesn't leak hydrated confidential fields", () => {
  for (const id of ["101", "103", "109", "111", "113", "131", "133", "139", "141", "143", "145"]) {
    const unit = { ...units.find(unit => unit.unit === id), monthly: 99999, legal: "private tenant entity", notes: "private note" };
    const evidence = suiteEvidence(unit, geometry);
    assert.equal(evidence.geometry.classification, "Derived boundary", id);
    assert.ok(!JSON.stringify(evidence).includes("private tenant"));
    assert.ok(!JSON.stringify(evidence).includes("99999"));
  }
  assert.equal(suiteEvidence(units.find(unit => unit.unit === "135A"), geometry).geometry.classification, "Interpreted split");
  assert.equal(suiteEvidence(units.find(unit => unit.unit === "129"), geometry).geometry.classification, "Plat dimension");
  assert.equal(suiteEvidence({ unit: "129", sf: null }, geometry).fields.find(field => field.label === "Recorded suite area").value, "Unknown");
  assert.equal(suiteEvidence(null, geometry), null);
});

test("owner draft preserves dated status, uncertain location and missing payment/cost evidence", async () => {
  const { issue } = await loadCommandEvidence();
  const draft = buildOwnerUpdate({ issue, generatedAt: "2026-09-07T12:00:00Z" });
  assert.equal(draft.reviewOnly, true);
  assert.match(draft.text, /Source archive as of 2026-08-29/);
  assert.match(draft.text, /Recorded status: open in the 2026-08-29 archive/);
  assert.match(draft.text, /Current repair\/completion status has not been verified/);
  assert.match(draft.text, /exact defect point and extent remain unverified/);
  assert.match(draft.text, /Cost \/ quote: not recorded/);
  assert.match(draft.text, /Payment: unknown/);
  assert.match(draft.text, /DRAFT ONLY · Not sent/);
  assert.ok(!draft.text.includes("$0"));
  assert.ok(!draft.text.includes("unpaid"));
  assert.throws(() => buildOwnerUpdate({}), /source-backed/);
  assert.equal(draft.text, buildOwnerUpdate({ issue, generatedAt: "2026-09-07T12:00:00Z" }).text);
});
