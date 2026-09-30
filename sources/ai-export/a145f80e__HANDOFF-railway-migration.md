# Handoff — Orange Ocean Asset Command: Manus → Railway migration

**Written:** 2026-08-03 ~01:10 CDT
**Prior session:** https://www.perplexity.ai/computer/tasks/2141f87a-bd4a-4318-8802-d5d6db7ccc6d
**Status:** App is live and healthy on Railway with the production database and full
environment. `next.` subdomain DNS is propagated; TLS cert was still issuing at handoff.
Apex cutover has **not** happened — the live site still serves from Manus.

---

## 1. Where things stand

| Thing | State |
|---|---|
| Railway build + deploy | ✅ SUCCESS (`4f6b5eff-e880-4810-b673-23c9bc57e514`) |
| `/api/health` | ✅ `{"status":"ok","db":"connected"}` |
| Production DB (TiDB) | ✅ connected, 66 tables / 74 users / 3 properties |
| Env vars | ✅ all 22 known values loaded |
| Landing + login pages | ✅ render correctly, logo fixed |
| `next.` DNS | ✅ propagated globally → `69.46.46.101` |
| `next.` TLS cert | ⏳ `VALIDATING_OWNERSHIP` at handoff |
| Smoke test (login/maps/uploads) | ❌ not yet run |
| Apex cutover | ❌ not started |
| Credential rotation | ❌ not started |

**Working URL right now:** https://ooac-web-production.up.railway.app

---

## 2. Immediate next steps, in order

1. **Confirm the cert issued.** Query `customDomain` (see §4 for the exact call). Once it
   returns `CERTIFICATE_STATUS_TYPE_ISSUED`, https://next.orangeoceanassetcommand.com works.
   If it's still validating after ~30 min, delete and re-add the custom domain in Railway.
2. **Smoke test on `next.`** — see §6 checklist. This is the real gate. Nothing below
   should happen until login works.
3. **Decide the apex approach** — see §7. This is a genuine decision, not a mechanical step.
4. **Cut over**, then **rotate credentials** (§8).

---

## 3. How to probe the deployed app

⚠️ **`curl` and `fetch_url` are both blocked from the sandbox to `*.up.railway.app`** —
the sandbox egress proxy returns `403` on CONNECT. This produced ~30 minutes of phantom
"site is down" readings in the prior session. The app was fine the whole time.

Use this instead:

```
pplx-tool screenshot_page   with api_credentials=["pplx-tool:screenshot_page"]
{"url":"https://ooac-web-production.up.railway.app/api/health"}
```

`curl` to `backboard.railway.com`, `api.cloudflare.com`, `orangeoceanassetcommand.com`,
and `*.globaldomaingroup.com` all work normally. It's specifically the Railway app domain.

---

## 4. Railway API

GraphQL at `https://backboard.railway.com/graphql/v2`, via `bash` with
`api_credentials=["custom-cred:backboard.railway.com"]`. Credential is thread-scoped —
**a new session will need it re-approved or re-entered.** UUID `f1adaf7b-87ec-42b7-8e45-dd4b03731ec7`.

| Resource | ID |
|---|---|
| Project "OTB Ops" | `83d4369a-018c-4537-a089-76962b580929` |
| Environment `production` | `b9fe978c-5ee7-4446-9042-7280ecc3e857` |
| Service `ooac-web` | `4837b69e-8f9e-417f-a836-cfbd52dcb65b` |
| Service instance | `a12da8df-0a37-4816-be4b-a528d415864e` |
| Service domain (`ooac-web-production.up.railway.app`) | `a1586576-f967-4c26-805e-c419c5ebc2a2` |
| Custom domain `orangeoceanassetcommand.com` | `fb76f532-4250-40e3-8094-297de87b8a12` → CNAME `8bsh60sj.up.railway.app` |
| Custom domain `next.orangeoceanassetcommand.com` | `c7bca7ad-09ab-4dd4-b129-fbd7a7647018` → CNAME `j5qvod4g.up.railway.app` |
| Orphaned empty service `otb-ops` (delete me) | `7d30b91c-bdfa-4c94-9ed2-3b23ad928d42` |

**Mutation shapes that actually work** (these took trial and error):

```graphql
# env vars — note the nested `input`
mutation($input: VariableCollectionUpsertInput!){ variableCollectionUpsert(input: $input) }
# input: {projectId, environmentId, serviceId, variables:{KEY:"value"}}

# deploy
mutation($sid:String!,$eid:String!){ serviceInstanceDeployV2(serviceId:$sid, environmentId:$eid) }

# cert status — projectId is REQUIRED even though it looks redundant
query($id:String!,$p:String!){ customDomain(id:$id, projectId:$p){ status { certificateStatus dnsRecords { status currentValue } } } }

# service domain — `domain` is REQUIRED on update even when unchanged
mutation { serviceDomainUpdate(input:{serviceDomainId, domain, targetPort, serviceId, environmentId}) }
```

Gotchas:
- The token is a **team/workspace token** — `me` and `githubRepos` return "Not Authorized".
- **Custom domain limit is 2 per service** on this plan, and both slots are used.
  Plan: after apex cutover, delete `next.` and add `ontheblvdops.com`; serve `www.`
  via a redirect at the DNS/edge layer.
- Railway's API reports `builder: "RAILPACK"` while `railway.toml` requests `DOCKERFILE`.
  **Unresolved.** Builds succeed, but if Railpack is genuinely the builder, `VITE_*`
  build args may not be injected as the Dockerfile intends. Worth confirming in build
  logs — a mis-baked frontend bundle looks fine until you click Sign In.

---

## 5. DNS — this is not Cloudflare

Both domains are on **`ns1/ns2.globaldomaingroup.com`**, managed through a registrar
panel Adam has UI access to. The `104.18.26.246` address is a Cloudflare IP, but it's
**Manus's** Cloudflare, not Adam's. Adam's own Cloudflare account has zero zones —
confirmed by both the API (`/zones` → count 0) and the dashboard.

**Consequence:** the `cloudflare_api_key__pipedream` connector, the saved
`custom-cred:api.cloudflare.com` token, and the R2 token are all useless for DNS here.
Don't burn time on them again. DNS changes are manual, by Adam, in that panel.

### Current records — `orangeoceanassetcommand.com`

| Type | Name | Value |
|---|---|---|
| A | @ | `104.18.26.246` ← Manus |
| A | www | `104.18.26.246` ← Manus |
| CNAME | next | `j5qvod4g.up.railway.app` ← added, propagated |
| MX | @ | `10 mx1.improvmx.com` |
| MX | @ | `20 mx2.improvmx.com` |
| TXT | @ | `v=spf1 include:spf.improvmx.com include:sendgrid.net ~all` |
| CNAME | em9429 | `u110691645.wl146.sendgrid.net` |
| CNAME | s1._domainkey | `s1.domainkey.u110691645.wl146.sendgrid.net` |
| CNAME | s2._domainkey | `s2.domainkey.u110691645.wl146.sendgrid.net` |

`ontheblvdops.com` has only `A @` and `A www`, both `104.18.26.246`. No mail.

🚨 **The MX, SPF, and three SendGrid CNAMEs must survive any nameserver migration.**
Inbound mail (ImprovMX forwarding) and outbound DKIM both die silently without them,
and you won't notice for days.

---

## 6. Smoke test checklist for `next.`

Run these before touching the apex. Every one exercises a live Manus dependency that
could break off-platform.

- [ ] **Login** — OAuth against `api.manus.im`. Highest risk; `VITE_APP_ID` and
      `VITE_FRONTEND_FORGE_API_KEY` are baked at build time.
- [ ] **Session persistence** — reload after login. Validates `JWT_SECRET`.
- [ ] **Site plan canvas / maps** — Google Maps JS injected via the Forge proxy.
      Validates `CSP_MAPS_ORIGIN` == `VITE_FRONTEND_FORGE_API_URL` (both `https://forge.manus.ai`).
- [ ] **File upload + download** — `/manus-storage/*` proxy, needs `BUILT_IN_FORGE_API_*`.
- [ ] **Any mutation** — validates CSRF double-submit + the CORS allowlist.
- [ ] **Tenant portal** — separate auth path.
- [ ] **Browser console** — check for CSP violations. Four have already been found and
      fixed this way (fonts, maps, workers, analytics); assume there's a fifth.

---

## 7. The apex problem — decision needed

Railway gives a **CNAME** target (`8bsh60sj.up.railway.app`). DNS doesn't allow CNAME at
the zone apex, and most traditional DNS hosts can't fake it. So `orangeoceanassetcommand.com`
(bare, no www) may not be pointable at Railway from the current panel at all.

**Option A — move both zones to Cloudflare.** CNAME flattening solves apex cleanly and
restores API-driven DNS for future work. Cost: nameserver change at the registrar, and
all 9 records above must be recreated in Cloudflare *first* or mail breaks.
**Option B — check for ALIAS/ANAME support** in the current panel. Some registrars have
it. One record, no nameserver move. Check this first — it's the cheapest win.
**Option C — serve from `www.` or `app.`** and 301 the apex. Least disruptive, changes
the canonical URL.

Recommendation: check B, fall back to A.

---

## 8. Credential rotation — all exposed in the prior thread

Everything below was pasted in plaintext into the previous session and should be rotated.

- `SENDGRID_API_KEY`
- `UNIFI_API_KEY`
- `JWT_SECRET` ← **rotate during the cutover window** — it invalidates every active session
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (test mode, lower urgency)
- `BUILT_IN_FORGE_API_KEY`, `VITE_FRONTEND_FORGE_API_KEY`
- Cloudflare R2 Access Key ID + Secret Access Key
- TiDB password (in `DATABASE_URL`)

Also outstanding: `OrangeOnyx/otb-ops-archive` still contains pre-purge PII in its git
history (bcrypt hashes, 32 email addresses, the production TiDB hostname). It's retained
for rollback. Delete or scrub it once the cutover is confirmed stable.

🚨 **`seed-payload.json` and `db-backup-20260707.sql` still exist in the Manus workspace.**
These are the exact files purged from git history. Manus mirrors its workspace to GitHub —
if it ever pushes again, the PII walks straight back into the repo and the purge is undone.
**Delete them in Manus.**

---

## 9. Database safety

- Verified: TiDB v8.5.3-serverless, 66 tables, 74 users, 3 properties. No IP allowlist issues.
- **`__drizzle_migrations` has exactly 1 row** (hash `814a08e4…`, 2026-06-10) against
  **32 journal entries / 34 `.sql` files**. The schema was applied with `drizzle-kit push`,
  which doesn't record each migration — so the ledger is effectively empty while the
  database is fully built out.
- 🚨 **Never run `pnpm db:push` or `drizzle-kit migrate` against production.** It would
  try to replay all 32 migrations against populated tables.
- **Deploys are safe** — there is no `migrate()` call anywhere in `server/`, and the
  Dockerfile CMD is just `node dist/index.js`. Nothing runs at boot.

---

## 10. Code changes made this session

Repo `OrangeOnyx/orange-ocean-asset-command`, branch `main`. Local clone at
`/home/user/workspace/ooac`. Access via `bash` with `api_credentials=["github"]`.

| Commit | What |
|---|---|
| `91e9327` | CSP: added `fonts.googleapis.com`, `fonts.gstatic.com`, maps origin to script/connect-src; `workerSrc: ['self','blob:']`. Healthcheck `/api/trpc/auth.me` → `/api/health`, timeout 30→300 |
| `6d54183` | CSP: allow the Umami analytics origin. `client/index.html` loads `<script src="%VITE_ANALYTICS_ENDPOINT%/umami">`; under `'self'`-only script-src the browser downloaded it and refused to execute — analytics silently recorded nothing |
| `c4e0d24` | Committed `client/public/brand/oo-logo-mark.png` (pulled from the live site, cream matte keyed out for the dark header) |
| `c3ac748` | Repointed all 9 hardcoded logo refs off `/manus-storage` |

### Two findings worth carrying forward

**`VITE_APP_LOGO` is dead config.** Nothing in `client/` reads it. The logo path is
hardcoded in eight components (Login, Register, ForgotPassword, ResetPassword,
OnboardingWizard, three spots in OtbApp) plus `scheduledTrialExpiry.ts`. Setting the
env var does nothing. It's still set on Railway and is harmless, but don't trust it.

**Manus intercepts `/manus-storage/*` at the platform layer.** The app's own
`storageProxy.ts` requires an authenticated session (there's a deliberate auth
regression test on it). On Manus the platform serves that path before the app sees it;
anywhere else it 401s. This was invisible in the code — it was only caught by
screenshotting the live Manus site next to Railway and comparing. **Assume there are
other hidden platform interceptions of this kind.** When something works on Manus and
not on Railway, suspect the platform layer before suspecting the code.

---

## 11. Environment variables on Railway (all set)

```
VITE_APP_ID=XjbUoLgyj8aX8rvfobVMAN
OAUTH_SERVER_URL=https://api.manus.im          ← .im, NOT .ai (I got this wrong once)
VITE_OAUTH_PORTAL_URL=https://manus.im
JWT_SECRET, OWNER_NAME, OWNER_OPEN_ID, VITE_OWNER_OPEN_ID
BUILT_IN_FORGE_API_URL=https://forge.manus.ai
BUILT_IN_FORGE_API_KEY
VITE_FRONTEND_FORGE_API_URL=https://forge.manus.ai
VITE_FRONTEND_FORGE_API_KEY
CSP_MAPS_ORIGIN=https://forge.manus.ai         ← must equal VITE_FRONTEND_FORGE_API_URL
VITE_APP_TITLE, VITE_APP_LOGO (dead), DATABASE_URL
SENDGRID_API_KEY / _FROM_EMAIL / _FROM_NAME
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, VITE_STRIPE_PUBLISHABLE_KEY  (test mode)
UNIFI_API_KEY, VOICE_WEBHOOK_SECRET
VITE_ANALYTICS_ENDPOINT=https://manus-analytics.com, VITE_ANALYTICS_WEBSITE_ID
CORS_ALLOWED_ORIGINS=https://orangeoceanassetcommand.com,https://ontheblvdops.com
NL_QUERY_ENABLED=false, NODE_ENV
```

Not set (were "Not set" in Manus too, or unused): `QUICKBOOKS_CLIENT_ID`, `ELEVENLABS_API_KEY`.

⚠️ `CORS_ALLOWED_ORIGINS` does **not** include `next.orangeoceanassetcommand.com`. If a
smoke test hits CORS errors on `next.`, add it temporarily.

⚠️ `VITE_*` values are **build-time**. Changing one requires a rebuild, not just a restart.

---

## 12. Scope reminder

Tonight is a **hosting move only, not Manus independence.** Still live dependencies:
OAuth (`api.manus.im`), storage proxy, LLM gateway (`forge.manus.im` is a hardcoded
fallback at `llm.ts:218,440`), cron heartbeat, notifications, and TiDB. Cutting those is
the separate 6-wave plan. R2 is now provisioned and `@aws-sdk/client-s3` is already a
dependency — `server/storage.ts` is the only file that needs rewriting for Wave 3.

Repo uses **pnpm**. `npm install` fails with ERESOLVE
(`@builder.io/vite-plugin-jsx-loc` peer-requires vite ^4||^5; repo has vite 7.3.6).
