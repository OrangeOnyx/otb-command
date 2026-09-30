# UI/UX & Visual Design Review — otb-ops Client

Scope: `/home/user/workspace/otb-ops/client` (React 18 + Vite, Tailwind v4, Radix/shadcn, framer-motion dependency, Tanstack Query + tRPC). Read-only audit. Rubric: `elite-ui-ux-animation` skill — `references/web-interface-guidelines.md` + `references/audit-rubric.md`.

All file paths are relative to `/home/user/workspace/otb-ops/client/src` unless noted.

---

## Executive Summary

otb-ops is a deep, unusually well-engineered operations app — not templated AI slop. The design system is deliberate: a named brand palette ("Orange Ocean / Command Noir"), OKLCH color tokens, a 3-level elevation system (`--surface-0/1/2/3`), brand-derived chart colors, and a bespoke dark-theme "retone" pipeline for the SVG site-plan artwork (`components/SitePlanCanvas.tsx:72-114`). URL-synced workspace/unit deep-linking (`pages/OtbApp.tsx:124-151`), IME composition handling in form inputs (`components/ui/input.tsx:17-50`), and a genuine ⌘K command palette (`components/CommandPalette.tsx`) all signal real product craft, not generated boilerplate.

The gaps are consistency and finishing, not vision. Three systemic issues drag down the experience: **(1)** `framer-motion` is a listed dependency but has **zero usage** anywhere in `src/` — all "motion" is hand-rolled CSS keyframes, which is fine but means the tooling promise (`AnimatePresence`, shared layout transitions, gesture physics) is unrealized. **(2)** Destructive actions overwhelmingly use the browser's native `confirm()` (19 call sites) instead of the app's own `AlertDialog` primitive, which is imported/built but **never used** in product code. **(3)** A handful of pages (`pages/NotFound.tsx`, `pages/Login.tsx`, `pages/Pricing.tsx`, and `App.tsx`'s `AuthFallback` at `App.tsx:29-33`) bypass the design-token system entirely with hardcoded `zinc-*`/`slate-*` Tailwind colors and `bg-[#0a0a0f]`, so they render identically dark regardless of the user's light/dark theme choice — while the app's `ThemeProvider` defaults to **light** (`App.tsx:91`). This is the single most visible seam in an otherwise polished product.

No purple-gradient/Inter-hero/centered-everything AI-slop cluster was found on the core app surface — the brand is genuinely distinctive (navy + sunset orange + seafoam). The slop tells that *do* appear are narrower: Inter is still the sans body/UI face app-wide with no distinct display face (acceptable for a dense ops tool, but worth naming), and a few components lean on ad-hoc `purple-`/`violet-`/`indigo-` chips outside the defined chart token palette.

---

## Scorecard

| Category | Score /10 | Notes |
|---|---|---|
| Design System | 7 | Strong, named token system with OKLCH + elevation scale; undermined by hardcoded-color escape hatches on auth/marketing pages and stock shadcn defaults left unturned (`rounded-xl` cards) |
| UX Correctness | 6 | Good empty states, error boundary, URL deep-linking; native `confirm()` for destructive actions and inconsistent skeleton adoption pull this down |
| Motion | 5 | Deliberate, restrained CSS motion vocabulary (stagger utilities, `--ease-*` tokens, `prefers-reduced-motion` gate) but framer-motion is dead weight, and no orchestrated signature moment |
| Layout & Hierarchy | 8 | 36-workspace IA is organized into 5 sensible groups with favorites/pinning; SitePlanCanvas is a genuinely sophisticated, information-dense but readable interactive canvas; mobile table pattern exists but is barely adopted |
| Accessibility | 5 | Real strengths (aria-labels on nav arrows, proper `<label htmlFor>` forms, focus-visible rings) undercut by icon-only buttons relying on `title` only, `<div onClick>` without keyboard handlers, and no skip link |

**Overall: 6.2/10** — a substantive, brand-coherent product held back by inconsistent enforcement of its own system.

---

## Findings by Severity

### Blocking (ship-stopping: a11y failures, broken keyboard nav, missing labels, anti-patterns)

- `components/CommandPalette.tsx` — fine (Radix `cmdk` handles roles/keyboard internally); flagged only to confirm no issue here, ✓ pass.
- `components/LeaseTimeline.tsx:121` — `<div key={u.id} onClick={...} className="... cursor-pointer">` — clickable unit row is a `<div>`, no `role="button"`, `tabIndex`, or `onKeyDown`. Not keyboard-operable.
- `components/WorkOrderTracker.tsx:211` — same pattern: `<div ... onClick={() => setSelectedWO(o.id)}>` for a work-order row, no keyboard support.
- `components/TenantHealthDashboard.tsx:65-69` — tenant card `<div onClick={() => setExpandedUnit(...)}>` — expand/collapse control not reachable by keyboard, no `aria-expanded`.
- `components/CenterPlanViewer.tsx:163` — `<div className="relative" onClick={onPlaceClick}>` wrapping the placement canvas — acceptable if purely decorative click-catcher, but no keyboard equivalent exists for placing markers.
- `components/AllowlistSettings.tsx:44-45` — modal backdrop + panel both carry `onClick` handlers (`stopPropagation` on the inner one) — standard click-outside-to-close pattern, but the modal itself: check for focus trap / `Escape` handling (uses raw `<div>` modal, not Radix `Dialog`) — **not built on Radix**, so no built-in focus trap. Needs manual verification of tab order.
- **19 destructive actions use `window.confirm()`** instead of `AlertDialog` (which exists at `components/ui/alert-dialog.tsx` but has zero product usages): `components/AllowlistSettings.tsx:257`, `components/CommunicationsLog.tsx:223`, `components/EscalationDashboard.tsx:521,547,573`, `components/InsuranceWorkspace.tsx:340`, `components/LeaseAbstractionPanel.tsx:129,383`, `components/LeasingWorkspace.tsx:409`, `components/MediaGallery.tsx:196,277`, `components/PropertyVaultWorkspace.tsx:602`, `components/RentCollectionGrid.tsx:136`, `components/VendorDirectory.tsx:160`, `components/WorkOrderTracker.tsx:252`, `pages/workspaces/BillingWorkspace.tsx:54`, `pages/workspaces/QuickBooksWorkspace.tsx:159`, `pages/workspaces/SopWorkspace.tsx:363,727,754`. Native `confirm()` is unstyled, blocks the render thread, cannot be keyboard-styled/branded, and fails on some mobile WebViews.
- Icon-only buttons with no `aria-label` (rely on `title` only, which is not exposed the same way to all assistive tech and isn't available on touch): `components/AllowlistSettings.tsx:55,72`, `components/CenterPlanViewer.tsx:126,132`, `components/InsuranceWorkspace.tsx:372`, `components/UnitDetailPanel.tsx:115`, `pages/OtbApp.tsx:1268`, `pages/TenantPortal.tsx:493,518`, `pages/workspaces/SopWorkspace.tsx:304,626`.
- `components/SitePlanCanvas.tsx:740-746` (`CtrlBtn`) and `pages/OtbApp.tsx:1420-1433` (`RailBtn`) — icon-only zoom/nav controls use `title` for the tooltip but no `aria-label`; screen readers get no accessible name.
- No skip-to-content link anywhere in the app (`index.html`, `App.tsx`) — guideline requires one for keyboard users to bypass the 36-item workspace nav.
- `pages/NotFound.tsx` — entirely built with hardcoded Tailwind colors (`slate-50/900`, `blue-600`, `red-100/500`) instead of the app's CSS-variable tokens; breaks in dark mode (washes out against the navy shell) and is visually foreign to the rest of the product.
- `pages/Login.tsx:106-222`, `pages/Pricing.tsx:36-166`, `App.tsx:29-33` (`AuthFallback`) — hardcoded `zinc-*` / `bg-[#0a0a0f]` dark-only palette, ignoring `ThemeProvider`'s light/dark state entirely (`App.tsx:91` sets `defaultTheme="light"`). Users who load the app fresh see a dark auth flow flash into a light app shell.

### Elevation (feels-AI / feels-inconsistent tells)

- `components/ui/card.tsx:10` — stock shadcn `rounded-xl border py-6 shadow-sm`, unmodified from the shadcn default despite the app defining its own `--radius-lg/xl` scale and elevation helpers (`.elev-1/2/3` in `index.css:296-312`). Cards don't use the bespoke elevation system they were clearly designed to use.
- `components/ui/sonner.tsx:1,5` — imports `useTheme` from `next-themes`, a library this Vite app doesn't otherwise use (theme state actually lives in `contexts/ThemeContext.tsx`). Toast theming is silently decoupled from the app's real theme state — likely always resolves to `"system"` regardless of the user's in-app toggle.
- Ad-hoc category colors bypass the defined `--chart-1..5` token palette: `components/ActivityLog.tsx:16,20` (`violet-500`, `indigo-500`), `components/DealPipelineBoard.tsx:17-18` (`violet-500`, `purple-500`), `components/FinancialDashboard.tsx:420` (`violet-400`), `pages/workspaces/GovernanceWorkspace.tsx:86,516` (`purple-400`), `pages/workspaces/SopWorkspace.tsx:30` (`purple-500`), `pages/workspaces/StakeholderReports.tsx:40-41` (`purple-400`), `pages/workspaces/SuperAdminDashboard.tsx:235` (`purple-600`). None of these map to the brand's seafoam/amber/navy/coral chart ramp — a sixth, unplanned hue family creeping into the palette.
- `framer-motion` (`package.json` — `^12.23.22`) has **zero imports** anywhere in `src/` — dead dependency shipping in the bundle with no functional payoff. All transitions are hand-written CSS (`index.css:403-454`), which is executed well but means the "deliberate one signature moment" opportunity (e.g. a `layoutId` shared-element transition when a unit is selected on the site plan → detail drawer) is unclaimed.
- No single signature motion moment exists. The strongest candidate — selecting a unit on `SitePlanCanvas.tsx` and having `UnitDetailPanel` slide in — currently just appears via `AnimatePresence`-shaped absence (plain conditional render, no `layoutId` continuity between the SVG rect and the drawer header).
- `MobileResponsiveTable` (`components/MobileResponsiveTable.tsx`) is a well-built, purpose-made table→card responsive pattern but is used in only **1 of 23** components that render raw `<table>` elements (`ARDashboard.tsx`, `ActivityLog.tsx`, `BulkImportDialog.tsx`, `CommunicationsLog.tsx`, `DocumentsRollup.tsx`, `InsuranceWorkspace.tsx`, `LeasingWorkspace.tsx`, `PredictiveMaintenanceDashboard.tsx`, `PropertyVaultWorkspace.tsx`, `RecordsRegister.tsx`, `RentCollectionGrid.tsx`, `RentRoll.tsx`, `TenantTable.tsx`, `VoiceIntakeWorkspace.tsx`, others). Most of these will overflow-scroll horizontally on mobile instead of adapting.
- Inconsistent loading-state vocabulary: `TableSkeleton` from `components/WorkspaceSkeleton.tsx` is adopted in ~21 components (e.g. `components/ARDashboard.tsx:155`, `components/RentCollectionGrid.tsx:187`) but others fall back to a bare `Loader2` spinner in a centered `div` with no skeleton at all (`components/VendorInvoices.tsx:109`, `pages/TenantPortal.tsx:318,354,405,541`, `components/InvoicesPanel.tsx:195`). Same product, two different loading languages.
- `components/PasswordLoginForm.tsx:51,65` — inputs use `focus:ring-2` (fires on mouse click too) instead of the app-wide `focus-visible:` convention used in `components/ui/input.tsx:58`; and error text hardcodes `text-red-400` (`PasswordLoginForm.tsx:69`) instead of the `text-destructive` token used elsewhere.
- `components/ui/button.tsx:8` and 72 other sites use `transition-all` (guideline: list properties explicitly, `transition-all` forces the browser to watch every animatable property). Representative sites: `components/CacheSettings.tsx:51`, `components/DashboardKPIs.tsx:112,158,280,295`, `components/DashboardLayout.tsx:76,163,191`, `components/ErrorBoundary.tsx:89,102`, `components/FinancialDashboard.tsx:361,365`, `components/IdleTimeoutModal.tsx:35,41`.
- Generic CTA copy: `pages/OtbApp.tsx` marketing hero at line 732 ("get started"-class gradient CTA — verify exact label against guideline for specific action phrasing); `components/EmptyState.tsx` action labels are actually good (specific: "Add Tenant", "Create Work Order") — flagged as a **pass**, contrast case.

### Polish (small details, cheap to fix, compound into "feels expensive")

- Straight `"..."` used instead of real ellipsis `…` in ~30 loading/pending labels, e.g. `App.tsx:31` ("Loading..."), `components/CAMWorkspace.tsx:484` ("Saving..."), `components/DeleteAccount.tsx:56` ("Exporting..."), `components/EscalationDashboard.tsx:677` ("Sending..."), `components/OnboardingWizard.tsx:472` ("Creating..."), `pages/OtbApp.tsx:749,756` (Suspense fallbacks), `pages/TenantPortal.tsx:220,318,354,405,541`, `pages/workspaces/GovernanceWorkspace.tsx:232,314,404,501`, `pages/workspaces/SopWorkspace.tsx:102`. The codebase already uses real `…` correctly in 34 other places (e.g. `components/CommandPalette.tsx:43` "Search tenants, views, actions…"), so this is an easy global find/replace on the loading-verb pattern.
- `font-variant-numeric: tabular-nums` (via `.tnum`/`.font-mono`, `index.css:204-208`) is applied in only ~10 components despite 66+ call sites rendering `toLocaleString()` money/SF figures across rent rolls, dashboards, and reports — numeric columns won't align digit-for-digit in most tables.
- `text-wrap: balance` / `text-pretty` used in only 5 places; most page `<h1>`/`<h2>` headings (25 `<h1>`s app-wide) don't guard against widows.
- `components/SitePlanCanvas.tsx:602,621` — POI/work-order pin labels hardcode `fontFamily="Inter"` inline instead of referencing the `--font-sans` token — if the brand typeface ever changes, these SVG labels silently won't follow.
- Only one `touch-action: manipulation` declaration in the entire app (`SitePlanCanvas.tsx:409`, for pan/zoom) — most small icon buttons elsewhere are exposed to the mobile double-tap-to-zoom delay.
- 34 buttons sized `h-6 w-6`/`h-7 w-7` (below the 44×44px touch-target guideline), concentrated in dense toolbars (`SitePlanCanvas.tsx:724-734` zoom controls, `WorkOrderTracker.tsx` row actions, `RentRoll.tsx` column menus) — reasonable trade-off for information density on desktop, but worth a `sm:` breakpoint bump to 44px on touch.
- `pages/NotFound.tsx:19` — decorative pulsing red circle behind the alert icon (`animate-pulse`) isn't gated by `prefers-reduced-motion` the way the rest of the app's keyframes are (contrast: `index.css:403` wraps all custom keyframes in `@media (prefers-reduced-motion: no-preference)`, but this page's Tailwind utility class bypasses that guard entirely since it's off-system).

### ✓ Pass — Notably strong patterns worth preserving

- `index.css:1-58` — Tailwind v4 `@theme inline` token architecture with OKLCH colors, a real elevation ramp, and named brand hex documented in a comment block. This is genuinely above the shadcn-default bar.
- `components/SitePlanCanvas.tsx:72-114` — the paper→dark "retone" system for reusing a professionally drafted site-plan SVG across light/dark themes is a sophisticated, bespoke solution non-obvious in an AI-scaffolded app.
- `pages/OtbApp.tsx:124-151` — workspace and selected-unit state both sync to the URL (`?ws=`, `?unit=`), satisfying the "deep-link all stateful UI" guideline that most apps skip entirely.
- `components/ui/input.tsx:17-50`, `components/ui/dialog.tsx:6-47` — custom IME composition handling for CJK input inside dialogs — a detail most teams never get to.
- `components/EmptyState.tsx` / `WORKSPACE_EMPTY_STATES` — specific, action-oriented empty-state copy ("Add your first tenant to start tracking leases...") rather than generic "No data" filler.
- `components/ErrorBoundary.tsx` — distinguishes cache-related crashes from generic errors and offers a scoped recovery action (clear cache & reload) instead of just "reload."
- `components/WorkspaceNav.tsx` — 36 workspaces organized into 5 labeled groups with a favorites/pin system persisted to `localStorage`, scroll-shadow affordances, and `Escape`/outside-click dismissal — mature nav-at-scale pattern.
- `components/DeleteAccount.tsx` — type-to-confirm + data export before deletion is the correct pattern for the single most destructive action in the app (contrast with the 19 `confirm()` sites above).

---

## Top 10 Polish Opportunities (ranked by impact)

1. **Replace all 19 `window.confirm()` destructive-action calls with the existing `AlertDialog` component.** Files: `AllowlistSettings.tsx:257`, `CommunicationsLog.tsx:223`, `EscalationDashboard.tsx:521,547,573`, `InsuranceWorkspace.tsx:340`, `LeaseAbstractionPanel.tsx:129,383`, `LeasingWorkspace.tsx:409`, `MediaGallery.tsx:196,277`, `PropertyVaultWorkspace.tsx:602`, `RentCollectionGrid.tsx:136`, `VendorDirectory.tsx:160`, `WorkOrderTracker.tsx:252`, `BillingWorkspace.tsx:54`, `QuickBooksWorkspace.tsx:159`, `SopWorkspace.tsx:363,727,754`. `components/ui/alert-dialog.tsx` already exists and is themed — this is a copy-paste-and-wire job, highest leverage-to-effort ratio in the whole audit.

2. **Re-skin `pages/NotFound.tsx`, `pages/Login.tsx`, `pages/Pricing.tsx`, and `App.tsx`'s `AuthFallback` onto the design tokens.** Swap `slate-*`/`zinc-*`/`bg-[#0a0a0f]`/`blue-600` for `bg-background`, `text-foreground`, `text-muted-foreground`, `bg-primary`. This is the most visible brand-consistency break a real user hits first (auth) and last (404).

3. **Give the "unit selected" moment a signature transition.** Use the already-installed `framer-motion` for a `layoutId`-based shared-element animation from the SVG unit rect in `SitePlanCanvas.tsx:510-523` to `UnitDetailPanel`'s header — currently the drawer just appears. This single moment would justify the dependency and give the product's most-used interaction a memorable feel.

4. **Fix icon-only button accessibility app-wide**: add `aria-label` alongside existing `title` on `SitePlanCanvas.tsx` `CtrlBtn`/`Globe` toggle (`:724-734`), `OtbApp.tsx` `RailBtn` (`:1420-1433`), and the 11 sites listed in Blocking. Small, mechanical, and removes every screen-reader dead end in the toolbar chrome.

5. **Convert the remaining `<div onClick>` interactive rows to real buttons or add `role="button"` + `tabIndex={0}` + `onKeyDown`.** Priority: `LeaseTimeline.tsx:121`, `WorkOrderTracker.tsx:211`, `TenantHealthDashboard.tsx:65-69` — these are core, frequently-used list rows, not edge cases.

6. **Standardize loading states on `TableSkeleton`/`WorkspaceSkeleton` everywhere `Loader2`-only spinners currently appear** (`VendorInvoices.tsx:109`, `TenantPortal.tsx:318,354,405,541`, `InvoicesPanel.tsx:195`). One visual language for "loading" reads as considered; two reads as unfinished.

7. **Adopt `MobileResponsiveTable` in the remaining 22 raw-`<table>` components**, starting with the highest-traffic ones: `RentRoll.tsx`, `TenantTable.tsx`, `LeasingWorkspace.tsx`, `RentCollectionGrid.tsx`. The pattern is built and proven in one place — it just needs to be rolled out.

8. **Global find/replace `"..."` → `…` on loading/pending copy** (~30 sites listed under Polish) and add `tabular-nums`/`.tnum` to the money/SF columns in `RentRoll.tsx`, `FinancialDashboard.tsx`, `ARDashboard.tsx`, `NoiDashboard.tsx` that currently lack it. Cheap, mechanical, immediately reads as more "financial-grade."

9. **Consolidate the off-palette purple/violet/indigo category colors onto the existing `--chart-1..5` tokens** (or deliberately extend the token set with a named 6th hue if a genuine 6th category is needed) — sites in `ActivityLog.tsx`, `DealPipelineBoard.tsx`, `FinancialDashboard.tsx`, `GovernanceWorkspace.tsx`, `SopWorkspace.tsx`, `StakeholderReports.tsx`, `SuperAdminDashboard.tsx`. Removes the one real "unplanned hue" in an otherwise disciplined palette.

10. **Fix the `sonner.tsx` theme wiring** (`components/ui/sonner.tsx:1,5`) — swap the `next-themes` import for the app's own `useTheme` from `contexts/ThemeContext.tsx` so toasts actually track the in-app light/dark toggle instead of silently defaulting to system theme.

---

## Method Note

Findings were generated by reading the design tokens (`src/index.css`), shadcn primitives (`src/components/ui/*`), the flagship canvas component (`src/components/SitePlanCanvas.tsx`), the main app shell/router (`src/App.tsx`, `src/pages/OtbApp.tsx`, `src/components/WorkspaceNav.tsx`), and targeted static searches (`grep`/Python AST-lite scans) across `src/**/*.tsx` for: `transition-all`, `<div onClick>`, `confirm(`, `framer-motion` imports, purple/gradient color clusters, icon-only buttons, ellipsis/quote typography, `tabular-nums`, `AlertDialog` usage, and raw `<table>` vs `MobileResponsiveTable` adoption. All counts are exact grep/script counts against the current `src/` tree at review time.
