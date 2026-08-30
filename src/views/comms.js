/* L-1 Comm Log — the cross-channel correspondence sheet. OPERATOR: filter/
   search the log, expand entries, hand-log new correspondence (note/email/
   letter/meeting/sms), delete stale rows. OWNER: read-only list. Sealed roles
   (tenant/vendor/pending) never render here. All derivation lives in
   lib/comms.js; RLS scopes every query. Data re-renders ride onCommsChange;
   filter/expand/form are view-local UI state re-painted directly. */
import { REMOTE } from "../lib/remote.js";
import { esc } from "../lib/format.js";
import {
  CHANNELS, filterComms, commLine,
  getComms, onCommsChange, refreshComms, addComm, deleteComm,
} from "../lib/comms.js";

/* view-local UI state — survives data re-renders */
const state = { channel: "", unit: "", q: "", open: null, form: false };

function detailHTML(r) {
  const p = r.payload && typeof r.payload === "object" ? r.payload : {};
  const meta = [
    r.contact_phone ? "📞 " + r.contact_phone : "",
    r.contact_email ? "✉ " + r.contact_email : "",
    r.agent ? "agent: " + r.agent : "",
    r.urgency ? "urgency: " + r.urgency : "",
    r.status ? "status: " + r.status : "",
  ].filter(Boolean);
  const ac = r.source === "ac" ? [
    p.ac_kind ? "kind: " + p.ac_kind : "",
    p.next_step ? "next step: " + p.next_step : "",
  ].filter(Boolean) : [];
  return '<div style="margin:4px 0 6px 8px;padding:5px 8px;border-left:2px solid #A87E2F;font-size:12px">' +
    (r.body ? '<div style="white-space:pre-wrap">' + esc(r.body) + '</div>'
      : '<div class="mute" style="font-size:11px">no body logged</div>') +
    (meta.length ? '<div class="mono mute" style="font-size:10.5px;margin-top:4px">' + meta.map(esc).join(" · ") + '</div>' : "") +
    (ac.length ? '<div class="mono" style="font-size:10.5px;margin-top:2px;color:#A87E2F">' + ac.map(esc).join(" · ") + '</div>' : "") +
    '</div>';
}

function rowHTML(r, operator) {
  const L = commLine(r);
  return '<div class="comm-row" data-id="' + esc(r.id) + '" style="border-bottom:1px dashed var(--line);padding:4px 0;cursor:pointer">' +
    '<div style="display:flex;gap:8px;align-items:baseline;flex-wrap:wrap">' +
    '<span class="mono" style="font-size:11px;white-space:nowrap">' + esc(L.when) + '</span>' +
    '<span class="chip" style="padding:1px 8px;font-size:10px">' + esc(L.chip) + '</span>' +
    (L.unitTag ? '<span class="mono" style="font-size:10px;background:#1E4F3C;color:#fff;border-radius:3px;padding:0 5px">' + esc(L.unitTag) + '</span>' : "") +
    '<span style="font-size:12px;color:var(--ink70);white-space:nowrap">' + esc(L.who) + '</span>' +
    '<span style="font-size:12px;flex:1;min-width:120px">' + esc(L.summary) + '</span>' +
    (L.sourceTag ? '<span class="mono mute" style="font-size:9px" title="imported Asset Command voice history">' + esc(L.sourceTag) + '</span>' : "") +
    (operator ? '<button class="safe-del comm-del" data-id="' + esc(r.id) + '" title="Delete entry">✕</button>' : "") +
    '</div>' +
    (state.open === r.id ? detailHTML(r) : "") +
    '</div>';
}

function headerHTML(operator) {
  const rows = getComms();
  const counts = {};
  for (const r of rows) counts[r.channel] = (counts[r.channel] || 0) + 1;
  const chip = (val, label, n) =>
    '<button class="chip comm-ch' + (state.channel === val ? " on" : "") + '" data-ch="' + esc(val) + '">' +
    label + (n ? ' <span class="mono" style="font-size:9px">' + n + '</span>' : "") + '</button>';
  return '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:8px">' +
    chip("", "All", rows.length) +
    Object.entries(CHANNELS).map(([k, label]) => chip(k, label, counts[k] || 0)).join("") +
    '<input type="text" id="commUnit" placeholder="unit" value="' + esc(state.unit) + '" style="width:64px;font-size:11px">' +
    '<input type="search" id="commQ" placeholder="search…" value="' + esc(state.q) + '" style="flex:1;min-width:140px;font-size:11px">' +
    (operator ? '<button class="chip' + (state.form ? " on" : "") + '" id="commAdd">＋ Log entry</button>'
      : '<span class="mute mono" style="font-size:10px">(read-only)</span>') +
    '</div>';
}

function formHTML() {
  const chOpts = ["note", "email", "letter", "meeting", "sms"].map(k =>
    '<option value="' + k + '">' + CHANNELS[k] + '</option>').join("");
  return '<div id="commForm" style="margin:0 0 8px;padding:8px;border:1px dashed #A87E2F;border-radius:4px">' +
    '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:4px">' +
    '<select id="cfChannel">' + chOpts + '</select>' +
    '<select id="cfDir"><option value="out">→ out</option><option value="in">← in</option></select>' +
    '<input type="text" id="cfUnit" placeholder="unit" style="width:64px">' +
    '<input type="text" id="cfName" placeholder="contact name" style="flex:1;min-width:140px">' +
    '<input type="text" id="cfPhone" placeholder="phone" style="width:110px">' +
    '<input type="email" id="cfEmail" placeholder="email" style="min-width:150px">' +
    '</div>' +
    '<input type="text" id="cfSummary" placeholder="Summary (required)" style="width:100%;margin-bottom:4px">' +
    '<textarea id="cfBody" placeholder="Body / notes" style="width:100%;min-height:48px;font-size:12px"></textarea>' +
    '<div style="display:flex;gap:6px;margin-top:4px">' +
    '<button class="chip" id="cfSave" style="font-weight:600">Save</button>' +
    '<button class="chip" id="cfCancel">Cancel</button></div></div>';
}

/* only the list re-paints while typing — the inputs keep focus */
function renderList(host, account) {
  const el = host.querySelector("#commList");
  if (!el) return;
  const operator = account && account.role === "operator";
  const rows = filterComms(getComms(), state);
  el.innerHTML = rows.length ? rows.map(r => rowHTML(r, operator)).join("")
    : getComms().length ? '<div class="led-note">No entries match the current filters.</div>'
      : '<div class="led-note">No correspondence logged yet.</div>';
  wireList(el, host, account);
}

function wireList(el, host, account) {
  el.querySelectorAll(".comm-del").forEach(b => b.onclick = async e => {
    e.stopPropagation();
    if (!confirm("Delete this log entry?")) return;
    try { await deleteComm(b.dataset.id); }
    catch (err) { alert("Delete failed: " + err.message); }
  });
  el.querySelectorAll(".comm-row").forEach(row => row.onclick = e => {
    if (e.target.closest(".comm-del")) return;
    state.open = state.open === row.dataset.id ? null : row.dataset.id;
    renderList(host, account);
  });
}

function render(host, account) {
  const operator = account && account.role === "operator";
  host.innerHTML = headerHTML(operator) +
    (operator && state.form ? formHTML() : "") +
    '<div id="commList"></div>';

  host.querySelectorAll(".comm-ch").forEach(b => b.onclick = () => {
    state.channel = state.channel === b.dataset.ch ? "" : b.dataset.ch; // re-click = back to All
    render(host, account);
  });
  host.querySelector("#commUnit").oninput = e => { state.unit = e.target.value; renderList(host, account); };
  host.querySelector("#commQ").oninput = e => { state.q = e.target.value; renderList(host, account); };

  if (operator) {
    host.querySelector("#commAdd")?.addEventListener("click", () => {
      state.form = !state.form;
      render(host, account);
    });
    host.querySelector("#cfSave")?.addEventListener("click", async () => {
      const summary = host.querySelector("#cfSummary").value.trim();
      if (!summary) { alert("Give the entry a summary."); return; }
      try {
        await addComm({
          channel: host.querySelector("#cfChannel").value,
          direction: host.querySelector("#cfDir").value,
          unit: host.querySelector("#cfUnit").value.trim(),
          contactName: host.querySelector("#cfName").value.trim(),
          contactPhone: host.querySelector("#cfPhone").value.trim(),
          contactEmail: host.querySelector("#cfEmail").value.trim(),
          summary,
          body: host.querySelector("#cfBody").value.trim(),
        }, account.email);
        state.form = false; // refreshComms inside addComm re-renders via onCommsChange
      } catch (err) { alert("Log entry failed: " + err.message); }
    });
    host.querySelector("#cfCancel")?.addEventListener("click", () => {
      state.form = false;
      render(host, account);
    });
  }

  renderList(host, account);
}

export function initComms(account) {
  const host = document.getElementById("commsBody");
  if (!host) return;
  if (!REMOTE) {
    host.innerHTML = '<div class="ai-note mute">Comm log requires the hosted backend — local-only mode.</div>';
    return;
  }
  if (account.role !== "operator" && account.role !== "owner") return; // sealed roles never route here
  onCommsChange(() => render(host, account));
  refreshComms(); // paint fires via onCommsChange
  render(host, account); // immediate skeleton while the fetch runs
}
