# House style vocabulary · Cypress Command Platform + On The Boulevard

Adopted by the operator on 2026-09-29. It covers every generated or derived asset in this library.

It adds to `../style-spec.md` and does not replace it. The source-of-truth rules still apply:

- Measured sources set geometry.
- These terms set the look.
- A prompt never sets dimensions, counts or tenancy.

## Names used internally

| Asset | Name |
|---|---|
| Buildings, suites, storefronts (primary style) | **Architectural Leasing Asset Illustration** |
| Pylon, monument and directory signs | **Commercial Real Estate Directory Sign Vector Render** |
| The whole shopping center | **Commercial site plan vectorization**, also called the architectural leasing map |

## Prompt formula for matching assets

Use this when generating a matching visual. The result is a style reference only, and it is recorded as `generated-image` with `appearance` authority.

> Clean architectural vector render, commercial real estate marketing asset, front elevation orthographic view, isolated object, transparent background, neutral daylight lighting, realistic proportions, subtle shadows only, editable tenant panels, leasing brochure quality, signage mockup style, muted beige and cream palette, crisp linework, no glow, no dramatic lighting, no perspective distortion, professional property marketing graphic.

For the shopping center:

> Commercial site plan vectorization, architectural leasing map, orthographic aerial property rendering, tenant suite labeling system, commercial real estate marketing graphic, transparent background, editable layers, leasing brochure asset, property management presentation style.

## What it is

- Front elevation
- Orthographic or near-orthographic
- Realistic proportions
- Clean vector rendering
- Commercial real estate brochure aesthetic
- Editable panel layout
- Neutral colours
- Transparent background
- Minimal shadows
- Signage-system style

## What it is not

- Cartoon
- Illustration poster
- Concept art
- Isometric
- Blueprint
- Photorealistic photo
- Glowing
- Artistic rendering
- Architectural watercolour

The package board's isometric site view stays an orientation reference. It is not a house-style output.

## How the slice implements it

The renderer is `tools/cre-library/otb-slice.mjs`, and the palette lives in `MATERIAL`.

| Rule | Implementation |
|---|---|
| Materials | Wall `#EFE6D2`, panel `#FBF7EE`, post `#E8DEC8`, header `#D9C9A6`, line `#6F6250`. Material colours are physical, so they do not invert in dark mode. Only annotation text follows the `--cc-cre-*` theme tokens. |
| Shadow | A single soft drop shadow, opacity 0.16. No glow and no lighting effects. |
| Background | Transparent. No background rect in any asset SVG. |
| Tenant panels | Every panel has an empty `<text data-slot="tenant">`. Content binds by panel ID from operations data and is never baked into the file. |
| Proportions | Elevations are true scale: plat bay widths × LiDAR rooflines. On the directory sign, the panel sizes come from the operator schedule (nominal), and the cabinet, header and posts are **illustrative** until a measured sign drawing is registered. |
| Detail | Storefront glazing, canopies and columns are drawn only when a measured or registered source supports them. Style never invents detail. |
