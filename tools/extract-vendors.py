# Vendor roster extractor - re-runnable: python tools/extract-vendors.py
# Reads the SOT workbook's "Vendor List" sheet (DoorLoop-style AP payee export)
# and emits src/data/vendors.json: slug, company, contact, email, phone, city,
# notes, and a `kind` guess (service | payee | person) so the portal can rank
# real service vendors first. Heuristics are a starting point - operator edits
# land here, in the SOT, then re-run.
import json, re, unicodedata, os, sys
import openpyxl

# M4: path via arg/env (not a hardcoded Drive mount), so this runs on any machine.
#   python tools/extract-vendors.py [path-to-SOT.xlsx]
#   or set OTB_SOT_XLSX=...
SRC = (sys.argv[1] if len(sys.argv) > 1 else
       os.environ.get("OTB_SOT_XLSX", r"G:/My Drive/00 OTB/OTB_Master_SOT_Lease_Logo_HVAC.xlsx"))
OUT = "src/data/vendors.json"
if not os.path.exists(SRC):
    sys.exit(f"SOT workbook not found: {SRC}\nPass the path as an argument or set OTB_SOT_XLSX.")

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

# M4: resolve columns by HEADER text (not fixed index) so an inserted SOT column
# can't silently mis-map phone/email/contact. Falls back to the known layout.
def col(header_row, *needles, default=None):
    for i, h in enumerate(header_row):
        hs = str(h or "").lower()
        if all(n in hs for n in needles):
            return i
    return default
hdr = rows[0] if rows else []
C_COMPANY = col(hdr, "company", default=0)
C_PHONE   = col(hdr, "work", default=col(hdr, "phone", default=1))
C_EMAIL   = col(hdr, "email", default=3)
C_STREET  = col(hdr, "street", default=4)
C_CITY    = col(hdr, "city", default=5)
C_NOTES   = col(hdr, "notes", default=10)
C_FIRST   = col(hdr, "first", default=11)
C_LAST    = col(hdr, "last", default=12)
cell = lambda r, i: (str(r[i]).strip() if (i is not None and i < len(r) and r[i] is not None) else "")

vendors, seen = [], set()
for r in rows[1:]:
    company = cell(r, C_COMPANY)
    if not company:
        continue
    slug = slugify(company)
    if not slug or slug in seen:
        continue
    seen.add(slug)
    email = cell(r, C_EMAIL).lower()
    contact = (cell(r, C_FIRST) + " " + cell(r, C_LAST)).strip()
    persons = not any([cell(r, C_PHONE), email, cell(r, C_STREET)]) and len(company.split()) <= 3 and "," not in company \
        and not re.search(r"llc|inc|co\b|corp|service|plumb|electric|roof", company, re.I)
    kind = "person" if persons else ("payee" if PAYEE_PAT.search(company) else "service")
    vendors.append({
        "id": slug,
        "company": company,
        "contact": contact,
        "email": email,
        "phone": cell(r, C_PHONE),
        "city": cell(r, C_CITY),
        "notes": cell(r, C_NOTES),
        "kind": kind,
    })
vendors.sort(key=lambda v: ({"service": 0, "payee": 1, "person": 2}[v["kind"]], v["company"].lower()))
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(vendors, f, indent=1, ensure_ascii=False)
    f.write("\n")
svc = [v for v in vendors if v["kind"] == "service"]
print(f"{OUT}: {len(vendors)} vendors ({len(svc)} service, "
      f"{sum(1 for v in vendors if v['email'])} with email -> portal-capable)")
