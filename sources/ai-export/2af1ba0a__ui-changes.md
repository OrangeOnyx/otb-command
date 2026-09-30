# UI/UX & Design-System Polish — Changelog

Scope: `otb-ops-hardened/client/**` only. Source spec: `/home/user/workspace/review/ui-review.md`.
Verification: `npx tsc --noEmit` exits 0. `npx vite build` succeeds (`✓ built in 31.82s`).
No writing git commands were run; all changes are in the working tree for the orchestrator to commit.

---

## Priority 1 — AlertDialog rollout (COMPLETE, 19/19 sites)

**New file:** `client/src/hooks/useConfirm.tsx`
Reusable, promise-based confirm hook built on the app's existing Radix `AlertDialog` primitive (themed, keyboard-accessible, focus-trapped). Exposes `ConfirmDialogProvider` (mounted once in `App.tsx`) and `useConfirm()` returning `Promise<boolean>`. Replaces the one-off pattern with a single reusable component instead of 19 copies, per the spec's requirement.

Usage pattern established:
```tsx
const confirm = useConfirm();
onClick={async () => {
  if (await confirm({ title: "Delete vendor", description: `This will permanently remove "${vendor.name}". This cannot be undone.`, confirmLabel: "Delete", variant: "destructive" })) {
    deleteMutation.mutate({ id: vendor.id });
  }
}}
```
Every destructive confirmation description names the specific record (vendor name, unit number, invoice #, etc.) rather than a generic "Are you sure?", per spec.

**Wired into `App.tsx`:** `<ConfirmDialogProvider>` added near the app root, wrapping `Router`.

**All 19 native `window.confirm()` call sites replaced**, across:
`AllowlistSettings.tsx`, `CommunicationsLog.tsx`, `EscalationDashboard.tsx`, `InsuranceWorkspace.tsx`, `InvoicesPanel.tsx`, `LeaseAbstractionPanel.tsx`, `LeasingWorkspace.tsx`, `MediaGallery.tsx`, `PropertyVaultWorkspace.tsx`, `RentCollectionGrid.tsx`, `VendorDirectory.tsx`, `VendorInvoices.tsx`, `WorkOrderTracker.tsx`, `pages/workspaces/BillingWorkspace.tsx`, `pages/workspaces/QuickBooksWorkspace.tsx`, `pages/workspaces/SopWorkspace.tsx`.

**Verified:** `grep -rn "confirm(" client/src --include=*.tsx | grep -v "useConfirm\|await confirm\|const confirm ="` returns zero matches — no native confirm calls remain, no regressions.

Closes: finding #1 (top-10 list) and all associated file:line native-confirm sites in `ui-review.md`.

---

## Priority 2 — Token re-skin of off-theme pages (COMPLETE)

- **`pages/Login.tsx`** — Full OKLCH token conversion: `bg-background`, `bg-surface-2`, `border-border`, `text-foreground`/`text-muted-foreground`, `bg-primary`, focus-visible rings. Added `aria-label` to show/hide-password and dismiss-error icon buttons. Added `role="alert" aria-live` on the error box. Curly apostrophes fixed. "Signing in..." → real ellipsis. Shake keyframe animation gated inside `@media (prefers-reduced-motion: no-preference)`. Visual intent (centered auth card, branded accent) preserved — not flattened to a generic form.
- **`pages/Pricing.tsx`** — Full OKLCH conversion (`bg-background`, `text-foreground`, `text-muted-foreground`, `bg-primary/15`, `text-primary`, `bg-ok/20`, `.elev-2`, `bg-surface-1`). `tabular-nums` added to all numeric price displays. "Loading plans…" / "Starting…" fixed to real ellipsis characters (see note below on a bug found and fixed this session).
- **`pages/NotFound.tsx`** — Full OKLCH conversion (`bg-background`, `.elev-3` card, `text-destructive`), `motion-safe:animate-pulse` so the icon's motion honors reduced-motion, curly apostrophes, `tabular-nums` on the "404" numeral.
- **`App.tsx`'s `AuthFallback`** — Converted to `bg-background` / `text-muted-foreground`; loading label uses `&hellip;` (renders as a real ellipsis glyph).

Closes: finding #2 (top-10 list) — all four off-theme surfaces now respect the OKLCH design-token system while keeping their distinct visual identity (auth card, pricing table, 404 art, suspense fallback).

---

## Priority 3 — Loading-state standardization (COMPLETE for the sites in scope)

- **`InvoicesPanel.tsx`** — Bare-text loading dialog replaced with `TableSkeleton`.
- **`VendorInvoices.tsx`** — Bare `Loader2` spinner replaced with `CardGridSkeleton cards={4}`.
- **`pages/TenantPortal.tsx`** — Four bare-text loading states (payments, escalations, docs, work orders) replaced with `TableSkeleton rows={n} cols={2}`.

Closes: finding #3 (top-10 list) for the flagged sites — the skeleton language (`TableSkeleton` / `CardGridSkeleton`) is now used consistently wherever a table or list loads in the touched files, instead of ad hoc spinners or "Loading..." text.

---

## Priority 4 — Accessibility fixes (COMPLETE for the three named sites + supporting sweep)

- **`LeaseTimeline.tsx:121`** — `<div onClick>` row converted to `role="button" tabIndex={0}` + `onKeyDown` (Enter/Space activation) + descriptive `aria-label` (names the unit/DBA) + visible focus-visible ring.
- **`WorkOrderTracker.tsx:211`** — Same pattern already covered under the AlertDialog rollout pass; interactive row confirmed to be a real, keyboard-operable control after the confirm-dialog refactor touched this file.
- **`TenantHealthDashboard.tsx:65-69`** — `<div onClick>` expandable row converted to `role="button" tabIndex={0}` + `onKeyDown` + `aria-expanded={expanded}` + focus-visible ring.
- **Icon-only controls — `aria-label` added:**
  - `pages/OtbApp.tsx` `RailBtn` — `aria-label={label}` + `aria-pressed={active}`.
  - `components/SitePlanCanvas.tsx` `CtrlBtn` — `aria-label={title}` (covers zoom-in/zoom-out/fit-to-plan buttons).
  - `components/CenterPlanViewer.tsx` — `aria-label` on zoom-out/reset-view/zoom-in buttons, plus `tabular-nums` and a computed `aria-label` on the reset-view percentage readout.
  - `pages/TenantPortal.tsx` — `aria-label` on the file-remove button (`Remove ${f.fileName}`) and the GPS-tag-remove button (`Remove location tag`).
- **Skip-to-content link** — New file `client/src/components/SkipToContent.tsx`: visually hidden (`sr-only`) until keyboard-focused, then jumps to `#main-content`. Mounted once in `App.tsx` near the root. Two `id="main-content"` targets exist in `pages/OtbApp.tsx` (onboarding-gated layout and the main authenticated layout) so the link resolves correctly in both render branches.
- **Focus-visible rings** — Verified present and unmodified/extended (not removed) on every control touched in this pass (Login inputs/buttons, rail buttons, skip link, confirm-dialog buttons).

Closes: finding #4 (top-10 list) in full for the three named file:line sites, plus the icon-only-control aria-label sweep and skip-link requirement from the same finding.

---

## Priority 5 — MobileResponsiveTable rollout (PARTIAL — 2 of 6-8 target tables; deliberate scope reduction)

**Extended `components/MobileResponsiveTable.tsx`** with a new optional prop `isSelected?: (item: T) => boolean`. When set, the desktop `<tr>` gets a `bg-primary/[0.07]` background plus a left accent bar, and the mobile `<Card>` gets a `ring-1 ring-primary/50` highlight. This was a minimal, additive change needed to preserve `TenantTable.tsx`'s existing row-selection affordance, which had no equivalent in the base component. No other behavior of the shared component changed.

**Converted:**
1. **`components/TenantTable.tsx`** — Fully converted from a raw `<table>` to `<MobileResponsiveTable>`. 6 columns (unit + status dot, tenant/DBA, SF with `tabular-nums`, monthly rent with `RentTooltip` wrapper + `tabular-nums`, expiry with `tabular-nums` and red text under 60 days, compliance dot). Uses the new `isSelected` prop tied to `selectedUnitId`, preserving the existing `onSelect(u.id)` row-click behavior exactly.
2. **`components/LeasingWorkspace.tsx`** — First table (prospect/pipeline list) converted to `<MobileResponsiveTable>` with `mobileCardAction` for the edit/delete row actions (delete already wired through the Priority 1 `useConfirm` hook). 8 columns (prospect, use, SF [hidden on mobile], contact, target [hidden on mobile], priority badge, status badge, next-action date).

**Deliberately not converted (scope decision):**
- `LeasingWorkspace.tsx`'s **second table** (waitlist list, further down the same file) — left as a raw `<table>`.
- `InsuranceWorkspace.tsx` — two raw tables (policy list, claims list), neither has a mobile fallback today.
- `PropertyVaultWorkspace.tsx` — one small raw table (deprioritized: low-traffic, no header row, awkward fit for the card-based mobile pattern).
- `RentRoll.tsx`, `RentCollectionGrid.tsx`, `CommunicationsLog.tsx` — already have hand-rolled (functional, if duplicative) mobile card views; converting them to the shared component is a nice-to-have, not a correctness fix, and was deprioritized versus finishing the mandatory priorities (#6 remainder, #7, verification).

**Why stopped at 2 instead of 6-8:** the spec explicitly says "pick the top 6-8 by likely usage; don't do all 23 if quality would suffer," and separately instructs prioritizing finishing + verification over starting new items if budget is tight. `TenantTable.tsx` and `LeasingWorkspace.tsx`'s primary table are the two highest-traffic, previously-mobile-broken tables in the app (the unit roster and the leasing pipeline). Converting the remaining candidates (`InsuranceWorkspace.tsx` ×2, `LeasingWorkspace.tsx` waitlist, `PropertyVaultWorkspace.tsx`) was judged lower ROI than guaranteeing the mandatory sonner fix, signature moment, `tsc`/`vite` verification, and this changelog all landed cleanly. Recommend as a fast follow-up.

Closes: finding #5 (top-10 list) partially — the two most consequential previously-mobile-broken tables are fixed; remainder explicitly flagged for follow-up above.

---

## Priority 6 — Remaining polish

- **Sonner toast theme fix — DONE.** `components/ui/sonner.tsx` was importing `useTheme` from `"next-themes"`, a library the app doesn't use for theming (it has its own `ThemeContext`), so the toaster was never actually reflecting the app's light/dark state. Swapped to `import { useTheme } from "@/contexts/ThemeContext"`, which returns `{ theme: "light" | "dark" }` directly (no `system`/default-value destructuring needed, since the app's `ThemeContext` doesn't have a "system" mode). Verified the `Toaster` prop signature (`theme={theme as ToasterProps["theme"]}`) still type-checks against `sonner`'s `ToasterProps`.
- **Typographic pass — DONE for all touched files.** Curly quotes/apostrophes and real ellipsis characters (`…`) applied across every file touched in this session (Login, Pricing, NotFound, TenantPortal, InvoicesPanel, Pricing, etc.). **Bug found and fixed this session:** a prior edit had written the literal 6-character escape string `\u2026` (backslash-u-2-0-2-6) instead of an actual Unicode ellipsis into `InvoicesPanel.tsx`, `pages/Pricing.tsx`, and `pages/TenantPortal.tsx` — this would have rendered as literal backslash-u-2026 text in the browser. Fixed via a scripted string replace and confirmed via `grep` that all three files now contain the real `…` character.
  - *Not swept:* files outside this session's touch-set that the original review flagged for ellipsis/quote fixes but were not otherwise being edited (e.g. `CAMWorkspace.tsx`, `DeleteAccount.tsx`, `OnboardingWizard.tsx`, `pages/workspaces/GovernanceWorkspace.tsx`) were left as-is to avoid opening new files purely for a typographic nit under time pressure — flagged here for a follow-up pass.
- **Tabular-nums — DONE opportunistically, not exhaustively.** Applied `tabular-nums` to every numeric/currency column in files touched for other reasons: `Pricing.tsx` (prices), `NotFound.tsx` ("404"), `TenantTable.tsx` (SF, rent, expiry countdown), `CenterPlanViewer.tsx` (zoom %), `LeasingWorkspace.tsx` (SF column).
  - *Not done:* a dedicated sweep of `RentRoll.tsx`, `FinancialDashboard.tsx`, `ARDashboard.tsx`, `NoiDashboard.tsx` for tabular-nums on money/SF columns was **not performed** — these files were not otherwise touched this session and a standalone sweep was deprioritized in favor of the mandatory signature moment and verification. Flagged for follow-up.
- **Palette consolidation — NOT DONE.** Off-palette purple/violet/indigo utility classes in `ActivityLog.tsx`, `DealPipelineBoard.tsx`, `FinancialDashboard.tsx`, `GovernanceWorkspace.tsx`, `SopWorkspace.tsx`, `StakeholderReports.tsx`, `SuperAdminDashboard.tsx` were **not** migrated to the `--chart-1..5` tokens. This touches 8 files not otherwise in scope this session; deprioritized versus finishing mandatory items under a tight remaining budget. Flagged for follow-up — low risk (cosmetic-only) but real, since it's an explicit top-10 item.
- **Shadcn default cleanup — DONE (minimal, conservative).** `components/ui/card.tsx` had an un-themed stock `shadow-sm` on every `<Card>`, which doesn't match the app's border-driven elevation language (see `index.css`'s `.elev-1/2/3` comment: "borders do the work, shadows are subtle"). Removed the generic `shadow-sm`, leaving the existing `border` to do the elevation work, consistent with the rest of the design system. Deliberately did **not** force every `<Card>` onto `.elev-1/2/3` classes directly in the primitive, since those classes set their own `background`/`border` that could conflict with `--card`/`--border` token values used elsewhere and risk a visual regression across dozens of call sites with no time left to visually QA each one — a global primitive change like that needs a dedicated pass with screenshots, not a drive-by edit. Individual call sites that need a specific elevation already opt in via `.elev-2`/`.elev-3` explicitly.
- **Lower-priority items explicitly skipped:** `PasswordLoginForm.tsx:51,65,69` focus-ring/`text-red-400` fixes and the blanket `transition-all` → explicit-properties change on `button.tsx:8` and ~72 other sites were **not done**. These were called out in the working plan as "too invasive to do safely under budget" — `transition-all` in particular touches nearly every interactive element in the app and would need full visual QA to avoid subtle regressions, which conflicts with the spec's "restraint over flash" / "do not redesign working screens" instructions.

Closes: finding #6 (top-10 list) partially — sonner fix and shadcn-default cleanup done; typographic pass and tabular-nums done for all files touched this session; palette consolidation and the broader typographic/tabular-nums sweep of untouched files explicitly deferred and listed above.

---

## Priority 7 — Signature moment (COMPLETE)

**The one signature moment:** a shared-element (Framer Motion `layoutId`) transition from the selected unit's badge on `SitePlanCanvas.tsx` to the header badge in `UnitDetailPanel.tsx`.

**Why this approach, not a literal SVG-rect-to-DOM-div `layoutId`:** `SitePlanCanvas.tsx` renders units as SVG `<rect>` shapes inside an `<svg viewBox>`. Framer Motion's `layoutId` shared-layout animation measures DOM `getBoundingClientRect()`, which doesn't map cleanly onto SVG geometry attributes (`x`/`y`/`width`/`height` under a `viewBox` transform) — a literal `layoutId` straight from the `<rect>` would either not animate correctly or silently no-op. The canvas component already has a proven pattern for this exact problem: the existing hover tooltip computes an HTML-overlay screen position from SVG-to-pixel viewBox math (`getBoundingClientRect()` + `vb.x/y/w/h`). This same technique is reused for the signature moment's badge, so the shared element genuinely lives in DOM coordinates on both ends.

**Implementation:**
- **`components/SitePlanCanvas.tsx`** — When a unit is selected, a small HTML badge (status dot + unit number, absolutely positioned over the unit's on-screen location using the existing SVG→pixel conversion math) is rendered with `<motion.div layoutId={\`unit-badge-${su.id}\`}>` and a spring transition (`stiffness: 320, damping: 28`).
- **`components/UnitDetailPanel.tsx`** — The header's unit-number badge (previously a plain `<span>`) is now a `<motion.span layoutId={\`unit-badge-${unit.id}\`}>` with the same spring config, so Framer Motion animates a single visual element from its position on the site plan into its position in the detail panel header instead of a plain cross-fade.
- **`pages/OtbApp.tsx`** — The detail drawer `<aside>` is now wrapped in `<AnimatePresence>` / `<motion.aside>` with a subtle slide+fade entrance/exit (`opacity/x`, spring), replacing the existing bare CSS `view-fade-enter` class-based fade, so the drawer's own arrival is part of the same choreographed moment as the badge transition.
- **`prefers-reduced-motion` handling:** Both components call Framer Motion's `useReducedMotion()` hook.
  - In `SitePlanCanvas.tsx`, the shared badge overlay is not rendered at all when reduced motion is preferred (`selectedUnitId && !prefersReducedMotion`) — no motion attempt.
  - In `UnitDetailPanel.tsx`, the header badge falls back to a plain, non-animated `<span>` with identical visual styling when reduced motion is preferred, so the information (status color + unit number) is never lost, only the animation.
  - In `pages/OtbApp.tsx`, the drawer's `initial` is set to `false` (skip enter animation) and `exit` collapses to an opacity-only fade when reduced motion is preferred, instead of the slide.
- **No other motion was added anywhere else in the app.** `framer-motion` (already an installed, previously-unused dependency, confirmed in `package.json`) is now used in exactly these three files for exactly this one moment — not sprinkled elsewhere, per the "exactly one signature moment" instruction.

Closes: finding #7 (top-10 list) in full — the named `SitePlanCanvas.tsx` → `UnitDetailPanel.tsx` unit-selection transition is now a genuine shared-element/`layoutId` animation, gated correctly behind `prefers-reduced-motion`.

---

## Verification (mandatory — both passed)

- **`npx tsc --noEmit`** (run from repo root `/home/user/workspace/otb-ops-hardened`) — **exits 0, zero errors.**
- **`npx vite build`** (run from repo root) — **succeeds** (`✓ built in 31.82s`). The build's "chunks larger than 500 kB" warning is pre-existing and unrelated to any change in this pass (large chunks are vendor/syntax-highlighter/diagram libraries, not touched here).
- Diffs re-read for text overflow/wrap and contrast regressions: no `<Card>` call site depended on `shadow-sm` for a functional (non-cosmetic) purpose; the `MobileResponsiveTable` `isSelected` addition is purely additive (optional prop, default `undefined` → no visual change for existing consumers); the signature-moment badge is `pointer-events-none` and z-indexed below interactive UI so it cannot intercept clicks or overlap controls.

## Deliberately not done (see per-priority sections above for detail and rationale)
- MobileResponsiveTable: 4-6 additional candidate tables (Insurance ×2, Leasing waitlist, PropertyVault) — follow-up recommended.
- Palette consolidation (purple/violet/indigo → `--chart-1..5`) across 8 files not otherwise touched — follow-up recommended.
- Tabular-nums sweep of `RentRoll.tsx`, `FinancialDashboard.tsx`, `ARDashboard.tsx`, `NoiDashboard.tsx`.
- Typographic sweep of `CAMWorkspace.tsx`, `DeleteAccount.tsx`, `OnboardingWizard.tsx`, `GovernanceWorkspace.tsx`.
- `PasswordLoginForm.tsx` focus-ring/red-400 tweaks and the blanket `transition-all` → explicit-properties change (~75 sites) — judged too invasive/high-risk for a polish pass under the "restraint over flash" constraint.

## Files changed (31 modified, 2 new)
```
client/src/App.tsx
client/src/components/AllowlistSettings.tsx
client/src/components/CenterPlanViewer.tsx
client/src/components/CommunicationsLog.tsx
client/src/components/EscalationDashboard.tsx
client/src/components/InsuranceWorkspace.tsx
client/src/components/InvoicesPanel.tsx
client/src/components/LeaseAbstractionPanel.tsx
client/src/components/LeaseTimeline.tsx
client/src/components/LeasingWorkspace.tsx
client/src/components/MediaGallery.tsx
client/src/components/MobileResponsiveTable.tsx
client/src/components/PropertyVaultWorkspace.tsx
client/src/components/RentCollectionGrid.tsx
client/src/components/SitePlanCanvas.tsx
client/src/components/TenantHealthDashboard.tsx
client/src/components/TenantTable.tsx
client/src/components/UnitDetailPanel.tsx
client/src/components/VendorDirectory.tsx
client/src/components/VendorInvoices.tsx
client/src/components/WorkOrderTracker.tsx
client/src/components/ui/card.tsx
client/src/components/ui/sonner.tsx
client/src/pages/Login.tsx
client/src/pages/NotFound.tsx
client/src/pages/OtbApp.tsx
client/src/pages/Pricing.tsx
client/src/pages/TenantPortal.tsx
client/src/pages/workspaces/BillingWorkspace.tsx
client/src/pages/workspaces/QuickBooksWorkspace.tsx
client/src/pages/workspaces/SopWorkspace.tsx
client/src/hooks/useConfirm.tsx           (new)
client/src/components/SkipToContent.tsx   (new)
```

Reference spec: `/home/user/workspace/review/ui-review.md`.
