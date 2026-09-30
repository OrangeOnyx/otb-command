---
name: cypress-command-design
description: Cypress Command design system — the operating system for real-world businesses. Rebrand and successor to Orange Ocean. Nested-C monogram logo suite (Grove primary), Fraunces + Inter + JetBrains Mono type, Cypress green + Command Amber + Bone palette, topographic pattern system, editorial voice with the bracket signature ("[01 — POSITIONING]", "Ground truth. Delivered."). Includes UI kits for the Property OS web app (with AI Console), the marketing site, and a 7-slide deck template.
user-invocable: true
---

# Cypress Command — using this design system

## Files at a glance

- **`colors_and_type.css`** — the single source of truth. `<link rel="stylesheet" href="/colors_and_type.css">` in every new HTML. All tokens prefixed `--cc-*`.
- **`README.md`** — brand book: voice pillars, visual foundations, iconography, imagery, copy do/don't.
- **`STYLE_GUIDE.md`** — quick reference for headline patterns, bracket tags, ledger lines.
- **`assets/logos/`** — 5 wave-mark variants (Grove, Contour, Bracket, Standard, Ledger) as SVG + PNG; app-icon strip in 4 tones.
- **`assets/patterns/`** — 4 patterns (Topo, Bracket grid, Grove, Ledger) + `pattern_tile.svg` for CSS backgrounds at 6–10% opacity.
- **`assets/photography/`** — 6 editorial images (cypress grove blue hour, shopping center dusk, operator walking site, aerial portfolio, ledger + keys, boardroom dusk).
- **`assets/icons/icons.svg`** — 22 property/ops symbols (24px viewbox, 1.75 stroke). `<use href="assets/icons/icons.svg#i-lease"/>`.
- **`assets/fonts/`** — Fraunces (display) + Inter (body) + JetBrains Mono (systems) Latin-subset woff2.
- **`components/*.jsx`** — shared React building blocks: `Atoms.jsx` (Icon, Button, Badge, Stat, BracketTag, LedgerLine, TerminalPrompt, LogoMark, CypressMark), `Chrome.jsx` (Sidebar, TopBar, MarketingHeader, MarketingFooter), `Data.jsx` (Card, StatCard, MiniChart, BarChart, PropertyCard, LeaseRow, AgentCard, TerminalWindow, MaintenanceCard, TenantCard), `Sections.jsx` (Hero, PositioningTriangle, HowItWorks, GroveSection, TrustBar, ClosingBanner).
- **`ui_kits/property_app/`** — Property OS: Dashboard, Leases, Maintenance, Tenants, **AI Console** (the differentiating surface).
- **`ui_kits/marketing_site/`** — public site: one-page scroll with hero → positioning → how → grove → trust → close → footer.
- **`slides/index.html`** — 7-slide deck template (Title, Section, 3-column, Data, Quote, Full-bleed, Closing) wired to `deck_stage.js`.
- **`preview/`** — 27 small cards for the Design System tab.

## Brand-specific rules

- **Palette:** Cypress (`#1E4D3A`) is the structural spine — chrome, headlines, dark surfaces. Command Amber (`#D97706`) is the signal accent — CTAs, alerts, the trailing period on headlines. NEVER as a background wash. Bone (`#F3EDE0`) is the default page. Slate (`#0E1F19`) for terminal/hero dark. Sage (`#8AA694`) for sage-tinted meta on dark, healthy states. Bayou (`#78522A`) for premium accents. **No blue-purple gradients. No emoji.**
- **Type triplet:** Fraunces display (400/600/700/800 + variable `"SOFT" 20, "opsz" 96`) with Inter body (300–700) and **JetBrains Mono** (400/500/600) — the mono is a signature, not a decoration. Use it for: eyebrows (`[01 — POSITIONING]`), bracket tags (`[LEASE-042]`), meta labels, terminal output, and stat labels.
- **The trailing period signature:** display headlines end with an amber period. "Ground truth. Delivered." "Precision to the entry." "Command surface." — always a colored period, always the amber signal.
- **The bracket system:** section labels use `[01 — LABEL]` in mono amber; case-file tags use `[LEASE-042]` in mono cypress; meta strips at slide/section edges use `[STATE · CONTEXT]`. This is the strongest visual pattern in the brand.
- **Voice pillars:**
  1. Earned, not performed.
  2. Commanding, not loud.
  3. Precise to the entry (`94.2%`, not "high").
  4. Operator-first (no "leverage," "synergy," "unlock").
  5. Rooted, not regional (Louisiana in the fibers, not the surface).
- **Layout:** 1240px max container (1440 for portfolio). 32px gutter. 96–128px vertical section rhythm. Editorial pacing, never dense.
- **Cards:** 1px `--cc-border-soft`, `--cc-r-lg` (10px), `--cc-shadow-sm`, white on bone page. Never colored top-bar or left-bar-only accents.
- **Motion:** cypress patience, not spring bounce. `--cc-ease-out` and `--cc-ease-inout`. No overshoots.
- **Imagery:** blue hour or golden hour only. Cypress, inland Louisiana, commercial ops. No palm trees, no coastal-Florida shots, no HDR, no stock. Warm shadows, desaturated highlights, subtle grain.

## Sub-programs

**The Grove** — the partner/tenant/operator roster program. A stand of trees, not a shopping list of tenants. Grove Operators earn a spot. This replaces Orange Ocean's "Coastal Court."

## Tagline

**"Ground truth. Delivered."** — sign every deck close, footer, and partner-facing surface with this. Always with the amber period.
