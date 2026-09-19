/* C-1 document coverage — pure model (2026-09-19, operator pick 4 from the
   Asset Command review). AC's "Document Coverage" grid: one row per occupied
   suite with Lease · COI · COI expiry · other-docs, filter chips (Gaps / No
   lease / No COI / COI lapsed or soon / Complete / All) and the four summary
   counts. Two evidence sources are folded: the unit's document records (K-1 /
   drawer: type + link + expires) and the C-1 compliance matrix states for the
   `lease` and `coi` fields — a matrix "On file" counts as covered even when no
   file is attached yet, a matrix "Flagged" always shows as a gap. COI expiry
   math reuses lib/coi.js (30d critical / 60d expiring). No DOM — tested in
   test/coverage.test.mjs; views/compliance.js renders it above the matrix. */
import { coiStatus } from "./coi.js";

export const COVERAGE_FILTERS = [
  ["gaps", "Gaps"],
  ["nolease", "No lease"],
  ["nocoi", "No COI"],
  ["lapsed", "COI lapsed / soon"],
  ["complete", "Complete"],
  ["all", "All"],
];

/* cell states: ok · soon · lapsed · missing · flag · na */
export const CELL_LABEL = { ok: "On file", soon: "Expiring", lapsed: "Lapsed", missing: "Missing", flag: "Flagged", na: "N/A" };

const isLeaseDoc = d => /lease/i.test((d.type || "") + " " + (d.name || ""));
const isCoiDoc = d => /insurance|\bcoi\b/i.test((d.type || "") + " " + (d.name || ""));
const hasFile = d => !!(d.link && String(d.link).trim());

/* one suite → coverage row */
export function coverageRow(u, docs, comp, todayYmd) {
  const list = docs || [];
  const leaseDocs = list.filter(isLeaseDoc), coiDocs = list.filter(isCoiDoc);
  const other = list.filter(d => !isLeaseDoc(d) && !isCoiDoc(d)).length;
  const leaseComp = comp.lease || "u", coiComp = comp.coi || "u";

  let lease = "missing";
  if (leaseComp === "flag") lease = "flag";
  else if (leaseComp === "na") lease = "na";
  else if (leaseDocs.some(hasFile) || leaseComp === "ok") lease = "ok";

  const coiDoc = coiDocs.find(d => d.expires) || coiDocs[0] || null;
  const expires = coiDoc && coiDoc.expires ? coiDoc.expires : "";
  const st = coiStatus(expires, todayYmd);
  let coi = "missing";
  if (coiComp === "flag") coi = "flag";
  else if (coiComp === "na") coi = "na";
  else if (coiDocs.some(hasFile) || coiComp === "ok" || expires) {
    coi = st.state === "expired" ? "lapsed" : (st.state === "critical" || st.state === "expiring") ? "soon" : "ok";
  }
  const gap = ["missing", "flag", "lapsed"].includes(lease) || ["missing", "flag", "lapsed", "soon"].includes(coi);
  return {
    unit: String(u.unit), dba: u.dba || "", status: u.status,
    lease, leaseCount: leaseDocs.filter(hasFile).length,
    coi, coiExpires: expires, coiDays: st.days,
    other, gap,
  };
}

/* units → rows for every occupied suite (vacant bays carry nothing to cover);
   docsFor(unit) → document records; compFor(unit) → { lease, coi } matrix states */
export function coverageRows(units, docsFor, compFor, todayYmd) {
  const rows = (units || []).filter(u => u.status !== "vacant")
    .map(u => coverageRow(u, docsFor(String(u.unit)), compFor(String(u.unit)) || {}, todayYmd));
  const summary = {
    total: rows.length,
    missingLease: rows.filter(r => r.lease === "missing" || r.lease === "flag").length,
    missingCoi: rows.filter(r => r.coi === "missing" || r.coi === "flag").length,
    coiLapsedSoon: rows.filter(r => r.coi === "lapsed" || r.coi === "soon").length,
    gaps: rows.filter(r => r.gap).length,
    complete: rows.filter(r => !r.gap).length,
  };
  return { rows, summary };
}

export function filterCoverage(rows, filter) {
  switch (filter) {
    case "gaps": return rows.filter(r => r.gap);
    case "nolease": return rows.filter(r => r.lease === "missing" || r.lease === "flag");
    case "nocoi": return rows.filter(r => r.coi === "missing" || r.coi === "flag");
    case "lapsed": return rows.filter(r => r.coi === "lapsed" || r.coi === "soon");
    case "complete": return rows.filter(r => !r.gap);
    default: return rows.slice();
  }
}

/* "2026-11-30 (41d)" · "2026-08-01 (lapsed 49d)" · "—" */
export function coiExpiryText(row) {
  if (!row.coiExpires) return "—";
  if (row.coiDays == null) return row.coiExpires;
  return row.coiExpires + (row.coiDays < 0 ? " (lapsed " + Math.abs(row.coiDays) + "d)" : " (" + row.coiDays + "d)");
}
