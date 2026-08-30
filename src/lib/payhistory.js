/* payment_history — read-only predecessor rent record imported from Asset
   Command (H-1 shape (b), harvested 2026-08-29): 313 rows, 2025-07→2026-07,
   $1,133,492.20 paid. The append-only ledger (2026-08→) stays the live money
   record; this module only reads. CAVEAT (spec 2026-08-29-ac-harvest): the
   2026-07 period was bulk-entered in AC (uniform timestamp, no method) —
   lateness derivation must use `status`, never paid_at. */
import { REMOTE, sb, propertyContext } from "./remote.js";

let cache = null; // null until first successful fetch; then rows[]
const listeners = [];
export const getPayHistory = () => cache || [];
export const payHistoryLoaded = () => cache !== null;
export function onPayHistoryChange(cb) { listeners.push(cb); }

export async function refreshPayHistory() {
  if (!REMOTE) return [];
  const ctx = await propertyContext();
  const { data, error } = await sb.from("payment_history").select("*")
    .eq("property_id", ctx.property_id).order("period").order("unit");
  if (error) { console.warn("payment_history read failed:", error.message); return cache || []; }
  cache = data || [];
  listeners.forEach(cb => { try { cb(); } catch (e) { console.warn(e); } });
  return cache;
}

/* ---- pure folds (unit-tested in test/payhistory.test.mjs) ---- */

export function unitPayHistory(rows, unit) {
  return (rows || []).filter(r => r.unit === String(unit));
}

/* Per-unit record: months on file, status counts, dollars. Status is the
   lateness source of truth (see module caveat). */
export function payHistoryStats(rows) {
  const by = {};
  for (const r of rows || []) {
    const b = by[r.unit] || (by[r.unit] = {
      unit: r.unit, months: 0, paid: 0, late: 0, partial: 0, unpaid: 0,
      totalPaid: 0, lateFees: 0,
    });
    b.months++;
    b.totalPaid += +r.amount_paid || 0;
    b.lateFees += +r.late_fee || 0;
    if (r.status === "late") b.late++;
    else if (r.status === "partial") b.partial++;
    else if (r.status === "unpaid") b.unpaid++;
    else b.paid++;
  }
  return by;
}

export function portfolioPayTotals(rows) {
  const months = new Set();
  let totalDue = 0, totalPaid = 0, lateFees = 0, clean = 0;
  for (const r of rows || []) {
    months.add(r.period);
    totalDue += +r.amount_due || 0;
    totalPaid += +r.amount_paid || 0;
    lateFees += +r.late_fee || 0;
    if (r.status === "paid" || r.status === "") clean++;
  }
  return {
    rows: (rows || []).length, months: months.size,
    totalDue, totalPaid, lateFees,
    onTimeRate: (rows || []).length ? clean / rows.length : null,
  };
}
