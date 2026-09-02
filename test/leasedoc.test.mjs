import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  numberToWords, longDate, scheduleG, assembleLease, REQUIRED_INPUTS, EXCLUSIVES,
  monthSpan, money, psf2,
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
  // Step PSF is rounded to cents BEFORE deriving monthlyBase: the raw
  // 14.5 * 1.03 = 14.935 rounds to 14.94, not the unrounded float.
  assert.equal(g.steps[1].psf, 14.94);
  assert.ok(Math.abs(g.steps[1].monthlyBase - 1907 * 14.94 / 12) < 1e-9);
  assert.ok(Math.abs(g.steps[0].monthlyTotal - (g.steps[0].monthlyBase + g.steps[0].monthlyNNN)) < 0.01);
  assert.equal(g.abatement.length, 2); // construction month + free-rent months
  assert.match(g.abatement[1], /NNN|CAM/i);   // NNN stays payable during base abatement
});

test("scheduleG: printed PSF × RSF ÷ 12 equals printed monthly base to the cent", () => {
  const g = scheduleG(IN, 1907, REC);
  for (const s of g.steps) {
    const recomputed = Number(psf2(s.psf)) * 1907 / 12;
    assert.equal(money(recomputed), money(s.monthlyBase),
      `step ${s.fromMonth}-${s.toMonth}: printed PSF × RSF ÷ 12 must match printed monthly base`);
  }
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

test("assembleLease: termMonths: 0 → error", () => {
  const r = assembleLease({ ...IN, termMonths: 0 }, UNIT, REC);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some(e => e.includes("termMonths")));
});

test("assembleLease: termMonths: -12 → error", () => {
  const r = assembleLease({ ...IN, termMonths: -12 }, UNIT, REC);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some(e => e.includes("termMonths")));
});

test("assembleLease: termMonths: 60.5 (not a whole number) → error", () => {
  const r = assembleLease({ ...IN, termMonths: 60.5 }, UNIT, REC);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some(e => e.includes("termMonths") && /whole number/.test(e)));
});

test("assembleLease: freeRentMonths 24 > termMonths 12 → error", () => {
  const r = assembleLease({ ...IN, termMonths: 12, freeRentMonths: 24 }, UNIT, REC);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some(e => e.includes("freeRentMonths") && /exceed the term/.test(e)));
});

test("assembleLease: commencement/expiration span matches termMonths (60/60) → no span warning", () => {
  const r = assembleLease(IN, UNIT, REC); // commencementDate 2026-10-01, expirationDate 2031-09-30, termMonths 60
  assert.equal(r.ok, true, r.errors.join("; "));
  assert.ok(!r.warnings.some(w => /Term dates span/.test(w)));
});

test("assembleLease: commencement/expiration span mismatches termMonths → warning", () => {
  const r = assembleLease({ ...IN, expirationDate: "2030-09-30" }, UNIT, REC); // spans 48 months, termMonths still 60
  assert.equal(r.ok, true, r.errors.join("; "));
  assert.ok(r.warnings.some(w => /Term dates span 48 months but termMonths is 60/.test(w)));
});

test("monthSpan: 2026-10-01 to 2031-09-30 (full 5-year term ending last day of month) = 60", () => {
  assert.equal(monthSpan("2026-10-01", "2031-09-30"), 60);
});

test("monthSpan: unparseable input returns null", () => {
  assert.equal(monthSpan("", "2031-09-30"), null);
  assert.equal(monthSpan("2026-10-01", ""), null);
});

test("assembleLease: basePsf: 0 → error", () => {
  const r = assembleLease({ ...IN, basePsf: 0 }, UNIT, REC);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some(e => e.includes("basePsf")));
});

test("assembleLease: basePsf: -5 → error", () => {
  const r = assembleLease({ ...IN, basePsf: -5 }, UNIT, REC);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some(e => e.includes("basePsf")));
});

test("assembleLease: escalationPct: 'abc' (NaN) → error", () => {
  const r = assembleLease({ ...IN, escalationPct: "abc" }, UNIT, REC);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some(e => e.includes("escalationPct")));
});

test("assembleLease: freeRentMonths: -1 → error", () => {
  const r = assembleLease({ ...IN, freeRentMonths: -1 }, UNIT, REC);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some(e => e.includes("freeRentMonths")));
});

test("assembleLease: constructionMonths: -2 → error", () => {
  const r = assembleLease({ ...IN, constructionMonths: -2 }, UNIT, REC);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some(e => e.includes("constructionMonths")));
});

test("assembleLease: deposit: 'xyz' (NaN) → error", () => {
  const r = assembleLease({ ...IN, deposit: "xyz" }, UNIT, REC);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some(e => e.includes("deposit")));
});

test("assembleLease: negative rec.cam → error", () => {
  const r = assembleLease(IN, UNIT, { cam: -1, tax: 0.9, ins: 1.0 });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some(e => e.includes("recoveries")));
});

test("assembleLease: rec all-zero (vacant, no recovery history) → ok, with $0.00 NNN warning", () => {
  const r = assembleLease(IN, UNIT, { cam: 0, tax: 0, ins: 0 });
  assert.equal(r.ok, true, r.errors.join("; "));
  assert.ok(r.warnings.some(w => /NNN charges are \$0\.00/i.test(w)));
});

/* Operator rule (punch-list SMK-3 note, 2026-09-01): abatement months abate
   BASE RENT ONLY — additional rent (CAM/Tax/Ins) remains payable; the printed
   monthly schedule must show that split so a tenant's arithmetic matches the
   abatement rider. Construction months precede Commencement and never appear
   in the paid schedule. */
test("scheduleG monthly: abated months bill NNN only, remainder unchanged", () => {
  const g = scheduleG(IN, 1907, REC); // freeRentMonths: 2
  assert.equal(g.monthly[0].fromMonth, 1);
  assert.equal(g.monthly[0].toMonth, 2);
  assert.equal(g.monthly[0].abated, true);
  assert.equal(g.monthly[0].monthlyBase, 0);
  assert.ok(Math.abs(g.monthly[0].monthlyTotal - g.monthly[0].monthlyNNN) < 1e-9);
  assert.equal(g.monthly[1].fromMonth, 3);
  assert.equal(g.monthly[1].toMonth, 12);
  assert.equal(g.monthly[1].abated, false);
  assert.ok(Math.abs(g.monthly[1].monthlyTotal - (g.steps[0].monthlyBase + g.steps[0].monthlyNNN)) < 1e-9);
  // later steps untouched by the split
  assert.equal(g.monthly.length, g.steps.length + 1);
  assert.equal(g.monthly[2].fromMonth, 13);
});

test("scheduleG monthly: no abatement = rows mirror the steps exactly", () => {
  const g = scheduleG({ ...IN, freeRentMonths: 0 }, 1907, REC);
  assert.equal(g.monthly.length, g.steps.length);
  assert.ok(g.monthly.every(r => !r.abated));
  assert.equal(g.monthly[0].fromMonth, 1);
  assert.equal(g.monthly[0].toMonth, 12);
});

test("scheduleG monthly: abatement spanning a whole first step", () => {
  const g = scheduleG({ ...IN, termMonths: 24, freeRentMonths: 12 }, 1907, REC);
  assert.equal(g.monthly[0].toMonth, 12);
  assert.equal(g.monthly[0].abated, true);
  assert.equal(g.monthly[1].fromMonth, 13);
  assert.equal(g.monthly[1].abated, false);
  assert.equal(g.monthly.length, 2);
});

test("assembleLease: MONTHLY_RENT_SCHEDULE prints the abatement split", () => {
  const r = assembleLease(IN, UNIT, REC);
  assert.equal(r.ok, true);
  assert.match(r.tokens.MONTHLY_RENT_SCHEDULE, /Months 1–2: .*Base Rent abated — additional rent only/);
  assert.match(r.tokens.MONTHLY_RENT_SCHEDULE, /Months 3–12: .*\/mo total \(base /);
  const none = assembleLease({ ...IN, freeRentMonths: 0 }, UNIT, REC);
  assert.ok(!/Base Rent abated/.test(none.tokens.MONTHLY_RENT_SCHEDULE));
});
