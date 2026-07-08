# Vendor roster extractor - re-runnable: python tools/extract-vendors.py
# Reads the SOT workbook's "Vendor List" sheet (DoorLoop-style AP payee export)
# and emits src/data/vendors.json: slug, company, contact, email, phone, city,
# notes, and a `kind` guess (service | payee | person) so the portal can rank
# real service vendors first. Heuristics are a starting point - operator edits
# land here, in the SOT, then re-run.
import json, re, unicodedata
import openpyxl

SRC = r"G:/My Drive/00 OTB/OTB_Master_SOT_Lease_Logo_HVAC.xlsx"
OUT = "src/data/vendors.json"

PAYEE_PAT = re.compile(
    r"bank|visa|amex|american express|chase|synchrony|gm financial|costco|sam's club|"
    r"best buy|rooms to go|harbor freight|icsc|krewe|commodore|second harvest|friends of|"
    r"city of|lafayette parish|consolidated government|l u s|lus\b|at ?& ?t|lft ?fiber|"
    r"republic services|hartford|lwcc|lshmp|ipfs|tax collector|membership|restaurant|"
    r"cash$|line of credit|one acadiana|music|limo|automotive", re.I)

def slugify(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", s.lower())).strip("-")[:48]

wb = openpyxl.load_workbook(SRC, read_only=True, data_only=True)
ws = wb["Vendor List"]
rows = list(ws.iter_rows(values_only=True))
vendors, seen = [], set()
for r in rows[1:]:
    company = (r[0] or "").strip() if r[0] else ""
    if not company:
        continue
    slug = slugify(company)
    if not slug or slug in seen:
        continue
    seen.add(slug)
    email = (r[3] or "").strip().lower() if r[3] else ""
    first, last = (r[11] or "").strip() if r[11] else "", (r[12] or "").strip() if r[12] else ""
    persons = not any([r[1], r[3], r[4]]) and len(company.split()) <= 3 and "," not in company \
        and not re.search(r"llc|inc|co\b|corp|service|plumb|electric|roof", company, re.I)
    kind = "person" if persons else ("payee" if PAYEE_PAT.search(company) else "service")
    vendors.append({
        "id": slug,
        "company": company,
        "contact": (first + " " + last).strip(),
        "email": email,
        "phone": (str(r[1]).strip() if r[1] else ""),
        "city": (str(r[5]).strip() if r[5] else ""),
        "notes": (str(r[10]).strip() if r[10] else ""),
        "kind": kind,
    })
vendors.sort(key=lambda v: ({"service": 0, "payee": 1, "person": 2}[v["kind"]], v["company"].lower()))
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(vendors, f, indent=1, ensure_ascii=False)
    f.write("\n")
svc = [v for v in vendors if v["kind"] == "service"]
print(f"{OUT}: {len(vendors)} vendors ({len(svc)} service, "
      f"{sum(1 for v in vendors if v['email'])} with email -> portal-capable)")
