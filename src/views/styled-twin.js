/* A-8 Styled Twin (2026-10-01): the 3D twin in the A-7 look. Same release gate
   as A-3 (loaded from main.js only where the twin is released). Appearance
   only — A-3 stays the record for assets, measurements and evidence. */
import "./styled-twin.css";
import register from "../data/site-register.json";
import geometry from "../data/geometry.json";

const BASE = import.meta.env.BASE_URL;
const LIGHTS = [["day", "Day"], ["golden", "Golden hour"], ["dusk", "Dusk"]];

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
    '<p class="st-lede">The digital twin in the Visual Library look. Buildings, paving zones and register positions come from the twin; trees, poles, bollards, rooftop units and finishes are presentation dressing. Poles in the parking islands are illustrative placements. A-3 remains the record.</p>' +
    '<div class="card st-card"><div class="st-bar"><div class="st-tabs" role="tablist">' +
    LIGHTS.map(([id, label]) => '<button type="button" role="tab" data-light="' + id + '" aria-selected="' + (id === "golden") + '">' + label + "</button>").join("") +
    '</div><div class="st-actions"><button type="button" class="chip" data-act="reset">Reset view</button><button type="button" class="chip" data-act="png">Save image</button></div></div>' +
    '<div class="st-stage" id="stStage"><div class="st-loading">Loading the twin…</div></div>' +
    '<div class="st-hint">Drag to orbit · scroll to zoom · right-drag to pan</div></div>';
  const stage = document.getElementById("stStage");
  try {
    const siteData = await fetch(BASE + "twin/site-context.json").then(r => { if (!r.ok) throw new Error("site context"); return r.json(); });
    const { createStyledTwinScene } = await import("../lib/styled-twin-scene.js");
    scene = createStyledTwinScene(stage, {
      modelUrl: BASE + "twin/model.glb", fixturesUrl: BASE + "twin/fixtures.glb", siteData, register, units: geometry.units,
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
      return;
    }
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (act === "reset") scene.resetView();
    if (act === "png") { const a = document.createElement("a"); a.href = scene.capture(); a.download = "On-The-Boulevard-styled-twin.png"; a.click(); }
  });
}
