/* Per-unit monthly STATEMENT over the live ledger — register row #5 v1.
   Pure seam: no DOM, no network; wiring lives in src/lib/ledgerUI.js.

   Contract
   ────────
   statementModel(entries, unit, ym)
     entries = RAW ledger rows for the unit (voids are applied HERE via the
     ledger seam — callers pass what listLedgerEntries returned, untouched);
     ym = 'YYYY-MM'. Rows for other units are ignored defensively.
     Returns { unit, ym,
       openingBalance   — sum of signed amounts strictly before ym,
       lines            — that month's effective entries in date order, each
                          { date, description, charge (amount when debit type,
                          else null), payment (amount when credit type, else
                          null), balance (running, continues from opening) },
       totalCharges, totalPayments,
       closingBalance   — last line's balance (openingBalance when no lines) }.
     Sign convention is EXACTLY withRunningBalance/DEBIT_TYPES from ledger.js
     (positive = tenant owes) — reused, never re-derived.

   statementHTML(model, unitInfo, { issuedISO })
     Standalone printable HTML document string (OTB tenant palette, Google
     Fonts via <link> like api/esign.mjs). unitInfo = byUnit[unit] row (dba
     used when present; null-safe). Every interpolated string is escaped.

   statementMonths(entries, todayYm)
     Selectable 'YYYY-MM' list from LEDGER_START_YM (extended earlier only if
     a back-dated effective entry precedes it) through todayYm inclusive,
     newest first, capped at the newest 24. Never empty: todayYm before the
     start still yields the start month. */

import { withRunningBalance, DEBIT_TYPES, LEDGER_START_YM, round2 } from "./ledger.js";
import { esc, fmt$ } from "./format.js";

const YM_RE = /^\d{4}-\d{2}$/;
const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

/* 'YYYY-MM' → "August 2026" (pure; also used for the select labels). */
export function monthLabel(ym) {
  const [y, m] = ym.split("-").map(Number);
  return (MONTHS[m - 1] || ym) + " " + y;
}

/* 'YYYY-MM-DD' → "Aug 29, 2026" (pure — no Date/locale dependence). */
const fmtISO = iso => {
  const p = String(iso || "").split("-").map(Number);
  return p.length === 3 && MONTHS[p[1] - 1]
    ? MONTHS[p[1] - 1].slice(0, 3) + " " + p[2] + ", " + p[0] : String(iso || "");
};

/* ---- model ---- */
export function statementModel(entries, unit, ym) {
  if (!YM_RE.test(ym)) throw new Error("ym must be YYYY-MM");
  const bal = withRunningBalance((entries || []).filter(e => e.unit === unit));
  let openingBalance = 0;
  const lines = [];
  for (const e of bal) {
    const m = String(e.date).slice(0, 7);
    if (m < ym) { openingBalance = e.runningBalance; continue; }
    if (m > ym) continue;
    const debit = DEBIT_TYPES.includes(e.type);
    const amt = round2(+e.amount || 0);
    lines.push({
      date: String(e.date),
      description: e.description || e.type,
      charge: debit ? amt : null,
      payment: debit ? null : amt,
      balance: e.runningBalance,
    });
  }
  const totalCharges = round2(lines.reduce((s, l) => s + (l.charge || 0), 0));
  const totalPayments = round2(lines.reduce((s, l) => s + (l.payment || 0), 0));
  const closingBalance = lines.length ? lines[lines.length - 1].balance : openingBalance;
  return { unit, ym, openingBalance, lines, totalCharges, totalPayments, closingBalance };
}

/* ---- month picker ---- */
const ymNum = ym => { const [y, m] = ym.split("-").map(Number); return y * 12 + (m - 1); };
const numYm = n => Math.floor(n / 12) + "-" + String((n % 12) + 1).padStart(2, "0");

export function statementMonths(entries, todayYm) {
  if (!YM_RE.test(todayYm)) throw new Error("todayYm must be YYYY-MM");
  let start = ymNum(LEDGER_START_YM);
  const bal = withRunningBalance(entries || []); // voids applied; back-dated entries can widen the range
  for (const e of bal) {
    const m = String(e.date).slice(0, 7);
    if (YM_RE.test(m)) start = Math.min(start, ymNum(m));
  }
  const end = Math.max(ymNum(todayYm), start);
  const out = [];
  for (let n = end; n >= start && out.length < 24; n--) out.push(numYm(n));
  return out;
}

/* ---- document (OTB tenant palette: paper/ink/brass/green, brick when owed) ---- */
const FONTS =
  '<link rel="preconnect" href="https://fonts.googleapis.com">' +
  '<link href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@600;700&family=Public+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">';

const CSS = `
  body{font-family:'Public Sans',Arial,sans-serif;color:#1C2B26;margin:0;background:#EDEFE8}
  .page{max-width:8.5in;margin:0 auto;background:#fff;padding:.8in .85in}
  .lh{border-bottom:3px double #A87E2F;padding-bottom:14px;margin-bottom:22px}
  .lh .wm{font-family:'Big Shoulders Display',Impact,sans-serif;font-size:30px;font-weight:700;letter-spacing:.06em}
  .lh .sub{font-size:11px;letter-spacing:.08em;color:#5F6E64;margin-top:3px}
  h1{font-family:'Big Shoulders Display',Impact,sans-serif;font-size:21px;font-weight:600;letter-spacing:.05em;margin:0 0 3px;text-transform:uppercase}
  .meta{font-family:'IBM Plex Mono',monospace;font-size:11px;color:#5F6E64;margin-bottom:16px;line-height:1.7}
  .opening{font-family:'IBM Plex Mono',monospace;font-size:11.5px;margin:0 0 8px;color:#1C2B26}
  table{width:100%;border-collapse:collapse;font-family:'IBM Plex Mono',monospace;font-size:11.5px}
  th{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#5F6E64;text-align:left;
     border-bottom:2px solid #1C2B26;padding:5px 8px}
  td{border-bottom:1px solid #D8DCD2;padding:6px 8px;vertical-align:top}
  td.num,th.num{text-align:right;font-variant-numeric:tabular-nums}
  tr.tot td{border-top:2px solid #1C2B26;border-bottom:0;font-weight:600}
  .due{display:flex;justify-content:space-between;align-items:baseline;margin-top:16px;
       padding:12px 16px;background:#F6F7F1;border:1px solid #A87E2F;font-family:'IBM Plex Mono',monospace}
  .due .l{font-size:11px;letter-spacing:.14em;text-transform:uppercase}
  .due .v{font-size:17px;font-weight:600}
  .due .v.owe{color:#C25E33}
  .due .v.clear{color:#2F6B4F}
  .foot{font-size:10.5px;color:#5F6E64;margin-top:28px;border-top:1px solid #D8DCD2;padding-top:10px;line-height:1.65}
  @media print{body{background:#fff}.page{padding:.4in .5in}
    .due{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`;

export function statementHTML(model, unitInfo, { issuedISO } = {}) {
  const dba = unitInfo && unitInfo.dba ? unitInfo.dba : "";
  const label = monthLabel(model.ym);
  const rows = model.lines.length
    ? model.lines.map(l =>
        "<tr><td>" + esc(l.date) + "</td><td>" + esc(l.description) + "</td>" +
        '<td class="num">' + (l.charge !== null ? esc(fmt$(l.charge)) : "") + "</td>" +
        '<td class="num">' + (l.payment !== null ? esc(fmt$(l.payment)) : "") + "</td>" +
        '<td class="num">' + esc(fmt$(l.balance)) + "</td></tr>").join("")
    : '<tr><td colspan="5">No activity this month.</td></tr>';
  const v = model.closingBalance;
  const dueTxt = v < 0 ? "−" + fmt$(Math.abs(v)) + " CR" : fmt$(v);

  return '<!doctype html><html><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    "<title>Statement — Unit " + esc(model.unit) + " — " + esc(label) + "</title>" +
    FONTS + "<style>" + CSS + "</style></head><body>" +
    '<div class="page">' +
    '<div class="lh"><div class="wm">ON THE BOULEVARD</div>' +
    '<div class="sub">Belle Realty of Lafayette, LLC · 101–149 Arnould Blvd, Lafayette, LA 70506</div></div>' +
    "<h1>Statement — " + esc(label) + "</h1>" +
    '<div class="meta">Unit ' + esc(model.unit) + (dba ? " · " + esc(dba) : "") +
    "<br>Issued " + esc(fmtISO(issuedISO)) + "</div>" +
    '<p class="opening">Opening balance as of ' + esc(model.ym) + "-01: " + esc(fmt$(model.openingBalance)) + "</p>" +
    "<table><thead><tr><th>Date</th><th>Description</th>" +
    '<th class="num">Charges</th><th class="num">Payments</th><th class="num">Balance</th></tr></thead>' +
    "<tbody>" + rows +
    '<tr class="tot"><td></td><td>Totals</td>' +
    '<td class="num">' + esc(fmt$(model.totalCharges)) + "</td>" +
    '<td class="num">' + esc(fmt$(model.totalPayments)) + "</td><td></td></tr>" +
    "</tbody></table>" +
    '<div class="due"><span class="l">Balance due</span>' +
    '<span class="v ' + (v > 0 ? "owe" : "clear") + '">' + esc(dueTxt) + "</span></div>" +
    '<div class="foot">Remit per your lease; contact Belle Realty of Lafayette, LLC.<br>' +
    "Statement generated from the Atlas ledger — entries from " + esc(LEDGER_START_YM) + ".</div>" +
    "</div></body></html>";
}
