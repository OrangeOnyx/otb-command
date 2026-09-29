/* A-6 Asset Library (2026-09-29): the Cypress Command Platform CRE asset library
   for OTB — leasing elevations (plat frontages × LiDAR rooflines), the pylon
   directory-sign render, the site-plan vectorization of the site register, and
   per-entity provenance. Geometry comes from the generated bundle
   (tools/cre-library/build-otb-slice.mjs); tenancy binds live from the store by
   entity ID, never baked into the drawings. */
import bundle from "../data/cre-library-otb.json";
import { UNITS } from "../store.js";
import { mountCreLibrary } from "../lib/cre-library-view.js";

let mounted = false;
export function initAssetLibrary({ showSensitive = false } = {}) {
  const host = document.getElementById("libHost");
  if (!host || mounted) return;
  mounted = true;
  mountCreLibrary(host, bundle, { units: UNITS, showSensitive });
}
