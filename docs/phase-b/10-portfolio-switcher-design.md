# Phase B-3 · Property switcher + D-0 Portfolio — design (2026-08-04)

Continuation of the final build plan §Phase B item B-3 ("property switcher,
D-0 portfolio dashboard — cross-property KPIs… aggregate naturally") on the
B-5 foundation (typed layer tables + per-property realtime, purge #7).
Autonomous session under `/goal`; decisions below are recorded, not assumed
silently.

## What ships

1. **Active-property plumbing** (`src/lib/remote.js`)
   - The `const PROPERTY = "otb"` literal dies. The active property slug is
     `localStorage["otb-active-property"]`; when unset, `propertyContext()`
     resolves the **first RLS-visible property** (`order by created_at`,
     which is OTB today). One less OTB hardcode.
   - A stale stored slug (revoked membership / renamed property) self-heals:
     clear the selection, resolve first-visible instead of throwing.
   - `listProperties()` — RLS-visible roster (id, org_id, slug, name,
     address, facts) for the switcher and D-0.
   - `setActiveProperty(slug)` writes the selection; the caller reloads.
     **Switching = full page reload.** Seed, layer hydration, sync-queue
     priming, and the realtime channel are all boot-bound to one property
     context; re-initializing them live buys nothing today and risks
     cross-property state bleed. Reload is honest and cheap.

2. **Property switcher UI** (`src/main.js` sidebar)
   - Renders only when the member sees **> 1 property** — today that is
     nobody, so the OTB UI is pixel-identical after this ship. Plumbing
     first, chrome when it matters (same posture as the tenancy stamps).
   - Operator + owner only (vendor/tenant memberships are property-scoped
     single-surface roles).

3. **D-0 Portfolio sheet** (new page id `portfolio`, sheet code **D-0**)
   - First row of the sheet index (drawing-set order: D-0 above D-1), but
     the **boot default stays D-1** — `DEFAULT_PAGE = "dash"` becomes
     explicit in `pages.js` instead of "whatever PAGES[0] is".
   - Cross-property cards from **DB-native data only** (no bundled OTB
     JSON): per property —
     - **A/R outstanding** — ledger fold (effective entries, positive unit
       balances) + units-in-arrears count;
     - **Open work orders** — maintenance heads + event fold via the
       existing `deriveRequest` seam, open = `MR_OPEN_STATES`;
     - address line + active-property marker + "Open →" (switch + reload).
   - Pure seam `src/lib/portfolio.js` (grouping, folds, model, card HTML) —
     tested in `test/portfolio.test.mjs`; the view only fetches and mounts.
   - Owner visibility: **not** in `DEFAULT_OWNER_SHEETS`; operator can tick
     it per the existing owner-sheets layer (PAGE_IDS-derived, so it is
     automatically tickable). Local mode (no backend) renders an honest
     "requires the hosted backend" note.

## Deliberate scope fences (v1)

- **The 13 property sheets stay OTB-bound.** units.json / geometry / seeds
  are OTB's data package; a second property renders D-0 correctly but has no
  sheet package until Phase C onboarding builds one. The switcher is
  foundation plumbing, not a claim that R-1 renders for a property with no
  rent roll.
- **Server endpoints keep resolving the `otb` slug** (`api/_supa.mjs`
  tenancyContext). They serve OTB-data-bound surfaces (seed, concierge,
  voice); porting them to honor a client-selected property belongs to the
  session that gives other properties data to serve.
- **No realtime on D-0** — aggregates fetch at sheet-init + manual refresh.
  Realtime stays scoped to the active property's layer tables.
- **No comp/compliance KPI on D-0** — comp_state rows are diffs against a
  bundled baseline; a DB-only count would misread as absolute truth.
- **No new persisted layer** — snapshot/export shape untouched.

## Rollout

Client-only (no migration, no RLS change — every read rides existing
owner/operator policies). Suite + build → deploy → prod smoke (bundle grep
`pg-portfolio`/`otb-active-property`, D-0 renders with real OTB figures,
D-1 boot default unchanged).
