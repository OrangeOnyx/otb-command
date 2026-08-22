# Lease Assembler — Design (2026-08-22)

Operator-approved via brainstorming session (options picked: output **3 = DOCX +
HTML/e-sign**, drive model **1 = deterministic operator form**, Schedule G
**1 = auto-compute**, remaining calls delegated to Claude and approved as a
package).

## Purpose

Turn the master lease house form
(`OTB_Master_Lease_v2_2_Louisiana_House_Form.docx`) + repo data
(units.json, recoveries.json) + a small set of deal inputs into an executable
OTB lease:

1. **DOCX** — byte-faithful to the house form; the legal artifact counsel
   redlines and the parties execute.
2. **Plan-room HTML** — same merged content, feeds the existing e-sign rail
   (`esign_requests` lifecycle + unit-drawer E-Sign panel) for review/signing.

Operator-driven and deterministic: no AI in the generation path. Every output
is stamped **DRAFT — subject to Louisiana counsel review**. The existing
`src/lib/lease.js` proposal assembler is untouched — proposals and executable
leases are different documents.

## Architecture — one pure engine, thin callers

| Unit | Kind | Responsibility |
|---|---|---|
| `src/lib/leasedoc.js` | pure seam | `assembleLease(inputs, unit, recoveries)` → `{ tokens, scheduleG, checklist, warnings }`. All math, token mapping, validation. No DOM/network. |
| `tools/lease-template.mjs` | build-time tool (run once per master change) | Normalizes the master docx: merges Word runs so each `[[TOKEN]]` sits in one run; tokenizes residual hardcoded deal data (see PII scrub); emits `src/data/lease-template.docx` + token manifest JSON. |
| `src/lib/leasedocx.js` | client lib | Normalized template + `tokens` → merged DOCX bytes (XML-escaped replacement inside `word/document.xml`; zip read/write client-side). |
| `src/lib/leasedochtml.js` | client lib | Same `tokens` + section text → plan-room HTML document (reuses the navy/white BRAND block pattern from `lease.js`). |
| Unit drawer "Generate Lease" panel | view | Form: repo-sourced fields pre-filled and **locked**; deal + lessee fields as inputs. Buttons: Download DOCX · Download HTML · Send to E-Sign (hands HTML to the existing e-sign rail). Operator/owner-visibility mirrors the E-Sign panel (owner read-only). |

The AI-1 leasing agent is a **documented future caller** of `leasedoc.js` —
not built in v1.

## Token map (~25 tokens, three buckets)

- **Auto/locked (repo-sourced):** `SUITE`, `RSF`,
  `PREMISES_RSF_WORDS_AND_NUMBERS` (words + numerals), municipal address
  (tokenized — was hardcoded), `CAM_PSF` / `TAX_PSF` / `INSURANCE_PSF` from
  recoveries.json.
- **Deal inputs:** `EXECUTION_DATE`, `EFFECTIVE_DATE`, `COMMENCEMENT_DATE`,
  `EXPIRATION_DATE`, `ADDITIONAL_TERM_DATES`, `PERMITTED_USE`, term months,
  base PSF, escalation %, free-rent months, construction months,
  `SECURITY_DEPOSIT`, renewal summary.
- **Lessee intake:** `LESSEE_LEGAL_NAME`, `LESSEE_ENTITY_TYPE`,
  `LESSEE_STATE`, `LESSEE_NOTICE_ADDRESS`, `LESSEE_AUTHORIZED_REPRESENTATIVE`,
  `LESSEE_SIGNER_NAME`, `LESSEE_SIGNER_TITLE`, signature dates (blank at
  generation — filled at execution).

Validation: `assembleLease` refuses to emit if any required token is missing;
`warnings` carries non-blocking items (e.g. deposit = 0).

## Schedule G — auto-compute

Inputs: base PSF, term months, escalation %, free-rent months; NNN from
recoveries.json. Engine generates:

- `BASE_RENT_STEP_ROWS` — one row per 12-month step (escalation applied
  annually; flat term = one row; final partial year prorated by months).
- `RENT_ABATEMENT_ROWS` — free-rent/construction months as explicit rows
  ("NOT APPLICABLE" when zero).
- `MONTHLY_RENT_SCHEDULE` — per-step monthly totals: base step + NNN monthly.

Extends the existing `leaseMath()` arithmetic (first-year proration rule L6
kept). Arbitrary custom step tables = v2 override, out of scope.

## Master template fixes (build-time, in `tools/lease-template.mjs`)

1. **PII scrub.** §21.01 LESSEE notice block carries a prior prospect's real
   contact (name/email/address/phone) hardcoded in the "master" — replaced by
   `[[LESSEE_...]]` tokens. §1.01's hardcoded municipal address
   ("1 21 Arnould Boulevard") and §2.01's "first-class retail **salon**
   standards" are deal leftovers — tokenized (`[[PREMISES_ADDRESS]]`,
   `[[USE_STANDARD]]` defaulting to "retail").
2. **Counsel flags preserved.** All `[LOUISIANA COUNSEL REVIEW]` brackets stay
   verbatim in output; the checklist lists them.
3. **Exclusives reconciliation = checklist, not clause-rewriting.** §2.01
   requires reconciliation against current tenant exclusives before issuance.
   The engine emits a checklist surfacing current exclusive-use tenants from
   the rent roll (Jason's Deli §9.01 anchor, HotWorx 129, C. Wolf 135A, Cat
   Clinic) for operator eyes. The clause text itself is never auto-edited.

## Schedules

- **C (Rules & Regs), D (Sign Criteria):** static house-form text, baked into
  the template.
- **A (plat), B (site plan), E (guaranty — form toggle "guaranty required"
  flips text vs NOT APPLICABLE), F (ACH form):** labeled attachment-placeholder
  pages + a checklist line each. Auto-attaching real plat/ACH binaries = v2.

## Error handling

- Missing required inputs → form blocks generation, names the fields.
- Unknown unit / missing recoveries row → hard error, no output.
- Template manifest mismatch (token in template not covered by engine, or
  vice versa) → build-time failure in tests, never at runtime.
- Any `[[…]]` surviving in output = engine bug; asserted in tests.

## Testing

`test/leasedoc.test.mjs` (+ docx/html unit tests):

- Token completeness: full input set → zero `[[…]]` in DOCX XML and HTML.
- Schedule G math: flat term · escalated · free-rent · sub-12-month term ·
  partial final year.
- DRAFT stamp present in both outputs.
- PII-scrub assertion: template + outputs contain no residual real contact
  strings from the old master.
- Checklist fires: exclusives lines + counsel-review lines present.
- Existing gate: `node --check` each module + `npm run build` before delivery.

## Out of scope (v1 fences)

- AI-1 tool caller (seam documented only).
- Custom/irregular Schedule G tables (override UI).
- Auto-attached plat / ACH / guaranty binaries.
- Auto-send anywhere: operator downloads; the app sends nothing (standing v1
  boundary). E-sign link distribution stays the operator's channel.
- Amendments / extensions / memorandum of lease generation.
