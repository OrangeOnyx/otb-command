# Verification Report — Cypress Command Rebrand Package
20 Sept 2026 · unattended run

## What was checked

| Check | Method | Result |
|---|---|---|
| Design-system page renders | Playwright, Chromium, 1280 px Day + Night, 400 px phone | Pass — no horizontal scroll, all sections visible; screenshots in `visuals/` |
| Logo vectors | Rendered all fills + lockups + favicon | Pass — geometry matches approved 04C imagery; source-file overlay still required (D7) |
| Application templates | Rendered cover, letterhead, slides, signature | Pass — boards in `visuals/` |
| Contrast | WCAG 2.x relative-luminance formula on every text/surface pair, both themes | See table; one token adjusted |
| Legacy terms | grep for Orange Ocean, Moss, Amber, Charcoal, Bone, Fraunces across public-facing files | Clean — hits are only the documented "retired" list and the Fraunces font-stack fallback |
| Artifact publish | Published `design-system/index.html`; Day/Night toggle persists per viewer | Pass |

## Adjustment made from measurement
Night Oxblood was `#C96455` (4.58:1 on night Paper, 4.10:1 on night Paper Deep — fails AA on Paper Deep). Changed to **`#D27363`** (5.37:1 / 4.80:1). Updated in tokens.css, tokens.json, tailwind preset, index.html, and Brand Standards 2.0.

Three pairs remain below 4.5:1 by design and are governed by usage rules in Brand Standards §2.5: Mustard on day Paper (4.19, large/bold only), Terra on day Paper Deep (4.42, labels/links/buttons only), night-Terra on Cypress (3.15 day / 4.10 night, rules and eyebrows only).

## Contrast table (as measured before the Oxblood fix; night Oxblood rows updated to the new value)

| Theme | Foreground | Background | Ratio | AA text | AA large |
|---|---|---|---|---|---|
| DAY | Ink | Paper | 14.95:1 | pass | pass |
| DAY | Ink | PaperDeep | 13.29:1 | pass | pass |
| DAY | InkSoft | Paper | 6.41:1 | pass | pass |
| DAY | InkSoft | PaperDeep | 5.70:1 | pass | pass |
| DAY | Terra | Paper | 4.97:1 | pass | pass |
| DAY | Terra | PaperDeep | 4.42:1 | FAIL | pass |
| DAY | Olive | Paper | 6.75:1 | pass | pass |
| DAY | Olive | PaperDeep | 6.00:1 | pass | pass |
| DAY | Mustard | Paper | 4.19:1 | FAIL | pass |
| DAY | Mustard | PaperDeep | 3.73:1 | FAIL | pass |
| DAY | Oxblood | Paper | 7.30:1 | pass | pass |
| DAY | Oxblood | PaperDeep | 6.49:1 | pass | pass |
| DAY | Paper | Cypress | 8.40:1 | pass | pass |
| DAY | TerraNight | Cypress | 3.15:1 | FAIL | pass |
| NIGHT | Ink | Paper | 15.41:1 | pass | pass |
| NIGHT | Ink | PaperDeep | 13.78:1 | pass | pass |
| NIGHT | InkSoft | Paper | 8.63:1 | pass | pass |
| NIGHT | InkSoft | PaperDeep | 7.72:1 | pass | pass |
| NIGHT | Terra | Paper | 5.79:1 | pass | pass |
| NIGHT | Terra | PaperDeep | 5.18:1 | pass | pass |
| NIGHT | Olive | Paper | 7.09:1 | pass | pass |
| NIGHT | Olive | PaperDeep | 6.34:1 | pass | pass |
| NIGHT | Mustard | Paper | 7.35:1 | pass | pass |
| NIGHT | Mustard | PaperDeep | 6.58:1 | pass | pass |
| NIGHT | Oxblood | Paper | 5.37:1 | pass | pass |
| NIGHT | Oxblood | PaperDeep | 4.80:1 | pass | pass |
| NIGHT | Paper | Cypress | 10.92:1 | pass | pass |
| NIGHT | TerraNight | Cypress | 4.10:1 | FAIL | pass |
| DAY | Paper | Ink | 14.95:1 | pass | pass |
| DAY | Paper | Terra | 4.97:1 | pass | pass |

## Not verified (needs you)
- The SVG mark against the original 04C source file.
- Trademark availability of "Cypress Command" / "Command Platform".
- Entity/d-b-a sequencing (counsel).
- Pricing (hypotheses only).
