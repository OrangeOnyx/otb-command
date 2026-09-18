/* B-1 Marketing — the assembly sheet (2026-09-18, operator pick "1 2 and 3").
   Four blocks, every one generated from the source of truth on the fly:
     1 Availability flyers — one printable flyer per vacant suite
     2 Center overview     — stats · logo wall · site plan · availability
     3 Tenant cards        — 1080×1080 co-marketing card per tenant
     4 Photo library       — the assets bucket by suite, operator picks the hero
     5 360° tour media     — panoramas + hero stills into the PUBLIC tour bucket
                             and the manifest the /tour microsite reads
   All derivation lives in lib/marketing.js (tested); this file is DOM only.
   Operator edits (hero picks) persist in the `marketing` layer; owners see
   the sheet read-only when it is ticked into their sheet set. */
import { UNITS, subscribe, getMarketing, setHero } from "../store.js";
import { esc } from "../lib/format.js";
import { logoUrl } from "../lib/logos.js";
import { listAssets, addAsset, removeAsset, unitsWithAssets, onAssetChange } from "../lib/assets.js";
import {
  propertyStats, heroFor, librarySummary,
  flyerModel, flyerHTML, overviewModel, overviewHTML, tenantCardModel, tenantCardHTML, CARD_HEADLINES, OTB_PUBLIC,
} from "../lib/marketing.js";
import { tourAvailable, addTourMedia, listTourMedia, removeTourMedia, publishManifest, manifestUrl, TOUR_KINDS } from "../lib/tour.js";
import corridor from "../data/corridor.json";

let host = null;
let assetsByUnit = {};   // unit → [{id,kind,name,url,addedAt}]
let tourByUnit = {};     // unit → [{id,kind,name,url}]
let cardHeadline = "welcome";
let cardUnit = "";
let note = "";

const operator = () => !document.body.classList.contains("role-owner") &&
  !document.body.classList.contains("role-tenant") && !document.body.classList.contains("role-vendor");

/* blob → new tab (invoice / statement idiom); the page carries its own Print button */
function openDoc(html) {
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
const ctx = () => ({ units: UNITS, corridor, origin: location.origin, logoUrl });

/* ---- data ---- */
async function loadAssets() {
  const units = new Set(["property", ...UNITS.map(u => u.unit)]);
  try { (await unitsWithAssets()).forEach(u => units.add(u)); } catch { /* local mode */ }
  const next = {};
  await Promise.all([...units].map(async u => { try { next[u] = await listAssets(u); } catch { next[u] = []; } }));
  assetsByUnit = next;
  render();
}
async function loadTour() {
  if (!tourAvailable()) return;
  const next = {};
  await Promise.all(vacantUnits().map(async u => { next[u.unit] = await listTourMedia(u.unit); }));
  tourByUnit = next;
  render();
}
const vacantUnits = () => UNITS.filter(u => u.status === "vacant");

/* ---- blocks ---- */
function flyersHTML() {
  const picks = getMarketing().hero;
  const vac = vacantUnits();
  return '<div class="card mkt-card"><div class="panel-h"><h2>Availability flyers</h2><div class="sub">ONE PER VACANT SUITE · PHOTO · SITE PLAN · NEIGHBORS · QR — PRINT OR SAVE AS PDF</div></div>' +
    '<div class="mkt-grid">' + (vac.length ? vac.map(u => {
      const hero = heroFor(assetsByUnit[u.unit] || [], picks, u.unit);
      return '<div class="mkt-tile"><div class="mkt-thumb">' + (hero ? '<img src="' + esc(hero.url) + '" alt="">' : '<span class="mute">no photo yet</span>') + '</div>' +
        '<div class="mkt-tile-b"><b>Suite ' + esc(u.unit) + '</b> · ' + Number(u.sf).toLocaleString() + ' SF<div class="mute" style="font-size:11px">' + esc(u.use || "") + '</div>' +
        '<button class="chip mkt-flyer" data-unit="' + esc(u.unit) + '">⤓ Flyer</button></div></div>';
    }).join("") : '<div class="led-note">Fully leased — no flyer to make.</div>') + '</div></div>';
}

function overviewBlock() {
  const s = propertyStats(UNITS);
  const hero = heroFor(assetsByUnit.property || [], getMarketing().hero, "property");
  return '<div class="card mkt-card"><div class="panel-h"><h2>Center overview</h2><div class="sub">' + s.count + ' SUITES · ' + s.occupancyPct + '% LEASED · LOGO WALL ' + s.leased + ' · GOOGLE ' + (corridor.centerListing ? corridor.centerListing.rating + ' ★' : '—') + '</div></div>' +
    '<div class="mkt-row"><div class="mkt-thumb wide">' + (hero ? '<img src="' + esc(hero.url) + '" alt="">' : '<span class="mute">property hero photo: pick one in the library below (folder “property”)</span>') + '</div>' +
    '<div><p class="mkt-p">Stats, drive times, the tenant logo wall, current availability and the leasing QR — assembled from the rent roll and the corridor snapshot every time you open it.</p>' +
    '<button class="chip" id="mktOverview">⤓ Overview sheet</button></div></div></div>';
}

function cardsBlock() {
  const tenants = UNITS.filter(u => u.status !== "vacant" && u.status !== "owner");
  if (!cardUnit) cardUnit = tenants[0] ? tenants[0].unit : "";
  const opts = tenants.map(u => '<option value="' + esc(u.unit) + '"' + (u.unit === cardUnit ? " selected" : "") + '>' + esc(u.unit) + ' · ' + esc(u.dba) + '</option>').join("");
  const heads = Object.entries(CARD_HEADLINES).map(([k, v]) => '<option value="' + k + '"' + (k === cardHeadline ? " selected" : "") + '>' + esc(v) + '</option>').join("");
  const logo = cardUnit ? logoUrl(cardUnit) : null;
  return '<div class="card mkt-card"><div class="panel-h"><h2>Tenant cards</h2><div class="sub">1080 × 1080 CO-MARKETING CARD · WELCOME / NOW OPEN / FEATURED · LOGO WALL OF NEIGHBORS</div></div>' +
    '<div class="mkt-row"><div class="mkt-thumb sq">' + (logo ? '<img src="' + esc(logo) + '" alt="">' : '<span class="mute">no logo on file</span>') + '</div>' +
    '<div><div class="mkt-ctl"><select id="mktCardUnit">' + opts + '</select><select id="mktCardHead">' + heads + '</select>' +
    '<button class="chip" id="mktCard">⤓ Card</button></div>' +
    '<p class="mkt-p">Opens as a square page — Print → Save as PDF, or screenshot for social. Logos come from the verified set; a tenant without one gets a typeset name tile.</p></div></div></div>';
}

function libraryBlock() {
  const picks = getMarketing().hero;
  const rows = librarySummary(assetsByUnit, picks);
  const op = operator();
  return '<div class="card mkt-card"><div class="panel-h"><h2>Photo library</h2><div class="sub">THE ASSETS BUCKET BY SUITE · ★ = HERO USED ON THE FLYER / OVERVIEW · UPLOAD GOES TO THE SAME PLACE AS THE DRAWER</div></div>' +
    rows.map(r => {
      const photos = (assetsByUnit[r.unit] || []).filter(a => a.kind === "photo");
      const label = r.unit === "property" ? "Property · exterior / aerials" : "Suite " + r.unit + (UNITS.find(u => u.unit === r.unit)?.dba ? " · " + esc(UNITS.find(u => u.unit === r.unit).dba) : "");
      return '<div class="mkt-lib"><div class="mkt-lib-h"><b>' + label + '</b><span class="mono mute">' + r.photos + ' photo' + (r.photos === 1 ? "" : "s") + (r.plans ? ' · ' + r.plans + ' plan' : '') + '</span>' +
        (op ? '<label class="chip" style="cursor:pointer;margin-left:auto">＋ Photos<input type="file" class="mkt-up" data-unit="' + esc(r.unit) + '" accept="image/*" multiple hidden></label>' : '') + '</div>' +
        (photos.length ? '<div class="mkt-strip">' + photos.map(a =>
          '<div class="mkt-ph' + (a.id === r.hero ? " hero" : "") + '"><img src="' + esc(a.url) + '" alt="' + esc(a.name) + '" title="' + esc(a.name) + '">' +
          (op ? '<button class="mkt-star" data-unit="' + esc(r.unit) + '" data-id="' + esc(a.id) + '" title="Use as hero">★</button><button class="mkt-del" data-id="' + esc(a.id) + '" title="Remove">✕</button>' : '') + '</div>').join("") + '</div>'
          : '<div class="led-note">none yet</div>') + '</div>';
    }).join("") + '</div>';
}

function tourBlock() {
  const vac = vacantUnits();
  const op = operator();
  const inner = !tourAvailable()
    ? '<div class="led-note">Hosted only — the public tour bucket is not reachable in local mode.</div>'
    : vac.map(u => {
      const media = tourByUnit[u.unit] || [];
      return '<div class="mkt-lib"><div class="mkt-lib-h"><b>Suite ' + esc(u.unit) + '</b><span class="mono mute">' + media.filter(m => m.kind === "pano").length + ' pano · ' + media.filter(m => m.kind === "hero").length + ' hero</span>' +
        (op ? TOUR_KINDS.map(([k, l]) => '<label class="chip" style="cursor:pointer">＋ ' + esc(l) + '<input type="file" class="mkt-tour-up" data-unit="' + esc(u.unit) + '" data-kind="' + k + '" accept="image/*" multiple hidden></label>').join("") : '') + '</div>' +
        (media.length ? '<div class="mkt-strip">' + media.map(m => '<div class="mkt-ph"><img src="' + esc(m.url) + '" alt="' + esc(m.name) + '" title="' + esc(m.kind + " · " + m.name) + '">' +
          (op ? '<button class="mkt-del mkt-tour-del" data-id="' + esc(m.id) + '" title="Remove">✕</button>' : '') + '</div>').join("") + '</div>'
          : '<div class="led-note">Scan pending — the microsite shows the numbers and the site plan until a panorama lands.</div>') + '</div>';
    }).join("") +
    '<div class="mkt-ctl" style="margin-top:8px">' + (op ? '<button class="chip on" id="mktPublish">Publish manifest → /tour</button>' : '') +
    '<a class="rec-link" href="/tour" target="_blank" rel="noopener" style="margin:0">Open the microsite ↗</a>' +
    '<span class="led-note" id="mktTourNote">' + esc(note) + '</span></div>';
  return '<div class="card mkt-card"><div class="panel-h"><h2>360° tour · ' + vac.map(u => u.unit).join(" · ") + '</div><div class="sub">INSTA360 EQUIRECTANGULAR JPEGS + ONE HERO STILL PER SUITE · PUBLIC BUCKET · THE MICROSITE READS THE MANIFEST</div></div>' + inner + '</div>';
}

/* ---- render + wire ---- */
function render() {
  if (!host) return;
  host.innerHTML = flyersHTML() + overviewBlock() + cardsBlock() + libraryBlock() + tourBlock();
  host.querySelectorAll(".mkt-flyer").forEach(b => b.onclick = () => {
    const unit = b.dataset.unit;
    openDoc(flyerHTML(flyerModel({ unit, assets: assetsByUnit[unit] || [], picks: getMarketing().hero, ...ctx() })));
  });
  host.querySelector("#mktOverview").onclick = () => {
    const hero = heroFor(assetsByUnit.property || [], getMarketing().hero, "property");
    openDoc(overviewHTML(overviewModel({ ...ctx(), heroUrl: hero ? hero.url : "" })));
  };
  host.querySelector("#mktCardUnit").onchange = e => { cardUnit = e.target.value; render(); };
  host.querySelector("#mktCardHead").onchange = e => { cardHeadline = e.target.value; };
  host.querySelector("#mktCard").onclick = () => {
    const m = tenantCardModel({ unit: cardUnit, headline: cardHeadline, ...ctx() });
    if (m) openDoc(tenantCardHTML(m));
  };
  host.querySelectorAll(".mkt-star").forEach(b => b.onclick = () => setHero(b.dataset.unit, b.dataset.id));
  host.querySelectorAll(".mkt-up").forEach(inp => inp.onchange = async e => {
    const files = [...e.target.files]; const unit = inp.dataset.unit; e.target.value = "";
    for (const f of files) { try { await addAsset(f, { unit, kind: "photo" }); } catch (err) { alert("Upload failed (" + f.name + "): " + err.message); } }
    loadAssets();
  });
  host.querySelectorAll(".mkt-del:not(.mkt-tour-del)").forEach(b => b.onclick = async () => {
    if (!confirm("Remove this photo from the library?")) return;
    try { await removeAsset(b.dataset.id); loadAssets(); } catch (err) { alert("Remove failed: " + err.message); }
  });
  host.querySelectorAll(".mkt-tour-up").forEach(inp => inp.onchange = async e => {
    const files = [...e.target.files]; const { unit, kind } = inp.dataset; e.target.value = "";
    for (const f of files) { try { await addTourMedia(f, { unit, kind }); } catch (err) { alert("Upload failed (" + f.name + "): " + err.message); } }
    note = "Uploaded — publish the manifest to update /tour.";
    loadTour();
  });
  host.querySelectorAll(".mkt-tour-del").forEach(b => b.onclick = async () => {
    if (!confirm("Remove this tour image?")) return;
    try { await removeTourMedia(b.dataset.id); note = "Removed — publish the manifest to update /tour."; loadTour(); }
    catch (err) { alert("Remove failed: " + err.message); }
  });
  const pub = host.querySelector("#mktPublish");
  if (pub) pub.onclick = async () => {
    pub.disabled = true;
    try {
      const m = await publishManifest(vacantUnits().map(u => u.unit));
      note = "Manifest published " + new Date().toLocaleTimeString() + " · " + Object.keys(m.suites).length + " suite folder(s) · " + manifestUrl();
    } catch (err) { note = "Publish failed: " + err.message; }
    render();
  };
}

export function initMarketing() {
  host = document.getElementById("mktBody");
  if (!host) return;
  const sub = document.getElementById("mktSub");
  if (sub) sub.textContent = "B-1 · FLYERS · OVERVIEW · TENANT CARDS · PHOTO LIBRARY · 360° TOUR — ASSEMBLED FROM THE ROLL, NEVER HAND-KEPT · " + OTB_PUBLIC.leasingUrl.replace(/^https?:\/\//, "").toUpperCase();
  render();
  loadAssets();
  loadTour();
  onAssetChange(loadAssets);
  subscribe(type => { if (type === "marketing" || type === "seed" || type === "import") render(); });
}
