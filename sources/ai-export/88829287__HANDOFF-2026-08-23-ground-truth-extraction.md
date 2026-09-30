# HANDOFF — 2026-08-23 — Atlas × Asset Command Ground-Truth Extraction

**Session date:** Sunday, August 23, 2026 (early AM CDT)
**Author:** Perplexity Computer session for Adam Abdalla
**Status:** COMPLETE — extraction finished, all verification checks passed, artifacts committed to project repo (`5880ab8`)

---

## 1. What this session did

Executed the "POWER PROMPT — Atlas × Asset Command Ground-Truth Extraction": a complete, HEAD-accurate structural inventory of both platform repos, emitted as two strict JSON documents for downstream agent consumption. Ground rules honored: no inference from names, `[UNKNOWN]` where the code doesn't say, case-sensitive verbatim identifiers, all numbers from the current commit.

### Repos and commits extracted

| Repo | HEAD (short) | HEAD (full) | Branch | Last commit (UTC) |
|---|---|---|---|---|
| `OrangeOnyx/orange-ocean-atlas` | `04734e3` | `04734e3a6c74addf6de5be1fb3b33a9cfd47c991` | `main` | 2026-08-05T03:49:04Z |
| `OrangeOnyx/orange-ocean-asset-command` | `0e30880` | `0e308808251391eb4d0b558bf4cecae72cb80945` | `main` | 2026-08-21T06:02:14Z |

HEADs re-verified unchanged via `git ls-remote` at 2026-08-23 ~10:25 UTC before this handoff was written.

---

## 2. Headline results

### orange-ocean-atlas (NestJS + Prisma)
- **543 files, 72,984 TS LOC**
- **45 NestJS modules**, 306 HTTP endpoints total
- **59 Prisma models**
- **10 models `[UNCLAIMED]`** (no module dominates their usage; mostly seed-script-only refs or 1:1 module ties that didn't clear the threshold): `LeaseUnit`, `ScheduleGEntry`, `LeaseOption`, `ExclusiveUse`, `OccupationalLicense`, `ActivityLog`, `Notification`, `TenantAuditLog`, `InvoiceLineItem`, `EmailLog`
- **42/45 modules have `purpose_one_line: [UNKNOWN]`** — the codebase has essentially no module-level JSDoc. This is the single biggest documentation gap in Atlas and the main thing a downstream agent must resolve with the owner.

### orange-ocean-asset-command (Express + Drizzle + tRPC + React/Vite)
- **514 files, 73,156 TS LOC**
- **67 Drizzle tables**, 0 foreign keys pointing outside the schema
- **27 pages** (App.tsx-routed + workspace pages)
- **37 tRPC routers, 305 procedures** (133 query / 172 mutation) — parsed counts match raw grep counts exactly
- **0 unresolved page→procedure references**
- **Stripe touchpoints (code-level, not prose):** `client/src/pages/Pricing.tsx`, `client/src/pages/workspaces/BillingWorkspace.tsx`
- Workspace pages (`client/src/pages/workspaces/*`) render inside `OtbApp` internal navigation with **no wouter route** → `page_path: [UNKNOWN]` by ground truth
- `used_by_pages` on tables is empty across the board — correct: no client page imports `drizzle/schema` (server-only module)
- The `otb` router is the largest surface: 72 procedures with nested sub-routers (`property.*`, `units.*`, `views.*`, …)

### Drift vs. prior baselines
- Atlas modules: **45 actual** vs ~43 assumed
- AC tables: **67 actual** vs ~65 assumed (the 65 figure dates from the MySQL→Postgres conversion; two tables added since, incl. `rent_abatements` from migration 0038)
- AC pages: **27 actual** vs ~17 assumed (workspace pages were undercounted in prior mental models)
- Atlas Prisma models: 59 — on target

---

## 3. Verification performed (all passed)

1. `stats.module_count === modules.length` (45 = 45)
2. `stats.prisma_model_count === prisma_models.length` (59 = 59)
3. `stats.table_count === tables.length` (67 = 67)
4. Every `owning_module` appears in `modules[].module_name` or is `[UNCLAIMED]`; every FK target resolves to another table in the schema (zero `[EXTERNAL]`)

Cross-checks: AC procedure type counts (133/172) independently confirmed by raw `grep -c` of `.query(`/`.mutation(` across router files; every `trpc.<router>.<proc>` call in every page resolved to a parsed procedure.

---

## 4. Methodology (what a downstream agent must know before trusting the numbers)

Full method notes are embedded in each JSON under `method_notes`. Key decisions:

**Atlas**
- Module inventory from `@Module()` decorators; file→module assignment by **deepest module directory** (fixes AppModule swallowing everything at repo root).
- `related_prisma_models` via `prisma.<lcfirst(ModelName)>.` reference grep scoped to the module's directory.
- `owning_module` = module with max reference count; ties or zero refs → `[UNCLAIMED]`.
- Endpoint counts from HTTP method decorators in each module's controllers.

**Asset Command**
- Drizzle tables parsed from `drizzle/schema.ts` with a comment/string-aware lexer (naive parsing breaks on apostrophes inside JS comments).
- tRPC procedures parsed from `server/routers/**/*.ts` + `server/routers.ts` + `server/_core/systemRouter.ts`; JSDoc blocks stripped per entry before key matching. Two routers are inline in `server/routers.ts`: `auth` (me/logout) recorded as `[INLINE in server/routers.ts: auth]`, plus `system`.
- `tables_read`/`tables_written` derived: page → tRPC procedures called in the page file → procedure body → direct Drizzle refs (`.from/.insert/.update/.delete/joins/db.query.*`) + **fixpoint resolution through `server/db.ts` helpers (156 exports)**.
- **Known scope limit:** component-level tRPC calls outside page files are NOT attributed to pages. Page-level attribution is complete; component-level attribution is future work.
- Strings/comments masked before tRPC regex scan (kills false positives like a demo template literal in `ComponentShowcase.tsx`).
- Stripe detection = actual code integration (stripe package import, `loadStripe`/`Stripe()` call, checkout/billing URLs) — JSX prose mentions on Privacy/Terms pages excluded.

---

## 5. Artifacts

| Artifact | Location |
|---|---|
| Atlas extraction JSON (verified) | project repo: `orange-ocean-atlas.extraction.json` (commit `5880ab8`) |
| Asset Command extraction JSON (verified) | project repo: `asset-command.extraction.json` (commit `5880ab8`) |
| Extractor scripts (reproducible) | `atlas_extract.py`, `ac_extract.py` — in the download zip under `extraction/` |
| Repo snapshots at extracted HEADs | download zip under `repos/` (working trees, no `.git`) |
| This handoff + continuity + wiki | project repo, top level |

**Reproduction:** clone both repos at the HEADs above, run `python3 atlas_extract.py` / `python3 ac_extract.py` from the extraction directory. Outputs regenerate identically except `extracted_at_utc`.

---

## 6. What the extraction is FOR (downstream intent)

The two JSONs are the ground-truth substrate for the Atlas × Asset Command consolidation analysis — mapping which Atlas modules and Asset Command tables cover the same domain, where the platforms diverge, and what a unification would touch. The extraction deliberately does **not** editorialize; the mapping/merge analysis is the next agent's job, with these open questions for the owner:

1. Purposes of the 42 undocumented Atlas modules (no JSDoc exists — needs owner input or code-reading pass)
2. Ownership intent for the 10 `[UNCLAIMED]` Prisma models
3. Whether component-level tRPC attribution (beyond page files) is needed for the merge analysis

---

## 7. Session timeline (for audit)

1. Loaded latest handoff `HANDOFF-2026-08-21-lease-assembler-template-v2.3.md` + `PENDING-2026-08-19.md` from project repo; summarized state.
2. Received POWER PROMPT; cloned both repos shallow at HEAD.
3. Built Atlas extractor; fixed AppModule scope-swallowing bug (deepest-module-dir assignment).
4. Built AC extractor; fixed 5 bugs sequentially: comment/string-aware lexer, JSDoc-before-procedure stripping, string-masking before tRPC scan, `./pages/` relative import mapping in App.tsx, stripe prose false positives.
5. Ran 4 mandatory verification checks + independent grep cross-checks — all passed.
6. Committed both JSONs to project repo (`5880ab8`); emitted results.
7. Wrote this handoff, `CONTINUITY-2026-08-23.md`, `WIKI-2026-08-23.md`; assembled download zip.

---

## 8. Next session should

1. Read `CONTINUITY-2026-08-23.md` (canonical open-items list — supersedes `PENDING-2026-08-19.md` as the freshest snapshot; the pending list itself is carried forward there).
2. If doing the consolidation analysis: load both extraction JSONs and `WIKI-2026-08-23.md`, then build the module↔table domain mapping.
3. **URGENT calendar item: Manus billing renews 2026-08-27 (4 days out)** — flip `SCHEDULER_ENABLED=true` on Railway `ooac-web` after confirming Manus Heartbeat has stopped, then cancel the subscription. Details in continuity doc.
