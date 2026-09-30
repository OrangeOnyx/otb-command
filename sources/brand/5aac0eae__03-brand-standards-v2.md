# Cypress Command — Brand Standards 2.0
**Status:** FINAL · **Effective:** 22 September 2026 · **Supersedes:** Brand Standards 1.0 (6 Sept 2026) · **Companion files:** `design-system/` · **PDF:** `Cypress-Command-Brand-Standards-2.0.pdf`

One system. Many applications. Ink on paper for everything; Cypress Green as the one master-brand surface; Terra as the one master-brand accent; Olive, Mustard, Oxblood as semantic signals only.

---

## 1. The mark

**The 04C mark.** A closed rounded-square frame (corner radius 10 % of width, frame thickness 22 %) with a short notch cut through the right wall (19 % of height, centered) and a solid core (32 %) inset in the counter. It reads as a C, a command bracket, and a cypress knee in plan. Vector geometry in `design-system/logo/`, measured from the approved artwork. Always one flat fill; the color follows context.

**Colorways.** The mark is monochrome and takes any single palette token. Choose by surface and job, not by habit:

| Context | Fill | Ground |
|---|---|---|
| Documents, navigation, footer | Ink | Paper |
| Bylines, covers, avatars, marketing accents | Terra | Paper / Paper Deep |
| Night surfaces, Cypress surfaces, photography panels | Paper | Night Paper / Cypress / Ink |
| Status or level contexts (Playbook, Platform badges) | Olive · Mustard | Paper, when the mark labels that state |
| Corporate dark presentations | Cypress | Paper (as a dark-on-light alternate) |
| Playbook | Ink · Terra · Paper only | per Playbook kit; never Cypress |

Rules: one color per instance, never two-tone, never a gradient; the fill must clear 4.5:1 against its ground (3:1 at ≥40 px); Oxblood is excluded because it means "do not". `cc-mark.svg` and `cc-lockup-h-current.svg` use `currentColor` and inherit from CSS; the named-fill files are presets, not the limit.

**Lockups.** Horizontal (mark · thin vertical rule · two-line wordmark "CYPRESS / COMMAND") is default. Stacked for square and narrow contexts. Wordmark is Archivo 800, uppercase, letter-spacing 0.04em, two lines, set flush-left to the mark's core.

**Clear space.** Minimum clear space = the frame thickness (22 % of mark width) on all sides. Minimum size: mark 20 px / 6 mm; horizontal lockup 120 px / 32 mm.

**Never.** Rotate. Add gradients, shadows, glows, outlines. Use two colors in one instance. Set on Orange Ocean blue/orange. Place on photography without a Paper or Cypress panel behind it. Stretch. Pair with a second symbol.

**Sub-brand attribution.** "The AI Playbook *by Cypress Command*" uses the mark recolored into the Playbook palette (ink in nav, terra deep in byline, paper on night). Cypress Green never appears in the Playbook.

---

## 2. Color

### 2.1 Core palette (Day)

| Token | Hex | Role |
|---|---|---|
| Paper | `#F4EFE2` | Page background |
| Paper Deep | `#EAE2CD` | Plates, blockquotes, card heads, one full-bleed band |
| Ink | `#1E1B16` | Text, strokes, code blocks, primary buttons |
| Ink Soft | `#5C554A` | Secondary text, captions, mono sublabels, inactive tabs |
| Rule | `#C9BFA8` | Hairlines, table rows, dividers, TOC spine |
| **Cypress** | `#1E4D3A` | **Master-brand surface only**: dark hero panels, presentation slides, cover bands. Never text. Never in the Playbook. |

### 2.2 Semantic accents (Day)

| Token | Hex | Meaning | Use |
|---|---|---|---|
| **Terra** | `#A44E12` | Primary / structural | Eyebrows, active nav, links, byline mark, primary CTA, chapter accents |
| Olive | `#49573C` | Success / complete / "go" | Status Complete, positive state, Starter level |
| Mustard | `#8F6D0C` | In progress / attention | Status In Progress, warnings, Intermediate level |
| Oxblood | `#8A2F1F` | Critical / blocked / refusal | Status Critical, "do not," risk ink only. Never emphasis, never a level. |

Light tints exist as tokens but are not used as fills: Terra light `#C7681D`, Mustard light `#D9A419`, Olive light `#5A6B4A`. Wash tints for chips and card heads come from the deep tones at 8–16 % opacity.

### 2.3 Night values

Night inverts paper and ink and lifts the four accents to their night values. Hierarchy and roles do not change.

| Token | Day | Night |
|---|---|---|
| Paper | #F4EFE2 | #1B1813 |
| Paper Deep | #EAE2CD | #26221B |
| Ink | #1E1B16 | #F4EFE2 |
| Ink Soft | #5C554A | #BEB4A2 |
| Rule | #C9BFA8 | #4E463A |
| Cypress | #1E4D3A | #163A2C |
| Terra | #A44E12 | #D2802F |
| Olive | #49573C | #9AA989 |
| Mustard | #8F6D0C | #CFA032 |
| Oxblood | #8A2F1F | #D27363 |

### 2.4 Color rules

1. Color is never decoration. Every colored element answers to a role, a state, a level, a chapter, or a risk.
2. Terra is the only page-level accent. Inside a Playbook chapter, the chapter ink takes over structure.
3. Never more than one accent ink in view at once; Oxblood may join any of them as risk.
4. Oxblood means "do not." It never marks importance or emphasis.
5. Cypress is a surface. Text on Cypress is Paper; the mark on Cypress is Paper; accent on Cypress is Terra at night value (#D2802F).
6. Paper Deep is a surface, not a color. Objects inside a band return to Paper.
7. No shadows. No rounded corners above 2 px on documents; 4 px maximum in product UI. Hairlines carry structure.
8. Orange Ocean blue/orange, Moss, Amber, Charcoal, Bone are retired and must not appear.

### 2.5 Contrast (measured — full table in `06-verification-report.md`)

Day, on Paper: Ink 14.95:1 · Ink Soft 6.41:1 · Terra 4.97:1 · Olive 6.75:1 · Oxblood 7.30:1 · Mustard 4.19:1. Paper on Cypress 8.40:1.
Night, on Paper: Ink 15.41:1 · Ink Soft 8.63:1 · Terra 5.79:1 · Olive 7.09:1 · Mustard 7.35:1 · Oxblood 5.37:1. Paper on Cypress 10.92:1.

Usage limits that follow from the numbers:
- **Mustard (day)** is large-text only: ≥18 px regular or ≥14 px bold. Never body copy.
- **Terra on Paper Deep (day, 4.42:1)** is fine for eyebrows, links ≥14 px bold, buttons, and rules; body-size Terra text sits on Paper, not Paper Deep.
- **Terra on Cypress (3.15:1 day / 4.10:1 night)** is for rules, eyebrows, and numerals — never running text. Text on Cypress is Paper.
- Everything else passes WCAG AA for normal text in both themes.

---

## 3. Typography

| Role | Face | Weights | Use |
|---|---|---|---|
| Display / Editorial | **Besley** | 700, 900 (italic 400 for pull quotes) | Headlines, cover titles, chapter numerals, pull quotes |
| Functional | **Archivo** | 400, 500, 700, 800 | Body in product, UI, labels, navigation, tags, buttons, wordmark |
| Technical | **Courier Prime** | 400, 700 | Code, file names, IDs, metadata, plate sublabels |

**Document body** (long-form, print, Playbook): Besley 400 at 17 px / 1.55. **Product body:** Archivo 400 at 15–16 px / 1.5.

**Scale (px / line-height).** Display 56/60 · H1 40/44 · H2 28/32 · H3 20/26 · Body 15–17 · Caption 12/16 · Label 11–12/14, uppercase, tracked 0.08–0.14em.

**Rules.** Headlines tight (−0.02em). Eyebrows are Archivo 700 uppercase Terra. Numerals in Besley 900 for chapter/figure/card numbers. Mono only for technical content, never for emphasis. Loading: Google Fonts, `display=swap`; self-host for print/PDF.

---

## 4. Layout and spacing

- **Grid.** 12 columns, 24 px gutter desktop; 4 columns, 16 px gutter phone. Max content width 1200 px; long-form measure 68–72 characters.
- **Spacing scale.** 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96.
- **Rules.** 1 px Rule hairlines separate sections. A 3 px accent top-rule declares a plate's ink. Section headers: numeral + label + right-aligned kicker on one baseline.
- **Radius.** 0–2 px documents; 4 px UI controls; 6 px only for the mark's own corners.
- **Imagery.** Real places, real people, real progress. Muted, natural, daylight. Editorial line illustration for diagrams (single-weight ink strokes, Terra annotations). No stock "AI" imagery, no gradients, no 3D renders presented as photography.

---

## 5. Components (spec — implementation in `components.css`)

| Component | Spec |
|---|---|
| Primary button | Ink fill, Paper text, Archivo 700 14 px, 12×20 padding, radius 4 (docs: 2). Terra fill variant for marketing CTAs only. |
| Secondary button | Paper fill, 1 px Ink border, Ink text. |
| Tertiary | Text-only, Terra, underline on hover. |
| Tag / status | 1 px border in state color, state text, 8 % wash fill. Active=Olive, Attention=Mustard, Critical=Oxblood, Info=Ink Soft. |
| Card | Paper fill, 1 px Rule border, optional 3 px top rule in accent; head band in Paper Deep. |
| Table | Header row Ink Soft uppercase labels, hairline rows, first column Archivo 500. Night: header on Paper Deep night. |
| Input | Paper fill, 1 px Rule border, focus ring 2 px Terra. |
| Plate / figure | Frame with 3 px top rule in the plate ink; `PLATE NN · INK` label Courier Prime; `Fig. NN` caption Besley 900. |
| Navigation | Left rail in product (icon + label, active = Terra text + Paper Deep fill); top bar on marketing (lockup left, CTA right). |
| Level chips (Playbook) | Starter Olive · Intermediate Mustard · Expert Terra · Frontier Operator Ink. |
| Alert | Paper Deep fill, 1 px left rule in state color. Critical alerts use Oxblood. |

---

## 6. Brand expressions (four modes, one system)

| Mode | Where | Signature |
|---|---|---|
| **A · Editorial** | Brand, web, proposals | Besley display on Paper, Terra eyebrow, generous whitespace |
| **B · Technical** | Diagrams, SOPs, systems | Archivo labels, hairline frames, Courier Prime IDs, numbered flow |
| **C · Archival** | Thought leadership, research | Besley body, pull quotes, field-note plates on Paper Deep |
| **D · Digital** | Product UI, dashboards, Command Platform | Archivo throughout, left rail, status tags, Night default optional |

---

## 7. Applications

- **Website hero.** Paper background, Besley 900 headline, one Terra primary CTA + one secondary, photograph in a hairline-framed panel, four numbered steps beneath (Strategize · Design · Install · Operate).
- **Proposal / report cover.** Paper page, Terra left band (12 mm), lockup top-left, "PROPOSAL" eyebrow, Besley title, descriptor, photograph panel, prepared-for / prepared-by footer.
- **Presentation.** Cypress surface title slides with Paper text and Terra rule; content slides on Paper. Confidential tag Courier Prime top-right.
- **Letterhead.** Lockup top-left, Courier Prime address block top-right, footer stripe olive/mustard/terra/ink in equal segments.
- **Email signature.** Name Archivo 700, title Ink Soft, lockup 120 px, one Terra link.
- **Property materials (Belle Realty / OTB).** Client brand leads; "Property operations by Cypress Command" footer line in Archivo 500 11 px.
- **Playbook.** Follows the Playbook Brand Kit rev. 2 — same tokens, chapter inks, level inks, Oxblood risk ink; Cypress Green excluded by rule.

---

## 8. Accessibility

WCAG 2.2 AA minimum on all text pairs (verified). Focus rings 2 px Terra, never removed. Color never the sole carrier of state — every tag has a text label. Reduced-motion: no motion beyond 150 ms opacity/position transitions anyway. Minimum tap target 40 px in product.

---

## 9. Governance of the system

- `design-system/tokens.css` is the single source of truth for color and type. Figma, Tailwind, print, and the Playbook consume it; nothing forks it.
- Changes require a version bump here, a changelog line, and re-running the contrast check.
- Any new sub-brand gets a *scope* (`[data-brand="playbook"]`) that remaps roles, never a new palette.
- The Codex `AGENTS.md` brand section (`04-application-kit.md §7`) is the enforcement copy for automated builds.
