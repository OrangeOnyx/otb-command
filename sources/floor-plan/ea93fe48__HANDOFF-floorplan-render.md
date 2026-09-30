# HANDOFF — Floor plan / tenant logo rendering

**Status:** server side PROVEN correct. Failure is client-side, after a valid redirect.
**Last action:** commit `b481f80` pushed to `main` (service worker bypass for `/manus-storage/`). Auto-deploys on push.
**Written:** 2026-08-04 ~10:00 UTC

---

## 1. READ THIS FIRST — the one thing that matters

Do **not** re-investigate the server. It works. This was verified with live production logs,
not inference:

```
09:47:49 [StorageProxy] req key=floorplans/109-109_First_Floor-1781956603128_dcd3ed52.png user=1 role=admin
09:47:49 [StorageProxy] 307 key=floorplans/109-109_First_Floor-1781956603128_dcd3ed52.png
         -> https://d36hbw14aib5lz.cloudfront.net/310419663028278258/XjbUoLgyj8aX8rvfobVMAN/floorplans/109-...png
```

That is Adam's own browser (user 1, role admin), requesting the exact floor plan that renders
broken, and getting a correct `307`. The same pattern appears for tenant logos
(`otb/documents/u127/...`, `otb/documents/u143/...`) and lease PDFs — all `307`, all fine.

And the CDN URL genuinely serves the file. Fetched with browser-style headers
(`Referer`, `Sec-Fetch-Dest: image`, `Sec-Fetch-Mode: no-cors`, `Sec-Fetch-Site: cross-site`):

```
HTTP/2 200
content-type: image/png
content-length: 54824
cache-control: max-age=31536000
```

No `Cross-Origin-Resource-Policy` header, no referer blocking, no CORS problem.

**Therefore:** the server issues a valid redirect, and the CDN returns a valid image, and the
browser still shows a broken-image icon. The fault is in the browser layer between those two
facts.

---

## 2. Eliminated — do not spend credits re-testing these

| Hypothesis | How it was eliminated |
|---|---|
| Ownership / property scoping | Logs show `user=1 role=admin` and a `307`, not a `403`. Adam is super admin; `resolveAllPropertyIds` returns all 3 property ids. |
| `floor_plans` missing from the proxy's ownership tables | Was a **real** bug, fixed in `4b93ecd`. Now resolves. Confirmed by the `307` above. |
| Supabase signing | Bucket is empty → `sign` returns 400 `NoSuchKey` → code correctly falls through to Forge. Working as designed. |
| Manus Forge presign fallback | Returns 200 with a working CloudFront URL. |
| CloudFront actually serving bytes | 200, 54,824 bytes, `image/png`. |
| Content-Security-Policy | `imgSrc: ["'self'", "data:", "blob:", "https:"]` in `server/_core/index.ts:80`. `https:` permits any HTTPS origin, so CloudFront is allowed. **Not** the blocker. |
| CORS / CORP | CloudFront sends no CORP header. A plain `<img>` is a no-cors subresource; no CORS needed. |
| Session cookie scope | `app_session_id`, `httpOnly`, `path:"/"`, `sameSite:"lax"`, `domain:".<host>"`. Same-origin `<img>` carries it — proven, since the server authenticated the request as user 1. |
| Auth / login | `users.lastSignedIn` updates correctly; logs show authenticated requests. |
| Railway logs being stale | Initially suspected. A control probe confirmed logs ARE fresh — the earlier silence was because the `403` branch had no logging (now fixed). |

---

## 3. Current leading hypothesis (this is what `b481f80` tests)

`client/public/sw.js` has a network-first catch-all:

```js
event.respondWith(fetch(event.request).then((r) => r).catch(() => caches.match(event.request)));
```

`/manus-storage/*` requests are same-origin `<img>` loads (mode `no-cors`) that **307-redirect
cross-origin** to CloudFront. Passing such a request through `fetch()` inside a service worker
and returning the result can yield an opaque response that the browser will not render as an
image — even though the network transaction succeeded. This matches every observed symptom:

- Server logs show success (the request really is made and really is redirected).
- `curl` works (no service worker involved).
- Lease PDFs "work in certain sections" — those open as navigations/downloads, which take the
  `event.request.mode === "navigate"` branch, not the catch-all.
- Floor plans and tenant logos both fail — both are `<img>`, both go through the catch-all.

**Fix shipped in `b481f80`:** early-return (no `respondWith`) for `/manus-storage/`, letting the
browser handle the redirect natively. Also bumped `CACHE_NAME` `otb-ops-v2` → `otb-ops-v3` so
stale service workers activate the new one.

Note: as of the asset copy in §5, the proxy now redirects to a signed **Supabase** URL rather
than CloudFront. It is still a cross-origin 307, so the service-worker hypothesis is unchanged
— but the Manus dependency is out of the picture, which removes one whole class of cause.

### Verifying the fix

The old service worker must be replaced before this takes effect. `sw-register.js` polls
`reg.update()` every 60s, so a reload or two should do it. If it does not:

1. Adam opens the app, force-reloads twice, waits ~60s, reloads again.
2. If still broken, have him fully close the tab/PWA and reopen.
3. Confirm the active SW is `otb-ops-v3`.

### If `b481f80` does NOT fix it — the next test, and it is cheap

Have Adam **tap this link directly** in the browser where he's signed in:

```
https://assetcommand.orangeocean.com/manus-storage/floorplans/109-109_First_Floor-1781956603128_dcd3ed52.png
```

This is a navigation, so it bypasses the `<img>` path entirely.

- **Image displays** → the network path is 100% fine; the bug is purely in how the `<img>`
  loads it. Look at the service worker again, then at `FloorPlanViewer.tsx` `<img>` attributes
  (a stray `crossOrigin` attribute would break it — a `crossorigin` img requires CORS headers
  that CloudFront does not send).
- **Shows `Forbidden` / `Not found` / `Authentication required`** → contradicts the logs;
  re-open the server investigation.
- **Blank / error page** → capture the browser console. iOS Safari console requires a Mac +
  Web Inspector, so it may be faster to reproduce on desktop.

**Strongly recommended before burning more credits: reproduce on a desktop browser** with
DevTools open. One look at the Network tab entry for the floor plan request — status, whether
it was served "from ServiceWorker", and the console error text — resolves this immediately.
Remote log-based debugging of a browser rendering bug is the expensive way to do this, and
that is where most of the spend on this issue went.

---

## 4. Fixes already shipped this session

| Commit | What |
|---|---|
| `4b93ecd` | **Real bug, fixed.** `server/_core/storageProxy.ts` `findOwningPropertyId()` consulted only 6 tables and `floor_plans` was absent, so every floor plan 404'd fail-closed with no logging. Added 7 missing tables (`floor_plans` scopes via `units.propertyId`; SOP tables via `sop_procedures.propertyId`). `tsc` clean, tests 2/2. |
| `0727953` | **Real bug, fixed.** The "All"/More workspace menu was nested inside the `overflow-x-auto` favorites bar in `WorkspaceNav.tsx`. That scroll container is 36px tall and clipped the open panel vertically — it rendered, then was clipped into invisibility. Hoisted it out to be a sibling. Also: storage proxy now logs `401`/`403`/`307` decisions (the `403` branch was silent, which is why this took so long), and fixed dark-blue-on-black text in the `FloorPlanViewer` plan selector. |
| `b481f80` | Service worker bypass for `/manus-storage/` (see §3). Deployed as `9a22cbf7`, SUCCESS 09:50 UTC. Unverified — needs Adam to confirm. |

**Still known-broken, not fixed:** `client/src/components/PylonViewer.tsx:18` hardcodes
`/manus-storage/otb_pylon_logos_render_94878ae6.png`, a key with no DB row anywhere, so it will
always fail the ownership check.

---

## 5. Manus storage dependency — RESOLVED

**Done 2026-08-04 ~10:00 UTC.** The `asset-command` bucket was empty; every asset was being
served through the Manus Forge presign fallback, so cutting off Manus would have 404'd every
historical file.

All **293** storage keys referenced by the database were copied key-for-key from Manus into
Supabase — `ok=293 skip=0 fail=0`, 12 seconds. Source of keys:

| Table.column | Keys |
|---|---|
| `documents.fileKey` | 238 |
| `floor_plans.imageKey` | 54 |
| `appraisals.fileKey` | 1 |

(The other storage-key columns — `views.backgroundKey`, `signs.photoKey`, `pois.photoKey`,
`sop_steps.photoKey`, `sop_completions.photoKey`,
`governance_entities.operatingAgreementFileKey` — are all empty in production.)

Verified end to end afterwards: `POST /storage/v1/object/sign/asset-command/floorplans/109-...png`
returns **200** with a token, and fetching that signed URL returns **200, 54,824 bytes,
`image/png`**. Since `storageGetSignedUrl` tries Supabase first and only falls back to Forge on
error, the app now serves from Supabase and **no longer depends on Manus for reads**.

The copy script is at `copy_assets.py` (idempotent — it HEADs each key first and skips ones
already present, so it is safe to re-run). Note the Google Drive backup in
`drive/OrangeOceanAssetCommand/` holds 561 files, more than the 293 the DB references; the
extras are unreferenced by the app. Copying from Manus rather than Drive avoided any
filename-to-storage-key mapping guesswork.

**Remaining:** the bucket is now populated but Manus is still the *write* path for new uploads.
Decoupling writes is a separate task.

---

## 6. Infrastructure quick reference

**Live app:** https://assetcommand.orangeocean.com
**Repo:** `OrangeOnyx/orange-ocean-asset-command`, `main` @ `b481f80`
**Package manager: pnpm.** npm fails ERESOLVE. A fresh clone needs `pnpm install` — a stale
`node_modules` fails to typecheck `server/storage.ts`.

**Railway** — GraphQL `https://backboard.railway.com/graphql/v2`, `api_credentials=["custom-cred:backboard.railway.com"]`

- Project `OTB Ops`: `83d4369a-018c-4537-a089-76962b580929`
- Environment production: `b9fe978c-5ee7-4446-9042-7280ecc3e857`
- Service `ooac-web`: `4837b69e-8f9e-417f-a836-cfbd52dcb65b` ← verified by re-listing; earlier
  notes had this wrong and it cost a round trip. If a call returns `Not Authorized`, re-list
  services rather than trusting a written-down id.
- Service `otb-ops`: `7d30b91c-bdfa-4c94-9ed2-3b23ad928d42` (superseded)
- Deployment `013fc395-1f11-40e4-ab7c-e298c74c8cee` = commit `0727953`, SUCCESS 08:27 UTC

Log query that works:

```graphql
query L($d:String!){ deploymentLogs(deploymentId:$d, limit:400) { timestamp message } }
```

**Gotcha:** with `api_credentials=["custom-cred:backboard.railway.com"]` set, curls to any other
host fail with `http=000` — the proxy only allows the registered host. Run non-Railway requests
in a separate call with no credentials.

**Supabase:** project `asset-command-prod`, ref `pegmtfjexdzuupubgggv`, bucket `asset-command`.
Do NOT touch `kbhsghodquchkgfdzckc` (`otb-command`, the live predecessor).

**TiDB (live prod, MySQL):** connection string at `/home/user/workspace/drift/dburl.txt`.

```python
import pymysql, urllib.parse as up
u = up.urlsplit(open('/home/user/workspace/drift/dburl.txt').read().strip())
c = pymysql.connect(host=u.hostname, port=u.port or 4000, user=up.unquote(u.username),
                    password=up.unquote(u.password), database=u.path.lstrip('/'),
                    ssl={"ca": "/etc/ssl/certs/ca-certificates.crt"},
                    cursorclass=pymysql.cursors.DictCursor)
```

**Standing constraints:** Do NOT cancel Manus. No registrar access to
`orangeoceanassetcommand.com`. Never run `pnpm db:push` or `drizzle-kit migrate` against
production. UI density problems are global.

---

## 7. Security debt — rotate

**Pasted in plaintext in chat, rotate now:** Supabase `service_role` key for
`asset-command-prod` (HIGH — bypasses RLS); Anthropic key `sk-ant-api03-epXP2…` (never written
to Railway, never used, but exposed in chat and in a screenshot).

**Carried forward:** GoDaddy key+secret+PAT, `SENDGRID_API_KEY`, `UNIFI_API_KEY`, `JWT_SECRET`,
Stripe keys, `BUILT_IN_FORGE_API_KEY`, `VITE_FRONTEND_FORGE_API_KEY`, R2 keys, TiDB password.
Delete `seed-payload.json` and `db-backup-20260707.sql` from the Manus workspace.
`OrangeOnyx/otb-ops-archive` still has PII in git history.

**Temp files with secrets on the session sandbox (chmod 600, shred when done):** `/tmp/sk`,
`/tmp/su`, `/tmp/fk`, `/tmp/fu`, `/tmp/v.json`.

---

## 8. Other open items

- **AI keys:** no new key needed for launch. The Manus Forge key still works (verified 200 on
  `/v1/chat/completions` and full lease-extraction shape with `file_url` + strict json_schema).
  Anthropic would **break** the PDF path — `{"type":"file_url"}` content parts return
  `400 content.str: Input should be a valid string`, which is exactly `leaseExtractor.ts:137`.
  Recommended but not applied: `LLM_MODEL_FAST=gpt-5-mini`,
  `LLM_MODEL_DOCUMENT=gemini-3-flash-preview`. `LLM_CHAT_PATH`, `LLM_MODEL_FAST`,
  `LLM_MODEL_DOCUMENT` are all still missing from Railway.
- **Blocker C:** MySQL-only `MONTH()`, `YEAR()`, `DATE_SUB()` in `server/routers/reports.ts`
  and `server/routers/sop.ts` (Postgres migration only).
- **Blocker D:** `server/routers/nlQuery.ts` generates SQL via LLM — target dialect must switch
  to Postgres.
- **Cloudflare nameserver play** for `orangeoceanassetcommand.com`: NS delegation is not
  transfer-locked. All nine records (ImprovMX MX pair, three SendGrid DKIM CNAMEs) must exist
  in Cloudflare BEFORE flipping NS, or mail dies quietly. Transfer unlocks: `ontheblvdops.com`
  Aug 30, `orangeoceanassetcommand.com` Sep 26.
- **Supabase GitHub integration:** leave unattached. Drizzle in `./drizzle` is the migration
  authority.
- **Framing:** the Postgres migration is an ownership goal, not a go-live requirement.

---

## 9. Process note for the next session

This issue cost far more than it should have. The reason: it was debugged from the server
outward, eliminating one server-side hypothesis at a time, when the symptom (a broken-image
icon in a browser while the server reports success) pointed at the client from the start.

Two concrete rules for the next session:

1. **Get client-side evidence first.** A desktop browser with DevTools open, reproducing the
   bug once, is worth more than a dozen server-side probes.
2. **Do not debug blind for more than two rounds.** If the server says success and the user
   says failure, the instrumentation gap is the bug to fix first — which is what finally
   happened here when `403`/`307` logging was added, and it immediately produced the answer.
