/* Drawer "Prior payments · AC" panel — read-only 13-month predecessor rent
   record over lib/payhistory.js (payment_history, imported from Asset
   Command; 2025-07 → 2026-07). Every role that reaches the drawer may look;
   nothing here writes. Lateness comes from `status`, never paid_at — the
   2026-07 period was bulk-entered upstream (see lib/payhistory.js caveat). */
import { REMOTE } from "./remote.js";
import {
  getPayHistory, payHistoryLoaded, onPayHistoryChange, refreshPayHistory,
  unitPayHistory, payHistoryStats,
} from "./payhistory.js";
import { fmt$, esc } from "./format.js";

const STATUS_COLOR = {
  paid: "var(--green)", "": "var(--green)",
  late: "var(--brass)", partial: "var(--brass)",
  unpaid: "var(--brick)",
};

let current = null;     // latest mounted {el, unit} — the repaint target
let listening = false;  // one module-level change listener, ever
let requested = false;  // refreshPayHistory fired at most once per outcome

export function mountPayHistory(el, unit) {
  if (!el) return;
  if (!REMOTE) { el.innerHTML = '<div class="led-note">Prior payments require the hosted backend.</div>'; return; }
  current = { el, unit };
  if (!listening) {
    listening = true;
    onPayHistoryChange(() => {
      if (current && current.el.isConnected) paint(current.el, current.unit);
    });
  }
  if (!payHistoryLoaded()) {
    el.innerHTML = '<div class="led-note">Loading…</div>';
    if (!requested) {
      requested = true;
      refreshPayHistory().then(() => {
        /* success repaints via the change listener; a failed read leaves the
           cache unloaded — surface that and let a later mount retry */
        if (!payHistoryLoaded()) {
          requested = false;
          if (current && current.el.isConnected)
            current.el.innerHTML = '<div class="led-note">Prior-payment record unavailable right now.</div>';
        }
      });
    }
    return;
  }
  paint(el, unit);
}

function paint(el, unit) {
  const rows = unitPayHistory(getPayHistory(), unit);
  if (!rows.length) {
    el.innerHTML = '<div class="led-note">No prior-payment record for this unit (predecessor data covers 2025-07 → 2026-07).</div>';
    return;
  }
  const s = payHistoryStats(rows)[String(unit)];
  const newest = rows.slice().sort((a, b) => (a.period < b.period ? 1 : a.period > b.period ? -1 : 0));

  const rowsHtml = newest.map(r => {
    const status = r.status || "paid";
    const color = STATUS_COLOR[r.status] || "var(--slate)";
    const how = [r.method, r.check_number ? "#" + r.check_number : ""].filter(Boolean).join(" ");
    const fee = +r.late_fee > 0
      ? '<span class="mono" style="font-family:var(--mono);font-size:10px;color:var(--brass)">+' + fmt$(+r.late_fee) + " late fee</span>"
      : "<span></span>";
    return '<div class="led-row">' +
      '<span class="led-d">' + esc(r.period) + "</span>" +
      '<span class="led-t"><b style="color:' + color + '">' + esc(status) + "</b>" +
        (how ? ' <span style="color:var(--ink50)">· ' + esc(how) + "</span>" : "") + "</span>" +
      '<span class="led-a">' + fmt$(+r.amount_paid || 0) + "</span>" +
      fee + "<span></span></div>";
  }).join("");

  const onTime = s.months ? Math.round((s.paid / s.months) * 100) : 0;
  el.innerHTML = rowsHtml +
    '<div class="led-note">' + s.months + " months on file · " + onTime + "% clean · " +
    fmt$(s.lateFees) + " late fees charged · imported from Asset Command (read-only)</div>";
}
