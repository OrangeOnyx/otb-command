/* CAM / Tax / Insurance reconciliation DRAFT model (register row #6, v1).
   Pure module — no DOM, no network; P-1 injects UNITS, recoveries.json, and
   the operator's OpEx worksheet actuals.

   Model (annual, what-if only — NOT a billing engine):
   - Worksheet actuals per component: opexActuals = { cam, taxes, insurance }
     (annual $ from the P-1 NOI worksheet; OPEX_LINES keys).
   - Gross-up applies to CAM ONLY (industry norm) — grossed CAM =
     actual × (1 + grossUpPct/100); taxes and insurance are never grossed.
   - Billed recovery income per component = Σ over OCCUPIED units
     (status !== "vacant") of recoveries.units[unit].{cam|tax|ins} PSF × SF —
     the same math P-1's income-composition panel uses.
   - Pro-rata convention per the lease abstracts ("Pro Rata Portion"):
     unit share = unit SF / GLA (62,883 SF, audit-grade — GLA_SF below).
     Per-unit actualShare = grossed grand total × share; delta = billed −
     actualShare (positive = over-collected at true-up, negative = under).
   - vacancyShortfall = grossed grand total × (vacant SF / GLA) — the share
     no tenant reimburses; the landlord absorbs it.
   - Returns null when all three actuals are 0 (worksheet empty) so the
     panel stays quiet.

   v1 caveats (surfaced via reconCaveats(), rendered on the panel): many
   leases cap CAM increases (4–5% yoy) and some have base-year clauses —
   neither is modeled; leases with negotiated (non-SF) shares need a manual
   check. Tested in test/camrecon.test.mjs. */

/* Audit-grade property fact: GLA 62,883 SF · 27 demised units (do not
   contradict). Denominator for every pro-rata share below. */
export const GLA_SF = 62883;

/* Component wiring: worksheet key (OPEX_LINES) ↔ recoveries.json PSF key. */
const COMPONENTS = [
  { key: "cam", opexKey: "cam", recKey: "cam", grossable: true },
  { key: "tax", opexKey: "taxes", recKey: "tax", grossable: false },
  { key: "ins", opexKey: "insurance", recKey: "ins", grossable: false },
];

export function reconModel(units, recoveries, opexActuals, { grossUpPct = 0, glaSf = GLA_SF } = {}) {
  const acts = opexActuals || {};
  const actualOf = c => Math.max(0, +acts[c.opexKey] || 0);
  if (COMPONENTS.every(c => actualOf(c) === 0)) return null; // worksheet empty — stay quiet

  const all = units || [];
  const occ = all.filter(u => u.status !== "vacant");
  const occupiedSf = occ.reduce((s, u) => s + (+u.sf || 0), 0);
  const vacantSf = all.filter(u => u.status === "vacant").reduce((s, u) => s + (+u.sf || 0), 0);
  const recUnits = (recoveries && recoveries.units) || {};
  const psf = (u, key) => +((recUnits[u.unit] || {})[key]) || 0;

  const components = {};
  let tActual = 0, tGrossed = 0, tBilled = 0;
  for (const c of COMPONENTS) {
    const actual = actualOf(c);
    const grossed = c.grossable ? actual * (1 + grossUpPct / 100) : actual; // CAM only
    const billed = occ.reduce((s, u) => s + psf(u, c.recKey) * (+u.sf || 0), 0);
    components[c.key] = { actual, grossed, billed, delta: billed - grossed };
    tActual += actual; tGrossed += grossed; tBilled += billed;
  }
  const totals = { actual: tActual, grossed: tGrossed, billed: tBilled, delta: tBilled - tGrossed };
  const vacancyShortfall = tGrossed * (glaSf ? vacantSf / glaSf : 0);

  // per-unit true-up exposure, biggest |delta| first (worst either direction)
  const unitRows = occ.map(u => {
    const sf = +u.sf || 0;
    const share = glaSf ? sf / glaSf : 0;
    const billed = COMPONENTS.reduce((s, c) => s + psf(u, c.recKey) * sf, 0);
    const actualShare = tGrossed * share;
    return { unit: u.unit, dba: u.dba, sf, share, billed, actualShare, delta: billed - actualShare };
  }).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) ||
    String(a.unit).localeCompare(String(b.unit), undefined, { numeric: true }));

  return { glaSf, grossUpPct, occupiedSf, vacantSf, components, totals, vacancyShortfall, units: unitRows };
}

export function reconCaveats() {
  return [
    "Draft — lease-specific caps (4–5% yoy) and base-year clauses not yet modeled",
    "Pro-rata by SF over 62,883 SF GLA; check leases with negotiated shares",
    "CAM gross-up applies to CAM only",
  ];
}
