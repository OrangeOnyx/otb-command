/* T-1 Critical Dates — lease expirations + instrument deadlines on a timeline.
   Source data is static (lease ends + fixed instrument dates); the only store
   event that can change it is a full state import, so we subscribe to that. */
import { UNITS, subscribe } from "../store.js";
import { fmt$0, pDate, monthsTo, esc, TODAY } from "../lib/format.js";
import { JD_BANK, factLines } from "../lib/facts.js";

export function renderDates() {
  const ev = [];
  UNITS.filter(u => u.end).forEach(u => {
    const d = pDate(u.end);
    ev.push({
      d, c: d < TODAY ? "var(--brick)" : monthsTo(d) < 12 ? "#C99A33" : "var(--green)",
      t: "<b>" + u.unit + " · " + esc(u.dba) + "</b> lease " + (d < TODAY ? "expired — in holdover" : "expires"),
      sub: u.sf.toLocaleString() + " SF · " + (u.monthly ? fmt$0(u.monthly) + "/mo" : "")
    });
  });
  ev.push({
    d: pDate(JD_BANK.expires), c: "var(--navy)",
    t: "<b>" + esc(JD_BANK.name) + " expires</b> — " + esc(factLines.jdBankTimeline()),
    sub: esc(factLines.jdBankTimelineSub())
  });
  ev.sort((a, b) => a.d - b.d);
  let h = "", lastY = null;
  ev.forEach(e => {
    const y = e.d.getFullYear();
    if (y !== lastY) { h += '<div class="tl-group">' + y + '</div>'; lastY = y; }
    h += '<div class="tl-item"><span class="nd" style="background:' + e.c + '"></span>' +
      '<span class="dt">' + e.d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + '</span>' +
      '<span class="tx">' + e.t + '<span class="sub">' + e.sub + '</span></span></div>';
  });
  document.getElementById("timeline").innerHTML = h;
}

export function initDates() {
  renderDates();
  subscribe(type => { if (type === "import") renderDates(); });
}
