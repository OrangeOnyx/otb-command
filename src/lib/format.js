/* Formatting + date helpers (identical to baseline). */
// TODAY is LIVE (audit M3 fix): holdover "days over", "expiring ≤12mo", WALT,
// and critical-dates now track real time instead of freezing at the SOT date.
// DATA_AS_OF is the rent-roll SOT issue date — show it as "data as of" wherever
// the figures' vintage matters (they don't move with the calendar).
export const TODAY = new Date();
export const DATA_AS_OF = new Date(2026, 5, 10); // Jun 10 2026 — SOT issue date

export const fmt$ = n => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmt$0 = n => "$" + Math.round(n).toLocaleString("en-US");
export const pDate = s => s ? new Date(s + "T00:00:00") : null;
export const fDate = d => d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
export const monthsTo = d => (d - TODAY) / (1000 * 60 * 60 * 24 * 30.44);
export const daysTo = d => Math.round((d - TODAY) / (1000 * 60 * 60 * 24));
/* Canonical HTML/SVG escaper — the ONLY esc in the codebase (2026-07-20
   consolidation): lib/lease, lib/brief, lib/concierge, main.js, and
   tools/export-package all import this. Null-safe: null/undefined → "". */
export const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]));
