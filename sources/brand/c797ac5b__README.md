# Handoff: Cypress Command — Brand & Product Design System

## Overview

**Cypress Command** is a commercial real estate & property-operations brand. This handoff package contains the complete design system: brand identity (logo, wordmark, lockups), design tokens (color, type, spacing, motion), UI-kit component recreations for two products (a marketing site and a Property OS web app), and a slide-deck template system.

**Tagline:** *Systems under control. Results that last.*

**Founder / owner:** Adam Abdalla — commercial real estate operator, shopping-center owner.

**Primary surfaces in this system:**
| Product | Description |
|---|---|
| **Cypress Command marketing site** | Public site — home, portfolio, Coastal Court partner program, about, contact |
| **Cypress Command Property OS** | Web + mobile-web app for owners/managers — portfolio dashboard, lease pipeline, rent roll, maintenance, tenant CRM |
| **Slide template system** | Deck template for pitches, partner meetings, internal playbooks |

---

## About the Design Files

The files in this bundle are **design references created in HTML** — prototypes and specimen cards showing the intended visual system, layout, typography, and interactions. **They are not production code.** The developer's task is to **recreate these HTML designs in the target codebase's existing environment** — React, Vue, SwiftUI, Flutter, native web, whatever the project runs on — using its established patterns, component libraries, and conventions.

If no environment exists yet, choose the most appropriate framework for the project (Next.js + Tailwind is a natural fit for these designs; SwiftUI for iOS; Flutter for cross-platform) and implement the designs there.

**Do not** copy the HTML/JSX/CSS files verbatim into production. **Do** use them as the source of truth for tokens, layout, typography, and interaction behavior.

---

## Fidelity

**High-fidelity (hifi).** These are pixel-perfect mockups with final colors, typography, spacing, shadow systems, and interaction states. Every token in `colors_and_type.css` is production-ready. The developer should:

- Match colors exactly (hex values documented below).
- Match typography exactly (Fraunces display / Inter body / JetBrains Mono utility — all Google Fonts).
- Match the spacing scale, border radii, shadow system, and motion tokens.
- Recreate the **look** pixel-perfectly. Implementation patterns (state management, data fetching, routing) should follow the target codebase's conventions.

---

## Brand Identity

### The Mark — 04C-1 "Balanced Classic"

The primary brand mark is a **rounded C-frame** (cypress green) with a **sage inset square** floating in the counter opening. Right-facing opening. Chunky arms. This is the final selection out of a six-variant exploration (04C-1 through 04C-6).

Four variants ship as SVGs:

| Variant | Filename | Use |
|---|---|---|
| **Primary** | `assets/logos/04C_primary.svg` | Default — cypress green mark, sage inset. Use on Bone or white backgrounds. |
| **Monochrome** | `assets/logos/04C_monochrome.svg` | Single-color contexts — print, embroidery, faxable materials. |
| **Amber accent** | `assets/logos/04C_amber.svg` | High-emphasis / campaign / splash. The sage inset becomes amber. Rare — attention only. |
| **Reverse** | `assets/logos/04C_reverse.svg` | Bone mark on dark cypress. Use on dark hero sections and dark app icons. |

**Geometry (viewBox 200×200):**
- Outer frame: 160×160 at origin (20, 20), 22px outer corner radius
- Arm thickness: 46px vertical (left), 60px top, 60px bottom
- Opening: right-facing, ~40px tall, 6px inner corner radius
- Inset square: 54×54px, 4px radius, positioned at (73, 53) inside the counter

### Wordmark

"CYPRESS COMMAND" set in **Fraunces**, stacked or inline:

- **Cypress line:** Fraunces 600, 22px, letter-spacing 0.18em, `--cc-cypress-950`
- **Command line:** Fraunces 500, 15px, letter-spacing 0.26em, `--cc-fg-primary`

### Lockups

Four lockup treatments (all documented in `preview/brand_marks_lockup.html`):

1. **Stacked** — mark above stacked wordmark (primary)
2. **Inline** — mark left, single-line "CYPRESS COMMAND" right
3. **Icon only** — mark alone, sizes 48px / 32px / 24px
4. **Reverse on dark** — light mark on cypress-black surface

### Clear space & min size

- **Clear space:** reserve one x-height of the inner sage square on all sides of the mark
- **Digital minimum:** 24px (below this, use favicon crop)
- **Print minimum:** 0.5 in / 12 mm

---

## Design Tokens

All tokens live in `colors_and_type.css` with prefix `--cc-*`. Copy that file verbatim into the target codebase or translate to the target's token system (Tailwind config, CSS Modules, Styled System, etc.).

### Color — Primary Palette

| Token | Hex | Role |
|---|---|---|
| `--cc-cypress` | `#1E4D3A` | Primary structural. Text on light, dark surfaces, mark. |
| `--cc-moss` | `#2F6B4E` | Supporting green. Buttons, active states, success. |
| `--cc-amber` | `#D97706` | **Command signal.** CTAs, alerts, rule lines. **Never** as background wash. |
| `--cc-bone` | `#F3EDE0` | Warm off-white. Default page background. |
| `--cc-slate` | `#0E1F19` | Near-black cypress shadow. Deepest surfaces. |
| `--cc-sage` | `#8AA694` | Passive support. Meta text on dark, healthy indicators, inset square. |
| `--cc-bayou` | `#78522A` | Cypress-bark brown. Premium accents, ledger lines. |
| `--cc-white` | `#FFFFFF` | — |

### Color — Extended Scales

Full scales are defined in `colors_and_type.css`:

- **Cypress scale:** `--cc-cypress-050` (`#EEF4EF`) → `--cc-cypress-950` (`#0A1F16`) — 11 stops
- **Amber scale:** `--cc-amber-050` (`#FDF3E7`) → `--cc-amber-800` (`#8A4A03`) — 9 stops
- **Bone scale:** `--cc-bone-050` (`#FAF6EE`) → `--cc-bone-500` (`#786D57`) — 6 stops
- **Bayou scale:** `--cc-bayou-100` → `--cc-bayou-700` — 4 stops

### Color — Semantic

| Token | Hex | Role |
|---|---|---|
| `--cc-success` | `#2F6B4E` (moss) | Health, up trends, positive states |
| `--cc-warning` | `#D97706` (amber) | Warnings, attention |
| `--cc-danger` | `#9B3E2B` | Errors, destructive actions (deep brick, measured — not panic) |
| `--cc-info` | `#45865F` | Info messages |

### Color — Foreground & Background

**Foregrounds:**
- `--cc-fg-strong: var(--cc-cypress-950)` — headlines
- `--cc-fg-primary: var(--cc-cypress-700)` — body
- `--cc-fg-muted: #5A6B62` — meta (sage-tinted gray)
- `--cc-fg-subtle: #8A9891` — placeholder / disabled
- `--cc-fg-on-dark: var(--cc-bone-100)` — body on dark
- `--cc-fg-on-dark-strong: var(--cc-white)` — headlines on dark
- `--cc-fg-on-dark-muted: var(--cc-sage)` — meta on dark
- `--cc-fg-brand: var(--cc-amber-500)` — brand accent

**Backgrounds:**
- `--cc-bg-page: var(--cc-bone-100)` — default page
- `--cc-bg-surface: var(--cc-bone-050)` — cards
- `--cc-bg-elevated: var(--cc-white)` — elevated surfaces
- `--cc-bg-inverse: var(--cc-cypress-700)` — dark surfaces
- `--cc-bg-inverse-deep: var(--cc-cypress-900)` — deepest dark
- `--cc-bg-terminal: var(--cc-cypress-950)` — AI console / mono contexts

### Color — Borders

**Never solid gray.** All borders are cypress-tinted with alpha:

- `--cc-border-soft: rgba(30, 77, 58, 0.10)` — subtle dividers
- `--cc-border-med: rgba(30, 77, 58, 0.18)` — cards, controls
- `--cc-border-strong: rgba(30, 77, 58, 0.35)` — active/focused
- `--cc-border-on-dark: rgba(243, 237, 224, 0.12)`
- `--cc-border-on-dark-strong: rgba(243, 237, 224, 0.24)`
- `--cc-border-terminal: rgba(138, 166, 148, 0.20)`

### Typography — Families

- **Display:** `Fraunces` — Google Fonts variable, weights 400/500/600/700/800/900, `SOFT` + `opsz` axes. Local WOFF2 fallback shipped in `assets/fonts/`.
- **Sans / UI:** `Inter` — weights 300/400/500/600/700. Local WOFF2 shipped.
- **Mono:** `JetBrains Mono` — weights 400/500/600. Signature for eyebrow labels, brackets `[LEASE-042]`, code, terminal contexts. Local WOFF2 shipped.

CSS variables:
```css
--cc-font-display: "Fraunces", "Fraunces Local", Georgia, serif;
--cc-font-sans:    "Inter", "Inter Local", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
--cc-font-mono:    "JetBrains Mono", "JetBrains Mono Local", "SF Mono", ui-monospace, Menlo, monospace;
```

### Typography — Scale

| Token | Size |
|---|---|
| `--cc-text-2xs` | 11px |
| `--cc-text-xs` | 12px |
| `--cc-text-sm` | 14px |
| `--cc-text-base` | 16px |
| `--cc-text-md` | 18px |
| `--cc-text-lg` | 22px |
| `--cc-text-xl` | 28px |
| `--cc-text-2xl` | 36px |
| `--cc-text-3xl` | 48px |
| `--cc-text-4xl` | 64px |
| `--cc-text-5xl` | 88px |
| `--cc-text-6xl` | 120px |

### Typography — Semantic Classes

Defined in `colors_and_type.css` as ready-to-use classes:

- **`.cc-h1`** — Fraunces 800, `clamp(48px, 8vw, 120px)`, `SOFT 20 opsz 144`, tight tracking. **Signature move:** trailing period, often in amber (e.g. `Ground truth.`).
- **`.cc-h2`** — Fraunces 800, `clamp(36px, 4.5vw, 64px)`, `SOFT 20 opsz 96`
- **`.cc-h3`** — Fraunces 700, 36px, `SOFT 30 opsz 48`
- **`.cc-h4`** — Fraunces 600, 28px
- **`.cc-h5`** — Inter 600, 18px
- **`.cc-body`** — Inter 400, 16px, line-height 1.65
- **`.cc-body-lg`** — Inter 400, 18px
- **`.cc-body-sm`** — Inter 400, 14px, `--cc-fg-muted`
- **`.cc-meta`** — JetBrains Mono 500, 11px, uppercase, letter-spacing 0.12em
- **`.cc-pull-quote`** — Fraunces 400 italic, 28px, `SOFT 60 opsz 72`
- **`.cc-eyebrow`** — JetBrains Mono 500, 12px, uppercase, letter-spacing 0.12em, **amber color**. This is the signature bracketed label style.
- **`.cc-bracket`** — inline mono for `[LEASE-042]` style tokens

### Signature Type Treatments

Three canonical display treatments, all documented in `preview/type_display.html`:

1. **Duet** — Fraunces roman + italic mix, italic phrase in bayou brown accent. Editorial pull-quote energy.
2. **Ladder** — 76/900 → 48/700 → 30/600 → 20/italic size scale with weight + optical size shifts. Working reference for headline hierarchy.
3. **Hero on dark** — Fraunces at SOFT 100 on cypress-black, amber italic accent. Warm, premium.

### Spacing — 4pt scale

| Token | Value |
|---|---|
| `--cc-s-0` | 0 |
| `--cc-s-1` | 4px |
| `--cc-s-2` | 8px |
| `--cc-s-3` | 12px |
| `--cc-s-4` | 16px |
| `--cc-s-5` | 20px |
| `--cc-s-6` | 24px |
| `--cc-s-8` | 32px |
| `--cc-s-10` | 40px |
| `--cc-s-12` | 48px |
| `--cc-s-16` | 64px |
| `--cc-s-20` | 80px |
| `--cc-s-24` | 96px |
| `--cc-s-32` | 128px |

**Section rhythm:** 96–128px vertical padding between major sections; 48px between sub-sections. Editorial pacing, not dense.

### Radii — Sharp editorial default

| Token | Value | Use |
|---|---|---|
| `--cc-r-none` | 0 | Rule lines, banners |
| `--cc-r-xs` | 2px | Inline chips |
| `--cc-r-sm` | 4px | Small badges |
| `--cc-r-md` | 6px | **Buttons, inputs** |
| `--cc-r-lg` | 10px | **Cards** |
| `--cc-r-xl` | 16px | Prominent panels, modals |
| `--cc-r-full` | 9999px | Pill badges, toggles only — **never** pill-shaped cards |

**Rule:** Never rounded-corner cards with a colored left-border-only accent. That's a design cliché this brand doesn't ship.

### Shadows — Cypress-tinted, no cool gray

```css
--cc-shadow-xs:    0 1px 2px rgba(14, 31, 25, 0.06);
--cc-shadow-sm:    0 2px 6px rgba(14, 31, 25, 0.08);
--cc-shadow-md:    0 8px 20px -6px rgba(14, 31, 25, 0.12);
--cc-shadow-lg:    0 18px 40px -12px rgba(14, 31, 25, 0.22);
--cc-shadow-xl:    0 32px 60px -20px rgba(14, 31, 25, 0.32);
--cc-shadow-inset: inset 0 1px 0 rgba(255, 255, 255, 0.06);
--cc-shadow-amber: 0 2px 8px rgba(217, 119, 6, 0.24);
```

### Motion — Cypress patience, not spring bounce

```css
--cc-ease-out:   cubic-bezier(0.22, 0.61, 0.36, 1);
--cc-ease-in:    cubic-bezier(0.55, 0.06, 0.68, 0.19);
--cc-ease-inout: cubic-bezier(0.65, 0, 0.35, 1);
--cc-dur-fast:   140ms;
--cc-dur-med:    240ms;
--cc-dur-slow:   420ms;
```

**Motion vocabulary:** cross-fade, subtle upward drift (8–12px), scale 0.98 → 1 on entry. **Never** rotate, flip, spring, or bounce.

### Layout

- **Container:** 1240px max on standard pages, 1440px on portfolio/gallery
- **Gutter:** 32px desktop, 20px tablet, 16px mobile
- **Grid:** 12 columns desktop, 8 tablet, 4 mobile

---

## Interaction States

### Buttons

- **Primary:** amber background (`--cc-amber-500`), white text, 6px radius, no shadow.
  - Hover: darken to `--cc-amber-600`. No scale, no shadow lift.
  - Press: darken to `--cc-amber-800`. No scale.
  - Focus: 2px `--cc-amber-500` outline offset 2px. Never `outline: none`.
  - Disabled: 40% opacity, `cursor: not-allowed`.

- **Secondary:** transparent background, 1px `--cc-border-strong` border, cypress text.
  - Hover: background fills to `--cc-cypress-050` (light bg) or `--cc-border-on-dark` (dark bg).
  - Press: darken one step.

- **Ghost / tertiary:** transparent, no border, cypress text.
  - Hover: same fill as secondary hover.

### Links

- Underline appears on hover (offset 2px, amber). **No color change.**

### Inputs

- Flat, 1px `--cc-border-med` border, no inner shadow.
- Focus: border becomes `--cc-amber-500`.
- Error: border becomes `--cc-danger`.

### Cards

- White (`--cc-bg-elevated`) on Bone page.
- `1px solid var(--cc-border-soft)` border.
- `--cc-r-lg` (10px) radius.
- `--cc-shadow-sm` shadow.
- 24px inner padding minimum.
- **No** colored top-bar or left-bar accent.

### Header on scroll

- `background: rgba(14, 31, 25, 0.85); backdrop-filter: blur(12px);`
- Sticky, translucent once scrolled past hero.

### Modal scrim

- `rgba(14, 31, 25, 0.55)`

---

## Screens / Views

The design system contains recreations of two products. Each has an `index.html` demonstrating a typical view.

### 1. Marketing site (`ui_kits/marketing_site/index.html`)

**Purpose:** Public-facing marketing site.

**Sections included:**
- **Sticky header** — logo left, nav center (Portfolio / Coastal Court / About / Contact), CTA right. Translucent + backdrop-blur on scroll.
- **Hero** — full-bleed dusk photography with bottom-up protection gradient. `.cc-h1` headline with amber trailing period. Eyebrow label. Two CTAs (primary amber + ghost).
- **Portfolio grid** — 3-column card grid, each card is a property with photograph + address + KPIs.
- **Coastal Court** — the partner/merchant program section. Dark cypress background with subtle pattern overlay.
- **About / operator bio** — two-column, portrait left, editorial copy right with pull quote.
- **Footer** — dark cypress with pattern overlay, four-column link grid, copyright + legal.

**Copy tone:** operator-first, precise, warm. See "Voice" section below.

### 2. Property OS (`ui_kits/property_app/index.html`)

**Purpose:** Web app for property owners/managers.

**Screens included** (in `Screens.jsx`):
- **Portfolio Dashboard** — sidebar nav, top bar, KPI row (occupancy / NOI / delinquency / pipeline), map view, property card grid.
- **Lease Pipeline** — kanban board with stages: Prospect → Tour → LOI → Draft → Signed.
- **Rent Roll** — dense table with property × unit × tenant × rent × status × next-review columns. Sortable, filterable header.
- **Maintenance** — work-order queue with priority chips (amber = urgent), assignee avatars, SLA timers.
- **Tenant CRM** — tenant list left, tenant detail right with communication timeline.

**Chrome:**
- **Sidebar** — 240px wide, cypress background, sage nav labels, amber active-item indicator (4px left bar).
- **Top bar** — 56px tall, bone background, breadcrumb left, search center, user avatar right.

### 3. Slide template system (`slides/index.html`)

Deck-stage runner (single-file, all slides in one HTML). Slide types:
- **Title slide** — dark cypress bleed, huge Fraunces headline with amber period, mono subtitle.
- **Section slide** — number-prefixed section label, Fraunces headline.
- **Data slide** — big number left, editorial context right.
- **Quote slide** — Fraunces italic pull quote, attribution in mono.
- **Image bleed** — full-bleed photograph with protection gradient + overlaid title.
- **Team slide** — grid of portraits with role labels.
- **Closing slide** — cypress dark, tagline "Systems under control. Results that last."

---

## Content Fundamentals — Voice & Copy

The brand voice is **operator-first, not consultant-speak.** Follow these rules verbatim.

### Voice pillars

1. **Earned, not performed.** The buildings, tenants, and numbers speak. We don't tell you we're serious.
2. **Confident, not loud.** Say it once, say it precisely, let the work carry the weight.
3. **Operator-first, not consultant-speak.** We've signed the leases. Words like *leverage*, *synergy*, *disrupt* don't belong. Words like *lease*, *close*, *ledger*, *walk the site* do.
4. **Precise, not clinical.** Numbers are exact. Language is warm.

### Casing rules

- **All-caps** with letter-spacing 0.12–0.18em for section labels, nav, and eyebrow tags (`01 — FOUNDATION`, `[LEASE-042]`, `PORTFOLIO`).
- **Title Case** for display headlines set in Fraunces (`Ground Truth. Delivered.`).
- **Sentence case** for body copy, form labels, and secondary UI.
- **Trailing period** on display headlines is a signature move (`Ground truth.`, `Delivered.`) — often in amber.

### Person

- Prefer **"we"** in brand voice, **"you"** when addressing a partner/tenant/customer. Avoid "I."
- **Contractions are fine.**
- **No emoji.** Not in product, not in marketing, not anywhere. Hard-line.
- Unicode punctuation only: em dash `—`, en dash `–`, curly quotes `"" ''`, ellipsis `…`.

### Copy examples

✅ `"Ground truth. Delivered."`
✅ `"94.2% occupancy across the portfolio — audited monthly, published quarterly."`
✅ `"Every acre. Every lease."`
✅ `"The operating system for real-world businesses."`

❌ `"Experience next-gen property management!"`
❌ `"Leverage our synergistic operating platform to unlock value."`
❌ `"🌊 Vibes only 🌅"`

### Numbers and precision

- Percentages: one decimal when precision matters (`94.2%`); whole numbers when it doesn't (`Roughly 90%`).
- Currency: `$1.2M` and `$450K` for headlines; `$1,240,000` for legal/ledger.
- Dates: `Jan 2024`, `Q3 2025`, `July 26, 2026` — no ordinals, no all-caps months.

### Bracket tag signature

`[LEASE-042]` / `[UNIT-B12]` / `[FOUNDATION-01]` mono bracket tags are a signature UI pattern. Use `.cc-bracket` class. They appear on cards, list items, and section labels to give the brand a "ledger" feel.

---

## Iconography

Custom SVG symbol set at `assets/icons/icons.svg` (22 symbols, 24×24 viewbox, 1.75 stroke, round joins). Reference via `<use href="icons.svg#i-lease">`.

**Icon vocabulary:** `i-building`, `i-storefront`, `i-lease`, `i-key`, `i-tenant`, `i-dollar`, `i-ledger`, `i-map`, `i-wrench`, `i-clipboard`, `i-signature`, `i-cypress`, `i-search`, `i-filter`, etc.

**No emoji anywhere.** No decorative unicode either — the mono bracket tags carry that role.

If the target codebase already has an icon system (Lucide, Heroicons, Phosphor), match stroke weight (1.75) and round joins as closely as possible when substituting.

---

## Imagery Direction

Full-bleed campaign photography for hero sections. Six ready-to-use photos in `assets/photography/`:

- `aerial_portfolio.jpg` — aerial shot of shopping center at dusk
- `boardroom_dusk.jpg` — interior, warm dusk lighting
- `cypress_grove_blue_hour.jpg` — landscape, cypress grove at blue hour
- `ledger_and_keys.jpg` — close-up product still life
- `operator_walking_site.jpg` — operator walking a property
- `shopping_center_dusk.jpg` — exterior shopping center at dusk

**Direction:** Golden hour and blue hour lighting. Cypress, magnolia, live oak, historic downtown, shopping-center exteriors. Warm shadows, desaturated highlights, slight film grain. No harsh midday sun. No stock. No palm trees.

**Protection gradient over full-bleed photography** for type legibility:
```css
background: linear-gradient(to top, rgba(14, 31, 25, 0.85), transparent 60%);
```

This is the **only** gradient allowed as decorative wash. No gradient backgrounds otherwise.

---

## Patterns

Four decorative pattern crops in `assets/patterns/`, plus a tile-able `pattern_tile.svg` for background use at 8–12% opacity behind dark hero/footer sections:

- `pattern_a_topo.svg/jpg` — topographic-line pattern
- `pattern_b_bracket.svg/jpg` — bracket motif
- `pattern_c_grove.svg/jpg` — cypress-grove silhouette
- `pattern_d_ledger.svg/jpg` — ledger grid

---

## Assets

All source assets shipped in this handoff bundle under `assets/`:

### Logos (`assets/logos/`)
- `04C_primary.svg` — the mark, primary
- `04C_monochrome.svg` — single-color
- `04C_amber.svg` — amber accent
- `04C_reverse.svg` — on dark

### Fonts (`assets/fonts/`) — WOFF2 local fallbacks
- `Fraunces-400.woff2`, `Fraunces-600.woff2`, `Fraunces-800.woff2`
- `Inter-400.woff2`, `Inter-500.woff2`, `Inter-600.woff2`, `Inter-700.woff2`
- `JetBrainsMono-400.woff2`

Google Fonts CDN import is included in `colors_and_type.css` for full weight/axis coverage; local WOFF2 files are declared as fallback via `@font-face`.

### Icons
- `assets/icons/icons.svg` — 22-symbol sprite

### Photography (`assets/photography/`)
Six generated campaign photos (see Imagery Direction above). Not shipped in this bundle to keep size manageable — copy from the source project or regenerate.

### Patterns (`assets/patterns/`)
Four pattern crops + one tile SVG.

---

## Files in This Handoff

| File | Purpose |
|---|---|
| `README.md` | This document |
| `colors_and_type.css` | **Token file** — copy verbatim into target codebase |
| `assets/logos/04C_*.svg` | The four logo variants |
| `preview/brand_marks.html` | Logo system reference — four variants |
| `preview/brand_marks_lockup.html` | Lockup variations — stacked, inline, icon-only, reverse |
| `preview/brand_marks_clearspace.html` | Clear space + min size documentation |
| `preview/brand_app_icons.html` | App icon treatments |
| `preview/type_display.html` | Display type specimen — three canonical treatments |
| `preview/type_body.html` | Body type specimen |
| `preview/type_mono.html` | Mono type specimen (bracket system, ledger lines) |
| `preview/type_scale.html` | Full type scale reference |
| `preview/colors_*.html` | Color scale specimens |
| `preview/buttons.html` | Button component states |
| `preview/badges.html` | Badge / chip component variants |
| `preview/card.html` | Card component |
| `preview/terminal.html` | Terminal / mono context |
| `preview/radii.html` | Radius scale |
| `preview/shadows.html` | Shadow scale |
| `preview/spacing_scale.html` | Spacing scale |
| `ui_kits/marketing_site/index.html` | Marketing site prototype |
| `ui_kits/marketing_site/README.md` | Marketing site notes |
| `ui_kits/property_app/index.html` | Property OS prototype |
| `ui_kits/property_app/Screens.jsx` | Property OS screen components |
| `ui_kits/property_app/README.md` | Property OS notes |
| `slides/index.html` | Slide deck template runner |
| `components/Atoms.jsx` | Atoms (buttons, badges, inputs) |
| `components/Chrome.jsx` | Chrome (header, footer, sidebar) |
| `components/Data.jsx` | Data components (tables, KPIs) |
| `components/Sections.jsx` | Marketing sections (hero, feature blocks) |
| `STYLE_GUIDE.md` | Voice, tone, and copy examples |

---

## Implementation Checklist

For the developer picking this up:

- [ ] Set up target framework (Next.js + Tailwind recommended for web; SwiftUI for iOS; Flutter for cross-platform)
- [ ] Translate `colors_and_type.css` into target token system (Tailwind config, Design Tokens, CSS Modules, etc.)
- [ ] Load Fraunces + Inter + JetBrains Mono from Google Fonts, with local WOFF2 fallback
- [ ] Import the four 04C logo SVGs as reusable Logo components with a `variant` prop
- [ ] Build the semantic type classes (`.cc-h1` through `.cc-body-sm`, `.cc-eyebrow`, `.cc-bracket`) as reusable typography components
- [ ] Build Button component with primary / secondary / ghost variants + all interaction states
- [ ] Build Card, Input, Badge components matching the specimens
- [ ] Recreate the marketing site sections (Header, Hero, Portfolio, Coastal Court, About, Footer)
- [ ] Recreate the Property OS screens (Dashboard, Pipeline, Rent Roll, Maintenance, CRM)
- [ ] Match interaction states pixel-perfectly (hover, focus, press, disabled)
- [ ] Wire motion tokens (`--cc-dur-*`, `--cc-ease-*`) — no bounces, no spring, no rotation
- [ ] Enforce copy tone via editorial review — no emoji, no consultant-speak, use unicode punctuation

---

## Questions the Developer May Have

**Q: Can I substitute a different font?**
A: Fraunces and Inter are chosen deliberately. Fraunces gives the mark its editorial character; Inter is the UI workhorse. Don't substitute without checking with the design owner.

**Q: The logo has variable proportions in different variants — is that intentional?**
A: The four variants (primary, monochrome, amber, reverse) share **identical geometry**. Only the fill colors change. If you see proportion differences, that's a rendering artifact — trust the SVG.

**Q: Do I need to ship all four logo variants in production?**
A: Ship primary + reverse at minimum. Monochrome for print/embroidery. Amber only when specifically directed by the brand owner.

**Q: The trailing-period-in-amber signature — is that everywhere?**
A: Only on display headlines (`.cc-h1`, `.cc-h2`). Not on body copy, not on labels. It's a signature, not a rule.

**Q: What about dark mode?**
A: The system has a full inverse palette (`--cc-bg-inverse`, `--cc-fg-on-dark-*`). Dark mode = swap page background to `--cc-cypress-950` and swap foregrounds. Amber CTA remains amber in both modes.

---

## Contact

For design questions, ping Adam. For handoff clarifications, this document is the source of truth — if it's not documented here, ask before improvising.
