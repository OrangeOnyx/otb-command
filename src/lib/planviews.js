/* A-1 view presets — pure (2026-09-20, Asset Command review pick 7). AC's
   site plan had overlay MODES (Leasing · Daily Ops · Building Systems · Common
   Areas · Signage · Roof · Site / Hardscape) instead of a row of independent
   toggles. Cypress keeps every existing chip; a view is a named combination
   of them (color-by mode, scope, overlay toggles, unit-fill opacity) applied
   in one click. Touching any chip afterwards drops the view highlight — the
   chips stay the truth. No DOM — tested in test/planviews.test.mjs. */

export const OVERLAY_KEYS = ["photos", "parking", "access", "easements", "cameras", "occupancy", "roof", "signage", "facility", "features"];

const base = { mode: "status", scope: "main", unitOpacity: 1, overlays: Object.fromEntries(OVERLAY_KEYS.map(k => [k, false])) };
const view = (id, label, hint, patch) => ({
  id, label, hint,
  mode: patch.mode || base.mode, scope: patch.scope || base.scope,
  unitOpacity: patch.unitOpacity ?? base.unitOpacity,
  overlays: { ...base.overlays, ...(patch.overlays || {}) },
});

export const PLAN_VIEWS = [
  view("leasing", "Leasing", "Status colors, photos, vacancy — the leasing walk",
    { mode: "status", overlays: { photos: true } }),
  view("ops", "Daily Ops", "Parking, access, occupancy, cameras and site assets",
    { mode: "status", overlays: { parking: true, access: true, occupancy: true, cameras: true, features: true } }),
  view("systems", "Building Systems", "HVAC exposure by suite, roof / HVAC imagery, asset pins",
    { mode: "hvac", unitOpacity: 0.6, overlays: { roof: true, features: true } }),
  view("common", "Common Areas", "Parking, drive aisles, curb cuts and recorded easements",
    { mode: "status", unitOpacity: 0.8, overlays: { parking: true, access: true, easements: true } }),
  view("signage", "Signage", "Signage imagery and sign / pylon asset pins",
    { mode: "status", unitOpacity: 0.5, overlays: { signage: true, features: true } }),
  view("roof", "Roof", "Roof imagery with suites faded to read the membrane",
    { mode: "hvac", unitOpacity: 0.35, overlays: { roof: true } }),
  view("site", "Site / Hardscape", "Full site with the remote lot, striping, access and easements",
    { mode: "status", scope: "full", unitOpacity: 0.7, overlays: { parking: true, access: true, easements: true, features: true } }),
];

export const viewById = id => PLAN_VIEWS.find(v => v.id === id) || null;

/* does the current toolbar state still equal a view? → its id or "" */
export function matchView(state) {
  for (const v of PLAN_VIEWS) {
    if (v.mode !== state.mode || v.scope !== state.scope) continue;
    if (Math.abs(v.unitOpacity - state.unitOpacity) > 0.011) continue;
    if (OVERLAY_KEYS.every(k => !!v.overlays[k] === !!(state.overlays || {})[k])) return v.id;
  }
  return "";
}
