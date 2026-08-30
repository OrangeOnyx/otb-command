/* W-1 Action Board — operational kanban that auto-seeds workstreams from live
   data (holdovers, renewals, vacancies, covenants, instrument dates, compliance
   flags) and persists lane moves / edits / custom cards through the store.
   The seed is derived every render; the store holds only the override layer. */
import {
  UNITS, COMP_FIELDS, getComp, getActionOverrides,
  moveAction, dismissAction, addAction, restoreActions, archivedCount, subscribe
} from "../store.js";
import { fmt$0, pDate, fDate, monthsTo, daysTo, esc, TODAY } from "../lib/format.js";
import { maintActionCards, onMaintChange } from "../lib/maintenance.js";
import {
  DEAL_STAGES, getDeals, onDealsChange, refreshDeals,
  addDeal, setDealStage, deleteDeal, dealActionCards
} from "../lib/deals.js";
import { REMOTE, getSession } from "../lib/remote.js";
import { HVAC_149, JD_BANK, factLines } from "../lib/facts.js";
import { openDrawer } from "./drawer.js";

const LANES = [
  ["watch", "Watch", "Monitoring — no action due yet"],
  ["action", "Action Needed", "Owner decision or outreach required"],
  ["progress", "In Progress", "Actively working"],
  ["done", "Cleared", "Resolved — archive when stale"]
];
export const ACTION_KIND = {
  holdover: ["Holdover", "var(--brick)"],
  renewal: ["Renewal", "var(--brass)"],
  vacancy: ["Lease-up", "var(--navy)"],
  compliance: ["Compliance", "var(--plum)"],
  covenant: ["Covenant", "var(--teal)"],
  easement: ["Easement", "var(--slate)"],
  parking: ["Parking", "var(--brass)"],
  maintenance: ["Work Order", "var(--navy)"],
  leasing: ["Leasing", "var(--anchor)"],
  task: ["Task", "var(--ink70)"]
};

/* ---- seed: derive cards from current data ---- */
function seed() {
  const c = [];
  UNITS.filter(u => u.status === "expired").forEach(u => c.push({
    id: "hold:" + u.unit, unit: u.unit, kind: "holdover", lane: "action", due: u.end,
    title: "Resolve holdover — " + u.dba,
    detail: "Expired " + fDate(pDate(u.end)) + " · " + u.sf.toLocaleString() + " SF · " +
      fmt$0(u.monthly) + "/mo · renew or recover possession"
  }));
  UNITS.filter(u => u.end && u.status !== "expired" && monthsTo(pDate(u.end)) > 0 && monthsTo(pDate(u.end)) <= 12)
    .forEach(u => c.push({
      id: "renew:" + u.unit, unit: u.unit, kind: "renewal", lane: "watch", due: u.end,
      title: "Renewal window — " + u.dba,
      detail: "Expires " + fDate(pDate(u.end)) + " · open renewal dialogue"
    }));
  UNITS.filter(u => u.status === "vacant").forEach(u => c.push({
    id: "lease:" + u.unit, unit: u.unit, kind: "vacancy",
    lane: /LOI/i.test(u.notes || "") ? "progress" : "action", due: null,
    title: "Lease vacant " + u.unit,
    detail: u.sf.toLocaleString() + " SF · " + (u.notes || "market the space")
  }));
  // compliance: one card per unit carrying a flagged field
  UNITS.forEach(u => {
    const flagged = COMP_FIELDS.filter(([k]) => getComp(u.unit, k) === "flag").map(([, label]) => label);
    if (flagged.length) c.push({
      id: "comp:" + u.unit, unit: u.unit, kind: "compliance", lane: "action", due: null,
      title: "Compliance flag — " + u.dba,
      detail: flagged.join(", ") + " · clear on C-1"
    });
  });
  // standing covenants / instrument dates — all facts from lib/facts.js (single source)
  c.push({ id: "cov:hvac149", unit: HVAC_149.unit, kind: "covenant", lane: "watch", due: null,
    title: "Verify " + HVAC_149.tenant + " HVAC PM", detail: factLines.hvac149() });
  c.push({ id: "cov:excl", kind: "covenant", lane: "watch", due: null,
    title: factLines.exclusivesTitle(), detail: factLines.exclusivesDetail() });
  c.push({ id: "date:jdbank", kind: "easement", lane: "watch", due: JD_BANK.expires,
    title: JD_BANK.name + " expiry", detail: factLines.jdBankExpiry() });
  c.push({ id: "park:recon", kind: "parking", lane: "action", due: null,
    title: factLines.parkingReconTitle(), detail: factLines.parkingRecon() });
  c.push({ id: "roof:brief", kind: "compliance", lane: "action", due: null,
    title: "Roof: membrane failure (long bldg) — roofer walk", detail: "Skydio 2025-10-15: failed membrane on long-bldg RTU row (~101-109), open to weather · see docs/roof-condition-brief.md (thermal anomaly RETRACTED - neighbor's roof)" });
  // A-2: live open work orders (REMOTE cache; empty until it hydrates)
  maintActionCards().forEach(card => c.push(card));
  return c;
}

function cards() {
  const ov = getActionOverrides();
  const merged = seed().concat(ov.custom)
    .filter(card => !ov.dismissed[card.id])
    .map(card => ({ ...card, lane: ov.lane[card.id] || card.lane, ...(ov.edit[card.id] || {}) }));
  return merged;
}
/* live action cards for other surfaces (e.g. D-1 Action Queue) — single source */
export function getActionCards() { return cards(); }

/* ---- render ---- */
function dueChip(due) {
  if (!due) return "";
  const d = pDate(due), dd = daysTo(d);
  const over = d < TODAY;
  const cls = over ? "due over" : dd <= 90 ? "due soon" : "due";
  const txt = over ? Math.abs(dd) + "d over" : dd <= 365 ? dd + "d" : fDate(d);
  return '<span class="' + cls + '">⏱ ' + txt + '</span>';
}

function cardHTML(card) {
  const [kl, kc] = ACTION_KIND[card.kind] || ACTION_KIND.task;
  return '<div class="acard" draggable="true" data-id="' + esc(card.id) + '">' +
    '<button class="acard-x" data-id="' + esc(card.id) + '" title="Archive">✕</button>' +
    '<span class="ktag" style="--kc:' + kc + '">' + kl + '</span>' +
    (card.unit ? '<span class="uchip" data-unit="' + esc(card.unit) + '">' + esc(card.unit) + '</span>' : "") +
    dueChip(card.due) +
    '<div class="atitle">' + esc(card.title) + '</div>' +
    (card.detail ? '<div class="adetail">' + esc(card.detail) + '</div>' : "") +
    '</div>';
}

/* Deal cards ride the lanes read-only: no draggable attr, no data-id, no
   archive ✕ — wire() never picks them up, so the strip's stage select stays
   the single write path (a lane drag would fight the stage). */
function dealCardHTML(card) {
  const [kl, kc] = ACTION_KIND[card.kind] || ACTION_KIND.task;
  return '<div class="acard acard-deal" style="cursor:default">' +
    '<span class="ktag" style="--kc:' + kc + '">' + kl + '</span>' +
    (card.unit ? '<span class="uchip" data-unit="' + esc(card.unit) + '">' + esc(card.unit) + '</span>' : "") +
    dueChip(card.due) +
    '<div class="atitle">' + esc(card.title) + '</div>' +
    (card.detail ? '<div class="adetail">' + esc(card.detail) + '</div>' : "") +
    '<div class="led-note">stage moves via the pipeline strip above</div>' +
    '</div>';
}

export function renderBoard() {
  const board = document.getElementById("board");
  if (!board) return;
  const list = cards();
  const deals = dealActionCards(getDeals()); // open deals only (pure shaping)
  const all = list.concat(deals);
  const overdue = all.filter(c => c.due && pDate(c.due) < TODAY && c.lane !== "done").length;
  const count = l => all.filter(c => c.lane === l).length;

  const meta = document.getElementById("boardMeta");
  if (meta) meta.innerHTML =
    '<span class="bm"><b>' + count("action") + '</b> action needed</span>' +
    '<span class="bm"><b class="bm-over">' + overdue + '</b> overdue</span>' +
    '<span class="bm"><b>' + count("progress") + '</b> in progress</span>' +
    '<span class="bm"><b>' + count("watch") + '</b> watching</span>' +
    (deals.length ? '<span class="bm"><b>' + deals.length + '</b> open deals</span>' : "") +
    (archivedCount() ? '<span class="bm"><a id="bmRestore">restore ' + archivedCount() + ' archived</a></span>' : "");

  // pipeline strip lives immediately before the lanes (index.html untouched)
  let strip = document.getElementById("dealStrip");
  if (!strip) {
    strip = document.createElement("div");
    strip.id = "dealStrip";
    board.parentElement.insertBefore(strip, board);
  }
  renderDealStrip(strip);

  board.innerHTML = LANES.map(([id, label, sub]) => {
    const col = list.filter(c => c.lane === id);
    const dcol = deals.filter(c => c.lane === id);
    return '<div class="acol" data-lane="' + id + '">' +
      '<div class="acol-h"><div><span class="acol-t">' + label + '</span> <span class="acol-n">' + (col.length + dcol.length) + '</span>' +
      '<div class="acol-s">' + sub + '</div></div>' +
      '<button class="acol-add" data-lane="' + id + '" title="Add card">+</button></div>' +
      '<div class="acol-body" data-lane="' + id + '">' +
      col.map(cardHTML).join("") +
      dcol.map(dealCardHTML).join("") +
      '<div class="acard-new" data-lane="' + id + '" hidden>' +
      '<input type="text" placeholder="New card title… (Enter)" data-lane="' + id + '">' +
      '</div></div></div>';
  }).join("");

  wire(board);
}

/* ---- leasing pipeline strip (register #11) ---- */
let actorEmail = ""; // resolved once at init; stamps stage moves / adds

function dealRowHTML(d, canWrite) {
  const opts = Object.keys(DEAL_STAGES).map(k =>
    '<option value="' + k + '"' + (d.stage === k ? " selected" : "") + '>' + DEAL_STAGES[k] + '</option>').join("");
  return '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:7px 0;border-top:1px solid var(--line)">' +
    '<span style="font-weight:600">' + esc(d.business || d.prospect || "Prospect") + '</span>' +
    (d.business && d.prospect ? '<span class="mute" style="font-size:11px">' + esc(d.prospect) + '</span>' : "") +
    (d.target_unit ? '<span class="uchip" data-unit="' + esc(d.target_unit) + '">' + esc(d.target_unit) + '</span>' : "") +
    (d.proposed_rent ? '<span style="font-family:var(--mono);font-size:11px">' + esc(d.proposed_rent) + '</span>' : "") +
    (d.lead_source ? '<span class="chip">' + esc(d.lead_source) + '</span>' : "") +
    (d.created_at ? '<span class="mute" style="font-family:var(--mono);font-size:10px">' + esc(String(d.created_at).slice(0, 10)) + '</span>' : "") +
    '<span style="margin-left:auto;display:flex;align-items:center;gap:6px">' +
    '<select class="deal-stage" data-id="' + esc(d.id) + '" data-stage="' + esc(d.stage) + '"' + (canWrite ? "" : " disabled") +
    ' style="font-family:var(--mono);font-size:11px;padding:3px 6px;border:1px solid var(--line);border-radius:4px;background:var(--card);color:var(--ink)">' + opts + '</select>' +
    (canWrite ? '<button class="deal-del" data-id="' + esc(d.id) + '" title="Delete deal" style="border:1px solid var(--line);background:none;border-radius:4px;color:var(--ink50);cursor:pointer;font-size:11px;padding:2px 7px">✕</button>' : "") +
    '</span></div>';
}

function renderDealStrip(strip) {
  // same body.role-* idiom drawer.js uses; write access needs the backend too
  const operator = !document.body.classList.contains("role-owner") &&
    !document.body.classList.contains("role-tenant") &&
    !document.body.classList.contains("role-vendor");
  const canWrite = operator && REMOTE;
  const deals = getDeals();
  const inp = (id, ph, extra) => '<input type="text" id="dl-' + id + '" placeholder="' + ph + '"' + (extra || "") +
    ' style="font-family:var(--mono);font-size:11px;padding:4px 7px;border:1px solid var(--line);border-radius:4px;background:var(--card);color:var(--ink)">';

  strip.innerHTML =
    '<div class="card" style="margin-bottom:16px">' +
    '<div class="panel-h"><h2>Leasing Pipeline</h2><div class="sub">PROSPECT → TOUR → LOI → LEASE DRAFT</div>' +
    '<span class="led-note" id="dealErr" style="color:var(--brick);margin-left:auto"></span></div>' +
    '<div style="padding:6px 18px 14px">' +
    (deals.length ? deals.map(d => dealRowHTML(d, canWrite)).join("")
      : '<div class="led-note">No active deals — leads land here from AI-1 / voice intake.</div>') +
    (canWrite ?
      '<div style="padding-top:8px">' +
      '<button class="chip" id="dealAddToggle" style="cursor:pointer">＋ Deal</button>' +
      '<div id="dealAddForm" hidden>' + // inline display would defeat [hidden]; flex lives one level in
      '<div style="display:flex;flex-wrap:wrap;gap:6px;padding-top:8px">' +
      inp("prospect", "Prospect (required)") + inp("business", "Business") + inp("unit", "Unit") +
      inp("email", "Email") + inp("phone", "Phone") + inp("rent", "Proposed rent") +
      inp("notes", "Notes", ' size="30"') +
      '<button class="chip" id="dealAddSave" style="cursor:pointer">Save</button>' +
      '</div></div></div>'
      : (operator && !REMOTE ? '<div class="led-note mute">Deal writes run on the hosted backend — unavailable in local-only mode.</div>' : "")) +
    '</div></div>';

  wireStrip(strip, canWrite);
}

function wireStrip(strip, canWrite) {
  const err = strip.querySelector("#dealErr");
  const fail = (what, e) => { console.warn("deal " + what + ":", e && e.message); if (err) err.textContent = what + " failed — " + ((e && e.message) || "see console"); };
  strip.querySelectorAll(".uchip").forEach(ch => ch.onclick = () => openDrawer(ch.dataset.unit));
  if (!canWrite) return;
  strip.querySelectorAll(".deal-stage").forEach(sel => sel.onchange = async () => {
    try { await setDealStage(sel.dataset.id, sel.value, actorEmail); } // refreshDeals repaints
    catch (e) { fail("stage change", e); sel.value = sel.dataset.stage; }
  });
  strip.querySelectorAll(".deal-del").forEach(btn => btn.onclick = async () => {
    if (!confirm("Delete this deal? This is permanent.")) return;
    try { await deleteDeal(btn.dataset.id); }
    catch (e) { fail("delete", e); }
  });
  const toggle = strip.querySelector("#dealAddToggle"), form = strip.querySelector("#dealAddForm");
  if (toggle) toggle.onclick = () => { form.hidden = !form.hidden; if (!form.hidden) form.querySelector("#dl-prospect").focus(); };
  const save = strip.querySelector("#dealAddSave");
  if (save) save.onclick = async () => {
    const v = id => strip.querySelector("#dl-" + id).value.trim();
    if (!v("prospect")) { if (err) err.textContent = "prospect name is required"; return; }
    try {
      await addDeal({
        prospect: v("prospect"), business: v("business"), unit: v("unit"),
        email: v("email"), phone: v("phone"), rent: v("rent"), notes: v("notes"),
        leadSource: "operator", by: actorEmail,
      }); // refreshDeals inside addDeal repaints the strip + lanes
    } catch (e) { fail("add", e); }
  };
}

let dragId = null;
function wire(board) {
  // open the unit drawer from a card's unit chip (not a drag)
  board.querySelectorAll(".uchip").forEach(ch => ch.onclick = e => {
    e.stopPropagation();
    openDrawer(ch.dataset.unit);
  });
  // archive
  board.querySelectorAll(".acard-x").forEach(x => x.onclick = e => {
    e.stopPropagation();
    dismissAction(x.dataset.id);
  });
  // drag and drop between lanes (deal cards render without draggable/data-id — skipped)
  board.querySelectorAll('.acard[draggable="true"]').forEach(card => {
    card.ondragstart = e => { dragId = card.dataset.id; card.classList.add("dragging"); e.dataTransfer.effectAllowed = "move"; };
    card.ondragend = () => { dragId = null; card.classList.remove("dragging"); };
  });
  board.querySelectorAll(".acol-body").forEach(body => {
    body.ondragover = e => { e.preventDefault(); body.classList.add("drag-over"); };
    body.ondragleave = () => body.classList.remove("drag-over");
    body.ondrop = e => {
      e.preventDefault();
      body.classList.remove("drag-over");
      if (dragId) moveAction(dragId, body.dataset.lane);
    };
  });
  // inline add
  board.querySelectorAll(".acol-add").forEach(btn => btn.onclick = () => {
    const box = board.querySelector('.acard-new[data-lane="' + btn.dataset.lane + '"]');
    box.hidden = false;
    box.querySelector("input").focus();
  });
  board.querySelectorAll(".acard-new input").forEach(inp => {
    inp.onkeydown = e => {
      if (e.key === "Enter" && inp.value.trim()) addAction({ title: inp.value.trim(), lane: inp.dataset.lane });
      else if (e.key === "Escape") { inp.value = ""; inp.closest(".acard-new").hidden = true; }
    };
  });
  const restore = document.getElementById("bmRestore");
  if (restore) restore.onclick = () => restoreActions();
}

export function initBoard() {
  renderBoard();
  subscribe(type => { if (type === "actions" || type === "comp" || type === "notes" || type === "import") renderBoard(); });
  onMaintChange(renderBoard); // work-order cards re-seed when the M-1 cache moves
  if (REMOTE) { // deals live only on the hosted backend (same pattern as maintenance)
    getSession().then(s => { actorEmail = (s && s.user && s.user.email) || ""; }).catch(() => {});
    onDealsChange(renderBoard); // strip + lane cards repaint when the cache moves
    refreshDeals();
  }
}
