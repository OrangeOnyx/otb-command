/* Audit-grade property facts — pure seam over geometry.json + instruments.json.
   Views (D-1 KPI, W-1 seeded cards, T-1 timeline) derive every parking number,
   instrument date, and covenant line from here; no fact literal may live in a
   render function (carry-forward problem #4 from the 2026-07-22 extraction).
   Convention: cite PARKING.provided (324) legally; plan ops on PARKING.drawn
   (314) — see docs/parking-reconciliation-memo.md. */
import geometry from "../data/geometry.json" with { type: "json" };
import instruments from "../data/instruments.json" with { type: "json" };

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
    " — screen new " + EXCLUSIVES.map(e => e.watch).join(" / ") + " uses"
};
