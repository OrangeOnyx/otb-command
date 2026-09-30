#!/usr/bin/env python3
import json, io

D = "/home/user/workspace/projects/orange-ocean-asset-command-5sbpdr5CQwa3UKgbk1dxLw/files"
atlas = json.load(open(f"{D}/orange-ocean-atlas.extraction.json"))
ac = json.load(open(f"{D}/asset-command.extraction.json"))

out = io.StringIO()
w = out.write

w("""# WIKI — 2026-08-23 — Orange Ocean Platform Reference

Ground-truth reference for both platform repos. Every inventory below is **generated directly from the verified extraction JSONs** (`orange-ocean-atlas.extraction.json`, `asset-command.extraction.json`, project repo commit `5880ab8`) — do not hand-edit tables; regenerate from the JSONs. `[UNKNOWN]` means the code does not say; nothing here is inferred from names.

| Repo | HEAD | Branch | Last commit (UTC) | Files | TS LOC |
|---|---|---|---|---|---|
""")
ah, ach = atlas["head"], ac["head"]
w(f"| orange-ocean-atlas | `{ah['sha_short']}` | {ah['branch']} | {ah['last_commit_utc']} | {atlas['stats']['files']} | {atlas['stats']['ts_loc']:,} |\n")
w(f"| orange-ocean-asset-command | `{ach['sha_short']}` | {ach['branch']} | {ach['last_commit_utc']} | {ac['stats']['files']} | {ac['stats']['ts_loc']:,} |\n")

w("""
---

## Platform architectures

**orange-ocean-atlas** — NestJS + Prisma (PostgreSQL). 45 modules, 306 HTTP endpoints, 59 Prisma models. Consolidation platform intended to unify Belle Realty, OTB Command, and OOAC. Runs On The Boulevard Shopping Center.

**orange-ocean-asset-command (OOAC)** — TypeScript monorepo: React/Vite client + Express/tRPC/Drizzle server on Supabase Postgres. 67 tables, 37 tRPC routers (305 procedures), 27 pages. Live in production at assetcommand.orangecean.com via Railway.

---

## Atlas — NestJS module inventory (45)

| Module | Controllers | Services | Endpoints | Related Prisma models | Purpose |
|---|---|---|---|---|---|
""")
for m in atlas["modules"]:
    ctrls = ", ".join(f"`{c}`" for c in m["controllers"]) or "—"
    svcs = ", ".join(f"`{s}`" for s in m["services"]) or "—"
    models = ", ".join(m["related_prisma_models"]) or "—"
    purpose = m["purpose_one_line"]
    w(f"| `{m['module_name']}` | {ctrls} | {svcs} | {m['endpoint_count']} | {models} | {purpose} |\n")

w("""
## Atlas — Prisma model inventory (59)

| Model | Fields | Relations | Indexes | Owning module |
|---|---|---|---|---|
""")
for p in atlas["prisma_models"]:
    idx = ", ".join(f"`{i}`" for i in p["indexes"]) or "—"
    w(f"| `{p['model_name']}` | {p['field_count']} | {p['relation_count']} | {idx} | {p['owning_module']} |\n")

w(f"""
## Asset Command — Drizzle table inventory ({len(ac['tables'])})

| Table (TS) | SQL name | Cols | Foreign keys | Used by routers |
|---|---|---|---|---|
""")
for t in ac["tables"]:
    fks = "; ".join(f"{k['column']}→{k['references_table']}.{k['references_column']}" for k in t["foreign_keys"]) or "—"
    routers = ", ".join(f"`{r}`" for r in t["used_by_trpc_routers"]) or "—"
    w(f"| `{t['table_name']}` | `{t['sql_name']}` | {t['column_count']} | {fks} | {routers} |\n")

w(f"""
## Asset Command — Page inventory ({len(ac['pages'])})

| Page file | Route | tRPC procedures called | Tables read | Tables written | Stripe |
|---|---|---|---|---|---|
""")
for p in ac["pages"]:
    procs = ", ".join(f"`{x}`" for x in p["trpc_procedures_called"]) or "—"
    tr = ", ".join(f"`{x}`" for x in p["tables_read"]) or "—"
    tw = ", ".join(f"`{x}`" for x in p["tables_written"]) or "—"
    stripe = "YES" if p["stripe_touched"] else "no"
    w(f"| `{p['file_path']}` | {p['page_path']} | {procs} | {tr} | {tw} | {stripe} |\n")

w(f"""
## Asset Command — tRPC router inventory ({len(ac['trpc_routers'])} routers, {sum(len(r['procedures']) for r in ac['trpc_routers'])} procedures)

| Router | File | Procedures (q=query, m=mutation) |
|---|---|---|
""")
for r in ac["trpc_routers"]:
    procs = ", ".join(f"{p['name']}({'q' if p['type']=='query' else 'm'})" for p in r["procedures"])
    w(f"| `{r['router_name']}` | `{r.get('file_path','[UNKNOWN]')}` | {procs} |\n")

w("""
---

## Known gaps (quantified 2026-08-23)

1. **42/45 Atlas modules have no documented purpose** (no JSDoc/README at module level) — resolve with owner before consolidation mapping.
2. **10 Prisma models `[UNCLAIMED]`**: LeaseUnit, ScheduleGEntry, LeaseOption, ExclusiveUse, OccupationalLicense, ActivityLog, Notification, TenantAuditLog, InvoiceLineItem, EmailLog.
3. **Component-level tRPC attribution not mapped** — page inventory covers page files only; calls from shared components are not attributed to pages.
4. **Workspace pages have no URL routes** — `client/src/pages/workspaces/*` render inside OtbApp internal navigation; `page_path` is `[UNKNOWN]` by ground truth.

## Regeneration

Clone both repos at the HEADs above; run `python3 atlas_extract.py` and `python3 ac_extract.py` (in the download zip under `extraction/`), then `python3 gen_wiki.py` to rebuild this file. Outputs are deterministic except `extracted_at_utc`.
""")

text = out.getvalue()
open(f"{D}/WIKI-2026-08-23.md", "w").write(text)
print(f"wrote WIKI-2026-08-23.md: {len(text)} bytes, {text.count(chr(10))} lines")
