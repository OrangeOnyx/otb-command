# Cypress Command — Master Rebrand Checklist

Companion to "Rebrand Strategy: Retiring Orange Ocean" (Rev 2) and the Brand and Design Guidelines. This is the execution list: every item, in dependency order, with what "done" looks like. Check boxes as you go; the file is meant to be edited.

**Effective Date [E] = Wednesday, October 1, 2026** — the day Cypress Command, LLC becomes property manager of record. Decided Sept 1, 2026. This is a 30-day runway, so Phases 0–2 collapse into the schedule in the next section; everything else keeps its original pacing.

Legend: **Gate** = nothing downstream starts until this is done. **Counsel** = confirm with your Louisiana attorney/CPA before acting.

---

## The 30-day schedule to October 1

| Dates | Must be done | Why it cannot slip |
|---|---|---|
| Tue Sept 1 – Wed Sept 2 | Register domains and handles. File Articles of Organization and Initial Report on geauxBIZ with **expedited processing** (skip the 120-day reservation; filing the LLC is the reservation). Registered agent service engaged first. | LLC must exist before any notice names it. |
| By Fri Sept 5 | Filing accepted. Same day: EIN online, LDR registration, open operating account (bring Articles, EIN letter, Operating Agreement). Order checks. | Vendor W-9s and tenant remittance instructions need the EIN and account. |
| Mon Sept 8 – Wed Sept 10 | Sign PMA (Belle Realty ↔ Cypress Command) and Abdalla Enterprises PMA termination, both effective 12:00 am Oct 1. Belle Realty resolution appointing the new agent. Bind GL/E&O. | The PMA is the authority behind every notice. |
| Wed Sept 10 at the latest | **Mail tenant notices** (certified) and email copies where leases allow. Mail vendor notices with W-9s the same day. | Gives tenants 21 days. Before mailing, check each lease's notice clause; if any requires a full 30 days for a change of payment instructions, either mail that tenant a notice on Sept 1–2 naming Belle Realty's unchanged payee only, or move [E] to Nov 1 for everyone. |
| Sept 15 – 26 | Workspace domain, email, SendGrid, DNS. Rename GitHub/Railway/Supabase/Vercel. In-app rebrand PR staged. Signatures and letterhead installed. | App and email must show the new name on Oct 1. |
| Mon Sept 29 – Tue Sept 30 | Deploy the in-app rebrand. Enable 301s from old app domains. Utilities and subscriptions switched. | Cutover the night before. |
| Wed Oct 1 | Effective. Send tenant portal invitations and the one-line in-portal release note. Auto-reply on adam@orangeocean.com goes live. | Clean first-of-month rent cycle. |
| Oct 1 – 31 | Collect updated COIs from tenants and vendors. Chase unreturned W-9 acknowledgments. Launch cypresscommand.com. | 30-day windows in both notices end Oct 31. |

**Fallback:** if the LLC is not accepted by Friday, September 5, or any lease demands 30 days' notice for payment changes, move [E] to Saturday, November 1, 2026 and re-date the two notices (one line each; `brand/make_letters.py`).

## Phase 0 — Lock the name (this week)

- [ ] **Gate.** File the LLC directly this week (see schedule); the name reservation step is skipped because the filing itself secures the name. SOS search on Sept 1, 2026 returned zero matches for "Cypress Command" ([SOS database](https://coraweb.sos.la.gov/CommercialSearch/CommercialSearch.aspx)).
- [ ] Register domains (all showed available Sept 1, 2026): `cypresscommand.com` (primary), `cypresscommand.ai`, `cypresscommand.app`, `cypresscommand.io`, `cypresscommand.co`, `cypressconcierge.ai`. Optional defensive: `cypresscommandai.com`, `cypresscommandcenter.com`. Put them in the existing Cloudflare account, registrar lock on, auto-renew on, WHOIS privacy on.
- [ ] Claim handles: `@cypresscommand` on LinkedIn (company page slug), X, GitHub (org), Instagram, YouTube. Hold, do not publish yet.
- [ ] Write and save the one-sentence rationale used everywhere: "Belle Realty of Lafayette, LLC has engaged Cypress Command, LLC as property manager." No other explanation is given, to anyone.
- [ ] Save the fallback list in case the name fails at any later gate: Longleaf Ledger, LLC / Longleaf Operations, LLC / Coteau Command, LLC (all domains available Sept 1, 2026).

## Phase 1 — Entity, licenses, money (weeks 1–4)

**Formation**
- [ ] **Gate.** File Articles of Organization and Initial Report for Cypress Command, LLC on geauxBIZ. Use a **registered agent service**, not your home or office address. **Decided:** member-managed by Adam Anthony Abdalla directly. His name will appear on the SOS record as member/manager; use the registered agent's address, not a personal one, for every address field the form allows.
- [ ] Operating Agreement (single-member, member-managed, Adam Anthony Abdalla sole member). Define "Authorized Representative" as the signing title.
- [ ] EIN from the IRS (online, same day). Save the CP 575 letter; vendors will ask for it.
- [ ] Louisiana Department of Revenue account registration (LaTAP) for the new entity.
- [ ] Lafayette Consolidated Government occupational license for Cypress Command, LLC at 101-149 Arnould Blvd.
- [ ] **Counsel.** Confirm whether Cypress Command, LLC needs a Louisiana Real Estate Commission broker license to manage property owned by a different LLC. Abdalla Enterprises has been operating in the same posture; carry the same answer forward, but confirm it in writing.
- [ ] **Counsel.** Louisiana state trademark application for the word mark CYPRESS COMMAND and the Ring Mark (Secretary of State trademark division). Do not file federally in Class 9/42; see the trademark note in the guidelines.

**Banking and insurance**
- [ ] Open the operating account in the name of Cypress Command, LLC. If the PMA calls for a separate trust/escrow account for tenant funds, open that as well and title it "Cypress Command, LLC as agent for Belle Realty of Lafayette, LLC."
- [ ] Order checks and deposit slips; configure ACH origination if tenants pay electronically.
- [ ] Bind general liability and professional (E&O) coverage for Cypress Command, LLC with Belle Realty of Lafayette, LLC as additional insured. Confirm workers' comp position with the carrier.
- [ ] Ask Belle Realty's carrier to update the property policy: property manager of record changes to Cypress Command, LLC on [E].
- [ ] Merchant account / payment processor (Stripe or bank) under the new legal name and EIN.

**Property Management Agreement**
- [ ] **Gate.** New PMA between Belle Realty of Lafayette, LLC (owner) and Cypress Command, LLC (manager), effective [E]. Same scope and fee as the Abdalla Enterprises PMA unless you want changes.
- [ ] Termination-by-agreement of the Abdalla Enterprises, LLC PMA, effective 11:59 pm the day before [E]. One document, both signatures, kept with the minute book.
- [ ] Resolution of Belle Realty of Lafayette, LLC appointing Cypress Command, LLC as agent and authorizing Adam Anthony Abdalla, Authorized Representative, to sign leases, notices, and vendor contracts on its behalf. Tenants' lenders and title companies will ask for this.
- [ ] Update Belle Realty's bank signature cards and online-banking user roles to reflect the new manager entity.

**Vendor contracts**
- [ ] Build the vendor list from the current Abdalla Enterprises AP ledger: landscaping, janitorial, HVAC, plumbing, electrical, roofing, pest, security/cameras, fire/life-safety inspection, trash, sweeping, signage, insurance broker, accountant, attorney, utilities (LUS, Entergy/CLECO, gas, water), internet/phone, software subscriptions.
- [ ] For each contract: read the assignment clause. Sort into (a) assignable on notice, (b) requires consent, (c) re-paper.
- [ ] Send the vendor notice (`notices/vendor-notice-assignment.pdf`) with a Cypress Command W-9 and, where needed, a consent-to-assignment form. Track responses in one sheet: vendor, sent date, W-9 received, COI received, contract status.
- [ ] Utilities: change the account holder or the "care of" billing name; keep service addresses and deposits intact.
- [ ] Update autopay and card-on-file for every subscription (Railway, Supabase, Vercel, Cloudflare, Google Workspace, SendGrid, GitHub, domain registrar, accounting software) to the new card and legal name.

## Phase 2 — Tenant transition (weeks 2–5, all before [E])

- [ ] **Gate.** Pull every lease and record: tenant legal name, notice address and method required by the lease, rent due date, any lock-box or ACH language, COI requirements naming the manager.
- [ ] Mail the tenant notice (`notices/tenant-notice-change-of-manager.pdf`) on Belle Realty letterhead by the method each lease requires (certified mail is the default; add email where the lease allows). Mail at least 30 days before [E]. Keep the certified-mail receipts in the lease file.
- [ ] **Decided:** rent stays payable to Belle Realty of Lafayette, LLC, same account, same instructions. Fill the remittance line in the notice with the current address/ACH details so tenants see confirmation, not a change. The phone-verification line stays in as fraud protection. No trust account needed for rent; Cypress Command's operating account handles fees and vendor payments under the PMA.
- [ ] Tenant portal: rename, re-theme, re-invite (see Phase 4). Send invitations the week of [E], not before.
- [ ] Prepare a one-page FAQ for tenants who call: what changed (manager), what did not (lease, rent, deposit, contacts), where to pay, who to call. No mention of Orange Ocean.
- [ ] Update lease templates and the `belle-lease-assembler` skill: manager name in the recitals, notice addresses, signature blocks, COI additional-insured language.
- [ ] After [E]: collect updated COIs naming Cypress Command, LLC; log receipt against each tenant.

## Phase 3 — Identity system (weeks 2–6)

- [ ] Adopt the delivered system: Ring Mark, Manrope/Inter, Cypress Green palette (`cypress-command/brand/`). Read `brand-guidelines.md` once, end to end.
- [ ] Letterhead: `brand/letterhead-cypress-command.pdf` replaces LH1 (Orange Ocean). LH2 (Belle Realty) and LH3 (On The Boulevard) keep their design; update only the attribution/footer lines to "Cypress Command, LLC." Retire LH4 (Abdalla Enterprises) once the PMA moves.
- [ ] Business cards: Cypress Command (operator) and On The Boulevard (property). No Orange Ocean cards remain in circulation.
- [ ] Email signatures: install the three blocks from guidelines Section 10 in Google Workspace (Cypress Command, Belle Realty, On The Boulevard).
- [ ] Word/Google Docs templates: letter, notice, memo, term sheet, invoice — each with the correct letterhead and signature block.
- [x] Rewrite the org skill so every generated document is correct from day one: `abdalla-brand-system` v2.0 saved to the org library on Sept 1, 2026 — Cypress Command profile, logo set (v1 Ring Mark, may be revisited), letterhead, palette, signature blocks, OTB attribution line, decision tree, transition dates, and the merged bio/positioning file (the former `adam-brand-context` skill now lives inside it). Re-save only if the legal name changes at SOS filing.
- [ ] Update `belle-lease-assembler` and `louisiana-lease-law` skills for the manager name in generated documents.

## Phase 4 — Domains, email, software (weeks 3–8)

**Google Workspace and email**
- [ ] Add `cypresscommand.com` to Google Workspace as a secondary domain, then promote it to primary. Create `adam@`, `info@`, `ap@`, `tenants@`, `maintenance@`, `noreply@`.
- [ ] Keep `adam@orangeocean.com` as an alias for 12 months with an auto-reply: "This address has changed. Please write to adam@cypresscommand.com." Calendar a removal date.
- [ ] SendGrid (or current transactional sender): authenticate `cypresscommand.com` (SPF, DKIM, DMARC at p=quarantine after two clean weeks), move all app email to the new sender, then remove the Orange Ocean sender.
- [ ] Update the From name on every automated email to "Cypress Command."

**DNS (Cloudflare)**
- [ ] Zone for `cypresscommand.com`: apex → marketing site, `app.` → Railway service, `api.` if separate, MX/SPF/DKIM/DMARC for Workspace and SendGrid, `_github-challenge` if verifying the org.
- [ ] 301 redirects: `orangeoceanassetcommand.com`, `assetcommand.orangeocean.com`, any `*.orangeoceanatlas.com` app hosts → `app.cypresscommand.com` (path-preserving).
- [ ] Do **not** redirect `orangeocean.com` or `orangeoceanatlas.com` marketing pages. Replace them with a one-line neutral page ("This site is no longer in use.") for 12 months, no link to the new brand. Then let them go dark or hold defensively.

**GitHub**
- [ ] Rename org `OrangeOnyx` → `cypresscommand` (GitHub redirects old URLs; update local remotes and CI secrets anyway).
- [ ] Rename repos: `orange-ocean-asset-command` → `cypress-command`; `otb-ops-archive` unchanged. **Decided:** `orange-ocean-atlas` will be archived, not renamed — strip Orange Ocean from its README title, set the repo to Archived on GitHub once otb-command has absorbed what it needs, and do not point any domain at it.
- [ ] Update README titles, package.json `name`, LICENSE holder, CODEOWNERS, issue templates, and the org profile README.
- [ ] Rotate any deploy keys or PATs whose names reference OOAC while you are in there.

**Railway / Supabase / Vercel**
- [ ] Railway: rename project/service `ooac-web` → `cypress-command-web`; add custom domain `app.cypresscommand.com`; keep the old domain attached until the 301 is live, then remove it.
- [ ] Supabase: rename project `asset-command-prod` → `cypress-command-prod` (display name only; the project ref does not change). Update Auth → URL Configuration: Site URL and Redirect URLs to the new domain. Update email templates (confirm, magic link, reset) with the new name and sender.
- [ ] Vercel: rename projects, attach `cypresscommand.com`, remove old domains after redirects are verified.
- [ ] Environment variables: rename anything with `OOAC_`, `ORANGE_OCEAN_`, `ATLAS_` prefixes; update `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_URL`, support email, and any hard-coded sender.
- [ ] Storage: bucket names can stay; replace logo files inside them.

**In-app rebrand (one PR, one release)**
- [ ] Repo-wide search, case-insensitive: `orange ocean`, `orangeocean`, `OOAC`, `OrangeOnyx`, `Asset Command`, `Atlas`, `#1C2D4F`, `#E8820C`, `oo_logo`, `LH1`. Every hit is either renamed or justified in the PR description.
- [ ] UI strings, page titles, `<title>`, OpenGraph tags, PWA `manifest.json` (name, short_name, theme_color `#1E5036`, background_color `#FAF8F4`, icons from `brand/logo/app-icon.png` at 192/512, maskable variant), favicon set from `brand/logo/favicon.svg`.
- [ ] Tailwind/CSS tokens: replace navy/orange with the green and neutral ramps from `palette.json`; fonts to Manrope + Inter.
- [ ] Rename the assistant "Concierge" → "Cypress Concierge" in UI, prompts, and system messages.
- [ ] Document generators (lease, term sheet, notices, invoices): manager name, letterhead, signature blocks, footer authority line.
- [ ] Email templates (tenant invite, maintenance updates, rent receipts): new sender, logo, footer.
- [ ] Release notes for tenants inside the portal: one line, "The portal is now Cypress Command. Your login and data are unchanged."
- [ ] Post-deploy check: old app URL redirects, login works on new domain, password reset email arrives from the new sender, PDF generation prints the new name, favicon and app icon correct on iOS/Android.

**Website**
- [ ] `cypresscommand.com`: short site written in "we." Home, Services (management for owner-operators), Platform, Contact, About (one line naming the Authorized Representative). Property photography only. No founder page, no blog at launch.
- [ ] Schema.org `Organization` markup with the legal name, address, and phone; `sameAs` to the new LinkedIn and Google Business Profile.
- [ ] Google Search Console and Analytics properties for the new domain.

## Phase 5 — Profiles and directories (weeks 4–8)

- [ ] New Google Business Profile for Cypress Command, LLC (service-area or the Arnould Blvd address). Do not convert the Orange Ocean profile; mark it closed after the new one is verified.
- [ ] New LinkedIn company page. Do not rename the Orange Ocean page; let it lapse.
- [ ] Update Adam's LinkedIn: headline "Commercial Real Estate Operator | Former Attorney | Authorized Representative, Cypress Command"; experience entry for Cypress Command, LLC; end-date Orange Ocean without commentary.
- [ ] X / Instagram: new handles under the company; old Orange Ocean handles set private or deleted.
- [ ] Directories and listings that show the manager name: LoopNet/CoStar/Crexi listings for On The Boulevard, Better Business Bureau, Chamber of Commerce, Louisiana SOS trade-name records, Yelp, Apple Maps, Bing Places.
- [ ] Update the Business AI & Risk Audit and Groundwork materials wherever they are branded Orange Ocean or credit "Founder @ Orange Ocean."

## Phase 6 — Name repair track (starts now, runs 6–18 months)

- [ ] `adamabdalla.com`: plain professional site. Former attorney, commercial real estate operator, systems builder. No mention of the episode or of Orange Ocean. Schema.org `Person` markup.
- [ ] One identical bio on every profile you control (LinkedIn, X, GitHub, adamabdalla.com, directory listings).
- [ ] Publishing cadence: one substantive piece per month under your name on Louisiana commercial leasing, small-property operations, or AI governance for small business. Guest posts and podcast appearances earn the links that move rankings.
- [ ] Never link to, comment on, or rebut the coverage. Keep a three-sentence spoken answer ready.
- [ ] Monthly log (incognito): page-one results for "Adam Abdalla," "Adam Abdalla Lafayette," "Cypress Command." Record position of adamabdalla.com, LinkedIn, and the coverage.

## Phase 7 — Sunset (months 3–12)

- [ ] After all vendor assignments and the PMA transition are complete and final invoices under Abdalla Enterprises are paid: file final tax returns, then Articles of Dissolution for Abdalla Enterprises, LLC and Orange Ocean, LLC (after year-end). **Counsel/CPA.**
- [ ] Close the Orange Ocean and Abdalla Enterprises bank accounts after 90 days with zero activity.
- [ ] Month 12: remove the `adam@orangeocean.com` alias, take the neutral pages dark, decide whether to keep the old domains defensively.
- [ ] Archive the Orange Ocean brand assets in a private folder; delete them from active templates and skills.
- [ ] End state: Belle Realty of Lafayette, LLC (owner) · On The Boulevard (property brand) · Cypress Command, LLC (operator). Three entities, one operator name.

---

## Dependency map

```
Name reservation ─┬─> LLC filing ─> EIN ─> Bank ─> Insurance ─> PMA (effective E)
                  │                                              │
Domains ──────────┼─> Workspace domain ─> Email/SendGrid ─> App cutover ─> Website
                  │                                              │
                  └─> Handles                                    └─> Tenant notice (E − 30 days)
                                                                 └─> Vendor notices + W-9 (E − 30 days)
Identity system ─> Letterhead/signatures/skills ─> everything that prints a name
Name repair track runs in parallel from day one.
Dissolutions run after E + 90 days and year-end returns.
```

## Things that should never change

- Belle Realty of Lafayette, LLC: name, letterhead design (text-only, Times New Roman, no color), phone 337-769-1554, email adam@belle-realty.com.
- On The Boulevard: name, navy/white identity, phone, info@ontheblvd.com, ontheblvd.com. Only the attribution line changes.
- The property address, tenant leases, rent amounts, due dates, and deposits.

## Decisions made (Sept 1, 2026)

1. Effective Date: **October 1, 2026.** Both notices are dated accordingly.
2. Rent: **payable to Belle Realty of Lafayette, LLC, unchanged.** No agent trust account.
3. Cypress Command, LLC: **member-managed by Adam Anthony Abdalla directly.**
4. Atlas: **archived**, not rebranded, once otb-command is the sole platform.
