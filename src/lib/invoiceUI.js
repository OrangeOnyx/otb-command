/* Unit-drawer "Invoices" mount (F-1: invoices + late fees → full parity).
   REMOTE-only like ledgerUI: the document is DERIVED from ledger_entries
   (src/lib/invoice.js) and only the send/void lifecycle lives in the typed
   `invoices` table (RLS read owner/operator + tenant own unit, write
   operator). Owners get the month picker + ⤓ export read-only; the operator
   controls (.inv-ops) hide under body.role-owner CSS. Vendors never reach
   the drawer. Paid/partial/overdue are never stored — recomputed on paint. */
import { REMOTE, listLedgerEntries, listInvoices, upsertInvoice } from "./remote.js";
import { invoiceModel, invoiceStatus, invoiceHTML, invoiceMonths } from "./invoice.js";
import { monthLabel } from "./statement.js";
import { byUnit } from "../store.js";
import { fmt$, esc, TODAY } from "./format.js";

const today = () => TODAY.toISOString ? TODAY.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);

/* status chip — shared by the drawer and the tenant face (maintenance.js) */
export function invoiceChip(st) {
  const cls = st.status + (st.overdue ? " overdue" : "");
  return '<span class="inv-chip ' + esc(cls) + '">' + esc(st.status) + (st.overdue ? " · overdue" : "") + "</span>";
}

/* blob → window.open → revoke (same idiom as the statement export) */
export function openInvoice(model, unit, st, issuedISO) {
  const stamp = st.status === "paid" || st.status === "void" ? st.status : st.overdue ? "overdue" : "";
  const html = invoiceHTML(model, byUnit[unit], { issuedISO: issuedISO || today(), status: stamp });
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function mountInvoices(el, unit) {
  if (!el) return;
  if (!REMOTE) { el.innerHTML = '<div class="led-note">Invoices live on the hosted backend — local mode shows nothing.</div>'; return; }
  el.innerHTML = '<div class="led-note">Loading…</div>';
  paint(el, unit);
}

async function paint(el, unit, keepYm) {
  let rows, invs;
  try { [rows, invs] = await Promise.all([listLedgerEntries(unit), listInvoices(unit)]); }
  catch (e) { el.innerHTML = '<div class="led-note">Invoices unavailable: ' + esc(e.message) + "</div>"; return; }

  const months = invoiceMonths(rows, today().slice(0, 7));
  if (!months.length) {
    el.innerHTML = '<div class="led-note">Invoices unlock once the first charge posts for this unit.</div>';
    return;
  }
  const ym = months.includes(keepYm) ? keepYm : months[0];
  const model = invoiceModel(rows, unit, ym);
  const stored = invs.find(i => i.id === model.id) ||
    { id: model.id, unit, ym, status: "draft", entryIds: model.entryIds, sent_on: null, notes: "" };
  const st = invoiceStatus(stored, rows, today());

  const ops = st.status === "void" ? "" :
    (stored.status === "sent" ? "" : '<button class="chip on" id="invSent">Mark sent</button>') +
    '<button class="chip" id="invVoid" title="Void this invoice (the ledger entries stay)">Void</button>';

  const history = invs.filter(i => i.id !== model.id).map(i => {
    const s = invoiceStatus(i, rows, today());
    return '<div class="inv-row"><span class="inv-id">' + esc(i.id) + "</span>" +
      '<span class="inv-m">' + esc(monthLabel(i.ym)) + "</span>" +
      '<span class="inv-amt">' + fmt$(s.amount || +i.amount || 0) + "</span>" +
      invoiceChip(s) +
      '<button class="chip inv-dl" data-ym="' + esc(i.ym) + '" title="Open ' + esc(i.id) + '">⤓</button></div>';
  }).join("");

  el.innerHTML =
    '<div class="inv-pick"><select id="invYm">' +
      months.map(m => '<option value="' + m + '"' + (m === ym ? " selected" : "") + ">" + esc(monthLabel(m)) + "</option>").join("") +
    "</select>" + invoiceChip(st) +
    '<button class="chip" id="invOpen">⤓ Invoice</button>' +
    '<span class="inv-ops">' + ops + "</span></div>" +
    '<div class="inv-sum">' + esc(model.id) + " · " + fmt$(model.amount) +
      " · paid " + fmt$(model.paid) + " · balance " + fmt$(model.balance) +
      " · due " + esc(model.due) +
      (stored.sent_on ? " · sent " + esc(stored.sent_on) + (stored.sent_via ? " (" + esc(stored.sent_via) + ")" : "") : "") +
    "</div>" +
    (history ? '<div class="inv-sub">Other invoices</div>' + history : "") +
    '<div class="led-note" id="invMsg"></div>';

  const msg = el.querySelector("#invMsg");
  el.querySelector("#invYm").onchange = e => paint(el, unit, e.target.value);
  el.querySelector("#invOpen").onclick = () => openInvoice(model, unit, st, stored.sent_on);
  el.querySelectorAll(".inv-dl").forEach(b => b.onclick = () => {
    const m = invoiceModel(rows, unit, b.dataset.ym);
    if (!m) { msg.textContent = "every charge on that invoice is voided — nothing to print"; return; }
    const row = invs.find(i => i.id === m.id);
    openInvoice(m, unit, invoiceStatus(row, rows, today()), row && row.sent_on);
  });
  const sentBtn = el.querySelector("#invSent");
  if (sentBtn) sentBtn.onclick = async () => {
    try {
      await upsertInvoice({
        id: model.id, unit, ym, amount: model.amount, entryIds: model.entryIds,
        status: "sent", sent_on: today(), sent_via: "manual", notes: stored.notes || "",
      });
      paint(el, unit, ym);
    } catch (e) { msg.textContent = "mark sent failed: " + e.message; }
  };
  const voidBtn = el.querySelector("#invVoid");
  if (voidBtn) voidBtn.onclick = async () => {
    if (!confirm("Void invoice " + model.id + "? The ledger entries stay; only the invoice document is voided.")) return;
    try {
      await upsertInvoice({
        id: model.id, unit, ym, amount: model.amount, entryIds: model.entryIds,
        status: "void", sent_on: stored.sent_on || null, sent_via: stored.sent_via || "", notes: stored.notes || "",
      });
      paint(el, unit, ym);
    } catch (e) { msg.textContent = "void failed: " + e.message; }
  };
}
