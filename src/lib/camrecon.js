/* CAM / Tax / Insurance reconciliation model (register row #6 — F-2 v2).
   Pure module — no DOM, no network; P-1 injects UNITS, recoveries.json, the
   operator's OpEx worksheet actuals, the prior-year worksheet
   (financials.opexYears[year-1]) and the per-unit recovery terms
   (src/data/recovery-terms.json).

   Model (annual, calendar-year reconciliation — a what-if surface, NOT a
   billing engine):
   - Worksheet actuals per component: opexActuals = { cam, taxes, insurance }
     (annual $ from the P-1 NOI worksheet; OPEX_LINES keys).
   - Gross-up applies to CAM ONLY (industry norm); taxes and insurance are
     never grossed. Factor: when opts.grossUpPct is absent/null it is DERIVED
     by calc/grossup.js from actual occupancy (occupied SF / GLA) to the
     stipulated 95% (never below 1.0); a numeric grossUpPct is an operator
     override (0 = bill CAM at actual). `methodology` is statement-ready prose.
   - Billed recovery income per component = Σ over OCCUPIED units
     (status !== "vacant") of recoveries.units[unit].{cam|tax|ins} PSF × SF —
     the same math P-1's income-composition panel uses. A unit whose PSF row
     is missing or carries nulls bills 0 here and is flagged
     recoveriesKnown:false (no true-up is stated for it).
   - Pro-rata convention per the lease abstracts ("Pro Rata Portion"):
     unit share = unit SF / GLA (62,883 SF, audit-grade — GLA_SF below; the
     rent roll's 27 suites sum to 62,810 SF, the 73 SF difference is
     unassigned common area and is deliberately NOT redistributed).
     Per-unit actualShare = grossed grand total × share; delta = billed −
     actualShare (v1 sign, positive = over-collected).
   - Caps (terms[unit], see recovery-terms.json): capApplies when a capPct is
     on file AND the lease year ≥ capFromLeaseYear. Lease year = year −
     commencement year + 1 (the lease year in effect on Dec 31 of the
     reconciliation year; leaseYearAt below) — unknown start → cap not
     applied. With prior-year actuals on file, each capped component's share
     is limited to priorShare × (1 + capPct); uncapped components stay at
     actual share. cappedShare = Σ (null when the cap cannot be applied);
     trueUp = (cappedShare ?? actualShare) − billed (positive = tenant owes,
     negative = credit). Prior-year shares are grossed with the SAME factor
     as the current year (prior occupancy is not on file) and use full-year
     actuals — partial first years are not prorated (caveat).
   - vacancyShortfall = grossed grand total × (vacant SF / GLA) — the share
     no tenant reimburses; the landlord absorbs it.
   - Returns null when all three actuals are 0 (worksheet empty) so the
     panel stays quiet.

   reconCaveats(model) returns only the caveats that still apply to that
   model (base-year stop clauses are unmodeled — none are recorded; prior-
   year actuals absent; unknown lease starts; unknown recovery PSF).
   Tested in test/camrecon.test.mjs. */

import { grossUp } from "./calc/grossup.js";

/* Audit-grade property fact: GLA 62,883 SF · 27 demised units (do not
   contradict). Denominator for every pro-rata share below. */
export const GLA_SF = 62883;
export const TARGET_OCCUPANCY = 0.95;

/* Component wiring: worksheet key (OPEX_LINES) ↔ recoveries.json PSF key. */
export const COMPONENTS = [
  { key: "cam", label: "CAM", opexKey: "cam", recKey: "cam", grossable: true },
  { key: "tax", label: "Real estate taxes", opexKey: "taxes", recKey: "tax", grossable: false },
  { key: "ins", label: "Insurance", opexKey: "insurance", recKey: "ins", grossable: false },
];

const round2 = n => Math.round(n * 100) / 100;
const intOrNull = v => (v === null || v === undefined || v === "" || !Number.isInteger(+v)) ? null : +v;
const pctLabel = p => (Math.round(p * 1000) / 10) + "%";

/* Lease year in effect on Dec 31 of `year` for a lease commencing `startISO`
   (YYYY-MM-DD). 1 = commencement year; 0 or negative = not yet commenced;
   null when either input is unknown. */
export function leaseYearAt(startISO, year) {
  const y = intOrNull(year);
  if (y === null) return null;
  const s = String(startISO || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return y - +s.slice(0, 4) + 1;
}

function grossUpPlan(camActual, occupiedSf, glaSf, grossUpPct) {
  const occupancy = glaSf ? occupiedSf / glaSf : 0;
  const occPct = Math.round(occupancy * 100) + "%";
  if (grossUpPct !== null && grossUpPct !== undefined && Number.isFinite(+grossUpPct)) {
    const pct = Math.max(0, +grossUpPct);
    const factor = 1 + pct / 100;
    const methodology = pct === 0
      ? "CAM is billed at actual cost — no gross-up applied (operator override; actual occupancy " + occPct + "). " +
        "Real estate taxes and insurance are billed at actual cost and are not grossed up."
      : "Variable CAM expenses are grossed up by " + pct + "% (operator override; actual occupancy " + occPct +
        ", factor " + round2(factor) + "). Real estate taxes and insurance are billed at actual cost and are not grossed up.";
    return { grossUpPct: pct, grossUpFactor: factor, grossUpDerived: false, occupancy, methodology,
      grossedCam: round2(camActual * factor) };
  }
  if (!(occupancy > 0 && occupancy <= 1)) {
    return { grossUpPct: null, grossUpFactor: 1, grossUpDerived: true, occupancy, grossedCam: round2(camActual),
      methodology: "Occupancy could not be determined from the rent roll; CAM is billed at actual cost with no gross-up. " +
        "Real estate taxes and insurance are billed at actual cost and are not grossed up." };
  }
  const r = grossUp([{ label: "CAM", actualAmount: camActual, kind: "variable" }], occupancy, TARGET_OCCUPANCY);
  return { grossUpPct: null, grossUpFactor: Math.max(1, TARGET_OCCUPANCY / occupancy), grossUpDerived: true,
    occupancy, methodology: r.methodology, grossedCam: r.lines[0].grossedAmount };
}

export function reconModel(units, recoveries, opexActuals, {
  grossUpPct = null, glaSf = GLA_SF, year = null, priorOpex = null, terms = null, leaseYearOf = null,
} = {}) {
  const acts = opexActuals || {};
  const actualOf = (src, c) => Math.max(0, +src[c.opexKey] || 0);
  if (COMPONENTS.every(c => actualOf(acts, c) === 0)) return null; // worksheet empty — stay quiet

  const all = units || [];
  const occ = all.filter(u => u.status !== "vacant");
  const occupiedSf = occ.reduce((s, u) => s + (+u.sf || 0), 0);
  const vacantSf = all.filter(u => u.status === "vacant").reduce((s, u) => s + (+u.sf || 0), 0);
  const recUnits = (recoveries && recoveries.units) || {};
  const psf = (u, key) => +((recUnits[u.unit] || {})[key]) || 0;
  const known = u => COMPONENTS.every(c => Number.isFinite(+((recUnits[u.unit] || {})[c.recKey])) &&
    (recUnits[u.unit] || {})[c.recKey] !== null);

  const camActual = actualOf(acts, COMPONENTS[0]);
  const gu = grossUpPlan(camActual, occupiedSf, glaSf, grossUpPct);

  const prior = priorOpex && typeof priorOpex === "object" ? priorOpex : null;
  const hasPrior = !!prior && COMPONENTS.some(c => actualOf(prior, c) > 0);
  const recYear = intOrNull(year);
  const priorYear = recYear === null ? null : recYear - 1;

  const components = {};
  let tActual = 0, tGrossed = 0, tBilled = 0, tPriorGrossed = 0;
  for (const c of COMPONENTS) {
    const actual = actualOf(acts, c);
    const grossed = c.grossable ? gu.grossedCam : actual; // CAM only
    const billed = occ.reduce((s, u) => s + psf(u, c.recKey) * (+u.sf || 0), 0);
    const priorActual = hasPrior ? actualOf(prior, c) : null;
    const priorGrossed = hasPrior ? (c.grossable ? round2(priorActual * gu.grossUpFactor) : priorActual) : null;
    components[c.key] = { actual, grossed, billed, delta: billed - grossed, priorActual, priorGrossed };
    tActual += actual; tGrossed += grossed; tBilled += billed; tPriorGrossed += priorGrossed || 0;
  }
  const totals = { actual: tActual, grossed: tGrossed, billed: tBilled, delta: tBilled - tGrossed,
    priorGrossed: hasPrior ? tPriorGrossed : null, trueUp: 0 };
  const vacancyShortfall = tGrossed * (glaSf ? vacantSf / glaSf : 0);

  const termsOf = u => (terms && terms[u.unit] && typeof terms[u.unit] === "object") ? terms[u.unit] : null;

  const unitRows = occ.map(u => {
    const sf = +u.sf || 0;
    const share = glaSf ? sf / glaSf : 0;
    const t = termsOf(u);
    const capPct = t && Number.isFinite(+t.capPct) && +t.capPct > 0 ? +t.capPct : null;
    const capFrom = t && Number.isInteger(+t.capFromLeaseYear) ? +t.capFromLeaseYear : 1;
    const capComponents = new Set(capPct !== null && Array.isArray(t.capComponents) ? t.capComponents : []);
    const leaseYear = leaseYearOf ? leaseYearOf(u, recYear) : leaseYearAt(u.start, recYear);
    const lyNum = Number.isInteger(leaseYear) ? leaseYear : null;

    let capApplies = false, capReason;
    if (capPct === null) capReason = "no cap on file";
    else if (recYear === null) capReason = pctLabel(capPct) + " cap on file — reconciliation year not set";
    else if (lyNum === null) capReason = pctLabel(capPct) + " cap on file — lease year unknown (no commencement date on the roll), not applied";
    else if (lyNum < 1) capReason = pctLabel(capPct) + " cap on file — lease not yet commenced in " + recYear + ", not applied";
    else if (lyNum < capFrom) capReason = pctLabel(capPct) + " cap on file — lease year " + lyNum + ", cap starts lease year " + capFrom + ", not applied";
    else capApplies = true;

    const lines = {};
    let billed = 0, actualShare = 0, priorShare = 0, cappedShare = 0;
    for (const c of COMPONENTS) {
      const comp = components[c.key];
      const b = psf(u, c.recKey) * sf;
      const a = comp.grossed * share;
      const p = hasPrior ? comp.priorGrossed * share : null;
      const capped = capApplies && hasPrior && capComponents.has(c.key) ? Math.min(a, p * (1 + capPct)) : a;
      lines[c.key] = { billed: b, actualShare: a, priorShare: p, cappedShare: capApplies && hasPrior ? capped : null,
        capped: capApplies && hasPrior && capComponents.has(c.key) };
      billed += b; actualShare += a; priorShare += p || 0; cappedShare += capped;
    }
    const recoveriesKnown = known(u);
    const capComputed = capApplies && hasPrior;
    const capBinding = capComputed && cappedShare < actualShare - 1e-9;
    if (capApplies) {
      capReason = !hasPrior
        ? pctLabel(capPct) + " cap applies (lease year " + lyNum + ") — prior-year actuals not on file, not applied"
        : pctLabel(capPct) + " cap over " + priorYear + " actuals applied (lease year " + lyNum + ") — " +
          (capBinding ? "cap binding" : "within cap");
    }
    const owed = capComputed ? cappedShare : actualShare;
    const trueUp = recoveriesKnown ? owed - billed : null;
    return {
      unit: u.unit, dba: u.dba, sf, share, leaseYear: lyNum,
      billed, actualShare, delta: billed - actualShare,
      priorShare: hasPrior ? priorShare : null,
      capPct, capFromLeaseYear: capPct === null ? null : capFrom, capComponents: [...capComponents],
      capApplies, capBinding, capReason,
      cappedShare: capComputed ? cappedShare : null,
      trueUp, lines, recoveriesKnown, auditRights: !!(t && t.auditRights),
    };
  }).sort((a, b) => Math.abs(b.trueUp ?? b.delta) - Math.abs(a.trueUp ?? a.delta) ||
    String(a.unit).localeCompare(String(b.unit), undefined, { numeric: true }));
  totals.trueUp = unitRows.reduce((s, r) => s + (r.trueUp || 0), 0);

  return {
    glaSf, year: recYear, priorYear, hasPrior,
    grossUpPct: gu.grossUpPct, grossUpFactor: gu.grossUpFactor, grossUpDerived: gu.grossUpDerived,
    occupancy: gu.occupancy, targetOccupancy: TARGET_OCCUPANCY, methodology: gu.methodology,
    occupiedSf, vacantSf, components, totals, vacancyShortfall, units: unitRows,
  };
}

export function reconCaveats(model) {
  const out = [
    "Pro-rata by SF over 62,883 SF GLA (audit-grade; suites on the roll sum to 62,810 SF — the 73 SF gap is unassigned common area); check leases with negotiated shares",
    "CAM gross-up applies to CAM only",
    "Base-year stop clauses are not modeled (none recorded in the lease abstracts)",
  ];
  if (!model) return out;
  const capped = model.units.filter(r => r.capPct !== null);
  if (capped.length && !model.hasPrior)
    out.push((model.priorYear === null ? "Prior-year" : model.priorYear) + " actuals not on file — " +
      capped.length + " lease cap" + (capped.length === 1 ? "" : "s") + " not applied; enter them in the prior-year worksheet");
  const unkStart = capped.filter(r => r.leaseYear === null && model.year !== null).map(r => r.unit);
  if (unkStart.length)
    out.push("Lease start not on the roll for " + unkStart.join(", ") + " — cap" + (unkStart.length === 1 ? "" : "s") + " not applied");
  const unkRec = model.units.filter(r => !r.recoveriesKnown).map(r => r.unit);
  if (unkRec.length)
    out.push("Recovery PSF not on file for " + unkRec.join(", ") + " — billed shown as $0, no true-up stated");
  if (model.hasPrior && model.units.some(r => r.capApplies))
    out.push("Prior-year shares use this year's gross-up factor and full-year actuals — partial first lease years are not prorated");
  return out;
}
