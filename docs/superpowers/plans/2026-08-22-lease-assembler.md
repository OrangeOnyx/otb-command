# Lease Assembler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate executable OTB leases (merged DOCX + plan-room HTML feeding the e-sign rail) from the v2.2 Louisiana house form, repo data, and a deterministic operator form in the unit drawer.

**Architecture:** One pure engine (`src/lib/leasedoc.js`) computes tokens/Schedule G/checklist; a build-time tool normalizes + PII-scrubs the master docx into a committed template + manifest + body JSON; two thin renderers (`leasedocx.js` → DOCX bytes, `leasedochtml.js` → HTML) and one drawer panel (`leaseUI.js`) consume the engine. No AI, no network in the generation path.

**Tech Stack:** Vite vanilla-JS ESM, `node --test` (`test/*.test.mjs`), `fflate` (new dep) for zip read/write of docx, Supabase (`sb`) only in the UI layer for the e-sign handoff.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-22-lease-assembler-design.md`. Repo root: `C:\Users\adam\Projects\otb-command-claude-code-kit\otb-command`.
- Tests: `npm test` (node --test). Quality gate before delivery: `node --check` each touched module + `npm run build`.
- Every generated output carries **"DRAFT — SUBJECT TO LOUISIANA COUNSEL REVIEW"**.
- `[LOUISIANA COUNSEL REVIEW …]` bracket text in the house form is preserved verbatim in all outputs.
- The app sends nothing (standing v1 boundary): downloads + copy-link only.
- The RAW master docx (`C:\Users\adam\OneDrive\Desktop\OTB_Master_Lease_v2_2_Louisiana_House_Form.docx`) is **never committed** — it carries residual PII. Only the scrubbed template artifacts are committed.
- Existing `src/lib/lease.js` (proposal assembler) is NOT modified.
- Token syntax in the template: `[[NAME]]`, matched by `/\[\[([^\]]+)\]\]/g` (schedule attach markers contain spaces/semicolons).
- Money format: `$1,234.56` (en-US, 2 decimals). PSF format: `$14.50`. Dates in lease text: `"August 22, 2026"` (en-US long form) from `YYYY-MM-DD` inputs.
- Commit per task with imperative messages ending in:
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

---

### Task 1: Template build tool — normalize, scrub, emit committed artifacts

**Files:**
- Modify: `package.json` (add dependency `"fflate": "^0.8.2"`)
- Create: `tools/lease-template.mjs`
- Create (generated, committed): `src/data/lease-template.docx`, `src/data/lease-manifest.json`, `src/data/lease-body.json`
- Test: `test/leasetemplate.test.mjs`

**Interfaces:**
- Consumes: the raw master docx at `C:\Users\adam\OneDrive\Desktop\OTB_Master_Lease_v2_2_Louisiana_House_Form.docx` (CLI arg overrides).
- Produces:
  - `src/data/lease-template.docx` — scrubbed, run-normalized docx template.
  - `src/data/lease-manifest.json` — `{ "tokens": string[], "builtFrom": string, "note": string }` (sorted unique token names, including the four long schedule attach markers verbatim).
  - `src/data/lease-body.json` — `string[]`: every paragraph's plain text in order, tokens intact (input to the HTML renderer in Task 4).

- [ ] **Step 1: Add fflate**

Run: `npm install fflate@^0.8.2`
Expected: package.json dependencies gains fflate; lockfile updated.

- [ ] **Step 2: Write the tool**

```js
// tools/lease-template.mjs — normalize + scrub the master lease docx.
// Usage: node tools/lease-template.mjs [path-to-master.docx]
// Emits src/data/lease-template.docx + lease-manifest.json + lease-body.json.
// Re-run ONLY when the master house form changes. The raw master is never
// committed (residual PII); these scrubbed artifacts are.
import { readFileSync, writeFileSync } from "node:fs";
import { unzipSync, zipSync } from "fflate";

const SRC = process.argv[2] ||
  "C:/Users/adam/OneDrive/Desktop/OTB_Master_Lease_v2_2_Louisiana_House_Form.docx";

/* Residual deal data in the "master" → tokens (spec §Master template fixes). */
const SCRUBS = [
  ["114 Constitution Drive Lafayette, La 70503", "[[LESSEE_NOTICE_ADDRESS]]"],
  ["alicialebouef@outlook.com", "[[LESSEE_EMAIL]]"],
  ["337-962-1319", "[[LESSEE_PHONE]]"],
  ["1 21 Arnould Boulevard, Lafayette, Louisiana 70506", "[[PREMISES_ADDRESS]]"],
  ["retail salon standards", "[[USE_STANDARD]] standards"],
];
/* Strings that must NOT survive in any committed artifact. */
const FORBIDDEN = ["lebouef", "Constitution Drive", "962-1319", "21 Arnould Boulevard", "salon"];

const zip = unzipSync(readFileSync(SRC));
let xml = Buffer.from(zip["word/document.xml"]).toString("utf8");

/* 1) Run-normalize per paragraph: Word splits text into runs, so a [[TOKEN]]
   (or a scrub literal) can span runs. For each <w:p> whose concatenated text
   contains "[[" or a scrub literal fragment, merge ALL its runs' text into
   the paragraph's first run (keeping that run's properties). These paragraphs
   are plain body text in this document — no intra-paragraph formatting is
   load-bearing. */
xml = xml.replace(/<w:p\b[\s\S]*?<\/w:p>/g, para => {
  const texts = [...para.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map(m => m[1]);
  const joined = texts.join("");
  const needs = joined.includes("[[") || SCRUBS.some(([lit]) => joined.includes(lit));
  if (!needs || texts.length < 2) return para;
  let first = true;
  return para.replace(/<w:t[^>]*>[\s\S]*?<\/w:t>/g, () => {
    if (first) { first = false; return `<w:t xml:space="preserve">${joined}</w:t>`; }
    return "<w:t xml:space=\"preserve\"></w:t>";
  });
});

/* 2) Scrub. */
for (const [lit, tok] of SCRUBS) xml = xml.split(lit).join(tok);

/* 3) Manifest + body. */
const tokens = [...new Set([...xml.matchAll(/\[\[([^\]]+)\]\]/g)].map(m => m[1]))].sort();
const body = [...xml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)]
  .map(m => [...m[0].matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map(t => t[1]).join("")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"))
  .filter(t => t.trim());

for (const f of FORBIDDEN) {
  if (xml.toLowerCase().includes(f.toLowerCase()))
    throw new Error("Scrub failed — forbidden string survives: " + f);
}

zip["word/document.xml"] = Buffer.from(xml, "utf8");
writeFileSync("src/data/lease-template.docx", zipSync(zip));
writeFileSync("src/data/lease-manifest.json", JSON.stringify({
  tokens, builtFrom: "OTB_Master_Lease_v2_2_Louisiana_House_Form.docx",
  note: "Generated by tools/lease-template.mjs — do not hand-edit. Re-run when the master changes.",
}, null, 1));
writeFileSync("src/data/lease-body.json", JSON.stringify(body, null, 1));
console.log(`OK: ${tokens.length} tokens, ${body.length} paragraphs.`);
```

- [ ] **Step 3: Run the tool**

Run: `node tools/lease-template.mjs`
Expected: `OK: <N> tokens, <M> paragraphs.` and three files under `src/data/`. N ≈ 33 (29 named tokens + 4 schedule attach markers).

- [ ] **Step 4: Write the artifact test**

```js
// test/leasetemplate.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { unzipSync } from "fflate";

const manifest = JSON.parse(readFileSync("src/data/lease-manifest.json", "utf8"));
const body = JSON.parse(readFileSync("src/data/lease-body.json", "utf8"));
const zip = unzipSync(readFileSync("src/data/lease-template.docx"));
const xml = Buffer.from(zip["word/document.xml"]).toString("utf8");

test("template carries no residual PII or deal leftovers", () => {
  for (const bad of ["lebouef", "constitution drive", "962-1319", "21 arnould boulevard", "salon"])
    assert.ok(!xml.toLowerCase().includes(bad), "found forbidden: " + bad);
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
```

- [ ] **Step 5: Run tests**

Run: `node --test test/leasetemplate.test.mjs`
Expected: all PASS. If the run-split test fails, the normalizer missed a split token — inspect that paragraph in the XML and fix the normalizer, re-run the tool.

- [ ] **Step 6: Gate + commit**

Run: `node --check tools/lease-template.mjs && npm test`
```bash
git add package.json package-lock.json tools/lease-template.mjs src/data/lease-template.docx src/data/lease-manifest.json src/data/lease-body.json test/leasetemplate.test.mjs
git commit -m "Add lease template build tool: normalize + PII-scrub master docx

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Pure engine — `src/lib/leasedoc.js`

**Files:**
- Create: `src/lib/leasedoc.js`
- Test: `test/leasedoc.test.mjs`

**Interfaces:**
- Consumes: `src/data/lease-manifest.json` (token list — imported statically), unit row from units.json shape (`{unit, sf, dba, legal, use, ...}`), recoveries row shape (`{cam, tax, ins}` from recoveries.json `units[unit]`).
- Produces (exact exports later tasks rely on):
  - `numberToWords(n)` → `"one thousand nine hundred seven"` (integers 0–999,999).
  - `longDate(iso)` → `"August 22, 2026"` from `"2026-08-22"`; invalid → `""`.
  - `money(n)` → `"$2,304.29"`; `psf2(n)` → `"$14.50"`.
  - `scheduleG(inputs, sf, rec)` → `{ nnnPsf, steps: [{fromMonth, toMonth, psf, monthlyBase, monthlyNNN, monthlyTotal}], abatement: string[] }`.
  - `assembleLease(inputs, unit, rec)` → `{ ok, errors: string[], warnings: string[], tokens: Object<string,string>, scheduleG, checklist: string[] }`.
  - `REQUIRED_INPUTS: string[]`, `EXCLUSIVES: string[]`, `COUNSEL_FLAGS: string[]`.

**Input contract** (single source of truth — the form in Task 5 mirrors this):

```js
// inputs = {
//   unit: "131",
//   lesseeLegalName, lesseeEntityType, lesseeState, lesseeNoticeAddress,
//   lesseeEmail, lesseePhone, lesseeRep, signerName, signerTitle,
//   permittedUse,                    // e.g. "retail sale of furniture"
//   useStandard: "retail",           // §2.01 "first-class [[USE_STANDARD]] standards"
//   executionDate, effectiveDate, commencementDate, expirationDate, // "YYYY-MM-DD"
//   additionalTermDates: "",         // free text, "" → "NOT APPLICABLE"
//   basePsf: 14.5, termMonths: 60, escalationPct: 3,
//   freeRentMonths: 0, constructionMonths: 0,
//   deposit: 4000, renewalSummary: "", guarantyRequired: false,
// }
```

- [ ] **Step 1: Write the failing tests**

```js
// test/leasedoc.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  numberToWords, longDate, scheduleG, assembleLease, REQUIRED_INPUTS, EXCLUSIVES,
} from "../src/lib/leasedoc.js";

const manifest = JSON.parse(readFileSync("src/data/lease-manifest.json", "utf8"));
const UNIT = { unit: "131", sf: 1907, dba: "", legal: "", status: "vacant" };
const REC = { cam: 2.1, tax: 0.9, ins: 1.0 };
const IN = {
  unit: "131", lesseeLegalName: "Bayou Furniture Co, LLC", lesseeEntityType: "limited liability company",
  lesseeState: "Louisiana", lesseeNoticeAddress: "PO Box 1, Lafayette, LA 70501",
  lesseeEmail: "jane@bayou.com", lesseePhone: "337-555-0100", lesseeRep: "Jane Doe",
  signerName: "Jane Doe", signerTitle: "Managing Member",
  permittedUse: "retail sale of furniture", useStandard: "retail",
  executionDate: "2026-09-01", effectiveDate: "2026-09-01",
  commencementDate: "2026-10-01", expirationDate: "2031-09-30", additionalTermDates: "",
  basePsf: 14.5, termMonths: 60, escalationPct: 3, freeRentMonths: 2, constructionMonths: 1,
  deposit: 4000, renewalSummary: "One (1) three-year option per Section 31.01.", guarantyRequired: false,
};

test("numberToWords", () => {
  assert.equal(numberToWords(1907), "one thousand nine hundred seven");
  assert.equal(numberToWords(62883), "sixty-two thousand eight hundred eighty-three");
  assert.equal(numberToWords(0), "zero");
});

test("longDate", () => {
  assert.equal(longDate("2026-09-01"), "September 1, 2026");
  assert.equal(longDate(""), "");
});

test("scheduleG: escalated 60-month term = 5 steps, 3% annual", () => {
  const g = scheduleG(IN, 1907, REC);
  assert.equal(g.steps.length, 5);
  assert.equal(g.nnnPsf, 4.0);
  assert.equal(g.steps[0].fromMonth, 1);
  assert.equal(g.steps[0].toMonth, 12);
  assert.ok(Math.abs(g.steps[0].monthlyBase - 1907 * 14.5 / 12) < 0.01);
  assert.ok(Math.abs(g.steps[1].psf - 14.5 * 1.03) < 1e-9);
  assert.ok(Math.abs(g.steps[0].monthlyTotal - (g.steps[0].monthlyBase + g.steps[0].monthlyNNN)) < 0.01);
  assert.equal(g.abatement.length, 2); // construction month + free-rent months
  assert.match(g.abatement[1], /NNN|CAM/i);   // NNN stays payable during base abatement
});

test("scheduleG: flat 8-month term = one partial step, no abatement rows", () => {
  const g = scheduleG({ ...IN, termMonths: 8, escalationPct: 0, freeRentMonths: 0, constructionMonths: 0 }, 1000, REC);
  assert.equal(g.steps.length, 1);
  assert.equal(g.steps[0].toMonth, 8);
  assert.deepEqual(g.abatement, []);
});

test("scheduleG: 30-month term = 2 full steps + 6-month partial", () => {
  const g = scheduleG({ ...IN, termMonths: 30 }, 1907, REC);
  assert.equal(g.steps.length, 3);
  assert.equal(g.steps[2].fromMonth, 25);
  assert.equal(g.steps[2].toMonth, 30);
});

test("assembleLease: full inputs → ok, covers every manifest token", () => {
  const r = assembleLease(IN, UNIT, REC);
  assert.equal(r.ok, true, r.errors.join("; "));
  for (const t of manifest.tokens)
    assert.ok(t in r.tokens, "engine does not cover template token: " + t);
  assert.match(r.tokens.PREMISES_RSF_WORDS_AND_NUMBERS, /one thousand nine hundred seven \(1,907\)/);
  assert.equal(r.tokens.SUITE, "131");
  assert.equal(r.tokens.PREMISES_ADDRESS, "131 Arnould Boulevard, Lafayette, Louisiana 70506");
  assert.equal(r.tokens.CAM_PSF, "2.10");
  assert.equal(r.tokens.ADDITIONAL_TERM_DATES, "NOT APPLICABLE");
  assert.equal(r.tokens.LESSEE_SIGNATURE_DATE, "____________"); // blank at generation
  assert.match(r.tokens.BASE_RENT_STEP_ROWS, /Months 1–12/);
  assert.match(r.tokens.MONTHLY_RENT_SCHEDULE, /\$[\d,]+\.\d{2}\/mo total/);
});

test("assembleLease: missing required input blocks with named field", () => {
  const r = assembleLease({ ...IN, lesseeLegalName: "" }, UNIT, REC);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some(e => e.includes("lesseeLegalName")));
});

test("assembleLease: unknown unit / missing recoveries → hard error", () => {
  assert.equal(assembleLease(IN, null, REC).ok, false);
  assert.equal(assembleLease(IN, UNIT, null).ok, false);
});

test("checklist: exclusives + counsel flags + attachments + deposit warning", () => {
  const r = assembleLease({ ...IN, deposit: 0, guarantyRequired: true }, UNIT, REC);
  const all = r.checklist.join("\n");
  for (const e of EXCLUSIVES) assert.ok(all.includes(e.split(" — ")[0]), "missing exclusive: " + e);
  assert.match(all, /LOUISIANA COUNSEL REVIEW/);
  assert.match(all, /plat/i);
  assert.match(all, /Guaranty/);
  assert.ok(r.warnings.some(w => /deposit/i.test(w)));
});

test("REQUIRED_INPUTS matches the input contract", () => {
  assert.ok(REQUIRED_INPUTS.includes("lesseeLegalName"));
  assert.ok(REQUIRED_INPUTS.includes("basePsf"));
  assert.ok(!REQUIRED_INPUTS.includes("renewalSummary")); // optional
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test test/leasedoc.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/leasedoc.js`**

```js
/* Lease document engine (executable lease, house form v2.2) — pure: no DOM,
   no network. assembleLease() maps inputs + unit + recoveries onto the token
   manifest of src/data/lease-template.docx and computes Schedule G. Renderers
   (leasedocx.js / leasedochtml.js) and the drawer panel (leaseUI.js) are thin
   callers. AI-1 is a documented FUTURE caller — nothing here may depend on it.
   Spec: docs/superpowers/specs/2026-08-22-lease-assembler-design.md.
   Tested in test/leasedoc.test.mjs. */
import manifest from "../data/lease-manifest.json";

export const money = n => "$" + (+n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const psf2 = n => (+n).toFixed(2);

const ONES = ["zero","one","two","three","four","five","six","seven","eight","nine","ten","eleven","twelve","thirteen","fourteen","fifteen","sixteen","seventeen","eighteen","nineteen"];
const TENS = ["","","twenty","thirty","forty","fifty","sixty","seventy","eighty","ninety"];
export function numberToWords(n) {
  n = Math.floor(Math.abs(+n || 0));
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? "-" + ONES[n % 10] : "");
  if (n < 1000) return ONES[Math.floor(n / 100)] + " hundred" + (n % 100 ? " " + numberToWords(n % 100) : "");
  if (n < 1000000) return numberToWords(Math.floor(n / 1000)) + " thousand" + (n % 1000 ? " " + numberToWords(n % 1000) : "");
  return String(n); // out of expected domain; never wrong, just not words
}

export function longDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!m) return "";
  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return `${MONTHS[+m[2] - 1]} ${+m[3]}, ${+m[1]}`;
}

export const REQUIRED_INPUTS = [
  "unit", "lesseeLegalName", "lesseeEntityType", "lesseeState", "lesseeNoticeAddress",
  "lesseeEmail", "lesseePhone", "lesseeRep", "signerName", "signerTitle",
  "permittedUse", "useStandard", "executionDate", "effectiveDate",
  "commencementDate", "expirationDate", "basePsf", "termMonths",
];

/* Current exclusive-use positions to reconcile against §2.01 before issuance
   (CLAUDE.md exclusive-use watch + §2.01's own baked restrictions). Update
   when a new exclusive is granted. */
export const EXCLUSIVES = [
  "Jason's Deli (149) — §2.01(i) deli/restaurant restriction is baked into the clause",
  "Cat Clinic (119.5) — §2.01(ii) feline veterinary restriction is baked into the clause",
  "C. Wolf (135A) — §2.01(iii) home-goods/monogram/candles/jewelry boutique restriction",
  "HotWorx (129) — exclusive-use watch (Mar 2024 lease) vs any fitness/sauna use",
];

export const COUNSEL_FLAGS = [
  "§17.01 Damage or Destruction", "§30.01 Attorney's Costs", "§31.01 Option to Renew",
  "§32.01 Subordination", "§34.01 Authority and Entity Documentation",
];

export function scheduleG(inputs, sf, rec) {
  const nnnPsf = (+rec.cam || 0) + (+rec.tax || 0) + (+rec.ins || 0);
  const term = Math.max(0, Math.floor(+inputs.termMonths || 0));
  const esc = (+inputs.escalationPct || 0) / 100;
  const steps = [];
  for (let start = 1, yr = 0; start <= term; yr++, start = yr * 12 + 1) {
    const psf = +(inputs.basePsf * Math.pow(1 + esc, yr));
    const to = Math.min(term, (yr + 1) * 12);
    const monthlyBase = sf * psf / 12, monthlyNNN = sf * nnnPsf / 12;
    steps.push({ fromMonth: start, toMonth: to, psf, monthlyBase, monthlyNNN, monthlyTotal: monthlyBase + monthlyNNN });
  }
  const abatement = [];
  const cm = Math.max(0, Math.floor(+inputs.constructionMonths || 0));
  const fm = Math.max(0, Math.floor(+inputs.freeRentMonths || 0));
  if (cm) abatement.push(`Construction period: ${cm} month${cm > 1 ? "s" : ""} prior to the Commencement Date (§33.01 material inducement).`);
  if (fm) abatement.push(`Base-rent abatement: months 1–${fm} of the Initial Term — Base Rent abated; CAM, Taxes, and Insurance Charges (NNN) remain payable.`);
  return { nnnPsf, steps, abatement };
}

const range = s => s.fromMonth === s.toMonth ? `Month ${s.fromMonth}` : `Months ${s.fromMonth}–${s.toMonth}`;

export function assembleLease(inputs, unit, rec) {
  const errors = [], warnings = [];
  if (!unit || !Number.isFinite(+unit.sf) || +unit.sf <= 0) errors.push("unit: unknown unit or missing SF");
  if (!rec) errors.push("recoveries: no CAM/Tax/Ins row for this unit");
  for (const k of REQUIRED_INPUTS) {
    const v = inputs?.[k];
    if (v === undefined || v === null || String(v).trim() === "") errors.push(k + ": required");
  }
  for (const k of ["executionDate", "effectiveDate", "commencementDate", "expirationDate"])
    if (inputs?.[k] && !longDate(inputs[k])) errors.push(k + ": must be YYYY-MM-DD");
  if (errors.length) return { ok: false, errors, warnings, tokens: {}, scheduleG: null, checklist: [] };

  if (!(+inputs.deposit > 0)) warnings.push("Security deposit is $0 — confirm intentional (§35.01).");

  const sf = +unit.sf;
  const g = scheduleG(inputs, sf, rec);
  const gRequired = !!inputs.guarantyRequired;

  const tokens = {
    EXECUTION_DATE: longDate(inputs.executionDate),
    EFFECTIVE_DATE: longDate(inputs.effectiveDate),
    COMMENCEMENT_DATE: longDate(inputs.commencementDate),
    EXPIRATION_DATE: longDate(inputs.expirationDate),
    ADDITIONAL_TERM_DATES: String(inputs.additionalTermDates || "").trim() || "NOT APPLICABLE",
    LESSEE_LEGAL_NAME: inputs.lesseeLegalName,
    LESSEE_ENTITY_TYPE: inputs.lesseeEntityType,
    LESSEE_STATE: inputs.lesseeState,
    LESSEE_NOTICE_ADDRESS: inputs.lesseeNoticeAddress,
    LESSEE_EMAIL: inputs.lesseeEmail,
    LESSEE_PHONE: inputs.lesseePhone,
    LESSEE_AUTHORIZED_REPRESENTATIVE: inputs.lesseeRep,
    LESSEE_SIGNER_NAME: inputs.signerName,
    LESSEE_SIGNER_TITLE: inputs.signerTitle,
    LESSEE_SIGNATURE_DATE: "____________",
    LESSOR_SIGNATURE_DATE: "____________",
    PERMITTED_USE: inputs.permittedUse,
    USE_STANDARD: inputs.useStandard || "retail",
    SUITE: String(inputs.unit),
    RSF: sf.toLocaleString("en-US"),
    PREMISES_RSF_WORDS_AND_NUMBERS: `${numberToWords(sf)} (${sf.toLocaleString("en-US")})`,
    PREMISES_ADDRESS: `${inputs.unit} Arnould Boulevard, Lafayette, Louisiana 70506`,
    CAM_PSF: psf2(rec.cam), TAX_PSF: psf2(rec.tax), INSURANCE_PSF: psf2(rec.ins),
    SECURITY_DEPOSIT: (+inputs.deposit || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    BASE_RENT_STEP_ROWS: g.steps.map(s => `${range(s)}: ${money(s.psf)} PSF/yr — ${money(s.monthlyBase)}/mo base`).join("\n"),
    RENT_ABATEMENT_ROWS: g.abatement.length ? g.abatement.join("\n") : "NOT APPLICABLE",
    MONTHLY_RENT_SCHEDULE: g.steps.map(s =>
      `${range(s)}: ${money(s.monthlyTotal)}/mo total (base ${money(s.monthlyBase)} + NNN ${money(s.monthlyNNN)})`).join("\n"),
    "ATTACH CURRENT APPROVED PLAT OF LEASED PREMISES":
      "[TO BE ATTACHED BEFORE EXECUTION: current approved plat of the Leased Premises — see issuance checklist]",
    "ATTACH CURRENT APPROVED SITE PLAN OF COMMON AREA":
      "[TO BE ATTACHED BEFORE EXECUTION: current approved site plan of the Common Area — see issuance checklist]",
    "INCLUDE APPROVED PERSONAL GUARANTY IF REQUIRED; OTHERWISE MARK NOT APPLICABLE":
      gRequired ? "[TO BE ATTACHED BEFORE EXECUTION: approved Guaranty Agreement — see issuance checklist]" : "NOT APPLICABLE",
    "INSERT ACH AUTHORIZATION FORM AND BANKING INSTRUCTIONS":
      "[TO BE ATTACHED BEFORE EXECUTION: ACH authorization form and banking instructions — see issuance checklist]",
  };

  /* Renewal summary is informational — §31.01 text is fixed house-form language.
     Surface a mismatch hint instead of editing the clause. */
  if (String(inputs.renewalSummary || "").trim() &&
      !/three[- ]?\(?3\)?[- ]?year|3-year/i.test(inputs.renewalSummary))
    warnings.push("Renewal summary differs from §31.01's one 3-year option — §31.01 text is unchanged; amend via counsel if the deal differs.");

  const missing = manifest.tokens.filter(t => !(t in tokens));
  if (missing.length) return { ok: false, errors: ["engine does not cover template token(s): " + missing.join(", ")], warnings, tokens: {}, scheduleG: g, checklist: [] };

  const checklist = [
    "RECONCILE §2.01 exclusives against the proposed use BEFORE issuance:",
    ...EXCLUSIVES.map(e => "  · " + e),
    "COUNSEL: [LOUISIANA COUNSEL REVIEW] flags preserved in: " + COUNSEL_FLAGS.join(" · "),
    "ATTACH before execution: Schedule A plat · Schedule B site plan" +
      (gRequired ? " · Schedule E Guaranty Agreement" : "") + " · Schedule F ACH authorization form",
    "DRAFT stamp: remove only on counsel-approved execution copy.",
  ];

  return { ok: true, errors, warnings, tokens, scheduleG: g, checklist };
}
```

- [ ] **Step 4: Run tests**

Run: `node --test test/leasedoc.test.mjs`
Expected: all PASS. (The manifest-coverage test is the contract: if Task 1's manifest has a token this map misses, fix the map, not the test.)

- [ ] **Step 5: Gate + commit**

Run: `node --check src/lib/leasedoc.js && npm test`
```bash
git add src/lib/leasedoc.js test/leasedoc.test.mjs
git commit -m "Add lease document engine: tokens, Schedule G, issuance checklist

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: DOCX renderer — `src/lib/leasedocx.js`

**Files:**
- Create: `src/lib/leasedocx.js`
- Test: `test/leasedocx.test.mjs`

**Interfaces:**
- Consumes: template docx bytes (`Uint8Array`/`ArrayBuffer`), `tokens` object from `assembleLease` (Task 2).
- Produces: `mergeDocx(templateBytes, tokens)` → `Uint8Array` (valid docx). Throws `Error("unmerged tokens: …")` if any `[[…]]` survives. Also exports `leaseFileName(tokens, ext)` → `"lease-unit-131-bayou-furniture-co-llc-draft.docx"`.

- [ ] **Step 1: Write the failing test**

```js
// test/leasedocx.test.mjs
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
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test test/leasedocx.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```js
/* DOCX merge for the executable lease — pure bytes-in/bytes-out (fflate),
   usable in node tests and the browser alike. Template tokens are guaranteed
   single-run by tools/lease-template.mjs, so plain string replacement inside
   word/document.xml is exact. Tested in test/leasedocx.test.mjs. */
import { unzipSync, zipSync } from "fflate";

const xmlEsc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/* Multi-line token values (Schedule G rows) become Word line breaks. */
const xmlVal = s => xmlEsc(s).split("\n").join('</w:t><w:br/><w:t xml:space="preserve">');

export function mergeDocx(templateBytes, tokens) {
  const bytes = templateBytes instanceof Uint8Array ? templateBytes : new Uint8Array(templateBytes);
  const zip = unzipSync(bytes);
  const dec = new TextDecoder(), enc = new TextEncoder();
  let xml = dec.decode(zip["word/document.xml"]);
  xml = xml.replace(/\[\[([^\]]+)\]\]/g, (m, name) => name in tokens ? xmlVal(tokens[name]) : m);
  const left = [...xml.matchAll(/\[\[([^\]]+)\]\]/g)].map(m => m[1]);
  if (left.length) throw new Error("unmerged tokens: " + [...new Set(left)].join(", "));
  zip["word/document.xml"] = enc.encode(xml);
  return zipSync(zip);
}

export function leaseFileName(tokens, ext) {
  const slug = String(tokens.LESSEE_LEGAL_NAME || "tenant").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  return `lease-unit-${tokens.SUITE}-${slug}-draft.${ext}`;
}
```

- [ ] **Step 4: Run tests**

Run: `node --test test/leasedocx.test.mjs`
Expected: PASS. If the `<w:br/>` assertion fails, a multi-line token landed in a context that stripped it — inspect `BASE_RENT_STEP_ROWS` handling.

- [ ] **Step 5: Manual artifact check (one-time)**

Run:
```bash
node -e "
import('node:fs').then(async fs => {
  const { assembleLease } = await import('./src/lib/leasedoc.js');
  const { mergeDocx, leaseFileName } = await import('./src/lib/leasedocx.js');
  const units = JSON.parse(fs.readFileSync('src/data/units.json','utf8'));
  const rec = JSON.parse(fs.readFileSync('src/data/recoveries.json','utf8')).units['131'];
  const unit = units.find(u => u.unit === '131');
  const IN = { unit:'131', lesseeLegalName:'Sample Tenant, LLC', lesseeEntityType:'limited liability company', lesseeState:'Louisiana', lesseeNoticeAddress:'PO Box 1, Lafayette, LA 70501', lesseeEmail:'x@y.com', lesseePhone:'337-555-0100', lesseeRep:'Sam Ple', signerName:'Sam Ple', signerTitle:'Member', permittedUse:'retail sale of furniture', useStandard:'retail', executionDate:'2026-09-01', effectiveDate:'2026-09-01', commencementDate:'2026-10-01', expirationDate:'2031-09-30', additionalTermDates:'', basePsf:14.5, termMonths:60, escalationPct:3, freeRentMonths:2, constructionMonths:1, deposit:4000, renewalSummary:'', guarantyRequired:false };
  const r = assembleLease(IN, unit, rec);
  fs.writeFileSync(leaseFileName(r.tokens,'docx'), mergeDocx(fs.readFileSync('src/data/lease-template.docx'), r.tokens));
  console.log('wrote', leaseFileName(r.tokens,'docx'));
})"
```
Open the emitted docx in Word — confirm it opens clean, Schedule G rows show as separate lines, no `[[`. Then DELETE the sample file (scratch output does not belong in the repo).

- [ ] **Step 6: Gate + commit**

Run: `node --check src/lib/leasedocx.js && npm test`
```bash
git add src/lib/leasedocx.js test/leasedocx.test.mjs
git commit -m "Add DOCX merge renderer for executable lease

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: HTML renderer — `src/lib/leasedochtml.js`

**Files:**
- Create: `src/lib/leasedochtml.js`
- Test: `test/leasedochtml.test.mjs`

**Interfaces:**
- Consumes: `src/data/lease-body.json` (paragraph array, tokens intact — Task 1), `tokens` + `checklist` from `assembleLease` (Task 2), `esc` from `src/lib/format.js`.
- Produces: `leaseHtml(tokens, { checklist } = {})` → complete HTML document string (navy/white tenant-facing brand per `lease.js` BRAND pattern, `#1C2D4F` on `#F5F5F5`). DRAFT banner top; optional issuance-checklist block is OPERATOR-ONLY and rendered ONLY when `checklist` passed (the e-sign copy gets none).

- [ ] **Step 1: Write the failing test**

```js
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
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test test/leasedochtml.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```js
/* HTML rendering of the executable lease — single source is lease-body.json
   (emitted from the SAME scrubbed template as the DOCX by
   tools/lease-template.mjs), so DOCX and HTML can never drift. Tenant-facing
   navy/white brand (matches the lease.js proposal document family, NOT the
   plan-room app chrome). Tested in test/leasedochtml.test.mjs. */
import body from "../data/lease-body.json";
import { esc } from "./format.js";

const CSS = `
  body{font-family:Helvetica,Arial,sans-serif;color:#1C2D4F;margin:0;background:#F5F5F5}
  .page{max-width:8.5in;margin:0 auto;background:#fff;padding:.9in .85in}
  .bar{background:#1C2D4F;color:#F5F5F5;padding:18px 28px;display:flex;justify-content:space-between;align-items:baseline}
  .bar .wm{font-size:18px;font-weight:bold;letter-spacing:.1em}
  .draft{font-size:11px;letter-spacing:.18em;border:1px solid #F5F5F5;padding:3px 10px}
  h2{font-size:13px;letter-spacing:.06em;margin:18px 0 6px}
  p{font-size:12.5px;line-height:1.6;margin:8px 0;white-space:pre-wrap}
  .chk{background:#FFF6E8;border:1px solid #A87E2F;padding:14px 18px;margin:0 0 22px;font-size:12px}
  .chk h3{margin:0 0 8px;font-size:12px;letter-spacing:.08em;text-transform:uppercase}
  @media print{body{background:#fff}.page{padding:.4in .5in}.chk{display:none}}`;

const isHeading = t => /^(Section [\d.]*|SCHEDULE [A-G]|WITNESSETH|\[SIGNATURES)/.test(t.trim());

export function leaseHtml(tokens, { checklist } = {}) {
  const merged = body.map(p => p.replace(/\[\[([^\]]+)\]\]/g, (m, n) => n in tokens ? tokens[n] : m));
  const left = merged.join("").match(/\[\[([^\]]+)\]\]/);
  if (left) throw new Error("unmerged token in HTML: " + left[1]);
  const paras = merged.map(t => isHeading(t) ? "<h2>" + esc(t) + "</h2>" : "<p>" + esc(t) + "</p>").join("\n");
  const chk = checklist && checklist.length
    ? '<div class="chk"><h3>Issuance checklist — operator copy only</h3>' +
      checklist.map(c => "<p>" + esc(c) + "</p>").join("") + "</div>"
    : "";
  return "<!doctype html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">" +
    "<title>Lease — Unit " + esc(tokens.SUITE) + " — DRAFT</title><style>" + CSS + "</style></head><body>" +
    '<div class="bar"><span class="wm">ON THE BOULEVARD SHOPPING CENTER</span>' +
    '<span class="draft">DRAFT — SUBJECT TO LOUISIANA COUNSEL REVIEW</span></div>' +
    '<div class="page">' + chk + paras + "</div></body></html>";
}
```

- [ ] **Step 4: Run tests**

Run: `node --test test/leasedochtml.test.mjs`
Expected: PASS. Note the DOCX renderer leaves `\n` → `<w:br/>`; here `white-space:pre-wrap` handles the same multi-line token values.

- [ ] **Step 5: Gate + commit**

Run: `node --check src/lib/leasedochtml.js && npm test`
```bash
git add src/lib/leasedochtml.js test/leasedochtml.test.mjs
git commit -m "Add HTML renderer for executable lease from shared template body

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Drawer panel — `src/lib/leaseUI.js` + wiring

**Files:**
- Create: `src/lib/leaseUI.js`
- Modify: `src/views/drawer.js` (import at top near line 10; section + mount near lines 122–128)
- Test: `test/leaseui.test.mjs` (pure parts only: input harvesting/derivation helpers)

**Interfaces:**
- Consumes: `assembleLease`, `REQUIRED_INPUTS` (Task 2); `mergeDocx`, `leaseFileName` (Task 3); `leaseHtml` (Task 4); units via existing store (drawer passes `u.unit`; the panel loads unit row from `src/data/units.json` import and recoveries from `src/data/recoveries.json` import); `sb`, `REMOTE`, `propertyContext` from `./remote.js`; template bytes via `fetch(new URL("../data/lease-template.docx", import.meta.url))`.
- Produces: `mountLease(el, unit)` — mirrors `mountEsign(el, unit)` calling convention (drawer.js:128 pattern). Also exports pure `harvestInputs(formValues, unit)` → engine `inputs` object (tested).

**Panel behavior (operator-only — hide under `body.role-owner`/`body.role-tenant`/`body.role-vendor` via inline style check like esignUI's REMOTE guard):**
- Locked derived line (not inputs): `SF 1,907 · Suite 131 · 131 Arnould Blvd · CAM $2.10 / Tax $0.90 / Ins $1.00 PSF` from units.json + recoveries.json.
- Inputs (one per REQUIRED_INPUTS + optional fields): text/date/number fields with `id="lz<FieldName>"`, defaults `useStandard="retail"`, `escalationPct=0`, `freeRentMonths=0`, `constructionMonths=0`, `deposit=0`, `guarantyRequired` checkbox.
- Buttons: **⤓ DOCX** · **⤓ HTML** · **→ E-Sign** · errors/warnings/checklist rendered into a `<div id="lzMsg">` after any action.
- ⤓ DOCX: `assembleLease` → if `!ok` list errors; else fetch template bytes → `mergeDocx` → Blob download (`application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `leaseFileName(tokens,"docx")`), then render warnings + checklist.
- ⤓ HTML: same but `leaseHtml(r.tokens, { checklist: r.checklist })` → Blob download `text/html`, `leaseFileName(tokens,"html")` (operator copy carries the checklist; print CSS hides it).
- → E-Sign: signer copy `leaseHtml(r.tokens)` (NO checklist) → `sb.storage.from("documents").upload(path, blob, { contentType: "text/html", upsert: false })` with `path = unit + "/" + newId + "__" + leaseFileName(tokens,"html")` (matches `filePath()` convention in bucketstore.js:25; confirm the bucket name used by the documents record store — expected `"documents"` — by checking the `createBucketStore({ bucket: … })` call for documents before wiring) → insert `esign_requests` row exactly like esignUI.js:87–93: `{ id, org_id, property_id, unit, title: "Lease — Unit " + unit + " — " + lesseeLegalName + " (DRAFT)", signer_email, signer_name: signerName, doc_path: path, expires_at: +14 days }` → message "Signing request created — copy the link from the E-Sign panel below." (The E-Sign panel remains the send/track surface; this stays inside the app-sends-nothing boundary.)
- Local mode (`!REMOTE`): downloads work (template + JSON are bundled); → E-Sign renders the esignUI local-mode note instead.

- [ ] **Step 1: Write the failing test for the pure helper**

```js
// test/leaseui.test.mjs — pure parts of the drawer lease panel only (no DOM).
import test from "node:test";
import assert from "node:assert/strict";
import { harvestInputs } from "../src/lib/leaseUI.js";

test("harvestInputs maps form values to engine inputs with numeric coercion + defaults", () => {
  const v = {
    lesseeLegalName: " Bayou Furniture Co, LLC ", lesseeEntityType: "limited liability company",
    lesseeState: "Louisiana", lesseeNoticeAddress: "PO Box 1", lesseeEmail: "j@b.com",
    lesseePhone: "337-555-0100", lesseeRep: "Jane Doe", signerName: "Jane Doe", signerTitle: "Member",
    permittedUse: "retail sale of furniture", useStandard: "", executionDate: "2026-09-01",
    effectiveDate: "2026-09-01", commencementDate: "2026-10-01", expirationDate: "2031-09-30",
    additionalTermDates: "", basePsf: "14.5", termMonths: "60", escalationPct: "",
    freeRentMonths: "2", constructionMonths: "", deposit: "4000", renewalSummary: "", guarantyRequired: true,
  };
  const i = harvestInputs(v, "131");
  assert.equal(i.unit, "131");
  assert.equal(i.lesseeLegalName, "Bayou Furniture Co, LLC"); // trimmed
  assert.equal(i.useStandard, "retail");                       // default
  assert.equal(i.basePsf, 14.5);                               // number
  assert.equal(i.escalationPct, 0);                            // "" → 0
  assert.equal(i.guarantyRequired, true);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test test/leaseui.test.mjs`
Expected: FAIL — module not found. (Import of leaseUI.js must not pull DOM at module top-level — keep all DOM inside functions, same as esignUI.js.)

- [ ] **Step 3: Implement `src/lib/leaseUI.js`**

Structure (follow esignUI.js conventions — REMOTE guard, `esc`, chip buttons, `led-note` messages):

```js
/* Unit-drawer "Lease" panel — deterministic operator form over the pure
   engine (leasedoc.js). Generates the executable-lease DOCX + HTML and can
   hand the signer HTML to the existing e-sign rail. Operator-only surface;
   the app sends nothing. Pure input harvesting tested in test/leaseui.test.mjs. */
import { REMOTE, sb, propertyContext } from "./remote.js";
import { esc } from "./format.js";
import { assembleLease } from "./leasedoc.js";
import { mergeDocx, leaseFileName } from "./leasedocx.js";
import { leaseHtml } from "./leasedochtml.js";
import units from "../data/units.json";
import recoveries from "../data/recoveries.json";

const NUM = ["basePsf", "termMonths", "escalationPct", "freeRentMonths", "constructionMonths", "deposit"];
export function harvestInputs(v, unit) {
  const i = { unit };
  for (const [k, val] of Object.entries(v)) {
    if (k === "guarantyRequired") i[k] = !!val;
    else if (NUM.includes(k)) i[k] = val === "" || val == null ? 0 : +val;
    else i[k] = String(val ?? "").trim();
  }
  if (!i.useStandard) i.useStandard = "retail";
  return i;
}

function download(bytes, name, type) {
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click(); setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function mountLease(el, unit) {
  if (!el) return;
  const u = units.find(x => String(x.unit) === String(unit));
  const rec = recoveries.units[String(unit)];
  if (!u || !rec) { el.innerHTML = '<div class="led-note">No unit/recovery data — cannot assemble.</div>'; return; }
  // …form fields (id="lz"+field), locked derived line, three buttons, #lzMsg…
  // ⤓ DOCX: const r = assembleLease(harvestInputs(readForm(el), unit), u, rec);
  //   if (!r.ok) → list errors; else fetch(new URL("../data/lease-template.docx", import.meta.url))
  //   → arrayBuffer → mergeDocx → download(bytes, leaseFileName(r.tokens,"docx"), DOCX_MIME)
  //   → render warnings + checklist into #lzMsg.
  // ⤓ HTML: download(leaseHtml(r.tokens,{checklist:r.checklist}), …, "text/html").
  // → E-Sign (REMOTE only): upload signer copy leaseHtml(r.tokens) to the documents
  //   bucket, insert esign_requests row (esignUI.js shape), confirm in #lzMsg.
}
```

The full form/mount body follows the esignUI.js pattern exactly (innerHTML string, `el.querySelector` handlers). Fields render in three groups with `led-note` captions: "Lessee", "Deal terms", "Dates". Keep the whole module under ~200 lines.

- [ ] **Step 4: Run the pure test**

Run: `node --test test/leaseui.test.mjs`
Expected: PASS.

- [ ] **Step 5: Wire the drawer**

In `src/views/drawer.js`:
- Line ~10: `import { mountLease } from "../lib/leaseUI.js";`
- In the body template (line ~122), insert **above** the E-Sign section:
  `'<div class="dw-sec">Lease</div><div class="led" id="dwLease"></div>' +`
- After `mountEsign(...)` (line ~128): `mountLease(body.querySelector("#dwLease"), u.unit);`

- [ ] **Step 6: Verify in the app**

Run: `node --check src/lib/leaseUI.js && node --check src/views/drawer.js && npm test && npm run build`
Then start vite in background Bash (NOT preview_start{name} — stale-root lesson) and open the local preview: unit drawer → Lease panel renders, fill the sample tenant, ⤓ DOCX downloads and opens in Word, ⤓ HTML downloads and renders with DRAFT bar + checklist box, console clean. (→ E-Sign is REMOTE-only; local shows the note.)

- [ ] **Step 7: Commit**

```bash
git add src/lib/leaseUI.js src/views/drawer.js test/leaseui.test.mjs
git commit -m "Add Lease panel to unit drawer: generate DOCX/HTML, hand to e-sign

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Full gate, deploy, prod smoke

**Files:**
- None new. Verification + deploy only.

**Interfaces:**
- Consumes: everything above.
- Produces: deployed prod bundle (deployed means done — operator checks the live URL).

- [ ] **Step 1: Full local gate**

Run: `npm test` (expect prior count + ~15 new, all pass) then `npm run build` (clean).

- [ ] **Step 2: Deploy**

Run: `npx vercel --prod` from the repo root (same drill as prior sessions; aliases to orangeoceanatlas.com).

- [ ] **Step 3: Prod smoke**

- Bundle grep: fetch the deployed JS bundle and grep for `assembleLease`/`dwLease`/`lease-template` asset hash — confirms the code shipped.
- `curl -sI` the hashed `lease-template.docx` asset URL from the bundle → HTTP 200.

- [ ] **Step 4: Report operator smoke**

Tell the operator (do not perform for them): *open any unit drawer → Lease → fill sample → ⤓ DOCX opens in Word with Schedule G rows · ⤓ HTML shows DRAFT bar + checklist · → E-Sign creates a request visible in the E-Sign panel below (cancel it after).*

---

## Self-review (done at plan-writing time)

- **Spec coverage:** DOCX output (T1+T3) · HTML output (T4) · e-sign handoff (T5) · pure engine + Schedule G auto-compute (T2) · PII scrub + tokenization (T1) · checklist-not-clause-rewriting (T2) · schedules C/D static, A/B/E/F placeholders + toggle (T1 markers + T2 tokens) · counsel flags preserved (T1 body + T4 test) · error handling (T2 validation, T3 throw, T5 form blocking) · testing section (all tasks) · v1 fences respected (no AI caller, no auto-send, no binary attachments).
- **Placeholder scan:** Task 5 Step 3 shows the module skeleton with the three handlers specified by exact call sequence rather than full 200-line innerHTML; every referenced function exists with exact signatures in Tasks 2–4 — acceptable, no TBDs.
- **Type consistency:** `assembleLease(inputs, unit, rec)` / `mergeDocx(templateBytes, tokens)` / `leaseHtml(tokens, {checklist})` / `mountLease(el, unit)` / `harvestInputs(v, unit)` used identically across tasks. Token names in T2 map = T1 manifest expectations = T3/T4 assertions.
