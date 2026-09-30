# Approved pylon master: OTB_Pylon_Final_v2 (filed 2026-09-30)

The operator confirmed on 2026-09-30 that this is the current pylon sign: **14 panels.**

## Layout

The layout is also recorded in `OTB_Pylon_Final_v2_panel_layout.json`.

- A blank spacer (reveal) sits above Panel 1.
- **P1:** 2×8, full width.
- **P2:** 4×8, full width.
- **P3–P14:** six rows of paired 2×4 panels. Odd numbers are on the left, even numbers on the right.

The panel sizes agree with the Belle "Pylon Sign Space Rental Agreement" series, which specifies 2' × 4' tenant spaces.

## Provenance

- **Original files:** `D:\2026-09 C-Drive Offload\OTB-ARCHIVE-RESCUE-2026-08-17\OTB-Staging\_FROM-DOWNLOADS\OTB_Pylon_Final_v2_final_files\`
- **PNGs:** from Drive, `00 OTB/Belle Realty SOT Documents/XX - Final Versions to be Placed/`.
- **Superseded layout:** the older 15-slot tenant-placement sheet ("Belle Pylon Sign - Blank.pdf" on Drive) split the top row into two panels. That layout is no longer current.

## How the library uses it

The A-6 Asset Library draws the pylon from `OTB_Pylon_Final_v2_vector.svg`. Its named panel groups (`panel_01_2x8` …) are bound to the library panel IDs `panel-otb-johnston-pylon-p1` … `-p14`, and each panel gets an empty, editable tenant slot. This is done by `tools/cre-library/otb-slice.mjs` → `signSvgApproved`.

The master files are an approved design render. They are not a sign-shop dimension drawing: panel sizes are nominal, and the cabinet and posts are not measured.
