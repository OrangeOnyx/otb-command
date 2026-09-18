/* Property identifiers — pure seam over properties.facts rows of
   kind='identifier' (AC harvest, 25 label/value rows loaded by migration
   20260911140000; owner entity corrected per ruling D-23b). Ruling D-23a
   option 1 (2026-09-17): they surface as a K-1 card, grouped as AC grouped
   them, with every null shown as "not on file" — the gap IS the work item,
   never hidden and never invented. No Supabase here: the read seam is
   remote.getPropertyFacts(); this module only folds. Tested in
   test/identifiers.test.mjs. */

export const NOT_ON_FILE = "— not on file";

/* facts (any array; non-identifier entries ignored) → ordered groups
   [{group, rows:[{label, value, missing, asOf, key}], missing}] in
   sortOrder, groups in first-appearance order. Blank strings count as
   missing too (an empty value is not a value). */
export function groupIdentifiers(facts) {
  const rows = (Array.isArray(facts) ? facts : [])
    .filter(f => f && f.kind === "identifier" && typeof f.label === "string")
    .map(f => {
      const v = f.value == null ? "" : String(f.value).trim();
      return {
        key: String(f.key || ""),
        group: String(f.group || "Other"),
        label: f.label,
        value: v,
        missing: v === "",
        asOf: typeof f.asOf === "string" ? f.asOf : "",
        sortOrder: Number.isFinite(+f.sortOrder) ? +f.sortOrder : 1e9,
      };
    })
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
  const groups = [];
  const byName = new Map();
  for (const r of rows) {
    let g = byName.get(r.group);
    if (!g) { g = { group: r.group, rows: [], missing: 0 }; byName.set(r.group, g); groups.push(g); }
    g.rows.push(r);
    if (r.missing) g.missing++;
  }
  return groups;
}

/* Header line for the card: "25 identifiers · 12 not on file". */
export function identifierSummary(groups) {
  const total = groups.reduce((n, g) => n + g.rows.length, 0);
  const missing = groups.reduce((n, g) => n + g.missing, 0);
  if (!total) return "";
  return total + " identifier" + (total === 1 ? "" : "s") +
    (missing ? " · " + missing + " not on file" : " · complete");
}

/* Display value — the placeholder is a constant so the view never invents
   prose for a blank. */
export const displayValue = r => (r.missing ? NOT_ON_FILE : r.value);
