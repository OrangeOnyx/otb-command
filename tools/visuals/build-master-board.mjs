/* OTB master board (2026-10-01, operator ask): the CRE master board's
   eight-section layout rebuilt from real OTB assets — A-7 imagery, the A-8
   twin render, the approved v2 pylon with its panel register, and suite cards
   from units.json. Never prints a rate (marketing rule).
   Usage: node tools/visuals/build-master-board.mjs   (writes the HTML, then
   renders public/visuals/otb-master-board.webp with headless Chrome). */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = p => JSON.parse(readFileSync(path.join(root, p), "utf8"));
const units = read("src/data/units.json");
const unitList = Array.isArray(units) ? units : Object.values(units);
const byUnit = Object.fromEntries(unitList.map(u => [u.unit, u]));
const pylon = read("src/data/pylon.json");
const layout = read("reference/pylon/otb-pylon-final-v2/OTB_Pylon_Final_v2_panel_layout.json");
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const V = "../../../public/visuals/";
const sf = n => Number(n).toLocaleString("en-US") + " SF";

// Short sign names (display only; tenant of record lives in units.json).
const SHORT = { "107": "Great American Cookies", "111": "BERNINA", "125": "Jordan Amanda", "123": "The Tux Shoppe", "139": "Fast Pass", "143": "1st Franklin", "117.5": "Victoria Nails", "119.5": "Cat Clinic", "119": "OUPAC", "145": "Upstream" };
const panelName = p => SHORT[p.unit] ?? byUnit[p.unit]?.dba ?? "";

// 02 · pylon: approved v2 art with tenant names set into the measured panel faces.
const PW = 1023, PH = 1537, SHOW_H = 760, k = SHOW_H / PH;
const panelText = layout.panel_coordinates_px.map(c => {
  const p = pylon.panels.find(x => x.panel === "P" + c.id); if (!p) return "";
  const big = c.id <= 2;
  return `<div class="pt" style="left:${c.x * k}px;top:${c.y * k}px;width:${c.w * k}px;height:${c.h * k}px;font-size:${big ? 15 : 10.5}px">${esc(panelName(p))}</div>`;
}).join("");

// 07 · suite cards from the rent roll (no rates).
const card = (u, chip, cls, img) => `<div class="ui-card"><div class="ui-thumb" style="background-image:url(${V}${img})"></div><div><b>Suite ${esc(u.unit)}</b><span>${esc(u.status === "vacant" ? "Available" : u.dba)}</span><em class="${cls}">${chip}</em><small>${sf(u.sf)}</small></div></div>`;
const cards = [
  card(byUnit["131"], "Vacant", "terra", "otb-storefront-enhanced.webp"),
  card(byUnit["133"], "Vacant", "terra", "otb-storefront-study.webp"),
  card(byUnit["149"], "Anchor", "moss", "otb-center-golden.webp"),
  `<div class="ui-card note"><b>Lease renewal</b><span>Suites 139 / 141 · Fast Pass</span><em class="moss">Executed</em><small>Term 8/1/2026 – 7/31/2029</small></div>`,
  `<div class="ui-card note"><b>Critical date</b><span>Suite 145 · Upstream</span><em class="amber">Watch</em><small>Base-rent abatement ends Dec 2026</small></div>`
].join("");

// 08 · icon set (24-grid line icons, plan-room weight).
const I = {
  Property: '<path d="M3 20h18M5 20V9l7-5 7 5v11M9 20v-6h6v6"/>', Suite: '<rect x="4" y="3" width="16" height="18"/><path d="M8 7h3M13 7h3M8 11h3M13 11h3M10 21v-4h4v4"/>',
  Tenant: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4.5 4-7 8-7s7 2.5 8 7"/>', Lease: '<path d="M14 3H6v18h12V7zM14 3v4h4M9 12h6M9 16h4"/>',
  Invoice: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6"/>', "Work order": '<path d="M14.5 5.5a4 4 0 0 0-5 5L4 16l4 4 5.5-5.5a4 4 0 0 0 5-5l-2.5 2.5-3-1-1-3z"/>',
  Inspection: '<rect x="5" y="4" width="14" height="17"/><path d="M9 4V2h6v2M9 12l2 2 4-4"/>', Parking: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/>',
  Lighting: '<path d="M12 21V6M6 6h12M6 6v2h4V6M14 6v2h4V6"/>', Landscaping: '<path d="M12 21v-7M12 14c-4 0-6-3-6-6 3 0 6 2 6 6zM12 14c0-5 3-8 7-8 0 4-3 8-7 8z"/>',
  HVAC: '<rect x="3" y="6" width="18" height="12"/><circle cx="15" cy="12" r="3.5"/><path d="M6 9h4M6 12h4M6 15h4"/>', Electrical: '<path d="M13 2 5 14h6l-1 8 8-12h-6z"/>',
  Trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/>', Security: '<path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z"/><path d="m9 12 2 2 4-4"/>'
};
const icons = Object.entries(I).map(([label, d]) => `<div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round">${d}</svg><span>${label}</span></div>`).join("");

const elements = [["site-trees", "Trees"], ["site-islands", "Landscape islands"], ["site-stalls", "Stalls · ADA"], ["site-light-poles", "Twin-head poles"], ["site-bollards", "Bollards"], ["site-hvac", "HVAC"], ["site-electrical", "Electrical"], ["site-dumpster", "Dumpster enclosure"]]
  .map(([f, l]) => `<figure><img src="${V}${f}.webp" alt=""><figcaption>${l}</figcaption></figure>`).join("");

const STATES = [["Tenant", "#FBF7EE", "#1C2B26"], ["Anchor", "#1E4D3A", "#F3EDE0"], ["New tenant", "#2F6B4E", "#F3EDE0"], ["Vacant", "#C2562B", "#fff"], ["Coming soon", "#8E9A86", "#fff"], ["Under renovation", "#E8DCC2", "#1C2B26"], ["Not available", "#8E2F25", "#fff"]];
const legend = STATES.map(([l, bg, fg]) => `<div class="st"><i style="background:${bg};color:${fg}"></i>${l}</div>`).join("");

const html = `<!doctype html><html><head><meta charset="utf-8"><title>OTB Master Board</title><style>
@font-face{font-family:Fraunces;src:url(../../../public/brand/cypress/fonts/Fraunces-400.woff2)}
@font-face{font-family:Inter;src:url(../../../public/brand/cypress/fonts/Inter-400.woff2)}
@font-face{font-family:JBM;src:url(../../../public/brand/cypress/fonts/JetBrainsMono-400.woff2)}
*{box-sizing:border-box}body{margin:0;width:1536px;height:1024px;background:#F3EDE0;color:#0A1F16;font-family:Inter,Arial,sans-serif;overflow:hidden}
.b{padding:18px 22px;height:100%;display:grid;grid-template-rows:94px 1fr;gap:6px}
header{display:grid;grid-template-columns:280px 1fr 400px 140px;align-items:center;gap:22px;border-bottom:1.5px solid #0A1F16;padding-bottom:18px}
header img{width:264px;display:block}h1{font:400 27px/1.05 Fraunces,Georgia,serif;letter-spacing:.06em;margin:0;text-transform:uppercase}
.kick{font:10.5px JBM,monospace;letter-spacing:.32em;color:#5f6e64;margin-top:6px;text-transform:uppercase}
header p{font-size:11.5px;line-height:1.4;margin:0;border-left:1px solid #b9b1a0;padding-left:16px}
header ul{list-style:none;margin:0;padding:0 0 0 14px;border-left:1px solid #b9b1a0;font:9.5px JBM,monospace;letter-spacing:.18em;line-height:1.7;text-transform:uppercase}
main{display:grid;grid-template-columns:repeat(12,1fr);grid-template-rows:228px 258px 134px 104px 104px;gap:8px 14px}
section{position:relative;min-height:0}
h2{font:600 12.5px Inter,sans-serif;letter-spacing:.06em;margin:0;text-transform:uppercase}h2 b{font-family:JBM,monospace;margin-right:10px}
h3{font:9px JBM,monospace;letter-spacing:.24em;color:#6b6458;margin:2px 0 6px 28px;text-transform:uppercase;font-weight:400}
.fill{position:absolute;left:0;right:0;top:34px;bottom:0;background-size:contain;background-repeat:no-repeat;background-position:center;mix-blend-mode:multiply}
.s01{grid-column:1/9;grid-row:1}.s02{grid-column:9/13;grid-row:1/4;border-left:1px solid #cfc6b4;padding-left:14px}
.s03{grid-column:1/9;grid-row:2}.s04{grid-column:1/5;grid-row:3}.s05{grid-column:5/9;grid-row:3}
.s06{grid-column:1/13;grid-row:4}.s07{grid-column:1/8;grid-row:5}.s08{grid-column:8/13;grid-row:5}
.py{position:absolute;top:34px;left:6px;width:${PW * k}px;height:${SHOW_H}px;transform:scale(.62);transform-origin:top left}
.py img{width:100%;height:100%}.pt{position:absolute;display:flex;align-items:center;justify-content:center;text-align:center;font-family:Fraunces,Georgia,serif;color:#2c2418;line-height:1.05;padding:0 4px}
.states{position:absolute;left:${PW * k * .62 + 18}px;top:44px;right:0}.states h4{font:600 10px Inter;letter-spacing:.12em;margin:0 0 8px;text-transform:uppercase}
.st{display:flex;align-items:center;gap:9px;font-size:11px;margin-bottom:7px}.st i{width:46px;height:24px;border:1px solid #cfc6b4}
.s07 .row{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-top:6px}
.ui-card{background:#FBF8F1;border:1px solid #d9cfbd;border-radius:6px;padding:5px 7px;font-size:9.5px;display:grid;gap:1px;align-content:start}
.ui-thumb{height:22px;border-radius:3px;background-size:cover;background-position:center}.ui-card b{font-size:11px;display:block}.ui-card span{display:block;color:#5f6e64}
.ui-card em{font-style:normal;font-size:9px;padding:1px 6px;border-radius:3px;justify-self:start;margin-top:2px;display:inline-block}.ui-card small{display:block;font:9px JBM,monospace;color:#5f6e64}
.terra{background:#C2562B;color:#fff}.moss{background:#2F6B4E;color:#fff}.amber{background:#F2D49A;color:#5a3d00}
.s06 .row{display:grid;grid-template-columns:repeat(8,1fr);gap:10px;margin-top:4px}.s06 figure{margin:0}.s06 img{width:100%;height:62px;object-fit:contain;border:1px solid #e3dccd;background:#F6F1E6}
.s06 figcaption{font:9px JBM,monospace;letter-spacing:.14em;text-transform:uppercase;text-align:center;margin-top:3px}
.icons{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-top:4px}.ic{display:grid;justify-items:center;gap:1px;border:1px solid #d9cfbd;border-radius:5px;background:#FBF8F1;padding:3px 1px;font-size:7.5px}
.ic svg{width:16px;height:16px;color:#1E4D3A}
footer{position:absolute;right:24px;bottom:6px;font:8.5px JBM,monospace;letter-spacing:.14em;color:#8a8273;text-transform:uppercase}
</style></head><body><div class="b">
<header><img src="../../../public/brand/cypress/cc-04c-horizontal-primary.svg" alt="Cypress Command Platform">
<div><h1>Commercial Real Estate<br>Asset Library</h1><div class="kick">On The Boulevard · 101–149 Arnould Blvd · Lafayette, LA</div></div>
<p>A consistent visual system for property management, leasing, mapping and reporting — drawn from On The Boulevard's own twin, register and rent roll.</p>
<ul><li>Properties</li><li>Tenants</li><li>Assets</li><li>Work orders</li><li>Reports</li></ul></header>
<main>
<section class="s01"><h2><b>01</b>Property overview</h2><h3>The center · golden hour</h3><div class="fill" style="background-image:url(${V}otb-center-golden.webp)"></div></section>
<section class="s02"><h2><b>02</b>Pylon sign · 14 panels</h2><h3>Approved v2 · panel register</h3>
<div class="py"><img src="${V}otb-pylon-v2.webp" alt="">${panelText}</div>
<div class="states"><h4>Sign panel states</h4>${legend}</div></section>
<section class="s03"><h2><b>03</b>Site · 3D twin</h2><h3>Buildings · parking · landscape · site elements</h3><div class="fill" style="background-image:url(${V}otb-twin-day.webp);top:30px"></div></section>
<section class="s04"><h2><b>04</b>Storefront</h2><h3>Enhanced · leasing</h3><div class="fill" style="background-image:url(${V}otb-storefront-enhanced.webp);background-size:cover;background-position:center 62%;mix-blend-mode:normal"></div></section>
<section class="s05"><h2><b>05</b>Service & utilities</h2><h3>Electrical · meters · disconnects</h3><div class="fill" style="background-image:url(${V}site-electrical.webp);background-size:cover;background-position:center 55%"></div></section>
<section class="s06"><h2><b>06</b>Common site elements</h2><div class="row">${elements}</div></section>
<section class="s07"><h2><b>07</b>UI components · from the live rent roll</h2><div class="row">${cards}</div></section>
<section class="s08"><h2><b>08</b>Icon library</h2><div class="icons">${icons}</div></section>
</main>
</div>
<footer>Cypress Command Platform · On The Boulevard · appearance only — A-1 / A-2 / A-3 remain the record</footer>
</body></html>`;

const out = path.join(root, "docs/design/otb-master-board/otb-master-board.html");
writeFileSync(out, html);
console.log("wrote", path.relative(root, out));

const chrome = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "/usr/bin/google-chrome"].find(existsSync);
if (chrome && !process.argv.includes("--html-only")) {
  const png = path.join(root, "docs/design/otb-master-board/otb-master-board.png");
  execFileSync(chrome, ["--headless=new", "--hide-scrollbars", "--allow-file-access-from-files", "--force-device-scale-factor=2",
    "--window-size=1536,1024", "--virtual-time-budget=8000", `--screenshot=${png}`, "file:///" + out.replace(/\\/g, "/")], { stdio: "ignore" });
  console.log("rendered", path.relative(root, png));
}
