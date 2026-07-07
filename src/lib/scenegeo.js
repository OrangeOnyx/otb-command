/* Lens C — satellite spatial view. MapLibre GL over free Esri World Imagery,
   with the georeferenced unit footprints (src/data/footprints-geo.json, from
   tools/extract-georef.py) drawn as status-colored polygons. Click a footprint
   -> opts.onPick(unit). Lazy-loaded by the A-2 view so maplibre only ships
   when the lens opens. Imagery is physical — no theme inversion. */
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import geo from "../data/footprints-geo.json";

const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

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

  const map = new maplibregl.Map({
    container,
    style: {
      version: 8,
      sources: { esri: { type: "raster", tiles: [ESRI], tileSize: 256, maxzoom: 19, attribution: "Imagery © Esri" } },
      layers: [{ id: "esri", type: "raster", source: "esri" }]
    },
    bounds,
    fitBoundsOptions: { padding: 60 },
    attributionControl: { compact: true }
  });
  map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");
  container.__map = map; // debug/verification seam (element-scoped, no global)

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
  function dispose() { map.remove(); }

  return { dispose, resize, setSelected };
}
