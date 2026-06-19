# Extract the per-unit rent composition (Base / CAM / Tax / Insurance PSF) from
# the SOT workbook (Sheet2) into src/data/recoveries.json. Re-run after the
# workbook changes:
#   C:/Python314/python.exe tools/extract-recoveries.py
# These are RECOVERY INCOME components (NNN passthroughs tenants reimburse), not
# the landlord's actual operating spend. base+cam+tax+ins == total PSF (verified).
import openpyxl, json, os

SRC = r"G:\My Drive\00 OTB\Belle Realty SOT Documents\OTB-Master-Template-Set-SOT-with hvac.xlsx"
OUT = os.path.join(os.path.dirname(__file__), "..", "src", "data", "recoveries.json")

def num(x):
    try: return round(float(x), 4)
    except (TypeError, ValueError): return 0.0

wb = openpyxl.load_workbook(SRC, data_only=True)
ws = wb["Sheet2"]
units = {}
warnings = []
for r in list(ws.iter_rows(values_only=True))[1:]:
    if r[0] is None:
        continue
    unit = str(r[0]).strip()
    base, cam, tax, ins, total = num(r[8]), num(r[9]), num(r[10]), num(r[11]), num(r[12])
    units[unit] = {"base": base, "cam": cam, "tax": tax, "ins": ins, "total": total}
    s = round(base + cam + tax + ins, 2)
    if total and abs(s - total) > 0.01:
        warnings.append(f"{unit}: base+cam+tax+ins={s} != total {total}")

out = {
    "_note": "Per-unit rent composition (PSF) from SOT workbook Sheet2. These are RECOVERY INCOME components (NNN passthroughs the tenant reimburses), not landlord operating spend. base+cam+tax+ins == total. Annual recovery income = PSF * unit SF.",
    "camFlatPsf": 2.10,
    "units": units,
}
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(out, f, indent=1, ensure_ascii=False)
    f.write("\n")
print("recoveries.json written:", len(units), "units")
for w in warnings:
    print("  RECONCILE:", w)
if not warnings:
    print("  all rows reconcile (base+cam+tax+ins == total)")
