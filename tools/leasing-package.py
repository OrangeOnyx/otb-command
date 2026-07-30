# -*- coding: utf-8 -*-
"""Leasing-package v1.5 — hosted public one-pager for the vacant suites.

Renders public/leasing.html (zero JS, strict OTB navy/white, mobile-first,
print-clean). Data comes from the JS seam src/lib/leasing.js via a node
subprocess (tenant-rating matching + drive strip + vacants stay
single-sourced there); brand comes from otb_brand. Google ratings are
attributed per Places TOS. Re-run after tools/gmaps-pull.mjs refreshes
src/data/corridor.json:  python tools/leasing-package.py
"""
import json
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from otb_brand import NAVY, OFF, WHT, HELV, OTB_LOGO_WHITE, b64, esc, CONTACT, ATTRIB

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

NODE_CONTRACT = r"""
import { matchTenants, driveLine, LEASING_URL } from "./src/lib/leasing.js";
import { readFileSync } from "node:fs";
const corridor = JSON.parse(readFileSync("src/data/corridor.json", "utf8"));
const raw = JSON.parse(readFileSync("src/data/units.json", "utf8"));
const units = Array.isArray(raw) ? raw : raw.units;
// Tenant-match across BOTH rings: anchor pins (Jason's Deli at the Patricia ×
// Arnould corner) sit outside the 120 m inner ring — inner-only matching
// mislabels them as neighbors. Inner first so the closer listing wins a unit.
const { tenants, neighbors } = matchTenants(
  corridor.inner.places.concat(corridor.outer.places), units);
const vacants = units.filter(u => u.status === "vacant")
  .map(u => ({ unit: u.unit, sf: u.sf, use: u.use, notes: u.notes }));
console.log(JSON.stringify({
  tenants, neighbors, vacants,
  drive: corridor.driveTimes,
  driveStrip: driveLine(corridor.driveTimes),
  centerListing: corridor.centerListing,
  asOf: corridor.asOf,
  url: LEASING_URL,
}));
"""

D = json.loads(subprocess.run(
    ["node", "--input-type=module", "-e", NODE_CONTRACT],
    cwd=ROOT, capture_output=True, text=True, check=True).stdout)

geometry = json.load(open(os.path.join(ROOT, "src", "data", "geometry.json"), encoding="utf-8"))
PROVIDED = geometry["parking"]["variance"]["provided"]   # 324 — cite legally
GLA = "62,883"                                           # audit-grade (CLAUDE.md property facts)
SUITES = 27

vac = sorted(D["vacants"], key=lambda v: v["unit"])
combined = sum(v["sf"] for v in vac)
# Display gates: >=4.0 and >=10 reviews (a 5-star with 2 reviews reads weaker
# than a 4.9 with 130 — credibility filter, seam stays unfiltered).
tenants = [t for t in D["tenants"] if t["rating"] >= 4.0 and t["ratings"] >= 10][:8]

# Neighbor draws: unmatched places from both rings, minus the center's own
# listing; dedupe by name (rings overlap), top 6 by review count.
draws, seen = [], set()
for p in sorted(D["neighbors"], key=lambda p: -p["ratings"]):
    key = p["name"].lower()
    if key in seen or "on the boulevard" in key or p["rating"] < 4.0:
        continue
    seen.add(key)
    draws.append(p)
draws = draws[:6]

stars = lambda r: ("%.1f" % r).rstrip("0").rstrip(".")

suite_cards = "".join(
    '<div class="suite"><div class="s-num">SUITE %s</div>'
    '<div class="s-sf">%s SF</div><div class="s-use">%s</div></div>'
    % (esc(v["unit"]), format(v["sf"], ","), esc(v["use"])) for v in vac)

tenant_rows = "".join(
    '<tr><td>%s</td><td class="r">%s&#9733;</td><td class="r mut">%s reviews</td></tr>'
    % (esc(t["dba"]), stars(t["rating"]), format(t["ratings"], ",")) for t in tenants)

draw_rows = "".join(
    '<tr><td>%s</td><td class="r">%s&#9733;</td><td class="r mut">%s reviews</td></tr>'
    % (esc(p["name"]), stars(p["rating"]), format(p["ratings"], ",")) for p in draws)

drive_cells = "".join(
    '<div class="dt"><div class="dt-min">%d<span>min</span></div><div class="dt-to">%s</div></div>'
    % (d["minutes"], esc(d["name"])) for d in D["drive"])

cl = D.get("centerListing") or {}
center_line = (' &nbsp;&middot;&nbsp; %s&#9733; on Google (%s reviews)'
               % (stars(cl["rating"]), format(cl["ratings"], ","))) if cl else ""

html = """<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Space for Lease — On The Boulevard · Lafayette, LA</title>
<meta name="description" content="Retail suites for lease at On The Boulevard Shopping Center, 101–149 Arnould Blvd, Lafayette, LA — anchored by Jason's Deli on the Johnston St (US-167) corridor.">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:%(HELV)s;color:%(NAVY)s;background:%(WHT)s;line-height:1.45}
  .wrap{max-width:760px;margin:0 auto;padding:0 20px 40px}
  header{background:%(NAVY)s;color:%(WHT)s;padding:34px 20px 30px;text-align:center}
  header img{width:190px;max-width:60vw}
  .avail{font-size:13px;letter-spacing:.35em;margin-top:18px;color:%(WHT)s;opacity:.92}
  h1{font-size:30px;letter-spacing:.02em;margin-top:6px;font-weight:700;color:%(WHT)s}
  .sub{font-size:13px;margin-top:8px;opacity:.85}
  .suites{display:flex;gap:14px;justify-content:center;margin:26px 0 6px;flex-wrap:wrap}
  .suite{border:2px solid %(NAVY)s;padding:18px 26px;text-align:center;min-width:180px;flex:1}
  .s-num{font-size:13px;letter-spacing:.25em}
  .s-sf{font-size:34px;font-weight:700;margin:4px 0}
  .s-use{font-size:12px;color:#5a6578}
  .combine{text-align:center;font-size:13px;margin:2px 0 4px}
  .rate{text-align:center;font-size:14px;font-weight:700;margin:10px 0 0;letter-spacing:.06em}
  .rate small{display:block;font-weight:400;font-size:12px;color:#5a6578;margin-top:2px}
  section{margin-top:34px}
  h2{font-size:13px;letter-spacing:.3em;border-bottom:2px solid %(NAVY)s;padding-bottom:6px;margin-bottom:12px}
  .drives{display:flex;gap:12px;flex-wrap:wrap}
  .dt{flex:1;min-width:150px;background:%(OFF)s;padding:14px 16px;text-align:center}
  .dt-min{font-size:30px;font-weight:700}
  .dt-min span{font-size:12px;font-weight:400;margin-left:3px}
  .dt-to{font-size:12px;margin-top:2px}
  .cols{display:flex;gap:26px;flex-wrap:wrap}
  .col{flex:1;min-width:260px}
  .col h3{font-size:12px;letter-spacing:.18em;margin-bottom:8px;color:#5a6578;font-weight:700}
  table{width:100%%;border-collapse:collapse;font-size:14px}
  td{padding:5px 0;border-bottom:1px solid #e3e6ec}
  td.r{text-align:right;white-space:nowrap;padding-left:10px}
  td.mut{color:#8a92a3;font-size:12px}
  .facts{display:flex;flex-wrap:wrap;gap:10px 26px;font-size:13px;background:%(OFF)s;padding:16px 18px}
  .facts b{font-size:16px;display:block}
  .contact{margin-top:36px;border-top:2px solid %(NAVY)s;padding-top:18px;text-align:center}
  .call{font-size:26px;font-weight:700;letter-spacing:.02em;text-decoration:none;color:%(NAVY)s}
  .call-sub{font-size:12px;color:#5a6578;margin-top:2px}
  .who{font-size:13px;margin-top:14px;line-height:1.6}
  .attrib{font-size:10px;color:#8a92a3;margin-top:18px;text-align:center}
  a{color:%(NAVY)s}
  @media print{header{-webkit-print-color-adjust:exact;print-color-adjust:exact}.wrap{max-width:none}}
  @page{size:letter;margin:0.4in}
</style></head><body>
<header>
  <img src="%(LOGO)s" alt="On The Boulevard">
  <div class="avail">SPACE FOR LEASE</div>
  <h1>Two inline suites on the boulevard</h1>
  <div class="sub">101&ndash;149 Arnould Blvd &middot; Lafayette, LA 70506 &middot; Johnston St (US&#8209;167) corridor%(CENTER_LINE)s</div>
</header>
<div class="wrap">
  <div class="suites">%(SUITE_CARDS)s</div>
  <div class="combine">Adjacent bays &mdash; combinable to <b>%(COMBINED)s SF</b></div>
  <div class="rate">HIGH&#8209;TEENS $/SF &middot; NNN<small>Formal proposal on request &mdash; same&#8209;day turnaround</small></div>

  <section><h2>MINUTES FROM EVERYWHERE</h2>
    <div class="drives">%(DRIVE_CELLS)s</div>
  </section>

  <section><h2>THE CORRIDOR ALREADY PERFORMS</h2>
    <div class="cols">
      <div class="col"><h3>AT THE CENTER</h3><table>%(TENANT_ROWS)s</table></div>
      <div class="col"><h3>SURROUNDING DRAWS</h3><table>%(DRAW_ROWS)s</table></div>
    </div>
  </section>

  <section><h2>THE PROPERTY</h2>
    <div class="facts">
      <div><b>%(GLA)s SF</b> gross leasable area</div>
      <div><b>%(SUITES)s</b> suites &middot; 2 buildings</div>
      <div><b>%(PARKING)s</b> parking spaces</div>
      <div><b>Jason&rsquo;s Deli</b> anchor</div>
    </div>
  </section>

  <div class="contact">
    <a class="call" href="tel:+13372707044">(337)&nbsp;270&#8209;7044</a>
    <div class="call-sub">24/7 leasing line &mdash; call any time, tours book on the spot</div>
    <div class="who">%(CONTACT0)s<br>%(CONTACT1)s<br>%(CONTACT2)s</div>
    <div class="attrib">%(ATTRIB)s<br>Ratings &amp; drive times: Google &middot; as of %(ASOF)s</div>
  </div>
</div>
</body></html>
""" % {
    "HELV": HELV, "NAVY": NAVY, "OFF": OFF, "WHT": WHT,
    "LOGO": b64(OTB_LOGO_WHITE),
    "CENTER_LINE": center_line,
    "SUITE_CARDS": suite_cards,
    "COMBINED": format(combined, ","),
    "DRIVE_CELLS": drive_cells,
    "TENANT_ROWS": tenant_rows,
    "DRAW_ROWS": draw_rows,
    "GLA": GLA, "SUITES": SUITES, "PARKING": PROVIDED,
    "CONTACT0": esc(CONTACT[0]), "CONTACT1": esc(CONTACT[1]), "CONTACT2": esc(CONTACT[2]),
    "ATTRIB": esc(ATTRIB),
    "ASOF": D["asOf"],
}

dest = os.path.join(ROOT, "public", "leasing.html")
with open(dest, "w", encoding="utf-8") as f:
    f.write(html)
print("leasing.html: %d suites, %d tenant ratings, %d draws, %d KB -> %s"
      % (len(vac), len(tenants), len(draws), len(html) // 1024, dest))
