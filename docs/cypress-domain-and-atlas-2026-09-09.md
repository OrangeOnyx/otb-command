# Cypress OTB address and Atlas figures — September 9, 2026

## Live entry points

- Private property application: https://otb.cypresscommand.com/#spatial
- Public company website: https://cypresscommand.com/
- Public case study and application link: https://cypresscommand.com/standard/examples/on-the-boulevard/
- Original Atlas: https://orangeoceanatlas.com/ (preserved)

The public website footer now has a Property command link. The case study has an Open OTB command action with a sign-in disclosure. No private financial figures were added to the public company website.

## Deployment and isolation

The existing Vercel project `otb-command` remains the sole application project. Cypress is a preview deployment of the existing repository, using the isolated Supabase branch `hefexnqkigirmzpmeggj`.

- Application source: `3a191d3d0b90cd871aba01be2ffac14203c80486`
- Cypress deployment: `dpl_6hP6TRPuYyoDECaMxU4DRY1Tybzn`, READY, Preview
- Immutable deployment: https://otb-command-p08yclfd8-adams-projects-0c52918e.vercel.app
- Domain binding: `codex/cypress-command-completion`, not production
- GoDaddy CNAME: `otb` → `9c2fcb84894afcee.vercel-dns-017.com.`
- A domain-only Vercel protection exception permits the application sign-in page to load without requiring a separate Vercel account. Application owner/operator checks remain mandatory. Global preview protection is unchanged.
- Supabase branch Site URL: `https://otb.cypresscommand.com`. Redirect allowlist includes this exact origin and the three dated Cypress preview origins; no production Atlas origins were added.
- Public website source: `6d4e274a7a1e8377034aaad77c3148c511ee9b35`
- Sites version 6 deployment: `appgdep_6aa1aac705548191ab914deabf429583`, succeeded

The original Atlas production deployment remains `dpl_JD3a5JRiaG1jTbkk5y4z422u8seR`. Its HTML, JavaScript and CSS SHA-256 values still match the preserved September 8 source. Apex/WWW website routing, nameservers and Microsoft 365 MX remain unchanged.

## What the financial figures mean

`GET /api/atlas-numbers` returns a dated, server-only, read-only extract. Every request checks the caller's current OTB owner/operator membership. It does not connect the mutable browser client to production or copy the extract into another ledger.

- Production capture: September 9, 2026, 18:40:22.514055 UTC, one property-scoped SELECT.
- Adopted contractual rent: **$90,291.23/month**, **$1,083,494.76 annualized**, from the July 16, 2026 adopted private seed. Its hash matches the backed-up deployed Atlas seed. This does not verify current possession or collected income.
- August: 24 recorded charges totaling **$90,291.23**; one recorded payment of **$3,808.39**. These are entry-date totals, not bank-confirmed settlement or proven rent-period allocations.
- September: 24 recorded charges totaling **$90,291.23**; no payment entries. Receipts are represented by `amount: null`, not zero collected or proven arrears.
- Historical Asset Command import: 313 entries from July 2025 through July 2026, **$1,133,492.20 recorded paid**. Source assertions have not been reconciled to bank records.
- Operating expenses are unentered/default. Actual expenses, NOI, valuation and complete receivables remain unavailable.
- Combined-suite figures are reporting allocations, not separate bills.

The report does **not** refresh automatically. Capture query, provenance and manual refresh steps are in `tools/atlas-numbers-source.md`. New captures require source review and a new tested preview deployment. Current financial reporting requires Investar transactions/batch evidence and a dated accounting expense source before collection or NOI claims can be made.

## Acceptance

- 589 tests passed; production build passed with existing JSON-import and chunk-size warnings.
- Browser-verified desktop and 390px mobile financial layouts, August/September selection, source dialog and suite economics.
- Custom hostname: valid HTTPS; root 200; financial API returns 401 signed out, 403 for pending membership, 200 for the authorized test operator; all API responses private/no-store.
- Private snapshot and seed paths return 404; financial values are absent from the compiled public bundle.
- Browser-verified public case-study link leads to the property application; root, WWW, case study and generated Sites origin return 200 with the correct OTB link.
- Suite selection resets the inspector to its heading. The owner-update draft still generates from the maintenance evidence and clearly marks its isolated test copy and not-sent status.
- Sign-out removes the financial panel and figures from the document.
- Approved geometry SHA-256 remains `0382977543319ba189d54185585be4579d2b76829f42d1bd73f8814034ee7b51`.

The application remains a controlled preview: maintenance edits describe the isolated test database; the financial report explicitly identifies its separate dated production extract. No production business records, payments or messages were changed. Real mailbox delivery and standalone briefing print pagination were not retested in this change.

## Recovery

Protected backup and verification artifacts remain in `C:\Users\adam\Backups\OTB\20260908-135228`. See its RESTORE.md for qualified restoration coverage; a full database restore has not been drilled.

To roll back only the Cypress UI, reassign `otb.cypresscommand.com` to a previously verified Cypress preview while retaining its branch binding and isolated environment. Never promote a Cypress preview to the original Atlas production target. The public website can be rolled back through its existing Sites version history independently.
