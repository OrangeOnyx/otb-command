# Phase C-1 · Onboarding pipeline productized — design (2026-08-04)

Final build plan §Phase C: "the SOT governance pack as a guided import; brand
kit per org; geometry/plat package as an optional premium step; SOP
questionnaire as settings." Pilots onboard on Phase B foundations (now
complete: B-1–B-5 all shipped). Autonomous session under `/goal`; this ships
the RAIL, not a pilot — everything here is dormant until a real intake runs.

## What ships

1. **Intake contract** (`docs/phase-c/onboarding-intake-template.json`)
   One JSON file = one property onboarding. Sections:
   - `org` — slug/name + `brand` jsonb (the purge-#6 shape: palette, wordmark,
     contact block). Reused if the org already exists (second property under
     Orange Ocean lands in the same org).
   - `property` — slug/name/address/tz + `facts` array (the purge-#4 shape:
     label/value/source rows that D-1-class cards derive from).
   - `settings` — property_settings columns (ledger_start_ym,
     renewal_horizon_days, occupancy_floor, late fees) + free `settings` jsonb
     (the A-4 SOP questionnaire answers land here).
   - `authorized` — email+role rows for the existing magic-link lattice
     (authorized_emails → handle_new_user/promote_authorized create
     org_members on first sign-in; no user rows are forged at onboard time).
2. **Validation seam** `src/lib/onboard.js` — pure `validateIntake()`:
   slug/tz/YYYY-MM shape checks, role whitelist, fact/authorized row shapes.
   Returns {ok, errors[]} — the tool refuses to touch the DB on any error.
   Tested in test/onboard.test.mjs.
3. **Secret-gated RPC** `onboard_property(p_secret, p_intake)` (migration
   `onboarding_rpc`, additive): same `app_secrets.auto_trigger` gate as every
   operator-side RPC. Creates org (or reuses by slug), property (RAISES if
   the slug already exists under the org — never clobbers), property_settings
   row, authorized_emails rows. Returns {org_id, property_id, authorized}.
   All-or-nothing: any raise rolls the whole intake back.
4. **Operator tool** `tools/onboard-property.mjs` — `node
   tools/onboard-property.mjs <intake.json> [--dry-run]`. Dry-run validates
   and prints the plan; live run pulls CRON_SECRET via the standard
   pull-load-delete drill (never on disk/chat) and calls the RPC.

## What onboarding does NOT do (v1 fences)

- **No data package.** Units/geometry/seeds are the site-plan-tier premium
  step (plan §C-1); a freshly onboarded property renders D-0 correctly and
  has an empty ledger/maintenance surface — the 13 OTB sheets stay OTB-bound
  until a per-property data package pipeline exists (C-2 proves it on OTB).
- **No storage folder prefixes** — deferred-to-onboarding decision stays
  open; revisit when the first real pilot runs.
- **No self-serve UI.** The funnel is operator-driven by design (governed
  onboarding is the wedge vs Pickspace, per §16); a UI wraps this rail later.

## Rollout

RPC applied direct to prod (additive, dormant): wrong-secret raise + full
body smoke under rollback (org/property/settings/authorized asserts +
duplicate-property raise), 0 residue. C-2 (OTB re-import as reference
tenant) and the first pilot intake are operator-gated next steps.
