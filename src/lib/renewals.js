/* T-1 renewal pipeline — pure model (2026-09-19, operator pick 2 from the
   Asset Command review). AC framed renewals by the OPTION NOTICE DEADLINE,
   not the expiry: noticeBy = lease end − notice days. That is the operator-
   correct view, so it is ported here — fed by Tier-1 dates (units.json `end`)
   and the reference-only option terms in data/renewal-options.json (AI-
   extracted from the executed leases; verify the clause before acting).
   A blank `end` keeps the suite out of the deadline math BY DESIGN — those
   suites list under "Term unresolved" with their lease-review label. No DOM,
   no network — tested in test/renewals.test.mjs. */
import { daysBetween, isLeased } from "./leasegantt.js";

export const NOTICE_WINDOW_DAYS = 90;

export const RENEWAL_GROUPS = [
  ["window", "Notice window", "Option notice deadline within " + NOTICE_WINDOW_DAYS + " days — act now"],
  ["passed", "Notice deadline passed", "Lease still in term, but the option notice date has gone by — renewal is now by negotiation"],
  ["available", "Option available", "Renewal option exists; notice not yet due"],
  ["expired", "Past recorded end", "Recorded end date has passed — confirm status before treating as holdover"],
  ["unresolved", "Term unresolved", "No contractual end on the schedule — deadline math waits for the signed copy"],
  ["none", "No option abstracted", "Lease on the roll, no renewal option on file"],
];

const YMD = /^\d{4}-\d{2}-\d{2}$/;
const addDays = (ymd, n) => new Date(Date.UTC(+ymd.slice(0, 4), +ymd.slice(5, 7) - 1, +ymd.slice(8, 10)) + n * 86400000).toISOString().slice(0, 10);

/* one suite → pipeline row (group decided here) */
export function renewalRow(u, opt, todayYmd) {
  const row = {
    unit: String(u.unit), dba: u.dba || "", sf: u.sf || 0, monthly: u.monthly || 0,
    end: YMD.test(u.end || "") ? u.end : "",
    term: opt ? opt.term || "" : "", noticeDays: opt && Number.isFinite(opt.noticeDays) ? opt.noticeDays : null,
    rentBasis: opt ? opt.rentBasis || "" : "", confidence: opt ? opt.confidence || "" : "",
    noticeBy: "", daysToNotice: null, daysToEnd: null, group: "none",
    evidence: u.leaseEvidence && u.leaseEvidence.label ? u.leaseEvidence.label : "",
  };
  if (!opt) { row.group = row.end ? "none" : "unresolved"; return row; }
  if (!row.end) { row.group = "unresolved"; return row; }
  row.daysToEnd = daysBetween(todayYmd, row.end);
  if (row.noticeDays != null) {
    row.noticeBy = addDays(row.end, -row.noticeDays);
    row.daysToNotice = daysBetween(todayYmd, row.noticeBy);
  }
  if (row.daysToEnd < 0) row.group = "expired";
  else if (row.daysToNotice == null) row.group = "available";
  else if (row.daysToNotice < 0) row.group = "passed";
  else if (row.daysToNotice <= NOTICE_WINDOW_DAYS) row.group = "window";
  else row.group = "available";
  return row;
}

/* → { groups: [{id,label,sub,rows}], counts } — groups in RENEWAL_GROUPS
   order; rows inside a group soonest-notice first (unresolved/none by unit). */
export function renewalPipeline(units, optionsByUnit, todayYmd) {
  const opts = optionsByUnit || {};
  const rows = (units || []).filter(isLeased).map(u => renewalRow(u, opts[String(u.unit)], todayYmd));
  const byUnit = (a, b) => a.unit.localeCompare(b.unit, "en", { numeric: true });
  const groups = RENEWAL_GROUPS.map(([id, label, sub]) => ({
    id, label, sub,
    rows: rows.filter(r => r.group === id).sort((a, b) =>
      (a.noticeBy && b.noticeBy) ? (a.noticeBy < b.noticeBy ? -1 : a.noticeBy > b.noticeBy ? 1 : byUnit(a, b))
        : (a.daysToEnd ?? 0) - (b.daysToEnd ?? 0) || byUnit(a, b)),
  }));
  const counts = { total: rows.length };
  groups.forEach(g => { counts[g.id] = g.rows.length; });
  return { groups, counts };
}

/* status line per row: "Notice by 2026-12-02 · 75d until notice" ·
   "Notice by 2026-08-01 · 48d past deadline" · "Ended 2026-07-31 · 50d ago" ·
   "No contractual end on the schedule" */
export function noticeLine(row) {
  if (row.group === "unresolved") return row.evidence || "No contractual end on the schedule";
  if (row.group === "expired") return "Ended " + row.end + " · " + Math.abs(row.daysToEnd) + "d ago";
  if (!row.noticeBy) return "Ends " + row.end + " · " + row.daysToEnd + "d";
  const rel = row.daysToNotice < 0 ? Math.abs(row.daysToNotice) + "d past deadline" : row.daysToNotice + "d until notice";
  return "Notice by " + row.noticeBy + " · " + rel;
}

/* "Lease ends 2027-01-31 · Option: 3 years · Notice: 60 days" */
export function termLine(row) {
  const parts = [];
  parts.push(row.end ? "Lease ends " + row.end : "Lease end not on the schedule");
  if (row.term) parts.push("Option: " + row.term);
  if (row.noticeDays != null) parts.push("Notice: " + row.noticeDays + " days");
  return parts.join(" · ");
}
