#!/usr/bin/env python3
"""Ground-truth extractor for orange-ocean-asset-command (React + tRPC + Drizzle)."""
import json, os, re, subprocess, sys
from datetime import datetime, timezone

REPO = "/home/user/workspace/extract/orange-ocean-asset-command"

def sh(cmd):
    return subprocess.run(cmd, shell=True, cwd=REPO, capture_output=True, text=True).stdout.strip()

def rd(rel):
    return open(os.path.join(REPO, rel)).read()

def _lex(s):
    """Yield (index, char, in_code) with comment/string awareness."""
    i, n = 0, len(s)
    instr = None
    while i < n:
        c = s[i]
        if instr:
            if c == "\\" and instr in "\"'`":
                yield i, c, False
                if i + 1 < n: yield i + 1, s[i+1], False
                i += 2; continue
            if instr == "//" and c == "\n":
                instr = None; yield i, c, True; i += 1; continue
            if instr == "/*" and c == "*" and i + 1 < n and s[i+1] == "/":
                instr = None; yield i, c, False; yield i + 1, "/", False; i += 2; continue
            if c == instr:
                instr = None; yield i, c, False; i += 1; continue
            yield i, c, False; i += 1; continue
        if c == "/" and i + 1 < n and s[i+1] == "/":
            instr = "//"; yield i, c, False; i += 1; continue
        if c == "/" and i + 1 < n and s[i+1] == "*":
            instr = "/*"; yield i, c, False; i += 1; continue
        if c in "\"'`":
            instr = c; yield i, c, False; i += 1; continue
        yield i, c, True; i += 1

def balanced(src, start, open_ch="(", close_ch=")"):
    depth = 0
    started = False
    for i, c, in_code in _lex(src[start:]):
        if in_code and c == open_ch:
            depth += 1; started = True
        elif in_code and c == close_ch:
            depth -= 1
            if started and depth == 0:
                return src[start:start+i+1]
    return None

def mask_noncode(s):
    """Blank out string/comment contents so regexes only see real code."""
    buf = list(s)
    for i, c, in_code in _lex(s):
        if not in_code and c != "\n":
            buf[i] = " "
    return "".join(buf)

def split_top(s):
    out, depth, cur = [], 0, ""
    for i, c, in_code in _lex(s):
        if in_code and c in "([{":
            depth += 1; cur += c
        elif in_code and c in ")]}":
            depth -= 1; cur += c
        elif in_code and c == "," and depth == 0:
            if cur.strip(): out.append(cur.strip())
            cur = ""
        else:
            cur += c
    if cur.strip(): out.append(cur.strip())
    return out

# ---------- D. repo metadata ----------
sha_full = sh("git rev-parse HEAD")
sha_short = sh("git rev-parse --short HEAD")
branch = sh("git rev-parse --abbrev-ref HEAD")
from datetime import datetime as dt
d = dt.fromisoformat(sh("git log -1 --date=iso-strict --format=%cd"))
last_commit_utc = d.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
files = sh("git ls-files").splitlines()
file_count = len(files)
ts_loc = 0
for f in files:
    if f.endswith(".ts") or f.endswith(".tsx"):
        p = os.path.join(REPO, f)
        if os.path.isfile(p):
            with open(p, "rb") as fh:
                ts_loc += sum(1 for _ in fh)

# ---------- E. drizzle table inventory ----------
schema_src = rd("drizzle/schema.ts")
tables = []
table_names = []
for m in re.finditer(r"export const (\w+)\s*=\s*pgTable\s*\(", schema_src):
    var = m.group(1)
    call = balanced(schema_src, m.end() - 1)
    if call is None:
        tables.append({"table_name": var, "sql_name": "[UNKNOWN]", "column_count": "[UNKNOWN]",
                       "foreign_keys": ["[UNKNOWN]"], "indexes": ["[UNKNOWN]"],
                       "used_by_pages": [], "used_by_trpc_routers": []})
        table_names.append(var); continue
    args = split_top(call[1:-1])
    sql_name = "[UNKNOWN]"
    mm = re.match(r"^[\"'`](.+?)[\"'`]$", args[0].strip()) if args else None
    if mm: sql_name = mm.group(1)
    cols_arg = args[1] if len(args) > 1 else ""
    idx_arg = args[2] if len(args) > 2 else ""
    col_entries = []
    if cols_arg.strip().startswith("{"):
        col_entries = split_top(cols_arg.strip()[1:-1])
    columns = []
    fks = []
    indexes = []
    for e in col_entries:
        km = re.match(r"^(\w+)\s*:", e)
        if not km: continue
        columns.append(km.group(1))
        for fk in re.finditer(r"references\(\s*\(\)\s*=>\s*(\w+)\.", e):
            fks.append(fk.group(1))
        if re.search(r"\.unique\(\)", e):
            indexes.append(f"{km.group(1)} .unique()")
    for im in re.finditer(r"(uniqueIndex|index)\(\s*[\"'`]([^\"'`]+)[\"'`]\s*\)((?:\.\w+\([^()]*(?:\([^()]*\))*[^()]*\))*)", idx_arg):
        indexes.append(f"{im.group(1)}(\"{im.group(2)}\")")
    tables.append({"table_name": var, "sql_name": sql_name, "column_count": len(columns),
                   "foreign_keys": sorted(set(fks)), "indexes": indexes,
                   "used_by_pages": [], "used_by_trpc_routers": []})
    table_names.append(var)
table_set = set(table_names)
# sql-name -> var map for db.query.<key> (drizzle relational uses schema export keys = var names)

# ---------- db.ts helper layer: helper -> reads/writes/stripe ----------
db_src = rd("server/db.ts")
helper_bodies = {}
exports_iter = list(re.finditer(r"^export\s+(?:async\s+)?(?:function|const)\s+(\w+)", db_src, re.M))
for i, em in enumerate(exports_iter):
    end = exports_iter[i+1].start() if i + 1 < len(exports_iter) else len(db_src)
    helper_bodies[em.group(1)] = db_src[em.start():end]

READ_PAT = [r"\.from\(\s*(\w+)", r"Join\(\s*(\w+)", r"db\.query\.(\w+)\b"]
WRITE_PAT = [r"\.insert\(\s*(\w+)", r"\.update\(\s*(\w+)", r"\.delete\(\s*(\w+)"]

def scan_tables(text):
    reads, writes = set(), set()
    for p in READ_PAT:
        for x in re.finditer(p, text):
            if x.group(1) in table_set: reads.add(x.group(1))
    for p in WRITE_PAT:
        for x in re.finditer(p, text):
            if x.group(1) in table_set: writes.add(x.group(1))
    return reads, writes

helper_rw = {}
for name, body in helper_bodies.items():
    r, w = scan_tables(body)
    helper_rw[name] = {"r": r, "w": w, "stripe": bool(re.search(r"stripe", body, re.I))}
# fixpoint: helpers calling helpers
for _ in range(4):
    changed = False
    for name, body in helper_bodies.items():
        for other in helper_bodies:
            if other == name: continue
            if re.search(r"\b" + re.escape(other) + r"\(", body):
                before = (len(helper_rw[name]["r"]), len(helper_rw[name]["w"]), helper_rw[name]["stripe"])
                helper_rw[name]["r"] |= helper_rw[other]["r"]
                helper_rw[name]["w"] |= helper_rw[other]["w"]
                helper_rw[name]["stripe"] = helper_rw[name]["stripe"] or helper_rw[other]["stripe"]
                if before != (len(helper_rw[name]["r"]), len(helper_rw[name]["w"]), helper_rw[name]["stripe"]):
                    changed = True
    if not changed: break

# ---------- G. tRPC routers ----------
app_src = rd("server/routers.ts")
# import map: exportName -> file
import_map = {}
for im in re.finditer(r"import\s*\{\s*([^}]+)\}\s*from\s*[\"']([^\"']+)[\"']", app_src):
    for nm in [x.strip().split(" as ")[0].strip() for x in im.group(1).split(",") if x.strip()]:
        import_map[nm] = im.group(2)

def resolve_router_file(spec):
    base = os.path.normpath(os.path.join("server", spec))
    for cand in (base + ".ts", os.path.join(base, "index.ts")):
        if os.path.isfile(os.path.join(REPO, cand)): return cand
    return None

def file_helper_imports(src):
    """names imported from ../db (or ./db) in this file, plus namespace alias."""
    named, ns = set(), set()
    for im in re.finditer(r"import\s*\{\s*([^}]+)\}\s*from\s*[\"']([^\"']*\bdb)[\"']", src):
        for nm in [x.strip().split(" as ")[-1].strip() for x in im.group(1).split(",") if x.strip()]:
            named.add(nm)
    for im in re.finditer(r"import\s*\*\s*as\s*(\w+)\s*from\s*[\"']([^\"']*\bdb)[\"']", src):
        ns.add(im.group(1))
    return named, ns

def proc_effects(text, named_helpers, ns_aliases):
    reads, writes = scan_tables(text)
    stripe = bool(re.search(r"stripe", text, re.I))
    called = set()
    for a in ns_aliases:
        for x in re.finditer(re.escape(a) + r"\.(\w+)\(", text):
            called.add(x.group(1))
    for h in named_helpers:
        if re.search(r"\b" + re.escape(h) + r"\(", text):
            called.add(h)
    for h in called:
        if h in helper_rw:
            reads |= helper_rw[h]["r"]; writes |= helper_rw[h]["w"]
            stripe = stripe or helper_rw[h]["stripe"]
    return reads, writes, stripe

def parse_router_obj(src, obj_body, prefix, named_helpers, ns_aliases, out):
    """obj_body: inner text of router({ ... }) object literal."""
    for entry in split_top(obj_body):
        entry = re.sub(r"^(\s*(/\*.*?\*/|//[^\n]*)\s*)+", "", entry, flags=re.S)
        km = re.match(r"^(\w+)\s*:\s*(.*)$", entry, re.S)
        if not km: continue
        key, val = km.group(1), km.group(2).strip()
        name = f"{prefix}.{key}" if prefix else key
        if val.startswith("router("):
            inner = balanced(val, val.index("("))
            if inner:
                ib = inner[1:-1].strip()
                if ib.startswith("{"): ib = ib[1:-1]
                parse_router_obj(src, ib, name, named_helpers, ns_aliases, out)
            continue
        vm = re.match(r"^(\w+)$", val)
        if vm:
            # reference to a const router or procedure defined elsewhere in file
            cm = re.search(r"const\s+" + re.escape(vm.group(1)) + r"\s*=\s*router\s*\(", src)
            if cm:
                inner = balanced(src, src.index("(", cm.end() - 1))
                if inner:
                    ib = inner[1:-1].strip()
                    if ib.startswith("{"): ib = ib[1:-1]
                    parse_router_obj(src, ib, name, named_helpers, ns_aliases, out)
                continue
        qm = re.search(r"\.(query|mutation)\s*\(", val)
        if re.search(r"[Pp]rocedure\b", val) or qm:
            ptype = qm.group(1) if qm else "[UNKNOWN]"
            r, w, stripe = proc_effects(val, named_helpers, ns_aliases)
            out[name] = {"type": ptype, "r": r, "w": w, "stripe": stripe}

routers = []
proc_index = {}  # "routerKey.proc.path" -> effects
app_body_m = re.search(r"export const appRouter\s*=\s*router\s*\(", app_src)
app_call = balanced(app_src, app_src.index("(", app_body_m.end() - 1))
app_inner = app_call[1:-1].strip()
if app_inner.startswith("{"): app_inner = app_inner[1:-1]

for entry in split_top(app_inner):
    entry = re.sub(r"^(\s*(/\*.*?\*/|//[^\n]*)\s*)+", "", entry, flags=re.S)
    km = re.match(r"^(\w+)\s*:\s*(.*)$", entry, re.S)
    if not km: continue
    key, val = km.group(1), km.group(2).strip()
    procs = {}
    if val.startswith("router("):
        nh, na = file_helper_imports(app_src)
        inner = balanced(val, val.index("("))
        ib = inner[1:-1].strip()
        if ib.startswith("{"): ib = ib[1:-1]
        parse_router_obj(app_src, ib, "", nh, na, procs)
        router_name = f"[INLINE in server/routers.ts: {key}]"
        rfile = "server/routers.ts"
    else:
        export_name = val.rstrip(",").strip()
        router_name = export_name
        spec = import_map.get(export_name)
        rfile = resolve_router_file(spec) if spec else None
        if rfile:
            rsrc = rd(rfile)
            nh, na = file_helper_imports(rsrc)
            em = re.search(r"export const " + re.escape(export_name) + r"\s*=\s*router\s*\(", rsrc)
            if em:
                inner = balanced(rsrc, rsrc.index("(", em.end() - 1))
                ib = inner[1:-1].strip()
                if ib.startswith("{"): ib = ib[1:-1]
                parse_router_obj(rsrc, ib, "", nh, na, procs)
    for pname, eff in procs.items():
        proc_index[f"{key}.{pname}"] = eff
    routers.append({
        "router_name": router_name,
        "file_path": rfile or "[UNKNOWN]",
        "mounted_as": key,
        "procedures": [{"name": p, "type": e["type"]} for p, e in procs.items()],
    })

# ---------- F. page inventory ----------
page_files = sorted(sh("find client/src/pages -name '*.tsx' ! -name '*.test.tsx'").splitlines())
# route map from App.tsx
app_tsx = rd("client/src/App.tsx")
comp_to_file = {}
for im in re.finditer(r"import\s+(\w+)\s+from\s*[\"']([^\"']+)[\"']", app_tsx):
    comp_to_file[im.group(1)] = im.group(2)
for im in re.finditer(r"const\s+(\w+)\s*=\s*lazy\(\(\)\s*=>\s*import\([\"']([^\"']+)[\"']\)\)", app_tsx):
    comp_to_file[im.group(1)] = im.group(2)

def import_to_pagefile(spec):
    if spec is None: return None
    p = spec.replace("@/", "client/src/")
    if p.startswith("./"):
        p = "client/src/" + p[2:]
    for cand in (p + ".tsx", p + ".ts", p + "/index.tsx"):
        if os.path.isfile(os.path.join(REPO, cand)): return cand
    return None

route_map = {}  # page file -> [paths]
for rm in re.finditer(r"<Route\s+path=\{?[\"']([^\"'}]+)[\"']\}?\s*(?:component=\{(\w+)\}\s*/?>|>(.*?)</Route>)", app_tsx, re.S):
    path, comp, children = rm.group(1), rm.group(2), rm.group(3)
    if not comp and children:
        cm = re.search(r"<(\w+)[\s/>]", children)
        # skip wrappers like Suspense/ErrorBoundary — find first comp that maps to a page file
        comps = re.findall(r"<([A-Z]\w+)[\s/>]", children)
        comp = next((c for c in comps if import_to_pagefile(comp_to_file.get(c))), None)
    f = import_to_pagefile(comp_to_file.get(comp)) if comp else None
    if f:
        route_map.setdefault(f, []).append(path)

pages = []
for pf in page_files:
    src = rd(pf)
    paths = route_map.get(pf)
    page_path = paths[0] if paths else "[UNKNOWN]"
    code_only = mask_noncode(src)
    procs_called = sorted(set(
        m.group(1) for m in re.finditer(
            r"\btrpc\.((?:\w+\.)+\w+)\.(?:useQuery|useMutation|useInfiniteQuery|useSuspenseQuery|useSubscription)\b", code_only)
    ))
    reads, writes = set(), set()
    stripe = bool(
        re.search(r"from\s*['\"][^'\"]*stripe", src, re.I)
        or re.search(r"\b(loadStripe|Stripe)\s*\(", src)
        or re.search(r"(checkout|buy|billing|js)\.stripe\.com", src, re.I)
    )
    unresolved = []
    for p in procs_called:
        eff = proc_index.get(p)
        if eff is None:
            unresolved.append(p); continue
        reads |= eff["r"]
        if eff["type"] == "mutation":
            writes |= eff["w"]
            reads |= eff["r"]
        stripe = stripe or eff["stripe"]
    # tables imported directly by page (Section E used_by_pages ground truth)
    for im in re.finditer(r"import\s*\{([^}]+)\}\s*from\s*[\"']([^\"']*drizzle/schema)[\"']", src):
        for nm in [x.strip() for x in im.group(1).split(",")]:
            if nm in table_set:
                for t in tables:
                    if t["table_name"] == nm and pf not in t["used_by_pages"]:
                        t["used_by_pages"].append(pf)
    pages.append({
        "page_path": page_path,
        "file_path": pf,
        "tables_read": sorted(reads),
        "tables_written": sorted(writes),
        "trpc_procedures_called": procs_called,
        "unresolved_procedures": unresolved,
        "stripe_touched": stripe,
    })

# ---------- used_by_trpc_routers (literal grep per spec) ----------
router_files = sorted(sh("find server/routers -name '*.ts'").splitlines()) + ["server/routers.ts", "server/_core/systemRouter.ts"]
router_srcs = {rf: rd(rf) for rf in router_files if os.path.isfile(os.path.join(REPO, rf))}
for t in tables:
    hits = [rf for rf, s in router_srcs.items() if re.search(r"\b" + re.escape(t["table_name"]) + r"\b", s)]
    t["used_by_trpc_routers"] = hits

doc = {
    "repo": "asset-command",
    "extracted_at_utc": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
    "head": {"sha_short": sha_short, "sha_full": sha_full, "branch": branch, "last_commit_utc": last_commit_utc},
    "stats": {"files": file_count, "ts_loc": ts_loc, "table_count": len(tables),
              "page_count": len(pages), "trpc_router_count": len(routers)},
    "method_notes": {
        "tables_read_written": "Derived deterministically: page -> trpc procedures called in page file -> procedure body in router -> direct Drizzle table refs (.from/.insert/.update/.delete/joins/db.query.*) plus transitive resolution through server/db.ts helper functions (fixpoint). Component-level tRPC calls outside the page file are NOT included.",
        "used_by_pages": "Literal grep for direct imports of the table from drizzle/schema in client/src/pages files, per spec.",
        "used_by_trpc_routers": "Literal word-boundary grep for the table variable name across server/routers/**/*.ts plus server/routers.ts and server/_core/systemRouter.ts, per spec (test files included).",
        "stripe_touched": "True if the page file has actual Stripe code integration (stripe package import, loadStripe/Stripe() call, or checkout/billing/js.stripe.com URL) or any tRPC procedure it calls (incl. resolved db.ts helpers) references Stripe. Prose-only mentions (e.g. legal pages) do not count.",
    },
    "tables": tables,
    "pages": pages,
    "trpc_routers": routers,
}

# ---------- verification ----------
errs = []
if doc["stats"]["table_count"] != len(doc["tables"]): errs.append("table_count")
if doc["stats"]["page_count"] != len(doc["pages"]): errs.append("page_count")
if doc["stats"]["trpc_router_count"] != len(doc["trpc_routers"]): errs.append("router_count")
for t in doc["tables"]:
    t["foreign_keys"] = [fk if fk in table_set else f"[EXTERNAL] {fk}" for fk in t["foreign_keys"]]
if errs:
    print("VERIFICATION FAILURES:", errs, file=sys.stderr); sys.exit(1)

out = "/home/user/workspace/extract/asset-command.extraction.json"
with open(out, "w") as f:
    json.dump(doc, f, indent=1)
total_procs = sum(len(r["procedures"]) for r in routers)
unk_types = sum(1 for r in routers for p in r["procedures"] if p["type"] == "[UNKNOWN]")
print("OK", out, "tables:", len(tables), "pages:", len(pages), "routers:", len(routers),
      "procs:", total_procs, "unk_types:", unk_types, "ts_loc:", ts_loc)
