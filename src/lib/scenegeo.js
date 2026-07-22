/* Lens C — satellite spatial view. MapLibre GL over a FROZEN imagery base
   (public/OTB-sat-base.jpg via tools/build-sat-base.py — operator decision
   2026-07-21: live Esri tiles serve different captures per zoom level and
   silently refresh, so registration could never hold; the frozen composite is
   the exact vintage the georef was fitted against. Swap to the owned drone
   ortho after the roof re-fly: same corners contract, different image).
   Georeferenced unit footprints (src/data/footprints-geo.json) draw as
   status-colored polygons; click -> opts.onPick(unit). Lazy-loaded by the A-2
   view so maplibre only ships when the lens opens. Imagery is physical — no
   theme inversion. Oriented to match A-1 (plan bearing = azY+180); the compass
   control resets north-up. Unit numbers + the A-1 asset-pin layer render as
   DOM markers (no glyph server → no CSP change). */
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import geo from "../data/footprints-geo.json";
import satBase from "../data/sat-base.json";
import { planBearing, planToLL, ringCentroid } from "./geoproject.js";
import { getFeatures, FEATURE_TYPES } from "../store.js";

const FEATURE_ICON = Object.fromEntries(FEATURE_TYPES.map(([id, icon]) => [id, icon]));

export function createGeoScene(container, units, opts = {}) {
  const onPick = opts.onPick || (() => {});
  const colorOf = {};
  units.forEach(u => { colorOf[u.unit] = u.color; });

  // merge live colors into feature properties
  const data = {
    type: "FeatureCollection",
    features: geo.features.map(f => ({
      ...f,
      properties: { ...f.properties, color: colorOf[f.properties.unit] || "#5F6E64" }
    }))
  };
  const lls = geo.features.flatMap(f => f.geometry.coordinates[0]);
  const bounds = lls.reduce((b, c) => b.extend(c), new maplibregl.LngLatBounds(lls[0], lls[0]));
  const bearing = planBearing(geo.georef);

  const map = new maplibregl.Map({
    container,
    style: {
      version: 8,
      sources: {
        base: {
          type: "image",
          url: (import.meta.env?.BASE_URL || "/") + satBase.image.replace(/^\//, ""),
          coordinates: satBase.coordinates
        }
      },
      layers: [{ id: "base", type: "raster", source: "base" }]
    },
    bearing,
    bounds,
    fitBoundsOptions: { padding: 60, bearing },
    attributionControl: { compact: true, customAttribution: "Imagery © Esri (frozen composite)" }
  });
  map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");
  container.__map = map; // debug/verification seam (element-scoped, no global)

  // unit-number markers at footprint centroids (screen-upright at any bearing)
  geo.features.forEach(f => {
    const el = document.createElement("div");
    el.className = "geo-unitnum";
    el.textContent = f.properties.unit;
    new maplibregl.Marker({ element: el }).setLngLat(ringCentroid(f.geometry.coordinates[0])).addTo(map);
  });

  // A-1 asset-pin layer (store 'features', plan px) projected through the georef
  let pinMarkers = [];
  const renderPins = () => {
    pinMarkers.forEach(m => m.remove());
    pinMarkers = getFeatures().map(f => {
      const el = document.createElement("div");
      el.className = "geo-pin";
      el.textContent = FEATURE_ICON[f.type] || "📍";
      if (f.label) {
        const lab = document.createElement("span");
        lab.className = "geo-pin-lab";
        lab.textContent = f.label;
        el.appendChild(lab);
      }
      return new maplibregl.Marker({ element: el }).setLngLat(planToLL(geo.georef, f.x, f.y)).addTo(map);
    });
  };
  renderPins();

  // idempotent — attached on load AND idle so throttled/backgrounded tabs still get layers
  const ensureLayers = () => {
    if (map.getSource("units")) return;
    map.addSource("units", { type: "geojson", data });
    map.addLayer({
      id: "unit-fill", type: "fill", source: "units",
      paint: { "fill-color": ["get", "color"], "fill-opacity": 0.55 }
    });
    map.addLayer({
      id: "unit-line", type: "line", source: "units",
      paint: { "line-color": "#FCFCF9", "line-width": 1 }
    });
    map.addLayer({
      id: "unit-sel", type: "line", source: "units",
      paint: { "line-color": "#A87E2F", "line-width": 3 },
      filter: ["==", ["get", "unit"], "__none__"]
    });
    map.on("click", "unit-fill", e => {
      const unit = e.features && e.features[0] && e.features[0].properties.unit;
      if (unit) onPick(unit);
    });
    map.on("mouseenter", "unit-fill", () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", "unit-fill", () => { map.getCanvas().style.cursor = ""; });
  };
  map.on("load", ensureLayers);
  map.on("idle", ensureLayers);

  function setSelected(unit) {
    if (map.getLayer("unit-sel")) map.setFilter("unit-sel", ["==", ["get", "unit"], unit || "__none__"]);
  }
  function resize() { map.resize(); }
  function dispose() { map.remove(); } // removes markers with the map

  return { dispose, resize, setSelected, refreshPins: renderPins };
}
