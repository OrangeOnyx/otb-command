/* A-8 Styled Twin (2026-10-01): the site in the A-7 look, rebuilt plan-true
   from the CAD/plat demising feet and the survey heights (REV 2). Same release
   gate as A-3 (loaded from main.js only where the twin is released). A-3 stays
   the record for the Floorplanner twin, evidence and asset research. */
import "./styled-twin.css";
import register from "../data/site-register.json";
import geometry from "../data/geometry.json";
import heights from "../data/heights.json";
import units from "../data/units.public.json";
import pylonData from "../data/pylon.json";
import lighting from "../data/site-lighting.json";
import logoUnits from "../data/logo-thumbs.json";
import facadeOpenings from "../data/facade-openings.json";
import roofEquipment from "../data/roof-equipment.json";
import serviceItems from "../data/site-service-items.json";
import cameras from "../data/cameras.json";

const BASE = import.meta.env.BASE_URL;
const LIGHTS = [["day", "Day"], ["golden", "Golden hour"], ["dusk", "Dusk"], ["night", "Night"]];
const SHOTS = [["overview", "Overview"], ["storefronts", "Storefronts"], ["breezeway", "Breezeway"], ["corner", "Jason\u2019s corner"], ["pylon", "Pylon"], ["rear", "Patricia rear"], ["johnston", "Johnston end"]];

let started = false, scene = null;
export function initStyledTwin() {
  const host = document.getElementById("stHost");
  if (!host) return;
  const open = () => { if (!started && document.getElementById("pg-styled")?.classList.contains("on")) start(host); };
  window.addEventListener("sheetchange", e => { if (e.detail.id === "styled") open(); });
  open();
}

async function start(host) {
  started = true;
  host.innerHTML =
    '<p class="st-lede">The site in the Visual Library look, built to the CAD and plat: every suite is laid out from the demising frontages and depths (REV 17) at the 2019 survey building heights, the stall striping is the A-1 drawing\'s own, and every site-register item with a recorded position sits at it. Turn on <b>Dimensions</b> to read the CAD/plat feet on the model. Storefront signs use each tenant\'s own logo file. Lighting follows the operator\'s inventory (5 double poles in the main field, 1 in Lot 7, wall lights over Lot 8, a fixture on every column, center-line walkway lights); pole positions are read off the night aerial and approximate. Canopy, fascia and mansard heights and tree species are presentation choices, not measurements.</p>' +
    '<div class="card st-card"><div class="st-bar"><div class="st-tabs" role="tablist">' +
    LIGHTS.map(([id, label]) => '<button type="button" role="tab" data-light="' + id + '" aria-selected="' + (id === "golden") + '">' + label + "</button>").join("") +
    '</div><div class="st-actions"><button type="button" class="chip st-toggle" data-act="photo" data-style="photo" aria-pressed="false" title="Drone photo capture (Gaussian splat), same camera">Photo</button><button type="button" class="chip st-toggle" data-act="photo" data-style="illustrated" aria-pressed="false" title="The drone capture, painted (experimental)">Illustrated</button><button type="button" class="chip st-toggle" data-act="dims" aria-pressed="true">Dimensions</button><button type="button" class="chip" data-act="reset">Reset view</button><button type="button" class="chip" data-act="png">Save image</button></div></div>' +
    '<div class="st-shots" role="group" aria-label="Camera">' + SHOTS.map(([id, label]) => '<button type="button" class="chip" data-shot="' + id + '">' + label + "</button>").join("") + "</div>" +
    '<div class="st-stage" id="stStage"><div class="st-loading">Loading the twin…</div></div>' +
    '<div class="st-hint">Drag to orbit · scroll to zoom · right-drag to pan</div></div>';
  const stage = document.getElementById("stStage");
  try {
    const siteData = await fetch(BASE + "twin/site-context.json").then(r => { if (!r.ok) throw new Error("site context"); return r.json(); });
    const { createStyledTwinScene } = await import("../lib/styled-twin-scene.js");
    scene = createStyledTwinScene(stage, {
      siteData, register, geometry, heights, units, pylonData, lighting, logoUnits, logoBase: BASE + "tenant-logos/sign/", facadeOpenings, roofEquipment, serviceItems, cameras, pylonBase: BASE + "pylon/",
      splatUrl: BASE + "OTB-splat.ksplat",
      onPhotoStatus: status => { const b = host.querySelector('[data-act="photo"][aria-pressed="true"]'); if (b) b.textContent = (b.dataset.style === "illustrated" ? "Illustrated" : "Photo") + (status === "loading" ? " · loading…" : status === "error" ? " · unavailable" : ""); },
      onReady: () => stage.querySelector(".st-loading")?.remove()
    });
    await scene.ready;
  } catch (error) {
    console.error("Styled twin could not load:", error);
    stage.innerHTML = '<div class="st-loading">The 3D model could not load. Reopen the sheet to retry.</div>';
    return;
  }
  host.addEventListener("click", e => {
    const light = e.target.closest("[data-light]");
    if (light) {
      host.querySelectorAll("[data-light]").forEach(b => b.setAttribute("aria-selected", String(b === light)));
      scene.setLighting(light.dataset.light);
      scene.setPhoto(false); host.querySelectorAll('[data-act="photo"]').forEach(b => b.setAttribute("aria-pressed", "false"));
      return;
    }
    const shotBtn = e.target.closest("[data-shot]");
    if (shotBtn) { scene.shot(shotBtn.dataset.shot); return; }
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (act === "dims") { const on = e.target.closest("[data-act]").getAttribute("aria-pressed") !== "true"; e.target.closest("[data-act]").setAttribute("aria-pressed", String(on)); scene.setDimensions(on); }
    if (act === "photo") { const b = e.target.closest("[data-act]"), on = b.getAttribute("aria-pressed") !== "true"; host.querySelectorAll('[data-act="photo"]').forEach(x => x.setAttribute("aria-pressed", String(on && x === b))); scene.setPhoto(on, b.dataset.style); }
    if (act === "reset") scene.resetView();
    if (act === "png") { const a = document.createElement("a"); a.href = scene.capture(); a.download = "On-The-Boulevard-styled-twin.png"; a.click(); }
  });
}
