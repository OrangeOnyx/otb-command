# Cypress Command — Application Kit
Everything needed to execute the rebrand on real surfaces. Copy is final-draft; legal footer lines depend on the entity decision (D5).

---

## 1. Messaging matrix

| Surface | Line |
|---|---|
| Wordmark descriptor (covers, slides, footer) | Practical intelligence for real operations. |
| Master tagline (site hero, decks, signatures) | Build AI into how you actually operate. |
| Sign-off (letters, footers, closing slide) | Systems under control. Results that last. |
| Program kicker (Playbook, program pages) | A more capable tomorrow. |
| Problem hook (ads, posts, opening slide) | You're probably using AI backwards. |
| Proof line (case study, about) | Applied to a real shopping center, not a slide. |
| Commercial line (Work With Us) | You can build all of this yourself. We're faster at diagnosing, structuring, and installing it. |

## 2. Boilerplates

**One line.** Cypress Command builds AI into how real businesses actually operate.

**Short (≈50 words).** Cypress Command is a Lafayette, Louisiana company that installs AI into how individuals and organizations actually operate. Its open AI Operating Standard defines what to build — identity, trusted sources, memory, governance, workflows, bounded automation — and Command Installation builds it with you. On The Boulevard, a working shopping center, is the proof.

**Long (≈120 words).** Most people are using AI backwards: adding prompts, tools, and agents while the AI still doesn't know who they are, what is true, what matters, what happened, or what it's allowed to do. Cypress Command fixes the operating environment first. Its vendor-neutral AI Operating Standard defines the ten things a person or organization should build so that six months later AI knows their world, carries recurring work, remembers, respects boundaries, and gets better instead of starting over. Command Installation builds that system with clients; Command Platform is the software that supports it; On The Boulevard, a working commercial property in Lafayette, is the flagship real-world deployment. The Standard is free. Cypress Command charges for speed, judgment, and implementation.

## 3. Bios

**Adam Abdalla — short.** Operator, builder, and founder working at the intersection of AI, software, and real-world operations. Managing Member of Cypress Command; operates On The Boulevard, a Lafayette shopping center he uses as a live laboratory for AI-assisted operations.

**Social bios (≤160 chars).**
- LinkedIn company: Build AI into how you actually operate. The AI Operating Standard · Command Installation · Proof at On The Boulevard. Lafayette, LA.
- X / Threads: Practical intelligence for real operations. cypresscommand.com
- Adam personal: I build operating systems for real businesses using AI, software, and structured information. Cypress Command · On The Boulevard.

## 4. Email signature
Source: `templates/email-signature.html` (table-based, inline styles, safe for Gmail/Outlook). Replace the inline SVG with a hosted PNG of `cc-mark-ink.svg` at 88×88 for clients that strip SVG (Outlook desktop does).

## 5. Domains, email, redirects

| Item | Action |
|---|---|
| cypresscommand.com | Primary. Apex → www or bare (pick one; recommend bare). |
| orangeocean.ai | 301 all paths → cypresscommand.com equivalent for 12 months minimum; keep MX live for 6 months. |
| groundwork.adamabdalla.com | 301 → cypresscommand.com/standard (map article slugs individually; see migration checklist). |
| the-ai-playbook.pplx.app | Move to cypresscommand.com/playbook when the site ships; 301 in the interim if the host allows. |
| Email | adam@cypresscommand.com primary; hello@ for inbound; keep adam@adamabdalla.com for personal. Forward orangeocean.ai addresses for 6 months, then auto-reply, then retire. |
| Handles | Claim @cypresscommand on LinkedIn, X, Instagram, YouTube, GitHub before any announcement. |

## 6. Asset inventory — what changes

| Asset | Status | Owner |
|---|---|---|
| Logo files (SVG/PNG, 3 fills, 2 lockups, favicon, avatar) | In this package (verify vs. source) | Adam |
| Website (Groundwork repo) | Rebuild per strategy thread; tokens supplied | Astra/Codex |
| Proposal / report template | `templates/proposal-cover.html` | — |
| Letterhead | `templates/letterhead.html` | — |
| Deck masters | `templates/slide-16x9.html`; port to Google Slides/PowerPoint | — |
| Email signature | `templates/email-signature.html` | — |
| Contracts / engagement letters | Party name change per D5; footer line | Counsel |
| Invoices / accounting | Rename customer-facing display name; keep legal name until entity resolves | Adam |
| Belle Realty / OTB tenant materials | Add "Property operations by Cypress Command" footer only | — |
| Atlas / OTB Command software | Rename to Command Platform: nav lockup, about screen, repo name, README | Codex |
| Playbook | Add `cc-mark` files (was pending); byline "by Cypress Command" | — |
| LinkedIn / social | New avatar, banner (Cypress surface + paper lockup), bios above | Adam |
| Google Business Profile | Rename after d/b/a or entity filing | Adam |
| Stationery (business cards) | Paper stock, ink lockup front, terra mark back, footer stripe | — |

## 7. Codex `AGENTS.md` — brand section (paste verbatim)

```md
## Brand (authoritative — Brand Standards 2.0, 20 Sept 2026)

Master brand: Cypress Command. Domain: cypresscommand.com.
"Cypress Command" names the company only. Products beneath it use functional names:
The AI Operating Standard · The AI Playbook (its published edition) · Command Installation ·
Command Platform (ex-Atlas / OTB Command) · On The Boulevard (case study) · Applied AI Curriculum.

Orange Ocean is deprecated. It may appear only in legal footers and historical records.
Groundwork is legacy source material; its name, navigation, and structure are not binding.
Atlas is an internal codename only until the Command Platform rename ships.

Design tokens: /design-system/tokens.css is the single source of truth. Do not define colors
or fonts elsewhere. Consume via CSS variables or the Tailwind preset.

Palette: Paper #F4EFE2 · Paper Deep #EAE2CD · Ink #1E1B16 · Ink Soft #5C554A · Rule #C9BFA8.
Accent: Terra #A44E12 (the only page-level accent). Signals: Olive (success), Mustard (progress,
≥14px bold only), Oxblood (critical/refusal — never emphasis). Cypress #1E4D3A is a SURFACE for
hero panels and slides — never a text color, never in the Playbook.
Retired, do not use: Moss, Amber, Charcoal, Bone, Orange Ocean blue/orange.

Type: Besley (display, long-form body) · Archivo (UI, labels, wordmark) · Courier Prime (technical only).
Mark: the 04C mark (closed frame, right notch, inset core), always one flat fill in any palette token chosen by context (Ink on documents, Terra for bylines, Paper on dark). Never Oxblood, never two-tone, never gradient/shadow, never redesigned.

Rules: no shadows; radius ≤2px documents / ≤4px UI; hairlines carry structure; one accent ink
in view at a time; color is never decoration. Night mode inverts paper/ink and lifts accents
to night values; roles do not change.

Voice: intelligent, restrained, operational. Outcomes before architecture. Examples before
abstractions. No hype, no futurist clichés, no vendor bashing.
```

## 8. Announcement post (Adam, LinkedIn — draft)

> I'm retiring the Orange Ocean name. The company is now **Cypress Command**.
>
> Same work, clearer purpose. Cypress Command builds AI into how real businesses actually operate — starting with the operating environment AI needs (who you are, what's true, what matters, what it's allowed to do) before adding models, agents, and automation.
>
> Three things under the umbrella: an open **AI Operating Standard** you can build yourself, **Command Installation** if you want it built with you, and **On The Boulevard** — a working shopping center in Lafayette where all of this is running for real.
>
> More at cypresscommand.com. If you've been using AI and it still feels like it starts from zero every morning, that's the problem we fix.
