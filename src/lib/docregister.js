/* Document register — pure seam (2026-09-18, owner-memo ruling: owner
   documents need the detail and section clarity Asset Command's Property
   Vault had). A document record may now carry, beyond name/type/ref/link/
   note/expires: counterparty (carrier · lender · title company · agency),
   amount + amountKind (premium · coverage · loan · insured), effective,
   matures (loans), status (active · expired · superseded · reference), risk
   (none · low · medium · high) and riskNote. `expires` keeps its meaning —
   the renewal / expiry date the K-1 expiring strip already watches.
   This module derives: the detail model a document card renders, the S-1
   risk register (worst-first) and the renewal & maturity radar
   (soonest-first). No DOM, no network — tested in test/docregister.test.mjs. */

export const DOC_STATUS = {
  active: ["Active", "#2F6B4F"],
  expired: ["Expired", "#C25E33"],
  superseded: ["Superseded", "#5F6E64"],
  reference: ["Reference", "#1E4F3C"],
};
export const DOC_RISK = {
  none: ["No flag", "#5F6E64"],
  low: ["Low risk", "#2F6B4F"],
  medium: ["Medium risk", "#A87E2F"],
  high: ["High risk", "#C25E33"],
};
export const AMOUNT_KIND = {
  premium: "Premium", coverage: "Coverage", loan: "Principal", insured: "Amount insured", amount: "Amount",
};
const RISK_RANK = { high: 0, medium: 1, low: 2, none: 3 };

export const validStatus = s => (DOC_STATUS[s] ? s : "");
export const validRisk = r => (DOC_RISK[r] ? r : "none");

/* "$13,647" / "$7,988,449" — whole dollars; blank for non-numbers */
export function fmtAmount(v) {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/[$,\s]/g, ""));
  if (!Number.isFinite(n) || String(v ?? "").trim() === "") return "";
  return "$" + Math.round(n).toLocaleString("en-US");
}

const parseYmd = s => (/^\d{4}-\d{2}-\d{2}$/.test(String(s || "")) ? Date.parse(s + "T00:00:00Z") : NaN);
const dayDiff = (ymd, todayYmd) => Math.round((parseYmd(ymd) - parseYmd(todayYmd)) / 86400000);

/* "Sep 18, 2026" from YYYY-MM-DD (UTC-safe, no local-zone drift) */
export function fmtYmd(ymd) {
  const t = parseYmd(ymd);
  if (!Number.isFinite(t)) return String(ymd || "");
  return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/* Days chip for a dated field: {label, tone} — overdue brick · ≤60d brass ·
   ≤180d anchor · else slate. Absent / malformed → null. */
export function daysChip(ymd, todayYmd) {
  const d = dayDiff(ymd, todayYmd);
  if (!Number.isFinite(d)) return null;
  if (d < 0) return { days: d, label: -d + "d overdue", tone: "brick" };
  if (d === 0) return { days: 0, label: "today", tone: "brick" };
  return { days: d, label: "in " + d + "d", tone: d <= 60 ? "brass" : d <= 180 ? "anchor" : "slate" };
}

/* The card model: sectioned rows that render only when they carry data. */
export function docDetail(r, todayYmd) {
  const d = r || {};
  const status = validStatus(d.status), risk = validRisk(d.risk);
  const rows = [];
  if (d.ref) rows.push({ k: "Reference", v: String(d.ref), mono: true });
  if (fmtAmount(d.amount)) rows.push({ k: AMOUNT_KIND[d.amountKind] || AMOUNT_KIND.amount, v: fmtAmount(d.amount), mono: true });
  if (d.effective) rows.push({ k: "Effective", v: fmtYmd(d.effective) });
  if (d.expires) rows.push({ k: status === "reference" || status === "superseded" ? "Dated" : "Renews / expires", v: fmtYmd(d.expires), chip: status === "active" || !status ? daysChip(d.expires, todayYmd) : null });
  if (d.matures) rows.push({ k: "Matures", v: fmtYmd(d.matures), chip: daysChip(d.matures, todayYmd) });
  return {
    name: String(d.name || ""), type: String(d.type || ""),
    counterparty: String(d.counterparty || ""),
    status, statusLabel: status ? DOC_STATUS[status][0] : "", statusColor: status ? DOC_STATUS[status][1] : "",
    risk, riskLabel: risk !== "none" ? DOC_RISK[risk][0] : "", riskColor: DOC_RISK[risk][1],
    riskNote: String(d.riskNote || ""), note: String(d.note || ""), rows,
    detailed: !!(d.counterparty || d.amount || d.effective || d.matures || d.status || (risk !== "none") || d.riskNote),
  };
}

/* S-1 risk register: flagged documents, worst first, then by name. */
export function riskRegister(docs) {
  return (docs || []).filter(r => validRisk(r && r.risk) !== "none")
    .map(r => ({ id: r.id, name: r.name, type: r.type, unit: r.unit, risk: validRisk(r.risk),
      riskLabel: DOC_RISK[validRisk(r.risk)][0], color: DOC_RISK[validRisk(r.risk)][1], riskNote: String(r.riskNote || "") }))
    .sort((a, b) => RISK_RANK[a.risk] - RISK_RANK[b.risk] || String(a.name).localeCompare(String(b.name)));
}

/* S-1 renewal & maturity radar: every ACTIVE (or un-statused) document with
   a renews/expires or matures date, soonest first — renewal wins when both. */
export function renewalRadar(docs, todayYmd) {
  const out = [];
  for (const r of docs || []) {
    const st = validStatus(r && r.status);
    if (st && st !== "active") continue;
    const kind = r.expires ? "Renews" : r.matures ? "Matures" : "";
    if (!kind) continue;
    const date = kind === "Renews" ? r.expires : r.matures;
    const chip = daysChip(date, todayYmd);
    if (!chip) continue;
    out.push({ id: r.id, name: r.name, type: r.type, unit: r.unit, counterparty: String(r.counterparty || ""),
      kind, date, dateLabel: fmtYmd(date), days: chip.days, chip });
  }
  return out.sort((a, b) => a.days - b.days || String(a.name).localeCompare(String(b.name)));
}
