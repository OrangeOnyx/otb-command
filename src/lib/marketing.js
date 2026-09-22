/* B-1 Marketing — pure seam (2026-09-18, operator pick "1 2 and 3"). Every
   marketing piece is ASSEMBLED from the source of truth, never hand-kept:
   the rent roll (units.public shape), the verified tenant logo thumbs, the
   operator's photo library (assets bucket, hero picks in the `marketing`
   layer), the corridor snapshot (drive times, Google rating) and the hosted
   one-pager / tour URLs. Three printable outputs:
     flyerHTML      — availability flyer, one vacant suite, Letter portrait
     overviewHTML   — center overview sheet (stats · logo wall · site plan)
     tenantCardHTML — 1080×1080 co-marketing card for one tenant
   Public-facing pieces use the OTB brand (navy / Helvetica, per the
   twin-marketing rule: welcoming, local, no legal jargon) — NOT the plan-room
   app chrome. Images must be absolute (the pages open as blob documents).
   No DOM, no network — tested in test/marketing.test.mjs. */
import { LEASING_URL } from "./leasing.js";

export const OTB_PUBLIC = Object.freeze({
  name: "On The Boulevard Shopping Center",
  short: "On The Boulevard",
  address: "101–149 Arnould Blvd, Lafayette, LA 70506",
  corner: "Johnston St (US-167) at Arnould Blvd",
  phone: "(337) 270-7044",
  leasingUrl: LEASING_URL,
  tourUrl: "https://otb.cypresscommand.com/tour",
  navy: "#1C2D4F", gold: "#C9A24B", paper: "#F7F5EF",
});

export const CARD_HEADLINES = Object.freeze({
  welcome: "Welcome to the neighborhood",
  open: "Now open at On The Boulevard",
  featured: "Find them at On The Boulevard",
});

const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]));
const n0 = n => Number(n || 0).toLocaleString("en-US");
const abs = (origin, path) => (!path ? "" : /^(https?:|data:|blob:)/.test(path) ? path : String(origin || "").replace(/\/$/, "") + path);

/* ---- property stats from the roll ---- */
export function propertyStats(units) {
  const roll = Array.isArray(units) ? units : [];
  const gla = roll.reduce((s, u) => s + (Number(u.sf) || 0), 0);
  const vacant = roll.filter(u => u.status === "vacant").map(u => ({ unit: u.unit, sf: Number(u.sf) || 0, use: u.use || "" }));
  const vacantSf = vacant.reduce((s, v) => s + v.sf, 0);
  const anchor = roll.find(u => u.status === "anchor") || roll.find(u => u.unit === "149") || null;
  return {
    gla, count: roll.length, vacant, vacantSf,
    occupiedSf: gla - vacantSf,
    occupancyPct: gla ? Math.round((gla - vacantSf) / gla * 1000) / 10 : 0,
    leased: roll.length - vacant.length,
    anchor: anchor ? { unit: anchor.unit, dba: anchor.dba } : null,
  };
}

/* co-tenancy strip: occupied tenants with a logo, anchor first then by SF;
   one entry per DBA (paired suites share a logo). */
export function coTenancy(units, logoUrl, { exclude = "", limit = 12 } = {}) {
  const seen = new Set(), out = [];
  const roll = (Array.isArray(units) ? units : [])
    .filter(u => u.status !== "vacant" && u.status !== "owner" && u.unit !== exclude && u.dba)
    .sort((a, b) => (b.status === "anchor") - (a.status === "anchor") || (Number(b.sf) || 0) - (Number(a.sf) || 0));
  for (const u of roll) {
    const key = String(u.dba).toLowerCase();
    if (seen.has(key)) continue;
    const logo = typeof logoUrl === "function" ? logoUrl(u.unit) : null;
    if (!logo) continue;
    seen.add(key);
    out.push({ unit: u.unit, dba: u.dba, logo });
    if (out.length >= limit) break;
  }
  return out;
}

/* ---- photo library ---- */
/* the hero photo for a unit: the operator's pick when it still exists, else
   the newest photo-kind asset, else null */
export function heroFor(assets, picks, unit) {
  const list = (Array.isArray(assets) ? assets : []).filter(a => a && a.kind === "photo");
  const pick = picks && picks[unit];
  return list.find(a => a.id === pick) || list.slice().sort((a, b) => String(b.addedAt || "").localeCompare(String(a.addedAt || "")))[0] || null;
}

export function librarySummary(byUnit, picks) {
  const rows = [];
  for (const [unit, assets] of Object.entries(byUnit || {})) {
    const photos = (assets || []).filter(a => a.kind === "photo").length;
    const plans = (assets || []).filter(a => a.kind === "plan").length;
    rows.push({ unit, photos, plans, hero: heroFor(assets, picks, unit)?.id || "", pinned: !!(picks && picks[unit]) });
  }
  return rows.sort((a, b) => (a.unit === "property") - (b.unit === "property") || String(a.unit).localeCompare(String(b.unit), undefined, { numeric: true }));
}

/* ---- shared HTML bits ---- */
function shell(title, body, { size = "letter portrait", extra = "" } = {}) {
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>' + esc(title) + '</title>' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<style>@page{size:' + size + ';margin:0}*{box-sizing:border-box;margin:0;padding:0}' +
    'body{font-family:Helvetica,Arial,sans-serif;color:' + OTB_PUBLIC.navy + ';background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
    '.bar{position:fixed;top:10px;right:10px;display:flex;gap:6px;z-index:9}.bar button{font:600 12px Helvetica,Arial;padding:8px 14px;border:1px solid ' + OTB_PUBLIC.navy + ';background:#fff;color:' + OTB_PUBLIC.navy + ';cursor:pointer;border-radius:4px}' +
    '@media print{.bar{display:none}}' + extra + '</style></head><body>' +
    '<div class="bar"><button onclick="window.print()">Print / Save PDF</button></div>' + body + '</body></html>';
}
const logoWall = (items, size) => '<div class="wall">' + items.map(t =>
  '<div class="logo" title="' + esc(t.dba) + '"><img src="' + esc(t.logo) + '" alt="' + esc(t.dba) + '" style="max-height:' + size + 'px"></div>').join("") + '</div>';

/* ---- 1. availability flyer ---- */
export function flyerModel({ unit, units, assets = [], picks = {}, corridor = {}, origin = "", logoUrl = () => null } = {}) {
  const roll = Array.isArray(units) ? units : [];
  const u = roll.find(x => x.unit === unit);
  if (!u) return null;
  const stats = propertyStats(roll);
  const hero = heroFor(assets, picks, unit);
  const plan = (assets || []).find(a => a.kind === "plan") || null;
  const siblings = stats.vacant.filter(v => v.unit !== unit);
  return {
    unit, sf: Number(u.sf) || 0, use: u.use || "Retail / service",
    heroUrl: hero ? abs(origin, hero.url) : "",
    planUrl: plan ? abs(origin, plan.url) : abs(origin, "/plat-render.svg"),
    planIsSite: !plan,
    coTenancy: coTenancy(roll, unit_ => abs(origin, logoUrl(unit_) || ""), { exclude: unit, limit: 10 }),
    driveTimes: Array.isArray(corridor.driveTimes) ? corridor.driveTimes.slice(0, 4) : [],
    rating: corridor.centerListing && corridor.centerListing.rating ? { rating: corridor.centerListing.rating, count: corridor.centerListing.ratings || 0 } : null,
    stats, siblings,
    qrUrl: abs(origin, "/qr/leasing.svg"),
    tourQrUrl: abs(origin, "/qr/tour.svg"),
    ...OTB_PUBLIC,
  };
}

export function flyerHTML(m) {
  if (!m) return "";
  const css = '.pg{width:8.5in;min-height:11in;padding:.55in .6in .5in;display:flex;flex-direction:column}' +
    '.top{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid ' + m.navy + ';padding-bottom:10px}' +
    '.kicker{font-size:11px;letter-spacing:.32em;text-transform:uppercase}.h{font-size:38px;font-weight:700;line-height:1.05;margin-top:4px}' +
    '.sf{font-size:44px;font-weight:700;text-align:right;line-height:1}.sf small{display:block;font-size:11px;letter-spacing:.2em;font-weight:400}' +
    '.hero{margin:16px 0 0;height:3.4in;background:' + m.paper + ';border:1px solid #D8D6CF;display:flex;align-items:center;justify-content:center;overflow:hidden}.hero img{width:100%;height:100%;object-fit:cover}' +
    '.hero .ph{font-size:12px;letter-spacing:.2em;color:#7b8494;text-transform:uppercase}' +
    '.grid{display:grid;grid-template-columns:1.3fr 1fr;gap:18px;margin-top:16px}' +
    '.facts{display:grid;grid-template-columns:auto 1fr;gap:6px 14px;font-size:13px}.facts dt{font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#5a6578;padding-top:3px}.facts dd{font-weight:600}' +
    '.plan{border:1px solid #D8D6CF;background:#fff;height:2.3in;display:flex;align-items:center;justify-content:center;overflow:hidden}.plan img{max-width:100%;max-height:100%}' +
    '.cap{font-size:10px;color:#5a6578;margin-top:4px;letter-spacing:.06em}' +
    '.sec{font-size:10px;letter-spacing:.24em;text-transform:uppercase;margin:16px 0 6px;color:#5a6578}' +
    '.wall{display:flex;flex-wrap:wrap;gap:10px 18px;align-items:center}.logo img{max-width:92px;object-fit:contain}' +
    '.foot{margin-top:auto;padding-top:14px;border-top:1px solid #D8D6CF;display:flex;justify-content:space-between;align-items:center;gap:16px}' +
    '.foot .c{font-size:13px;line-height:1.5}.foot b{font-size:16px}.foot img{height:.95in}.rate{font-size:12px;color:#5a6578}';
  const sibs = m.siblings.length ? '<div class="cap">Also available: ' + esc(m.siblings.map(s => "Suite " + s.unit + " · " + n0(s.sf) + " SF").join(" · ")) + (m.siblings.length === 1 ? " — combinable" : "") + '</div>' : "";
  const body = '<div class="pg">' +
    '<div class="top"><div><div class="kicker">For lease · ' + esc(m.short) + '</div><div class="h">Suite ' + esc(m.unit) + '</div><div class="cap" style="font-size:13px;color:' + m.navy + '">' + esc(m.use) + '</div></div>' +
    '<div class="sf">' + n0(m.sf) + '<small>square feet · available now</small></div></div>' +
    '<div class="hero">' + (m.heroUrl ? '<img src="' + esc(m.heroUrl) + '" alt="Suite ' + esc(m.unit) + '">' : '<span class="ph">Photo coming · scan scheduled</span>') + '</div>' +
    '<div class="grid"><div>' +
    '<dl class="facts"><dt>Address</dt><dd>' + esc(m.address) + '</dd><dt>Corner</dt><dd>' + esc(m.corner) + '</dd>' +
    '<dt>Center</dt><dd>' + n0(m.stats.gla) + ' SF · ' + m.stats.count + ' suites · ' + m.stats.occupancyPct + '% leased' + (m.stats.anchor ? ' · anchored by ' + esc(m.stats.anchor.dba) : '') + '</dd>' +
    (m.driveTimes.length ? '<dt>Drive times</dt><dd>' + esc(m.driveTimes.map(d => d.minutes + " min to " + d.name).join(" · ")) + '</dd>' : '') +
    (m.rating ? '<dt>Google</dt><dd>' + esc(m.rating.rating) + ' ★ · ' + n0(m.rating.count) + ' reviews</dd>' : '') +
    '<dt>Terms</dt><dd>NNN · asking rate quoted per space</dd></dl>' + sibs +
    (m.coTenancy.length ? '<div class="sec">Your neighbors</div>' + logoWall(m.coTenancy, 34) : '') +
    '</div><div><div class="plan"><img src="' + esc(m.planUrl) + '" alt="plan"></div><div class="cap">' + (m.planIsSite ? 'Site plan · Suite ' + esc(m.unit) : 'Floor plan · Suite ' + esc(m.unit)) + '</div></div></div>' +
    '<div class="foot"><div class="c"><b>Tour it with Adam</b><br>Call or text ' + esc(m.phone) + '<br><span class="rate">Full package: ' + esc(m.leasingUrl) + '</span></div>' +
    '<div style="display:flex;gap:10px;align-items:center"><img src="' + esc(m.qrUrl) + '" alt="QR"><div class="cap" style="max-width:1.1in">Scan for the leasing package</div></div></div></div>';
  return shell("OTB-Flyer-Suite-" + m.unit, body, { extra: css });
}

/* ---- 2. center overview sheet ---- */
export function overviewModel({ units, corridor = {}, origin = "", logoUrl = () => null, heroUrl = "" } = {}) {
  const roll = Array.isArray(units) ? units : [];
  return {
    stats: propertyStats(roll),
    wall: coTenancy(roll, u => abs(origin, logoUrl(u) || ""), { limit: 30 }),
    driveTimes: Array.isArray(corridor.driveTimes) ? corridor.driveTimes : [],
    rating: corridor.centerListing && corridor.centerListing.rating ? { rating: corridor.centerListing.rating, count: corridor.centerListing.ratings || 0 } : null,
    heroUrl: abs(origin, heroUrl),
    siteUrl: abs(origin, "/plat-render.svg"),
    qrUrl: abs(origin, "/qr/leasing.svg"),
    ...OTB_PUBLIC,
  };
}

export function overviewHTML(m) {
  const css = '.pg{width:8.5in;min-height:11in;padding:.55in .6in .5in;display:flex;flex-direction:column}' +
    '.top{border-bottom:3px solid ' + m.navy + ';padding-bottom:10px}.kicker{font-size:11px;letter-spacing:.32em;text-transform:uppercase}.h{font-size:34px;font-weight:700;line-height:1.05;margin-top:4px}' +
    '.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:#D8D6CF;border:1px solid #D8D6CF;margin-top:14px}.stat{background:#fff;padding:10px 12px}.stat b{display:block;font-size:24px}.stat small{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#5a6578}' +
    '.hero{margin:14px 0 0;height:2.6in;background:' + m.paper + ';border:1px solid #D8D6CF;display:flex;align-items:center;justify-content:center;overflow:hidden}.hero img{width:100%;height:100%;object-fit:cover}' +
    '.sec{font-size:10px;letter-spacing:.24em;text-transform:uppercase;margin:16px 0 8px;color:#5a6578}' +
    '.wall{display:grid;grid-template-columns:repeat(6,1fr);gap:12px 16px;align-items:center}.logo{display:flex;align-items:center;justify-content:center;height:44px}.logo img{max-width:100%;object-fit:contain}' +
    '.two{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:6px;font-size:12.5px;line-height:1.55}' +
    '.avail{border:2px solid ' + m.navy + ';padding:10px 12px}.avail b{font-size:15px}' +
    '.foot{margin-top:auto;padding-top:14px;border-top:1px solid #D8D6CF;display:flex;justify-content:space-between;align-items:center}.foot img{height:.9in}.foot .c{font-size:13px;line-height:1.5}';
  const body = '<div class="pg"><div class="top"><div class="kicker">Retail · ' + esc(m.corner) + '</div><div class="h">' + esc(m.name) + '</div><div style="font-size:13px;margin-top:4px">' + esc(m.address) + '</div></div>' +
    '<div class="stats"><div class="stat"><b>' + n0(m.stats.gla) + '</b><small>SF gross leasable</small></div><div class="stat"><b>' + m.stats.count + '</b><small>suites · ' + m.stats.leased + ' leased</small></div>' +
    '<div class="stat"><b>' + m.stats.occupancyPct + '%</b><small>occupied</small></div><div class="stat"><b>' + (m.rating ? esc(m.rating.rating) + ' ★' : '—') + '</b><small>' + (m.rating ? 'Google · ' + n0(m.rating.count) + ' reviews' : 'rating') + '</small></div></div>' +
    '<div class="hero">' + (m.heroUrl ? '<img src="' + esc(m.heroUrl) + '" alt="' + esc(m.short) + '">' : '<img src="' + esc(m.siteUrl) + '" alt="site plan" style="object-fit:contain;padding:10px">') + '</div>' +
    '<div class="sec">Who is here</div>' + logoWall(m.wall, 40) +
    '<div class="two"><div>' + (m.driveTimes.length ? '<div class="sec" style="margin-top:8px">Drive times</div>' + esc(m.driveTimes.map(d => d.minutes + " min · " + d.name).join("  ·  ")) : '') +
    (m.stats.anchor ? '<div class="sec">Anchor</div>' + esc(m.stats.anchor.dba) + ' · Suite ' + esc(m.stats.anchor.unit) : '') + '</div>' +
    '<div class="avail"><b>Available now</b><br>' + (m.stats.vacant.length ? m.stats.vacant.map(v => 'Suite ' + esc(v.unit) + ' · ' + n0(v.sf) + ' SF' + (v.use ? ' · ' + esc(v.use) : '')).join('<br>') : 'Fully leased — waitlist open') + '<br><span style="font-size:11px;color:#5a6578">NNN · asking rates quoted per space</span></div></div>' +
    '<div class="foot"><div class="c"><b>Leasing: Adam Abdalla</b><br>Call or text ' + esc(m.phone) + '<br><span style="font-size:11px;color:#5a6578">' + esc(m.leasingUrl) + '</span></div><img src="' + esc(m.qrUrl) + '" alt="QR"></div></div>';
  return shell("OTB-Overview", body, { extra: css });
}

/* ---- 3. tenant co-marketing card (1080×1080) ---- */
export function tenantCardModel({ unit, units, headline = "welcome", origin = "", logoUrl = () => null } = {}) {
  const roll = Array.isArray(units) ? units : [];
  const u = roll.find(x => x.unit === unit);
  if (!u || u.status === "vacant") return null;
  const logo = logoUrl(unit);
  return {
    unit, dba: u.dba, use: u.use || "",
    headline: CARD_HEADLINES[headline] || CARD_HEADLINES.welcome,
    logoUrl: logo ? abs(origin, logo) : "",
    neighbors: coTenancy(roll.filter(x => String(x.dba).toLowerCase() !== String(u.dba).toLowerCase()), u_ => abs(origin, logoUrl(u_) || ""), { limit: 8 }),
    ...OTB_PUBLIC,
  };
}

export function tenantCardHTML(m) {
  if (!m) return "";
  const css = '.card{width:1080px;height:1080px;background:' + m.navy + ';color:#fff;padding:72px;display:flex;flex-direction:column;position:relative;overflow:hidden}' +
    '.k{font-size:22px;letter-spacing:.32em;text-transform:uppercase;opacity:.85}.h{font-size:64px;font-weight:700;line-height:1.05;margin-top:14px;max-width:820px}' +
    '.tile{margin:48px auto 0;background:#fff;border-radius:18px;width:640px;height:380px;display:flex;align-items:center;justify-content:center;padding:36px}.tile img{max-width:100%;max-height:100%;object-fit:contain}.tile .t{color:' + m.navy + ';font-size:56px;font-weight:700;text-align:center}' +
    '.dba{text-align:center;font-size:40px;font-weight:700;margin-top:26px}.use{text-align:center;font-size:22px;opacity:.85;margin-top:6px}' +
    '.n{margin-top:auto;border-top:1px solid rgba(255,255,255,.3);padding-top:22px;display:flex;align-items:center;justify-content:space-between;gap:20px}' +
    '.wall{display:flex;gap:16px;align-items:center}.logo{background:#fff;border-radius:8px;padding:6px 10px;height:44px;display:flex;align-items:center}.logo img{max-height:100%;max-width:90px;object-fit:contain}' +
    '.addr{font-size:18px;line-height:1.4;text-align:right}.addr b{font-size:22px}';
  const body = '<div class="card"><div class="k">' + esc(m.short) + ' · Lafayette</div><div class="h">' + esc(m.headline) + '</div>' +
    '<div class="tile">' + (m.logoUrl ? '<img src="' + esc(m.logoUrl) + '" alt="' + esc(m.dba) + '">' : '<div class="t">' + esc(m.dba) + '</div>') + '</div>' +
    '<div class="dba">' + esc(m.dba) + ' · Suite ' + esc(m.unit) + '</div>' + (m.use ? '<div class="use">' + esc(m.use) + '</div>' : '') +
    '<div class="n">' + (m.neighbors.length ? logoWall(m.neighbors, 32) : '<span></span>') + '<div class="addr"><b>' + esc(m.address.split(",")[0]) + '</b><br>' + esc(m.corner) + '</div></div></div>';
  return shell("OTB-Card-" + m.unit, body, { size: "1080px 1080px", extra: css + "body{background:#222}" });
}

/* ---- 4. tour manifest (public bucket) ---- */
export function tourManifest(entries, generatedIso) {
  const suites = {};
  for (const e of entries || []) {
    if (!e || !e.unit) continue;
    const s = suites[e.unit] || (suites[e.unit] = { panos: [], hero: "" });
    if (e.kind === "hero") { if (!s.hero) s.hero = e.url; }
    else s.panos.push({ url: e.url, name: e.name || "", added: e.addedAt || "" });
  }
  for (const s of Object.values(suites)) s.panos.sort((a, b) => String(a.added).localeCompare(String(b.added)));
  return { version: 1, generated: generatedIso || new Date().toISOString(), suites };
}
