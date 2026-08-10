# -*- coding: utf-8 -*-
"""Manual builder — docs/manual/*.md -> branded HTML + PDF.

Re-run after editing either manual:  python tools/build-manuals.py
Outputs (next to the sources, image refs stay relative to img/):
    docs/manual/operator-manual.html   + OO-Atlas-Operator-Manual.pdf
    docs/manual/onboarding-manual.html + OO-Atlas-Onboarding-Manual.pdf
    docs/manual/complete-documentation.html + OO-Atlas-Complete-Documentation.pdf
      (Book I operating manual + Book II onboarding, one file)
PDFs render via headless Chrome (write to temp, copy in — Chrome can't write
into the repo tree). Plan-room palette from otb_brand; screenshots are REAL
prod captures in docs/manual/img/ (regen rig lives with the session notes)."""
import os, shutil, subprocess, sys, tempfile

import markdown  # pip: markdown

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from otb_brand import INK, PAPER, CARD, BRASS, SAGE, GRN, BRICK, esc

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "docs", "manual")
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

MANUALS = [
    ("operator-manual.md", "operator-manual.html", "OO-Atlas-Operator-Manual.pdf",
     "OPERATING MANUAL", "M-1"),
    ("onboarding-manual.md", "onboarding-manual.html", "OO-Atlas-Onboarding-Manual.pdf",
     "ONBOARDING MANUAL", "M-2"),
    ([("BOOK I — OPERATING MANUAL", "operator-manual.md"),
      ("BOOK II — PROPERTY ONBOARDING", "onboarding-manual.md")],
     "complete-documentation.html", "OO-Atlas-Complete-Documentation.pdf",
     "COMPLETE PROGRAM DOCUMENTATION", "M-0"),
]

CSS = f"""
@import url('https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@500;700&family=Public+Sans:ital,wght@0,400;0,600;0,700;1,400&family=IBM+Plex+Mono:wght@400;600&display=swap');
* {{ box-sizing: border-box; }}
body {{ margin:0; background:{PAPER}; color:{INK};
  font:15px/1.55 'Public Sans',sans-serif; }}
.wrap {{ max-width:880px; margin:0 auto; padding:28px 34px 60px; }}
.titleblock {{ border:2px solid {INK}; background:{CARD}; padding:14px 20px;
  margin-bottom:30px; display:flex; justify-content:space-between;
  align-items:baseline; gap:16px; flex-wrap:wrap; }}
.titleblock .name {{ font:700 30px 'Big Shoulders Display',sans-serif;
  letter-spacing:.5px; }}
.titleblock .sheet {{ font:600 13px 'IBM Plex Mono',monospace; color:{BRASS}; }}
h1 {{ font:700 26px 'Big Shoulders Display',sans-serif; letter-spacing:.5px;
  border-bottom:2px solid {INK}; padding-bottom:6px; margin:44px 0 14px;
  break-after:avoid; }}
h2 {{ font:700 19px 'Big Shoulders Display',sans-serif; letter-spacing:.4px;
  color:{GRN}; margin:30px 0 8px; break-after:avoid; }}
h3 {{ font:600 15px 'Public Sans',sans-serif; margin:22px 0 6px; }}
p {{ margin:8px 0; }}
strong {{ color:{INK}; }}
a {{ color:{GRN}; }}
img {{ max-width:100%; border:1px solid {SAGE}; border-radius:3px;
  margin:10px 0 4px; break-inside:avoid; }}
table {{ border-collapse:collapse; font-size:13px; margin:12px 0; width:100%;
  break-inside:avoid; }}
th, td {{ border:1px solid {SAGE}; padding:5px 9px; text-align:left;
  vertical-align:top; }}
th {{ background:{CARD}; font:600 12px 'IBM Plex Mono',monospace;
  text-transform:uppercase; letter-spacing:.4px; }}
code {{ font:13px 'IBM Plex Mono',monospace; background:{CARD};
  padding:1px 5px; border-radius:3px; }}
pre {{ background:{CARD}; border:1px solid {SAGE}; border-radius:3px;
  padding:12px 14px; overflow-x:auto; break-inside:avoid; }}
pre code {{ background:none; padding:0; }}
blockquote {{ border-left:4px solid {BRASS}; margin:10px 0; padding:2px 14px;
  color:{SAGE}; }}
ul, ol {{ margin:8px 0; padding-left:26px; }}
li {{ margin:3px 0; }}
hr {{ border:none; border-top:1px solid {SAGE}; margin:26px 0; }}
.confid {{ color:{BRICK}; font:600 12px 'IBM Plex Mono',monospace;
  letter-spacing:.6px; }}
.foot {{ margin-top:46px; border-top:2px solid {INK}; padding-top:10px;
  font:11px 'IBM Plex Mono',monospace; color:{SAGE};
  display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px; }}
@page {{ size: letter; margin: 14mm 12mm; }}
@media print {{
  body {{ background:#fff; }}
  .wrap {{ max-width:none; padding:0; }}
  img {{ border-color:#ccc; }}
}}
"""


BOOK_DIVIDER = """<div style="border:2px solid #1C2B26; background:#F6F7F1;
  padding:18px 22px; margin:52px 0 30px; break-before:page;
  font:700 24px 'Big Shoulders Display',sans-serif; letter-spacing:.6px;">
  {title}</div>"""


def build(md_name, html_name, pdf_name, doc_title, sheet_code):
    if isinstance(md_name, list):  # combined: [(book title, md file), ...]
        text, parts = "", []
        toc = "".join(f"<li>{esc(t)}</li>" for t, _ in md_name)
        parts.append('<p style="font-size:14px;color:#5F6E64">One document, '
                     f"every part of the program:</p><ul>{toc}</ul>")
        for i, (book_title, f) in enumerate(md_name):
            src = open(os.path.join(SRC, f), encoding="utf-8").read()
            text += src
            div = BOOK_DIVIDER.format(title=esc(book_title))
            if i == 0:
                div = div.replace("break-before:page;", "")
            parts.append(div + markdown.markdown(src, extensions=["tables", "fenced_code"]))
        body = "\n".join(parts)
    else:
        md_path = os.path.join(SRC, md_name)
        text = open(md_path, encoding="utf-8").read()
        body = markdown.markdown(text, extensions=["tables", "fenced_code"])
    # First line of the MD is the doc H1 — the title block carries branding.
    confid = "CONFIDENTIAL" in text[:400]
    html_doc = f"""<!doctype html><html><head><meta charset="utf-8">
<title>Orange Ocean Atlas — {esc(doc_title.title())}</title>
<style>{CSS}</style></head><body><div class="wrap">
<div class="titleblock">
  <div><div class="name">ORANGE OCEAN ATLAS · OTB</div>
  <div style="font:600 13px 'IBM Plex Mono',monospace">{esc(doc_title)} · AUGUST 2026{' · <span class=confid>CONFIDENTIAL</span>' if confid else ''}</div></div>
  <div class="sheet">SHEET {esc(sheet_code)} · 101–149 ARNOULD BLVD · LAFAYETTE, LA</div>
</div>
{body}
<div class="foot">
  <span>ORANGE OCEAN ATLAS — instrumented asset management</span>
  <span>Managed by Orange Ocean, LLC · generated {esc(__import__('datetime').date.today().isoformat())}</span>
</div>
</div></body></html>"""
    html_path = os.path.join(SRC, html_name)
    open(html_path, "w", encoding="utf-8").write(html_doc)

    tmp = os.path.join(tempfile.gettempdir(), pdf_name)
    subprocess.run([
        CHROME, "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
        "--virtual-time-budget=25000",
        "--print-to-pdf=" + tmp,
        "file:///" + html_path.replace("\\", "/"),
    ], check=True, capture_output=True)
    shutil.copyfile(tmp, os.path.join(SRC, pdf_name))
    os.remove(tmp)
    print(f"{md_name} -> {html_name} + {pdf_name} "
          f"({round(os.path.getsize(os.path.join(SRC, pdf_name)) / 1048576, 1)} MB)")


if __name__ == "__main__":
    for spec in MANUALS:
        build(*spec)
