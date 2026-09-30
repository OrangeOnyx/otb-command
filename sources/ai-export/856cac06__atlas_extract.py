#!/usr/bin/env python3
"""Ground-truth extractor for orange-ocean-atlas (NestJS + Prisma)."""
import json, os, re, subprocess, sys
from datetime import datetime, timezone

REPO = "/home/user/workspace/extract/orange-ocean-atlas"

def sh(cmd):
    return subprocess.run(cmd, shell=True, cwd=REPO, capture_output=True, text=True).stdout.strip()

# ---------- A. repo metadata ----------
sha_full = sh("git rev-parse HEAD")
sha_short = sh("git rev-parse --short HEAD")
branch = sh("git rev-parse --abbrev-ref HEAD")
last_commit_utc = sh("git log -1 --date=iso-strict --format=%cd")
# normalize to UTC ISO8601
from datetime import datetime as dt
d = dt.fromisoformat(last_commit_utc)
last_commit_utc = d.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")

files = sh("git ls-files").splitlines()
file_count = len(files)
ts_files = [f for f in files if f.endswith(".ts") or f.endswith(".tsx")]
ts_loc = 0
for f in ts_files:
    p = os.path.join(REPO, f)
    if os.path.isfile(p):
        with open(p, "rb") as fh:
            ts_loc += sum(1 for _ in fh)

# ---------- C. prisma models (parse first; needed for module cross-ref) ----------
schema_path = os.path.join(REPO, "packages/db/prisma/schema.prisma")
schema_src = open(schema_path).read()

model_blocks = re.findall(r"^model\s+(\w+)\s*\{(.*?)^\}", schema_src, re.M | re.S)
model_names = [m[0] for m in model_blocks]
model_set = set(model_names)

SCALARS = {"String","Int","Float","Boolean","DateTime","Json","Decimal","BigInt","Bytes"}

def lcfirst(s): return s[0].lower() + s[1:] if s else s

prisma_models = []
for name, body in model_blocks:
    field_count = 0
    relation_count = 0
    indexes = []
    for raw in body.splitlines():
        line = raw.split("//")[0].rstrip()
        s = line.strip()
        if not s:
            continue
        if s.startswith("@@index") or s.startswith("@@unique") or s.startswith("@@id"):
            if s.startswith("@@index") or s.startswith("@@unique"):
                indexes.append(s)
            continue
        if s.startswith("@@"):
            continue
        m = re.match(r"^(\w+)\s+([A-Za-z_]\w*)(\[\])?(\?)?", s)
        if not m:
            continue
        fname, ftype = m.group(1), m.group(2)
        if ftype in model_set:
            relation_count += 1
        else:
            field_count += 1
            if "@unique" in s:
                indexes.append(f"{fname} @unique")
    prisma_models.append({
        "model_name": name,
        "field_count": field_count,
        "relation_count": relation_count,
        "indexes": indexes,
        "owning_module": None,  # filled below
    })

# ---------- B. module inventory ----------
module_files = sh(r"find . -name '*.module.ts' -not -path '*/node_modules/*'").splitlines()
module_files = sorted(m[2:] if m.startswith("./") else m for m in module_files)

def balanced(src, start, open_ch, close_ch):
    """Return substring from src[start] (which must be open_ch) to matching close."""
    depth = 0
    for i in range(start, len(src)):
        c = src[i]
        if c == open_ch:
            depth += 1
        elif c == close_ch:
            depth -= 1
            if depth == 0:
                return src[start:i+1]
    return None

def split_top(s):
    """Split a bracketed list body on top-level commas."""
    out, depth, cur = [], 0, ""
    for c in s:
        if c in "([{":
            depth += 1; cur += c
        elif c in ")]}":
            depth -= 1; cur += c
        elif c == "," and depth == 0:
            if cur.strip(): out.append(re.sub(r"\s+", " ", cur.strip()))
            cur = ""
        else:
            cur += c
    if cur.strip(): out.append(re.sub(r"\s+", " ", cur.strip()))
    return out

def extract_array(decorator_body, key):
    m = re.search(rf"\b{key}\s*:\s*\[", decorator_body)
    if not m:
        return []
    arr = balanced(decorator_body, m.end() - 1, "[", "]")
    if arr is None:
        return ["[UNKNOWN]"]
    return split_top(arr[1:-1])

modules = []
# per-module per-model reference counts for ownership
ref_counts = {}  # model_name -> {module_name: count}

# map each module file to its directory; a .ts file belongs to the DEEPEST module dir containing it
module_dirs = sorted({os.path.dirname(mf) for mf in module_files}, key=len, reverse=True)
def deepest_module_dir(relpath):
    for d in module_dirs:
        if relpath == d or relpath.startswith(d + "/"):
            return d
    return None

for mf in module_files:
    full = os.path.join(REPO, mf)
    src = open(full).read()
    mdir = os.path.dirname(mf)
    cls = re.search(r"export\s+class\s+(\w+)", src)
    module_name = cls.group(1) if cls else "[UNKNOWN]"

    dm = re.search(r"@Module\s*\(", src)
    controllers = services = imports = exports = []
    if dm:
        body = balanced(src, dm.end() - 1, "(", ")")
        if body:
            inner = body[1:-1]
            controllers = extract_array(inner, "controllers")
            services = extract_array(inner, "providers")
            imports = extract_array(inner, "imports")
            exports = extract_array(inner, "exports")

    # purpose: module-level JSDoc before @Module, else README in module dir
    purpose = "[UNKNOWN]"
    jm = re.search(r"/\*\*(.*?)\*/\s*@Module", src, re.S)
    if jm:
        text = re.sub(r"^\s*\*\s?", "", jm.group(1).strip(), flags=re.M).strip()
        if text:
            purpose = text.splitlines()[0].strip()
    else:
        for rn in ("README.md", "readme.md", "README"):
            rp = os.path.join(REPO, mdir, rn)
            if os.path.isfile(rp):
                for ln in open(rp).read().splitlines():
                    ln = ln.strip().lstrip("#").strip()
                    if ln:
                        purpose = ln
                        break
                break

    # scan module dir .ts files for prisma refs + endpoint decorators
    # (files claimed by a deeper nested module dir are excluded)
    endpoint_count = 0
    related = {}
    for root, _, fns in os.walk(os.path.join(REPO, mdir)):
        for fn in fns:
            if not fn.endswith(".ts"):
                continue
            rel = os.path.relpath(os.path.join(root, fn), REPO)
            if deepest_module_dir(os.path.dirname(rel)) != mdir:
                continue
            fsrc = open(os.path.join(root, fn)).read()
            if fn.endswith(".controller.ts") or ".controller." in fn:
                endpoint_count += len(re.findall(r"@(Get|Post|Patch|Put|Delete)\s*\(", fsrc))
            for mn in model_names:
                n = len(re.findall(r"\bprisma\." + re.escape(lcfirst(mn)) + r"\.", fsrc))
                if n:
                    related[mn] = related.get(mn, 0) + n
    for mn, n in related.items():
        ref_counts.setdefault(mn, {})[module_name] = ref_counts.get(mn, {}).get(module_name, 0) + n

    modules.append({
        "module_name": module_name,
        "module_path": mdir,
        "controllers": controllers,
        "services": services,
        "imports": imports,
        "exports": exports,
        "related_prisma_models": sorted(related.keys()),
        "endpoint_count": endpoint_count,
        "purpose_one_line": purpose,
    })

# ---------- owning_module resolution ----------
module_name_set = {m["module_name"] for m in modules}
for pm in prisma_models:
    counts = ref_counts.get(pm["model_name"], {})
    if not counts:
        pm["owning_module"] = "[UNCLAIMED]"
    else:
        best = max(counts.values())
        winners = [k for k, v in counts.items() if v == best]
        pm["owning_module"] = winners[0] if len(winners) == 1 else "[UNCLAIMED]"

doc = {
    "repo": "orange-ocean-atlas",
    "extracted_at_utc": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
    "head": {"sha_short": sha_short, "sha_full": sha_full, "branch": branch, "last_commit_utc": last_commit_utc},
    "stats": {"files": file_count, "ts_loc": ts_loc, "module_count": len(modules), "prisma_model_count": len(prisma_models)},
    "modules": modules,
    "prisma_models": prisma_models,
}

# ---------- verification ----------
errs = []
if doc["stats"]["module_count"] != len(doc["modules"]): errs.append("module_count mismatch")
if doc["stats"]["prisma_model_count"] != len(doc["prisma_models"]): errs.append("prisma_model_count mismatch")
for pm in doc["prisma_models"]:
    if pm["owning_module"] not in module_name_set and pm["owning_module"] != "[UNCLAIMED]":
        errs.append(f"owning_module {pm['owning_module']} not in modules")
if errs:
    print("VERIFICATION FAILURES:", errs, file=sys.stderr)
    sys.exit(1)

out = "/home/user/workspace/extract/orange-ocean-atlas.extraction.json"
with open(out, "w") as f:
    json.dump(doc, f, indent=1)
print("OK", out, "modules:", len(modules), "models:", len(prisma_models), "ts_loc:", ts_loc, "files:", file_count)
