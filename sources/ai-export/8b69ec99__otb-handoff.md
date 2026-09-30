# Handoff — OTB Lease & SOT Workstream

**Written 2026-08-02 for the next session. Read this first; everything else is linked from here.**

---

## 1. Where things stand

The lease corpus is now settled. Over the last two sessions the 385-document OTB set was OCR'd, seven documentary gaps were opened, **five were closed**, and every operative instrument has been assembled into one file with a manifest. The Master SOT workbook has been verified against those instruments.

The work has moved from *"can we find the documents"* to **"the documents disagree with the system of record, and the disagreement costs money."**

### Artifacts produced

| Artifact | Location | What it is |
|---|---|---|
| `OTB_Master_Lease_Package_2026-08-01.pdf` | `G:\My Drive\00 OTB\` | **749 pages, 23 sections, 143 MB.** Every lease, addendum, amendment and renewal in one bookmarked PDF. Cover + index pages carry a status column and absolute page numbers. |
| `..._manifest.csv` | same folder | Per-section unit, tenant, status, page count, start page, source path, **SHA-256**. Any page traces back to the exact source file. |
| `build_master_package.py` | `C:\Users\adam\otb-tools\` | The build script. Idempotent, read-only against sources, pre-flight probes every input and refuses to write a partial package. Re-run any time to rebuild from current sources. |
| `otb-sot-verification.md` | project doc | SOT vs executed instruments. |
| `otb-missing-instruments-found-2026-08-02.md` | project doc | The email/Drive sweep that closed the five gaps. |
| `otb-lease-register.md` | earlier deliverable | Register built from executed documents; §31.01 option analysis. |
| `decision-engine-design-2026-08-01.md` | project doc | Phase D architecture; D-1 not yet built. |

**To rebuild the package:** `python C:\Users\adam\otb-tools\build_master_package.py`. It needs `pypdf` and `reportlab` (both installed on `C:\Python314`). Sources live on `G:` via Drive for Desktop, so the machine must be online and Drive mounted.

---

## 2. The five things that need a decision

Ranked by exposure, not by effort.

### A. 145 Upstream is occupied under a lease only Belle Realty has signed

Lessor's initials `AAA` on all 29 pages; **Lessee's initials line blank on all 29**; Effective Date blank. Meanwhile Upstream has bound insurance, set up AP, and their Regional VP was emailing photos of the space on 2026-07-31.

Until they countersign, the 60-month term, the $15.40/SF renewal option, and the rent-commencement trigger are unenforceable against them. The commencement date is *floating* — 90 days after the later of Delivery Date and permit issuance — and no Delivery Date has been recorded anywhere. **Get the countersignature and fix the Effective Date and Delivery Date in the same pass.**

### B. 143 has been under-billed since 2026-02-01

The Second Amendment (executed 2025-12, effective 2026-02-01) sets $2,556.00 base + $798.75 additional = **$3,354.75/month**. The SOT is still running **$3,187.01**. Delta **$167.74/month**, six months elapsed, **≈ $1,006** to recover.

**Blocking check:** the amendment's landlord signature block yields no text under OCR (the tenant's does). Email traffic on 2026-01-22 shows the tenant's rep saying she had not received the fully executed copy, you replying "will get to you today," then sending an attachment four hours later — and the Drive copy is timestamped that afternoon. Almost certainly signed. **Open the PDF at master package p. 638 and confirm before invoicing.**

### C. 119.5 Cat Clinic has been in holdover since 2026-03-01

Executed extension ran 2023-03-01 → **2026-02-28**. The SOT shows 2029-02-28 — the SOT has booked the tenant's 3-year option as exercised. No notice of exercise exists in the corpus; the 60-day deadline was 2025-12-30. **Five months of occupancy with no current instrument.**

### D. 139-141 FastPass expired 2026-07-31

Executed term ended two days ago. The SOT says 2027-04-30, a date supported by no instrument. Option notice window closed 2026-06-01. Also: the Alliance Safety Council guaranty page shows the guarantor block filled in but **no signature in the OCR** — and since FastPass is a subsidiary, that guaranty *is* the credit. Worth a visual check at master package p. 568.

### E. 121 Magnolia Salon is booked as occupied on a draft

SOT: `Occupied`, 77-month term, $2,527.90/month. The only instrument anywhere — six searches across two mailboxes and two Drive accounts — is an unsigned draft. **Either an executed lease exists somewhere not yet searched, or the SOT is booking revenue against an unsigned document.**

---

## 3. The systematic finding worth acting on

**The SOT records tenant options as if they had been exercised.** 119.5 is the proven case: its SOT end date is exactly base-term-plus-one-option. Ten more units show SOT/register disagreements (§3 of the verification doc) and several will resolve the same way.

This matters beyond bookkeeping. The register previously treated lapsed notice deadlines as landlord failures at exposure 25 (R-004). The executed documents invert that: **all 18 options belong to the tenant, exercised by Lessee notice, 60 days, terminating if not given.** A lapsed tenant option is leverage, not liability — it ends the tenant's right to renew and returns pricing and term control to Belle Realty.

**The R-004 correction is drafted and awaiting sign-off.** Agents draft; Adam signs.

---

## 4. Suggested next session

1. **Settle the ten SOT/register disagreements** by reading the instruments at the page numbers in the verification doc — one pass through the master package, no new searching required. Test the option-booked-as-exercised hypothesis directly rather than reconciling row by row.
2. **Build the dated-obligation registry.** This is the blocking prerequisite for the decision engine — its urgency axis is only as good as this, and right now every date lives in prose. The four items in §2 above are exactly the class of thing it exists to surface.
3. **Then D-1** — signal extractor plus `brief --dry`, no model at all. It would have surfaced Clothing Loft, Cat Clinic, and FastPass without anyone asking.
4. **Resolve the 101 SF conflict** — 6,877 on `Main OTB SOT` vs 6,677 on three other sheets. Allocation percentages, and therefore every allocated CAM/tax/insurance dollar for the Pink Paisley premises, depend on it. Answer is at master package p. 3.

---

## 5. Standing constraints to carry forward

- **Source authority:** executed or recorded legal document first; then official filing; instruction does not outrank an executed document. This ordering was corrected 2026-08-01 after I quoted a stale project doc (R-010's retracted "$52k leakage") instead of the live register. That case is now the canonical trap in the decision engine's eval set.
- **Agents draft; Adam signs.** Recommendations append to a ledger; nothing writes into the vault without the promotion gate.
- **Mailbox work is read-only.** Nothing sent, replied to, forwarded, labelled, or deleted in either account.
- **`privacy_zone: restricted` material never goes in plaintext to a new third-party host.** This is why GitHub was rejected for the vault and why backups are age-encrypted before leaving the machine. The vault key belongs in the password manager — still outstanding.
- **The Gmail connector reaches `adam@adamabdalla.com` only.** `adam@belle-realty.com` must be worked through the open Chrome session via desktop automation. The Drive connector sees files owned by both accounts.

---

## 6. Still outstanding from earlier work

- Vault backup key → password manager
- Elevated `Optimize-VHD` to reclaim ~86 GB from the Docker/WSL vhdx
- R-007: third-party PHI retention decision
- Rebuild the vault renewal table from executed instruments and post the R-004 correction

---

## Confidence & caveats

High on everything in §1 and §2 — each figure was read from the instrument itself, and the package's manifest carries a SHA-256 per source so any claim is traceable. The two signature questions (143 landlord block, FastPass guaranty) are flagged rather than resolved because OCR silence on handwriting is not evidence of absence; both need eyes, and one of them gates a billing correction. §3's systematic claim is proven on one unit and hypothesised on ten.
