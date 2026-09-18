/* Audit-grade property facts — pure seam over geometry.json + instruments.json.
   Views (D-1 KPI, W-1 seeded cards, T-1 timeline) derive every parking number,
   instrument date, and covenant line from here; no fact literal may live in a
   render function (carry-forward problem #4 from the 2026-07-22 extraction).
   Convention: cite PARKING.provided (324) legally; plan ops on PARKING.drawn
   (314) — see docs/parking-reconciliation-memo.md. */
import geometry from "../data/geometry.json" with { type: "json" };
import instruments from "../data/instruments.json" with { type: "json" };
import pylon from "../data/pylon.json" with { type: "json" };

const v = geometry.parking.variance;

export const PARKING = Object.freeze({
  entry: v.entry,               // "99-11797"
  provided: v.provided,         // 324 — the legal citation
  required: v.required,         // 344
  drawn: geometry.parking.totalPlat, // 314 — plat striping, plan ops on this
  delta: geometry.parking.totalPlat - v.provided // −10 unreconciled
});

export const JD_BANK = Object.freeze({ ...instruments.jdBank });
export const HVAC_149 = Object.freeze({ ...instruments.hvac149 });
export const EXCLUSIVES = Object.freeze(instruments.exclusives.map(e => Object.freeze({ ...e })));
/* 2019 Broussard MAI appraisal (register row #19, F-5 2026-09-11) — figures
   from the AC archive row; the PDF stays in AC storage until F-9. Historical
   reference: S-1 "Valuation on file" line + P-1 cap-rate hint, never a value
   the app computes with. */
export const APPRAISAL_2019 = Object.freeze({ ...instruments.appraisal2019 });
/* Recorded instruments of record — the 13 title exceptions from the AC
   archive, verbatim (ruling D-19a option 1, 2026-09-17). K-1 renders them
   as a register block; registerDoc links the ones already carried as
   documents. Reconcile against the owner title policy when it is ordered. */
export const TITLE_EXCEPTIONS = Object.freeze(instruments.titleExceptions.items.map(e => Object.freeze({ ...e })));
/* Monument-sign panel register (ruling D-19b option 1, 2026-09-17): panel →
   unit → status as data; tools/pylon.py reads the same file. */
export const PYLON = Object.freeze({ ...pylon.sign, panels: Object.freeze(pylon.panels.map(p => Object.freeze({ ...p }))) });

const usd0 = n => "$" + Math.round(+n || 0).toLocaleString("en-US");
const mdy = iso => new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

/* Card/timeline prose — plain strings (no HTML; callers escape/format). */
export const factLines = {
  parkingRecon: () =>
    "Plat striping " + PARKING.drawn + " vs variance " + PARKING.provided +
    " — pull file " + PARKING.entry + " (see reconciliation memo)",
  parkingReconTitle: () =>
    "Reconcile parking Δ" + (PARKING.delta < 0 ? "−" : "+") + Math.abs(PARKING.delta),
  jdBankExpiry: () =>
    "Belle loses " + JD_BANK.spaces + " spaces + $" + JD_BANK.monthlyToBelle +
    "/mo — re-run parking vs variance well before",
  jdBankTimeline: () =>
    "Belle loses " + JD_BANK.spaces + " bank spaces; $" + JD_BANK.monthlyToBelle +
    "/mo income ends",
  jdBankTimelineSub: () =>
    "Re-run parking count vs variance " + PARKING.entry + " well before this date",
  hvac149: () =>
    HVAC_149.clause + " — monthly PM contract with " + HVAC_149.contractor +
    " must stay active",
  exclusivesTitle: () =>
    "Exclusive-use watch — " + EXCLUSIVES.map(e => e.tenant).join(" vs "),
  exclusivesDetail: () =>
    EXCLUSIVES.map(e => e.unit + " (" + e.signed + ")").join(" vs ") +
    " — screen new " + EXCLUSIVES.map(e => e.watch).join(" / ") + " uses",
  appraisal2019: () =>
    "Valuation on file — 2019 appraisal (" + APPRAISAL_2019.appraiser.split(",")[0] + ", MAI): as-is " +
    usd0(APPRAISAL_2019.asIsValue) + " · NOI " + usd0(APPRAISAL_2019.noi) + " · cap " +
    APPRAISAL_2019.capRatePct.toFixed(2) + "% · effective " + mdy(APPRAISAL_2019.effectiveDate) +
    " · income " + usd0(APPRAISAL_2019.incomeApproachValue) + " / sales " + usd0(APPRAISAL_2019.salesComparisonValue) +
    " / cost " + usd0(APPRAISAL_2019.costApproachValue) + " · historical reference only",
  capRateHint: () =>
    APPRAISAL_2019.capRatePct.toFixed(2) + "% per 2019 appraisal (" + APPRAISAL_2019.appraiser.split(",")[0] +
    ", MAI, " + mdy(APPRAISAL_2019.effectiveDate) + ") — reference only; enter today's market cap rate"
};
