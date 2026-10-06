/* X-1 Lab (2026-10-06, operator): the showcase / experimental sheets, one card
   each. Membership is LAB_SHEETS in lib/pages.js; promoting a sheet back to the
   main index is a one-line change there. Cards for sheets this account can't
   open (e.g. A-8 behind the twin release gate) are not shown. */
import "./lab.css";
import { PAGES, LAB_SHEETS } from "../lib/pages.js";

const BASE = import.meta.env.BASE_URL;
const ABOUT = {
  evidence: { thumb: "OTB-sat-base.jpg", text: "The twin's source library: Google Earth views and dated aerials, GIS captures, suite floor plans, the water/shut-off map, field photos and open verification notes." },
  exterior: { thumb: "visuals/otb-twin-dusk.webp", text: "The A-1 register exterior model in 3D — every register item at its recorded position, in the twin's site frame." },
  library: { thumb: "visuals/otb-pylon-v2.webp", text: "The Cypress Command Platform CRE asset library slice for OTB: leasing elevations, the pylon directory-sign render, the site-plan vectorization and per-entity provenance." },
  mkt: { thumb: "visuals/otb-center-golden.webp", text: "Marketing assembly: flyers, property overview, tenant cards, the photo library with hero picks, and the public /tour media." },
  visuals: { thumb: "visuals/otb-master-board.webp", text: "The presentation look: the OTB master board, the center in three lights, the storefront and the site-element plates. Generated imagery — appearance only." },
  styled: { thumb: "visuals/otb-twin-day.webp", text: "The 3D twin dressed in the Visual Library look, with Day · Golden hour · Dusk · Night lighting, a Photo mode that swaps in the drone capture, and an Illustrated mode that paints it." }
};

export function initLab({ isAvailable = () => true, open }) {
  const host = document.getElementById("labHost");
  if (!host) return;
  const render = () => {
    const cards = LAB_SHEETS.filter(isAvailable).map(id => {
      const [, sheet, label] = PAGES.find(p => p[0] === id);
      const a = ABOUT[id] ?? { thumb: "", text: "" };
      return '<article class="card lab-card"><button type="button" class="lab-open" data-open="' + id + '" aria-label="Open ' + sheet + ' ' + label + '">' +
        (a.thumb ? '<img src="' + BASE + a.thumb + '" alt="" loading="lazy">' : "") + "</button>" +
        '<div class="lab-body"><div class="lab-code">' + sheet + '</div><h2>' + label + '</h2><p>' + a.text + '</p>' +
        '<button type="button" class="chip" data-open="' + id + '">Open ' + sheet + "</button></div></article>";
    }).join("");
    host.innerHTML = '<p class="lab-lede">Showcase and experimental sheets. They are kept out of the main sheet index so everyday users see the site plan, the twin and the working sheets. Each one can be promoted back to the index when it is ready.</p>' +
      (cards ? '<div class="lab-grid">' + cards + "</div>" : '<p class="lab-lede">No lab sheets are available to this account.</p>');
  };
  host.addEventListener("click", e => { const id = e.target.closest("[data-open]")?.dataset.open; if (id) open(id); });
  render();
  return { render };
}
