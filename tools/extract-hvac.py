# Extract the per-tenant HVAC cost split from the SOT workbook (Sheet3) into
# src/data/hvac.json. Re-run after the workbook changes:
#   C:/Python314/python.exe tools/extract-hvac.py
# Each cell reads "<repair> per occurance and <replace> Replacement"; repair is
# the tenant's per-occurrence/annual repair cap, replace is the tenant's
# replacement share (dollar cap or %). Above the cap the landlord covers, per the
# lease HVAC clause; a quarterly PM contract with Butcher A/C (or approved
# provider) is required. 100%/100% = tenant fully responsible.
import openpyxl, re, json, os

SRC = r"G:\My Drive\00 OTB\Belle Realty SOT Documents\OTB-Master-Template-Set-SOT-with hvac.xlsx"
OUT = os.path.join(os.path.dirname(__file__), "..", "src", "data", "hvac.json")

def norm(tok):
    tok = tok.strip()
    if tok.endswith("%"):
        return tok
    return "$" + f"{int(float(tok)):,}"

wb = openpyxl.load_workbook(SRC, data_only=True)
ws = wb["Sheet3"]
units = {}
for row in list(ws.iter_rows(values_only=True))[1:]:
    unit = row[0]
    raw = row[5]
    if unit is None or raw is None:
        continue
    unit = str(unit).strip()
    val = str(raw).strip()
    if val.lower().startswith("n/a"):
        units[unit] = None
        continue
    m_rep = re.search(r"([\d.]+%?)\s*per\s*occur", val, re.I)
    m_rpl = re.search(r"and\s*([\d.]+%?)\s*Replacement", val, re.I)
    repair = norm(m_rep.group(1)) if m_rep else None
    replace = norm(m_rpl.group(1)) if m_rpl else None
    # discrete lease-structure tier (categorical, not a dollar gradient):
    #   full = tenant 100%/100% (no lessor exposure)
    #   pct  = tenant pays a % of replacement (lessor carries the complement)
    #   standard = fixed-dollar cap (lessor covers replacement above the cap)
    if repair == "100%" and replace == "100%":
        tier = "full"
    elif replace and replace.endswith("%"):
        tier = "pct"
    else:
        tier = "standard"
    units[unit] = {"repair": repair, "replace": replace, "tier": tier}

out = {
    "_note": "Per-tenant HVAC cost split from SOT workbook (OTB-Master-Template-Set-SOT-with hvac.xlsx, Sheet3). repair = tenant per-occurrence/annual repair cap; replace = tenant replacement share (dollar cap or %). Above the cap the landlord covers per the lease HVAC clause; quarterly PM contract with Butcher Air Conditioning (or approved provider) required. 100%/100% = tenant fully responsible; null = vacant / n/a.",
    "provider": "Butcher Air Conditioning",
    "units": units,
}
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(out, f, indent=1, ensure_ascii=False)
    f.write("\n")
print("hvac.json written:", sum(1 for v in units.values() if v), "tenant splits,",
      sum(1 for v in units.values() if not v), "n/a")
