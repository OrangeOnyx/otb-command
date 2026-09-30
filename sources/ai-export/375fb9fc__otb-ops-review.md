# otb-ops — Code & Design Review

**Date:** 2026-08-02
**Scope/stack:** React 18 + Vite + Radix/Tailwind (`client/`) · Express + tRPC 11 + Drizzle ORM (`server/`) · shared types (`shared/`) · ~64,400 LOC TypeScript, deployed on Railway, S3/Stripe/bcryptjs — combined code-quality/architecture/security review and UI/UX/design-system/accessibility review, both read-only audits, no repo files modified.

---

## Executive Summary

Registration is now open (per `todo.md`, the allowlist gate was removed the same day as this review), and that changes the urgency of everything below: otb-ops currently has a full authentication bypass on the tenant portal, an LLM-to-raw-SQL endpoint with a bypassable tenant filter, real tenant PII and password hashes sitting in git history, and a systemic IDOR pattern across seven routers. Any self-registered account — no invite required — can now reach most of these. None of this is safe to leave in place while real tenant data (some of which is already in the repo's committed backup) is reachable. This has to be fixed before anything else on this list matters.

That said, the underlying engineering is genuinely good, not a fast-and-loose prototype. The security fundamentals are sound — parameterized SQL everywhere outside the one flagged endpoint, correct Stripe webhook verification, solid JWT/bcrypt practices, and a real tRPC procedure-tier authorization system (`ownerOnlyProcedure`, `ownerOrAllowlistProcedure`, `adminProcedure`). Architecture is clean at the aggregation layer, with no circular dependencies. On the design side, this is not templated AI output: a deliberate, named brand system (OKLCH tokens, a 3-level elevation scale, a bespoke SVG dark-theme retone pipeline), URL-synced deep-linking, IME composition handling, and a real command palette all point to a developer who cares about the details. The gaps that exist are consistency and enforcement failures, not vision failures — the good patterns exist in the codebase, they're just not applied everywhere.

The design system specifically suffers from exactly this problem: an `AlertDialog` component exists and is fully themed but is used nowhere in product code (19 destructive actions instead call the browser's native `confirm()`); `framer-motion` is a dependency with zero imports anywhere; and several high-visibility pages (login, 404, pricing) bypass the token system entirely with hardcoded colors, so they visually don't belong to the same product a user sees everywhere else.

The fix sequence below is ordered by real risk, not by file. Wave 0 is a today-scale security emergency (roughly half a day of focused work). Wave 1 hardens the perimeter this week. Waves 2 and 3 are the visible-quality and structural cleanup that make this look and run as good as it already is under the hood.

---

## Combined Scorecard

| Dimension | Score /10 | Justification |
|---|---|---|
| **Security** | **3/10** | Strong crypto/JWT/Stripe/SQLi fundamentals undercut by unauthenticated tenant-token minting, a bypassable-filter LLM-to-SQL endpoint, real PII committed to git, an unauthenticated S3 proxy, and IDOR across 7 routers. |
| **Architecture** | **6/10** | Clean router aggregation and procedure-tier middleware (`server/_core/trpc.ts`), no circular dependencies — undermined by two god-modules (`server/db.ts`, `server/routers/otb.ts`) and 20+ oversized client files. |
| **Code Quality** | **5/10** | Clean parameterized SQL and no dead TODO/FIXME markers, but 307 `any`-usages concentrated in a handful of files, confirmed N+1 patterns in five modules, and an unverified ~137/286 procedure input-validation gap. |
| **Testing** | **3/10** | Server ratio (39/76 files) is reasonable, but `vitest.config.ts` scopes tests to `server/**` only — client (180 files) and shared (17 files) have zero coverage by configuration. 21 routers untested, including both confirmed-IDOR routers. |
| **Dependencies & Build** | **5/10** | Clean 3-stage Dockerfile but runs as root. 9 `npm audit` findings: 1 critical (`vitest`), 3 high (`drizzle-orm`, `xlsx` x2), 5 moderate (`esbuild`/`vite` toolchain). |
| **Repo Hygiene** | **3/10** | 15+ ad hoc root-level notes/scripts, plus the two committed PII files that are the root cause of the top git-history finding; `.gitignore` has no rule that would have caught either. |
| **Design System** | **7/10** | Strong, named OKLCH token system with an elevation scale — undermined by hardcoded-color escape hatches on auth/marketing pages and unmodified shadcn defaults. |
| **UX Correctness** | **6/10** | Good empty states, error boundary, URL deep-linking — pulled down by native `confirm()` for destructive actions and inconsistent skeleton adoption. |
| **Motion** | **5/10** | Deliberate, restrained CSS motion vocabulary with a `prefers-reduced-motion` gate, but `framer-motion` is dead weight and there's no orchestrated signature moment. |
| **Layout & Hierarchy** | **8/10** | 36-workspace IA organized into 5 groups with favorites/pinning; `SitePlanCanvas` is a genuinely sophisticated, readable interactive canvas; mobile table pattern exists but is barely adopted. |
| **Accessibility** | **5/10** | Real strengths (aria-labels on nav arrows, proper label associations, focus-visible rings) undercut by icon-only buttons relying on `title` alone, `<div onClick>` rows with no keyboard handling, and no skip link. |

**Overall weighted read:** Security is the dimension that gates everything else — a 3/10 here means the 6-8/10 architecture, layout, and design-system scores don't matter yet, because the product isn't safe to run with real tenant data in its current state. Once Wave 0/1 close that gap, the honest overall picture is a *solidly-built 6-7/10 product* with a well-scoped, non-rewrite path to 8+: the code and design problems are consistency and rollout gaps against systems that already exist (procedure-tier auth, `AlertDialog`, design tokens, `MobileResponsiveTable`), not missing capability.

---

## Fix Sequence

### Wave 0 — Today (security emergency)

| Item | Files | Effort |
|---|---|---|
| Rotate every credential in the committed backup (force password reset for all real users, especially `catherine@belle-realty.com`, `alicia@belle-realty.com`, `edward@belle-realty.com`, `adam@adamabdalla.com`) | `db-backup-20260707.sql`, `seed-payload.json` | 1h |
| Purge both PII files from git history (`git filter-repo` or BFG), force-push, re-clone everywhere | repo root | 1h |
| Add `*.sql`, `*backup*.sql`, `seed-payload.json` to `.gitignore` | `.gitignore` | 5m |
| Lock down `tenantPortal.generateToken`/`sendInvite`/`ownerActivity` behind authenticated owner/manager auth + property scoping | `server/routers/tenantPortal.ts:368-459,344` | 2h |
| Replace `nlQuery`'s raw-SQL execution with a structured/parameterized approach, or at minimum a real SQL-parser-enforced `propertyId` predicate | `server/routers/nlQuery.ts:33-86` | half-day |
| Add auth + property/tenant scoping to the S3 proxy before presigning | `server/_core/storageProxy.ts:5-47` | 2h |
| Sweep all 19 IDOR mutations and add the `propertyId` predicate already used correctly by sibling `list`/`summary` procedures | `billing.ts:188`, `cam.ts:141,324,341,384`, `dealPipeline.ts:76,77,100,101,110`, `quickbooks.ts:150`, `sop.ts:75,88,95,99,201,204`, `workOrderMedia.ts:120,184`, `vendors.ts:236-241` | half-day |

### Wave 1 — This week (hardening)

| Item | Files | Effort |
|---|---|---|
| Add `helmet()` with a project CSP + explicit `cors` allowlist | `server/_core/index.ts` | 2h |
| Add CSRF protection (double-submit cookie or token-based) for cookie-authenticated mutations | `server/_core/index.ts` | 2h |
| Switch session cookie `sameSite` to `"lax"`/`"strict"`; re-enable commented-out domain scoping | `server/_core/cookies.ts:46,27-40` | 1h |
| Register `cookie-parser` middleware so the property-scoping cookie actually populates; add a regression test | `server/_core/context.ts:28-31` | 1h |
| Move rate limiter off in-memory `Map` to a shared store (Redis or DB-backed) | `server/rateLimit.ts` | half-day |
| Upgrade `drizzle-orm` to 0.45.2+ (SQL-identifier injection, high) and the `vitest`/`vite`/`esbuild` dev chain (critical, dev-only); evaluate replacing `xlsx` (no fix available) | `package.json`/lockfile | half-day + test pass |
| Add a checked-in `.env.example` covering every var in `server/_core/env.ts` | repo root | 1h |
| Scope the 50MB body limit down to routes that need it; small default (1-2MB) elsewhere, especially public procedures | `server/_core/index.ts:43-44` | 1h |

### Wave 2 — Next (visible quality)

| Item | Files | Effort |
|---|---|---|
| Replace all 19 `window.confirm()` destructive-action calls with the existing, already-themed `AlertDialog` | `AllowlistSettings.tsx:257`, `CommunicationsLog.tsx:223`, `EscalationDashboard.tsx:521,547,573`, `InsuranceWorkspace.tsx:340`, `LeaseAbstractionPanel.tsx:129,383`, `LeasingWorkspace.tsx:409`, `MediaGallery.tsx:196,277`, `PropertyVaultWorkspace.tsx:602`, `RentCollectionGrid.tsx:136`, `VendorDirectory.tsx:160`, `WorkOrderTracker.tsx:252`, `BillingWorkspace.tsx:54`, `QuickBooksWorkspace.tsx:159`, `SopWorkspace.tsx:363,727,754` | half-day |
| Re-skin `NotFound.tsx`, `Login.tsx`, `Pricing.tsx`, `App.tsx`'s `AuthFallback` onto design tokens (`bg-background`/`text-foreground`/`text-primary` instead of `slate-*`/`zinc-*`/`bg-[#0a0a0f]`/`blue-600`) | `pages/NotFound.tsx`, `pages/Login.tsx:106-222`, `pages/Pricing.tsx:36-166`, `App.tsx:29-33,91` | half-day |
| Standardize loading states on `TableSkeleton`/`WorkspaceSkeleton` everywhere a bare `Loader2` spinner is used | `VendorInvoices.tsx:109`, `TenantPortal.tsx:318,354,405,541`, `InvoicesPanel.tsx:195` | 2h |
| Fix icon-only button accessibility: add `aria-label` alongside `title` | `SitePlanCanvas.tsx:724-734`, `OtbApp.tsx:1420-1433`, `AllowlistSettings.tsx:55,72`, `CenterPlanViewer.tsx:126,132`, `InsuranceWorkspace.tsx:372`, `UnitDetailPanel.tsx:115`, `OtbApp.tsx:1268`, `TenantPortal.tsx:493,518`, `SopWorkspace.tsx:304,626` | 2h |
| Convert `<div onClick>` interactive rows to real buttons or add `role="button"` + `tabIndex={0}` + `onKeyDown` | `LeaseTimeline.tsx:121`, `WorkOrderTracker.tsx:211`, `TenantHealthDashboard.tsx:65-69` | 2h |
| Roll out `MobileResponsiveTable` to the remaining 22 raw-`<table>` components, starting with highest-traffic | `RentRoll.tsx`, `TenantTable.tsx`, `LeasingWorkspace.tsx`, `RentCollectionGrid.tsx` (+18 more) | 1-2 days |
| Fix `sonner.tsx` theme wiring — swap `next-themes` for the app's own `ThemeContext` | `components/ui/sonner.tsx:1,5` | 30m |
| Global find/replace `"..."` → `…` on loading copy; add `tabular-nums`/`.tnum` to money/SF columns lacking it | ~30 sites incl. `App.tsx:31`, `RentRoll.tsx`, `FinancialDashboard.tsx`, `ARDashboard.tsx`, `NoiDashboard.tsx` | 2h |
| Consolidate off-palette purple/violet/indigo category colors onto `--chart-1..5` tokens | `ActivityLog.tsx`, `DealPipelineBoard.tsx`, `FinancialDashboard.tsx`, `GovernanceWorkspace.tsx`, `SopWorkspace.tsx`, `StakeholderReports.tsx`, `SuperAdminDashboard.tsx` | 2h |
| Add a skip-to-content link | `index.html`/`App.tsx` | 30m |

### Wave 3 — Ongoing (structural)

| Item | Files | Effort |
|---|---|---|
| Split `server/db.ts` (1,254 lines, 141 exports) by domain: `db/auth.ts`, `db/properties.ts`, `db/compliance.ts`, `db/billing.ts` | `server/db.ts` | 1-2 days |
| Split `server/routers/otb.ts` (1,169 lines, 31 `any`-usages, no test file) by sub-domain, adding Zod schemas and tests as part of the split | `server/routers/otb.ts` | 2-3 days |
| Add a client-side Vitest project/config (jsdom) and cover `shared/` immediately (no new tooling needed) | `vitest.config.ts:17` | half-day |
| Add tests for untested routers, prioritized: `dealPipeline.ts`, `vendors.ts` (both have confirmed IDOR bugs), then `nlQuery.ts`, `tenantPortal.ts`, then the remaining 17 | 21 routers listed in P2-6 | ongoing, 1-2 days/batch |
| Batch the N+1 sequential-await loops into single inserts/`Promise.all` | `financial.ts:473-474`, `otb.ts:36-38,242-243`, `workOrders.ts:99-100`, `scheduledInvoiceGen.ts:154-156`, `scheduledSopReminder.ts:93-95` | 1 day |
| Reduce `any`-usage, starting with `otb.ts` and `voiceWebhooks.ts` | `otb.ts` (31), `voiceWebhooks.ts` (20), `leaseAbstraction.ts` (18), `EscalationDashboard.tsx` (18), `OtbApp.tsx` (14), `SopWorkspace.tsx` (12), `db.ts` (11), `exportPdf.ts` (11), `ARDashboard.tsx` (11) | ongoing |
| Add `USER` directive to Dockerfile (non-root production container) | `Dockerfile` | 30m |
| Consolidate root-level notes/scripts into `docs/`, relocate `todo.md`/`CONTINUITY.md` as process artifacts | repo root | half-day |
| Run an AST-based check to accurately triage the ~137 possibly-unvalidated procedures | repo-wide | half-day |
| Give the unit-selection interaction a signature `layoutId` transition using the already-installed `framer-motion` | `SitePlanCanvas.tsx:510-523` → `UnitDetailPanel` | half-day |
| Replace `transition-all` with explicit property lists at the ~72 sites using it | `button.tsx:8`, `CacheSettings.tsx:51`, `DashboardKPIs.tsx:112,158,280,295`, `DashboardLayout.tsx:76,163,191`, `ErrorBoundary.tsx:89,102`, `FinancialDashboard.tsx:361,365` | 1 day |

---

## Security Findings (Detailed)

### Critical (P0)

**P0-1. Real tenant PII and credential hashes committed to git**
File: `db-backup-20260707.sql` (273.6KB, repo root), `seed-payload.json` (42KB, repo root).
Evidence: Confirmed tracked via `git ls-files | grep -iE "db-backup|seed-payload"`. The SQL dump contains real bcrypt password hashes (e.g. `$2b$10$WKE4w6tjnO5xH6CHNWfbuepU/u2uX5KgBwuQ08QhnI.937193gKqq` for `catherine@belle-realty.com`), 32 unique real email addresses (`adam@adamabdalla.com`, `alicia@belle-realty.com`, `edward@belle-realty.com`, `Karen.nelands@jdbank.com`, `Simone.McCrocklin@gmail.com`, and others), real client IP addresses (`76.72.4.48`, `76.72.9.237`), a full login/page-view audit log, the real legal entity name "Belle Realty of Lafayette, LLC," the production TiDB Cloud hostname (`gateway02.us-east-1.prod.aws.tidbcloud.com`) in the mysqldump header, and a leaked "insecure password on command line" warning from the dump tool itself.
Why it matters: This is a live credential and PII disclosure sitting in git history — anyone with repo/clone access (including any prior collaborator, CI log, or leaked clone) can extract real password hashes and attempt offline cracking, harvest tenant/staff emails for phishing, and see production infrastructure hostnames. Deleting the file today does not remove the exposure; history must be scrubbed and every exposed credential rotated.
Fix: (1) Rotate every password/hash in the dump immediately, especially the four named accounts above. (2) Purge both files from git history (`git filter-repo` or BFG Repo-Cleaner), force-push, re-clone everywhere. (3) Add `*.sql`, `seed-payload.json`, `*backup*` to `.gitignore` (see P0-2). (4) Move any legitimate backup/seed workflow to a gitignored `local/` directory or external storage with access controls, never the repo.

**P0-2. `.gitignore` has no rule covering SQL dumps or the seed filename**
File: `.gitignore` (full file reviewed).
Evidence: Covers `.env*`, `*.seed`, `*.sqlite`/`*.sqlite3`, `*.bak`, but has no `*.sql` rule and no entry for `seed-payload.json` — the exact root cause enabling P0-1.
Why it matters: Without this rule, any future `mysqldump`/backup run at the repo root will be committed again by default with `git add .`.
Fix: Add to `.gitignore`:
```
*.sql
*backup*.sql
seed-payload.json
```

**P0-3. Unauthenticated tenant-portal token minting and activity disclosure**
File: `server/routers/tenantPortal.ts:368-387` (`generateToken`), `:390-459` (`sendInvite`), `:344` (`ownerActivity`).
Evidence: All three are declared `publicProcedure` with no authentication or authorization check inside the handler body. `generateToken` accepts any `unitId` in its input and returns `{ success: true, token }` at line 386 — a valid tenant-portal access token for that unit, mintable by any unauthenticated network caller. `sendInvite` similarly lets an anonymous caller generate a token and trigger delivery of an invite email containing it to an attacker-supplied address. `ownerActivity` returns work-order/tenant activity data with no caller identity check at all.
Why it matters: This is a full authentication bypass for the tenant portal — an attacker who can enumerate or guess `unitId` values (likely sequential or low-entropy given observed seed data patterns) can gain read/write access to any unit's lease information, payment history, and documents without ever logging in. Combined with `sendInvite`, an attacker can also redirect legitimate invite emails to an address they control.
Fix: Require the caller to already be an authenticated owner/manager (`ownerOrAllowlistProcedure` or equivalent) before `generateToken`/`sendInvite` can mint a token for a unit, or move token issuance to an authenticated admin-only workflow and have tenants obtain tokens exclusively via a signed, time-limited, single-use link delivered out-of-band, never returned directly in an API response. Add a property-scoping check (`resolvePropertyId`) so a token cannot be minted for a unit outside the caller's property. Add explicit test coverage for the unauthenticated-rejection case.

**P0-4. LLM-generated raw SQL execution with a string-based (bypassable) tenant filter**
File: `server/routers/nlQuery.ts:33-86`, raw execution at line 80 (`dbConn.execute(sql.raw(query))`), defense-in-depth patch at lines 67-76.
Evidence: The endpoint asks an LLM to translate a user-supplied natural-language `question` (line 34, `z.string().min(3).max(500)`) into a raw MySQL `SELECT` string, then executes it verbatim via `sql.raw()`. The only tenant-isolation control is (a) a system-prompt instruction telling the LLM to include `WHERE propertyId = '<id>'` (line 45) and (b) a regex-based post-hoc string check/insert if the literal propertyId substring is absent from the LLM's output (lines 67-76). This "fix" was explicitly noted as a known gap in the repo's own `AUDIT_NOTES.md` ("nlQuery.ask - LLM generates SQL without propertyId WHERE clause, can query ALL properties' data") and has since been given only a naive mitigation, not a structural one.
Why it matters: Executing LLM-generated SQL directly against the database is inherently unsafe: the regex/substring check at line 68 can be defeated by any query shape the naive `WHERE`-insertion logic doesn't anticipate — a UNION-based query, a subquery, or a query where the LLM already includes an unrelated propertyId-like literal that satisfies the substring check without scoping the outer statement. Because the LLM's raw text (including anything reflected from the user's `question` input) flows straight into `sql.raw()`, this is also a prompt-injection-to-SQL-injection chain. This endpoint is reachable by any `ownerOrAllowlistProcedure` caller, including read-only allowlisted users, so a lower-privileged account is enough to attempt exploitation. Cross-reference: `nlQuery.ts` is also one of the 21 routers with zero test coverage (P2-6) — the gap was never structurally fixed and would not be caught by CI even if it regressed further.
Fix: Never execute LLM output as raw SQL. Replace with either (a) an LLM-to-structured-filter approach — LLM emits JSON describing table/columns/filters, application code builds a parameterized Drizzle query from a fixed allowlist of shapes — or (b) a read-only DB role plus a per-table wrapping view that already bakes in `propertyId` via `WHERE`, so no query can cross the boundary regardless of construction. At minimum, parse and validate the LLM's SQL with a real SQL parser (not string matching) to statically enforce the propertyId predicate on every top-level and nested SELECT before execution.

**P0-5. Unauthenticated, unscoped S3 document proxy**
File: `server/_core/storageProxy.ts:5-47`.
Evidence: The `/manus-storage/*` GET route performs zero authentication or authorization check before presigning and issuing a 307 redirect to the requested S3 key.
Why it matters: Any document (leases, COIs, tenant PII) is retrievable by anyone who knows or guesses the storage key, with no session or ownership check. Mitigation is limited to key obscurity — `server/storage.ts:24-29` appends an 8-character random hash suffix — which raises the bar but is not real authorization and is vulnerable to key leakage via logs, referrer headers, or other endpoints that return these URLs to less-privileged or unauthenticated callers (e.g., the tenant portal flows in P0-3).
Fix: Require an authenticated session (or a short-lived, per-document signed token issued only to authorized viewers) before presigning. Bind the presigned URL check to the caller's property/tenant scope, not just to a valid key.

**P0-6. Systemic IDOR — ID-only mutations missing tenant/property scoping**
Files (19 occurrences confirmed via `.where(eq(X.id, input.id))` with no propertyId filter): `server/routers/billing.ts:188`; `server/routers/cam.ts:141,324,341,384`; `server/routers/dealPipeline.ts:76,77,100,101,110` (fully reviewed: `update`/`updateStage`/`delete` lack the propertyId check that sibling `list`/`summary` procedures correctly apply via `resolvePropertyId`, despite the `deals` table having a `propertyId` column); `server/routers/quickbooks.ts:150`; `server/routers/sop.ts:75,88,95,99,201,204`; `server/routers/workOrderMedia.ts:120,184`; `server/routers/vendors.ts:236-241` (`invoices.updateStatus`).
Why it matters: Any authenticated user, including a low-privilege allowlisted/read-only user on one property, can potentially read, modify, or delete another property's records by supplying an arbitrary numeric/UUID `id`, bypassing the property-level tenant isolation the app is built around (per the repo's own `AUDIT_NOTES.md`, `resolvePropertyId(ctx)` is the intended isolation mechanism for "most routers"). `dealPipeline.ts` is the clearest confirmed case. Cross-reference: `dealPipeline.ts` and `vendors.ts` are exactly the two routers named in P2-6 as having zero test coverage — the missing tests are directly why these regressions were never caught, and both are now reachable by any self-registered account per P1-8's open-registration change.
Fix: Add a `propertyId` (or equivalent tenant-scope) predicate to every mutation's `WHERE` clause, matching the pattern already used correctly in `list`/`summary` procedures in the same files. Add a lint rule or code-review checklist item: any Drizzle `.where(eq(table.id, ...))` on a multi-tenant table must be paired with a scope filter.

### High (P1)

**P1-1. No security headers, CORS policy, or CSRF protection**
File: `server/_core/index.ts` (full 121-line file reviewed); `package.json` (grepped for `helmet`/`cors`, zero matches).
Evidence: No `helmet` middleware, no `cors` configuration, neither package is a dependency.
Why it matters: Missing headers (CSP, X-Frame-Options, HSTS, X-Content-Type-Options) increase exposure to clickjacking, MIME-sniffing, and XSS-amplification. Absent CORS policy means browser same-origin defaults are the only line of defense. Combined with P1-2, the app also has no CSRF token scheme for state-changing tRPC mutations.
Fix: Add `helmet()` with a project-appropriate CSP, and an explicit `cors` allowlist scoped to known frontend origin(s). Add CSRF protection (double-submit cookie or `SameSite=strict`/token-based) for cookie-authenticated mutations, or require a custom header simple cross-site forms cannot set.

**P1-2. Session cookie always sets `sameSite: "none"`**
File: `server/_core/cookies.ts:46`.
Evidence: `getSessionCookieOptions()` unconditionally returns `sameSite: "none"` in all environments; domain-scoping logic exists in the same file but is fully commented out (lines 27-40).
Why it matters: `SameSite=None` disables the browser's default CSRF mitigation for this cookie — cross-site requests still carry it. Combined with P1-1 (no CSRF tokens), this is a real CSRF exposure on any cookie-authenticated mutation.
Fix: Use `sameSite: "lax"` (or `"strict"` where UX allows) for same-site production deployments, reserving `"none"` only for a genuine verified cross-origin need paired with CSRF tokens. Re-enable and adapt the commented-out domain-scoping logic for production.

**P1-3. In-memory, single-instance rate limiter**
File: `server/rateLimit.ts` (88 lines, fully reviewed).
Evidence: Implements a `Map`-based sliding window per IP with an explicit self-documented limitation ("For production at scale, replace with Redis-backed limiter"). Applied as `authRateLimit` (10 req/min) and `resetRateLimit` (3 req/15min) to `/api/auth/register`, `/api/auth/password-login`, `/api/auth/reset-password`, `/api/auth/forgot-password` in `server/_core/passwordAuth.ts`.
Why it matters: On Railway (or any horizontally-scaled/multi-instance deployment), each instance has its own independent in-memory counter, so the effective rate limit is `N × configured limit`, and it resets entirely on every deploy or restart. This meaningfully weakens brute-force protection on login/password-reset endpoints — now more relevant with open registration (P1-8).
Fix: Move to a shared store (Redis, or the existing database) for rate-limit counters, or use a managed edge/WAF-level rate limiter in front of the app.

**P1-4. Property-scoping cookie likely never populated (functional + defense-in-depth bug)**
File: `server/_core/context.ts:28-31`.
Evidence: Reads `opts.req.cookies?.[PROPERTY_COOKIE]`, but no `cookie-parser` middleware is registered anywhere in `server/_core/index.ts`, and `cookie-parser` is not a dependency. Express does not populate `req.cookies` without this middleware, so this read is very likely always `undefined` in production.
Why it matters: Primarily a functional bug (active-property selection silently falls back to the `x-property-id` header or the user's first property instead of honoring the cookie), but it also means a documented layer of the property-scoping design is not actually active, reducing defense-in-depth for the P0-6 IDOR issues.
Fix: Register `cookie-parser` (or manually parse the `Cookie` header) and add a regression test asserting `ctx.propertyId` reflects the cookie value when present.

**P1-5. 50MB request body limit on all routes, including public/anonymous ones**
File: `server/_core/index.ts:43-44`.
Evidence: `express.json({ limit: "50mb" })` and `express.urlencoded({ limit: "50mb" })` apply globally, including to `publicProcedure` endpoints such as `tenantPortal.uploadCoi`/`submitMaintenanceRequest`, which accept base64-encoded file payloads.
Why it matters: A generous body-size limit on unauthenticated or lightly-authenticated endpoints increases denial-of-service surface (memory pressure from concurrent large uploads) and compounds the risk from P0-3 (unauthenticated callers can already reach these mutations).
Fix: Scope large body limits only to specific authenticated routes that legitimately need them; keep a small default (1-2MB) for everything else, especially public procedures.

**P1-6. No `.env.example`**
Evidence: `find . -maxdepth 1 -iname ".env*"` returns nothing beyond real (gitignored) `.env` files.
Why it matters: New environment setup (or Railway config review) has no authoritative list of required environment variables, increasing the chance of a misconfigured deploy silently disabling a security control (e.g., `VOICE_WEBHOOK_SECRET` unset would fail closed per `voiceWebhooks.ts:34`, but other flags may not fail as safely).
Fix: Add a checked-in `.env.example` enumerating every variable read via `server/_core/env.ts`, with placeholder values and inline comments on required vs. optional.

**P1-7. Dependency vulnerabilities confirmed via `npm audit`**
Evidence (exact versions from `pnpm-lock.yaml`, vulnerabilities from `npm audit --json`):
- `drizzle-orm@0.44.6` — High: SQL injection via improperly escaped SQL identifiers ([GHSA-gpj5-g38j-94v9](https://github.com/advisories/GHSA-gpj5-g38j-94v9)). Fixed in 0.45.2+.
- `vitest@2.1.9` (dev dependency) — Critical: when the Vitest UI server is listening, an arbitrary file can be read and executed ([advisory](https://github.com/advisories/GHSA-67mh-4wv8-2f99) via `vite`/`esbuild`). Dev-only exposure, but critical severity.
- `xlsx@0.18.5` — High: prototype pollution ([GHSA-4r6h-8v6p-xvw6](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6)) and ReDoS ([GHSA-5pgg-2g8v-p4x9](https://github.com/advisories/GHSA-5pgg-2g8v-p4x9)). No fix currently available from the maintainer.
- `esbuild <=0.24.2` / `vite <=6.4.2` / `vite-node` / `@esbuild-kit/*` / `drizzle-kit` — Moderate: dev-server request/response exposure, path traversal in `.map` handling, NTLMv2 hash disclosure via UNC path handling on Windows (build-time only).
- Total: 9 vulnerabilities (1 critical, 3 high, 5 moderate) per `npm audit`.
Why it matters: The `drizzle-orm` identifier-injection advisory is directly relevant given this ORM is the primary data-access layer for a multi-tenant app; even though this review found no string-concatenated SQL, upgrading closes a real gap in the library itself. `xlsx` has no fix — if used to parse untrusted uploaded spreadsheets anywhere, it should be replaced (e.g. with `exceljs`) rather than patched.
Fix: `npm audit fix --force` for `drizzle-orm` (breaking-change bump, needs a test pass afterward) and for the `vitest`/`vite`/`esbuild` dev-toolchain chain. Evaluate replacing `xlsx` given no fix is available.

**P1-8. `todo.md` reveals a security posture that has been loosened over time**
File: `todo.md` (1,170 lines; sections "Security — Owner-only lockdown," "Security — Allowlist + Session Timeout," "Open Registration + Login UX — 2026-08-02").
Evidence: The project moved from an owner-only-lockdown model (`ownerOnlyProcedure` on all sensitive routers, Jul 3) to an allowlist model (Jul 4-5), and most recently (2026-08-02, same day as this review) explicitly removed the registration gate/allowlist so anyone can sign up. The same day's entries also record fixing a hooks-order bug introduced by "plan-gating" logic meant to restrict free/expired users — indicating the authorization surface changed very recently and under time pressure.
Why it matters: Not itself a vulnerability, but a signal: open registration combined with the unresolved P0/P1 authorization gaps above (especially P0-6's IDOR pattern and P0-4's nlQuery endpoint, both reachable by any authenticated — now self-registerable — user) meaningfully raises real-world exploitability. A determined external actor no longer needs an invite to obtain an authenticated session and start probing.
Fix: Re-run the P0-6 and P0-4 fixes with priority given the now-open registration model; consider re-adding a lightweight review/approval gate for new accounts until the IDOR and nlQuery issues are resolved.

---

## Code Quality & Architecture Findings

### Medium (P2)

**P2-1. God module: `server/db.ts`** (1,254 lines, 141 exported functions). Mixes auth helpers, property/unit CRUD, compliance event logging, billing, and allowlist management in a single file. Difficult to navigate, test in isolation, or safely modify — concentrates review burden onto one file for nearly every PR. Fix: split by domain into `server/db/auth.ts`, `server/db/properties.ts`, `server/db/compliance.ts`, `server/db/billing.ts`, re-exported from a barrel file if needed during migration.

**P2-2. God router: `server/routers/otb.ts`** (1,169 lines, 31 `any`-usages — the highest in the repo, no dedicated test file). Size, weak typing, and zero test coverage compound in the same file — the single highest-risk file in the repo for silent regressions. Fix: split by sub-domain (mirroring the phase-based `todo.md` history — site plan, compliance, leasing waitlist), add type-safe Zod input schemas to remove `any` usages, add unit tests as part of the split, not after.

**P2-3. N+1 query patterns in sequential-await loops.** Files: `server/routers/financial.ts:473-474` (loop inserting `invoiceLineItems` one row at a time), `server/routers/otb.ts:36-38,242-243` (loop calling `db.appendComplianceEvent` per item), `server/routers/workOrders.ts:99-100` (loop calling `db.createWorkOrder` per row), `server/scheduledInvoiceGen.ts:154-156` (loop inserting `ledgerEntries`), `server/scheduledSopReminder.ts:93-95` (loop updating `sopAssignments` one at a time). Each issues one round-trip per item instead of a single batched statement — invisible in dev/demo data, painful in production as datasets grow. Fix: replace with a single batched `insert(...).values([...])` / `Promise.all` (for independent operations) or a Drizzle multi-row insert/update.

**P2-4. Concentrated `any`-type usage (307 total).** Top offenders: `server/routers/otb.ts` (31), `server/_core/voiceWebhooks.ts` (20), `server/routers/leaseAbstraction.ts` (18), `client/src/components/EscalationDashboard.tsx` (18), `client/src/pages/OtbApp.tsx` (14), `client/src/pages/workspaces/SopWorkspace.tsx` (12), `server/db.ts` (11), `client/src/lib/exportPdf.ts` (11), `client/src/components/ARDashboard.tsx` (11). Disables TypeScript's core safety guarantee at exactly the files that are largest and most central; correlates with the god-module findings above. Fix: prioritize `otb.ts` and `voiceWebhooks.ts` first (external-facing webhook and largest router); introduce shared Zod schemas in `shared/` that both validate input and derive TypeScript types.

**P2-5. Client and shared code have no test coverage by configuration, not just by omission.** File: `vitest.config.ts:17` — `include: ["server/**/*.test.ts", "server/**/*.spec.ts"]`. Even if client tests were written today, they would not run under the current config without a change — a process gap, not just a coverage gap. Fix: add a second Vitest project/config (jsdom environment) for `client/` using React Testing Library, starting with `OtbApp.tsx`, `PropertyVaultWorkspace.tsx`. Add `shared/` to the existing node-environment config immediately — no new tooling required.

**P2-6. 21 server routers have zero test coverage, including both confirmed-IDOR routers.** `account.ts, allowlist.ts, boardReport.ts, communications.ts, concierge.ts, dealPipeline.ts, docExpiration.ts, hvac.ts, leaseAbstraction.ts, nlQuery.ts, noiValuation.ts, otb.ts, predictiveMaint.ts, properties.ts, quickbooks.ts, rentPayments.ts, sotImport.ts, superAdmin.ts, tenantHealth.ts, vendors.ts, workOrders.ts`. `dealPipeline.ts` and `vendors.ts` are precisely the two routers with confirmed IDOR issues (P0-6) — the absence of tests is directly why these regressions were not caught. `nlQuery.ts` (P0-4) and `properties.ts` (site of the two now-fixed ownership gaps from `AUDIT_NOTES.md`) are similarly untested. Fix: add tests in order: `dealPipeline.ts`, `vendors.ts`, `nlQuery.ts`, `tenantPortal.ts` (not in this list but zero-coverage on the specific mutations in P0-3), then the remainder.

**P2-7. Dockerfile runs as root.** Clean 3-stage build (deps → build → production) using pnpm with `--frozen-lockfile` and a `--prod` install on `node:22-slim`, but no `USER` directive at any stage. Increases blast radius of any container-escape or dependency-RCE vulnerability (relevant given P1-7). Fix: add `RUN addgroup --system app && adduser --system --ingroup app app` and `USER app` before the final `CMD`, with file ownership set accordingly in the build stage.

**P2-8. Unvalidated ~137 tRPC procedures potentially missing `.input(...)` (needs manual triage).** A grep-based count found roughly 137 of 286 total `.mutation(`/`.query(` calls without an immediately preceding `.input(...)` call — a rough heuristic (many are legitimately input-less queries) not manually verified within this review's time budget. Any procedure that does accept a client-supplied value but lacks Zod validation is a potential type-confusion or injection surface. Fix: run a stricter AST-based check (e.g., a small ts-morph script), then add `.input(z.object({}))` or the appropriate schema wherever a real gap is confirmed.

### Low (P3)

**P3-1. Root-directory clutter.** Repo root contains `AUDIT_NOTES.md`, `CONTINUITY.md` (12.6KB), `RAILWAY-DEPLOY.md`, `README.md` (44.9KB), `REMAINING-TODO.txt`, `SETUP.md`, `STRIPE-GUIDE.md`, `_debug-redirect.md`, `_styling-notes.md`, `_workspace-audit.md`, `commercial-script.md`, `gen-seed.mjs`, `reconcile-sot.mjs`, `run-batch-extract.mjs`, `seed-hvac.mjs`, `seed.mjs`, `site-plan-audit.md`, `template.json` (15.2KB), `todo.md` (87.2KB), plus `notes/`, `references/`, `docs/`, `patches/`, `scripts/` directories. Increases the chance another data file gets committed by accident (as happened with P0-1). Fix: consolidate into `docs/` (already exists) and a `.local/`/separate notes repo for session-continuity files like `CONTINUITY.md` and `todo.md`.

**P3-2. `todo.md` is a development log, not a debt tracker — but still worth summarizing.** 1,170 lines, ~80 dated "Phase" sections documenting completed work, not outstanding debt. Most recent entries (2026-08-02): open registration enabled, email verification and plan-gating added, a React hooks-order bug fixed, governance pages (ToS/Privacy/Refund/AUP) completed for go-live. Confirms the actual outstanding debt is what this review's findings capture directly from code, not from this file. Fix: no action on the file itself; relocate per P3-1; maintain a separate, lightweight `SECURITY_TODO.md` capturing still-open items from this review going forward.

**P3-3. Possibly-unused `@aws-sdk/client-s3` / `@aws-sdk/s3-request-presigner` dependencies.** Present in `package.json`, but actual S3 access observed in `server/storage.ts` goes through a "Forge" proxy service rather than direct AWS SDK calls — not exhaustively confirmed. If genuinely unused, adds unnecessary install size and dependency-vulnerability surface. Fix: `grep -rl "@aws-sdk" server/ client/ shared/` to confirm usage before removing.

---

## Design & UX Findings

### Blocking (ship-stopping: a11y failures, broken keyboard nav, missing labels, anti-patterns)

- `components/CommandPalette.tsx` — pass; Radix `cmdk` handles roles/keyboard internally.
- `components/LeaseTimeline.tsx:121` — clickable unit row is a `<div onClick>` with no `role="button"`, `tabIndex`, or `onKeyDown`. Not keyboard-operable.
- `components/WorkOrderTracker.tsx:211` — same pattern for a work-order row, no keyboard support.
- `components/TenantHealthDashboard.tsx:65-69` — tenant card expand/collapse control not reachable by keyboard, no `aria-expanded`.
- `components/CenterPlanViewer.tsx:163` — placement canvas click handler with no keyboard equivalent for placing markers.
- `components/AllowlistSettings.tsx:44-45` — modal built on a raw `<div>`, not Radix `Dialog`, so no built-in focus trap; tab order and `Escape` handling need manual verification.
- **19 destructive actions use `window.confirm()`** instead of the existing, unused `AlertDialog` (`components/ui/alert-dialog.tsx`): `AllowlistSettings.tsx:257`, `CommunicationsLog.tsx:223`, `EscalationDashboard.tsx:521,547,573`, `InsuranceWorkspace.tsx:340`, `LeaseAbstractionPanel.tsx:129,383`, `LeasingWorkspace.tsx:409`, `MediaGallery.tsx:196,277`, `PropertyVaultWorkspace.tsx:602`, `RentCollectionGrid.tsx:136`, `VendorDirectory.tsx:160`, `WorkOrderTracker.tsx:252`, `BillingWorkspace.tsx:54`, `QuickBooksWorkspace.tsx:159`, `SopWorkspace.tsx:363,727,754`. Native `confirm()` is unstyled, blocks the render thread, cannot be keyboard-styled/branded, and fails on some mobile WebViews.
- Icon-only buttons with no `aria-label` (rely on `title` only): `AllowlistSettings.tsx:55,72`, `CenterPlanViewer.tsx:126,132`, `InsuranceWorkspace.tsx:372`, `UnitDetailPanel.tsx:115`, `OtbApp.tsx:1268`, `TenantPortal.tsx:493,518`, `SopWorkspace.tsx:304,626`.
- `SitePlanCanvas.tsx:740-746` (`CtrlBtn`) and `OtbApp.tsx:1420-1433` (`RailBtn`) — icon-only zoom/nav controls use `title` for the tooltip but no `aria-label`; screen readers get no accessible name.
- No skip-to-content link anywhere (`index.html`, `App.tsx`) — needed for keyboard users to bypass the 36-item workspace nav.
- `pages/NotFound.tsx` — entirely hardcoded Tailwind colors (`slate-50/900`, `blue-600`, `red-100/500`) instead of CSS-variable tokens; breaks in dark mode and looks visually foreign to the rest of the product.
- `pages/Login.tsx:106-222`, `pages/Pricing.tsx:36-166`, `App.tsx:29-33` (`AuthFallback`) — hardcoded `zinc-*`/`bg-[#0a0a0f]` dark-only palette, ignoring `ThemeProvider`'s light/dark state entirely (`App.tsx:91` sets `defaultTheme="light"`). Users who load the app fresh see a dark auth flow flash into a light app shell.

### Elevation (feels-AI / feels-inconsistent tells)

- `components/ui/card.tsx:10` — stock shadcn `rounded-xl border py-6 shadow-sm`, unmodified despite the app defining its own `--radius-lg/xl` scale and `.elev-1/2/3` elevation helpers (`index.css:296-312`).
- `components/ui/sonner.tsx:1,5` — imports `useTheme` from `next-themes`, a library this Vite app doesn't otherwise use (real theme state lives in `contexts/ThemeContext.tsx`). Toast theming is silently decoupled from the app's real theme state.
- Ad-hoc category colors bypass the defined `--chart-1..5` token palette: `ActivityLog.tsx:16,20` (`violet-500`, `indigo-500`), `DealPipelineBoard.tsx:17-18` (`violet-500`, `purple-500`), `FinancialDashboard.tsx:420` (`violet-400`), `GovernanceWorkspace.tsx:86,516` (`purple-400`), `SopWorkspace.tsx:30` (`purple-500`), `StakeholderReports.tsx:40-41` (`purple-400`), `SuperAdminDashboard.tsx:235` (`purple-600`). None map to the brand's seafoam/amber/navy/coral chart ramp — a sixth, unplanned hue family.
- `framer-motion` (`package.json`, `^12.23.22`) has zero imports anywhere in `src/` — dead dependency shipping in the bundle. All transitions are hand-written CSS (`index.css:403-454`), executed well but leaving the "one signature moment" opportunity unclaimed.
- No single signature motion moment exists. The strongest candidate — selecting a unit on `SitePlanCanvas.tsx` and having `UnitDetailPanel` slide in — currently appears via plain conditional render, no `layoutId` continuity between the SVG rect and the drawer header.
- `MobileResponsiveTable` (`components/MobileResponsiveTable.tsx`) is well-built but used in only **1 of 23** components that render raw `<table>` elements (`ARDashboard.tsx`, `ActivityLog.tsx`, `BulkImportDialog.tsx`, `CommunicationsLog.tsx`, `DocumentsRollup.tsx`, `InsuranceWorkspace.tsx`, `LeasingWorkspace.tsx`, `PredictiveMaintenanceDashboard.tsx`, `PropertyVaultWorkspace.tsx`, `RecordsRegister.tsx`, `RentCollectionGrid.tsx`, `RentRoll.tsx`, `TenantTable.tsx`, `VoiceIntakeWorkspace.tsx`, and others) — most will overflow-scroll horizontally on mobile instead of adapting.
- Inconsistent loading-state vocabulary: `TableSkeleton` (`components/WorkspaceSkeleton.tsx`) is adopted in ~21 components (e.g. `ARDashboard.tsx:155`, `RentCollectionGrid.tsx:187`) but others fall back to a bare `Loader2` spinner (`VendorInvoices.tsx:109`, `TenantPortal.tsx:318,354,405,541`, `InvoicesPanel.tsx:195`). Same product, two loading languages.
- `PasswordLoginForm.tsx:51,65` — inputs use `focus:ring-2` (fires on mouse click too) instead of the app-wide `focus-visible:` convention (`components/ui/input.tsx:58`); error text hardcodes `text-red-400` (`:69`) instead of the `text-destructive` token.
- `components/ui/button.tsx:8` and 72 other sites use `transition-all` instead of listing properties explicitly. Representative sites: `CacheSettings.tsx:51`, `DashboardKPIs.tsx:112,158,280,295`, `DashboardLayout.tsx:76,163,191`, `ErrorBoundary.tsx:89,102`, `FinancialDashboard.tsx:361,365`, `IdleTimeoutModal.tsx:35,41`.
- `pages/OtbApp.tsx:732` — generic "get started"-class gradient CTA copy worth verifying against specific-action-phrasing guidance (contrast: `components/EmptyState.tsx` action labels are already good — "Add Tenant," "Create Work Order" — a pass).

### Polish (small, cheap, compound into "feels expensive") — Top 10 rollout list

1. **Replace all 19 `window.confirm()` destructive-action calls with the existing `AlertDialog` component.** Same file list as the Blocking section above. `components/ui/alert-dialog.tsx` already exists and is themed — a copy-paste-and-wire job, the highest leverage-to-effort ratio in the whole audit.
2. **Re-skin `pages/NotFound.tsx`, `pages/Login.tsx`, `pages/Pricing.tsx`, and `App.tsx`'s `AuthFallback` onto the design tokens.** Swap `slate-*`/`zinc-*`/`bg-[#0a0a0f]`/`blue-600` for `bg-background`, `text-foreground`, `text-muted-foreground`, `bg-primary`. This is the most visible brand-consistency break a real user hits first (auth) and last (404).
3. **Give the "unit selected" moment a signature transition.** Use the already-installed `framer-motion` for a `layoutId`-based shared-element animation from the SVG unit rect (`SitePlanCanvas.tsx:510-523`) to `UnitDetailPanel`'s header — currently the drawer just appears. This single moment would justify the dependency and give the product's most-used interaction a memorable feel.
4. **Fix icon-only button accessibility app-wide:** add `aria-label` alongside existing `title` on `SitePlanCanvas.tsx` `CtrlBtn`/`Globe` toggle (`:724-734`), `OtbApp.tsx` `RailBtn` (`:1420-1433`), and the sites listed in Blocking. Small, mechanical, removes every screen-reader dead end in the toolbar chrome.
5. **Convert the remaining `<div onClick>` interactive rows to real buttons or add `role="button"` + `tabIndex={0}` + `onKeyDown`.** Priority: `LeaseTimeline.tsx:121`, `WorkOrderTracker.tsx:211`, `TenantHealthDashboard.tsx:65-69` — core, frequently-used list rows, not edge cases.
6. **Standardize loading states on `TableSkeleton`/`WorkspaceSkeleton` everywhere `Loader2`-only spinners currently appear** (`VendorInvoices.tsx:109`, `TenantPortal.tsx:318,354,405,541`, `InvoicesPanel.tsx:195`). One visual language for "loading" reads as considered; two reads as unfinished.
7. **Adopt `MobileResponsiveTable` in the remaining 22 raw-`<table>` components**, starting with the highest-traffic: `RentRoll.tsx`, `TenantTable.tsx`, `LeasingWorkspace.tsx`, `RentCollectionGrid.tsx`. The pattern is built and proven in one place — it just needs to be rolled out.
8. **Global find/replace `"..."` → `…` on loading/pending copy** (~30 sites, e.g. `App.tsx:31` "Loading...", `CAMWorkspace.tsx:484` "Saving...", `DeleteAccount.tsx:56` "Exporting...", `EscalationDashboard.tsx:677` "Sending...", `OnboardingWizard.tsx:472` "Creating...", `OtbApp.tsx:749,756`, `TenantPortal.tsx:220,318,354,405,541`, `GovernanceWorkspace.tsx:232,314,404,501`, `SopWorkspace.tsx:102` — the codebase already uses real `…` correctly in 34 other places, e.g. `CommandPalette.tsx:43`) and add `tabular-nums`/`.tnum` to money/SF columns in `RentRoll.tsx`, `FinancialDashboard.tsx`, `ARDashboard.tsx`, `NoiDashboard.tsx` that currently lack it (applied via `index.css:204-208` in only ~10 of 66+ call sites). Cheap, mechanical, immediately reads as more "financial-grade."
9. **Consolidate the off-palette purple/violet/indigo category colors onto the existing `--chart-1..5` tokens** (or deliberately extend the token set with a named 6th hue if a genuine 6th category is needed) — sites in `ActivityLog.tsx`, `DealPipelineBoard.tsx`, `FinancialDashboard.tsx`, `GovernanceWorkspace.tsx`, `SopWorkspace.tsx`, `StakeholderReports.tsx`, `SuperAdminDashboard.tsx`. Removes the one real "unplanned hue" in an otherwise disciplined palette.
10. **Fix the `sonner.tsx` theme wiring** (`components/ui/sonner.tsx:1,5`) — swap the `next-themes` import for the app's own `useTheme` from `contexts/ThemeContext.tsx` so toasts actually track the in-app light/dark toggle instead of silently defaulting to system theme.

### Additional polish items (not in top-10, still worth batching into Wave 2/3)

- `SitePlanCanvas.tsx:602,621` — POI/work-order pin labels hardcode `fontFamily="Inter"` inline instead of referencing `--font-sans`; silently won't follow a future typeface change.
- `text-wrap: balance`/`text-pretty` used in only 5 places; most of the 25 app-wide `<h1>`/`<h2>` headings don't guard against widows.
- Only one `touch-action: manipulation` declaration in the entire app (`SitePlanCanvas.tsx:409`); most small icon buttons elsewhere are exposed to the mobile double-tap-to-zoom delay.
- 34 buttons sized `h-6 w-6`/`h-7 w-7` (below the 44×44px touch-target guideline), concentrated in dense toolbars (`SitePlanCanvas.tsx:724-734`, `WorkOrderTracker.tsx` row actions, `RentRoll.tsx` column menus) — reasonable on desktop, worth a `sm:` breakpoint bump to 44px on touch.
- `pages/NotFound.tsx:19` — decorative pulsing red circle (`animate-pulse`) isn't gated by `prefers-reduced-motion`, unlike the rest of the app's keyframes (contrast: `index.css:403` wraps custom keyframes in the guard, but this page's Tailwind utility bypasses it).

---

## What's Already Good

**Security & backend:**
- SQL injection surface is clean — every `sql\`...${}...\`` usage across `db.ts`, `cam.ts`, `financial.ts`, `marketing.ts`, `predictiveMaint.ts`, `reports.ts`, `sop.ts`, `superAdmin.ts`, `vendors.ts` uses Drizzle's parameterized tagged templates correctly; no string-concatenated SQL found anywhere outside the flagged `nlQuery.ts`.
- Stripe webhook signature verification is correctly implemented — raw-body middleware registered before `express.json()` (`server/_core/index.ts:38-40`), `stripe.webhooks.constructEvent()` used for verification (`server/stripe.ts:77-81`).
- JWT implementation is secure — `server/_core/sdk.ts:181-233` uses `jose` with an explicit `HS256` algorithm on signing and an algorithm allowlist on verification, avoiding algorithm-confusion attacks.
- Password hashing follows best practice — bcryptjs with `BCRYPT_ROUNDS = 12` (`server/_core/passwordAuth.ts:14`); login uses dummy-hash comparison to resist timing-based user enumeration (lines 293-296); password reset avoids leaking whether an email exists (lines 192-193).
- tRPC procedure-tier authorization is well-designed — `protectedProcedure`, `writeProcedure`, `adminProcedure`, `ownerOnlyProcedure`, `ownerOrAllowlistProcedure` (with a 60-second-TTL cached allowlist lookup) are all cleanly defined in `server/_core/trpc.ts` (167 lines). The gap this review found is inconsistent *object-level* authorization layered on top of an otherwise-solid procedure-level gate — the pattern itself is sound.
- Voice webhook authentication done correctly — `server/_core/voiceWebhooks.ts:31-47` uses `crypto.timingSafeEqual` for constant-time comparison, fails closed if the secret is unconfigured.
- No hardcoded secrets found anywhere in the non-`node_modules` tree; secrets load exclusively from `process.env` via `server/_core/env.ts`.
- Router aggregation is clean — `server/routers.ts` (91 lines) composes ~35 modules with no circular dependencies found between `_core`, `routers`, and `shared/`.
- Reasonable dependency hygiene outside the flagged CVEs — only `server/_core/sdk.ts` uses `axios` (rest uses native `fetch`); no `moment.js`, uses lighter `date-fns`.
- The team performs its own security self-audits — `AUDIT_NOTES.md` documents a genuine multi-tenant isolation review that correctly identified and fixed two of three known gaps (`properties.completeSetup`, `properties.update`); worth formalizing as a recurring checklist tied to this review's open items.

**Design & frontend:**
- `index.css:1-58` — Tailwind v4 `@theme inline` token architecture with OKLCH colors, a real elevation ramp, and named brand hex documented in a comment block — genuinely above the shadcn-default bar.
- `components/SitePlanCanvas.tsx:72-114` — the paper→dark "retone" system for reusing a professionally drafted site-plan SVG across light/dark themes is a sophisticated, bespoke solution, non-obvious in an AI-scaffolded app.
- `pages/OtbApp.tsx:124-151` — workspace and selected-unit state both sync to the URL (`?ws=`, `?unit=`), satisfying the "deep-link all stateful UI" guideline that most apps skip entirely.
- `components/ui/input.tsx:17-50`, `components/ui/dialog.tsx:6-47` — custom IME composition handling for CJK input inside dialogs, a detail most teams never get to.
- `components/EmptyState.tsx`/`WORKSPACE_EMPTY_STATES` — specific, action-oriented empty-state copy ("Add your first tenant to start tracking leases...") rather than generic "No data" filler.
- `components/ErrorBoundary.tsx` — distinguishes cache-related crashes from generic errors and offers a scoped recovery action (clear cache & reload) instead of just "reload."
- `components/WorkspaceNav.tsx` — 36 workspaces organized into 5 labeled groups with a favorites/pin system persisted to `localStorage`, scroll-shadow affordances, and `Escape`/outside-click dismissal — a mature nav-at-scale pattern.
- `components/DeleteAccount.tsx` — type-to-confirm plus data export before deletion is the correct pattern for the single most destructive action in the app (contrast with the 19 `confirm()` sites elsewhere).
- No purple-gradient/Inter-hero/centered-everything AI-slop cluster found on the core app surface — the brand (navy + sunset orange + seafoam) is genuinely distinctive.

---

## Suggested Next Step

Both reviews point to the same conclusion: nothing here requires a rewrite. The security wave (Wave 0/1 above) is a well-scoped, roughly one-to-two-day push against a codebase whose underlying patterns — procedure-tier auth, parameterized SQL, JWT/bcrypt handling — are already correct; it's a rollout and enforcement problem, not a redesign problem. If useful, that security wave could be implemented on a dedicated branch (e.g. `security/p0-fixes`) so it can be reviewed and merged independently of the visible-quality and structural work in Waves 2-3, and tested against the now-open registration flow before it reaches more real users.
