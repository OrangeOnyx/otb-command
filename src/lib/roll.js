/* R-1 rent-roll expiry watch — pure seam (owner request 2026-07-24: the
   printed roll must fit ONE letter-landscape sheet and mark leases expiring
   inside the next 6 / 6–12 months). Thresholds match T-1's color language:
   ≤6 mo (or already past) = brick, 6–12 mo = amber. Vacant/no-end rows never
   flag. The one-sheet fit itself is print CSS (#pg-roll block in styles.css);
   this seam owns the classification + legend so both are testable. */

/* months = monthsTo(pDate(end)) from lib/format.js (fractional, negative when
   past). → 'exp6' | 'exp12' | null */
export function expiryBucket(months) {
  if (months == null || typeof months !== "number" || Number.isNaN(months)) return null;
  if (months <= 6) return "exp6";
  if (months <= 12) return "exp12";
  return null;
}

/* marker glyph spoken by the Term End cell (print-safe plain text) */
export const expiryMark = bucket =>
  bucket === "exp6" ? "▲" : bucket === "exp12" ? "△" : "";

/* stamp-line legend, only mentioning non-empty buckets:
   "▲ 1 EXPIRES ≤6 MO · △ 2 IN 6–12 MO" (empty string when nothing flags) */
export function expiryLegend(n6, n12) {
  const parts = [];
  if (n6) parts.push("▲ " + n6 + (n6 === 1 ? " EXPIRES" : " EXPIRE") + " ≤6 MO");
  if (n12) parts.push("△ " + n12 + " IN 6–12 MO");
  return parts.join(" · ");
}
