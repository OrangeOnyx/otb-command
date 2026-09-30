# Orange Ocean → Cypress Command — Migration Checklist
Ordered. Each item names its blocker. Nothing in Wave 1+ starts until Wave 0 is closed.

## Wave 0 — Decide (this week)
- [ ] Ratify `01-decision-record.md` (or mark reversals) — **Adam**
- [ ] Counsel: does a d/b/a filing defeat the purpose of the name change? Choose d/b/a vs. new entity vs. rename — **Counsel** · caveat: not legal advice here
- [ ] Trademark knockout search: "Cypress Command", "Command Platform" (USPTO + LA SOS + common-law) — **Adam / counsel**
- [ ] Overlay SVG marks against the approved 04C source file; adjust if drift > 2 % — **Adam**
- [ ] Confirm Playbook ↔ Standard relationship (D3) — **Adam**

## Wave 1 — Identity (weeks 1–2) · blocked by Wave 0
- [ ] File d/b/a or entity paperwork — **Counsel**
- [ ] DNS: cypresscommand.com live on Vercel; MX for Google Workspace — **Adam**
- [ ] Email: adam@ and hello@cypresscommand.com; forward orangeocean.ai — **Adam**
- [ ] Claim @cypresscommand handles (LinkedIn, X, Instagram, YouTube, GitHub) — **Adam**
- [ ] LinkedIn company page: avatar, banner, bio (`04 §3`) — **Adam**
- [ ] Install email signature (`templates/email-signature.html`) — **Adam**
- [ ] Announcement post (`04 §8`) — **Adam**, after DNS is live

## Wave 2 — Front door (weeks 2–6) · blocked by Wave 1 DNS
- [ ] Drop `design-system/tokens.css`, `components.css`, `tailwind.preset.js`, `logo/` into Groundwork repo `/design-system/` — **Adam**
- [ ] Paste `04 §7` into repo `AGENTS.md` — **Adam**
- [ ] Run Astra audit prompt, then execution prompt (strategy thread, Message 25) — **Codex**
- [ ] Homepage · The Standard · OTB case study · Score v1 · Individual/Business — **Codex**
- [ ] 301 map: every groundwork.adamabdalla.com URL → new path — **Codex**
- [ ] QA_REPORT.md: build, links, mobile, stale terms — **Codex**
- [ ] Rename repo `groundwork` → `cypress-command-web` only after clean build — **Adam**

## Wave 3 — Documents (weeks 2–4) · blocked by Wave 0 entity decision
- [ ] Proposal / report cover (`templates/proposal-cover.html` → Docs/Canva master) — **Adam**
- [ ] Letterhead (`templates/letterhead.html`) — **Adam**
- [ ] Deck masters → Google Slides / PowerPoint theme — **Adam**
- [ ] Engagement letter, MSA, SOW party names and footers — **Counsel**
- [ ] Invoicing display name; W-9 if entity changes — **Adam**
- [ ] Belle Realty / OTB: footer credit line only — **Adam**

## Wave 4 — Software (weeks 6–10) · blocked by Wave 2 stable
- [ ] Atlas / OTB Command → Command Platform: nav lockup, about screen, page titles — **Codex**
- [ ] Repo rename → `command-platform`; README; deployment names — **Adam**
- [ ] Apply tokens.css / Tailwind preset; remove any Orange Ocean or Groundwork styling — **Codex**
- [ ] Grep for "Atlas", "OTB Command", "Orange Ocean" in UI strings — **Codex**

## Wave 5 — Long tail (weeks 8–12)
- [ ] Add `cc-mark` files to the Playbook; byline "by Cypress Command" — **Adam**
- [ ] Playbook host → cypresscommand.com/playbook — **Codex**
- [ ] Archive Orange Ocean assets under `/archive/orange-ocean/` (never delete) — **Adam**
- [ ] Old PDFs / decks: re-cover or mark "historical" — **Adam**
- [ ] Google Business Profile rename — **Adam**
- [ ] Business cards — **Adam**
- [ ] adamabdalla.com: simplify around the finalized Cypress Command story (last) — **Adam**

## Done when
- No new public surface shows Orange Ocean, Groundwork-as-umbrella, or Atlas.
- One token file serves web, Playbook, Platform, and print.
- Every legacy URL resolves to a Cypress Command page.
- Counsel has signed off on the entity path and the party names in templates.
