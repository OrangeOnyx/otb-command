# Decision Record — Cypress Command Rebrand
**Date:** 20 Sept 2026 · **Ratified:** 22 Sept 2026 (D1, D2, D3, D6, D7 accepted by Adam; D4, D5 remain open pending counsel)

Each entry: the conflict, the decision, why, and the one-line reversal if you disagree.

---

## D1. Which visual system controls?

**Conflict.** Three systems exist in the record.

| System | Date | Palette | Type |
|---|---|---|---|
| Brand Standards 1.0 (04C mark) | 6 Sept | Cypress #1E4D3A · Moss #2F6B4E · Amber #D97706 · Charcoal #0A1F16 · Bone #F3EDE0 | Fraunces 450 / Inter / JetBrains Mono |
| Cypress Command Design System v1.0 | 19 Sept | Paper #F4EFE2 · Paper Deep #EAE2CD · Ink #1E1B16 · Ink Soft #5C554A · Rule #C9BFA8 · Terra #A44E12 (primary) · Olive #49573C · Mustard #8F6D0C · Oxblood #8A2F1F | Besley / Archivo / Courier Prime |
| AI Playbook Brand Kit rev. 2 | Sept | Same ink-on-paper set, level inks, "Cypress Green never appears" | Archivo 900 / Besley / Courier Prime |

**Decision.** Design System v1.0 controls. It is newer, it is what you attached to this request, and it unifies the corporate brand with the Playbook so one token file serves both. Brand Standards 1.0 is superseded **except** Cypress Green #1E4D3A, which survives as `--cc-cypress`: a master-brand *surface* (dark hero backgrounds, presentation slides, the mark on dark) — never a text color, never a primary accent, never inside the Playbook. Moss is retired (no role that Olive doesn't already fill). Amber is retired in favor of Mustard (same semantic job, better harmony with Terra). Charcoal → Ink. Bone → Paper.

**Why.** Running two palettes under one company recreates the Groundwork comprehension problem in color. The Playbook rule "Cypress Green never appears" only makes sense if Cypress Green exists somewhere — so it belongs to the corporate surface layer, which is exactly what the v1.0 presentation slide shows.

**Reversal.** If you want Brand Standards 1.0 to stand, swap `tokens.css` primary from Terra to Cypress and display type from Besley to Fraunces; everything else in the package still holds.

---

## D2. Typography

**Decision.** Besley (editorial serif, display/headlines) · Archivo (functional sans, UI/labels/body-in-product) · Courier Prime (technical mono). All three are open (Google Fonts / OFL), so no licensing exposure for web, print, or client deliverables.

**Why.** Fraunces and Besley are close cousins; Besley is already deployed in the Playbook and Design System v1.0. Consolidating to one serif removes a per-project font decision. Inter → Archivo for the same reason.

**Reversal.** Font swap only; token names are role-based (`--cc-font-display`) so nothing else changes.

---

## D3. Brand architecture and naming hierarchy

**Decision.** Lock the hierarchy from the 19 Sept strategy thread, with one addition (the Playbook):

```
CYPRESS COMMAND                    company / master brand · cypresscommand.com
├── The AI Operating Standard      what should exist (open methodology)
│   └── The AI Playbook            the published, illustrated edition of the Standard
│                                  (ten interviews · four levels · own sub-brand kit)
├── Command Installation           how it gets built with you (service)
├── Command Platform               software supporting the operating environment (ex-Atlas / OTB Command)
├── On The Boulevard               proof in the real world (flagship case study)
└── Applied AI Curriculum          operator → builder → practitioner (separate track)
```

**Why.** "Cypress Command" must not be the name of the company, the software, the case study, and the program simultaneously. Functional names below the umbrella keep each thing explainable in one sentence.

**Reversal.** If the Playbook *is* the program (and "AI Operating Standard" is just an internal descriptor), collapse the two into "The AI Playbook" and drop "Standard" from public copy. Everything else holds.

---

## D4. Where property management sits

**Decision.** Property management is a *division*, not a *brand*. Public-facing property work continues under the client's brand (Belle Realty of Lafayette / On The Boulevard). Cypress Command appears on property materials only as "Property operations by Cypress Command" in footers and contracts. No separate property-management logo.

**Why.** The property division is the *proof engine* for the AI business, not a second go-to-market. Giving it its own brand dilutes both.

---

## D5. Entity path (legal — verify with counsel)

**Decision.** Recommended sequence: (1) register "Cypress Command" as a Louisiana trade name / d/b/a of Orange Ocean LLC immediately so public materials can switch now; (2) evaluate a full entity rename or a new LLC within 90 days once the disbarment-listing question is analyzed.

**Why.** A d/b/a decouples the public rebrand from the entity question and unblocks the website, domain, and deliverables this week. But if the objective is to *sever* the public link between the Orange Ocean name and the new brand, a d/b/a filing itself creates a public record connecting the two — which may defeat the purpose. That is the question for counsel, and it decides which of the two sequences is right.

**Reversal.** If counsel says "new entity," the only package changes are the legal footer line and the contract templates.

**Caveat.** I am not your lawyer; this is a structural option map, not advice.

---

## D6. Tagline

**Decision.** Master tagline: **"Build AI into how you actually operate."** Retained secondary line from Brand Standards 1.0: **"Systems under control. Results that last."** used as the footer/sign-off line. "Practical intelligence for real operations." is the descriptor under the lockup on covers and slides.

**Why.** The strategy thread converged on the first; the 1.0 line still has a job as the closing voice. The descriptor is what the v1.0 boards already show.

---

## D7. Logo

**Decision.** The 04C mark (closed rounded frame, right notch, inset core) is authoritative. Package includes a vector reconstruction measured from the approved artwork Adam supplied on 22 Sept, in three fills (ink, terra, paper) plus lockups (mark · rule · wordmark) and a favicon. No redesign.

**Caveat.** Proportions were measured from raster artwork, not a source vector. Overlay at 100 % before print or trademark filing.

---

## Open questions (not decided here)

- Whether Command Platform launches publicly at cypresscommand.com/platform or stays behind the OTB case study until it is real enough.
- Whether the Applied AI Curriculum lives on cypresscommand.com or a subdomain.
- Price points (hypotheses stated in strategy; no pilot data).
- Trademark clearance for "Cypress Command" and "Command Platform" — run a knockout search before filing.
