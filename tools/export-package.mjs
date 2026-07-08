/* LLM/marketing export package — regenerate with `npm run export-package`.
   Emits to export/:
     OTB-SitePlan-A1.svg   standalone site plan (full scope incl. Lot 7)
     OTB-SitePlan-A1.html  wrapper used for the PNG raster (Edge headless)
     OTB-Property-Dossier.md  LLM-ready fact pack (paste into any model)
     OTB-Property-Data.json   machine-readable merge of all source data
   Everything derives from src/data/*.json — never hand-edit the outputs. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { unitFill, STATUS_META, CAT_META } from "../src/lib/colors.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const rd = f => JSON.parse(readFileSync(join(root, "src/data", f), "utf8"));
const geometry = rd("geometry.json");
const units = rd("units.json");
const compliance = rd("compliance.json");
const hvac = rd("hvac.json");
const recoveries = rd("recoveries.json");
const directory = rd("directory.json");
const NOFIN = process.argv.includes("nofin"); // buyer overview: strip all $ figures
const out = join(root, NOFIN ? "export-buyer" : "export");
mkdirSync(out, { recursive: true });

const TODAY = new Date(2026, 5, 10);
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* ── standalone SVG ─────────────────────────────────────────────── */
const attrStr = a => Object.entries(a || {}).map(([k, v]) => ` ${k}="${esc(v)}"`).join("");
function prim(p) {
  if (p.t === "rect") return `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}"${attrStr(p.attrs)}/>`;
  if (p.t === "line") return `<line x1="${p.x1}" y1="${p.y1}" x2="${p.x2}" y2="${p.y2}"${attrStr(p.attrs)}/>`;
  if (p.t === "text") return `<text x="${p.x}" y="${p.y}"${attrStr(p.attrs)}>${esc(p.s)}</text>`;
  if (p.t === "path") return `<path d="${p.d}"${attrStr(p.attrs)}/>`;
  return "";
}
const layer = name => `<g>${(geometry.layers[name] || []).map(prim).join("")}</g>`;

let unitsSvg = "<g>";
for (const u of units) {
  const p = geometry.units[u.unit];
  if (!p) continue;
  unitsSvg += `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="2" fill="${unitFill(u, "status")}" class="u-rect"/>`;
  const dark = u.status === "vacant";
  const narrow = p.w < 58 && p.h > p.w;
  const fs = narrow ? 15 : (p.w < 96 && p.h < 60 ? 13 : 17);
  const tx = p.x + p.w / 2, ty = narrow ? p.y + p.h / 2 : p.y + p.h / 2 - (p.w > 120 ? 8 : -1);
  const rot = narrow ? ` transform="rotate(-90 ${tx} ${ty})"` : "";
  unitsSvg += `<text x="${tx}" y="${ty}" class="u-num${dark ? " dk" : ""}" text-anchor="middle" dominant-baseline="middle" font-size="${fs}"${rot}>${esc(u.unit)}</text>`;
  if (p.w >= 120) {
    const nm = u.dba.length > 22 ? u.dba.slice(0, 21) + "…" : u.dba;
    unitsSvg += `<text x="${tx}" y="${p.y + p.h / 2 + 13}" class="u-dba" text-anchor="middle" fill="${dark ? "rgba(28,43,38,.6)" : "rgba(252,252,249,.85)"}">${esc(nm)}</text>`;
  }
}
unitsSvg += "</g>";

const VB = geometry.viewBox.full; // "0 -310 1480 1452"
const [vx, vy, vw, vh] = VB.split(" ").map(Number);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VB}" font-family="'IBM Plex Mono',monospace">
<style>
@import url('https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@600;700&amp;family=IBM+Plex+Mono:wght@400;600&amp;display=swap');
.svg-lab{font-family:'IBM Plex Mono',monospace;fill:rgba(28,43,38,.5);letter-spacing:.18em}
.svg-street{font-family:'Big Shoulders Display',sans-serif;font-weight:600;fill:rgba(28,43,38,.5);letter-spacing:.35em}
.u-rect{stroke:#1C2B26;stroke-width:1.1}
.u-num{font-family:'Big Shoulders Display',sans-serif;font-weight:700;fill:#FCFCF9}
.u-num.dk{fill:#1C2B26}
.u-dba{font-family:'IBM Plex Mono',monospace;font-size:9px}
</style>
<defs>
<pattern id="hatch" width="7" height="7" patternTransform="rotate(45)" patternUnits="userSpaceOnUse"><rect width="7" height="7" fill="#FCFCF9"/><line x1="0" y1="0" x2="0" y2="7" stroke="#B9BFAD" stroke-width="2"/></pattern>
<pattern id="hatch2" width="9" height="9" patternTransform="rotate(-45)" patternUnits="userSpaceOnUse"><rect width="9" height="9" fill="#EDEFE8"/><line x1="0" y1="0" x2="0" y2="9" stroke="#CDD2C2" stroke-width="1.5"/></pattern>
</defs>
<rect x="${vx}" y="${vy}" width="${vw}" height="${vh}" fill="#EDEFE8"/>
${layer("base")}${layer("remoteLot")}${layer("parking")}${unitsSvg}${layer("annotations")}${layer("generalNotes")}${layer("titleBlock")}
</svg>`;
writeFileSync(join(out, "OTB-SitePlan-A1.svg"), svg);

const pngW = 2960, pngH = Math.round(vh / vw * pngW);
writeFileSync(join(out, "OTB-SitePlan-A1.html"),
  `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;background:#EDEFE8">` +
  svg.replace("<svg ", `<svg width="${pngW}" height="${pngH}" `) + `</body></html>`);

/* ── derived metrics (from units.json; headline GLA stays 62,883) ── */
const sum = a => a.reduce((s, x) => s + x, 0);
const occ = units.filter(u => u.status !== "vacant");
const leased = units.filter(u => u.monthly > 0);
const vacant = units.filter(u => u.status === "vacant");
const holdovers = units.filter(u => u.status === "expired");
const sfSum = sum(units.map(u => u.sf));
const monthly = sum(units.map(u => u.monthly));
const pDate = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const fmt$ = n => "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
const exp12 = units.filter(u => u.end && pDate(u.end) > TODAY && pDate(u.end) < new Date(2027, 5, 10));
const annualRent = monthly * 12;
const holdRent = sum(holdovers.map(u => u.monthly * 12));
const exp12Rent = sum(exp12.map(u => u.monthly * 12));
const comp = { base: 0, cam: 0, tax: 0, ins: 0 };
units.forEach(u => { comp.base += (u.base || 0) * u.sf; const r = recoveries.units[u.unit]; if (r) { comp.cam += r.cam * u.sf; comp.tax += r.tax * u.sf; comp.ins += r.ins * u.sf; } });
comp.total = comp.base + comp.cam + comp.tax + comp.ins;
comp.recoveries = comp.cam + comp.tax + comp.ins;
const pct = (n, d) => (n / d * 100).toFixed(0) + "%";
const hvacRow = u => { const h = hvac.units[u.unit]; return h ? (h.repair === "100%" && h.replace === "100%" ? "tenant 100% (full)" : `${h.repair}/occ · ${h.replace} repl`) : "n/a"; };

/* ── dossier markdown ──────────────────────────────────────────── */
const row = u => NOFIN
  ? `| ${u.unit} | ${u.dba} | ${u.use} | ${u.sf.toLocaleString()} | ${u.end || "—"} | ${STATUS_META[u.status].label} |`
  : `| ${u.unit} | ${u.dba} | ${u.use} | ${u.sf.toLocaleString()} | ${u.total ? "$" + u.total.toFixed(2) : "—"} | ${u.monthly ? fmt$(u.monthly) : "—"} | ${u.end || "—"} | ${STATUS_META[u.status].label} |`;
const rollHead = NOFIN
  ? `| Unit | Tenant (DBA) | Use | SF | Term end | Status |\n|---|---|---|---|---|---|`
  : `| Unit | Tenant (DBA) | Use | SF | Total PSF | Monthly | Term end | Status |\n|---|---|---|---|---|---|---|---|`;
const glanceRent = NOFIN
  ? `- Tenancy: ${leased.length} occupied tenancies; full rent roll, income & NOI available to qualified parties under NDA`
  : `- In-place rent: ${fmt$(monthly)}/mo (${fmt$(monthly * 12)}/yr) across ${leased.length} paying tenancies`;
const finSection = NOFIN
  ? `## Financials\n*Withheld from this overview. The complete rent roll (per-unit base + NNN), income composition, NNN recoveries, revenue-at-risk, and NOI workup are available to qualified parties under an executed confidentiality agreement.*`
  : `## Financial summary
*Income derived from the rent-roll SOT (Sheet2 composition). Operating expenses are NOT in the SOT — NOI requires the owner's actual expense figures; do not invent them.*
- **In-place rent: ${fmt$(annualRent)}/yr** (${fmt$(monthly)}/mo)
- **Income composition** (annual, base + NNN recoveries reconcile to in-place rent):
  - Base rent ${fmt$(comp.base)} (${pct(comp.base, comp.total)})
  - CAM recovery ${fmt$(comp.cam)} (${pct(comp.cam, comp.total)})
  - Tax recovery ${fmt$(comp.tax)} (${pct(comp.tax, comp.total)})
  - Insurance recovery ${fmt$(comp.ins)} (${pct(comp.ins, comp.total)})
  - **NNN recoveries (CAM+Tax+Ins): ${fmt$(comp.recoveries)}/yr** — tenant reimbursements that offset the corresponding operating expenses
- **Revenue at risk: ${fmt$(holdRent + exp12Rent)}/yr (${pct(holdRent + exp12Rent, annualRent)} of in-place rent)** — ${fmt$(holdRent)} in ${holdovers.length} holdovers + ${fmt$(exp12Rent)} expiring within 12 months. WALT is short; near-term rollover is the central asset-management risk.
- Anchor concentration: Jason's Deli (149) is ${pct(units.find(u => u.unit === "149").monthly * 12, annualRent)} of in-place rent.`;
const hvacSection = NOFIN
  ? ""
  : `## HVAC cost responsibility (per lease, SOT)
Each tenant carries a per-occurrence/annual repair cap and a replacement share; above the cap the landlord covers, and a quarterly PM contract with **${hvac.provider}** (or an approved provider) is required. 100% = tenant fully responsible.
| Unit | Tenant | HVAC split (tenant) |
|---|---|---|
${units.map(u => `| ${u.unit} | ${u.dba} | ${hvacRow(u)} |`).join("\n")}
- Fully tenant-responsible (zero landlord HVAC exposure): ${units.filter(u => { const h = hvac.units[u.unit]; return h && h.repair === "100%" && h.replace === "100%"; }).map(u => u.unit).join(", ")}.

`;
const depositAnomaly = NOFIN ? "" : " · missing deposits 107/137/143/149";
const docTitle = NOFIN ? "Property Overview" : "Property Dossier";
const md = `# On The Boulevard Shopping Center — ${docTitle}
**101–149 Arnould Blvd, Lafayette, LA 70506** · Owner: Belle Realty of Lafayette, LLC (managed by Orange Ocean, LLC — Adam, Managing Member)
*Generated ${TODAY.toLocaleDateString("en-US")} from OTB Property Command (geometry REV ${geometry.rev.replace("REV ", "")}, traced from the recorded plat — Montagnet & Domingue, Inc., 5/20/1994, last rev. 7/19/2019). Companion image: OTB-SitePlan-A1.svg / .png*

> **How to use this file:** paste it (with the site-plan image if the model accepts images) into any LLM as grounding context for marketing copy, leasing flyers, broker packages, investor summaries, or Q&A. Every figure below traces to the recorded plat, the rent-roll source-of-truth workbook, or recorded easements.${NOFIN ? "" : ' Items under "Known anomalies" are unresolved source conflicts — do not let a model silently "fix" them.'}

## Property at a glance
- **GLA 62,883 SF** · 27 demised units · 2 buildings · 4.84 acres · zoned CH (Commercial Heavy), Lafayette, LA
- Hard-corner retail at **Johnston St (US Hwy 167, ±100' R/W)** and Arnould Blvd, with full block frontage: Arnould Blvd (80' concrete, address frontage), Patricia St (50'), Marie Antoinette St (40')
- **Anchor: Jason's Deli** (Unit 149, Deli Management, Inc.) at the Patricia × Arnould corner, term through 10/31/2030
- Occupancy: ${occ.length}/27 units (${(sum(occ.map(u => u.sf)) / sfSum * 100).toFixed(1)}% of SF); 2 vacancies totaling ${sum(vacant.map(u => u.sf)).toLocaleString()} SF
${glanceRent}
- Parking: variance Entry 99-11797 — **324 provided / 344 required**; floor space "limited to available parking spaces"; 20% green area required. Plat striping labels tally 314 (see reconciliation note below)

## ${NOFIN ? "Tenant roster" : "Rent roll"} (as of ${TODAY.toLocaleDateString("en-US")})
${rollHead}
${units.map(row).join("\n")}

- **Vacant / available:** ${vacant.map(u => `Unit ${u.unit} (${u.sf.toLocaleString()} SF${u.notes ? " — " + u.notes : ""})`).join("; ")}
- **Holdover tenancies (expired, in occupancy):** ${holdovers.map(u => `${u.unit} ${u.dba} (expired ${u.end})`).join("; ")}
- **Expirations within 12 months:** ${exp12.length ? exp12.map(u => `${u.unit} ${u.dba} (${u.end})`).join("; ") : "none"}
- Combined leases: 101+103 (Pink Paisley, 9,931 SF) · 115+117 (Clothing Loft, 4,340 SF) · 125+127 (Jordan Amanda, 4,273 SF) · 139+141 (Fast Pass, 3,834 SF)
- Owner-occupied: 135B (Belle Realty management office, 1,580 SF)

${finSection}

## Buildings & demising (plat-traced)
- **Long building (101–133):** 85.45' deep × 522.31' long, 19 bays; backs Marie Antoinette St with rear face 18.73' off the R/W (rear strip holds parallel parking over a 10' utility easement); storefronts face the main field; 101 at the Johnston end.
- **Short building (135–149):** 84.49' deep × 208.65' long along Patricia St; Jason's Deli (54.6') anchors the Arnould corner. The 37.4' Marie Antoinette-end section splits at mid-depth into two ~square units — **135A (C. Wolf Barber, breezeway side)** and **135B (Belle Realty, Patricia side)**, each 42.245' × 37.4' = 1,580 SF, both fronting M.A.
- 14.4' breezeway between the two buildings near the M.A. × Patricia corner.
- Per-bay demising widths and their plat sources are recorded in OTB-Property-Data.json → demising.

## Parking (plat striping, zone by zone)
| Zone | Spaces | Detail |
|---|---|---|
${geometry.parking.zones.map(z => `| ${z.zone} | ${z.count} | ${z.detail} |`).join("\n")}

**Total per plat labels: ${geometry.parking.totalPlat}** vs variance Entry 99-11797 "324 provided / 344 required" — **Δ −10 unreconciled** (variance-era striping may differ from the 7/19/2019 plat revision; treat 324 as the legal figure and 314 as the drawn striping count).
Fill order: Main field → Lot 8 (19 sp, Patricia/M.A. corner) → Lot 7 (remote, Block M, 110 Marie Antoinette St, parcel 6009649, 32 sp). Cross-parking licenses are non-exclusive — no assigned stalls.

## Liquor line (key for restaurant leasing)
Our Savior's Church easement §3a carries a **liquor waiver that survives termination** — it is what enables restaurant/alcohol leasing on the church side of the line. The plat-traced line runs ${geometry.liquorLine.bearing} for ${geometry.liquorLine.runFt}' parallel to Arnould at ${geometry.liquorLine.offsetFromArnouldFt}' off the R/W, with a ≈175'-radius arc at the west end around the church parcel corner (across Marie Antoinette). It crosses the short building at the 139/137 wall:
- **Outside the restricted zone (no waiver needed):** 149 Jason's Deli, 145, 143, 141, and most of 139 — plus the Arnould half of the main field.
- **Inside the restricted zone (waiver applies):** 137, 135A/B, the entire long building (101–133), and the M.A. half of the field.

## Easements & encumbrances
- **Our Savior's Church access & parking** — ${NOFIN ? "" : "$350/mo, "}25-yr term, Sundays + 6pm–midnight; §3a liquor waiver survives termination.
- **JD Bank reciprocal** — ${NOFIN ? "13 bank spaces" : "$250/mo to Belle + 13 bank spaces"} (6+7, drawn on plan); 50/50 maintenance; expires 12/30/2034; supersedes Entry 2004-00057697. The JD Bank corner parcel at Johnston × Arnould is **sold — NOT Belle property** (the "NOT A PART" notch).
- **Perimeter 10' utility easement** along Arnould, Patricia, Marie Antoinette (and Johnston per plat), plus Lot 7's rear line.
- **City of Lafayette electric easement, Entry 577566** — rear strip behind the long building.
- 5×5' guy easement at the pylon sign (Johnston-side boundary, sign has 2 adjacent spaces).
- Expired (of record only): three 15' temporary drainage easements, Entries 77-0783 / 77-000784 / 77-000785.

${hvacSection}## Covenants & operations notes
- **Jason's Deli §9.01:** landlord-side requirement that HVAC PM run monthly with **Butcher Air Conditioning**; tenant maintains 100% of Unit 149 HVAC.
- **Exclusive-use watch:** HotWorx (129, Mar 2024) vs C. Wolf Barber (135A, Nov 2024).
- Compliance tracking fields per unit: ${compliance.fields.map(f => f[1] || f).join(", ")}.
- Assessor parcels (Belle): 6026783 · 6026784 · 6026785 · 6026788 · 6009649 (remote Lot 7).
- Legal: Lots 1–3, 1–14, partition of Lots 1 & 2 Block I + remote parcel Block M, Arnold Heights Subd. Ext. No. 1 · outside SFHA.

## Key parties & document register
*Vendors, counterparties, agencies, and recorded instruments tracked in the tool's Directory (K-1).*
- **Parties:** ${directory.propertyContacts.map(c => c.company + " (" + c.role + ")").join(" · ")}.
- **Recorded instruments / key files:** ${directory.propertyDocuments.map(d => d.name + (d.ref && d.ref !== "—" ? " — " + d.ref : "")).join(" · ")}.

${NOFIN ? "" : `## Known anomalies (surfaced, unresolved — do not "fix")
- Headline GLA 62,883 SF vs unit-SF sum ${sfSum.toLocaleString()} SF (Δ ${(62883 - sfSum)} SF).
- Workbook: 101 SF 6,877 vs 6,677 · 117.5 SF 1,769 vs plat-implied 1,789 · 145 term-months "1572"${depositAnomaly}.
- Parking Δ −10 (plat 314 vs variance 324) — reconciliation memo pending.
- Plat internal conflicts: 117.5 dimension string 20.2' vs its SF label (implies 20.7'); LOT 12 block string 80.8' vs SF label (implies 79.6'). Strings govern in the drawing.

## Marketing angles (grounded)
- Two contiguous-feel vacancies in the long building: **131 (1,907 SF, LOI pending — furniture prospect)** and **133 (1,272 SF, smallest bay)**; adjacent, combinable ±3,179 SF at the Patricia end.
- Co-tenancy mix: anchor deli, women's fashion cluster (Pink Paisley, JC Kate, Jordan Amanda, Clothing Loft), services (HotWorx, salons, nails, barber), medical (Cat Clinic, Upstream PT), financial (OUPAC, 1st Franklin, Fast Pass).
- US Hwy 167 (Johnston St) exposure at the southern boundary; pylon sign at the Johnston-side corner.
- Restaurant-capable inline space on the permitted side of the liquor line without invoking the waiver (139–149 run); waiver covers the rest.
`}`;
writeFileSync(join(out, NOFIN ? "OTB-Property-Overview.md" : "OTB-Property-Dossier.md"), md);

/* ── merged machine-readable JSON ──────────────────────────────── */
const jsonObj = {
  meta: {
    property: "On The Boulevard Shopping Center, 101-149 Arnould Blvd, Lafayette, LA 70506",
    owner: "Belle Realty of Lafayette, LLC (manager: Orange Ocean, LLC)",
    generated: "2026-06-10", geometryRev: geometry.rev, source: geometry.source,
    headline: { glaSf: 62883, units: 27, buildings: 2, acres: 4.84, zoning: "CH" },
    ...(NOFIN ? { note: "Buyer overview — financial figures (rent, PSF, income, NOI, recoveries) withheld; available under NDA." } : {})
  },
  derived: NOFIN
    ? { unitSfSum: sfSum, occupiedUnits: occ.length, vacantUnits: vacant.length, vacantSf: sum(vacant.map(u => u.sf)), holdoverUnits: holdovers.map(u => u.unit) }
    : {
        unitSfSum: sfSum, monthlyIncome: Math.round(monthly), annualIncome: Math.round(annualRent),
        occupiedUnits: occ.length, vacantUnits: vacant.length, vacantSf: sum(vacant.map(u => u.sf)),
        holdoverUnits: holdovers.map(u => u.unit),
        incomeComposition: { base: Math.round(comp.base), cam: Math.round(comp.cam), tax: Math.round(comp.tax), ins: Math.round(comp.ins), nnnRecoveries: Math.round(comp.recoveries) },
        revenueAtRisk: { holdoverRent: Math.round(holdRent), expiring12moRent: Math.round(exp12Rent), total: Math.round(holdRent + exp12Rent) }
      },
  units: NOFIN ? units.map(({ base, total, monthly, ...u }) => u) : units,
  compliance,
  ...(NOFIN ? {} : { rentComposition: recoveries.units, hvac: hvac.units }),
  contacts: directory.propertyContacts, documents: directory.propertyDocuments,
  demising: geometry.demising, parking: geometry.parking, liquorLine: geometry.liquorLine,
  easements: geometry.easements, streets: geometry.streets, boundary: geometry.boundary
};
writeFileSync(join(out, NOFIN ? "OTB-Property-Data-NoFinancials.json" : "OTB-Property-Data.json"), JSON.stringify(jsonObj, null, 1));

console.log("export written:", out);
console.log("dossier:", md.length, "chars · svg:", svg.length, "chars · png target", pngW + "x" + pngH);
