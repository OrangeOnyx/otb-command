/* Visual sheet export (print / save-as-PDF) — pure helpers.
   The printed page carries a drawing-set footer: sheet code + title,
   printed date, and the audit-grade headline, matching the export
   convention that every artifact states when it was generated. */

/* [id, sheet, label] rows (src/lib/pages.js) → footer text for the active page. */
export function printFootText(pages, activeId, dateStr) {
  const row = (pages || []).find(p => p[0] === activeId);
  const sheet = row ? row[1] : "";
  const label = row ? String(row[2] || "").toUpperCase() : "";
  return ["ORANGE OCEAN ATLAS · OTB", (sheet + " " + label).trim(), "PRINTED " + dateStr,
    "62,883 SF GLA · 27 UNITS"].filter(Boolean).join(" · ");
}

/* Document title while printing → governs the browser's default PDF filename. */
export function printDocTitle(pages, activeId, isoDate) {
  const row = (pages || []).find(p => p[0] === activeId);
  const sheet = row ? row[1] : "sheet";
  return "OTB-" + sheet + "-" + isoDate;
}
