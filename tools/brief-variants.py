#!/usr/bin/env python3
"""Generate audience-personalized editions of the feature-value brief.

Reads docs/pitch/feature-value-brief.html (the master, logo already embedded)
and writes two variants with a swapped cover + an audience-specific section:

  feature-value-brief-belle.html    — for Belle Realty of Lafayette (the owner)
  feature-value-brief-partner.html  — for prospective design-partner owners

Re-run after any master-brief edit. PDFs: headless Chrome --print-to-pdf
(write to a temp dir first — Chrome can't write into the repo tree directly).
"""
import os, re, sys

PITCH = os.path.join(os.path.dirname(__file__), "..", "docs", "pitch")
MASTER = os.path.join(PITCH, "feature-value-brief.html")

TAG_RE = re.compile(r'<div class="tag">[^<]*</div>')
ONESENT_RE = re.compile(r'<div class="onesent">.*?</div>', re.S)
COVER_END = "</div>\n\n  <h2>The doctrine"

VARIANTS = {
    "belle": {
        "title": "OTB Property Command — Owner Edition · Belle Realty of Lafayette",
        "tag": '<div class="tag">Prepared for Belle Realty of Lafayette, LLC · July 2026</div>',
        "onesent": (
            '<div class="onesent">Your asset, instrumented: every legal fact, dollar, document, '
            'camera, and workflow of On The Boulevard on <b>one governed surface</b> — operated by '
            'Orange Ocean, with your oversight enforced at the database layer, not by promises.</div>'
        ),
        "insert": """
  <h2>What the owner personally holds</h2>
  <div class="feat"><h3>Standing, read-only truth</h3>
    <p>Your sign-in sees the same live system the operator runs — dashboard, rent roll, financials —
      read-only by database policy. Nothing is prepared specially for you, because nothing needs to
      be: the working system <i>is</i> the report.</p>
    <p class="why"><b>Why it matters:</b> Owner visibility that doesn't depend on asking.</p></div>
  <div class="feat"><h3>The monthly Intelligence Brief</h3>
    <p>On the first of each month: occupancy and scheduled-rent KPIs with real month-over-month
      deltas, vacancies, the 12-month expiration table — every figure computed, no AI in the loop,
      archived permanently in the app.</p>
    <p class="why"><b>Why it matters:</b> Fiduciary-grade reporting nobody had to remember to
      write.</p></div>
  <div class="feat"><h3>The Owner Safe and the append-only record</h3>
    <p>Your documents sit in a vault where every view, upload, and delete is logged. From August 1,
      every dollar of rent lives in an append-only ledger — voids are entries, history is
      permanent.</p>
    <p class="why"><b>Why it matters:</b> If the asset is ever refinanced, audited, or sold, the
      record is already in evidence-grade shape.</p></div>
""",
    },
    "partner": {
        "title": "OTB Property Command — Design-Partner Edition · Orange Ocean",
        "tag": '<div class="tag">Prepared for prospective design-partner owners · July 2026</div>',
        "onesent": (
            '<div class="onesent">A full operating system for retail centers — proven end-to-end on '
            'our own 62,883&nbsp;SF asset with real money and real tenants — now opening to a '
            '<b>small number of design-partner properties</b>.</div>'
        ),
        "insert": """
  <h2>The design-partner offer</h2>
  <div class="feat"><h3>What you get</h3>
    <p>A free pilot for your center while the multi-property build is underway: governed onboarding
      (we build the authority-ranked source-of-truth pack for <i>your</i> rent roll — validation
      rules, exceptions log, the works), the full sheet set, the AI desk with the numeric guardrail,
      and the counterparty rails (vendor, tenant, e-sign) as they apply to your asset.</p>
    <p class="why"><b>Why it matters:</b> You get institutional-grade instrumentation at a
      strip-center price of zero, before pricing exists.</p></div>
  <div class="feat"><h3>What we ask</h3>
    <p>Reference use and honest feedback. Your property becomes part of the proving set the way On
      The Boulevard is — every feature ships tested on real assets before it is sold to anyone.</p>
    <p class="why"><b>Why it matters:</b> Design partners shape the roadmap; later customers buy
      what you helped specify.</p></div>
  <div class="feat"><h3>What we will not do</h3>
    <p>No auto-sent communications to your tenants, no data resale, no lock-in — your full state
      exports as one JSON file at any time, and your documents remain yours.</p>
    <p class="why"><b>Why it matters:</b> The exit is built in, which is exactly why you can commit
      to the pilot.</p></div>
""",
    },
}


def main():
    html = open(MASTER, encoding="utf-8").read()
    for key, v in VARIANTS.items():
        out = html
        out = re.sub(r"<title>[^<]*</title>", f"<title>{v['title']}</title>", out)
        out, n1 = TAG_RE.subn(lambda _: v["tag"], out, count=1)
        out, n2 = ONESENT_RE.subn(lambda _: v["onesent"], out, count=1)
        if COVER_END not in out or not (n1 and n2):
            sys.exit(f"{key}: master structure changed — update tools/brief-variants.py")
        out = out.replace(COVER_END, "</div>\n" + v["insert"] + "\n  <h2>The doctrine", 1)
        path = os.path.join(PITCH, f"feature-value-brief-{key}.html")
        open(path, "w", encoding="utf-8").write(out)
        print(f"wrote {os.path.normpath(path)} ({len(out):,} bytes)")


if __name__ == "__main__":
    main()
