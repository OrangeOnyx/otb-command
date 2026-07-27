/* Lease assembler (AI-1 leasing agent) — pure builders, no DOM/network.
   The Vercel function executes the assemble_lease_package tool with these:
   a tenant-facing LEASE PROPOSAL package (OTB public brand: Boulevard Navy /
   white, Helvetica — the thing that gets emailed) and/or the operator's own
   OWNER LEASE SUMMARY FORM filled (internal review copy, mirrors the
   Owner_Lease_Template_Form sections). Every generated document is stamped
   DRAFT — subject to legal review. Tested in test/lease.test.mjs. */

import { esc } from "./format.js";
export { esc };
const money = n => Number.isFinite(+n) ? "$" + (+n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—";
const psf = n => Number.isFinite(+n) ? "$" + (+n).toFixed(2) + " PSF/yr" : "—";

/* Claude tool definition (strict) — the leasing agent fills this from the
   conversation; the server executes it. */
export const LEASE_TOOL = {
  name: "assemble_lease_package",
  description: "Assemble a lease package for a unit at On The Boulevard once the operator has confirmed the business terms in conversation. package_type 'proposal' = tenant-facing lease proposal (emailable); 'owner_summary' = internal Owner Lease Summary Form for review. Only call when the operator explicitly asks to assemble/prepare/send a package and the required terms are known — never invent terms.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      package_type: { type: "string", enum: ["proposal", "owner_summary"] },
      unit: { type: "string", description: "Unit number exactly as in the rent roll, e.g. '131'" },
      tenant_company: { type: "string", description: "Prospective tenant legal/company name" },
      tenant_contact: { type: "string", description: "Contact person name ('' if unknown)" },
      tenant_email: { type: "string", description: "Contact email ('' if unknown)" },
      permitted_use: { type: "string", description: "Permitted use clause, e.g. 'retail sale of furniture'" },
      term_months: { type: "integer", description: "Initial term length in months" },
      base_psf: { type: "number", description: "Base rent $/SF/year" },
      free_rent_months: { type: "integer", description: "Free base-rent months (0 if none)" },
      escalation_pct: { type: "number", description: "Annual base-rent escalation percent (0 if flat)" },
      deposit: { type: "number", description: "Security deposit in dollars (0 if waived)" },
      ti_allowance: { type: "number", description: "Tenant-improvement allowance in dollars (0 if AS-IS)" },
      renewal_options: { type: "string", description: "Renewal option summary, e.g. 'one 5-year option at then-market' ('' if none)" },
      notes: { type: "string", description: "Any special terms to surface ('' if none)" },
    },
    required: ["package_type", "unit", "tenant_company", "tenant_contact", "tenant_email", "permitted_use", "term_months", "base_psf", "free_rent_months", "escalation_pct", "deposit", "ti_allowance", "renewal_options", "notes"],
    additionalProperties: false,
  },
};

export function packageFileName(p, today = "draft") {
  const slug = String(p.tenant_company || "tenant").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").slice(0, 40);
  return `unit-${p.unit}-${p.package_type}-${slug}-${today}.html`.replace(/--+/g, "-");
}

/* derived numbers shared by both documents */
export function leaseMath(p, unit, rec) {
  const sf = unit?.sf || 0;
  const nnn = rec ? (+rec.cam || 0) + (+rec.tax || 0) + (+rec.ins || 0) : 0;
  const baseMo = sf * p.base_psf / 12;
  const nnnMo = sf * nnn / 12;
  // L6: a term shorter than 12 months only accrues for its actual length.
  const term = Math.max(0, +p.term_months || 0);
  const payMonths = Math.min(12, term); // billable months in the first year
  const freeInY1 = Math.min(p.free_rent_months || 0, payMonths);
  return {
    sf, nnnPsf: nnn,
    baseMo, nnnMo, totalMo: baseMo + nnnMo,
    totalPsf: p.base_psf + nnn,
    year1: baseMo * Math.max(0, payMonths - freeInY1) + nnnMo * payMonths,
  };
}

const BRAND = `
  body{font-family:Helvetica,Arial,sans-serif;color:#1C2D4F;margin:0;background:#F5F5F5}
  .page{max-width:8.5in;margin:0 auto;background:#fff;padding:.9in .85in}
  h1{font-size:24px;letter-spacing:.06em;margin:0}
  h2{font-size:15px;letter-spacing:.08em;text-transform:uppercase;border-bottom:2px solid #1C2D4F;padding-bottom:4px;margin:26px 0 10px}
  .bar{background:#1C2D4F;color:#F5F5F5;padding:22px 28px;display:flex;justify-content:space-between;align-items:baseline}
  .bar .wm{font-size:22px;font-weight:bold;letter-spacing:.1em}
  .bar .draft{font-size:11px;letter-spacing:.2em;border:1px solid #F5F5F5;padding:3px 10px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  td,th{border:1px solid #B9C0CF;padding:7px 10px;text-align:left;vertical-align:top}
  th{background:#EEF1F6;font-size:11px;letter-spacing:.06em;text-transform:uppercase}
  .foot{font-size:10.5px;color:#5A6residual478;margin-top:34px;border-top:1px solid #B9C0CF;padding-top:10px}
  .foot,.legal{font-size:10.5px;color:#5A6478}
  p,li{font-size:13.5px;line-height:1.55}
  @media print{body{background:#fff}.page{padding:.4in .5in}}
`.replace("#5A6residual478", "#5A6478");

const CONTACT = "Adam Anthony Abdalla, Property Manager · 101-149 Arnould Blvd., Lafayette, LA 70506 · P 337-769-1554 · E info@ontheblvd.com · W ontheblvd.com";
const ATTRIBUTION = "Managed by Orange Ocean, LLC on behalf of Belle Realty of Lafayette, LLC.";

export function buildProposalHTML(p, unit, rec, hvacRow, today) {
  const m = leaseMath(p, unit, rec);
  const hv = hvacRow ? `Tenant HVAC responsibility per center standard: ${esc(hvacRow.repair || "per lease")} repair / ${esc(hvacRow.replace || "per lease")} replacement; quarterly PM with ${esc(hvacRow.provider || "an approved contractor")} (or approved provider) required.` : "HVAC responsibility per lease standard; quarterly PM contract with an approved provider required.";
  return `<!doctype html><html><head><meta charset="utf-8"><title>Lease Proposal — Unit ${esc(p.unit)} — On The Boulevard</title><style>${BRAND}</style></head><body>
<div class="bar"><span class="wm">ON THE BOULEVARD</span><span class="draft">DRAFT — SUBJECT TO LEGAL REVIEW</span></div>
<div class="page">
<h1>Lease Proposal — Suite ${esc(p.unit)}</h1>
<p>${esc(today)}<br>${esc(p.tenant_contact || "")}${p.tenant_contact ? "<br>" : ""}<b>${esc(p.tenant_company)}</b></p>
<p>Thank you for your interest in On The Boulevard Shopping Center, 101–149 Arnould Blvd., Lafayette, LA 70506.
We are pleased to propose the following business terms for Suite ${esc(p.unit)}. This proposal is an invitation
to negotiate only — it is not a lease, an offer, or a binding commitment, and all terms remain subject to a
mutually executed lease agreement and legal review.</p>
<h2>Proposed Terms</h2>
<table>
<tr><th style="width:34%">Premises</th><td>Suite ${esc(p.unit)}, ±${m.sf.toLocaleString()} SF · On The Boulevard Shopping Center</td></tr>
<tr><th>Permitted use</th><td>${esc(p.permitted_use)}</td></tr>
<tr><th>Initial term</th><td>${p.term_months} months${p.renewal_options ? " · Renewal: " + esc(p.renewal_options) : ""}</td></tr>
<tr><th>Base rent</th><td>${psf(p.base_psf)} — ${money(m.baseMo)}/month${p.escalation_pct ? ` · escalating ${p.escalation_pct}%/yr` : ""}</td></tr>
<tr><th>NNN recoveries (est.)</th><td>${psf(m.nnnPsf)} — ${money(m.nnnMo)}/month (CAM, taxes, insurance — reconciled annually)</td></tr>
<tr><th>Total occupancy (est.)</th><td><b>${psf(m.totalPsf)} — ${money(m.totalMo)}/month</b></td></tr>
${p.free_rent_months ? `<tr><th>Concession</th><td>${p.free_rent_months} month(s) free base rent (NNN payable)</td></tr>` : ""}
<tr><th>Security deposit</th><td>${p.deposit ? money(p.deposit) : "To be discussed"}</td></tr>
<tr><th>Condition / TI</th><td>${p.ti_allowance ? "Landlord TI allowance " + money(p.ti_allowance) : "Delivered AS-IS"}</td></tr>
<tr><th>HVAC</th><td>${hv}</td></tr>
${p.notes ? `<tr><th>Additional terms</th><td>${esc(p.notes)}</td></tr>` : ""}
</table>
<h2>The Center</h2>
<p>62,883 SF neighborhood center at Johnston Street (US Hwy 167) and Arnould Boulevard — an established
co-tenancy of restaurants, fashion, services, medical, and financial uses anchored by Jason's Deli, with
on-site parking and monument signage on the Johnston Street corner.</p>
<h2>Next Steps</h2>
<p>Reply to this proposal or contact us to schedule a walkthrough. Upon agreement of business terms we will
issue the lease for review by your counsel.</p>
<p style="margin-top:30px">Sincerely,<br><b>Adam Anthony Abdalla</b><br>Property Manager, On The Boulevard</p>
<div class="foot">${esc(CONTACT)}<br>${esc(ATTRIBUTION)}<br>DRAFT for discussion purposes only — not a binding offer. Estimates subject to reconciliation and change.</div>
</div></body></html>`;
}

export function buildOwnerSummaryHTML(p, unit, rec, hvacRow, today) {
  const m = leaseMath(p, unit, rec);
  const row = (k, v) => `<tr><th style="width:38%">${esc(k)}</th><td>${v}</td></tr>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Owner Lease Summary — Unit ${esc(p.unit)} — ${esc(p.tenant_company)}</title><style>${BRAND}</style></head><body>
<div class="bar"><span class="wm">OWNER LEASE SUMMARY</span><span class="draft">DRAFT · CONFIDENTIAL — OWNER USE ONLY</span></div>
<div class="page">
<h1>Suite ${esc(p.unit)} — ${esc(p.tenant_company)}</h1>
<p class="legal">Prepared ${esc(today)} by Orange Ocean Atlas (AI-1 leasing agent) from operator-confirmed terms. Mirrors the Owner Lease Summary Form — verify against the executed lease before filing.</p>
<h2>1 · Parties &amp; Premises</h2>
<table>
${row("Property", "On The Boulevard Shopping Center · 101–149 Arnould Blvd., Lafayette, LA 70506")}
${row("Landlord", "Belle Realty of Lafayette, LLC (LLC) · Manager: Orange Ocean, LLC")}
${row("Property manager", esc(ATTRIBUTION))}
${row("Tenant", `${esc(p.tenant_company)}${p.tenant_contact ? " · " + esc(p.tenant_contact) : ""}${p.tenant_email ? " · " + esc(p.tenant_email) : ""}`)}
${row("Premises", `Suite ${esc(p.unit)} · ±${m.sf.toLocaleString()} SF`)}
${row("Permitted use", esc(p.permitted_use))}
${row("Exclusive-use screen", "CHECK: HotWorx (129) vs C. Wolf (135A) exclusives; liquor-line position if food/alcohol use")}
</table>
<h2>2 · Term &amp; Key Dates</h2>
<table>
${row("Initial term", p.term_months + " months")}
${row("Free rent", (p.free_rent_months || 0) + " month(s)")}
${row("Renewal options", esc(p.renewal_options || "None specified"))}
</table>
<h2>3 · Rent Schedule</h2>
<table>
<tr><th>Component</th><th>PSF/yr</th><th>$/month</th></tr>
<tr><td>Base rent${p.escalation_pct ? ` (esc. ${p.escalation_pct}%/yr)` : ""}</td><td>${psf(p.base_psf)}</td><td>${money(m.baseMo)}</td></tr>
<tr><td>NNN (CAM/Tax/Ins per current recovery schedule)</td><td>${psf(m.nnnPsf)}</td><td>${money(m.nnnMo)}</td></tr>
<tr><td><b>Total</b></td><td><b>${psf(m.totalPsf)}</b></td><td><b>${money(m.totalMo)}</b></td></tr>
</table>
<h2>4 · Financial Summary</h2>
<table>
${row("Security deposit", p.deposit ? money(p.deposit) : "None / TBD")}
${row("Year-1 projected revenue", money(m.year1))}
${row("Stabilized annual revenue", money(m.totalMo * 12))}
${row("TI / landlord contribution", p.ti_allowance ? money(p.ti_allowance) : "None — AS-IS")}
</table>
<h2>6 · Maintenance / HVAC</h2>
<table>
${row("HVAC split", hvacRow ? esc((hvacRow.repair || "per lease") + " repair · " + (hvacRow.replace || "per lease") + " replacement") : "Per lease standard")}
${row("Required HVAC contractor", esc(hvacRow?.provider || "Approved provider") + " · quarterly PM")}
${row("Landlord", "Roof, exterior walls, structure, common areas")}
</table>
${p.notes ? `<h2>Special Terms</h2><p>${esc(p.notes)}</p>` : ""}
<h2>12 · Action List Before Signing</h2>
<ul>
<li>Confirm exclusive-use conflicts and liquor-line position for this use</li>
<li>Parking variance 99-11797 check — floor space limited to available parking</li>
<li>Certificate of insurance · personal guaranty decision · schedules A–F attached</li>
<li>Attorney review of the lease draft (this summary is not a lease)</li>
</ul>
<div class="foot">${esc(CONTACT)}<br>Generated draft — verify every figure against the rent-roll SOT and the executed lease.</div>
</div></body></html>`;
}

/* [[package:url|label]] lines ride the text stream from /api/concierge.
   Parsing (incl. the https-only scheme allowlist) lives in the shared card
   registry (lib/cards.js); this wrapper keeps the historical shape. */
import { extractCardsOf } from "./cards.js";
export function extractPackages(text) {
  const { clean, cards } = extractCardsOf(text, "package");
  return { clean, packages: cards.map(c => ({ url: c.token, label: c.label })) };
}
