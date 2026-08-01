# 11 â€” Source-Code Map

System code: **OTBC**. 390 tracked files. Repo root:
`C:\Users\adam\Projects\otb-command-claude-code-kit\otb-command`.

```
otb-command/
â”œâ”€ index.html                 # single shell â€” 12 .page sections; entry â†’ /src/main.js
â”œâ”€ package.json               # vite 7; deps: anthropic-sdk, supabase-js, three, maplibre, splats-3d
â”œâ”€ vercel.json                # cron (auto-trigger daily) + CSP/security headers
â”œâ”€ .vercelignore              # governs deploy uploads (splat/mesh ride though gitignored)
â”œâ”€ .env.example               # public client vars only
â”œâ”€ CLAUDE.md / HANDOFF.md / KICKOFF_PROMPT.md   # project memory + live-state handoff
â”œâ”€ api/                       # Vercel serverless functions
â”‚  â”œâ”€ _auth.mjs               # JWT gate + daily caps (fail-open)
â”‚  â”œâ”€ _supa.mjs               # Supabase REST wrapper (user-JWT vs secret-RPC families)
â”‚  â”œâ”€ _context.mjs            # GENERATED concierge dossier (npm run concierge-context)
â”‚  â”œâ”€ _seed.json              # GENERATED confidential seed (npm run split-seed)
â”‚  â”œâ”€ concierge.js            # 3-agent AI desk + guardrail buffer + lease tool
â”‚  â”œâ”€ voice.js                # ElevenLabs TTS proxy
â”‚  â”œâ”€ unifi.mjs               # UniFi Site Manager proxy
â”‚  â”œâ”€ seed.js                 # auth-gated confidential seed
â”‚  â””â”€ auto-trigger.mjs        # daily cron: triggers + monthly brief + rent charges
â”œâ”€ src/
â”‚  â”œâ”€ main.js                 # boot: auth â†’ seed â†’ hydrate â†’ nav/role shell â†’ init views
â”‚  â”œâ”€ store.js                # localStorage write-through store + export/import + events
â”‚  â”œâ”€ styles.css              # plan-room design tokens + dark theme + print CSS
â”‚  â”œâ”€ data/                   # 19 JSON files â€” runtime data (see 05-data-model.md)
â”‚  â”œâ”€ lib/                    # 40 modules â€” pure seams (see below)
â”‚  â””â”€ views/                  # 14 modules â€” one per sheet + drawer + search
â”œâ”€ supabase/security-model.sql  # RLS snapshot + migration list (authoritative history in Supabase)
â”œâ”€ docs/
â”‚  â”œâ”€ sot-2026-07/            # governed SOT CSVs (authority-ranked)
â”‚  â”œâ”€ c3-stall-zones.json     # camera stall quads
â”‚  â”œâ”€ *.md                    # parking memo, SOT reconciliation, roof brief, camera 4D brief,
â”‚  â”‚                          # path-b scope, CSP checklist, marketing package
â”‚  â”œâ”€ graph/                  # knowledge-graph pipeline (+post-commit refresh)
â”‚  â””â”€ superpowers/            # P6 specs/plans (all shipped)
â”œâ”€ test/                      # 29 files, 197 tests, native node:test
â”œâ”€ tools/                     # 35 generators/pipelines (node+python+powershell)
â”‚  â”œâ”€ export-package.mjs / split-seed.mjs / build-concierge-context.mjs
â”‚  â”œâ”€ extract-{geometry,hvac,recoveries,vendors,heights,georef}.py|mjs  # SOT/DXF â†’ src/data
â”‚  â”œâ”€ fit-georef.py / fit-splat-align.mjs / build-sat-base.py           # computational fits
â”‚  â”œâ”€ poster.py / poster-specials.py / pylon.py / vinyl-b1.py / case-study-c1.py / otb_brand.py
â”‚  â”œâ”€ proforma.py / make-logo-thumbs.py / plat.py / measure-liquor3.py
â”‚  â”œâ”€ cube-frames.mjs / cube-backfill.mjs / c3-stalls.py / c3-overlay.py / c3-upload.mjs
â”‚  â”œâ”€ c3-nightly.ps1 / sampler-watchdog.ps1                             # scheduled tasks
â”‚  â”œâ”€ convert-splat.mjs / build-mesh-glb.py / unifi-probe.mjs
â”‚  â””â”€ brand-assets/           # vendored logos (sources for public/tenant-logos)
â”œâ”€ cad/Boulev_CLEAN.dxf       # architect's plat, AutoCAD R14, feet
â”œâ”€ public/                    # sat base, floorplan, plat render, tenant logos (+deployed splat/mesh)
â””â”€ reference/                 # plat crops used for tracing (evidence trail)
```

## Critical files (why they matter)

| File | Why critical |
|---|---|
| src/store.js | The persistence contract â€” every mutation write-through + events; validated import |
| src/lib/layers.js | Single registry that store shape, resets, export AND remote sync derive from |
| src/lib/remote.js | The entire Supabase seam; REMOTE flag = local-mode degradation switch |
| src/lib/pages.js | Nav/rÃ´le-whitelist/print single source |
| src/data/geometry.json | Legal geometry of record (REV 12) â€” plat, parking, easements, liquor line |
| docs/sot-2026-07/ | Economics authority; carries its own governance |
| api/concierge.js | All AI behavior: personas, CORE rules, guardrail wiring, tools |
| src/lib/calc/* + guardrail | Deterministic domain math + anti-hallucination boundary |
| supabase/security-model.sql | Reviewable security posture + migration ledger |
| tools/split-seed.mjs | The confidentiality boundary (public skeleton vs gated seed) |
| test/data-integrity.test.mjs | Pins audit-grade invariants + stated-rent exceptions |

## Entry points
Browser: index.html â†’ src/main.js. Server: api/*.js per route. Cron:
/api/auto-trigger. Local scheduled: c3-nightly.ps1, sampler-watchdog.ps1.
Tooling: npm scripts (package.json:6-24).

## Generated files (never hand-edit)
api/_context.mjs Â· api/_seed.json Â· src/data/units.public.json Â·
src/data/logo-thumbs.json Â· src/data/heights.json Â· src/data/footprints-geo.json Â·
src/data/sat-base.json Â· src/data/splat-align.json Â· src/data/hvac.json Â·
src/data/recoveries.json Â· src/data/vendors.json Â· public/tenant-logos/ Â·
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
  layer consolidated to lib/format.js â€” 14 importers; the 7-place patch surface
  is a traced, known finding in the knowledge graph).
- Duplicated `fmtSize`/`fmtWhen`/`todayISO` in views/safe.js + vendorportal.js.
- `ENV_BOX` vs `FAC` near-duplicate envelope math in plan.js:33-47.
- Hardcoded facts in views (parking 324/344, JD Bank date, covenant prose).
- measure-liquor3.py ("pass 3") â€” exploratory artifact, keep as provenance.
- Removed baseline `OTB_Command_v7.html` recoverable at git 81b1541.
- No unreachable exports found in views/lib sweep (agents checked).

## High-risk dependencies
None runtime-critical beyond the big four (supabase-js, anthropic-sdk, three,
maplibre); gaussian-splats-3d (0.4.x, niche) is the most fragile â€” pinned and
lazy-loaded, degradation = lens absent. Python tooling deps (ezdxf, Pillow,
openpyxl, segno) are offline-only.
