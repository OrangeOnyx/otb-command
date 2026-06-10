/* Formatting + date helpers (identical to baseline). */
export const TODAY = new Date(2026, 5, 10); // Jun 10 2026 — SOT issue date, pinned

export const fmt$ = n => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmt$0 = n => "$" + Math.round(n).toLocaleString("en-US");
export const pDate = s => s ? new Date(s + "T00:00:00") : null;
export const fDate = d => d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
export const monthsTo = d => (d - TODAY) / (1000 * 60 * 60 * 24 * 30.44);
export const daysTo = d => Math.round((d - TODAY) / (1000 * 60 * 60 * 24));
export const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]));
