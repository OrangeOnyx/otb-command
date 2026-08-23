/* Lease document engine (executable lease, house form v2.2) — pure: no DOM,
   no network. assembleLease() maps inputs + unit + recoveries onto the token
   manifest of src/data/lease-template.docx and computes Schedule G. Renderers
   (leasedocx.js / leasedochtml.js) and the drawer panel (leaseUI.js) are thin
   callers. AI-1 is a documented FUTURE caller — nothing here may depend on it.
   Spec: docs/superpowers/specs/2026-08-22-lease-assembler-design.md.
   Tested in test/leasedoc.test.mjs. */
import manifest from "../data/lease-manifest.json" with { type: "json" };

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

/* Whole calendar months between two YYYY-MM-DD dates, counting the
   expiration month inclusively when the expiration date is that month's
   last day (the standard lease convention: commence the 1st, expire on the
   last day of the Nth month later). Returns null on unparseable input. */
export function monthSpan(startIso, endIso) {
  const s = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startIso || "");
  const e = /^(\d{4})-(\d{2})-(\d{2})$/.exec(endIso || "");
  if (!s || !e) return null;
  const sy = +s[1], sm = +s[2];
  const ey = +e[1], em = +e[2], ed = +e[3];
  let months = (ey - sy) * 12 + (em - sm);
  const lastDayOfEndMonth = new Date(ey, em, 0).getDate();
  if (ed >= lastDayOfEndMonth) months += 1;
  return months;
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
    /* Round the escalated step PSF to cents FIRST, then derive monthlyBase
       from that rounded value — otherwise the printed "PSF × RSF ÷ 12" a
       tenant can check with a calculator drifts a few cents from the
       printed monthly base, which is computed from the unrounded float. */
    const psf = Math.round(inputs.basePsf * Math.pow(1 + esc, yr) * 100) / 100;
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
  else {
    for (const k of ["cam", "tax", "ins"]) {
      const v = +rec[k];
      if (!Number.isFinite(v) || v < 0) { errors.push("recoveries: CAM/Tax/Ins must be non-negative numbers"); break; }
    }
  }
  for (const k of REQUIRED_INPUTS) {
    const v = inputs?.[k];
    if (v === undefined || v === null || String(v).trim() === "") errors.push(k + ": required");
  }
  for (const k of ["executionDate", "effectiveDate", "commencementDate", "expirationDate"])
    if (inputs?.[k] && !longDate(inputs[k])) errors.push(k + ": must be YYYY-MM-DD");

  // Numeric field validation
  const termMonths = +inputs?.termMonths;
  if (!Number.isFinite(termMonths) || !Number.isInteger(termMonths) || termMonths < 1)
    errors.push("termMonths: must be a whole number of months >= 1");

  const basePsf = +inputs?.basePsf;
  if (!Number.isFinite(basePsf) || basePsf <= 0)
    errors.push("basePsf: must be a positive number");

  for (const k of ["escalationPct", "freeRentMonths", "constructionMonths", "deposit"]) {
    if (inputs?.[k] !== undefined && inputs?.[k] !== null && String(inputs[k]).trim() !== "") {
      const v = +inputs[k];
      if (!Number.isFinite(v) || v < 0)
        errors.push(k + ": must be a non-negative number");
    }
  }

  const freeRentMonths = +inputs?.freeRentMonths;
  if (Number.isFinite(freeRentMonths) && Number.isFinite(termMonths) && freeRentMonths > termMonths)
    errors.push("freeRentMonths: cannot exceed the term");

  if (errors.length) return { ok: false, errors, warnings, tokens: {}, scheduleG: null, checklist: [] };

  if (!(+inputs.deposit > 0)) warnings.push("Security deposit is $0 — confirm intentional (§35.01).");
  if ((+rec.cam || 0) + (+rec.tax || 0) + (+rec.ins || 0) === 0)
    warnings.push("NNN charges are $0.00 — confirm intentional.");

  const dateSpan = monthSpan(inputs.commencementDate, inputs.expirationDate);
  if (dateSpan !== null && dateSpan !== termMonths)
    warnings.push(`Term dates span ${dateSpan} months but termMonths is ${termMonths} — confirm §3.01 vs Schedule G.`);

  const sf = +unit.sf;
  const g = scheduleG(inputs, sf, rec);
  if (g.steps.length === 0) return { ok: false, errors: ["rent schedule: zero-length term produces no rent steps"], warnings, tokens: {}, scheduleG: g, checklist: [] };
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
