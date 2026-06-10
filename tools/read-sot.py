# One-off SOT workbook inspector — dump header + unit/SF columns.
import openpyxl

PATH = r"C:\Users\adam\OneDrive\Desktop\Belle Realty SOT Documents\XX - Final Versions to be Placed - Copy\OTB-Master-Template-Set-SOT-corrected.xlsx"

wb = openpyxl.load_workbook(PATH, data_only=True)
ws = wb["Sheet2"]
rows = list(ws.iter_rows(values_only=True))
hdr = rows[0]
for i, h in enumerate(hdr):
    print(i, repr(h))
print("---")
for r in rows[1:]:
    print(" | ".join(repr(v) for v in r[:8]))
