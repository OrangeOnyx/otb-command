# 03 — User Roles and Permissions

System code: **OTBC** (OTB Property Command). Evidence level noted per finding:
VERIFIED = confirmed in code/SQL in this repo; STRONGLY INFERRED = follows
directly from code but not observed live; DISCUSSED ONLY = design conversation.

Authoritative sources: `supabase/security-model.sql` (RLS snapshot, audit L16,
2026-07-10, updated through migration `ledger_lite` 2026-07-21), `api/_auth.mjs`,
`HANDOFF.md` security-audit section.

## Role model — VERIFIED

Roles live in `public.profiles.role`, assigned at first magic-link sign-in by the
`handle_new_user()` trigger (security-model.sql:66-80). Resolution order:

1. Email matches an **active vendor** in `public.vendors` → role `vendor`
2. Email in `public.authorized_emails` allowlist → that row's role (usually `owner`)
3. Otherwise → **`pending`** (holding-pen screen, no data access)

There is **no self-escalation path**: profiles has no self-INSERT/UPDATE policy;
only the trigger inserts and only operators can UPDATE roles
(security-model.sql:83-84). Client role resolution fails closed to `pending`
(2026-07-08 audit fix).

### 1. `operator` (Adam — property manager, full control)

| Capability | Grant | Evidence |
|---|---|---|
| View everything (all sheets, all state, all buckets) | RLS `is_operator()` in every table | VERIFIED security-model.sql |
| Create/modify/delete `property_state` (all persisted layers) | INSERT/UPDATE/DELETE `is_operator()` | VERIFIED :85 |
| Manage sign-in access (pre-authorize owners, revoke) | `authorized_emails` ALL `is_operator()` | VERIFIED :86 |
| Manage vendors, read vendor audit log | vendors ALL; vendor_log SELECT | VERIFIED :87-88 |
| Write to all storage buckets (assets/documents/safe) | INSERT/UPDATE/DELETE `is_operator()` | VERIFIED :95-97 |
| Owner Safe: upload/delete + read `safe_log` access audit | safe write; safe_log SELECT operator-only | VERIFIED :89,97 |
| AI Agent Desk: all three agents; full thread desk (all users' threads) | `owns_thread()` grants operator every thread | VERIFIED :40-48 |
| Lease-package assembly tool (`assemble_lease_package`) | enforced **server-side** operator-only | VERIFIED HANDOFF (Agent Desk section), api/concierge.js |
| Ledger: post payments/charges/credits/voids | ledger_entries INSERT `is_operator()` | VERIFIED :118-121 |
| Camera drag-to-place adjustments (✎ Adjust) | operator-only UI chip | VERIFIED HANDOFF 2026-07-15 |
| Toggle which sheets owners can see ("Owners can see…") | ownerSheets whitelist in property_state | VERIFIED HANDOFF 2026-07-08 |

### 2. `owner` (LLC members / investors — read-oriented)

| Capability | Grant | Evidence |
|---|---|---|
| Read `property_state` (all persisted layers) | SELECT `is_owner_or_operator()` | VERIFIED :85 |
| Read assets, documents, **Owner Safe** buckets (signed URLs) | SELECT `is_owner_or_operator()` | VERIFIED :95-97 |
| Read vendor roster (read-only V-1 face) | vendors SELECT `is_owner_or_operator()` | VERIFIED :87 + `portalFace` seam lib/vendors.js |
| Use AI concierge + voice (if sheet enabled), own threads only | chat RLS + api/_auth gate | VERIFIED :90-91 |
| Read owner briefs, ledger entries (read-only) | SELECT `is_owner_or_operator()` | VERIFIED :100,118 |
| Sheet visibility controlled by operator whitelist | `ownerSheets` (default: AI-1 off; live config = all 12 on) | VERIFIED HANDOFF 2026-07-08 |
| **Cannot** write anything: no property_state/bucket/ledger writes | absence of policies | VERIFIED |
| Safe views are audit-logged (owner sees no log) | safe_log INSERT on view; SELECT operator | VERIFIED :89 |

### 3. `vendor` (service vendors, e.g. Butcher AC — own folder only)

| Capability | Grant | Evidence |
|---|---|---|
| Sign in with roster email → one-sheet shell (V-1 only, nav locked) | role-vendor CSS + nav lock | VERIFIED HANDOFF P3 |
| Read own vendor row | vendors SELECT `id = current_vendor_id()` | VERIFIED :87 |
| Read + upload ONLY `vendor-docs/<their-id>/…` | storage policy foldername[1]=current_vendor_id() | VERIFIED :98 |
| See own COI status + renewal nudge | vendor face, lib/coi.js | VERIFIED HANDOFF 2026-07-20 |
| Sealed out of: safe, documents, assets, property_state, concierge (403), voice, ledger | absence of policies + api/_auth 403 | VERIFIED :95-98 + api/_auth.mjs |

### 4. `pending` (unrecognized sign-in — no access)

Holding-pen screen only; no RLS grants anywhere. Operator promotes via the
Sign-in access panel ("make owner") or Supabase console. VERIFIED (P3 migration
notes; previously new sign-ins defaulted to `owner` — closed as a security fix
2026-07-08).

### Server-side (non-user) actor: cron / secret-gated RPCs

`api/auto-trigger.mjs` (Vercel cron, daily 11:00 UTC — vercel.json:4) is the only
unauthenticated write path. It authenticates with `CRON_SECRET` against the
`app_secrets` table (deny-all RLS, readable only inside SECURITY DEFINER fns):

- `open_trigger_thread` — idempotently seeds AI-1 threads (holdover/renewal/etc.) — VERIFIED :111-116
- `get/put_owner_brief`, `get_brief_state` — monthly Owner Intelligence Brief, insert-once per month — VERIFIED :103-107
- `post_rent_charges` — month's rent charges, deterministic ids `rent:YYYY-MM:unit`, idempotent — VERIFIED :122-125
- `post_occupancy_samples` — C3 parking occupancy JSONL upload (migration `c3_occupancy`) — VERIFIED HANDOFF 2026-07-22

No service-role key is used anywhere (2026-07-08 audit finding: "no service-role
bypass") — VERIFIED.

## Sensitive actions requiring confirmation — VERIFIED

- Late fees are **suggest-only**: the ledger computes a suggestion chip; the
  operator confirms before the fee posts (lib/ledger.js, operator decision 3A).
- Lease packages are stamped "DRAFT — subject to legal review"; email delivery is
  deliberately human-in-the-loop (mailto, no server send).
- Voids don't delete: append-only `void_of` entries preserve the money trail.
- Rate limits: per-user daily caps concierge=200 / voice=150 via
  `check_and_bump_usage` (security-model.sql:51-62).

## Missing permission controls / gaps

- **No approval workflows** (invoice approval thresholds, PO approval): the system
  has no invoice/PO module at all — UNKNOWN/absent by design (single
  owner-operator; see 12-weaknesses).
- **Documents bucket** read is `is_owner_or_operator()` — owners can read every
  register document; there is no per-document owner scoping — VERIFIED :96.
  Acceptable for this org shape; a multi-tenant rebuild needs per-org scoping.
- **No MFA / CAPTCHA**: CAPTCHA is an open operator console task (punch-list #3);
  magic-link is the only factor — VERIFIED HANDOFF.
- **Demotion**: revoking a pre-authorization does not demote an existing profile
  (manual Supabase edit) — VERIFIED HANDOFF sign-in-access section.
- **Client-side CSS enforcement**: owner read-only faces (e.g. ledger drawer,
  vendor roster) are partly CSS-hidden; the DB layer is the real boundary and
  holds (2026-07-08 multi-agent audit: "fails closed"), but a rebuild should not
  copy the CSS-as-permission pattern for anything not backed by RLS.

## Recommended RBAC structure for a rebuild

Keep the 4-role lattice + trigger-resolved onboarding (it is simple and airtight)
but generalize:

1. `org_id` on every row (multi-property/multi-org readiness).
2. Replace role strings with a `role → capability` table (view_financials,
   write_ledger, manage_users, vendor_scope) so owner variants (e.g.
   "owner-no-financials" for the buyer-view use case) don't need code changes.
3. Preserve: append-only money/audit tables, secret-gated definer RPCs for
   automation, deny-all-by-default RLS, no service-role key in app code.
