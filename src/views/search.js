/* Global search (topbar) — harvested from the v9 concept. "/" focuses, type to
   search units / contacts / documents, Enter opens the top hit, Esc closes.
   Unit hits open the shared drawer; contact/document hits jump to K-1. */
import { UNITS } from "../store.js";
import { propertyContacts, propertyDocuments } from "../lib/directory.js";
import { search } from "../lib/search.js";
import { esc } from "../lib/format.js";
import { openDrawer } from "./drawer.js";

function entries() {
  const out = [];
  UNITS.forEach(u => out.push({
    type: "unit", key: u.unit,
    title: u.unit + " · " + (u.status === "vacant" ? "VACANT" : u.dba),
    sub: u.sf.toLocaleString() + " SF · " + u.use,
    haystack: [u.unit, u.dba, u.legal || "", u.use]
  }));
  propertyContacts().forEach(c => out.push({
    type: "contact", key: c.id, title: c.company || c.name || "—",
    sub: (c.role || "Contact") + (c.name && c.company ? " · " + c.name : ""),
    haystack: [c.company || "", c.name || "", c.role || "", c.note || ""]
  }));
  propertyDocuments().forEach(d => out.push({
    type: "doc", key: d.id, title: d.name,
    sub: (d.type || "Document") + (d.ref && d.ref !== "—" ? " · " + d.ref : ""),
    haystack: [d.name, d.ref || "", d.note || "", d.type || ""]
  }));
  return out;
}

const TAG = { unit: "UNIT", contact: "CONTACT", doc: "DOC" };

function go(e) {
  if (e.type === "unit") { openDrawer(e.key); return; }
  const nav = [...document.querySelectorAll(".nav button")].find(b => b.textContent.includes("Directory"));
  if (nav) nav.click();
}

export function initSearch() {
  const box = document.getElementById("gsBox");
  const input = document.getElementById("gsInput");
  const list = document.getElementById("gsResults");
  if (!box || !input || !list) return;
  let hits = [];

  const close = () => { list.innerHTML = ""; list.style.display = "none"; };
  const render = () => {
    hits = search(entries(), input.value);
    if (!hits.length) { close(); return; }
    list.innerHTML = hits.map((h, i) =>
      '<div class="gs-hit" data-i="' + i + '"><span class="gs-tag gs-' + h.type + '">' + TAG[h.type] + '</span>' +
      '<span class="gs-t">' + esc(h.title) + '</span><span class="gs-s">' + esc(h.sub || "") + '</span></div>').join("");
    list.style.display = "block";
    list.querySelectorAll(".gs-hit").forEach(el => {
      el.onmousedown = ev => { ev.preventDefault(); go(hits[+el.dataset.i]); input.value = ""; close(); };
    });
  };

  input.oninput = render;
  input.onkeydown = e => {
    if (e.key === "Enter" && hits.length) { go(hits[0]); input.value = ""; close(); input.blur(); }
    if (e.key === "Escape") { input.value = ""; close(); input.blur(); }
  };
  input.onblur = () => setTimeout(close, 150);
  document.addEventListener("keydown", e => {
    if (e.key === "/" && !/input|textarea/i.test(document.activeElement?.tagName || "")) {
      e.preventDefault(); input.focus();
    }
  });
}
