# -*- coding: utf-8 -*-
"""Manual builder — docs/manual/*.md -> branded HTML + PDF.

Re-run after editing either manual:  python tools/build-manuals.py
Outputs (next to the sources, image refs stay relative to img/):
    docs/manual/operator-manual.html   + Cypress-Command-Operator-Manual.pdf
    docs/manual/onboarding-manual.html + Cypress-Command-Onboarding-Manual.pdf
    docs/manual/complete-documentation.html + Cypress-Command-Complete-Documentation.pdf
      (Book I operating manual + Book II onboarding, one file)

Layout (2026-10-05 presentation edition): full-bleed cover (04C reverse lockup
on Charcoal + the A-8 render + a drawing-set title block), contents page with
the live sheet index (parsed from src/lib/pages.js), one divider per Part,
sheet-code chips on section heads, numbered figure captions, running footer
with page numbers. Body stays in the locked plan-room palette.

PDF engine: Playwright (pip install playwright pypdf) when present — cover is
rendered margin-less and merged ahead of the footered body. Fallback: headless
Chrome CLI (no running footer). Screenshots are REAL prod captures in
docs/manual/img/ (regen rig lives with the session notes)."""
import base64, datetime, html as htmllib, os, re, shutil, subprocess, sys, tempfile

import markdown  # pip: markdown

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from otb_brand import INK, PAPER, CARD, BRASS, SAGE, GRN, BRICK, esc

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "docs", "manual")
CHROME_CANDIDATES = [
    os.environ.get("CHROME_PATH", ""),
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
    "/usr/bin/chromium", "/usr/bin/google-chrome",
]
CHROME = next((c for c in CHROME_CANDIDATES if c and os.path.exists(c)), CHROME_CANDIDATES[1])

PRODUCT = "Cypress Command Platform"
DEPLOYMENT = "On The Boulevard Shopping Center"
ADDRESS = "101–149 Arnould Blvd · Lafayette, LA 70506"
EDITION = "OCTOBER 2026"
ANCHOR = "#1E4F3C"
CHARCOAL = "#0A1F16"  # 04C brand Charcoal — the only ground the reverse lockup may sit on

MANUALS = [
    ("operator-manual.md", "operator-manual.html", "Cypress-Command-Operator-Manual.pdf",
     "OPERATING MANUAL", "M-1"),
    ("onboarding-manual.md", "onboarding-manual.html", "Cypress-Command-Onboarding-Manual.pdf",
     "ONBOARDING MANUAL", "M-2"),
    ([("BOOK I — OPERATING MANUAL", "operator-manual.md"),
      ("BOOK II — PROPERTY ONBOARDING", "onboarding-manual.md")],
     "complete-documentation.html", "Cypress-Command-Complete-Documentation.pdf",
     "COMPLETE PROGRAM DOCUMENTATION", "M-0"),
]

COVER_SUB = {
    "M-1": "How to run the property from the drawing set: every sheet, every role, every rhythm.",
    "M-2": "Bringing a new property onto the platform: intake, dry run, live run, verification.",
    "M-0": "The operating manual and the property-onboarding manual in one volume.",
}

SHEET_GROUPS = [  # sheet-code prefix -> group label (index page)
    ("D", "Dashboards"), ("A", "Spatial & twin"), ("R", "Money"), ("P", "Money"),
    ("C", "Obligations"), ("T", "Obligations"), ("S", "Records"), ("K", "Records"),
    ("AI", "Intelligence"), ("W", "Work"), ("M", "Work"), ("O", "Work"),
    ("B", "Outreach"), ("L", "Outreach"), ("N", "Outreach"), ("V", "Counterparties"),
]

ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"]


def data_uri(path, mime):
    return f"data:{mime};base64," + base64.b64encode(open(path, "rb").read()).decode()


def sheets():
    """[(code, label)] from the nav single source (src/lib/pages.js)."""
    js = open(os.path.join(ROOT, "src", "lib", "pages.js"), encoding="utf-8").read()
    block = js[js.index("export const PAGES"):]
    block = block[:block.index("];")]
    return re.findall(r'\[\s*"[^"]+",\s*"([^"]+)",\s*"([^"]+)"\s*\]', block)


CSS = f"""
@import url('https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@500;700;800&family=Public+Sans:ital,wght@0,400;0,600;0,700;1,400&family=IBM+Plex+Mono:wght@400;600&display=swap');
:root {{ --ink:{INK}; --paper:{PAPER}; --card:{CARD}; --brass:{BRASS}; --sage:{SAGE};
  --grn:{GRN}; --anchor:{ANCHOR}; --brick:{BRICK}; --charcoal:{CHARCOAL}; }}
* {{ box-sizing:border-box; }}
html {{ -webkit-print-color-adjust:exact; print-color-adjust:exact; }}
body {{ margin:0; background:var(--paper); color:var(--ink);
  font:15px/1.6 'Public Sans',sans-serif; }}
.mono {{ font-family:'IBM Plex Mono',monospace; }}

/* ---------- cover ---------- */
.cover {{ background:var(--charcoal); color:#F3EDE0; position:relative;
  min-height:100vh; display:flex; flex-direction:column; overflow:hidden; }}
.cover .grid {{ position:absolute; inset:0; opacity:.07; pointer-events:none;
  background-image:linear-gradient(#F3EDE0 1px,transparent 1px),
    linear-gradient(90deg,#F3EDE0 1px,transparent 1px);
  background-size:28px 28px; }}
.cover .top {{ position:relative; padding:44px 56px 0; display:flex;
  justify-content:space-between; align-items:flex-start; gap:24px; }}
.cover .lockup {{ width:300px; height:auto; display:block; margin:-14px 0 0 -18px; }}
.cover .stamp {{ font:600 11px 'IBM Plex Mono',monospace; letter-spacing:1.4px;
  border:1.5px solid {BRASS}; color:{BRASS}; padding:7px 12px; text-align:right;
  line-height:1.6; }}
.cover .titles {{ position:relative; padding:34px 56px 0; }}
.cover .eyebrow {{ font:600 12px 'IBM Plex Mono',monospace; letter-spacing:2.4px;
  color:{BRASS}; }}
.cover h1.doc {{ font:800 76px/0.95 'Big Shoulders Display',sans-serif;
  letter-spacing:1px; margin:10px 0 14px; color:#F3EDE0; border:0; padding:0; }}
.cover .deploy {{ font:600 20px 'Public Sans',sans-serif; color:#F3EDE0; }}
.cover .addr {{ font:13px 'IBM Plex Mono',monospace; color:#B9C2B6; margin-top:4px;
  letter-spacing:.6px; }}
.cover .lede {{ max-width:560px; color:#D8DCCF; font-size:15px; margin:16px 0 0; }}
.cover .hero {{ position:relative; margin:30px 56px 0; border:1.5px solid #3B5446;
  background:#14301F; flex:1 1 auto; min-height:300px; display:flex; }}
.cover .hero img {{ width:100%; height:100%; object-fit:cover; display:block;
  border:0; margin:0; border-radius:0; }}
.cover .hero .cap {{ position:absolute; left:0; bottom:0; background:var(--charcoal);
  color:#B9C2B6; font:10.5px 'IBM Plex Mono',monospace; letter-spacing:.8px;
  padding:6px 10px; border-top:1.5px solid #3B5446; border-right:1.5px solid #3B5446; }}
.cover .tb {{ position:relative; margin:22px 56px 44px; display:grid;
  grid-template-columns:2.2fr 1.6fr 1fr 1.2fr 1.6fr; border:1.5px solid #F3EDE0; }}
.cover .tb div {{ padding:9px 12px; border-left:1px solid #5B7363; }}
.cover .tb div:first-child {{ border-left:0; }}
.cover .tb b {{ display:block; font:600 9.5px 'IBM Plex Mono',monospace;
  letter-spacing:1.4px; color:{BRASS}; margin-bottom:3px; }}
.cover .tb span {{ font:600 13px 'Public Sans',sans-serif; color:#F3EDE0; }}
.cover .tb .big {{ font:800 26px/1 'Big Shoulders Display',sans-serif; }}

/* ---------- reading column ---------- */
.wrap {{ max-width:900px; margin:0 auto; padding:40px 40px 60px; }}
.webbar {{ font:12px 'IBM Plex Mono',monospace; margin:0 0 18px; display:flex;
  gap:16px; flex-wrap:wrap; }}
.webbar a {{ color:var(--grn); text-decoration:none; border-bottom:1px solid var(--brass); }}

/* contents + sheet index */
.toc {{ break-after:page; }}
.kicker {{ font:600 11.5px 'IBM Plex Mono',monospace; letter-spacing:2px; color:var(--brass); }}
.toc h2.toc-h {{ font:800 44px/1 'Big Shoulders Display',sans-serif; margin:6px 0 20px;
  color:var(--ink); border-bottom:3px solid var(--ink); padding-bottom:10px; }}
.edition {{ background:var(--card); border:1px solid var(--sage); border-left:5px solid var(--brass);
  padding:12px 16px; margin:0 0 24px; font-size:13.5px; }}
.edition p {{ margin:3px 0; }}
.toc-cols {{ columns:2; column-gap:34px; }}
.toc-part {{ margin:0 0 16px; }}
.toc-part > a {{ break-after:avoid; break-inside:avoid; display:flex; gap:10px; align-items:baseline; text-decoration:none;
  color:var(--ink); font:700 18px 'Big Shoulders Display',sans-serif; letter-spacing:.4px;
  border-bottom:1.5px solid var(--ink); padding-bottom:3px; margin-bottom:5px; }}
.toc-part > a .pn {{ color:var(--brass); font:600 11px 'IBM Plex Mono',monospace;
  letter-spacing:1px; min-width:52px; }}
.toc-part ol {{ list-style:none; margin:0; padding:0; }}
.toc-part li {{ margin:0; font-size:12.5px; line-height:1.75; }}
.toc-part li a {{ color:var(--ink); text-decoration:none; display:flex; gap:8px; }}
.toc-part li .n {{ font:11px 'IBM Plex Mono',monospace; color:var(--sage); min-width:34px; }}
.toc-book {{ font:800 15px 'Big Shoulders Display',sans-serif; letter-spacing:1px;
  background:var(--ink); color:var(--paper); padding:5px 10px; margin:4px 0 10px;
  break-inside:avoid; break-after:avoid; }}
.index {{ break-before:page; padding-top:4px; }}
.index h3 {{ font:700 20px 'Big Shoulders Display',sans-serif; letter-spacing:.5px;
  margin:4px 0 4px; }}
.index .lead {{ font-size:12.5px; color:var(--sage); margin:0 0 10px; }}
.sheetgrid {{ display:grid; grid-template-columns:repeat(5,1fr); border-top:2px solid var(--ink);
  border-left:1px solid var(--sage); }}
.sheetgrid > div {{ border-right:1px solid var(--sage); border-bottom:1px solid var(--sage);
  padding:10px 11px 11px; background:var(--card); }}
.sheetgrid .c {{ font:800 19px/1 'Big Shoulders Display',sans-serif; color:var(--anchor); }}
.sheetgrid .l {{ font-size:11.5px; font-weight:600; margin-top:3px; line-height:1.25; }}
.sheetgrid .g {{ font:9px 'IBM Plex Mono',monospace; color:var(--sage); letter-spacing:.6px;
  text-transform:uppercase; margin-top:2px; }}

/* parts, books, headings */
.book {{ break-before:page; background:var(--charcoal); color:#F3EDE0; padding:60px 46px;
  margin:0 -40px 30px; min-height:240px; }}
.book .kicker {{ color:{BRASS}; }}
.book .t {{ font:800 54px/1 'Big Shoulders Display',sans-serif; margin-top:10px; }}
h1.part {{ break-before:page; margin:0 0 22px; padding:0 0 14px; border-bottom:3px solid var(--ink);
  font:800 46px/1 'Big Shoulders Display',sans-serif; letter-spacing:.6px; }}
h1.part.first {{ break-before:auto; }}
h1.part .pk {{ display:block; font:600 12px 'IBM Plex Mono',monospace; letter-spacing:2.4px;
  color:var(--brass); margin-bottom:10px; }}
h2 {{ font:700 23px/1.15 'Big Shoulders Display',sans-serif; letter-spacing:.4px;
  color:var(--ink); margin:38px 0 10px; break-after:avoid; display:flex; align-items:center;
  gap:10px; flex-wrap:wrap; }}
h2 .num {{ font:600 12px 'IBM Plex Mono',monospace; color:var(--sage); letter-spacing:.5px;
  border:1px solid var(--sage); padding:2px 6px; border-radius:2px; }}
h2 .code {{ font:800 15px/1 'Big Shoulders Display',sans-serif; letter-spacing:.8px;
  background:var(--anchor); color:var(--paper); padding:5px 8px 4px; border-radius:2px; }}
h2::after {{ content:""; flex:1 1 40px; height:1.5px; background:var(--ink); opacity:.85; }}
h3 {{ font:700 15px 'Public Sans',sans-serif; margin:22px 0 6px; color:var(--grn); break-after:avoid; }}
p {{ margin:9px 0; }}
strong {{ color:var(--ink); font-weight:700; }}
a {{ color:var(--grn); }}
ul, ol {{ margin:8px 0; padding-left:24px; }}
li {{ margin:4px 0; }}
li::marker {{ color:var(--brass); }}
hr {{ display:none; }}

/* figures */
figure {{ margin:18px 0 20px; break-inside:avoid; background:var(--card);
  border:1.5px solid var(--ink); }}
figure img {{ display:block; max-width:100%; max-height:560px; width:auto; height:auto; margin:0 auto;
  border:0; }}
figure figcaption {{ border-top:1.5px solid var(--ink); background:var(--paper); }}
figcaption {{ display:flex; justify-content:space-between; gap:12px; padding:6px 10px;
  font:11px 'IBM Plex Mono',monospace; letter-spacing:.5px; color:var(--ink); }}
figcaption b {{ color:var(--brass); font-weight:600; }}
img {{ max-width:100%; }}
.figrow {{ display:flex; gap:18px; justify-content:center; break-inside:avoid; }}
.figrow figure {{ flex:0 1 250px; margin:18px 0; }}
.figrow figure img {{ max-height:none; width:100%; }}

/* tables, code, notes */
table {{ border-collapse:collapse; font-size:13px; margin:14px 0; width:100%; break-inside:avoid;
  border-top:2px solid var(--ink); border-bottom:2px solid var(--ink); }}
th, td {{ border-bottom:1px solid #C9CEC2; padding:7px 10px; text-align:left; vertical-align:top; }}
th {{ background:var(--card); font:600 11px 'IBM Plex Mono',monospace;
  text-transform:uppercase; letter-spacing:.6px; color:var(--anchor); }}
tbody tr:nth-child(even) td {{ background:rgba(246,247,241,.7); }}
code {{ font:12.5px 'IBM Plex Mono',monospace; background:var(--card); border:1px solid #D9DDD2;
  padding:0 5px; border-radius:2px; }}
pre {{ background:var(--ink); color:var(--paper); border-radius:2px; padding:12px 16px;
  overflow-x:auto; break-inside:avoid; }}
pre code {{ background:none; border:0; padding:0; color:inherit; }}
blockquote {{ margin:16px 0; padding:12px 16px 12px 18px; background:var(--card);
  border:1px solid var(--sage); border-left:5px solid var(--brass); break-inside:avoid; }}
blockquote p {{ margin:4px 0; }}
.confid {{ color:var(--brick); font:600 12px 'IBM Plex Mono',monospace; letter-spacing:.6px; }}
.foot {{ margin-top:50px; border-top:2px solid var(--ink); padding-top:10px;
  font:11px 'IBM Plex Mono',monospace; color:var(--sage);
  display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px; }}

@page {{ size:letter; margin:16mm 15mm 18mm; }}
@media print {{
  body {{ background:#fff; }}
  .wrap {{ max-width:none; padding:0; }}
  .book {{ margin:0 0 30px; }}
  .webbar, .foot {{ display:none; }}
}}
@media screen and (max-width:720px) {{
  .wrap {{ padding:24px 16px 48px; }}
  .cover .top, .cover .titles {{ padding-left:20px; padding-right:20px; }}
  .cover .hero, .cover .tb {{ margin-left:20px; margin-right:20px; }}
  .cover .hero {{ min-height:0; flex:0 0 auto; }}
  .cover .hero img {{ height:auto; }}
  .cover h1.doc {{ font-size:48px; }}
  .cover .lockup {{ width:260px; }}
  .cover .stamp {{ display:none; }}
  .cover .tb {{ grid-template-columns:1fr 1fr; }}
  .cover .tb div {{ border-left:0; border-top:1px solid #5B7363; }}
  .toc-cols {{ columns:1; }}
  .sheetgrid {{ grid-template-columns:repeat(2,1fr); }}
  .book {{ margin:0 -16px 24px; padding:40px 20px; }}
  table {{ display:block; overflow-x:auto; }}
}}
"""


def slug(t, seen):
    s = re.sub(r"[^a-z0-9]+", "-", re.sub(r"<[^>]+>", "", t).lower()).strip("-")[:48] or "s"
    base, i = s, 2
    while s in seen:
        s, i = f"{base}-{i}", i + 1
    seen.add(s)
    return s


def render_md(src, prefix, seen, toc, fig, first_part):
    """Markdown -> styled HTML; appends (part title, id, [(num, label, id)]) to toc."""
    lines = src.split("\n")
    lines = lines[1:]  # drop the doc H1 — the cover carries the title
    # Python-Markdown needs a blank line before a list; the sources don't carry one.
    li = re.compile(r"^(\s*)([-*]|\d+[a-z]?\.)\s")
    fixed = []
    for ln in lines:
        if li.match(ln) and fixed and fixed[-1].strip() and not li.match(fixed[-1]) \
                and not fixed[-1].startswith((" ", "\t", "|", ">")):
            fixed.append("")
        fixed.append(ln)
    lines = fixed
    # The front-matter block (up to the first ---) becomes the edition note.
    text = "\n".join(lines)
    front, _, rest = text.partition("\n---\n")
    if not rest:
        front, rest = "", text
    html = markdown.markdown(rest, extensions=["tables", "fenced_code"])
    edition = markdown.markdown(front, extensions=["tables"]) if front.strip() else ""

    def h1(m):
        title = m.group(1).strip()
        pm = re.match(r"(Part\s+[IVX]+)\s+[—-]\s+(.*)", title)
        nm = re.match(r"(\d+)\.\s+(.*)", title)
        if pm:
            kick, name = pm.group(1).upper(), pm.group(2)
        elif nm:
            kick, name = "SECTION " + nm.group(1), nm.group(2)
        else:
            kick, name = "", title
        hid = slug(prefix + name, seen)
        toc.append([kick, htmllib.unescape(name), hid, []])
        cls = "part first" if first_part[0] else "part"
        first_part[0] = False
        k = f'<span class="pk">{kick}</span>' if kick else ""
        return f'<h1 class="{cls}" id="{hid}">{k}{name}</h1>'

    def h2(m):
        title = m.group(1).strip()
        nm = re.match(r"(\d+(?:\.\d+)*[a-z]?)\s+(.*)", title)
        num, rest_t = (nm.group(1), nm.group(2)) if nm else ("", title)
        cm = re.match(r"([A-Z]{1,2}-\d)\s+(.*)", rest_t)
        code, label = (cm.group(1), cm.group(2)) if cm else ("", rest_t)
        hid = slug(prefix + title, seen)
        if toc:
            toc[-1][3].append((num, (code + " " if code else "") + htmllib.unescape(re.sub(r"<[^>]+>", "", label)), hid))
        out = f'<h2 id="{hid}">'
        if num:
            out += f'<span class="num">§{num}</span>'
        if code:
            out += f'<span class="code">{code}</span>'
        return out + f"<span>{label}</span></h2>"

    def figure(m):
        alt, src_ = m.group(1), m.group(2)
        fig[0] += 1
        return (f'<figure><img src="{src_}" alt="{alt}">'
                f'<figcaption><span><b>FIG. {fig[0]:02d}</b> &nbsp;{alt}</span>'
                f'<span>{PRODUCT.upper()}</span></figcaption></figure>')

    html = re.sub(r"<h1>(.*?)</h1>", h1, html)
    html = re.sub(r"<h2>(.*?)</h2>", h2, html)
    html = re.sub(r'<p><img alt="([^"]*)" src="([^"]+)" ?/?></p>',
                  figure, html)
    # A paragraph of several images (phone captures) -> a side-by-side figure row.
    def figrow(m):
        imgs = re.findall(r'<img alt="([^"]*)" src="([^"]+)" ?/?>', m.group(0))
        return '<div class="figrow">' + "".join(
            figure(re.match(r'(.*)\x00(.*)', a + "\x00" + s_)) for a, s_ in imgs) + "</div>"
    html = re.sub(r'<p>(?:\s*<img [^>]+>\s*){2,}</p>', figrow, html)
    return edition, html


def index_block():
    groups = dict(SHEET_GROUPS)
    cells = []
    for code, label in sheets():
        g = groups.get(code.split("-")[0], "")
        cells.append(f'<div><div class="c">{esc(code)}</div><div class="l">{esc(label)}</div>'
                     f'<div class="g">{esc(g)}</div></div>')
    n = len(cells)
    return (f'<div class="index"><div class="kicker">THE DRAWING SET</div>'
            f'<h3>Sheet index — {n} sheets</h3>'
            f'<p class="lead">The left sidebar of the app, in drawing-set order. Every sheet is '
            f'derived from the same governed data; roles see only the sheets they are granted.</p>'
            f'<div class="sheetgrid">{"".join(cells)}</div></div>')


def cover(doc_title, sheet_code, confid):
    lockup = data_uri(os.path.join(ROOT, "public", "brand", "cypress",
                                   "cc-04c-horizontal-reverse.svg"), "image/svg+xml")
    hero = "img/styled-overview.webp"
    today = datetime.date.today().isoformat()
    words = doc_title.title().replace("Of", "of")
    return f"""<section class="cover"><div class="grid"></div>
<div class="top"><img class="lockup" src="{lockup}" alt="{PRODUCT}">
<div class="stamp">{esc(EDITION)}<br>SHEET {esc(sheet_code)}{'<br><span style="color:#E08A62">CONFIDENTIAL</span>' if confid else ''}</div></div>
<div class="titles"><div class="eyebrow">{esc(PRODUCT.upper())} · OTB DEPLOYMENT</div>
<h1 class="doc">{esc(words)}</h1>
<div class="deploy">{esc(DEPLOYMENT)}</div>
<div class="addr">{esc(ADDRESS.upper())}</div>
<p class="lede">{esc(COVER_SUB.get(sheet_code, ""))}</p></div>
<div class="hero"><img src="{hero}" alt="A-8 Styled Twin — the center at golden hour">
<div class="cap">A-8 STYLED TWIN · PLAN-TRUE TO THE CAD AT SURVEY HEIGHTS</div></div>
<div class="tb">
<div><b>PROJECT</b><span>{esc(DEPLOYMENT)}</span></div>
<div><b>DOCUMENT</b><span>{esc(words)}</span></div>
<div><b>SHEET</b><span class="big">{esc(sheet_code)}</span></div>
<div><b>EDITION</b><span>{esc(EDITION.title())}</span></div>
<div><b>PREPARED BY</b><span>Orange Ocean, LLC · {today}</span></div>
</div></section>"""


def build(md_name, html_name, pdf_name, doc_title, sheet_code):
    seen, toc, fig, first = set(), [], [0], [True]
    if isinstance(md_name, list):  # combined: [(book title, md file), ...]
        text, parts, books = "", [], []
        for i, (book_title, f) in enumerate(md_name):
            src = open(os.path.join(SRC, f), encoding="utf-8").read()
            text += src
            start = len(toc)
            ed, body = render_md(src, f"b{i}-", seen, toc, fig, [True])
            bk, _, bt = book_title.partition(" — ")
            parts.append(f'<div class="book"><div class="kicker">{esc(bk)}</div>'
                         f'<div class="t">{esc(bt)}</div></div>' + body)
            books.append((book_title, start, len(toc), ed))
        body = "\n".join(parts)
        edition = books[0][3]
    else:
        text = open(os.path.join(SRC, md_name), encoding="utf-8").read()
        edition, body = render_md(text, "", seen, toc, fig, first)
        books = None

    def toc_parts(items):
        out = []
        for kick, name, hid, secs in items:
            li = "".join(f'<li><a href="#{s}"><span class="n">{esc(n)}</span>'
                         f'<span>{esc(l)}</span></a></li>' for n, l, s in secs)
            out.append(f'<div class="toc-part"><a href="#{hid}"><span class="pn">{esc(kick)}</span>'
                       f'<span>{esc(name)}</span></a><ol>{li}</ol></div>')
        return "".join(out)

    if books:
        toc_html = "".join(f'<div class="toc-book">{esc(bt)}</div>' + toc_parts(toc[a:b])
                           for bt, a, b, _ in books)
    else:
        toc_html = toc_parts(toc)
    show_index = sheet_code in ("M-1", "M-0")
    confid = "CONFIDENTIAL" in text[:400]
    words = doc_title.title().replace("Of", "of")
    page = f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{PRODUCT} — {esc(words)}</title>
<style>{CSS}</style></head><body>
{cover(doc_title, sheet_code, confid)}
<main class="wrap">
<section class="toc"><div class="kicker">{esc(PRODUCT.upper())} · SHEET {esc(sheet_code)}</div>
<h2 class="toc-h">Contents</h2>
{f'<div class="edition">{edition}</div>' if edition else ''}
<div class="toc-cols">{toc_html}</div>
{index_block() if show_index else ''}
</section>
{body}
<div class="foot">
  <span>{PRODUCT.upper()} — instrumented asset management</span>
  <span>Managed by Orange Ocean, LLC · generated {datetime.date.today().isoformat()}</span>
</div>
</main></body></html>"""
    html_path = os.path.join(SRC, html_name)
    open(html_path, "w", encoding="utf-8").write(page)
    pdf(html_path, os.path.join(SRC, pdf_name), words, sheet_code)
    print(f"{html_name} + {pdf_name} "
          f"({round(os.path.getsize(os.path.join(SRC, pdf_name)) / 1048576, 1)} MB, {fig[0]} figures)")


FOOTER = """<div style="width:100%;padding:0 15mm;font:7.5px 'IBM Plex Mono',monospace;
letter-spacing:.8px;color:#5F6E64;display:flex;justify-content:space-between;">
<span>{left}</span><span>SHEET {code} · <span class="pageNumber"></span> / <span class="totalPages"></span></span></div>"""


def pdf(html_path, out, words, code):
    try:
        from playwright.sync_api import sync_playwright
        import pypdf
    except ImportError:
        return pdf_cli(html_path, out)
    url = "file://" + ("/" if not html_path.startswith("/") else "") + html_path.replace("\\", "/")
    tmp = tempfile.mkdtemp()
    proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy")
    launch = {"proxy": {"server": proxy}} if proxy else {}
    if os.path.exists(CHROME):
        launch["executable_path"] = CHROME
    with sync_playwright() as p:
        b = p.chromium.launch(**launch)
        # Sandboxed builds sit behind a TLS-inspecting proxy; fonts are public CSS/woff2.
        pg = b.new_page(ignore_https_errors=True)
        pg.goto(url, wait_until="networkidle", timeout=90000)
        pg.evaluate("document.fonts.ready")
        pg.wait_for_timeout(600)
        # Cover: margin-less, one page, the reading column hidden.
        pg.add_style_tag(content="@page{margin:0} main{display:none} .cover{height:11in;min-height:0}")
        pg.pdf(path=os.path.join(tmp, "cover.pdf"), format="Letter", print_background=True,
               page_ranges="1", margin={"top": "0", "right": "0", "bottom": "0", "left": "0"})
        pg.reload(wait_until="networkidle")
        pg.evaluate("document.fonts.ready")
        pg.add_style_tag(content=".cover{display:none}")
        left = f"{PRODUCT.upper()} · {words.upper()} · {EDITION}"
        pg.pdf(path=os.path.join(tmp, "body.pdf"), format="Letter", print_background=True,
               display_header_footer=True, header_template="<span></span>",
               footer_template=FOOTER.format(left=left, code=code),
               margin={"top": "16mm", "right": "15mm", "bottom": "18mm", "left": "15mm"})
        b.close()
    w = pypdf.PdfWriter()
    for f in ("cover.pdf", "body.pdf"):
        w.append(os.path.join(tmp, f))
    w.add_metadata({"/Title": f"{PRODUCT} — {words}", "/Author": "Orange Ocean, LLC",
                    "/Subject": f"{DEPLOYMENT} · {ADDRESS}"})
    with open(out, "wb") as fh:
        w.write(fh)
    shutil.rmtree(tmp, ignore_errors=True)


def pdf_cli(html_path, out):
    tmp = os.path.join(tempfile.gettempdir(), os.path.basename(out))
    subprocess.run([
        CHROME, "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
        "--virtual-time-budget=25000", "--print-to-pdf=" + tmp,
        "file:///" + html_path.replace("\\", "/").lstrip("/"),
    ], check=True, capture_output=True)
    shutil.copyfile(tmp, out)
    os.remove(tmp)


def publish():
    """In-app copy: public/manual/ serves at otb.cypresscommand.com/manual/ (and orangeoceanatlas.com/manual/)
    (sidebar 📖 User manual link, every role). Generic edition only — the
    combined doc carries fictional sample data by construction."""
    pub = os.path.join(ROOT, "public", "manual")
    os.makedirs(pub, exist_ok=True)
    html_doc = open(os.path.join(SRC, "complete-documentation.html"), encoding="utf-8").read()
    banner = ('<nav class="webbar"><a href="Cypress-Command-Complete-Documentation.pdf">⤓ Download as PDF</a>'
              '<a href="intake-form.html">Property intake form</a>'
              '<a href="/">← Back to the app</a></nav>')
    html_doc = html_doc.replace('<main class="wrap">', '<main class="wrap">' + banner, 1)
    open(os.path.join(pub, "index.html"), "w", encoding="utf-8").write(html_doc)
    for _, _, pdf_name, _, _ in MANUALS:  # same content as the combined doc, split per book
        shutil.copyfile(os.path.join(SRC, pdf_name), os.path.join(pub, pdf_name))
    shutil.copyfile(os.path.join(ROOT, "docs", "phase-c", "intake-form.html"),
                    os.path.join(pub, "intake-form.html"))
    img_dst = os.path.join(pub, "img")
    shutil.rmtree(img_dst, ignore_errors=True)
    shutil.copytree(os.path.join(SRC, "img"), img_dst)
    n = len(os.listdir(img_dst))
    print(f"published -> public/manual/ (index.html + {len(MANUALS)} PDFs + {n} images)")


# Operator rule (2026-08-03, reaffirmed 2026-10-06): the current manual PDFs always
# live in Drive. Drive for desktop syncs this folder; the Drive doc "Cypress Command
# Manual — current PDFs" in it links the live copies. Override with OTB_DRIVE_MANUAL.
DRIVE_MANUAL = os.environ.get("OTB_DRIVE_MANUAL",
                              r"G:\My Drive\00 OTB\Cypress Command Manual")


def sync_drive():
    """Copy every manual PDF into the synced Drive folder, replacing the previous
    edition in place. Skipped (with a note) on machines without the Drive mount."""
    if not os.path.isdir(os.path.dirname(DRIVE_MANUAL)):
        print(f"drive sync skipped — {DRIVE_MANUAL} not mounted here")
        return
    os.makedirs(DRIVE_MANUAL, exist_ok=True)
    for _, _, pdf_name, _, _ in MANUALS:
        shutil.copyfile(os.path.join(SRC, pdf_name), os.path.join(DRIVE_MANUAL, pdf_name))
    print(f"drive -> {DRIVE_MANUAL} ({len(MANUALS)} PDFs)")


if __name__ == "__main__":
    for spec in MANUALS:
        build(*spec)
    publish()
    sync_drive()
