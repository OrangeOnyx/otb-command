/* T-1 lease expiry timeline — pure Gantt model (2026-09-19, operator pick 1
   from the Asset Command review). One bar per leased suite from today to the
   Tier-1 lease end (units.json), a today line, Jan/Jul ticks, and the four
   bucket counts AC showed as cards. Suites with a blank `end` (139/141/119/145,
   the September lease review) never get a bar or a bucket guess — they list as
   "Term unresolved" BY DESIGN. Colors are the plan-room expiry language
   (brick ≤ 90d and past · amber 90–180d · green beyond). No DOM, no network —
   tested in test/leasegantt.test.mjs; views/dates.js draws the SVG. */

export const GANTT_BUCKETS = [
  ["expired", "Past recorded end", "#C25E33"],
  ["lt90", "< 90 days", "#C25E33"],
  ["lt180", "90–180 days", "#C99A33"],
  ["gt180", "> 180 days", "#2F6B4F"],
  ["unresolved", "Term unresolved", "#5F6E64"],
];
const BUCKET_COLOR = Object.fromEntries(GANTT_BUCKETS.map(([id, , c]) => [id, c]));
const BUCKET_LABEL = Object.fromEntries(GANTT_BUCKETS.map(([id, l]) => [id, l]));

const YMD = /^\d{4}-\d{2}-\d{2}$/;
const utc = ymd => { const [y, m, d] = String(ymd).split("-").map(Number); return Date.UTC(y, m - 1, d); };
const DAY = 86400000;

/* calendar days from → to (negative when `to` is earlier); null on bad input */
export function daysBetween(fromYmd, toYmd) {
  if (!YMD.test(fromYmd || "") || !YMD.test(toYmd || "")) return null;
  return Math.round((utc(toYmd) - utc(fromYmd)) / DAY);
}

/* days-to-end → bucket id (null days = unresolved) */
export function ganttBucket(days) {
  if (days == null || !Number.isFinite(days)) return "unresolved";
  if (days < 0) return "expired";
  if (days <= 90) return "lt90";
  if (days <= 180) return "lt180";
  return "gt180";
}

/* a suite carries a lease bar when it has a tenant of record (vacant and
   owner-occupied bays have no term to chart) */
export const isLeased = u => u && u.status !== "vacant" && u.status !== "owner";

/* Jan 1 / Jul 1 ticks inside [today, today + years] as horizon fractions.
   January carries the year, July reads "Jul YYYY". */
export function ganttTicks(todayYmd, years) {
  const start = utc(todayYmd), span = years * 365.25 * DAY;
  const y0 = new Date(start).getUTCFullYear();
  const out = [];
  for (let y = y0; y <= y0 + years + 1; y++) {
    for (const m of [0, 6]) {
      const t = Date.UTC(y, m, 1);
      if (t <= start || t > start + span) continue;
      out.push({ f: (t - start) / span, label: m === 0 ? String(y) : "Jul " + y, major: m === 0 });
    }
  }
  return out;
}

/* → { rows, ticks, counts, years, today }
   row = { unit, dba, sf, monthly, end, days, bucket, color, label, f, clipped }
     f = bar end as a 0..1 fraction of the horizon (0 for past ends, null for
     unresolved); clipped = end lies beyond the horizon (bar runs off the edge).
   rows sort: past ends first, then soonest end, unresolved last (by unit). */
export function ganttModel(units, todayYmd, { years = 4 } = {}) {
  const span = years * 365.25;
  const rows = (units || []).filter(isLeased).map(u => {
    const days = daysBetween(todayYmd, u.end);
    const bucket = ganttBucket(days);
    let f = null, clipped = false;
    if (days != null) {
      f = Math.max(0, Math.min(1, days / span));
      clipped = days > span;
    }
    return {
      unit: String(u.unit), dba: u.dba || "", sf: u.sf || 0, monthly: u.monthly || 0,
      end: days == null ? "" : u.end, days, bucket, color: BUCKET_COLOR[bucket], label: BUCKET_LABEL[bucket],
      f, clipped,
      evidence: u.leaseEvidence && u.leaseEvidence.label ? u.leaseEvidence.label : "",
    };
  });
  const rank = r => r.bucket === "unresolved" ? 2 : 0;
  rows.sort((a, b) => rank(a) - rank(b) || (a.days ?? 0) - (b.days ?? 0) || a.unit.localeCompare(b.unit, "en", { numeric: true }));
  const counts = { expired: 0, lt90: 0, lt180: 0, gt180: 0, unresolved: 0 };
  rows.forEach(r => { counts[r.bucket]++; });
  return { rows, ticks: ganttTicks(todayYmd, years), counts, years, today: todayYmd };
}

/* "6 expiring within 6 months · 0 past recorded end · 4 term unresolved" */
export function ganttSummary(counts) {
  const six = counts.lt90 + counts.lt180;
  const parts = [six + " expiring within 6 months", counts.expired + " past recorded end"];
  if (counts.unresolved) parts.push(counts.unresolved + " term unresolved");
  return parts.join(" · ");
}

/* right-edge day chip: "12d" · "163d" · "-9d" · "—" */
export const daysChip = days => days == null ? "—" : days + "d";
