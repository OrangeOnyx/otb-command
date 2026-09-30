# Design Tokens — "Plan Room" System (locked, do not drift)

Source of truth: otb-command `src/styles.css` (Atlas shell). The web app's
semantic tokens in `apps/web/src/app/globals.css` already derive from this
palette — this document is the canonical reference for any new surface.

## Palette

| Token | Value | Use |
|---|---|---|
| paper | `#EDEFE8` | app canvas |
| card | `#F6F7F1` | card/sheet surfaces |
| ink | `#1C2B26` | primary text |
| brass | `#A87E2F` | accent / title-block details |
| green | `#2F6B4F` | occupied / positive states |
| anchor | `#1E4F3C` | deep structural accent |
| brick | `#C25E33` | holdover / warning states |
| slate | `#5F6E64` | muted text |
| vacant hatch | white diagonal hatch | vacant units on plans |

## Typography

- **Display:** Big Shoulders Display
- **Body:** Public Sans
- **Data:** IBM Plex Mono

## Vernacular

- Drawing-set sheet-index navigation (D-1 Dashboard · A-1 Site Plan · A-2 Spatial · R-1 Rent Roll · P-1 Financial · C-1 Compliance · T-1 Critical Dates · W-1 Action Board · K-1 Directory · M-1 Maintenance · S-1 Owner Safe · AI-1 Concierge · V-1 Vendor Portal).
- Title block, general notes, north arrow (plan rotated — true north at right / Patricia side).
- Rev label in the A-1 title block bumps on every geometry change.

## Module naming concept (operator-locked brand system)

Atlas (spatial) · Almanac (dates) · Ledger · Desk · Register.
Market-facing output always uses the full composite "Orange Ocean Atlas" — never naked "Atlas".
