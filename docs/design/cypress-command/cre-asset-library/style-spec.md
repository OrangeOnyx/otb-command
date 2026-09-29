# Authoritative design and style specification

Version 1.0.0. This file is normative for library presentation and organization. It never grants authority over property measurements, legal records, or operational facts. Read [source-of-truth.md](source-of-truth.md) first.

## Reference priority and interpretation

1. `references/cypress-command-cre-asset-library-master-board.png` is the current visual north star requested by Adam: the latest generated CRE board following “give another example using the referenced images for the design of cypress command” in the source conversation.
2. The light/dark master boards supply supporting Cypress composition and semantic-color principles where the CRE board is silent.
3. The application boards and logo images document supporting identity and typography. AI Playbook-only styles are not promoted into the CRE contract.
4. Rules explicitly labeled **implementation extension** below fill gaps so a developer can build consistently. They are new package decisions, not facts extracted from the source raster. Record any future change instead of silently replacing these choices.

All visible property geometry and data in the master board are generated reference content. Words such as “accurate” and “software ready” printed inside it are aspirations, not verification. Preserve its aesthetic without tracing its geometry into production.

## Visual character

Use precise, calm architectural illustration with crisp silhouettes, believable restrained materials, soft ambient depth, and readable object hierarchy. The board combines neutral warm masonry, dark awnings/glazing, muted landscape greens, restrained shadows, and warm Paper/Ink presentation. Keep surfaces legible at small UI sizes. Detail supports recognition; it must not imply unmeasured hardware, openings, equipment, plantings, or dimensions.

Use real measured proportions and geometry. Render orthographic front/rear/suite/sign elevations; use an explicitly labeled isometric view for spatial overview. The board's isometric site presentation is an orientation aid, not a dimensioned survey. Supply a measured top-down plan separately when needed. Do not approximate measured geometry with generated pixels.

## Reference board's eight asset groups

| Board group | Required implementation behavior |
| --- | --- |
| 01 Property overview | Derived measured frontage; stable building/suite hit targets and evidence links |
| 02 Pylon sign / blank template | Separate frame, header, faces and individually addressable panels; source determines actual count, sizes and layout |
| 03 Site plan / isometric | Same canonical geometry as the plan; explicit camera; calibrated locations for known assets |
| 04 Suite elevation | Modular render connected to stable suite/building ID; tenancy is separate data |
| 05 Rear/service elevation | Verified openings, utilities and service elements; unknown items excluded or labeled |
| 06 Common site elements | Reusable visual templates for landscaping, parking, lighting, enclosure, HVAC, utilities and bollards |
| 07 UI components | Property/suite cards, work order, lease and inquiry summaries driven by existing records |
| 08 Icon library | Consistent operational icons for property, suite, tenant, lease, invoice, work, maintenance, inspections, parking, utilities and security |

## Identity, typography and surfaces

Keep the current Cypress Command mark intact. Locate the repository's approved vector logo and reuse it; the included JPEG logos are reference evidence, not new production masters. Do not redraw a logo from generated pixels, add a tree mark, recolor third-party tenant logos, or rename legal parties. OTB appears as a property under Cypress Command, not as the shared library brand.

The supporting Cypress application boards identify Besley for editorial display, Archivo for functional UI, and Courier Prime for technical metadata. Prefer the repo's existing approved implementations. **Implementation extension:** use `Georgia`, `Arial` and `monospace` fallbacks respectively; font binaries/licenses are not bundled. Do not require a new font network dependency for initial integration.

Light surfaces are warm Paper with Ink text and fine rules. Dark surfaces are warm, low-glare near-black with warm light text; do not mechanically invert materials or tenant logos. Geometry, state meanings, record IDs and evidence availability stay identical across themes. Decorative texture belongs in a presentation reference, not under dense operational tables or labels.

## Color semantics and sign states

Global meanings from the supporting master boards: **Terra = action; Olive = success; Mustard = watch; Oxblood = stop.** Paper/Ink and muted rules form the base. The CRE board additionally uses contextual sign-panel styles. Keep these two layers explicit:

| Sign-panel presentation in current board | Visual treatment | Data rule |
| --- | --- | --- |
| Empty | Plain Paper panel | No displayed content; does not prove vacancy |
| Tenant | Quiet light panel | Content from approved tenant/sign record |
| New Tenant | Dark muted green | Explicit marketing state with effective date |
| Logo | Approved tenant artwork | A content mode, not occupancy status |
| Vacant | Terra fill/accent | Only from verified availability data; label “Vacant” |
| Coming Soon | Muted gray-green | Explicit scheduled marketing state |
| Under Renovation | Pale warm fill | Explicit maintenance/marketing state |
| Not Available | Oxblood fill/accent | Explicit availability state; not a generic error |

Do not make all occupied suites green merely because the board contains a green example. **Implementation extension:** unknown/unverified states use a neutral outline plus text; conflicts use a distinct warning and an evidence link. Color is always paired with visible text and, where useful, icon or hatch. Lease status, maintenance status, sign content mode and verification status are separate dimensions.

`tokens/visual-tokens.json` and `tokens/visual-tokens.css` supply exact opt-in defaults. They preserve familiar source palette names; exact values in this package are documented implementation choices, not measurements of the CRE raster. Namespaced CSS never changes global application styles by itself. Use existing repo tokens through a mapping if already established. A conflict with a current approved repo brand spec must be recorded and resolved, not silently overwritten.

## Asset construction

- Preserve native measured source files. Produce editable SVG for suitable 2D derivatives and GLB/glTF for suitable interactive 3D delivery; format choices are implementation extensions, not a mandate to replace existing supported formats.
- Separate geometry, materials, labels, tenant artwork, interaction targets and status overlays. Keep human-readable IDs in SVG groups and model-node metadata linked to canonical entity IDs.
- Give every SVG a `viewBox`, title/description where meaningful, explicit theme tokens, and bounded hit targets. Do not bake text into raster geometry or require inline scripts/external references in an SVG.
- Reuse parametrized templates for generic site assets. Site instances bind real position/orientation/dimensions to a template; a generic HVAC icon is not evidence of a particular installed unit.
- Blank sign templates have editable panels and no guessed tenant logos, panel count, proportions, blank slots or address. Panel geometry comes from verified sign drawings/measurements.
- Transparent-background cutouts are appropriate for reusable assets; composed boards/reports use intentional Paper/Night surfaces. Use a consistent camera and lighting setup across a comparison set.
- Use neutral material color for physical assets; status overlays should be togglable so they cannot be confused with actual paint/materials. Keep any simplification tolerance and omitted detail in provenance.

**Implementation extensions:** use a 4px spacing base, modest 4–8px control radii and 1px UI rules; begin icons at a 24px grid with 1.5–2px strokes, then adapt to the existing component system. These screen values never define physical asset dimensions.

## UI binding and accessible use

A card or selected object shows its stable identity, readable label, relevant live status and an evidence entry point. Do not duplicate tenant or lease truth in asset metadata. Reuse the repo's authorized APIs/state/query layer; preserve tenant privacy and access checks. Missing data produces an explicit unknown state, not a fabricated count or sample tenant.

Map, plan, elevation and twin selections resolve to the same entity ID. Provide keyboard selection and a list/table alternative for spatial views, visible focus, text equivalents for state, and useful names for controls. Tooltips must not be the only route to facts. Disable decorative motion when reduced motion is preferred.

**Implementation acceptance targets:** normal text contrast at least 4.5:1, large text 3:1 and essential control/graphic contrast 3:1, measured on actual rendered pairings. These are package test targets; they do not constitute a compliance certification. Test light/dark, touch/keyboard, narrow mobile and desktop. Keep labels readable independently of zoom; clearly distinguish unknown, loading, no results, stale data, access denied and conflict states.

## Acceptance of a derived asset

Compare against authoritative geometry with an agreed use-specific tolerance, check units/coordinates/orientation and entity correspondence, then visually inspect both themes and all status treatments. Verify IDs and operational joins. Review source and derivative hashes, conversion settings, labels, clipping and broken references. Record measured accuracy separately from visual approval. Generated image prompts alone cannot guarantee dimension preservation; production geometry must pass the deterministic source pipeline.
