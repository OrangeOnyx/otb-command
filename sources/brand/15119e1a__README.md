# Cypress Command — Design System

**Cypress Command** brings order, intelligence, and leverage to real-world businesses. It sits at the intersection of commercial real estate operations, AI systems and automation, and legal-grade risk and governance discipline.

The brand sounds and looks like an **experienced operator** — someone who has signed the leases, walked the sites, negotiated with tenants, litigated the disputes, and now runs all of it with software. Not a marketing agency, not a consultancy, not an experimental AI lab. A serious operator with a serious system.

> **Founder:** Adam Abdalla — attorney turned commercial real estate operator, shopping-center owner. Lafayette, Louisiana.
>
> **Positioning:** The operating system for real-world businesses.
>
> **Tagline:** Ground truth. Delivered.

This is the **rebrand and successor to Orange Ocean.** The operator DNA, structural discipline, and product architecture carry over. The name, mark, palette, type triplet, photography direction, and voice have been rebuilt from the ground up to sit at the intersection stated above — not the coastal-editorial lane Orange Ocean occupied.

---

## Products in this system

| Product | Surface | UI kit |
|---|---|---|
| **Cypress Command Property OS** | Web app used by owners/operators day-to-day. Dashboard, portfolio, leases, maintenance, tenants, **AI Console**. | `ui_kits/property_app/` |
| **Cypress Command marketing site** | Public site: hero, positioning, how it works, The Grove partner program, contact. | `ui_kits/marketing_site/` |
| **Slide template system** | 7-slide deck template for investor briefings, partner pitches, internal playbooks. | `slides/` |

The **AI Console** inside Property OS is the differentiating surface — a Cursor-style command terminal for the operator to talk to agents ("Reconcile Kaliste Court for August," "Show me every lease expiring in Q4"), watch them work on the portfolio, and audit every action they take.

---

## Sources

The Cypress Command app icon (`assets/logos/app_icon_source.png`) was provided by the founder as the starting mark. Everything else — logos, palette, patterns, photography, voice — was built for this system.

Structural conventions were forked from the **Orange Ocean design system** (`/projects/6a8440b2-873f-4418-b267-f462e759a546/`) — same folder shape, same tokens architecture, same component structure. Contents rebuilt.

---

## Index

Root:
- `README.md` — this document
- `SKILL.md` — makes the design system attachable to other projects
- `STYLE_GUIDE.md` — quick reference for signature patterns (bracket eyebrows, trailing periods, ledger lines)
- `colors_and_type.css` — tokens + semantic type/color CSS variables
- `thumbnail.png` — cover image for the design-system picker

Assets (`assets/`):
- `logos/` — 5 lockup variants (Grove, Contour, Bracket, Standard, Ledger) as SVG + PNG; app-icon strip
- `patterns/` — 4 pattern variants (Topo, Bracket grid, Grove, Ledger) + `pattern_tile.svg` for CSS backgrounds
- `photography/` — 6 editorial images (cypress grove blue hour, shopping center dusk, operator walking site, aerial portfolio, ledger + keys, boardroom dusk)
- `fonts/` — Fraunces (display) + Inter (body) + JetBrains Mono (systems) woff2 Latin subsets
- `icons/icons.svg` — 22 property-focused SVG symbols (24px viewbox, 1.75 stroke)

Components (`components/`):
- `Atoms.jsx` — Icon, Button, Badge, Stat, Eyebrow, BracketTag, LedgerLine, TerminalPrompt, LogoMark, CypressMark, Divider
- `Chrome.jsx` — Sidebar (Property OS), TopBar, MarketingHeader, MarketingFooter
- `Data.jsx` — Card, StatCard, MiniChart, BarChart, PropertyCard, LeaseRow, AgentCard, TerminalWindow, MaintenanceCard, TenantCard
- `Sections.jsx` — Hero, PositioningTriangle, HowItWorks, GroveSection, TrustBar, ClosingBanner

UI kits (`ui_kits/`):
- `property_app/` — Dashboard + Leases + Maintenance + Tenants + **AI Console**
- `marketing_site/` — single-page marketing scroll

Slides (`slides/`):
- `index.html` — deck runner (all 7 slides in one file, wired to `deck_stage.js`)

Preview cards (`preview/`):
- 27 small HTML cards for the Design System tab — palette, type, spacing, components, brand marks, patterns, photography, voice

---

## Content fundamentals

### Voice pillars

1. **Earned, not performed.** We don't claim the discipline. The ledger, the audit trail, and the tenants prove it.
2. **Commanding, not loud.** Serious operators don't shout. Say it once. Say it precisely. Let the numbers close the argument.
3. **Precise to the entry.** Every percentage carries a decimal when it matters. Every date. Every dollar. Every signature. `94.2%`, not "high." `$142,340`, not "about a hundred and forty."
4. **Operator-first, not consultant-speak.** We've signed the leases. Words like *leverage*, *synergy*, *unlock*, *disrupt* don't belong here. Words like *lease*, *close*, *ledger*, *walk the site*, *reconcile* do.
5. **Rooted, not regional.** Louisiana is in the fibers. The Bayou pattern is under the surface, not on top of it. Cypress Command serves operators wherever they are; it comes from Lafayette because that's where the founder walks his sites.

### Casing rules

- **Bracket labels** in `[UPPERCASE MONO]` with `--cc-track-bracket` letter-spacing (0.12em) for section eyebrows and case-file tags. This is the strongest visual signature in the brand.
- **Title Case** for display headlines set in Fraunces (`Ground truth.`, `Command surface.`, `Precision to the entry.`).
- **Sentence case** for body copy, form labels, secondary UI.
- **Trailing amber period** on display headlines. Every one. This is signature, not decoration.

### Person

- **"We"** for the brand's voice, **"you"** for the operator/partner/customer. Never "I."
- **Contractions are fine.** We speak plainly, not stiffly.
- **No emoji.** Not in product, not in marketing, not in ads. Hard line.
- Unicode punctuation only: em dash `—`, en dash `–`, curly quotes `""`, ellipsis `…`, middot `·`.

### Copy examples

✅ "Ground truth. Delivered."
✅ "94.2% occupancy — audited monthly, published quarterly."
✅ "Signed. Filed. Closed."
✅ "Ledger updated. 14:32 CT."
✅ "The list of what's broken."
✅ "You cannot delegate what you do not measure."

❌ "Experience seamless property management!"
❌ "Leverage our AI-powered operating platform to unlock unprecedented value."
❌ "🚀 Amazing new AI features you NEED to try!"
❌ "Roughly 94% occupancy" (be exact, always)
❌ "Let us know what you think!"

### Numbers

- Percentages: one decimal when precision matters (`94.2%`), whole when it doesn't (`Roughly 90%` — but only when literally an estimate).
- Currency: `$1.2M` and `$450K` for headlines; `$1,240,000` for legal, ledger, and audit contexts.
- Dates: `Jan 2024`, `Q3 2025`, `July 26, 2026` — no ordinals, no all-caps months in body copy. All-caps mono is fine in eyebrows: `[Q3 2026]`.

---

## Visual foundations

### Color

Six brand primaries, extended into full Cypress / Amber / Bone scales. See `colors_and_type.css` for hex + token names.

| Name | Hex | Use |
|---|---|---|
| **Cypress** | `#1E4D3A` | Primary structural. Chrome, text on light, dark surfaces. |
| **Command Amber** | `#D97706` | Signal accent. CTAs, alerts, trailing periods. **Never** as a background wash. |
| **Bone** | `#F3EDE0` | Warm off-white. Default page background. |
| **Slate** | `#0E1F19` | Near-black cypress shadow. Terminal, deep hero, footer. |
| **Sage** | `#8AA694` | Passive support. Meta text on dark, healthy indicators. |
| **Bayou** | `#78522A` | Cypress-bark brown. Premium accents, ledger touches. |
| **Moss** | `#2F6B4E` | Support green. Buttons, active states, success. |

Color rule: **Cypress is the spine. Amber is the signal. Everything else supports.** Amber is used sparingly — a period, a CTA, a rule line, one eyebrow per section. Once you saturate amber, it stops signaling.

### Type

- **Display:** Fraunces (variable, weights 400/600/700/800/900, `font-variation-settings: "SOFT" 20, "opsz" 96` for headlines and `"SOFT" 60, "opsz" 144` for italic emphasis). Ranges 18px to 132px. Never below 18px. The trailing amber period is a signature.
- **Body / UI:** Inter (300/400/500/600/700). Letter-spaced 0.10em for all-caps labels.
- **Systems / Mono:** **JetBrains Mono** (400/500/600) — this is a real shift and a deliberate signal. Mono says "this is a system, not a website." Use it for:
  - Bracket eyebrows: `[01 — POSITIONING]`
  - Case-file tags: `[LEASE-042]`, `[WO-2081]`
  - Meta labels: `LEDGER UPDATED · 14:32 CT`
  - Terminal output: `▸ Reconcile Kaliste Court…`
  - Stat labels above big numbers

### Backgrounds

- **Default page:** `--cc-bg-page` (Bone).
- **Dark hero / footer / terminal:** `--cc-bg-inverse-deep` (Slate) with `pattern_tile.svg` overlaid at ~6–8% opacity in sage color.
- **Full-bleed photography** for hero sections — cinematic, warm-graded, editorial. Golden hour or blue hour only.
- **No gradients as decorative wash.** The only allowed gradient is a bottom-up **protection gradient** over full-bleed photography, `linear-gradient(to top, rgba(14, 31, 25, 0.94), transparent 60%)`, to hold type legibility.
- **Pattern tiles** (Topographic, Bracket grid, Grove, Ledger) live in `assets/patterns/`. The tile-able SVG (`pattern_tile.svg`) is used as `background-image` at 6–10% opacity behind hero and footer sections.

### Animation

- **Easing:** `--cc-ease-out` and `--cc-ease-inout` — cypress patience, not spring bounce. **No bounces. No overshoots. No springs.**
- **Durations:** 140ms micro, 240ms standard, 420ms prominent.
- **Motion vocabulary:** cross-fade, subtle upward drift (8–12px), scale 0.98 → 1 on entry. Never rotate, flip, or spring.

### Interaction states

- **Hover on primary (amber) buttons:** darken to `--cc-amber-600`. No scale, no shadow lift.
- **Hover on secondary/ghost buttons:** background fills to `--cc-cypress-050` (light bg) or `--cc-border-on-dark` (dark bg).
- **Hover on links:** underline appears (offset 2px, amber), no color change.
- **Press:** darken one more step (`--cc-amber-700`).
- **Focus:** 2px `--cc-amber-500` outline, offset 2px. Never `outline: none`.
- **Disabled:** 40% opacity, `cursor: not-allowed`.

### Borders and shadows

- **Borders** are always cypress-tinted (`rgba(30, 77, 58, 0.10–0.35)`) — never a solid gray. Use `--cc-border-*` tokens.
- **Shadows** are subtle, cypress-tinted, and directional. No glowing halos. Elevation for depth, not decoration.
- **No inner shadows** on inputs. Inputs are flat with a 1px cypress border, focus-state amber.

### Radii

- Sharp editorial default (`--cc-r-md` = 6px for controls, `--cc-r-lg` = 10px for cards).
- **Never** fully-round pill-shaped cards. Pills are reserved for badges and toggles (`--cc-r-full`).
- **Never** rounded cards with a **colored left-border-only** accent — that's a design cliché this brand doesn't ship.

### Layout

- **Container:** 1240px max on standard pages, 1440px on portfolio/gallery.
- **Gutter:** 32px desktop, 20px tablet, 16px mobile.
- **12-column grid** on desktop, 8 tablet, 4 mobile.
- **Sticky marketing header** with 12–14px `backdrop-filter: blur` once scrolled.
- **Section rhythm:** 96–128px vertical between major sections. Editorial pacing, never dense.
- **The bottom meta ticker** (a `[LABEL] · CONTEXT · SIGN-OFF` strip in JetBrains Mono at the bottom of every section) is a signature. Use it.

### Transparency & blur

- Sticky header on scroll: `background: rgba(14, 31, 25, 0.72); backdrop-filter: blur(14px);`
- Modal scrim: `rgba(14, 31, 25, 0.55)`.
- No frosted glass on cards or panels. Blur is chrome-only.

### Imagery direction

Cypress swamps, inland Louisiana, commercial operations. Not coastal. Not tropical.

**Do**
- Blue hour and golden hour lighting.
- Louisiana settings: bald cypress groves, bayou, live oak, inland downtown, shopping-center exteriors at dusk.
- Ops content: operator walking the site, ledger + keys, boardroom, aerial portfolio.
- Warm shadows, desaturated highlights, subtle film grain.
- Real people who look like they've done the work — not fashion models.

**Don't**
- Palm trees, sailboats, anchors, "coastal" tropical settings — that's Florida, not Louisiana.
- HDR, over-saturation, harsh midday sun.
- Stock photography.
- Emoji, "vibes," pastel palettes.

### Cards

- `background: var(--cc-bg-elevated)` (white) on bone page
- `border: 1px solid var(--cc-border-soft)`
- `border-radius: var(--cc-r-lg)` (10px)
- `box-shadow: var(--cc-shadow-sm)`
- 24px inner padding minimum
- Never a colored top-bar or left-bar accent
- Priority-color 3px `border-left` is only allowed on `MaintenanceCard` — a semantic exception, not a decorative pattern.

---

## Iconography

- **Primary set:** custom SVGs in `assets/icons/icons.svg` (22 symbols). 24×24 viewbox, 1.75 stroke, round joins, `fill: none` + `currentColor` stroke so they inherit color.
- **Vocabulary:** `i-building`, `i-storefront`, `i-lease`, `i-key`, `i-tenant`, `i-dollar`, `i-chart`, `i-trend-up`, `i-settings`, `i-bell`, `i-search`, `i-plus`, `i-arrow-up-right`, `i-close`, `i-check`, `i-file`, `i-filter`, `i-clock`, `i-shield`, `i-user`, `i-map-pin`, `i-wave` (heritage).
- **Usage:** always inherit color from context. On amber buttons, icon is white. On cypress sidebar, active icons are amber. Never a hardcoded fill.
- **No emoji. Ever.** Not in product, not in marketing, not in copy. If you're reaching for an emoji, you're breaking brand.

---

## Sub-brand: The Grove

The Grove is Cypress Command's operator/partner/tenant program. Merchants, contractors, counsel, and capital partners who've earned a spot at Cypress Command properties.

- Members are called **Grove Operators.**
- Roster is public (or partner-visible) on the marketing site.
- Applying to The Grove is CTA'd on marketing home page + the app.
- Copy: "A stand of trees, not a shopping list of tenants."

This replaces Orange Ocean's "Coastal Court."

---

## Caveats & known substitutions

- **Fonts:** Fraunces + Inter shipped as woff2. **JetBrains Mono is loaded via Google Fonts @import** (only 400 shipped locally as fallback). If you need the full mono weight range offline, add the missing woff2 files to `assets/fonts/`.
- **Photography:** all 6 shots are AI-generated (nano-banana-2) matched to the brand direction. Swap for real photography of Adam's actual properties + operations as soon as it's available.
- **Icon set:** forked from the Orange Ocean icon library (`i-wave` inherited for continuity). Extend with `i-agent`, `i-model`, `i-prompt` when the AI capabilities expand.
- **Logo suite:** 5 SVG variants. The Grove (primary) is the recommended lockup. The Contour cypress mark is the recommended alternate for institutional/print contexts. Both use the same wordmark.
- **AI Console** is a design study, not wired to a real backend. The terminal + agent cards are illustrative UI.

---

## Sign-off

> Ground truth. Delivered.

Use this at every footer, every deck close, every partner-facing email. Always with the amber period.
