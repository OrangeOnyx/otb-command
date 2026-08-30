/* Unit-drawer "Ledger" mount (ledger-lite harvest #4, decision 1A).
   REMOTE-only: entries live in Supabase ledger_entries (append-only; RLS
   read owner/operator, insert operator). Owners see the trail read-only via
   the existing body.role-owner CSS; vendors never reach the drawer.
   All math is the pure seam (src/lib/ledger.js): running balance, and
   late-fee SUGGESTIONS the operator confirms per-fee (decision 3A). */
import { REMOTE, listLedgerEntries, addLedgerEntry } from "./remote.js";
import { withRunningBalance, suggestLateFees, DEBIT_TYPES, round2 } from "./ledger.js";
import { statementModel, statementHTML, statementMonths, monthLabel } from "./statement.js";
import { byUnit } from "../store.js";
import { fmt$, esc, TODAY } from "./format.js";

const today = () => TODAY.toISOString ? TODAY.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
const TYPES = [["payment", "Payment received"], ["charge", "Charge"], ["credit", "Credit"],
  ["adjustment", "Adjustment"], ["nsf", "NSF"], ["write_off", "Write-off"]];

export function mountLedger(el, unit) {
  if (!el) return;
  if (!REMOTE) { el.innerHTML = '<div class="led-note">Ledger lives on the hosted backend — local mode shows nothing.</div>'; return; }
  el.innerHTML = '<div class="led-note">Loading…</div>';
  paint(el, unit);
}

async function paint(el, unit) {
  let rows;
  try { rows = await listLedgerEntries(unit); }
  catch (e) { el.innerHTML = '<div class="led-note">Ledger unavailable: ' + esc(e.message) + "</div>"; return; }

  const bal = withRunningBalance(rows);
  const balance = bal.length ? bal[bal.length - 1].runningBalance : 0;
  const sugg = suggestLateFees(rows, today()).filter(s => s.unit === unit);

  const rowsHtml = bal.slice(-10).reverse().map(e => {
    const debit = DEBIT_TYPES.includes(e.type);
    return '<div class="led-row">' +
      '<span class="led-d">' + esc(String(e.date)) + '</span>' +
      '<span class="led-t">' + esc(e.description || e.type) + '</span>' +
      '<span class="led-a ' + (debit ? "deb" : "cred") + '">' + (debit ? "" : "−") + fmt$(e.amount) + '</span>' +
      '<span class="led-b">' + fmt$(e.runningBalance) + '</span>' +
      '<button class="led-void" data-void="' + esc(e.id) + '" title="Void this entry">✕</button>' +
      '</div>';
  }).join("");

  const suggHtml = sugg.map(s =>
    '<div class="led-sugg"><span>Late fee suggested — ' + s.daysLate + 'd past grace, ' +
    fmt$(s.openRent) + ' open</span><button class="chip led-sugg-post" data-sugg="' + esc(s.id) + '">Post ' +
    fmt$(s.amount) + '</button></div>').join("");

  el.innerHTML =
    '<div class="led-head"><span class="led-lbl">Balance</span><b class="' + (balance > 0 ? "owe" : "clear") + '">' +
      fmt$(Math.abs(balance)) + (balance > 0 ? " owed" : balance < 0 ? " credit" : "") + '</b></div>' +
    suggHtml +
    (rowsHtml || '<div class="led-note">No entries yet — monthly rent charges begin posting Aug 1; log payments as they arrive.</div>') +
    '<div class="led-add">' +
      '<select id="ledType">' + TYPES.map(([v, l]) => '<option value="' + v + '">' + l + "</option>").join("") + '</select>' +
      '<input id="ledAmt" type="number" min="0" step="0.01" placeholder="$">' +
      '<input id="ledDate" type="date" value="' + today() + '">' +
      '<input id="ledDesc" type="text" placeholder="memo (e.g. check #1042)">' +
      '<button class="chip on" id="ledSave">Add</button>' +
    '</div>' +
    /* Statement row — deliberately OUTSIDE .led-add: owners keep it (read-only
       doc export is owner-safe; role CSS hides .led-add/.led-void/.led-sugg). */
    '<div class="led-stmt">' + (rows.length
      ? '<select id="ledStmtYm">' +
          statementMonths(rows, today().slice(0, 7)).map(m =>
            '<option value="' + m + '">' + esc(monthLabel(m)) + "</option>").join("") +
        '</select><button class="chip" id="ledStmt">⤓ Statement</button>'
      : '<span class="led-note">Statement export unlocks once the first entry posts.</span>') +
    '</div><div class="led-note" id="ledMsg"></div>';

  const msg = el.querySelector("#ledMsg");
  el.querySelector("#ledSave").onclick = async () => {
    const amount = round2(+el.querySelector("#ledAmt").value || 0);
    const type = el.querySelector("#ledType").value;
    if (amount <= 0) { msg.textContent = "enter an amount"; return; }
    try {
      await addLedgerEntry({
        unit, type, amount,
        code: type === "charge" ? "misc" : type === "nsf" ? "nsf" : null,
        date: el.querySelector("#ledDate").value || today(),
        description: el.querySelector("#ledDesc").value.trim(),
      });
      paint(el, unit);
    } catch (e) { msg.textContent = "save failed: " + e.message; }
  };
  el.querySelectorAll(".led-sugg-post").forEach(b => b.onclick = async () => {
    const s = sugg.find(x => x.id === b.dataset.sugg);
    if (!s) return;
    try { await addLedgerEntry(s.entry); paint(el, unit); }
    catch (e) { msg.textContent = "post failed: " + e.message; }
  });
  el.querySelectorAll(".led-void").forEach(b => b.onclick = async () => {
    if (!confirm("Void this entry? The row stays in history; its effect is reversed.")) return;
    try {
      await addLedgerEntry({ unit, type: "void", amount: 0, date: today(), voidOf: b.dataset.void, description: "void" });
      paint(el, unit);
    } catch (e) { msg.textContent = "void failed: " + e.message; }
  });
  const stmtBtn = el.querySelector("#ledStmt");
  if (stmtBtn) stmtBtn.onclick = () => {
    const ym = el.querySelector("#ledStmtYm").value;
    const html = statementHTML(statementModel(rows, unit, ym), byUnit[unit], { issuedISO: today() });
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };
}
