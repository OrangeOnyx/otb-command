/* Tenant-health scoring over the predecessor payment record (payment_history,
   read-only, 2025-07→2026-07) + rent-roll lease terms. Pure module — no DOM,
   no network; the view injects UNITS, payHistoryStats() output, and today.

   Score model (0–100, descriptive only — NOT a credit decision):
   - Payment record (max 60): start at 60; −6 per late month, −9 per partial
     month, −15 per unpaid month (floored at 0). `status` is the lateness
     source of truth — never paid_at (payhistory caveat: 2026-07 was
     bulk-entered in Asset Command with a uniform timestamp). Units with no
     history row score 45 with factor "no predecessor record".
   - Term runway (max 25): months from the injected today to lease end —
     ≥24mo → 25 · 12–24 → 18 · 6–12 → 10 · <6 → 4 · expired/holdover → 0
     ("past term") · no end date on file → 0 ("no lease end on file").
   - Late-fee drag (max 15): $0 → 15 · ≤$100 → 10 · ≤$300 → 5 · more → 0.
   Grade: A ≥85 · B ≥70 · C ≥55 · D ≥40 · else E.
   Occupied units only (status !== "vacant" and monthly > 0); worst-first. */
import { pDate, fmt$0 } from "./format.js";

const MS_MONTH = 1000 * 60 * 60 * 24 * 30.44;
const plural = (n, word) => n + " " + word + (n === 1 ? "" : "s");
const grade = s => s >= 85 ? "A" : s >= 70 ? "B" : s >= 55 ? "C" : s >= 40 ? "D" : "E";

export function tenantHealth(units, statsByUnit, todayISO) {
  const today = pDate(todayISO);
  const out = [];
  for (const u of units || []) {
    if (u.status === "vacant" || !(u.monthly > 0)) continue;
    const factors = [];
    const s = (statsByUnit || {})[u.unit];

    // payment record (max 60)
    let pay;
    if (!s) {
      pay = 45;
      factors.push("no predecessor record");
    } else {
      pay = Math.max(0, 60 - 6 * s.late - 9 * s.partial - 15 * s.unpaid);
      if (s.late) factors.push(plural(s.late, "late month"));
      if (s.partial) factors.push(plural(s.partial, "partial month"));
      if (s.unpaid) factors.push(plural(s.unpaid, "unpaid month"));
    }

    // term runway (max 25)
    const end = u.end ? pDate(u.end) : null;
    let run;
    if (!end) {
      run = 0; factors.push("no lease end on file");
    } else {
      const m = (end - today) / MS_MONTH;
      if (u.status === "expired" || m <= 0) { run = 0; factors.push("past term"); }
      else if (m >= 24) run = 25;
      else {
        run = m >= 12 ? 18 : m >= 6 ? 10 : 4;
        factors.push(plural(Math.round(m) || 1, "month") + " runway");
      }
    }

    // late-fee drag (max 15)
    const fees = s ? (+s.lateFees || 0) : 0;
    const drag = fees === 0 ? 15 : fees <= 100 ? 10 : fees <= 300 ? 5 : 0;
    if (fees > 0) factors.push(fmt$0(fees) + " late fees");

    const score = pay + run + drag;
    out.push({ unit: u.unit, dba: u.dba, score, grade: grade(score), factors });
  }
  return out.sort((a, b) => a.score - b.score ||
    String(a.unit).localeCompare(String(b.unit), undefined, { numeric: true }));
}

export const healthColor = g =>
  (g === "A" || g === "B") ? "var(--green)" : g === "C" ? "var(--brass)" : "var(--brick)";

/* Per-period portfolio fold for the history bars. cleanShare mirrors
   portfolioPayTotals' onTimeRate test: status "paid" or "" counts clean —
   status only, never paid_at (see module header). */
export function periodTotals(rows) {
  const by = {};
  for (const r of rows || []) {
    const b = by[r.period] || (by[r.period] = { period: r.period, due: 0, paid: 0, n: 0, clean: 0 });
    b.n++;
    b.due += +r.amount_due || 0;
    b.paid += +r.amount_paid || 0;
    if (r.status === "paid" || r.status === "") b.clean++;
  }
  return Object.values(by)
    .map(b => ({ period: b.period, due: b.due, paid: b.paid, cleanShare: b.n ? b.clean / b.n : 0 }))
    .sort((a, b) => a.period < b.period ? -1 : a.period > b.period ? 1 : 0);
}
