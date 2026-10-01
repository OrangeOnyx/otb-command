/* A-7 Visual Library (2026-09-30, operator ruling): the presentation look of
   OTB — the center in three lights, the storefront, and the site-element
   plates. Appearance only; the manifest lives in lib/visual-library.js. */
import "./visual-library.css";
import { CENTER_VIEWS, STOREFRONT_VIEWS, SITE_ELEMENTS, MASTER_BOARD, visualURL } from "../lib/visual-library.js";

const tabs = (group, views, active) => '<div class="vl-tabs" role="tablist">' +
  views.map(v => '<button type="button" role="tab" data-group="' + group + '" data-id="' + v.id + '" aria-selected="' + (v.id === active) + '">' + v.label + "</button>").join("") + "</div>";

const stage = (group, view) => '<figure class="vl-stage" id="vl-' + group + '">' +
  '<img src="' + visualURL(view.file) + '" alt="On The Boulevard — ' + view.label + '">' +
  '<figcaption><span>' + view.label + '</span><a class="vl-dl" href="' + visualURL(view.file) + '" download>Download</a></figcaption></figure>';

const plate = el => '<figure class="vl-plate">' +
  '<img src="' + visualURL(el.file) + '" alt="' + el.label + '" loading="lazy">' +
  '<figcaption><b>' + el.label + '</b><span>' + el.note + '</span><a class="vl-dl" href="' + visualURL(el.file) + '" download>Download</a></figcaption></figure>';

let mounted = false;
export function initVisualLibrary() {
  const host = document.getElementById("vlHost");
  if (!host || mounted) return;
  mounted = true;
  const groups = { center: CENTER_VIEWS, storefront: STOREFRONT_VIEWS };
  host.innerHTML =
    '<p class="vl-lede">Presentation imagery for leasing, marketing and owner decks. Appearance only — building, parking and site details are illustrative; A-1, A-2 and A-3 remain the record for counts and dimensions.</p>' +
    '<section class="card vl-sec"><div class="vl-head"><h2>OTB master board</h2></div>' + stage("board", MASTER_BOARD) + "</section>" +
    '<section class="card vl-sec"><div class="vl-head"><h2>The center</h2>' + tabs("center", CENTER_VIEWS, "golden") + "</div>" + stage("center", CENTER_VIEWS[0]) + "</section>" +
    '<section class="card vl-sec"><div class="vl-head"><h2>Storefront</h2>' + tabs("storefront", STOREFRONT_VIEWS, "enhanced") + "</div>" + stage("storefront", STOREFRONT_VIEWS[0]) + "</section>" +
    '<section class="card vl-sec"><div class="vl-head"><h2>Site elements</h2></div><div class="vl-plates">' + SITE_ELEMENTS.map(plate).join("") + "</div></section>";
  host.addEventListener("click", e => {
    const btn = e.target.closest(".vl-tabs button");
    if (!btn) return;
    const { group, id } = btn.dataset;
    const view = groups[group].find(v => v.id === id);
    btn.parentElement.querySelectorAll("button").forEach(b => b.setAttribute("aria-selected", String(b === btn)));
    document.getElementById("vl-" + group).outerHTML = stage(group, view);
  });
}
