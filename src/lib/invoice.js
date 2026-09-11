/* Per-unit monthly INVOICE over the live ledger — F-1 (invoices + late fees →
   full parity). Pure seam: no DOM, no network; wiring lives in
   src/lib/invoiceUI.js (drawer) and src/views/maintenance.js (tenant face).

   An invoice is a DOCUMENT over the append-only ledger: the month's effective
   debits (charge + late_fee + nsf + adjustment — DEBIT_TYPES) for one unit.
   Number = INV-YYYYMM-<unit>, deterministic (the AC convention). What the
   `invoices` table stores is only the send/void lifecycle (status draft|sent|
   void, sent_on, sent_via, notes) plus a snapshot of amount + entry_ids;
   PAID IS DERIVED HERE, NEVER STORED — the FIFO fold in ledger.js decides.

   Contract
   ────────
   invoiceNumber(ym, unit)              → 'INV-202608-105'
   invoiceModel(entries, unit, ym)      → { id, unit, ym, monthLabel, lines[],
       entryIds[], amount, paid, balance, due } — entries = RAW ledger rows
       (voids applied here via effectiveEntries); rows for other units are
       ignored; null when the month carries no effective debit; null/empty-safe.
       due = the month's rent charge `due` (or its date), else 'YYYY-MM-01'.
   invoiceStatus(inv, entries, today)   → { status, overdue, amount, paid,
       balance, due } where status ∈ void · paid · partial · sent · draft:
       void    — stored status 'void', OR every entry_id is voided/absent
       paid    — FIFO payments cover the invoice's debits
       partial — some applied
       sent / draft — the stored lifecycle when nothing is applied
       overdue — balance > 0 and today is past due + graceDays (OTB_LATE_POLICY)
   invoiceHTML(model, unitInfo, { issuedISO, status }) → standalone printable
       HTML (statement.js palette/letterhead); <title> = the number so the
       browser's Save-as-PDF names the file. Every string is escaped.
   invoiceMonths(entries, todayYm)      → statementMonths restricted to months
       that carry an effective debit (newest first; [] when none). */

import {
  effectiveEntries, fifoOpenDebits, computeDaysLate,
  DEBIT_TYPES, OTB_LATE_POLICY, LEDGER_START_YM, round2,
} from "./ledger.js";
import { monthLabel, statementMonths } from "./statement.js";
import { esc, fmt$ } from "./format.js";

const YM_RE = /^\d{4}-\d{2}$/;
const MONTHS3 = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* 'YYYY-MM-DD' → "Aug 2, 2026" (pure — no Date/locale dependence). */
const fmtISO = iso => {
  const p = String(iso || "").split("-").map(Number);
  return p.length === 3 && MONTHS3[p[1] - 1] ? MONTHS3[p[1] - 1] + " " + p[2] + ", " + p[0] : String(iso || "");
};

/* ---- number ---- */
export function invoiceNumber(ym, unit) {
  if (!YM_RE.test(ym)) throw new Error("ym must be YYYY-MM");
  return "INV-" + ym.replace("-", "") + "-" + String(unit);
}

/* ---- model ---- */
export function invoiceModel(entries, unit, ym) {
  if (!YM_RE.test(ym)) throw new Error("ym must be YYYY-MM");
  const eff = effectiveEntries((entries || []).filter(e => e && e.unit === unit));
  const { debits } = fifoOpenDebits(eff);
  const month = debits.filter(d => String(d.entry.date).slice(0, 7) === ym);
  if (!month.length) return null;
  const lines = month.map(d => ({
    id: d.entry.id,
    date: String(d.entry.date),
    description: d.entry.description || d.entry.type,
    type: d.entry.type,
    code: d.entry.code || null,
    amount: round2(+d.entry.amount || 0),
    open: d.open,
  }));
  const amount = round2(lines.reduce((s, l) => s + l.amount, 0));
  const balance = round2(lines.reduce((s, l) => s + l.open, 0));
  const rent = month.find(d => d.entry.code === "rent");
  const due = rent ? String(rent.entry.due || rent.entry.date) : ym + "-01";
  return {
    id: invoiceNumber(ym, unit), unit, ym, monthLabel: monthLabel(ym),
    lines, entryIds: lines.map(l => l.id),
    amount, paid: round2(amount - balance), balance, due,
  };
}

/* ---- status (derived) ---- */
export function invoiceStatus(inv, entries, today, policy = OTB_LATE_POLICY) {
  const row = inv || {};
  const none = { status: "void", overdue: false, amount: 0, paid: 0, balance: 0, due: null };
  if (row.status === "void") return none;
  const ym = String(row.ym || "");
  if (!YM_RE.test(ym)) return none;
  const model = invoiceModel(entries, row.unit, ym);
  const ids = Array.isArray(row.entryIds) ? row.entryIds : Array.isArray(row.entry_ids) ? row.entry_ids : [];
  if (ids.length) {
    const live = new Set(effectiveEntries(entries || []).map(e => e.id));
    if (!ids.some(id => live.has(id))) return none;
  }
  if (!model) return none;
  const base = { amount: model.amount, paid: model.paid, balance: model.balance, due: model.due };
  const overdue = model.balance > 0 && !!today &&
    computeDaysLate({ referenceDate: today, dueDate: model.due, graceDays: policy.graceDays }) > 0;
  let status;
  if (model.balance <= 0) status = "paid";
  else if (model.paid > 0) status = "partial";
  else status = row.status === "sent" ? "sent" : "draft";
  return { status, overdue: status === "paid" ? false : overdue, ...base };
}

/* ---- month picker ---- */
export function invoiceMonths(entries, todayYm) {
  const rows = entries || [];
  if (!rows.length) return [];
  const have = new Set(effectiveEntries(rows)
    .filter(e => DEBIT_TYPES.includes(e.type))
    .map(e => String(e.date).slice(0, 7)));
  if (!have.size) return [];
  const ty = YM_RE.test(todayYm || "") ? todayYm : [...have].sort().pop();
  return statementMonths(rows, ty).filter(m => have.has(m));
}

/* ---- document (statement.js palette: paper/ink/brass/green, brick when owed) ---- */
const FONTS =
  '<link rel="preconnect" href="https://fonts.googleapis.com">' +
  '<link href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@600;700&family=Public+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">';

const CSS = `
  body{font-family:'Public Sans',Arial,sans-serif;color:#1C2B26;margin:0;background:#EDEFE8}
  .page{max-width:8.5in;margin:0 auto;background:#fff;padding:.8in .85in;position:relative}
  .lh{border-bottom:3px double #A87E2F;padding-bottom:14px;margin-bottom:22px}
  .lh .wm{font-family:'Big Shoulders Display',Impact,sans-serif;font-size:30px;font-weight:700;letter-spacing:.06em}
  .lh .sub{font-size:11px;letter-spacing:.08em;color:#5F6E64;margin-top:3px}
  h1{font-family:'Big Shoulders Display',Impact,sans-serif;font-size:21px;font-weight:600;letter-spacing:.05em;margin:0 0 3px;text-transform:uppercase}
  .meta{font-family:'IBM Plex Mono',monospace;font-size:11px;color:#5F6E64;margin-bottom:16px;line-height:1.7}
  .meta b{color:#1C2B26;font-weight:600}
  .stamp{position:absolute;top:.8in;right:.85in;font-family:'Big Shoulders Display',Impact,sans-serif;
         font-size:22px;letter-spacing:.14em;text-transform:uppercase;padding:4px 12px;border:2px solid;transform:rotate(-6deg)}
  .stamp.paid{color:#2F6B4F;border-color:#2F6B4F}
  .stamp.void{color:#C25E33;border-color:#C25E33}
  .stamp.overdue{color:#C25E33;border-color:#C25E33}
  table{width:100%;border-collapse:collapse;font-family:'IBM Plex Mono',monospace;font-size:11.5px}
  th{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#5F6E64;text-align:left;
     border-bottom:2px solid #1C2B26;padding:5px 8px}
  td{border-bottom:1px solid #D8DCD2;padding:6px 8px;vertical-align:top}
  td.num,th.num{text-align:right;font-variant-numeric:tabular-nums}
  tr.tot td{border-top:2px solid #1C2B26;border-bottom:0;font-weight:600}
  tr.pay td{color:#2F6B4F;border-bottom:0}
  .due{display:flex;justify-content:space-between;align-items:baseline;margin-top:16px;
       padding:12px 16px;background:#F6F7F1;border:1px solid #A87E2F;font-family:'IBM Plex Mono',monospace}
  .due .l{font-size:11px;letter-spacing:.14em;text-transform:uppercase}
  .due .v{font-size:17px;font-weight:600}
  .due .v.owe{color:#C25E33}
  .due .v.clear{color:#2F6B4F}
  .hint{font-family:'IBM Plex Mono',monospace;font-size:10.5px;color:#5F6E64;margin:14px 0 0;
        padding:8px 10px;border:1px dashed #A87E2F;background:#F6F7F1}
  .foot{font-size:10.5px;color:#5F6E64;margin-top:28px;border-top:1px solid #D8DCD2;padding-top:10px;line-height:1.65}
  @media print{body{background:#fff}.page{padding:.4in .5in}.hint{display:none}
    .stamp{top:.4in;right:.5in}
    .due,.stamp{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`;

export function invoiceHTML(model, unitInfo, { issuedISO, status } = {}) {
  const dba = unitInfo && unitInfo.dba ? unitInfo.dba : "";
  const rows = model.lines.map(l =>
    "<tr><td>" + esc(l.date) + "</td><td>" + esc(l.description) + "</td>" +
    '<td class="num">' + esc(fmt$(l.amount)) + "</td></tr>").join("");
  const v = model.balance;
  const st = status === "paid" || status === "void" ? status : status === "overdue" ? "overdue" : "";

  return '<!doctype html><html><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    "<title>" + esc(model.id) + "</title>" +
    FONTS + "<style>" + CSS + "</style></head><body>" +
    '<div class="page">' +
    (st ? '<div class="stamp ' + st + '">' + st + "</div>" : "") +
    '<div class="lh"><div class="wm">ON THE BOULEVARD</div>' +
    '<div class="sub">Belle Realty of Lafayette, LLC · 101–149 Arnould Blvd, Lafayette, LA 70506</div></div>' +
    "<h1>Invoice — " + esc(model.monthLabel) + "</h1>" +
    '<div class="meta">Invoice no. <b>' + esc(model.id) + "</b>" +
    "<br>Unit " + esc(model.unit) + (dba ? " · " + esc(dba) : "") +
    "<br>Issued " + esc(fmtISO(issuedISO)) + " · Due " + esc(fmtISO(model.due)) + "</div>" +
    "<table><thead><tr><th>Date</th><th>Description</th>" +
    '<th class="num">Amount</th></tr></thead>' +
    "<tbody>" + rows +
    '<tr class="tot"><td></td><td>Total charges</td>' +
    '<td class="num">' + esc(fmt$(model.amount)) + "</td></tr>" +
    '<tr class="pay"><td></td><td>Payments applied</td>' +
    '<td class="num">' + (model.paid > 0 ? "−" : "") + esc(fmt$(model.paid)) + "</td></tr>" +
    "</tbody></table>" +
    '<div class="due"><span class="l">Balance due</span>' +
    '<span class="v ' + (v > 0 ? "owe" : "clear") + '">' + esc(fmt$(Math.max(0, v))) + "</span></div>" +
    '<div class="hint">Print / Save as PDF — Ctrl+P (⌘P on Mac) → destination “Save as PDF”. The file names itself ' +
    esc(model.id) + ".</div>" +
    '<div class="foot">Remit per your lease; contact Belle Realty of Lafayette, LLC.<br>' +
    "Invoice generated from the Cypress Command ledger — entries from " + esc(LEDGER_START_YM) + ".</div>" +
    "</div></body></html>";
}
