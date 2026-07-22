# 11 — Source-Code Map

System code: **OTBC**. 390 tracked files. Repo root:
`C:\Users\adam\Downloads\otb-command-claude-code-kit\otb-command`.

```
otb-command/
├─ index.html                 # single shell — 12 .page sections; entry → /src/main.js
├─ package.json               # vite 7; deps: anthropic-sdk, supabase-js, three, maplibre, splats-3d
├─ vercel.json                # cron (auto-trigger daily) + CSP/security headers
├─ .vercelignore              # governs deploy uploads (splat/mesh ride though gitignored)
├─ .env.example               # public client vars only
├─ CLAUDE.md / HANDOFF.md / KICKOFF_PROMPT.md   # project memory + live-state handoff
├─ api/                       # Vercel serverless functions
│  ├─ _auth.mjs               # JWT gate + daily caps (fail-open)
│  ├─ _supa.mjs               # Supabase REST wrapper (user-JWT vs secret-RPC families)
│  ├─ _context.mjs            # GENERATED concierge dossier (npm run concierge-context)
│  ├─ _seed.json              # GENERATED confidential seed (npm run split-seed)
│  ├─ concierge.js            # 3-agent AI desk + guardrail buffer + lease tool
│  ├─ voice.js                # ElevenLabs TTS proxy
│  ├─ unifi.mjs               # UniFi Site Manager proxy
│  ├─ seed.js                 # auth-gated confidential seed
│  └─ auto-trigger.mjs        # daily cron: triggers + monthly brief + rent charges
├─ src/
│  ├─ main.js                 # boot: auth → seed → hydrate → nav/role shell → init views
│  ├─ store.js                # localStorage write-through store + export/import + events
│  ├─ styles.css              # plan-room design tokens + dark theme + print CSS
│  ├─ data/                   # 19 JSON files — runtime data (see 05-data-model.md)
│  ├─ lib/                    # 40 modules — pure seams (see below)
│  └─ views/                  # 14 modules — one per sheet + drawer + search
├─ supabase/security-model.sql  # RLS snapshot + migration list (authoritative history in Supabase)
├─ docs/
│  ├─ sot-2026-07/            # governed SOT CSVs (authority-ranked)
│  ├─ c3-stall-zones.json     # camera stall quads
│  ├─ *.md                    # parking memo, SOT reconciliation, roof brief, camera 4D brief,
│  │                          # path-b scope, CSP checklist, marketing package
│  ├─ graph/                  # knowledge-graph pipeline (+post-commit refresh)
│  └─ superpowers/            # P6 specs/plans (all shipped)
├─ test/                      # 29 files, 197 tests, native node:test
├─ tools/                     # 35 generators/pipelines (node+python+powershell)
│  ├─ export-package.mjs / split-seed.mjs / build-concierge-context.mjs
│  ├─ extract-{geometry,hvac,recoveries,vendors,heights,georef}.py|mjs  # SOT/DXF → src/data
│  ├─ fit-georef.py / fit-splat-align.mjs / build-sat-base.py           # computational fits
│  ├─ poster.py / poster-specials.py / pylon.py / vinyl-b1.py / case-study-c1.py / otb_brand.py
│  ├─ proforma.py / make-logo-thumbs.py / plat.py / measure-liquor3.py
│  ├─ cube-frames.mjs / cube-backfill.mjs / c3-stalls.py / c3-overlay.py / c3-upload.mjs
│  ├─ c3-nightly.ps1 / sampler-watchdog.ps1                             # scheduled tasks
│  ├─ convert-splat.mjs / build-mesh-glb.py / unifi-probe.mjs
│  └─ brand-assets/           # vendored logos (sources for public/tenant-logos)
├─ cad/Boulev_CLEAN.dxf       # architect's plat, AutoCAD R14, feet
├─ public/                    # sat base, floorplan, plat render, tenant logos (+deployed splat/mesh)
└─ reference/                 # plat crops used for tracing (evidence trail)
```

## Critical files (why they matter)

| File | Why critical |
|---|---|
| src/store.js | The persistence contract — every mutation write-through + events; validated import |
| src/lib/layers.js | Single registry that store shape, resets, export AND remote sync derive from |
| src/lib/remote.js | The entire Supabase seam; REMOTE flag = local-mode degradation switch |
| src/lib/pages.js | Nav/rôle-whitelist/print single source |
| src/data/geometry.json | Legal geometry of record (REV 12) — plat, parking, easements, liquor line |
| docs/sot-2026-07/ | Economics authority; carries its own governance |
| api/concierge.js | All AI behavior: personas, CORE rules, guardrail wiring, tools |
| src/lib/calc/* + guardrail | Deterministic domain math + anti-hallucination boundary |
| supabase/security-model.sql | Reviewable security posture + migration ledger |
| tools/split-seed.mjs | The confidentiality boundary (public skeleton vs gated seed) |
| test/data-integrity.test.mjs | Pins audit-grade invariants + stated-rent exceptions |

## Entry points
Browser: index.html → src/main.js. Server: api/*.js per route. Cron:
/api/auto-trigger. Local scheduled: c3-nightly.ps1, sampler-watchdog.ps1.
Tooling: npm scripts (package.json:6-24).

## Generated files (never hand-edit)
api/_context.mjs · api/_seed.json · src/data/units.public.json ·
src/data/logo-thumbs.json · src/data/heights.json · src/data/footprints-geo.json ·
src/data/sat-base.json · src/data/splat-align.json · src/data/hvac.json ·
src/data/recoveries.json · src/data/vendors.json · public/tenant-logos/ ·
public/OTB-sat-base.jpg. Each has a regeneration command; forgetting to re-run
split-seed/concierge-context after data edits is the known footgun class.

## Tests (197, native node:test, no framework)
Coverage is seam-shaped: every pure lib module has a test file (calc, ledger,
coi, brief, cards, occupancy, parking, guardrail, compevents, autotrigger,
seed round-trip, bucketstore, iso, geoproject, scene3d-layout, splat-align,
search, pages, layers, lease, docs, safe, vendors, cameras, unifi, printsheet,
colors, brief) + `data-integrity.test.mjs`. NOT covered: views (DOM), api
handlers (concierge accepted as live-smoke-only), store.js internals beyond
round-trip.

## Dead / duplicate / incomplete code
- Six independent `esc()` copies remain in tools/server contexts (app render
  layer consolidated to lib/format.js — 14 importers; the 7-place patch surface
  is a traced, known finding in the knowledge graph).
- Duplicated `fmtSize`/`fmtWhen`/`todayISO` in views/safe.js + vendorportal.js.
- `ENV_BOX` vs `FAC` near-duplicate envelope math in plan.js:33-47.
- Hardcoded facts in views (parking 324/344, JD Bank date, covenant prose).
- measure-liquor3.py ("pass 3") — exploratory artifact, keep as provenance.
- Removed baseline `OTB_Command_v7.html` recoverable at git 81b1541.
- No unreachable exports found in views/lib sweep (agents checked).

## High-risk dependencies
None runtime-critical beyond the big four (supabase-js, anthropic-sdk, three,
maplibre); gaussian-splats-3d (0.4.x, niche) is the most fragile — pinned and
lazy-loaded, degradation = lens absent. Python tooling deps (ezdxf, Pillow,
openpyxl, segno) are offline-only.
