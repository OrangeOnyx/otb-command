/* Per-tenant ANNUAL RECONCILIATION OF ADDITIONAL RENT (CAM / Tax / Ins) —
   F-2. Pure seam: no DOM, no network; wiring lives in src/views/financial.js
   (⤓ Statement chip on the P-1 recon card).

   Contract
   ────────
   camStatementModel(recon, unitRow, recoveries, terms, { year, unitInfo })
     recon   = reconModel() output (camrecon.js); unitRow = one of recon.units;
     recoveries = recoveries.json shape (PSF per unit); terms =
     recovery-terms.json `units` map; unitInfo = byUnit[unit] (base / total /
     monthly present only in an authenticated session — null-safe).
     Returns { unit, dba, year, priorYear, sf, share, glaSf, leaseYear,
       psf { basePsf, camPsf, taxPsf, insPsf, totalPsf, monthly } — null when
         unknown (never 0). Operator rule: the bare monthly is TOTAL rent;
         components appear only as this explicit PSF breakdown.
       lines [ { key, label, billed, actualShare, cappedShare, owed, capped } ],
       totals { billed, actualShare, cappedShare, owed },
       trueUp (owed − billed; null when recovery PSF is not on file),
       amountDue / credit (non-negative split of trueUp; null when trueUp null),
       cap { pct, applies, computed, binding, reason, fromLeaseYear,
             components, basis, note },
       auditRights, grossUp { factor, derived, occupancy, pct }, methodology,
       hasPrior, recoveriesKnown }.
     Every money figure is rounded to cents.

   camStatementHTML(model, unitInfo, { issuedISO })
     Standalone printable HTML document (OTB tenant palette, same letterhead
     and print CSS as statement.js). Every interpolated string is escaped.
     Unknown figures print as "—"; a statement without recovery PSF on file
     withholds the balance ("Not determinable") rather than printing $0. */

import { COMPONENTS, GLA_SF } from "./camrecon.js";
import { esc, fmt$ } from "./format.js";

const round2 = n => Math.round(n * 100) / 100;
const money = v => (v === null || v === undefined || !Number.isFinite(+v)) ? null : round2(+v);
const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];
const fmtISO = iso => {
  const p = String(iso || "").split("-").map(Number);
  return p.length === 3 && MONTHS[p[1] - 1]
    ? MONTHS[p[1] - 1].slice(0, 3) + " " + p[2] + ", " + p[0] : String(iso || "");
};

/* ---- model ---- */
export function camStatementModel(recon, unitRow, recoveries, terms, { year, unitInfo } = {}) {
  if (!recon || typeof recon !== "object") throw new Error("camStatementModel: recon model required");
  if (!unitRow || typeof unitRow !== "object" || unitRow.unit === undefined) throw new Error("camStatementModel: unit row required");
  const unit = unitRow.unit;
  const rec = (recoveries && recoveries.units && recoveries.units[unit]) || {};
  const t = (terms && terms[unit]) || null;
  const info = unitInfo || {};
  const y = Number.isInteger(+year) && year !== null && year !== undefined && year !== "" ? +year : recon.year;

  const lines = COMPONENTS.map(c => {
    const l = (unitRow.lines || {})[c.key] || {};
    const actual = money(l.actualShare) ?? 0;
    const capped = money(l.cappedShare);
    return { key: c.key, label: c.label, billed: money(l.billed) ?? 0, actualShare: actual,
      cappedShare: capped, owed: capped ?? actual, capped: !!l.capped };
  });
  const sum = k => round2(lines.reduce((s, l) => s + (l[k] || 0), 0));
  const capComputed = unitRow.cappedShare !== null && unitRow.cappedShare !== undefined;
  const totals = { billed: sum("billed"), actualShare: sum("actualShare"),
    cappedShare: capComputed ? sum("cappedShare") : null, owed: sum("owed") };
  const trueUp = unitRow.recoveriesKnown ? round2(totals.owed - totals.billed) : null;

  return {
    unit, dba: unitRow.dba || info.dba || "", year: y, priorYear: y === null ? null : y - 1,
    sf: +unitRow.sf || 0, share: +unitRow.share || 0, glaSf: recon.glaSf || GLA_SF, leaseYear: unitRow.leaseYear ?? null,
    psf: { basePsf: money(info.base), camPsf: money(rec.cam), taxPsf: money(rec.tax), insPsf: money(rec.ins),
      totalPsf: money(info.total), monthly: money(info.monthly) },
    lines, totals, trueUp,
    amountDue: trueUp === null ? null : Math.max(0, trueUp),
    credit: trueUp === null ? null : Math.max(0, -trueUp),
    cap: { pct: unitRow.capPct ?? null, applies: !!unitRow.capApplies, computed: capComputed, binding: !!unitRow.capBinding,
      reason: unitRow.capReason || "no cap on file", fromLeaseYear: unitRow.capFromLeaseYear ?? null,
      components: Array.isArray(unitRow.capComponents) ? unitRow.capComponents.slice() : [],
      basis: (t && t.capBasis) || null, note: (t && t.note) || null },
    auditRights: !!unitRow.auditRights,
    grossUp: { factor: recon.grossUpFactor, derived: !!recon.grossUpDerived, occupancy: recon.occupancy, pct: recon.grossUpPct ?? null },
    methodology: String(recon.methodology || "").replace(/\s*See Exhibit C\.?$/, ""),
    hasPrior: !!recon.hasPrior, recoveriesKnown: !!unitRow.recoveriesKnown,
  };
}

/* ---- document (OTB tenant palette — same sheet as statement.js) ---- */
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
  h2{font-family:'Big Shoulders Display',Impact,sans-serif;font-size:14px;font-weight:600;letter-spacing:.08em;margin:22px 0 6px;text-transform:uppercase;color:#5F6E64}
  .meta{font-family:'IBM Plex Mono',monospace;font-size:11px;color:#5F6E64;margin-bottom:16px;line-height:1.7}
  table{width:100%;border-collapse:collapse;font-family:'IBM Plex Mono',monospace;font-size:11.5px}
  th{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#5F6E64;text-align:left;
     border-bottom:2px solid #1C2B26;padding:5px 8px}
  td{border-bottom:1px solid #D8DCD2;padding:6px 8px;vertical-align:top}
  td.num,th.num{text-align:right;font-variant-numeric:tabular-nums}
  tr.tot td{border-top:2px solid #1C2B26;border-bottom:0;font-weight:600}
  .cap{font-family:'IBM Plex Mono',monospace;font-size:11px;margin:10px 0 0;padding:8px 12px;background:#F6F7F1;border-left:3px solid #A87E2F}
  .cap .n{display:block;color:#5F6E64;font-size:10px;margin-top:4px}
  .due{display:flex;justify-content:space-between;align-items:baseline;margin-top:16px;
       padding:12px 16px;background:#F6F7F1;border:1px solid #A87E2F;font-family:'IBM Plex Mono',monospace}
  .due .l{font-size:11px;letter-spacing:.14em;text-transform:uppercase}
  .due .v{font-size:17px;font-weight:600}
  .due .v.owe{color:#C25E33}
  .due .v.clear{color:#2F6B4F}
  .due .v.na{color:#5F6E64;font-size:12px}
  .method{font-size:11px;line-height:1.65;color:#1C2B26;margin:14px 0 0}
  .note{font-size:10.5px;color:#5F6E64;line-height:1.6;margin:8px 0 0}
  .foot{font-size:10.5px;color:#5F6E64;margin-top:28px;border-top:1px solid #D8DCD2;padding-top:10px;line-height:1.65}
  @media print{body{background:#fff}.page{padding:.4in .5in}
    .due,.cap{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`;

const cell = v => '<td class="num">' + (v === null || v === undefined ? "—" : esc(fmt$(v))) + "</td>";
const pct = p => (p * 100).toFixed(2) + "%";

export function camStatementHTML(model, unitInfo, { issuedISO } = {}) {
  const dba = (unitInfo && unitInfo.dba) || model.dba || "";
  const yr = model.year === null ? "—" : String(model.year);
  const p = model.psf;
  const gla = model.glaSf.toLocaleString("en-US");

  const psfRow = "<tr>" + cell(p.basePsf) + cell(p.camPsf) + cell(p.taxPsf) + cell(p.insPsf) + cell(p.totalPsf) +
    '<td class="num">' + (p.monthly === null ? "—" : esc(fmt$(p.monthly)) + "/mo") + "</td></tr>";

  const lineRows = model.lines.map(l =>
    "<tr><td>" + esc(l.label) + (l.capped ? " (capped)" : "") + "</td>" +
    cell(l.billed) + cell(l.actualShare) + cell(l.cappedShare) + cell(l.owed) + "</tr>").join("");
  const totRow = '<tr class="tot"><td>Totals</td>' + cell(model.totals.billed) + cell(model.totals.actualShare) +
    cell(model.totals.cappedShare) + cell(model.totals.owed) + "</tr>";

  let dueLabel, dueClass, dueTxt;
  if (model.trueUp === null) { dueLabel = "Balance"; dueClass = "na"; dueTxt = "Not determinable — recovery PSF not on file for this suite"; }
  else if (model.trueUp > 0) { dueLabel = "Amount due"; dueClass = "owe"; dueTxt = fmt$(model.trueUp); }
  else if (model.trueUp < 0) { dueLabel = "Credit to tenant"; dueClass = "clear"; dueTxt = "−" + fmt$(Math.abs(model.trueUp)) + " CR"; }
  else { dueLabel = "Balance"; dueClass = "clear"; dueTxt = fmt$(0) + " — estimates matched actuals"; }

  const capTxt = model.cap.pct === null
    ? "No cap on file for this lease."
    : "Cap: " + esc(model.cap.reason) + (model.cap.components.length ? " · covers " + esc(model.cap.components.join(", ").toUpperCase()) : "") +
      (model.cap.basis ? " · basis " + esc(model.cap.basis.replace(/_/g, " ")) : "");
  const capNote = model.cap.note ? '<span class="n">Abstract note: ' + esc(model.cap.note) + "</span>" : "";

  return '<!doctype html><html><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    "<title>CAM Reconciliation — Unit " + esc(model.unit) + " — " + esc(yr) + "</title>" +
    FONTS + "<style>" + CSS + "</style></head><body>" +
    '<div class="page">' +
    '<div class="lh"><div class="wm">ON THE BOULEVARD</div>' +
    '<div class="sub">Belle Realty of Lafayette, LLC · 101–149 Arnould Blvd, Lafayette, LA 70506</div></div>' +
    "<h1>Annual Reconciliation of Additional Rent — " + esc(yr) + "</h1>" +
    '<div class="meta">Unit ' + esc(model.unit) + (dba ? " · " + esc(dba) : "") +
    "<br>" + esc(model.sf.toLocaleString("en-US")) + " SF · pro-rata share " + esc(pct(model.share)) + " of " + esc(gla) + " SF GLA" +
    " · " + (model.leaseYear === null ? "Lease year not determinable" : "Lease year " + esc(model.leaseYear)) +
    "<br>Issued " + esc(fmtISO(issuedISO)) + "</div>" +

    "<h2>Scheduled rent (per SF, annual)</h2>" +
    '<table><thead><tr><th class="num">Base</th><th class="num">CAM</th><th class="num">Tax</th><th class="num">Ins</th>' +
    '<th class="num">Total PSF</th><th class="num">Total rent</th></tr></thead><tbody>' + psfRow + "</tbody></table>" +
    '<p class="note">Total rent is the monthly amount scheduled under the lease (base + additional rent); CAM, tax and insurance are the estimated additional-rent components it includes.</p>' +

    "<h2>Reconciliation — " + esc(yr) + "</h2>" +
    "<table><thead><tr><th>Component</th>" +
    '<th class="num">Estimates billed</th><th class="num">Actual share</th><th class="num">Capped share</th><th class="num">Owed</th></tr></thead>' +
    "<tbody>" + lineRows + totRow + "</tbody></table>" +
    '<p class="cap">' + capTxt + capNote + "</p>" +
    '<div class="due"><span class="l">' + esc(dueLabel) + '</span>' +
    '<span class="v ' + dueClass + '">' + esc(dueTxt) + "</span></div>" +

    "<h2>Methodology</h2>" +
    '<p class="method">' + esc(model.methodology) + " Your pro-rata share is " + esc(pct(model.share)) + " (" +
    esc(model.sf.toLocaleString("en-US")) + " SF of " + esc(gla) + " SF gross leasable area). Estimates billed are the CAM, tax and insurance " +
    "components of scheduled rent for the year; the amount owed is the lesser of your actual share and any lease cap on file.</p>" +
    (model.auditRights
      ? '<p class="note">Your lease provides audit rights over additional-rent records; supporting invoices and the expense ledger are available on request.</p>'
      : "") +
    '<div class="foot">Draft reconciliation prepared by Belle Realty of Lafayette, LLC; the signed lease governs and scheduled rent is unchanged by this statement.<br>' +
    "Generated from the Cypress Command operating-expense worksheet for " + esc(yr) + ".</div>" +
    "</div></body></html>";
}
