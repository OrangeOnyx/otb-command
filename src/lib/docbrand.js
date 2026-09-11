/* Orange Ocean B2B document brand — single source for the owner/entity
   printable documents (lib/brief.js monthly Owner Intelligence Brief,
   lib/boardreport.js quarterly Board / Lender / Stakeholder reports).
   Owner-facing → OO B2B brand per brand-orange-ocean.md, NOT the OTB tenant
   palette: Ocean Navy #1C2D4F, Sunset Orange #E8820C accent, Light #F0F4F8,
   Helvetica. Wordmark colorway on the navy bar = dark-background rule:
   ORANGE in orange, OCEAN in white. Pure strings + tiny pure helpers; no
   DOM, no network. Extracted 2026-09-11 (F-3) from the two identical local
   copies — the CSS below is the union (brief never used h3 / .warn, and
   they are inert there). */

export const OO_CSS = `
  body{font-family:Helvetica,Arial,sans-serif;color:#1C2D4F;margin:0;background:#F0F4F8}
  .page{max-width:8.5in;margin:0 auto;background:#fff;padding:.7in .8in}
  .bar{background:#1C2D4F;padding:20px 28px;display:flex;justify-content:space-between;align-items:baseline}
  .bar .wm{font-size:19px;font-weight:bold;letter-spacing:.14em}
  .bar .wm .o{color:#E8820C}.bar .wm .c{color:#fff}
  .bar .tag{font-size:10.5px;letter-spacing:.18em;color:#F0F4F8}
  h1{font-size:23px;margin:0 0 2px;letter-spacing:.02em}
  .sub{font-size:12px;color:#4A6FA5;letter-spacing:.08em;text-transform:uppercase;margin-bottom:22px}
  h2{font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:#1C2D4F;border-bottom:2px solid #E8820C;padding-bottom:4px;margin:26px 0 10px}
  h3{font-size:12.5px;letter-spacing:.06em;text-transform:uppercase;color:#1C2D4F;margin:18px 0 6px}
  .kpis{display:flex;gap:12px;flex-wrap:wrap;margin:14px 0 4px}
  .kpi{flex:1 1 150px;background:#F0F4F8;border-left:3px solid #E8820C;padding:12px 14px}
  .kpi .v{font-size:21px;font-weight:bold}
  .kpi .l{font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:#4A6FA5;margin-top:2px}
  .kpi .d{font-size:11px;margin-top:4px;color:#1C2D4F}
  .kpi .d.up{color:#2F6B4F}.kpi .d.down{color:#A33B1F}
  table{width:100%;border-collapse:collapse;font-size:11.5px}
  td,th{border:1px solid #C7D0DE;padding:5px 7px;text-align:left}
  th{background:#F0F4F8;font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:#1C2D4F}
  td.num,th.num{text-align:right;font-variant-numeric:tabular-nums}
  p,li{font-size:13px;line-height:1.55}
  .note{font-size:11.5px;color:#4A6FA5}
  .warn{font-size:12.5px;color:#A33B1F;font-weight:bold}
  .foot{font-size:10.5px;color:#4A6FA5;margin-top:32px;border-top:1px solid #C7D0DE;padding-top:10px;line-height:1.6}
  @media print{body{background:#fff}.page{padding:.35in .5in}.bar{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
`;

/* Navy masthead: wordmark left, document tag (already uppercase, trusted
   literal from the caller — never user input) right. */
export const OO_WORDMARK = `<span class="wm"><span class="o">ORANGE</span> <span class="c">OCEAN</span></span>`;
export const ooBar = tag => `<div class="bar">${OO_WORDMARK}<span class="tag">${tag}</span></div>`;

/* Entity signature block used in every OO document footer. */
export const OO_FOOT_LINES = `Orange Ocean, LLC · Property Manager for Belle Realty of Lafayette, LLC<br>
Adam Anthony Abdalla · 101-149 Arnould Blvd., Lafayette, LA 70506 · P 337-288-5411 · E adam@orangeocean.com · W orangeocean.com<br>`;

export const arrow = { up: "▲", down: "▼", flat: "—" };

export function kpiTile(value, label, deltaHtml) {
  return `<div class="kpi"><div class="v">${value}</div><div class="l">${label}</div>${deltaHtml || ""}</div>`;
}
