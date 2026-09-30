# Cypress Command — Brand and Design Guidelines

Version 1.0 · September 2026 · Cypress Command, LLC, Lafayette, Louisiana

This document replaces the Orange Ocean profile in the Abdalla brand system. Belle Realty of Lafayette, LLC (owner) and On The Boulevard (property brand) keep their existing identities; only the operator layer changes. Files referenced here live in `cypress-command/brand/`.

---

## 1. Positioning

**What it is.** Cypress Command, LLC is the property manager and operating company for Belle Realty of Lafayette, LLC, and the name of the software platform that runs the property.

**One name, everywhere.** Legal entity, platform, domain, email, and app all use the same two words. The former split (Orange Ocean the company, Asset Command and Atlas the products) is retired.

| Layer | Name |
|---|---|
| Legal entity | Cypress Command, LLC |
| Public/company name | Cypress Command |
| Platform and app | Cypress Command (app.cypresscommand.com) |
| AI assistant inside the platform | Cypress Concierge |
| Reserved, not yet used | Cypress Compass (advisory), Cypress Crew (agents) |

**Authority chain (never omit).** Cypress Command acts only as agent. Every signature block, footer, and letterhead states: *Property Manager for Belle Realty of Lafayette, LLC*. On The Boulevard material carries: *Managed by Cypress Command, LLC | On behalf of Belle Realty of Lafayette, LLC*.

**Company-forward.** The company is the face. Adam Anthony Abdalla appears once per document, in the signature block as Authorized Representative, and not on marketing surfaces. No founder photo, bio, or first-person singular on cypresscommand.com.

---

## 2. Name rules

- Always both words, title case: **Cypress Command**. In legal text: **Cypress Command, LLC** (comma, no period after LLC unless ending a sentence).
- Never shorten to "Cypress", "CC", "Command", or "CypressCmd". Never write "CypressCommand" as one word except in URLs and handles.
- Never "Cypress AI", "Cypress Command AI", or "Cypress Intelligence". The assistant is **Cypress Concierge**.
- Do not pair the name with tree, leaf, swamp, or landscape imagery. The name is a metaphor for endurance; the visual system is abstract on purpose (see Section 3 and the trademark note in Section 9).
- Never reference Orange Ocean, Asset Command, or Atlas in outbound material. Internal migration docs may say "formerly Asset Command" until the cutover is complete.

---

## 3. The Ring Mark

**Concept.** Two nested C forms and one solid square. Read three ways: the growth rings of a cypress, the CC monogram, and a signal converging on a single point — the property under command.

**Construction (100-unit grid, center at 50,50).**
- Outer ring: radius 38, stroke 11, aperture 76° opening to the right (3 o'clock), butt terminals.
- Inner ring: radius 21, stroke 11, aperture 92° opening to the right.
- Center: 15 × 15 square, axis-aligned. Always a square, never a dot.
- Single fill color. No outlines, gradients, shadows, bevels, or rotation.

**Clear space.** Keep a margin equal to half the mark's height on all sides, free of text, edges, and other marks.

**Minimum size.** Mark alone: 24 px on screen, 8 mm in print. Horizontal lockup: 140 px wide, 32 mm. Below those sizes use the tile version (mark on a Cypress Green or Night square, 22% corner radius).

**Files.**

| Use | File |
|---|---|
| Mark, Cypress Green on transparent | `logo/icon-green.svg` / `.png` |
| Mark, Ink (one-color print) | `logo/icon-ink.svg` |
| Mark, white (photos, dark) | `logo/icon-white.svg` |
| Tile, Bone mark on Green square | `logo/icon-bone-on-green.svg`, `logo/app-icon.png` (1024) |
| Tile, Bone mark on Night square | `logo/icon-bone-on-night.svg` |
| Favicon | `logo/favicon.svg` / `.png` (64) |

---

## 4. Lockups

Horizontal is primary. Stacked is for square placements (social avatars, signage, app splash). Wordmark alone is allowed only when the mark appears elsewhere on the same surface.

In the horizontal lockup the mark is 1.9× the cap height of the wordmark, separated by 0.35× the mark height, and vertically centered on the wordmark's x-height. Do not rebuild the lockup by hand; use the files.

| Variant | File | Background |
|---|---|---|
| Primary | `logo/lockup-horizontal-green` | Bone, Parchment, white |
| Reversed | `logo/lockup-horizontal-bone-on-green` | Cypress Green |
| Dark UI | `logo/lockup-horizontal-bone-on-night` | Cypress Night |
| Mono | `logo/lockup-horizontal-ink` | Fax, forms, one-color print |
| White | `logo/lockup-horizontal-white` | Photography only |
| Stacked | `logo/lockup-stacked-{green,ink,bone-on-green}` | As above |
| Wordmark | `logo/wordmark-{green,ink,bone-on-green}` | As above |

The wordmark is set in Manrope Bold, tracking −1.2%, converted to outlines. Never retype it in a live font.

---

## 5. Color

One accent, warm neutrals, nothing else. Cypress Green is the brand and the only interactive color. There is no secondary hue. No navy, no orange, no gradients.

All values are generated from OKLCH ramps (`brand/palette.py`, `brand/palette.json`) so steps are perceptually even and hue-constant.

### Roles

| Token | Name | Hex | Use |
|---|---|---|---|
| `--cc-accent` | Cypress Green (green-700) | `#1E5036` | Wordmark, buttons, links, focus ring |
| `--cc-accent-hover` | Cypress Deep (green-800) | `#173B28` | Hover, pressed, dark panels |
| `--cc-bg-dark` | Cypress Night (green-950) | `#0B1C13` | Dark backgrounds, footers, dark-mode page |
| `--cc-accent-soft` | Moss (green-200) | `#C4E2CF` | Tinted borders, tags, selection, chart fills |
| `--cc-bg` | Bone (neutral-50) | `#FAF8F4` | Page background |
| `--cc-surface` | Parchment (neutral-100) | `#F4F1EC` | Cards, table stripes |
| `--cc-border` | neutral-300 | `#D4D1CA` | Dividers, card borders |
| `--cc-text` | Ink (neutral-950) | `#151411` | Body text, mono logo |
| `--cc-text-muted` | Stone (neutral-600) | `#66635D` | Captions, secondary text |
| `--cc-error` | | `#AC3031` | Destructive, overdue |
| `--cc-warning` | | `#9A6000` | Expiring, attention |
| `--cc-info` | | `#1F6A96` | Informational only |

Success states reuse green-600 `#2E6849` with an icon or label. Color is never the only signal.

### Ramps

Green: 50 `#F2F9F4` · 100 `#E2F1E8` · 200 `#C4E2CF` · 300 `#9ECAAF` · 400 `#6DA885` · 500 `#458461` · 600 `#2E6849` · **700 `#1E5036`** · 800 `#173B28` · 900 `#112A1C` · 950 `#0B1C13`

Neutral: 50 `#FAF8F4` · 100 `#F4F1EC` · 200 `#E8E4DD` · 300 `#D4D1CA` · 400 `#AEAAA4` · 500 `#86837D` · 600 `#66635D` · 700 `#4D4A44` · 800 `#35332E` · 900 `#23211D` · 950 `#151411`

### Measured contrast (WCAG 2.x)

| Pair | Ratio | Result |
|---|---|---|
| Ink on Bone | 17.4 | AAA |
| Stone (muted) on Bone | 5.6 | AA |
| Cypress Green on Bone | 8.8 | AAA |
| Bone on Cypress Green | 8.8 | AAA |
| Bone on Cypress Deep | 11.7 | AAA |
| Bone on Cypress Night | 16.6 | AAA |
| Warning on Bone | 4.9 | AA |
| Error on Bone | 6.2 | AA |
| Info on Bone | 5.6 | AA |
| green-400 on Night (dark-mode links) | 6.4 | AA |
| neutral-400 on Night (dark-mode muted) | 7.6 | AAA |

### Dark mode

Page: Cypress Night. Surface: green-900 `#112A1C`. Border: green-800. Text: Bone. Muted: neutral-400 `#AEAAA4`. Accent: green-400 `#6DA885` for links and focus (green-700 on Night measures 1.9 and fails). Use one switching mechanism (`.dark` class) across the app.

### Status colors elsewhere

Status colors are for the software UI only. Letters, notices, decks, and the website use green and neutrals exclusively.

---

## 6. Typography

| Role | Face | Weight | Size |
|---|---|---|---|
| Wordmark | Manrope | 700 | outlined, never live |
| Headlines / hero | Manrope | 700 | 40–64 px, tracking −2% |
| Section headings | Manrope | 600 | 24–32 px, tracking −1% |
| UI labels, buttons | Inter | 500 | 14–16 px |
| Body | Inter | 400 | 16–18 px, line-height 1.55 |
| Tables, numbers | Inter | 400/500 | tabular figures on |
| Captions | Inter | 400 | 12–14 px, Stone |
| Formal letters, notices, contracts | Times New Roman | 400/700 | 10.5–11 pt, 1.2–1.3 leading |

Rules:
- Two families on screen, never a third. No display fonts, no scripts.
- Formal correspondence is Times New Roman to match Belle Realty documents; headings in letters are bold Times, not Manrope.
- Word and Outlook fallback: Arial for headings and signatures, Times New Roman for letter body. Web fallback stack: `Manrope, "Helvetica Neue", Arial, sans-serif` and `Inter, system-ui, sans-serif`.
- Never letterspace lowercase. No italics for emphasis in UI; use weight 500. No all-caps except the entity name in legal signature blocks.
- Load Manrope and Inter from Google Fonts or self-host the files in `brand/fonts/`.

---

## 7. Layout and imagery

- Bone page, Parchment cards, 1 px `#D4D1CA` borders, 12 px radius on cards, 8 px on controls, 22% on app tiles.
- One filled Cypress Green action per view. Secondary actions are outlined or text.
- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64, 96 px.
- Photography: the property itself, daylight, straight horizons, no filters, no stock people. Property photos are the only imagery on cypresscommand.com.
- No icons of trees, leaves, or maps near the mark. Interface icons: Lucide, 1.5 px stroke, Ink or Stone.
- Charts: sequential data uses the green ramp; categorical data uses green-700, green-400, neutral-500, neutral-800. Never red/green together as the only distinction.
- Motion: 150–250 ms, ease-out, opacity and translate only. Respect `prefers-reduced-motion`.

---

## 8. Voice

- Plain, specific, first-person plural. "We" is the company. The Authorized Representative is named once, in the signature.
- State what happens, when, and who to contact. No superlatives, no exclamation points, no "excited to announce".
- Tenant-facing copy is warm and concrete. Vendor and legal copy is short and formal. Neither mentions Orange Ocean or the reason for the change.
- Capitalize the entity names exactly: Cypress Command, LLC; Belle Realty of Lafayette, LLC; On The Boulevard Shopping Center.

---

## 9. Trademark and naming caution

"Cypress" is a registered mark of Cypress.io in software classes 9 and 42 ([USPTO record](https://uspto.report/TM/97870603)), and Cypress.io markets a "Cypress AI" feature ([cypress.io/ai](https://www.cypress.io/ai)). A separate Cypress AI Inc. exists in Louisiana ([LinkedIn](https://www.linkedin.com/company/cypress-ai)). The name is defensible for a property-management operator because the goods and channels differ, but only if these guidelines hold: two words always, no "AI" suffix, no developer-tool styling, no tree silhouette. File a Louisiana state trademark for the word mark and the Ring Mark; do not expect a federal registration in Class 9 or 42.

The Louisiana Secretary of State commercial database returned no entity named "Cypress Command" as of September 1, 2026 ([SOS search](https://coraweb.sos.la.gov/CommercialSearch/CommercialSearch.aspx)); the closest is Cypress Commerce and Risk Mgmt, LLC in Merryville.

---

## 10. Signature blocks

**Email (standard)**
```
Adam Anthony Abdalla
Authorized Representative
Cypress Command, LLC
Property Manager for Belle Realty of Lafayette, LLC
101-149 Arnould Blvd., Lafayette, LA 70506
337-288-5411 · adam@cypresscommand.com · cypresscommand.com
```

**Letter (operational)**
```
Sincerely,

CYPRESS COMMAND, LLC
Property Manager for Belle Realty of Lafayette, LLC

________________________________
Adam Anthony Abdalla
Authorized Representative
```

**Belle Realty (owner) letters and notices**
```
Sincerely,

BELLE REALTY OF LAFAYETTE, LLC
By its authorized property manager, Cypress Command, LLC

________________________________
Adam Anthony Abdalla
Authorized Representative
```

**Formal / notarized execution (leases, contracts)**
```
BELLE REALTY OF LAFAYETTE, LLC

By: ________________________________
Name: Adam Anthony Abdalla
Title: Authorized Representative
By: Cypress Command, LLC, its Authorized Property Manager
```

**On The Boulevard email**
```
Adam Anthony Abdalla
Property Manager
On The Boulevard · Lafayette, Louisiana
101-149 Arnould Blvd., Lafayette, LA 70506
337-769-1554 · info@ontheblvd.com · ontheblvd.com
Managed by Cypress Command, LLC on behalf of Belle Realty of Lafayette, LLC
```

---

## 11. Do / Don't

| Do | Don't |
|---|---|
| Use the lockup files as supplied | Retype the wordmark or redraw the mark |
| One color per logo instance | Two-tone, gradient, or shadowed logos |
| Bone or Cypress Green behind the logo | Logos on photographs without the white version |
| "Cypress Command, LLC" in legal text | "Cypress", "CC", "Cypress AI" |
| Cypress Green as the only accent | Any navy, orange, or second hue |
| Manrope + Inter on screen, Times in letters | A third typeface anywhere |
| Authority line in every footer and signature | Presenting Cypress Command as the owner |
| Property photography | Stock imagery, trees, maps, founder portraits |

---

## 12. Asset inventory

```
cypress-command/
  brand/
    brand-sheet.pdf / .png / .svg      one-page visual summary
    letterhead-cypress-command.pdf     blank US Letter letterhead
    palette.json / palette.py          OKLCH ramps, tokens, contrast
    fonts/                             Manrope, Inter (variable + static)
    make_logo.py, make_sheet.py, make_letters.py   regenerate everything
    logo/                              all marks, lockups, wordmarks (SVG + PNG)
  brand-guidelines.md                  this document
  rebrand-checklist.md                 execution checklist
  notices/                             tenant and vendor notices (PDF + PNG + editable text)
```
