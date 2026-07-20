# -*- coding: utf-8 -*-
"""C1 — Orange Ocean case study: "The Instrumented Asset" (On The Boulevard).

OO B2B brand via tools/otb_brand.py (light background -> light logo per
do-dont-rules.md; Sunset Orange as accent only; Helvetica; operator tone,
no startup jargon). Letter-portrait, single page, print-clean.

Facts policy: audited figures only (GLA 62,883 / 27 suites / 25 occupied,
zero holdovers Jul 2026); 2025 marketing-package stats labeled (2025);
VPD phrased as "passing the center"; NO rents or financials.

Emits marketing/OO-case-study-OTB.html (self-contained; PDF/PNG via chrome
headless — see the npm-adjacent commands in HANDOFF).
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import otb_brand as OB
from otb_brand import esc, ONAVY, ODEEP, ORANGE, OMID, OLIGHT, HELV

ROOT = OB.ROOT
OUT = os.path.join(ROOT, "marketing"); os.makedirs(OUT, exist_ok=True)
OO_LOGO = OB.b64(OB.OO_LOGO_LIGHT)  # light background -> light logo

CAPS = [
    ("Plat-exact digital twin",
     "The recorded plat, CAD geometry, and drone photogrammetry fused into one interactive site "
     "plan — 2D, isometric, satellite, and photoreal 3D capture of the actual buildings."),
    ("One source of truth",
     "Rent roll, recoveries, compliance, insurance, and critical dates reconciled to the signed "
     "rent roll and audited square footages — no re-keying, no competing spreadsheets."),
    ("Grounded AI agent desk",
     "Concierge, leasing, and property-management agents that answer only from property records. "
     "Deal math runs on deterministic engines (NER comparison, CAM gross-up, Louisiana eviction "
     "sequence) behind a numeric guardrail — figures trace to calculations, never to guesses."),
    ("Owner Intelligence Brief",
     "A monthly owner report — occupancy, scheduled rent, expirations, open actions — generated "
     "deterministically from the same records. No model in the loop on any number."),
    ("Instrumented operations",
     "Seventeen-camera coverage layer mapped to the plan, role-gated document vaults for owner "
     "and vendors, and a full audit trail on every file viewed or moved."),
]

STATS = [
    ("25 / 27", "suites occupied — Jul 2026"),
    ("0", "holdover tenancies — all five 2026 renewals executed"),
    ("88%", "tenant retention (2025)"),
    ("14", "businesses on the waitlist (2025)"),
]

html_doc = f"""<!doctype html>
<html><head><meta charset="utf-8"><title>Orange Ocean — Case Study: The Instrumented Asset</title>
<style>
  @page {{ size: letter portrait; margin: 0; }}
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  html, body {{ background: #fff; }}
  body {{ font-family: {HELV}; color: {ONAVY}; width: 8.5in; height: 11in; overflow: hidden; }}
  .page {{ width: 8.5in; height: 11in; padding: 0.55in 0.65in 0.45in; display: flex; flex-direction: column; }}
  .top {{ display: flex; justify-content: space-between; align-items: center; }}
  .top img {{ height: 0.62in; }}
  .kicker {{ font-size: 10.5px; font-weight: 800; letter-spacing: 3px; color: {ORANGE}; text-align: right; }}
  .rule {{ height: 3px; background: {ORANGE}; margin: 0.14in 0 0.22in; }}
  h1 {{ font-size: 34px; font-weight: 900; letter-spacing: -0.5px; }}
  .sub {{ font-size: 13px; color: {OMID}; margin-top: 4px; font-weight: 600; }}
  .lede {{ font-size: 12.5px; line-height: 1.55; margin-top: 0.16in; }}
  .cols {{ display: flex; gap: 0.3in; margin-top: 0.2in; flex: 1; min-height: 0; }}
  .main {{ flex: 1.62; }}
  .side {{ flex: 1; }}
  h2 {{ font-size: 11px; font-weight: 800; letter-spacing: 2.5px; color: {ODEEP};
        border-bottom: 1.5px solid {ONAVY}; padding-bottom: 5px; margin-bottom: 8px; }}
  .cap {{ margin-bottom: 9px; }}
  .cap b {{ font-size: 12px; display: block; margin-bottom: 2px; }}
  .cap p {{ font-size: 10.8px; line-height: 1.45; color: #2c3a55; }}
  .facts {{ background: {OLIGHT}; border-radius: 6px; padding: 12px 14px; margin-bottom: 12px; }}
  .facts div {{ display: flex; justify-content: space-between; font-size: 10.8px; padding: 3.5px 0;
               border-bottom: 1px solid #dde5ee; }}
  .facts div:last-child {{ border-bottom: none; }}
  .facts span:last-child {{ font-weight: 700; text-align: right; }}
  .stat {{ border-left: 3px solid {ORANGE}; padding: 6px 0 6px 12px; margin-bottom: 10px; }}
  .stat .n {{ font-size: 24px; font-weight: 900; line-height: 1; }}
  .stat .l {{ font-size: 10px; color: {OMID}; margin-top: 3px; font-weight: 600; }}
  .problem {{ margin-bottom: 12px; }}
  .problem p {{ font-size: 10.8px; line-height: 1.5; color: #2c3a55; }}
  .cta {{ background: {ODEEP}; color: #fff; border-radius: 6px; padding: 14px 18px;
          display: flex; justify-content: space-between; align-items: center; margin-top: 0.16in; }}
  .cta b {{ font-size: 13.5px; display: block; }}
  .cta p {{ font-size: 10.5px; color: #b9c6da; margin-top: 3px; }}
  .cta .c {{ text-align: right; font-size: 11px; font-weight: 700; line-height: 1.6; white-space: nowrap; }}
  .cta .c span {{ color: {ORANGE}; }}
  .foot {{ font-size: 8.8px; color: #7a879c; text-align: center; margin-top: 0.14in; }}
</style></head><body><div class="page">
  <div class="top">
    <img src="{OO_LOGO}" alt="Orange Ocean, LLC">
    <div class="kicker">CASE STUDY · COMMERCIAL REAL ESTATE × APPLIED AI</div>
  </div>
  <div class="rule"></div>
  <h1>The Instrumented Asset</h1>
  <div class="sub">On The Boulevard Shopping Center · 101–149 Arnould Blvd, Lafayette, Louisiana</div>
  <p class="lede">A 1976 open-air retail center, 62,883 square feet across 27 suites, anchored by
  Jason&rsquo;s Deli on the Johnston Street corridor. Orange Ocean operates the asset for its owner on a
  live digital twin — every lease, plan, camera, and dollar of scheduled rent in one instrumented
  system — and uses it to lease, renew, and maintain the property faster than the paper era ever could.</p>
  <div class="cols">
    <div class="main">
      <div class="problem">
        <h2>THE STARTING POINT</h2>
        <p>Fifty years of records lived in filing cabinets, spreadsheets, and surveyor PDFs. Rent
        rolls disagreed with leases, expirations were tracked from memory, and every leasing or
        capital question began with re-assembling the facts. The asset was sound; the information
        about it was not.</p>
      </div>
      <h2>WHAT ORANGE OCEAN BUILT</h2>
      {"".join('<div class="cap"><b>%s</b><p>%s</p></div>' % (esc(t), esc(d)) for t, d in CAPS)}
    </div>
    <div class="side">
      <div class="facts">
        <div><span>Asset</span><span>Open-air retail center</span></div>
        <div><span>GLA (audited)</span><span>62,883 SF</span></div>
        <div><span>Suites</span><span>27 · two buildings</span></div>
        <div><span>Site</span><span>4.84 acres</span></div>
        <div><span>Anchor</span><span>Jason&rsquo;s Deli</span></div>
        <div><span>Corridor</span><span>33,000+ VPD · Johnston St (US 167)</span></div>
        <div><span>Owner</span><span>Belle Realty of Lafayette, LLC</span></div>
        <div><span>Operator</span><span>Orange Ocean, LLC</span></div>
      </div>
      <h2>RESULTS</h2>
      {"".join('<div class="stat"><div class="n">%s</div><div class="l">%s</div></div>' % (esc(n), esc(l)) for n, l in STATS)}
    </div>
  </div>
  <div class="cta">
    <div>
      <b>Own a property that should run like this?</b>
      <p>Property management and the Business AI &amp; Risk Audit — the same system discipline, applied to your asset or operation.</p>
    </div>
    <div class="c">Adam Anthony Abdalla<br>
      <span>adam@orangeocean.com</span><br>337-288-5411<br>orangeocean.com · orangeocean.ai</div>
  </div>
  <div class="foot">On The Boulevard Shopping Center is owned by Belle Realty of Lafayette, LLC and managed by
  Orange Ocean, LLC. Occupancy and renewal figures as of July 2026 per the signed rent roll; retention and
  waitlist figures from the 2025 marketing review.</div>
</div></body></html>"""

path = os.path.join(OUT, "OO-case-study-OTB.html")
open(path, "w", encoding="utf-8").write(html_doc)
print("OK ->", path)
