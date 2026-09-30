# OTB-Ops Code Quality, Architecture & Security Review

**Repo:** `/home/user/workspace/otb-ops` (read-only review — no repo files modified)
**Stack:** React 18 + Vite + Radix/Tailwind (`client/`) · Express + tRPC 11 + Drizzle ORM (`server/`) · shared types (`shared/`) · ~64,400 LOC TypeScript · deployed on Railway · S3, Stripe, bcryptjs
**Review date:** 2026-08-02

> Note on methodology: a `package-lock.json` was generated at repo root (via `npm i --package-lock-only --legacy-peer-deps`) solely to run `npm audit`, since the sandbox's Node 20 is incompatible with the project's pinned pnpm/Node 22 toolchain. This file is untracked and can be deleted; no tracked repo file was modified.

---

## Executive Summary

This is a feature-rich, single-owner-operator SaaS built rapidly (visible from `todo.md`'s 80+ dated phases) with generally solid foundational security patterns — parameterized SQL, correct Stripe webhook verification, sound JWT/bcrypt practices, and a real tRPC procedure-tier authorization system (`ownerOnlyProcedure`, `ownerOrAllowlistProcedure`, `adminProcedure`). However, that foundation has **critical, exploitable gaps** layered on top of it, concentrated in three places: (1) a tenant-portal router with completely unauthenticated token-minting mutations, (2) an LLM-to-raw-SQL natural-language query feature with a fragile string-based tenant-isolation patch, and (3) two large files of real customer PII (bcrypt hashes, emails, IPs, audit logs) committed directly to git history at repo root. Any one of these is a P0 in isolation; together they represent a materially exploitable path to full cross-tenant data compromise for a property-management platform handling leases, PII, and payments.

Architecture is reasonably clean at the router-aggregation layer (a 91-line `routers.ts` cleanly composing ~35 modules, no circular dependencies found), but suffers from god-module concentration: `server/db.ts` (1,254 lines, 141 exported functions spanning auth/properties/units/compliance/billing) and `server/routers/otb.ts` (1,169 lines, 31 `any`-usages) each mix too many concerns. Testing is asymmetric and materially incomplete: the server has 39 test files against 76 source files, but `vitest.config.ts` **only ever includes `server/**` test globs** — meaning `client/` (180 files) and `shared/` (17 files) have **zero test coverage even in principle**, not just in practice. Dependency audit surfaces a **high-severity SQL-identifier-injection advisory in the installed `drizzle-orm@0.44.6`** and a **critical arbitrary-file-execution advisory in `vitest@2.1.9`**, both fixable by upgrading.

The repo root is cluttered with 15+ ad hoc markdown notes, one-off scripts, and — most seriously — the two committed data files noted above; `.gitignore` has no rule that would have caught `*.sql` or the specific seed filename.

**Bottom line:** ship-blocking security work is required before this can be considered safe to operate with real tenant data (some of which, per the committed backup, is already real production data). The security fixes are narrow and well-scoped (roughly half a day of focused work for the P0 items), and the architecture/quality issues are typical of a fast-moving solo project — addressable incrementally without a rewrite.

---

## Scorecard

| Dimension | Score /10 | Justification |
|---|---|---|
| **Security** | **3/10** | Strong crypto/JWT/Stripe/SQLi fundamentals undercut by unauthenticated tenant-token minting (`server/routers/tenantPortal.ts:368-459`), an LLM-to-raw-SQL endpoint with a bypassable tenant filter (`server/routers/nlQuery.ts:67-80`), real PII committed to git (`db-backup-20260707.sql`, `seed-payload.json`), an unauthenticated S3 proxy (`server/_core/storageProxy.ts:5-47`), and a systemic IDOR pattern across ~7 routers. |
| **Architecture** | **6/10** | Clean router aggregation and procedure-tier middleware design (`server/_core/trpc.ts`); no circular dependencies found. Undermined by two outsized god-modules (`server/db.ts` at 1,254 lines/141 exports, `server/routers/otb.ts` at 1,169 lines) and 20+ client files over 500 lines with mixed concerns. |
| **Code Quality** | **5/10** | No dead TODO/FIXME comments in source and clean parameterized SQL throughout, but 307 `any`-usages concentrated in a handful of files, confirmed N+1 query patterns in five modules, and an unverified ~137/286 tRPC-procedure input-validation gap that needs manual triage. |
| **Testing** | **3/10** | Server-side testing is a reasonable 39/76 file ratio, but `vitest.config.ts:17` scopes tests to `server/**` only — client (180 files) and shared (17 files) have structurally zero coverage. 21 server routers, including the two with confirmed IDOR/authz bugs (`dealPipeline.ts`, `vendors.ts`), have no tests at all. |
| **Dependencies & Build** | **5/10** | Dockerfile is a clean 3-stage build but runs as root (no `USER` directive). `npm audit` surfaces 9 vulnerabilities: 1 critical (`vitest` arbitrary file read/execute), 3 high (`drizzle-orm` SQL injection, `xlsx` prototype pollution/ReDoS with no fix available), 5 moderate (`esbuild`/`vite` dev-server exposure). |
| **Repo Hygiene** | **3/10** | Root directory holds 15+ ad hoc `.md`/`.txt` notes, five one-off `.mjs` scripts, and — critically — a 273.6KB SQL dump and 42KB seed JSON containing real tenant PII, both tracked in git. `.gitignore` has no `*.sql` or filename-specific rule that would have prevented this. |

---

## Critical (P0)

### P0-1. Real tenant PII and credential hashes committed to git
**File:** `db-backup-20260707.sql` (273.6KB, repo root), `seed-payload.json` (42KB, repo root)
**Evidence:** Confirmed tracked via `git ls-files | grep -iE "db-backup|seed-payload"`. The SQL dump contains real bcrypt password hashes (e.g. `$2b$10$WKE4w6tjnO5xH6CHNWfbuepU/u2uX5KgBwuQ08QhnI.937193gKqq` for `catherine@belle-realty.com`), 32 unique real email addresses (`adam@adamabdalla.com`, `alicia@belle-realty.com`, `edward@belle-realty.com`, `Karen.nelands@jdbank.com`, `Simone.McCrocklin@gmail.com`, and others), real client IP addresses (`76.72.4.48`, `76.72.9.237`), a full login/page-view audit log, the real legal entity name "Belle Realty of Lafayette, LLC," the production TiDB Cloud hostname (`gateway02.us-east-1.prod.aws.tidbcloud.com`) in the mysqldump header, and a leaked "insecure password on command line" warning from the dump tool itself.
**Why it matters:** This is a live credential and PII disclosure sitting in git history — anyone with repo/clone access (including any prior collaborator, CI log, or leaked clone) can extract real password hashes and attempt offline cracking, harvest tenant/staff emails for phishing, and see production infrastructure hostnames. Because it's in git history, deleting the file today does not remove the exposure; history must be scrubbed and every exposed credential rotated.
**Fix:**
1. Rotate every password/hash present in the dump immediately (force password reset for all real users, especially `catherine@belle-realty.com`, `alicia@belle-realty.com`, `edward@belle-realty.com`, `adam@adamabdalla.com`).
2. Purge both files from git history (`git filter-repo` or BFG Repo-Cleaner), force-push, and have all clones re-clone.
3. Add `*.sql`, `seed-payload.json`, and a generic `*backup*` pattern to `.gitignore` (see P0-2).
4. Move any legitimate backup/seed workflow to a gitignored `local/` directory or external storage (S3 with access controls), never the repo.

### P0-2. `.gitignore` has no rule covering SQL dumps or the seed filename
**File:** `.gitignore` (full file reviewed)
**Evidence:** Covers `.env*`, `*.seed`, `*.sqlite`/`*.sqlite3`, `*.bak`, but has no `*.sql` rule and no entry for `seed-payload.json` — the exact root cause enabling P0-1.
**Why it matters:** Without this rule, any future `mysqldump`/backup run at the repo root will be committed again by default with `git add .`.
**Fix:** Add to `.gitignore`:
```
*.sql
*backup*.sql
seed-payload.json
```

### P0-3. Unauthenticated tenant-portal token minting and activity disclosure
**File:** `server/routers/tenantPortal.ts:368-387` (`generateToken`), `:390-459` (`sendInvite`), `:344` (`ownerActivity`)
**Evidence:** All three are declared `publicProcedure` with no authentication or authorization check inside the handler body. `generateToken` accepts any `unitId` in its input and returns `{ success: true, token }` at line 386 — a valid tenant-portal access token for that unit, mintable by any unauthenticated network caller. `sendInvite` similarly lets an anonymous caller generate a token and trigger delivery of an invite email containing it to an attacker-supplied address. `ownerActivity` returns work-order/tenant activity data with no caller identity check at all.
**Why it matters:** This is a full authentication bypass for the tenant portal — an attacker who can enumerate or guess `unitId` values (likely sequential or low-entropy given the seed data patterns observed) can gain read/write access to any unit's lease information, payment history, and documents without ever logging in. Combined with `sendInvite`, an attacker can also redirect legitimate invite emails to an address they control.
**Fix:** Require the caller to already be an authenticated owner/manager (via `ownerOrAllowlistProcedure` or equivalent) before `generateToken`/`sendInvite` can mint a token for a unit, or move token issuance to an authenticated admin-only workflow and have the tenant obtain tokens exclusively via a signed, time-limited, single-use link delivered out-of-band (email) rather than returned directly in an API response. Add a property-scoping check (`resolvePropertyId`) so a token cannot be minted for a unit outside the caller's property. Add explicit test coverage for the unauthenticated-rejection case.

### P0-4. LLM-generated raw SQL execution with a string-based (bypassable) tenant filter
**File:** `server/routers/nlQuery.ts:33-86`, specifically the raw execution at line 80 (`dbConn.execute(sql.raw(query))`) and the defense-in-depth patch at lines 67-76
**Evidence:** The endpoint asks an LLM to translate a user-supplied natural-language `question` (line 34, `z.string().min(3).max(500)`) into a raw MySQL `SELECT` string, then executes that string verbatim via `sql.raw()`. The only tenant-isolation control is (a) a system-prompt instruction to the LLM to include `WHERE propertyId = '<id>'` (line 45) and (b) a regex-based post-hoc string check/insert if the literal propertyId substring is absent from the LLM's output (lines 67-76). This "fix" was explicitly noted as a known gap in the repo's own `AUDIT_NOTES.md` ("nlQuery.ask - LLM generates SQL without propertyId WHERE clause, can query ALL properties' data") and has since been given only a naive mitigation, not a structural one.
**Why it matters:** Executing LLM-generated SQL directly against the database is inherently unsafe: the regex/substring check at line 68 can be defeated by any query shape the naive `WHERE`-insertion logic doesn't anticipate — e.g. a UNION-based query, a subquery, or a query where the LLM already includes an unrelated `propertyId`-like literal that satisfies the substring check without actually scoping the outer statement. Because the LLM's raw text (including anything reflected from the user's `question` input) flows straight into `sql.raw()`, this is also a prompt-injection-to-SQL-injection chain: a crafted question can attempt to make the LLM emit malicious SQL. This endpoint is reachable by any `ownerOrAllowlistProcedure` caller (i.e., including read-only allowlisted users), so a lower-privileged, legitimate account is enough to attempt exploitation.
**Fix:** Never execute LLM output as raw SQL. Replace with either (a) an LLM-to-structured-filter approach (LLM emits JSON describing table/columns/filters, application code builds a parameterized Drizzle query from a fixed allowlist of query shapes), or (b) a read-only DB role plus a wrapping view per table that already has `propertyId` baked in via `WHERE`, so no query — however constructed — can cross the boundary. At minimum, parse and validate the LLM's SQL with a real SQL parser (not string matching) to statically enforce the propertyId predicate on every top-level and nested SELECT before execution.

### P0-5. Unauthenticated, unscoped S3 document proxy
**File:** `server/_core/storageProxy.ts:5-47`
**Evidence:** The `/manus-storage/*` GET route performs zero authentication or authorization check before presigning and issuing a 307 redirect to the requested S3 key.
**Why it matters:** Any document (leases, COIs, tenant PII) is retrievable by anyone who knows or guesses the storage key, with no session or ownership check. Mitigation is limited to key obscurity — `server/storage.ts:24-29` appends an 8-character random hash suffix — which raises the bar but does not constitute real authorization and is vulnerable to key leakage via logs, referrer headers, or the many other endpoints that return these URLs to less-privileged or unauthenticated callers (e.g., the tenant portal flows in P0-3).
**Fix:** Require an authenticated session (or a short-lived, per-document signed token issued only to authorized viewers) before presigning. Bind the presigned URL check to the caller's property/tenant scope, not just to a valid key.

### P0-6. Systemic IDOR — ID-only mutations missing tenant/property scoping
**Files (19 occurrences confirmed via `.where(eq(X.id, input.id))` with no propertyId filter):**
- `server/routers/billing.ts:188`
- `server/routers/cam.ts:141,324,341,384`
- `server/routers/dealPipeline.ts:76,77,100,101,110` (fully reviewed: `update`/`updateStage`/`delete` lack the `propertyId` check that the sibling `list`/`summary` procedures correctly apply via `resolvePropertyId`, despite the `deals` table having a `propertyId` column)
- `server/routers/quickbooks.ts:150`
- `server/routers/sop.ts:75,88,95,99,201,204`
- `server/routers/workOrderMedia.ts:120,184`
- `server/routers/vendors.ts:236-241` (`invoices.updateStatus`)

**Why it matters:** Any authenticated user (including a low-privilege allowlisted/read-only user on one property) can potentially read, modify, or delete another property's records by supplying an arbitrary numeric/UUID `id`, bypassing the property-level tenant isolation the rest of the app is built around (as documented as the intended model in the repo's own `AUDIT_NOTES.md`: `resolvePropertyId(ctx)` is supposed to be the isolation mechanism for "most routers"). `dealPipeline.ts` is the clearest confirmed case: its `list`/`summary` procedures correctly filter by property, but its mutations do not.
**Fix:** Add a `propertyId` (or equivalent tenant-scope) predicate to every mutation's `WHERE` clause, matching the pattern already used correctly in `list`/`summary` procedures in the same files. Add a lint rule or code-review checklist item: any Drizzle `.where(eq(table.id, ...))` on a multi-tenant table must be paired with a scope filter.

---

## High (P1)

### P1-1. No security headers, CORS policy, or CSRF protection
**File:** `server/_core/index.ts` (full 121-line file reviewed); `package.json` (grepped for `helmet`/`cors`, zero matches)
**Evidence:** No `helmet` middleware, no `cors` configuration, and neither package is a dependency at all.
**Why it matters:** Missing headers (CSP, X-Frame-Options, HSTS, X-Content-Type-Options) increase exposure to clickjacking, MIME-sniffing, and XSS-amplification. Absent CORS policy means the browser's default same-origin protections are the only line of defense — fine until a misconfiguration or a future subdomain/API-sharing need arises. Combined with P1-2 below, the app also has no CSRF token scheme for state-changing tRPC mutations.
**Fix:** Add `helmet()` with a project-appropriate CSP, and an explicit `cors` allowlist scoped to the known frontend origin(s). Add CSRF protection (double-submit cookie or `SameSite=strict`/token-based) for cookie-authenticated mutations, or migrate state-changing requests to require a custom header that simple cross-site forms cannot set.

### P1-2. Session cookie always sets `sameSite: "none"`
**File:** `server/_core/cookies.ts:46`
**Evidence:** `getSessionCookieOptions()` unconditionally returns `sameSite: "none"` in all environments; domain-scoping logic exists in the same file but is fully commented out (lines 27-40).
**Why it matters:** `SameSite=None` disables the browser's default CSRF mitigation for this cookie, meaning cross-site requests will still carry the session cookie. Combined with P1-1 (no CSRF tokens), this is a real CSRF exposure on any cookie-authenticated mutation endpoint.
**Fix:** Use `sameSite: "lax"` (or `"strict"` where UX allows) for same-site production deployments, reserving `"none"` only for cases with a genuine verified cross-origin need (and pair it with CSRF tokens if so). Re-enable and adapt the commented-out domain-scoping logic for production.

### P1-3. In-memory, single-instance rate limiter
**File:** `server/rateLimit.ts` (88 lines, fully reviewed)
**Evidence:** Implements a `Map`-based sliding window per IP with an explicit self-documented limitation ("For production at scale, replace with Redis-backed limiter"). Applied as `authRateLimit` (10 req/min) and `resetRateLimit` (3 req/15min) to `/api/auth/register`, `/api/auth/password-login`, `/api/auth/reset-password`, `/api/auth/forgot-password` in `server/_core/passwordAuth.ts`.
**Why it matters:** On Railway (or any horizontally-scaled/multi-instance deployment), each instance has its own independent in-memory counter, so the effective rate limit is `N × configured limit` where `N` is the instance count — and it resets entirely on every deploy or restart. This meaningfully weakens brute-force protection on login/password-reset endpoints.
**Fix:** Move to a shared store (Redis, or the existing database) for rate-limit counters, or use a managed edge/WAF-level rate limiter in front of the app.

### P1-4. Property-scoping cookie likely never populated (functional + defense-in-depth bug)
**File:** `server/_core/context.ts:28-31`
**Evidence:** Reads `opts.req.cookies?.[PROPERTY_COOKIE]`, but no `cookie-parser` middleware is registered anywhere in `server/_core/index.ts`, and `cookie-parser` is not a dependency. Express does not populate `req.cookies` without this middleware, so this read is very likely always `undefined` in production.
**Why it matters:** This is primarily a functional bug (active-property selection silently falls back to the `x-property-id` header or the user's first property instead of honoring the cookie), but it also means a documented layer of the property-scoping design is not actually active, reducing defense-in-depth for the P0-6 IDOR issues.
**Fix:** Register `cookie-parser` (or switch to a manual `Cookie` header parse) and add a regression test asserting `ctx.propertyId` reflects the cookie value when present.

### P1-5. 50MB request body limit on all routes, including public/anonymous ones
**File:** `server/_core/index.ts:43-44`
**Evidence:** `express.json({ limit: "50mb" })` and `express.urlencoded({ limit: "50mb" })` apply globally, including to `publicProcedure` endpoints such as `tenantPortal.uploadCoi`/`submitMaintenanceRequest`, which accept base64-encoded file payloads.
**Why it matters:** A generous body-size limit on unauthenticated or lightly-authenticated endpoints increases denial-of-service surface (memory pressure from concurrent large uploads) and compounds the risk from P0-3 (unauthenticated callers can already reach these mutations).
**Fix:** Scope large body limits only to the specific authenticated routes that legitimately need them; keep a small default (e.g. 1-2MB) for everything else, especially public procedures.

### P1-6. No `.env.example`
**Evidence:** `find . -maxdepth 1 -iname ".env*"` returns nothing beyond real (gitignored) `.env` files.
**Why it matters:** New environment setup (or Railway config review) has no authoritative list of required environment variables, increasing the chance of a misconfigured deploy silently disabling a security control (e.g., `VOICE_WEBHOOK_SECRET` unset would fail closed per `voiceWebhooks.ts:34`, but other flags may not fail as safely).
**Fix:** Add a checked-in `.env.example` enumerating every variable read via `server/_core/env.ts`, with placeholder values and inline comments on which are required vs. optional.

### P1-7. Dependency vulnerabilities confirmed via `npm audit`
**Evidence (exact versions from `pnpm-lock.yaml`, vulnerabilities from `npm audit --json`):**
- `drizzle-orm@0.44.6` — **High**: SQL injection via improperly escaped SQL identifiers ([GHSA-gpj5-g38j-94v9](https://github.com/advisories/GHSA-gpj5-g38j-94v9)). Fixed in 0.45.2+.
- `vitest@2.1.9` (dev dependency) — **Critical**: when the Vitest UI server is listening, an arbitrary file can be read and executed ([advisory](https://github.com/advisories/GHSA-67mh-4wv8-2f99) chain via `vite`/`esbuild`). Dev-only exposure, but critical severity.
- `xlsx@0.18.5` — **High**: prototype pollution ([GHSA-4r6h-8v6p-xvw6](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6)) and ReDoS ([GHSA-5pgg-2g8v-p4x9](https://github.com/advisories/GHSA-5pgg-2g8v-p4x9)). **No fix currently available** from the maintainer.
- `esbuild <=0.24.2` / `vite <=6.4.2` / `vite-node` / `@esbuild-kit/*` / `drizzle-kit` — **Moderate**: dev-server request/response exposure, path traversal in `.map` handling, and an NTLMv2 hash disclosure via UNC path handling on Windows (build-time only).
- Total: **9 vulnerabilities (1 critical, 3 high, 5 moderate)** per `npm audit`.
**Why it matters:** The `drizzle-orm` identifier-injection advisory is directly relevant given this ORM is the primary data-access layer for a multi-tenant app; even though this review found no string-concatenated SQL, upgrading closes a real gap in the library itself. `xlsx` has no fix — if it's used to parse untrusted uploaded spreadsheets anywhere (worth a targeted follow-up check), it should be replaced (e.g. with `exceljs`) rather than patched.
**Fix:** `npm audit fix --force` for `drizzle-orm` (breaking-change bump, needs a test pass afterward) and for the `vitest`/`vite`/`esbuild` dev-toolchain chain. Evaluate replacing `xlsx` given no fix is available.

### P1-8. `todo.md` reveals a security posture that has been loosened over time
**File:** `todo.md` (1,170 lines; sections "Security — Owner-only lockdown," "Security — Allowlist + Session Timeout," "Open Registration + Login UX — 2026-08-02")
**Evidence:** The project moved from an owner-only-lockdown model (`ownerOnlyProcedure` on all sensitive routers, Jul 3) to an allowlist model (Jul 4-5), and most recently (2026-08-02, same day as this review) explicitly **removed the registration gate/allowlist so anyone can sign up**. The same day's entries also record fixing a hooks-order bug introduced by "plan-gating" logic meant to restrict free/expired users — indicating the authorization surface changed very recently and under time pressure.
**Why it matters:** This is not itself a vulnerability, but it is a signal: open registration combined with the unresolved P0/P1 authorization gaps above (especially P0-6's IDOR pattern and P0-4's nlQuery endpoint, both reachable by any authenticated — now self-registerable — user) meaningfully raises the real-world exploitability of those findings. A determined external actor no longer needs an invite to obtain an authenticated session and start probing.
**Fix:** Re-run the P0-6 and P0-4 fixes with priority given the now-open registration model; consider re-adding a lightweight review/approval gate for new accounts until the IDOR and nlQuery issues are resolved.

---

## Medium (P2)

### P2-1. God module: `server/db.ts`
**File:** `server/db.ts` (1,254 lines, 141 exported functions)
**Evidence:** Mixes auth helpers, property/unit CRUD, compliance event logging, billing, and allowlist management in a single file/module.
**Why it matters:** A single 1,254-line file with 141 exports is difficult to navigate, test in isolation, and safely modify — every change risks unrelated regressions, and it concentrates review burden onto one file for nearly every PR.
**Fix:** Split by domain into `server/db/auth.ts`, `server/db/properties.ts`, `server/db/compliance.ts`, `server/db/billing.ts`, etc., re-exported from a barrel file if needed for compatibility during migration.

### P2-2. God router: `server/routers/otb.ts`
**File:** `server/routers/otb.ts` (1,169 lines, 31 `any`-type usages — the highest in the repo, and no dedicated test file)
**Evidence:** Largest router in the codebase, combined with the highest `any`-usage count and no `otb.test.ts`.
**Why it matters:** Size, weak typing, and zero test coverage compound in the same file — this is the single highest-risk file in the repo for silent regressions.
**Fix:** Split by sub-domain (mirroring the phase-based `todo.md` history — e.g., site plan, compliance, leasing waitlist) and add type-safe Zod input schemas to remove the `any` usages; add unit tests as part of the split, not after.

### P2-3. N+1 query patterns in sequential-await loops
**Files:** `server/routers/financial.ts:473-474` (loop inserting `invoiceLineItems` one row at a time), `server/routers/otb.ts:36-38,242-243` (loop calling `db.appendComplianceEvent` per item), `server/routers/workOrders.ts:99-100` (loop calling `db.createWorkOrder` per row), `server/scheduledInvoiceGen.ts:154-156` (loop inserting `ledgerEntries`), `server/scheduledSopReminder.ts:93-95` (loop updating `sopAssignments` one at a time).
**Why it matters:** Each of these issues one round-trip per item instead of a single batched statement, which will visibly degrade latency and DB load as the affected datasets (invoices, compliance events, work orders, ledger entries) grow — this is exactly the kind of bug that is invisible in dev/demo data and painful in production.
**Fix:** Replace sequential-await loops with a single batched `insert(...).values([...])` / `Promise.all` (for independent operations) or a Drizzle multi-row insert/update, per Drizzle's documented batch APIs.

### P2-4. Concentrated `any`-type usage (307 total)
**Files (top offenders):** `server/routers/otb.ts` (31), `server/_core/voiceWebhooks.ts` (20), `server/routers/leaseAbstraction.ts` (18), `client/src/components/EscalationDashboard.tsx` (18), `client/src/pages/OtbApp.tsx` (14), `client/src/pages/workspaces/SopWorkspace.tsx` (12), `server/db.ts` (11), `client/src/lib/exportPdf.ts` (11), `client/src/components/ARDashboard.tsx` (11).
**Why it matters:** `any` usage disables TypeScript's core safety guarantee at exactly the files that are largest and most central (routers handling money and compliance data, the main app shell). This correlates with the god-module/god-router findings above — the same files are large, undertested, and weakly typed.
**Fix:** Prioritize replacing `any` in `server/routers/otb.ts` and `server/_core/voiceWebhooks.ts` first (external-facing webhook and largest router); introduce shared Zod schemas in `shared/` that both validate input and derive TypeScript types, eliminating a class of `any` usage at the source.

### P2-5. Client and shared code have no test coverage by configuration, not just by omission
**File:** `vitest.config.ts:17` — `include: ["server/**/*.test.ts", "server/**/*.spec.ts"]`
**Evidence:** The include glob structurally excludes `client/` and `shared/`; confirmed 0 test files exist in `client/src` (180 source files) and `shared/` (17 source files).
**Why it matters:** Even if client tests were written today, they would not run under the current config without a change — this is a process gap, not just a coverage gap. The `shared/` directory holds types/constants consumed by both tiers and would benefit most from cheap, high-leverage unit tests (e.g., validation schemas).
**Fix:** Add a second Vitest project/config (or extend the include glob with a jsdom environment override) for `client/` using React Testing Library, starting with the highest-risk components (`OtbApp.tsx`, `PropertyVaultWorkspace.tsx`). Add `shared/` to the existing node-environment config immediately — no new tooling required.

### P2-6. 21 server routers have zero test coverage, including both confirmed-IDOR routers
**Evidence:** `account.ts, allowlist.ts, boardReport.ts, communications.ts, concierge.ts, dealPipeline.ts, docExpiration.ts, hvac.ts, leaseAbstraction.ts, nlQuery.ts, noiValuation.ts, otb.ts, predictiveMaint.ts, properties.ts, quickbooks.ts, rentPayments.ts, sotImport.ts, superAdmin.ts, tenantHealth.ts, vendors.ts, workOrders.ts` have no matching `*.test.ts` file.
**Why it matters:** `dealPipeline.ts` and `vendors.ts` are precisely the two routers with confirmed IDOR issues (P0-6) — the absence of tests is directly why these regressions were not caught. `nlQuery.ts` (P0-4) and `properties.ts` (site of the two now-fixed ownership gaps from `AUDIT_NOTES.md`) are similarly untested.
**Fix:** Prioritize adding tests for these routers in the order: `dealPipeline.ts`, `vendors.ts`, `nlQuery.ts`, `tenantPortal.ts` (not in this list but zero-coverage on the specific mutations in P0-3), then the remainder.

### P2-7. Dockerfile runs as root
**File:** `Dockerfile` (62 lines, fully reviewed)
**Evidence:** Clean 3-stage build (deps → build → production) using pnpm with `--frozen-lockfile` and a `--prod` production install, on `node:22-slim`, but no `USER` directive is set at any stage.
**Why it matters:** Running the production container as root increases the blast radius of any container-escape or dependency-RCE vulnerability (relevant given P1-7's findings).
**Fix:** Add `RUN addgroup --system app && adduser --system --ingroup app app` and `USER app` before the final `CMD`, ensuring file ownership of the app directory is set accordingly in the build stage.

### P2-8. Unvalidated ~137 tRPC procedures potentially missing `.input(...)` (needs manual triage)
**Evidence:** A grep-based count found roughly 137 of 286 total `.mutation(`/`.query(` calls without an immediately preceding `.input(...)` call. This is a rough heuristic (many are legitimately input-less queries, e.g. `list()` with no filters) and was not manually verified procedure-by-procedure within this review's time budget.
**Why it matters:** Any procedure that does accept a client-supplied value but lacks Zod input validation is a potential type-confusion or injection surface; this needs to be triaged rather than assumed to be a real gap of this magnitude.
**Fix:** Run a stricter AST-based check (e.g., a small ts-morph script) rather than a text grep to get an accurate count, then add `.input(z.object({}))` or the appropriate schema to any procedure found to accept but not validate input.

---

## Low (P3)

### P3-1. Root-directory clutter
**Evidence:** Repo root contains `AUDIT_NOTES.md`, `CONTINUITY.md` (12.6KB), `RAILWAY-DEPLOY.md`, `README.md` (44.9KB), `REMAINING-TODO.txt`, `SETUP.md`, `STRIPE-GUIDE.md`, `_debug-redirect.md`, `_styling-notes.md`, `_workspace-audit.md`, `commercial-script.md`, `gen-seed.mjs`, `reconcile-sot.mjs`, `run-batch-extract.mjs`, `seed-hvac.mjs`, `seed.mjs`, `site-plan-audit.md`, `template.json` (15.2KB), `todo.md` (87.2KB), alongside `notes/`, `references/`, `docs/`, `patches/`, `scripts/` directories.
**Why it matters:** Working notes mixed with source code at the repo root make it harder for a new contributor (or future you) to find canonical documentation, and increase the chance that another data file gets committed by accident (as happened with P0-1).
**Fix:** Consolidate into a `docs/` subdirectory (already exists — most of these belong there) and a `.local/` or separate notes repo for session-continuity files like `CONTINUITY.md` and `todo.md`, which are development-process artifacts rather than project documentation.

### P3-2. `todo.md` is a development log, not a debt tracker — but still worth summarizing
**File:** `todo.md` (1,170 lines, 0 `TODO`/`FIXME`/`P0`/`P1` markers, 3 "bug" mentions, 2 "critical" mentions)
**Evidence:** Structured as ~80 dated, checked-off "Phase" sections (Phase A through recent 2026-08-02 entries) documenting completed feature work, not outstanding debt. The most recent entries (2026-08-02) show: open registration was just enabled, email verification and plan-gating were just added, a React hooks-order bug was just fixed, and governance pages (ToS/Privacy/Refund/AUP) were just completed for go-live. The "Security — Owner-only lockdown" and "Security — Allowlist + Session Timeout" sections (Jul 3-4) document the authorization model that was later loosened (see P1-8).
**Why it matters:** This confirms the file is a changelog/continuity aid (consistent with the user's documented workflow pattern of using continuity files for session persistence) rather than a source of hidden bug reports — the actual outstanding debt is what this review's Critical/High/Medium sections capture directly from code, not from this file.
**Fix:** No action needed on the file itself; recommend renaming or relocating it out of repo root per P3-1 since it is a process artifact, and recommend the team maintain a separate, lightweight `SECURITY_TODO.md` capturing the still-open items from this review going forward.

### P3-3. Possibly-unused `@aws-sdk/client-s3` / `@aws-sdk/s3-request-presigner` dependencies
**Evidence:** Both packages are present in `package.json`, but actual S3 access observed in `server/storage.ts` goes through a "Forge" proxy service (`BUILT_IN_FORGE_API_URL`/`BUILT_IN_FORGE_API_KEY`) rather than direct AWS SDK calls. This was not exhaustively confirmed (a full grep for all `@aws-sdk` import sites across the repo was not completed within the review's time budget).
**Why it matters:** If genuinely unused, these add unnecessary install size and a larger dependency-vulnerability surface for no benefit.
**Fix:** Run `grep -rl "@aws-sdk" server/ client/ shared/` to confirm actual usage sites before removing; if confirmed unused, drop both packages.

---

## Confirmed Strengths (do not treat as findings — call out as good practice)

- **SQL injection surface is clean.** Every `sql\`...${}...\`` usage found across `server/db.ts`, `routers/cam.ts`, `financial.ts`, `marketing.ts`, `predictiveMaint.ts`, `reports.ts`, `sop.ts`, `superAdmin.ts`, `vendors.ts` uses Drizzle's parameterized tagged templates correctly; no string-concatenated SQL was found anywhere outside the already-flagged `nlQuery.ts` (P0-4).
- **Stripe webhook signature verification is correctly implemented.** Raw-body middleware is registered before `express.json()` in `server/_core/index.ts:38-40`, and `stripe.webhooks.constructEvent()` is used for verification in `server/stripe.ts:77-81`.
- **JWT implementation is secure.** `server/_core/sdk.ts:181-233` uses `jose` with an explicit `HS256` algorithm on signing and an algorithm allowlist on verification, avoiding algorithm-confusion attacks.
- **Password hashing follows best practice.** bcryptjs with `BCRYPT_ROUNDS = 12` (`server/_core/passwordAuth.ts:14`); login uses a dummy-hash comparison to resist timing-based user enumeration (lines 293-296); password reset intentionally avoids leaking whether an email exists (lines 192-193).
- **tRPC procedure-tier authorization is well-designed.** `protectedProcedure`, `writeProcedure` (blocks viewer role), `adminProcedure`, `ownerOnlyProcedure`, and `ownerOrAllowlistProcedure` (with a 60-second-TTL cached allowlist lookup) are all cleanly defined in `server/_core/trpc.ts` (167 lines). The gap identified in this review is inconsistent *object-level* (row) authorization layered on top of this otherwise-solid procedure-level gating — the pattern itself is sound.
- **Voice webhook authentication is done correctly.** `server/_core/voiceWebhooks.ts:31-47` uses `crypto.timingSafeEqual` for constant-time secret comparison and fails closed if the secret is unconfigured.
- **No hardcoded secrets found.** Broad greps for `sk_live`, `sk_test`, AWS key patterns, and private-key headers returned zero matches across the entire non-`node_modules` tree; secrets are loaded exclusively from `process.env` via `server/_core/env.ts`.
- **Router aggregation and dependency structure are clean.** `server/routers.ts` (91 lines) cleanly composes ~35 router modules with no circular dependencies found between `server/_core`, `server/routers`, and `shared/`.
- **Dependency hygiene is reasonable outside the flagged CVEs.** Only one file (`server/_core/sdk.ts`) uses `axios`; the rest of the codebase uses native `fetch`. No `moment.js` — the project uses the lighter `date-fns`.
- **The team performs its own security self-audits.** `AUDIT_NOTES.md` at repo root documents a genuine multi-tenant isolation review that correctly identified (and, per code review, subsequently fixed) two of three gaps (`properties.completeSetup`, `properties.update`); this is a good practice worth continuing and formalizing (e.g., as a recurring checklist tied to this review's P0/P1 items).

---

## Top 5 Findings (for quick reference)

1. **Unauthenticated tenant-token minting** (`server/routers/tenantPortal.ts:368-459`) — any unauthenticated caller can mint a valid tenant-portal access token for any unit and redirect invite emails, a full auth bypass for the tenant portal.
2. **Real tenant PII and password hashes committed to git** (`db-backup-20260707.sql`, `seed-payload.json`, repo root) — live credential/PII exposure in git history, requires history purge and full credential rotation.
3. **LLM-generated raw SQL execution with a bypassable tenant filter** (`server/routers/nlQuery.ts:33-86`) — a string-substring check is the only thing preventing cross-tenant data access via `sql.raw()`; this was already flagged as a known gap in the team's own `AUDIT_NOTES.md` but never structurally fixed.
4. **Systemic IDOR across 7 routers, 19 occurrences** (`dealPipeline.ts`, `vendors.ts`, `cam.ts`, `sop.ts`, `billing.ts`, `quickbooks.ts`, `workOrderMedia.ts`) — mutations missing the `propertyId` scoping their sibling `list` queries correctly apply.
5. **Unauthenticated S3 document proxy** (`server/_core/storageProxy.ts:5-47`) — no auth check before presigning/redirecting to any storage key, relying solely on key obscurity.

*(Also material: `drizzle-orm@0.44.6` has a high-severity SQL-injection advisory and `vitest@2.1.9` a critical arbitrary-file-execution advisory, both fixable via version upgrade; and client-side code has zero test coverage by `vitest.config.ts` design, not just by omission.)*
