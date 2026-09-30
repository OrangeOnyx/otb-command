# Next Steps — Cypress Command Rollout
Ordered. Each step names the file to use and what "done" looks like. Estimated hands-on time in brackets.

## This week — the two decisions only you can make

**1. Entity path (with counsel).** [30 min call]
Ask one question: *does filing "Cypress Command" as a d/b/a of Orange Ocean LLC create the public link we're trying to avoid?* If yes → new LLC. If no → d/b/a now, evaluate rename later. Everything in Wave 3 (contracts, invoices, footers) waits on this answer. Reference: `01-decision-record.md` D5.

**2. Trademark knockout.** [1 hour, or hand to counsel]
Search "Cypress Command" and "Command Platform" on USPTO TESS, Louisiana SOS, and a plain web search. You are looking for live marks in software/consulting classes. Do this before any public announcement.

## Week 1 — switch the public identity (no code)

**3. Domain and email.** [1 hour]
Point cypresscommand.com to Vercel; set up Google Workspace MX; create adam@ and hello@cypresscommand.com; forward orangeocean.ai addresses. Reference: `04-application-kit.md` §5.

**4. Claim handles.** [20 min]
@cypresscommand on LinkedIn, X, Instagram, YouTube, GitHub.

**5. Social profiles.** [30 min]
Avatar: `design-system/logo/png/app-icon-1024-terra-on-paper.png`. Banner: `banner-linkedin-1584x396.png` / `banner-x-1500x500.png`. Bios: `04-application-kit.md` §3.

**6. Email signature.** [10 min]
Open `templates/email-signature.html` in a browser, select between the comment markers, paste into Gmail signature settings. For Outlook recipients, swap the inline SVG for `png/cc-mark-ink-64.png` hosted on your domain.

**7. Announce.** [15 min]
Post `04-application-kit.md` §8 on LinkedIn once the domain resolves. Do not announce before step 3.

## Weeks 2–6 — rebuild the front door in Codex

**8. Seed the Groundwork repo.** [20 min]
Copy `design-system/` (tokens.css, tokens.json, tailwind.preset.js, components.css, logo/) into the repo at `/design-system/`. Paste `04-application-kit.md` §7 into the repo's `AGENTS.md`. Commit as "Brand Standards 2.0 — authoritative tokens."

**9. Run the Astra audit prompt, then the execution prompt.** [Astra time; your review ~2 hours]
Both prompts are in your ChatGPT strategy export (Messages 19 and 25). Order matters: audit first, review its conflict report, then execute. Scope tonight's build to homepage, The Standard, OTB case study, Score v1, and the deck.

**10. QA before rename.** Do not rename the repo or production domain until `QA_REPORT.md` shows a clean build, zero Orange Ocean strings outside `/archive`, and the site reads correctly to someone who has never heard of Groundwork.

## Weeks 2–4 — documents (parallel, after step 1 resolves)

**11. Print masters.** Open `templates/proposal-cover.html` and `templates/letterhead.html` in a browser → Print → Save as PDF, or import into Canva/Docs as the master. Swap the hatched photo panel for a real OTB photograph.

**12. Deck theme.** `templates/slide-16x9.html` shows the title and content masters. Recreate as a Google Slides / PowerPoint theme: Cypress #1E4D3A title surface, Paper content slides, Besley headlines, Archivo body, night-Terra rule.

**13. Contracts and invoices.** Party name per step 1. Footer line: "Cypress Command · Practical intelligence for real operations." Belle Realty / OTB materials get only "Property operations by Cypress Command."

## Weeks 6–10 — software

**14. Atlas → Command Platform.** Apply `tailwind.preset.js` and the shadcn mapping in its comment block; replace nav lockup with `cc-lockup-h-current.svg`; rename repo to `command-platform`; grep UI strings for "Atlas", "OTB Command", "Orange Ocean."

## Weeks 8–12 — long tail

**15. Playbook.** Add `cc-mark.svg` to the Playbook kit (the pending item); byline "by Cypress Command"; keep Cypress Green out.
**16. Archive.** Move Orange Ocean assets to `/archive/orange-ocean/`. Never delete.
**17. adamabdalla.com.** Last. Simplify around the finished Cypress Command story per `02-rebrand-strategy.md` §3.

## Two housekeeping items for the logo files

- **Outline the wordmark.** The lockup SVGs reference Archivo 800; open one in Illustrator or Figma, convert text to outlines, re-export. Then the lockups are font-independent for print and trademark filing.
- **Overlay check.** Place `cc-mark-ink.svg` over your original artwork at 100 %. The geometry was measured from raster; if the notch or core drifts more than a hair, tell me the numbers and I'll adjust the path.

## Definition of done for the rebrand
No new public surface shows Orange Ocean, Groundwork-as-umbrella, or Atlas. One token file serves web, Playbook, Platform, and print. Every legacy URL resolves to a Cypress Command page. Counsel has signed off on the entity path and the party names in templates.
