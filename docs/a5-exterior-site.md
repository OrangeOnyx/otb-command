# A-5 Exterior & Site

Open A-5 from the sheet index or use `/#exterior`. Local review: `http://127.0.0.1:5174/#exterior`.

The page brings the existing exterior viewer into Cypress Command Platform. It uses the same source model as the portable 8770 viewer, with building finishes, parking stalls, walkway fixtures and site utility references. Use Overview, Plan or Walkway; select a modeled object or search the register to inspect its ID, verification status and source. Expand view gives the model more space. The model and register can be downloaded as GLB and CSV.

A-3 remains the place for interior floor plans, upper floors, permanent records, photos and maintenance history. A-4 holds source plans, aerial references and photos. A-5 does not create or synchronize permanent database records, and its 39 A-1 column IDs remain distinct from the native-model column candidates.

## Build and access

- Run the existing `npm run dev:review` local-review command. No second server is required.
- `VITE_ASSET_TWIN_ENABLED=1 npm run build` includes A-3/A-4/A-5 and the generated `/site-twin/` package. In PowerShell set `$env:VITE_ASSET_TWIN_ENABLED='1'` before `npm.cmd run build`.
- With that flag off, production omits the model package and A-5 module. Runtime navigation follows the existing operator/owner gate. Owners must be granted the sheet in owner-sheet settings.
- `tools/site-twin/viewer/` remains the shared viewer source; `tools/build-site-twin.mjs` remains the geometry generator. Vite packaging uses an allowlist and rewrites the existing module imports to local URLs compatible with the hosted script policy.
- `/site-twin/` framing is same-origin only. Other app routes retain their existing framing restriction. Like the previously approved source package, included model files are static deployment assets; the sheet gate is not a private file-download authorization layer.

## Model boundaries

745 register entries, 616 modeled. Parking geometry includes 314 plat-derived stalls and 10 candidate CAD stalls. Canopy dimensions, rooftop-unit representation, utility depth and positional uncertainties retain the model's existing caveats. This integration adds no field measurements and does not make the presentation finishes or mapped shutoffs verified.

## Validation — September 28, 2026

927 repository tests passed. Enabled and disabled production builds passed; existing JSON-import and bundle-size warnings remain. Browser acceptance covered direct A-5 loading, a selected stall and its source, walkway stepping, Plan, expansion, narrow-screen layout, A-4 navigation and return to A-3 interior plans from a previous water selection. The iframe is removed when leaving A-5 to release rendering resources. No deployment or database write was performed.
