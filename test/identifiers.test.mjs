/* D-23a (2026-09-17): property identifiers fold — pure. The 25 AC rows land
   in properties.facts as kind='identifier'; the K-1 card must group them in
   AC's order, keep every null visible as "not on file", and ignore every
   other facts entry. The migration text is pinned too: the owner entity row
   must read Belle Realty (ruling D-23b) — never the AC value. */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { groupIdentifiers, identifierSummary, displayValue, NOT_ON_FILE } from "../src/lib/identifiers.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIG = readFileSync(join(root, "supabase/migrations/20260911140000_property_identifiers.sql"), "utf8");

const ID = (label, value, group, sortOrder, extra = {}) =>
  ({ key: "identifier:" + label, kind: "identifier", group, label, value, sortOrder, asOf: "2026-07-02", ...extra });

const FACTS = [
  { key: "brand", kind: "fact", label: "Brand", value: "Cypress Command" },  // ignored
  ID("Lender", "Investar Bank", "Loan", 8),
  ID("Owner EIN", null, "Entity & Legal", 2),
  ID("Owner Entity (Legal Name)", "Belle Realty of Lafayette, LLC", "Entity & Legal", 0, { asOf: "2026-09-17" }),
  ID("Loan / account number", "   ", "Loan", 11),
  ID("Maturity date", "2030-04-30", "Loan", 10),
];

test("identifiers: groups follow sortOrder, first-appearance group order, non-identifier facts ignored", () => {
  const g = groupIdentifiers(FACTS);
  assert.deepEqual(g.map(x => x.group), ["Entity & Legal", "Loan"]);
  assert.deepEqual(g[0].rows.map(r => r.label), ["Owner Entity (Legal Name)", "Owner EIN"]);
  assert.deepEqual(g[1].rows.map(r => r.label), ["Lender", "Maturity date", "Loan / account number"]);
  assert.equal(g[0].rows[0].asOf, "2026-09-17");
});

test("identifiers: null AND blank values are missing → constant placeholder, counted per group", () => {
  const g = groupIdentifiers(FACTS);
  assert.equal(g[0].missing, 1);
  assert.equal(g[1].missing, 1, "whitespace-only value is not a value");
  assert.equal(displayValue(g[0].rows[1]), NOT_ON_FILE);
  assert.equal(displayValue(g[1].rows[0]), "Investar Bank");
  assert.equal(identifierSummary(g), "5 identifiers · 2 not on file");
});

test("identifiers: empty / non-array input → no groups, empty summary", () => {
  assert.deepEqual(groupIdentifiers(null), []);
  assert.deepEqual(groupIdentifiers([{ kind: "identifier" }]), [], "a row without a label is not an identifier");
  assert.equal(identifierSummary([]), "");
});

test("identifiers migration: 25 rows, owner entity = Belle Realty per D-23b, AC value only in the provenance note", () => {
  const rows = MIG.match(/"kind": "identifier"/g) || [];
  assert.equal(rows.length, 25);
  assert.match(MIG, /"label": "Owner Entity \(Legal Name\)",\s*"value": "Belle Realty of Lafayette, LLC"/);
  assert.ok(!/"value": "On The Boulevard, LLC"/.test(MIG), "the AC owner value must never be a loaded value");
  assert.match(MIG, /APPLIED on prod 2026-09-17/);
});
