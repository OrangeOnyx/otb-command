# Logo assets

Use `svg/cc-04c-horizontal-primary.svg` by default. The rounded 04C mark, isolated square, and outlined wordmark are the approved identity. Do not reconstruct the wordmark from a font.

## Choose a file

| Situation | File family |
| --- | --- |
| Light surface, default | `*-primary.svg` / `.png` |
| Single ink, brand green | `*-cypress.svg` / `.png` |
| Single ink, dark neutral | `*-charcoal.svg` or `*-black.svg` |
| Cypress or Charcoal surface | `*-reverse.svg` (Bone) or `*-white.svg` |
| Narrow placement | `cc-04c-stacked-*` |
| Brand already identified | `cc-04c-mark-*` |
| 16–23px icon height | `cc-04c-micro-cypress.svg` or `cc-04c-micro-reverse.svg` |
| Browser favicon | `png/favicon.ico`, or supplied 16/32/48px PNGs |
| App/home-screen/profile | `cc-04c-app-icon.svg` or supplied 180/192/512px PNGs |

SVG is the vector master for scaling, design tools, signage, vinyl, and vendor handoff. PNG is transparent raster artwork for Office, email, and tools that cannot import SVG. A white or reverse PNG may look blank on a white preview background; place it on Cypress or Charcoal.

## Geometry and minimums

The standard symbol envelope is 168 × 160 units. Its core is 48 × 48 units. Clear space is at least one core width on every side of the visible logo. Horizontal and stacked SVG exports include this padding; the standalone mark exports do not. Do not crop off built-in clear space.

- Horizontal export: at least 260px wide digitally or 65mm wide in print, including built-in padding.
- Stacked export: at least 180px wide digitally or 45mm wide in print, including built-in padding.
- Standard icon: at least 24px high digitally or 12.7mm high in print, excluding clear space.
- Micro artwork: only for 16–23px use. Keep the center square.
- Embroidery: begin at 25mm icon height; digitizing and a stitch-out are required.

Preserve aspect ratio. Never remove the square, add effects, combine inconsistent colors, or use Amber as the logo color. Never place a supporting frame inside the logo's clear space. `cc-04d-support-frame.svg` is a secondary layout device, not a logo.

## Backgrounds and app containers

Primary two-color artwork is for light backgrounds. Use the supplied one-color reverse on dark backgrounds so both the frame and core remain visible. App icon exports include a Cypress container and reverse mark; use the entire asset. Test platform masking before release.

Vendor production files are in `../print/`. Consult `../brand-guidelines.html` for the complete standard.
