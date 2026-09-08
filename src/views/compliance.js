/* C-1 reads the existing compliance store. State changes keep the original
   cycleComp + append-only audit-event path; search/filter are view state. */
import "./compliance.css";
import { UNITS, COMP_FIELDS, COMP_STATES, SEED_NOTE, getComp, cycleComp, subscribe } from "../store.js";
import { esc } from "../lib/format.js";
import { LOCAL_REVIEW, REMOTE, logCompEvent, listCompEvents } from "../lib/remote.js";
import { eventRow, describeEvent } from "../lib/compevents.js";
import { canEditCompliance, filterComplianceRows } from "../lib/compliance-ui.js";

const FIELD_LABELS = Object.fromEntries(COMP_FIELDS);
const LABELS = { u: "Unverified", ok: "On file", flag: "Flagged", na: "N/A" };
let showHist = false, query = "", flaggedOnly = false, historyGeneration = 0;
let roleObserver = null, readOnly = false;

function stateIcon(state) {
  const drawing = {
    ok: '<path d="m3 8 3 3 7-7"/>',
    flag: '<path d="M4 14V2m0 1h8l-2 3 2 3H4"/>',
    na: '<path d="M3 8h10"/>',
    u: '<circle cx="8" cy="8" r="6"/><path d="M6.5 6a1.6 1.6 0 0 1 3.1.5c0 1-1.6 1.1-1.6 2.3M8 11v.1"/>',
  };
  return '<svg class="mx-status-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (drawing[state] || drawing.u) + '</svg>';
}

function captureFocus(host) {
  const node = document.activeElement;
  if (!node || !host.contains(node)) return null;
  if (node.matches(".mx-state")) return { unit: node.dataset.u, field: node.dataset.k };
  return { id: node.id, start: node.selectionStart, end: node.selectionEnd };
}

function restoreFocus(host, saved) {
  if (!saved) return;
  const target = saved.unit
    ? [...host.querySelectorAll(".mx-state")].find(button => button.dataset.u === saved.unit && button.dataset.k === saved.field)
    : document.getElementById(saved.id);
  const focus = target && !target.disabled ? target : document.getElementById("mxFilterFlagged");
  focus?.focus({ preventScroll: true });
  if (target?.id === "mxSearch" && saved.start != null) target.setSelectionRange(saved.start, saved.end);
}

export function renderMatrix() {
  const host = document.getElementById("matrix");
  if (!host) return;
  const focused = captureFocus(host), scroll = host.querySelector(".mx-scroll");
  const scrollLeft = scroll?.scrollLeft || 0, scrollTop = scroll?.scrollTop || 0;
  const seedExpanded = host.querySelector(".mx-source-note")?.open || false;
  readOnly = !canEditCompliance(document.body.classList);
  const rows = filterComplianceRows(UNITS, COMP_FIELDS, getComp, { query, flaggedOnly });
  const count = rows.length + " of " + UNITS.length + " suites" + (flaggedOnly ? " · flagged rows" : "");
  const instruction = readOnly ? "Read-only view. Recorded states remain visible."
    : "Select a state to advance: Unverified, On file, Flagged, then N/A.";
  const persistence = LOCAL_REVIEW ? "Local review: changes stay in this browser." : "";
  const legend = COMP_STATES.map(state => '<li class="mx-legend-item mx-status-' + state + '">' + stateIcon(state) + '<span>' + LABELS[state] + '</span></li>').join("");
  const tableRows = rows.map(unit => '<tr><th scope="row" class="mx-suite-header"><span class="mx-suite-id">' + esc(unit.unit) + '</span><span class="mx-tenant">' + esc(unit.dba) + '</span></th>' +
    COMP_FIELDS.map(([field, label]) => {
      const state = getComp(unit.unit, field), word = LABELS[state] || LABELS.u;
      const next = LABELS[COMP_STATES[(COMP_STATES.indexOf(state) + 1) % COMP_STATES.length]];
      const description = 'Suite ' + unit.unit + ', ' + unit.dba + ', ' + label + ': ' + word + (readOnly ? '. Read only.' : '. Change to ' + next + '.');
      return '<td class="mx-cell"><button type="button" class="mx-state mx-status-' + esc(state) + '" data-u="' + esc(unit.unit) + '" data-k="' + esc(field) + '" aria-label="' + esc(description) + '" title="' + esc(description) + '"' + (readOnly ? ' disabled' : '') + '>' + stateIcon(state) + '<span class="mx-state-label">' + word + '</span></button></td>';
    }).join("") + '</tr>').join("");
  host.innerHTML = '<div class="mx-toolbar"><label class="mx-search-label" for="mxSearch">Find a suite or tenant<input id="mxSearch" type="search" autocomplete="off" value="' + esc(query) + '" placeholder="Suite number or tenant name"></label>' +
    '<div class="mx-filter" role="group" aria-label="Filter compliance rows"><button id="mxFilterAll" type="button" aria-pressed="' + !flaggedOnly + '">All suites</button><button id="mxFilterFlagged" type="button" aria-pressed="' + flaggedOnly + '">Flagged rows</button></div>' +
    (REMOTE ? '<button type="button" class="mx-history-toggle" id="mx-hist" aria-expanded="' + showHist + '" aria-controls="mx-histpanel">Change history</button>' : '') + '</div>' +
    '<div class="mx-context"><ul class="mx-legend" aria-label="Compliance states">' + legend + '</ul><p class="mx-count" id="mxCount" role="status">' + count + '</p></div>' +
    '<div class="mx-guidance"><p id="mxInstructions">' + instruction + (persistence ? ' <span>' + persistence + '</span>' : '') + '</p><details class="mx-source-note"' + (seedExpanded ? ' open' : '') + '><summary id="mxSeedSummary">Seed reference</summary><p>' + esc(SEED_NOTE) + '</p></details></div>' +
    '<div id="mxScroll" class="mx-scroll" tabindex="0" role="region" aria-label="Compliance matrix, scroll horizontally for all fields" aria-describedby="mxInstructions"><table class="mx-table"><caption class="mx-sr-only">Recorded compliance states by suite and requirement</caption><colgroup><col class="mx-suite-col">' + COMP_FIELDS.map(() => '<col>').join("") + '</colgroup><thead><tr><th scope="col" class="mx-suite-header">Suite / Tenant</th>' +
    COMP_FIELDS.map(([, label]) => '<th scope="col">' + esc(label) + '</th>').join("") + '</tr></thead><tbody>' + tableRows + '</tbody></table>' +
    (!rows.length ? '<div class="mx-empty"><h2>No matching suites</h2><p>Try another suite or tenant name, or show all suites.</p><button id="mxClearFilters" type="button">Clear filters</button></div>' : '') + '</div>' +
    '<div id="mxAnnouncement" class="mx-sr-only" role="status" aria-live="polite" aria-atomic="true"></div>' +
    '<section id="mx-histpanel" class="mx-history" aria-label="Compliance change history"' + (showHist ? '' : ' hidden') + '>' + (showHist ? '<p role="status">Loading change history…</p>' : '') + '</section>';

  const pane = host.querySelector(".mx-scroll");
  pane.scrollLeft = scrollLeft; pane.scrollTop = scrollTop;
  host.querySelectorAll(".mx-state").forEach(button => button.onclick = () => {
    // Check at activation as well as render: preview/role can change between
    // events, and disabled styling is never the mutation boundary.
    if (!canEditCompliance(document.body.classList)) return;
    const unit = button.dataset.u, field = button.dataset.k, from = getComp(unit, field);
    cycleComp(unit, field);
    const to = getComp(unit, field);
    logCompEvent(eventRow({ unit, field, from, to }));
    document.getElementById("mxAnnouncement").textContent = 'Suite ' + unit + ', ' + FIELD_LABELS[field] + ': ' + LABELS[to] + '.';
  });
  document.getElementById("mxSearch").oninput = event => { query = event.target.value; renderMatrix(); };
  document.getElementById("mxFilterAll").onclick = () => { flaggedOnly = false; renderMatrix(); };
  document.getElementById("mxFilterFlagged").onclick = () => { flaggedOnly = true; renderMatrix(); };
  const clear = document.getElementById("mxClearFilters");
  if (clear) clear.onclick = () => { query = ""; flaggedOnly = false; renderMatrix(); document.getElementById("mxSearch").focus(); };
  const history = document.getElementById("mx-hist");
  if (history) history.onclick = () => { showHist = !showHist; renderMatrix(); };
  restoreFocus(host, focused);
  const generation = ++historyGeneration;
  if (showHist) paintHistory(generation);
}

async function paintHistory(generation) {
  const panel = document.getElementById("mx-histpanel");
  if (!panel) return;
  try {
    const rows = await listCompEvents(80);
    if (!panel.isConnected || generation !== historyGeneration) return;
    panel.innerHTML = '<h2>Change history</h2>' + (rows.length
      ? '<ol class="mx-history-list">' + rows.map(row => {
        const event = describeEvent(row, FIELD_LABELS);
        return '<li><span class="mx-history-date">' + esc(event.when) + '</span><span>' + esc(event.line) + '</span><span class="mx-history-who">' + esc(event.who) + '</span></li>';
      }).join("") + '</ol>'
      : '<p>No compliance changes are recorded in this history.</p>');
  } catch (error) {
    if (!panel.isConnected || generation !== historyGeneration) return;
    panel.textContent = "Change history is unavailable. Close and reopen it to try again. " + error.message;
  }
}

export function initMatrix() {
  subscribe(type => { if (type === "comp" || type === "import") renderMatrix(); });
  renderMatrix();
  roleObserver?.disconnect();
  roleObserver = new MutationObserver(() => {
    if (readOnly !== !canEditCompliance(document.body.classList)) renderMatrix();
  });
  roleObserver.observe(document.body, { attributes: true, attributeFilter: ["class"] });
}
