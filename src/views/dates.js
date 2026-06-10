/* T-1 Critical Dates — lease expirations + instrument deadlines on a timeline. */
import { UNITS } from "../store.js";
import { fmt$0, pDate, monthsTo, esc, TODAY } from "../lib/format.js";

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
    d: new Date(2034, 11, 30), c: "var(--navy)",
    t: "<b>JD Bank parking easement expires</b> — Belle loses 13 bank spaces; $250/mo income ends",
    sub: "Re-run parking count vs variance 99-11797 well before this date"
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
