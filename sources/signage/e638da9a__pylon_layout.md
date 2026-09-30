# OTB Pylon Panel Layout (from OTB_Pylon_Final_v2_panel_guide.png)

Header cabinet: "ON THE BOULEVARD" (fixed, not a tenant slot).

14 tenant panels below header, top to bottom:
- Panel 1  — 2x8 (full width, short)        row 0, full
- Panel 2  — 4x8 (full width, tall)          row 1, full
- Panel 3  — 2x4 (left)   | Panel 4  — 2x4 (right)   row 2
- Panel 5  — 2x4 (left)   | Panel 6  — 2x4 (right)   row 3
- Panel 7  — 2x4 (left)   | Panel 8  — 2x4 (right)   row 4
- Panel 9  — 2x4 (left)   | Panel 10 — 2x4 (right)   row 5
- Panel 11 — 2x4 (left)   | Panel 12 — 2x4 (right)   row 6
- Panel 13 — 2x4 (left)   | Panel 14 — 2x4 (right)   row 7

Panels 1 & 2 are full-width (premium / anchor). Panels 3-14 are paired half-width.
All start vacant; user assigns tenant + linked unit + status (occupied/vacant/reserved).

Layout model for UI: render as a vertical stack of CSS rows over the pylon image,
or as a standalone schematic (chosen: standalone schematic grid that mirrors these proportions,
with the transparent pylon image as the header/frame reference).
