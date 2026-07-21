/* Ledger-lite pure seam — harvest #4 from belle-realty-pwa @ 19f7c06
   (modules/ledger + late-fees/late-fee-math, collapsed to OTB scale: 27 units,
   operator-entered payments, no invoices/receipts/processors).
   Conventions carried over from the repo:
     — a bare monthly amount is TOTAL rent (base + additional), single "rent"
       charge per month, no component split (rent-presentation rule, 2026-07-17)
     — money = dollars rounded to 2 (round2), never fractional cents
     — audit-grade: entries are append-only; a void is ITSELF an entry
       ({type:"void", voidOf:<id>}) — nothing is ever updated or deleted
   Every function is pure; Supabase/store wiring lives with the view layer. */

export const OTB_LATE_POLICY = { graceDays: 5, flatFee: 100, perDayFee: 25 }; // donor constants (OTB standard schedule)

export const DEBIT_TYPES = ["charge", "late_fee", "nsf", "adjustment"];
export const CREDIT_TYPES = ["payment", "credit", "write_off"];
export const CHARGE_CODES = ["rent", "late_fee", "nsf", "parking", "misc"];

export const round2 = n => Math.round(n * 100) / 100;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const utc = d => typeof d === "string" ? Date.parse(d + "T00:00:00Z") : +d;

/* ---- late-fee engine (ported verbatim in policy; day 1 past grace = flat
   only, each further day adds perDayFee: $100, $125, $150 …) ---- */
export function computeDaysLate({ referenceDate, dueDate, graceDays }) {
  const rawDiff = Math.floor((utc(referenceDate) - utc(dueDate)) / MS_PER_DAY);
  return Math.max(0, rawDiff - graceDays);
}

export function computeLateFeeAmount(daysLate, policy) {
  if (daysLate <= 0) return 0;
  return round2(policy.flatFee + Math.max(0, daysLate - 1) * policy.perDayFee);
}

export function assessLateFee({ referenceDate, dueDate, policy = OTB_LATE_POLICY }) {
  const daysLate = computeDaysLate({ referenceDate, dueDate, graceDays: policy.graceDays });
  return { daysLate, shouldAssess: daysLate > 0, amount: computeLateFeeAmount(daysLate, policy) };
}

/* ---- entry algebra ---- */
/* Strip void markers and their targets. Unknown voidOf ids are inert. */
export function effectiveEntries(entries) {
  const voided = new Set(entries.filter(e => e.type === "void" && e.voidOf).map(e => e.voidOf));
  return entries.filter(e => e.type !== "void" && !voided.has(e.id));
}

const chrono = (a, b) => utc(a.date) - utc(b.date) || String(a.id).localeCompare(String(b.id));

/* Chronological running balance (positive = tenant owes). Returns new objects;
   voids already applied. */
export function withRunningBalance(entries) {
  let run = 0;
  return effectiveEntries(entries).slice().sort(chrono).map(e => {
    const amt = round2(+e.amount || 0);
    run = round2(run + (DEBIT_TYPES.includes(e.type) ? amt : -amt));
    return { ...e, runningBalance: run };
  });
}

export function unitBalance(entries, unit) {
  const rows = withRunningBalance(entries.filter(e => e.unit === unit));
  return rows.length ? rows[rows.length - 1].runningBalance : 0;
}

/* ---- monthly rent charges (idempotent by deterministic id) ----
   One TOTAL-rent charge per occupied unit (monthly > 0) on the 1st. */
export function monthRentCharges(units, ym) {
  if (!/^\d{4}-\d{2}$/.test(ym)) throw new Error("ym must be YYYY-MM");
  return units.filter(u => (+u.monthly || 0) > 0).map(u => ({
    id: `rent:${ym}:${u.unit}`,
    unit: u.unit,
    type: "charge",
    code: "rent",
    amount: round2(+u.monthly),
    date: ym + "-01",
    due: ym + "-01",
    description: `Rent ${ym} — ${u.dba || u.unit}`
  }));
}

/* ---- aging (FIFO) ----
   Credits apply to open debits oldest-first; remaining debit balances bucket
   by age at asOf. Buckets: current (≤30), d31_60, d61_90, d90 (>90). */
export function aging(entries, asOf) {
  const perUnit = {};
  for (const e of effectiveEntries(entries)) (perUnit[e.unit] ||= []).push(e);
  const out = {};
  for (const [unit, list] of Object.entries(perUnit)) {
    const rows = list.slice().sort(chrono);
    const debits = rows.filter(e => DEBIT_TYPES.includes(e.type))
      .map(e => ({ date: e.due || e.date, open: round2(+e.amount || 0) }));
    let credit = rows.filter(e => CREDIT_TYPES.includes(e.type))
      .reduce((s, e) => round2(s + (+e.amount || 0)), 0);
    for (const d of debits) {
      if (credit <= 0) break;
      const take = Math.min(d.open, credit);
      d.open = round2(d.open - take);
      credit = round2(credit - take);
    }
    const b = { current: 0, d31_60: 0, d61_90: 0, d90: 0, credit: round2(-credit) };
    for (const d of debits) {
      if (d.open <= 0) continue;
      const age = Math.floor((utc(asOf) - utc(d.date)) / MS_PER_DAY);
      const key = age <= 30 ? "current" : age <= 60 ? "d31_60" : age <= 90 ? "d61_90" : "d90";
      b[key] = round2(b[key] + d.open);
    }
    b.total = round2(b.current + b.d31_60 + b.d61_90 + b.d90 + b.credit);
    if (b.total !== 0 || b.credit !== 0) out[unit] = b;
  }
  return out;
}
