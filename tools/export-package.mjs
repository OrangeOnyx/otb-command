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
import { esc, sumKnownAmounts } from "../src/lib/format.js";
import { splitUnits } from "./split-seed.mjs";
import { PAGES } from "../src/lib/pages.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const rd = f => JSON.parse(readFileSync(join(root, "src/data", f), "utf8"));
const geometry = rd("geometry.json");
const units = rd("units.json");
const compliance = rd("compliance.json");
const hvac = rd("hvac.json");
const recoveries = rd("recoveries.json");
const directory = rd("directory.json");
const vendors = rd("vendors.json");
const siteRegister = rd("site-register.json");
const meters = rd("meters.json");
const instruments = rd("instruments.json");
const renewalOptions = rd("renewal-options.json");
const recoveryTerms = rd("recovery-terms.json");
const heights = rd("heights.json");
const elevation = rd("elevation.json");
const waterMap = rd("twin-water-map.json");
const infrastructure = rd("twin-infrastructure.json");
const NOFIN = process.argv.includes("nofin"); // buyer overview: strip all $ figures
/* OTB_EXPORT_DIR: test override so the freshness guard can regenerate into a
   scratch dir without touching the repo's export/ snapshots. */
const out = process.env.OTB_EXPORT_DIR || join(root, NOFIN ? "export-buyer" : "export");
mkdirSync(out, { recursive: true });

const BASELINE_AS_OF = "2026-07-16";
const SCHEDULE_AS_OF = [BASELINE_AS_OF, ...units.map(u => u.leaseEvidence?.reviewedAt)
  .filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date || ""))].sort().at(-1);
const DATA_AS_OF = new Date(SCHEDULE_AS_OF + "T00:00:00");
const GENERATED = new Date();               // real generation date (audit M3)
const TODAY = DATA_AS_OF;                    // fixed review snapshot, not a live payment record
/* esc now imported from src/lib/format.js — the old local copy didn't escape
   `"`, which left attribute values injectable in the standalone SVG. */

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
${layer("base")}${layer("remoteLot")}${layer("parking")}${layer("access")}${unitsSvg}${layer("annotations")}${layer("easements")}${layer("generalNotes")}${layer("titleBlock")}
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
const fmtMonthly = n => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nextYear = new Date(TODAY); nextYear.setFullYear(nextYear.getFullYear() + 1);
const exp12 = units.filter(u => u.end && pDate(u.end) > TODAY && pDate(u.end) <= nextYear);
const annualRent = monthly * 12;
const holdRent = sum(holdovers.map(u => u.monthly * 12));
const exp12Rent = sum(exp12.map(u => u.monthly * 12));
const comp = { base: sumKnownAmounts(units.map(u => Number.isFinite(u.base) ? u.base * u.sf : null)) };
for (const key of ['cam', 'tax', 'ins']) comp[key] = sumKnownAmounts(units.map(u => {
  const value = recoveries.units[u.unit]?.[key];
  return Number.isFinite(value) ? value * u.sf : null;
}));
comp.total = sumKnownAmounts([comp.base, comp.cam, comp.tax, comp.ins]);
comp.recoveries = sumKnownAmounts([comp.cam, comp.tax, comp.ins]);
const roundedKnown = value => Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
const pct = (n, d) => (n / d * 100).toFixed(0) + "%";
const hvacRow = u => {
  const h = hvac.units[u.unit];
  if (!h) return "unavailable";
  if (h.repair == null || h.replace == null || h.repair === "Pending verification" || h.replace === "Pending verification")
    return "unresolved — " + (h.note || "see lease review and source clauses");
  return h.repair === "100%" && h.replace === "100%" ? "tenant 100% (full)" : `${h.repair}/occ · ${h.replace} repl`;
};

/* ── dossier markdown ──────────────────────────────────────────── */
const row = u => NOFIN
  ? `| ${u.unit} | ${u.dba} | ${u.use} | ${u.sf.toLocaleString()} | ${u.end || "—"} | ${STATUS_META[u.status].label} |`
  : `| ${u.unit} | ${u.dba} | ${u.use} | ${u.sf.toLocaleString()} | ${Number.isFinite(u.total) ? "$" + u.total.toFixed(2) : "—"} | ${Number.isFinite(u.monthly) ? fmtMonthly(u.monthly) : "—"} | ${u.end || "—"} | ${STATUS_META[u.status].label} |`;
const rollHead = NOFIN
  ? `| Unit | Tenant (DBA) | Use | SF | Term end | Status |\n|---|---|---|---|---|---|`
  : `| Unit | Tenant (DBA) | Use | SF | Total PSF | Monthly | Term end | Status |\n|---|---|---|---|---|---|---|---|`;
const glanceRent = NOFIN
  ? `- Tenancy: ${leased.length} occupied tenancies; full rent roll, income & NOI available to qualified parties under NDA`
  : `- Scheduled rent as of ${SCHEDULE_AS_OF}: ${fmtMonthly(monthly)}/month across ${leased.length} rent-bearing suites; ${fmtMonthly(monthly * 12)} annualized at the current monthly amount. This is not collected income or a forecast.`;
const componentLine = (label, value) => `  - ${label}: ${value == null ? "unavailable — one or more suite components unresolved" : fmt$(value) + "/year"}`;
const finSection = NOFIN
  ? `## Financials\n*Withheld from this overview. The complete rent roll (per-unit base + NNN), income composition, NNN recoveries, revenue-at-risk, and NOI workup are available to qualified parties under an executed confidentiality agreement.*`
  : `## Financial summary
*Current scheduled rent is the ${BASELINE_AS_OF} adopted roster with the source-reviewed and owner-confirmed changes listed below, reviewed through ${SCHEDULE_AS_OF}. Unreviewed fields retain their prior authority. This is not a restatement of the July Atlas snapshot or its historical ledger. Operating expenses and bank settlement are not established by this schedule; NOI requires actual expenses.*
- **Scheduled rent: ${fmtMonthly(monthly)}/month** as of ${SCHEDULE_AS_OF}; ${fmtMonthly(annualRent)} annualized at that amount. Planned renewals and future rent phases are listed separately and are not added to this current schedule.
- **Income components** (annualized PSF decomposition; stated rents and rounding exceptions may differ):
${componentLine("Base rent", comp.base)}
${componentLine("CAM recovery", comp.cam)}
${componentLine("Tax recovery", comp.tax)}
${componentLine("Insurance recovery", comp.ins)}
${componentLine("NNN recoveries (CAM + Tax + Insurance)", comp.recoveries)}
${comp.recoveries == null ? "- The aggregate recovery breakdown is unavailable. Null components are unknown, not zero. Do not claim the decomposition reconciles to scheduled rent or generate a CAM reconciliation from it." : "- Recovery amounts are scheduled reimbursements, not evidence of bank receipts or actual operating costs."}
- **Scheduled rent associated with known term dates:** ${fmt$(holdRent + exp12Rent)}/year annualized (${pct(holdRent + exp12Rent, annualRent)} of current scheduled rent) — ${fmt$(holdRent)} with an explicit expired status + ${fmt$(exp12Rent)} expiring within 12 months of ${SCHEDULE_AS_OF}. Unresolved term dates are excluded; this is not a complete risk measure.
- Anchor concentration: Jason's Deli (149) is ${pct(units.find(u => u.unit === "149").monthly * 12, annualRent)} of current scheduled rent.`;
const reviewedUnits = units.filter(u => u.leaseEvidence);
const leaseReviewSection = NOFIN || !reviewedUnits.length ? "" : `## Lease review and source authority
Reviewed changes through ${SCHEDULE_AS_OF} supplement the ${BASELINE_AS_OF} adopted roster. Owner confirmation is identified separately from reviewed signatures. A pending upload is not a reviewed signed instrument; tenant signature alone is not full execution. A planned combined-suite amount must not be counted once per suite.

${reviewedUnits.map(u => {
  const e = u.leaseEvidence;
  const lines = [`### ${u.unit} · ${u.dba}`, `- **${e.label || e.status}** · reviewed ${e.reviewedAt}`, `- ${e.summary}`];
  if (e.plannedRenewal) {
    const r = e.plannedRenewal;
    lines.push(`- Planned renewal — ${r.scope || 'suite ' + u.unit}: ${r.start || 'start unresolved'} to ${r.end || 'end unresolved'}; ${fmtMonthly(r.monthly)}/month combined total; status ${r.status}. ${r.includedInSchedule === true ? 'Marked included in current schedule.' : 'Excluded from the current scheduled amount.'}`);
  }
  for (const r of e.rentPhases || []) lines.push(`- Rent phase — ${r.label}: ${r.start || 'start unresolved'} to ${r.end || 'contractual end unresolved'}; ${fmtMonthly(r.monthly)}/month. Calendar mapping has the authority described in the sources; no automatic billing change is implied.`);
  if (e.ownerReportedPayment) lines.push(`- Owner-reported current payment: ${fmtMonthly(e.ownerReportedPayment.monthly)}/month, confirmed ${e.ownerReportedPayment.confirmedAt}. Bank settlement has not been reconciled; this confirmation does not create a payment entry.`);
  for (const s of e.sources || []) lines.push(`- Source [${s.kind}] ${s.title}${s.date ? ' · ' + s.date : ''}: ${s.reference || ''}${s.url ? ' · ' + s.url : ''}${s.excerpt ? ' — ' + s.excerpt : ''}`);
  for (const item of e.openItems || []) lines.push(`- Open: ${item}`);
  return lines.join('\n');
}).join('\n\n')}
`;
const hvacSection = NOFIN
  ? ""
  : `## HVAC cost responsibility (per lease, SOT)
Each tenant carries a per-occurrence/annual repair cap and a replacement share; above the cap the landlord covers, and a quarterly PM contract with **${hvac.provider}** (or an approved provider) is required. 100% = tenant fully responsible.
| Unit | Tenant | HVAC split (tenant) |
|---|---|---|
${units.map(u => `| ${u.unit} | ${u.dba} | ${hvacRow(u)} |`).join("\n")}
- Fully tenant-responsible (zero landlord HVAC exposure): ${units.filter(u => { const h = hvac.units[u.unit]; return h && h.repair === "100%" && h.replace === "100%"; }).map(u => u.unit).join(", ")}.

`;
/* ── site, instruments, lease-option and twin sections (2026-09 data) ── */
// Buyer overview strips dollar figures that ride inside instrument titles / register notes.
const noMoney = s => !NOFIN || s == null ? s : String(s).replace(/\s*\([^)]*\$[^)]*\)/g, "").replace(/\s*·?\s*tenant repair cap \$[^·]*(·[^·]*\$[^·]*)?/g, "").replace(/\$[\d,]+(\.\d+)?(\/mo)?/g, "[withheld]");
const dw = geometry.access.driveways;
const throat = d => d.throatWidthFt != null ? `${d.throatWidthFt}'` : "—";
const accessSection = `## Site access & circulation (A-1 ${geometry.rev}, from the architect CAD)
*Traced from Boulev_CLEAN.dxf and confirmed against the satellite base. All interior aisles are two-way per the plat flow arrows.*
| Cut | Street | Name | Movement | Throat |
|---|---|---|---|---|
${dw.map(d => `| ${d.id} | ${d.street} | ${d.name} | ${d.movement} | ${throat(d)} |`).join("\n")}
- **Arnould raised median:** ${geometry.access.arnouldMedian.widthFt}' wide; ${geometry.access.arnouldMedian.openings.map(o => `${o.widthFt}' opening at ${o.at}`).join("; ")}. ${geometry.access.arnouldMedian.note.replace(/^./, c => c.toUpperCase())}.
${geometry.access.openFrontage.map(f => `- **${f.where}:** ${f.detail}`).join("\n")}
- JD Bank parcel (NOT A PART) is reached through Driveway B and the Johnston drive; the reciprocal servitude area (Entry 2004-00057697, superseded 2020) is not drawn — exhibit not yet pulled.
`;
const tx = instruments.titleExceptions;
const instrumentsSection = `## Recorded instruments & title exceptions (set of record)
*${tx.items.length} recorded agreements verbatim from the AC archive (2026-08-29). The owner's title policy is still MISSING — reconcile against it when ordered.*
| Entry | Instrument | Status |
|---|---|---|
${tx.items.map(i => `| ${i.entryNumber} | ${noMoney(i.title)} | ${i.status} |`).join("\n")}
- **Exclusive-use watch:** ${instruments.exclusives.map(e => `${e.tenant} (${e.unit}, signed ${e.signed}, ${e.watch})`).join(" vs ")}.
`;
const a19 = instruments.appraisal2019;
const appraisalSection = NOFIN ? "" : `## 2019 appraisal (historical reference — not current value)
- ${a19.title} · ${a19.appraiser}, ${a19.firm} · effective ${a19.effectiveDate} (as-developed ${a19.effectiveDateAsDeveloped}) · ${a19.propertyRights}.
- As-is ${fmt$(a19.asIsValue)} · as-developed ${fmt$(a19.asDevelopedValue)} (income ${fmt$(a19.incomeApproachValue)} · sales ${fmt$(a19.salesComparisonValue)} · cost ${fmt$(a19.costApproachValue)}) · land ${fmt$(a19.landValue)} (${a19.landSf.toLocaleString()} SF, $${a19.landPsf}/SF).
- Appraiser's NOI ${fmt$(a19.noi)} at ${a19.capRatePct}% cap · 2019 property tax ${fmt$(a19.propertyTax2019)} (${a19.millage} mills).
- Building SF ${a19.buildingSf.toLocaleString()} is the appraiser's figure; the audit-grade GLA is 62,883 SF — cite the GLA. These are 2019 stabilized projections, not current rent-roll actuals.
`;
const capText = t => !t || t.capPct == null ? "no cap stated" :
  `${(t.capPct * 100).toFixed(0)}% over ${t.capBasis === "prior_year_actuals" ? "prior-year actuals" : t.capBasis}${t.capComponents?.length ? " on " + t.capComponents.join("/").toUpperCase() : ""}${t.capFromLeaseYear ? " from lease yr " + t.capFromLeaseYear : ""}`;
const leaseTermsSection = NOFIN ? "" : `## Renewal options & recovery caps (REFERENCE ONLY — verify against the executed lease)
*AI-extracted from the executed leases (AC lease-abstraction harvest 2026-08-29). The signed rent roll and the September 2026 lease review stay the source for term dates. No base-year stop is recorded for any suite. Tenant audit rights recorded for: ${Object.entries(recoveryTerms.units).filter(([, t]) => t.auditRights).map(([u]) => u).join(", ") || "none"}.*
| Unit | Tenant | Renewal option | Notice | Option rent basis | CAM/Tax/Ins cap |
|---|---|---|---|---|---|
${units.map(u => {
  const o = renewalOptions.units[u.unit];
  return `| ${u.unit} | ${u.dba} | ${o ? `${o.count} × ${o.term}` : "—"} | ${o ? o.noticeText : "—"} | ${o ? o.rentBasis : "—"} | ${capText(recoveryTerms.units[u.unit])} |`;
}).join("\n")}
`;
const regCount = {};
for (const i of siteRegister.items) (regCount[i.cat] ||= { n: 0, status: new Set() }), regCount[i.cat].n++, regCount[i.cat].status.add(i.status);
const CAT_LABEL = { column: "Walkway columns", can: "Trash cans", bench: "Benches", "meter-cluster": "City water-meter clusters", shutoff: "Tenant water shut-off clusters", ada: "ADA stalls", fence: "Fences", sign: "Signs", tree: "Trees", "lus-point": "LUS public utility points", "lus-main": "LUS water/sewer mains", transformer: "Transformers", pole: "Utility poles", lighting: "Site lighting", "ground-hp": "Ground heat pumps", bollard: "Bollards", walk: "Walks", firewall: "Firewalls", rtu: "Rooftop HVAC (per suite)", panel: "Electrical panels (per suite)", timeclock: "Lighting time clocks (per suite)" };
const wm = meters.meters.filter(m => m.kind === "wmeter"), em = meters.meters.filter(m => m.kind === "emeter");
const wc = waterMap.counts, wr = waterMap.countReconciliation;
const siteRegisterSection = `## Site register & physical assets (A-1 register, stable IDs)
*${siteRegister.items.length} digitized/recorded items with permanent IDs (e.g. col-01, can-01, shutoff-01, rtu-101) — the same IDs key the 3D twin. Positions are digitized from drawings (max fit RMS ${siteRegister.maxRmsPx}px), NOT surveyed. Stalls (${geometry.parking.totalStriped}), curb cuts and aisles are generated from the plat geometry and carry register IDs in the app.*
| Category | Count | Status |
|---|---|---|
${Object.entries(regCount).map(([c, v]) => `| ${CAT_LABEL[c] || c} | ${v.n} | ${[...v.status].join(", ")} |`).join("\n")}
- **Utility meters (Rev Belle Realty Arnould Blvd Property.xlsx):** ${wm.length} water · ${em.length} electric, each tied to a suite or house account (account names may lag the rent roll). Full list in the data JSON → meters.
- **Water map (operator utility map on the Oct 2020 survey):** ${wc.cityMeterAnnotations} city-meter locations holding ${wc.reportedCityMeters} meters · ${wc.tenantShutoffAnnotations} tenant shut-off locations holding ${wc.reportedTenantShutoffs} shut-offs (circle numbers are counts per location — confirmed by ${waterMap.countInterpretation.confirmedBy} ${waterMap.countInterpretation.confirmedOn}). **Unresolved:** map shows ${wr.mapReportedCityMeters} city meters vs ${wr.workbookWaterMeterIds} water-meter IDs in the workbook; this does not establish ${wr.workbookMinusMap} missing meters. Physical shut-off count not field-verified.
- Utility-source open items (preserved as recorded, not "fixed"):
${infrastructure.ambiguities.filter(a => !/legend defines colors/.test(a.detail)).map(a => "  - " + a.detail.replace(/\s+/g, " ")).join("\n")}
- **Building heights (CAD parapet, ft):** ${Object.entries(heights).map(([u, h]) => `${u} ${h}`).join(" · ")}.
`;
const twinSection = `## Digital twin & georeference
- **One frame for every twin asset:** horizontal EPSG:6344 (NAD83(2011) / UTM 15N, metres) · vertical NAVD88 (GEOID12B) · local origin E 591000 N 3341600. The USGS 3DEP LiDAR — not phone/drone GPS — sets position.
- **LiDAR:** ${elevation.source.split(" (")[0]} (${elevation.release}); 1 m bare-earth terrain + hillshade; AOI ${elevation.aoi.west}…${elevation.aoi.east} W, ${elevation.aoi.south}…${elevation.aoi.north} N.
- **Registered models:** A-1 register exterior twin (27 suites, ${geometry.parking.totalStriped} stalls, 39 columns, benches, cans, utilities; 0.78 m RMS vs LiDAR) · Floorplanner interior incl. upper floors (0.63 m RMS) · DJI photogrammetry mesh + Gaussian splat (Jul 2026 orbit) · Skydio survey poses (Oct 15 2025, 38 photos LiDAR-locked to 0.21–0.26 m) · Polycam iPhone LiDAR scan of the 149 corner + 145/143 frontage (Aug 18 2026).
- **Deliverables:** Blender/Unreal twin pack (docs/twin-pack-README.md), Google Earth KMZ (plan overlay, drone photos, COLLADA twin, LiDAR terrain), in-app A-2 lenses (iso · 3D · satellite · Google photorealistic 3D · drone Reality) and A-3 Asset Twin / A-4 Site Evidence / A-5 Exterior sheets.
- Asset IDs never renumber when geometry improves; coordinates for every register asset (local + EPSG:6344) ship in the twin pack's assets-twin-frame.csv.
`;
const depositAnomaly = NOFIN ? "" : " · missing deposits 107/137/143/149";
const docTitle = NOFIN ? "Property Overview" : "Property Dossier";
const md = `# On The Boulevard Shopping Center — ${docTitle}
**101–149 Arnould Blvd, Lafayette, LA 70506** · Owner: Belle Realty of Lafayette, LLC (managed by Orange Ocean, LLC — Adam, Managing Member)
*Generated ${GENERATED.toLocaleDateString("en-US")} · data as of ${DATA_AS_OF.toLocaleDateString("en-US")} · from Cypress Command Platform (geometry REV ${geometry.rev.replace("REV ", "")}, traced from the recorded plat — Montagnet & Domingue, Inc., 5/20/1994, last rev. 7/19/2019). Companion image: OTB-SitePlan-A1.svg / .png*

> **How to use this file:** paste it (with the site-plan image if the model accepts images) into any LLM as grounding context for marketing copy, leasing flyers, broker packages, investor summaries, or Q&A. Property geometry follows the recorded sources; the roster begins with the July 16, 2026 adopted records.${NOFIN ? "" : ' Later lease updates carry their own review status and references below. Owner confirmation, reviewed documents, and historical ledger entries have different authority. Known conflicts must remain explicit.'}

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

- **Vacant / available:** ${vacant.map(u => `Unit ${u.unit} (${u.sf.toLocaleString()} SF${!NOFIN && u.notes ? " — " + u.notes : ""})`).join("; ")}
- **Holdover tenancies (expired, in occupancy):** ${holdovers.map(u => `${u.unit} ${u.dba} (expired ${u.end})`).join("; ")}
- **Expirations within 12 months:** ${exp12.length ? exp12.map(u => `${u.unit} ${u.dba} (${u.end})`).join("; ") : "none"}
- Combined leases: 101+103 (Pink Paisley, 9,931 SF) · 115+117 (Clothing Loft, 4,340 SF) · 125+127 (Jordan Amanda, 4,273 SF) · 139+141 (Fast Pass, 3,834 SF)
- Owner-occupied: 135B (Belle Realty management office, 1,580 SF)

${finSection}

${appraisalSection}
${leaseReviewSection}
${leaseTermsSection}

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
**CANDIDATE reconciliation (REV 13):** ${geometry.parking.reconciliation} Ground confirmation owed — cite 324 legally, plan operations on ${geometry.parking.totalPlat} until confirmed.
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

${accessSection}
${instrumentsSection}

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
${NOFIN ? "" : `- **Service vendors on file (V-1 roster, from the AP vendor list):** ${vendors.filter(v => v.kind === "service").map(v => v.company).join(" · ")}. Full roster incl. payees in the data JSON.`}

${siteRegisterSection}
${twinSection}
## Center performance (Jul-2025 marketing package — marketing-grade, non-financial)
- 95% occupancy (industry benchmark cited 85%) · 88% tenant retention (industry 75–85%) · **14 businesses on the waiting list**.
- Transformation story: ~50% → 95% occupancy since the late-2019 renovation.
- Daily traffic 33,000+ vehicles · trade area ~1.1M people · I-10/I-49 hub position.
- Source + conflict flags: docs/marketing-package-2025.md (package GLA/site-area figures are superseded by the audit-grade numbers above).

${NOFIN ? "" : `## Known anomalies (surfaced, unresolved — do not "fix")
- Headline GLA 62,883 SF vs unit-SF sum ${sfSum.toLocaleString()} SF (Δ ${(62883 - sfSum)} SF).
- Workbook: 101 SF 6,877 vs 6,677 · 117.5 SF 1,769 vs plat-implied 1,789 · 145 term-months "1572"${depositAnomaly}.
- Parking Δ −10 (plat labels 314 vs variance 324) — candidate CAD reconciliation to 324 pending ground confirmation.
- Plat internal conflicts: 117.5 dimension string 20.2' vs its SF label (implies 20.7'); LOT 12 block string 80.8' vs SF label (implies 79.6'). Strings govern in the drawing.

## Marketing angles (grounded)
- Two contiguous-feel vacancies in the long building: **131 (1,907 SF, LOI pending — furniture prospect)** and **133 (1,272 SF, smallest bay)**; adjacent, combinable ±3,179 SF at the Patricia end.
- Co-tenancy mix: anchor deli, women's fashion cluster (Pink Paisley, JC Kate, Jordan Amanda, Clothing Loft), services (HotWorx, salons, nails, barber), medical (Cat Clinic, Upstream PT), financial (OUPAC, 1st Franklin, Fast Pass).
- US Hwy 167 (Johnston St) exposure at the southern boundary; pylon sign at the Johnston-side corner.
- Restaurant-capable inline space on the permitted side of the liquor line without invoking the waiver (139–149 run); waiver covers the rest.
- 2025 revenue story (marketing-grade): $788,105 (2019) → $1,047,394 (Jul-2025 package) = 32.9% growth; app in-place EGI (Jun 2026) $1,080,773 — different as-of/measure, do not mix in one document.
- Market lease-rate comp: $10–17/SF/yr NNN (LoopNet 2025, per the marketing package).
`}`;
writeFileSync(join(out, NOFIN ? "OTB-Property-Overview.md" : "OTB-Property-Dossier.md"), md);

/* ── merged machine-readable JSON ──────────────────────────────── */
const jsonObj = {
  meta: {
    property: "On The Boulevard Shopping Center, 101-149 Arnould Blvd, Lafayette, LA 70506",
    owner: "Belle Realty of Lafayette, LLC (manager: Orange Ocean, LLC)",
    generated: GENERATED.toISOString().slice(0,10), dataAsOf: SCHEDULE_AS_OF, rosterBaselineAsOf: BASELINE_AS_OF, geometryRev: geometry.rev, source: geometry.source,
    headline: { glaSf: 62883, units: 27, buildings: 2, acres: 4.84, zoning: "CH" },
    ...(NOFIN ? { note: "Buyer overview — financial figures (rent, PSF, income, NOI, recoveries) withheld; available under NDA." } : {})
  },
  derived: NOFIN
    ? { unitSfSum: sfSum, occupiedUnits: occ.length, vacantUnits: vacant.length, vacantSf: sum(vacant.map(u => u.sf)), holdoverUnits: holdovers.map(u => u.unit) }
    : {
        unitSfSum: sfSum, monthlyIncome: roundedKnown(monthly), annualIncome: roundedKnown(annualRent),
        incomeBasis: `Scheduled rent as of ${SCHEDULE_AS_OF}; annualized current monthly amount, not receipts or a forecast. Planned renewals and future phases remain separate.`,
        occupiedUnits: occ.length, vacantUnits: vacant.length, vacantSf: sum(vacant.map(u => u.sf)),
        holdoverUnits: holdovers.map(u => u.unit),
        incomeComposition: { base: roundedKnown(comp.base), cam: roundedKnown(comp.cam), tax: roundedKnown(comp.tax), ins: roundedKnown(comp.ins), nnnRecoveries: roundedKnown(comp.recoveries), status: comp.recoveries == null ? 'unresolved-components' : 'scheduled-psf-decomposition' },
        revenueAtRisk: { holdoverRent: Math.round(holdRent), expiring12moRent: Math.round(exp12Rent), total: Math.round(holdRent + exp12Rent) }
      },
  units: NOFIN ? splitUnits(units).publicUnits : units,
  compliance,
  ...(NOFIN ? {} : { rentComposition: recoveries.units, hvac: hvac.units }),
  contacts: directory.propertyContacts, documents: directory.propertyDocuments,
  ...(NOFIN ? {} : { vendors }),
  demising: geometry.demising, parking: geometry.parking, liquorLine: geometry.liquorLine,
  easements: geometry.easements, streets: geometry.streets, boundary: geometry.boundary,
  access: NOFIN ? JSON.parse(JSON.stringify(geometry.access).replace(/\$[\d,]+(\.\d+)?(\/mo)?/g, "[withheld]")) : geometry.access,
  instruments: {
    exclusives: instruments.exclusives, hvac149: instruments.hvac149,
    recordedAgreements: tx.items.map(i => ({ ...i, title: noMoney(i.title) })),
    ...(NOFIN ? {} : { jdBank: instruments.jdBank, appraisal2019: a19 })
  },
  ...(NOFIN ? {} : { renewalOptions: renewalOptions.units, recoveryTerms: recoveryTerms.units }),
  siteRegister: {
    note: "Positions digitized from drawings in A-1 plan pixels, NOT surveyed. IDs are permanent and key the 3D twin.",
    items: siteRegister.items.map(i => (NOFIN && i.sub ? { ...i, sub: noMoney(i.sub) } : i))
  },
  meters: meters.meters,
  water: { counts: waterMap.counts, countInterpretation: waterMap.countInterpretation, countReconciliation: waterMap.countReconciliation, sourceAmbiguities: infrastructure.ambiguities },
  buildingHeightsFt: heights,
  twinFrame: { horizontal: "EPSG:6344 NAD83(2011) / UTM 15N (m)", vertical: "NAVD88 GEOID12B (m)", localOrigin: { E: 591000, N: 3341600, H: 0 }, lidar: { source: elevation.source, release: elevation.release, aoi: elevation.aoi }, readme: "docs/twin-pack-README.md" }
};
/* Buyer JSON: free-text notes (directory, documents, easements) carry loan,
   insurance and easement dollar figures — withhold every $ amount and drop the
   internal riskNote commentary wholesale rather than chasing fields one by one. */
const buyerScrub = o => Array.isArray(o) ? o.map(buyerScrub)
  : o && typeof o === "object" ? Object.fromEntries(Object.entries(o).filter(([k]) => k !== "riskNote").map(([k, v]) => [k, buyerScrub(v)]))
  : typeof o === "string" ? o.replace(/\$\s?[\d,]+(\.\d+)?\s?(K|M|MM|million)?(\/(mo|yr|SF))?/gi, "[withheld]") : o;
writeFileSync(join(out, NOFIN ? "OTB-Property-Data-NoFinancials.json" : "OTB-Property-Data.json"), JSON.stringify(NOFIN ? buyerScrub(jsonObj) : jsonObj, null, 1));

/* ── platform capabilities brief (full export only) ─────────────
   The dossier is the PROPERTY fact pack; this is the TOOL fact pack — paste
   both into an LLM so it knows the asset AND the platform managing it. */
if (!NOFIN) {
  const platform = `# Cypress Command Platform — Platform Brief
*What the tool is and can do, for LLM grounding. Generated ${GENERATED.toLocaleDateString("en-US")}; companion to OTB-Property-Dossier.md (the property fact pack).*

**Live:** https://otb-command.vercel.app · orangeoceanatlas.com (magic-link auth); deployment address otb.cypresscommand.com · Stack: Vite vanilla-JS app + Supabase (auth/Postgres-RLS/storage/realtime) + Vercel serverless functions + Claude (Anthropic) + ElevenLabs voice + Twilio phone line. Repo is authoritative; every export is one-way and disposable.

## Sheets (drawing-set nav — ${PAGES.length} sheets)
- **D-0 Portfolio** — cross-property rollup (roster, ledger, maintenance); opens any property. **D-1 Dashboard** — KPIs + live action queue (the home sheet).
- **A-1 Site Plan** — plat-exact native SVG (recorded-plat trace), access/easement layers, the site register (270+ assets with permanent IDs: columns, benches, cans, meters, shut-offs, ADA stalls, trees, RTUs, panels, time clocks, every striped stall), unit click → shared drawer.
- **A-2 Spatial** — capture lenses: SVG isometric (CAD parapet heights) · Three.js 3D · satellite (footprints fitted to imagery) · Google photorealistic 3D tiles · 🎥 Reality (drone Gaussian splat aligned to plan space — units clickable inside the capture). Selection syncs everywhere.
- **A-3 Asset Twin** — docked 3D twin with permanent asset records, dated research evidence, interior floors, water-meter/shut-off mapping. **A-4 Site Evidence** — Google Earth views, aerials, plans, field photos. **A-5 Exterior & Site** — exterior/site model. The twin is registered to the USGS 3DEP LiDAR (EPSG:6344 + NAVD88) and exports as a Blender/Unreal pack and a Google Earth KMZ.
- **R-1 Rent Roll** (PSF breakdown) · **R-2 Rent Worksheet** (monthly prior vs expected rent, change reason, owner write-in) · **P-1 Financial** (income composition + NOI worksheet) · **C-1 Compliance** · **T-1 Critical Dates** · **W-1 Action Board** (kanban auto-seeded from live data) · **K-1 Directory** (contacts + document register).
- **B-1 Marketing** — availability flyers, center overview, tenant co-marketing cards, photo library; feeds the public /tour microsite. **L-1 Comm Log** — cross-channel correspondence incl. every phone call's summary, transcript and recording. **N-1 Matters** — long-running property affairs with meeting notes and attachments. **O-1 Operations** — SOP library with due/overdue tracking.
- **M-1 Maintenance** — work orders: tenants submit for their unit, operator assigns V-1 vendors. **S-1 Owner Safe** — RLS-sealed vault (owner+operator), 10-min signed URLs, access audit log.
- **AI-1 Agent Desk** — three Claude agents on one chat surface (below). **V-1 Vendor Portal** — per-vendor sealed document folders + assigned work orders.

## AI agent desk (AI-1)
- **🏛 Concierge** — grounded property Q&A. **🤝 Leasing Agent** — inventory, prospect screening (exclusive-use watch, liquor line, parking variance), and a LEASE ASSEMBLER tool: collects terms conversationally, then generates a tenant-facing Lease Proposal (OTB navy/white brand, DRAFT–subject-to-legal-review stamp, real SF/NNN/HVAC figures) or the internal Owner Lease Summary form; packages upload to sealed storage with 7-day signed links + one-click email compose. **🔧 Property Manager** — operations, HVAC splits/covenants, vendors, tenant-notice drafting.
- Grounding = this dossier (prompt-cached server-side) + a live digest of operator edits; the Anthropic key never ships to the client; assembly is operator-only; every conversation persists as a transcript (History panel reloads any thread).
- **Voice**: replies speak via ElevenLabs (server proxy), auto-speak toggle, mic input.

## Roles & security
- Roles: **operator** (full control) · **owner** (read-oriented: operator-picked sheets, Safe read, vendor-roster read) · **vendor** (one-sheet shell: ONLY V-1 — their own document folder and work orders; sealed from everything else at the database layer) · **tenant** (one-sheet shell: ONLY M-1, scoped to their own unit) · **pending** (holding pen — no access).
- **Phone line:** Twilio ConversationRelay + ElevenLabs voice answers leasing and maintenance calls; every call lands in L-1 with summary, transcript and recording.
- New sign-ins resolve: SOT Vendor-List email → vendor · operator's allowlist → owner · else pending. Operator manages access in-app (sidebar → Sign-in access…).
- Private storage buckets (assets/documents/safe/vendor-docs) with row-level-security policies; Safe + vendor access is audit-logged.

## Data & pipelines (all re-runnable)
- Source authority: July 16, 2026 adopted rent roster plus later per-suite document reviews and owner confirmations in units.leaseEvidence; unresolved components remain null. The workbook, HVAC history and vendor records retain their documented authority. Recorded plat CAD remains the geometry source. Derived exports are not new sources of truth.
- Generators: leasing posters + pylon artwork from CAD · owner proforma (Excel) · this LLM export + a no-financials buyer overview · concierge grounding context · splat pipeline (COLMAP → Brush → web splat) with a computational splat↔plan alignment fitter · satellite-georef fitter (re-fit when Esri refreshes imagery).
- Persisted state (compliance, notes, actions, contacts, documents, financials) syncs to Supabase; owners see live data.

## Conventions an LLM should respect
- Audit-grade facts in the dossier are immutable; known anomalies are surfaced, never silently "fixed".
- Generated lease documents are DRAFTS subject to legal review — nothing binds without an executed lease.
- Tenant-facing brand: Boulevard Navy #1C2D4F + white, Helvetica; attribution "Managed by Orange Ocean, LLC on behalf of Belle Realty of Lafayette, LLC."
`;
  writeFileSync(join(out, "OTB-Command-Platform.md"), platform);
}

console.log("export written:", out);
console.log("dossier:", md.length, "chars · svg:", svg.length, "chars · png target", pngW + "x" + pngH);
