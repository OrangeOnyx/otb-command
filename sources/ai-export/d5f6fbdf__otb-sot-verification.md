# SOT Verification — `OTB_Master_SOT_Lease_Logo_HVAC.xlsx` vs the executed instruments

**2026-08-02 · verified against the 23-document master package built the same day**

---

## TL;DR

The SOT is structurally sound and its square footage is excellent — every unit SF I could test against a lease matched exactly. **The term dates are where it breaks, and it breaks in one consistent direction: the SOT records options as if they had been exercised.**

Three findings carry money or legal exposure:

1. **143 is under-billed by $167.74/month since 2026-02-01** — the SOT never picked up the Second Amendment. ~$1,006 accrued to date.
2. **119.5 shows a term running to 2029-02-28. The executed instrument ended 2026-02-28.** The SOT is three years ahead of the paper.
3. **121 is marked `Occupied` with a 77-month term. There is no executed lease** — only a draft.

---

## 1. What the SOT gets right

| Check | Result |
|---|---|
| Square footage vs the demise clause | **Exact on every unit I could test.** 131 (1,907) + 133 (1,272) = 3,179 — matches the 2014 lease to the square foot. 139+141 = 3,834 — matches FastPass. 135A+135B = 3,160 — matches the Sneaker Politics 135/135B lease. 145 = 1,917, 121 = 1,709 — both match. |
| 131 / 133 status | **`Vacant`, correct** — and confirmed by you. |
| 115-117 Clothing Loft | Start and end both match the executed lease exactly. |
| 109 JC Kate | End date 2025-09-30 matches the First Addendum. |
| Unit allocation maths | Internally consistent; allocation percentages reconcile. |

The SOT is not a bad artifact. It is a *stale* one, and the staleness is systematic rather than random — which makes it fixable.

---

## 2. Verified against an instrument I read — high confidence

### 143 — 1st Franklin · money is moving wrong

| | SOT | Second Amendment (executed 2025-12) |
|---|---|---|
| Term | 2015-09-01 → **2026-01-31** | 2026-02-01 → **2031-01-31** |
| Total PSF | $19.95 | **$21.00** ($16.00 base + $5.00 additional) |
| Monthly total | $3,187.01 | **$3,354.75** ($2,556.00 + $798.75) |

The SOT is running the pre-amendment rent. **Difference: $167.74 per month, six months elapsed, ≈ $1,006 under-billed.** The amendment also adds a further 5-year tenant option on 60 days' notice with renewal rent capped at +10% — a term worth recording, because that cap is a concession the SOT does not know about.

### 119.5 — Cat Clinic · the option is booked as exercised

| | SOT | Executed extension |
|---|---|---|
| Term | 2019-10-07 → **2029-02-28** | 2023-03-01 → **2026-02-28** |
| Months | 112 | 36 |

The instrument's §31.01 gives Lessee one 3-year option. 2026-03-01 → 2029-02-28 is exactly that option. **The SOT has recorded it as taken.** No notice of exercise exists in the corpus, and the 60-day deadline was 2025-12-30. Rent ($18.45 PSF / $3,035.03) matches the extension exactly — so the rate is right and only the term is wrong.

### 139-141 — FastPass · end date matches nothing

| | SOT | Executed lease |
|---|---|---|
| Term | 2023-07-01 → **2027-04-30** | 2023-07-01 → **2026-07-31** |

Start matches. End does not — and 2027-04-30 is not the option date either (the option is 1 × 3 years, which would give 2029-07-31). This date has no support in any instrument in the package. **The lease actually ended 2026-07-31.**

### 121 — Magnolia Salon · `Occupied` on a draft

SOT: `Occupied`, 2025-07-31 → 2031-12-31, 77 months, $2,527.90/month. The only instrument is `121 Draft Magnolia Salon Lease Agreement.pdf` — commencement 2025-07-01, and no signatures anywhere. The SOT start is also a day off the draft's own commencement date. **Either an executed lease exists somewhere I have not found, or the SOT is booking revenue against an unsigned document.**

### 145 — Upstream · term end unsupported, rent understated

SOT: term end **2031-01-31**, `Current_Term_Months` = **1572** (plainly a formula artifact), start blank, $18.50 PSF / $2,955.38.

The lease is 60 months with a **floating commencement** — 90 days after the later of the Delivery Date and permit issuance. No commencement date has been fixed, so no expiry can be derived; 2031-01-31 appears to have been copied from 143's amendment. Rent per the lease is **$19.00 PSF months 7-60 ($3,035.25)**, with months 1-6 abated to $5.00 PSF ($798.75). The SOT's $18.50 understates by **$79.88/month** and does not model the six-month abatement at all.

---

## 3. Where the SOT and the earlier lease register disagree — unresolved, now resolvable

These are two *derived* artifacts disagreeing. I am not asserting either is right; the merged package now contains the instrument that settles each one, at the page number given.

| Unit | SOT end | Register end | Master package p. |
|---|---|---|---|
| 105 Painted Bayou | 2026-03-31 | base lease commenced 2019-12-01 | 32 |
| 107 Great American | 2027-03-31 | 2027-09-30 | 63 |
| 113 Graze | 2027-06-30 | 2024-04-30 (base) | 168 |
| 117.5 Victoria Nails | 2026-02-28 | 2029-02-28 (4th addendum) | 233 |
| 119 OUPAC | 2026-02-28 | 2024-02-29 (base) | 273 |
| 123 Tux Shoppe | 2029-12-31 | 2029-04-30 | 375 |
| 125-127 Jordan Amanda | 2028-04-30 | 2029-08-31 | 405 |
| 129 HotWorx | start 2024-03-18 | start 2024-03-01 | 433 |
| 137 Greek Expressions | 2030-10-31 | 2030-09-30 | 525 |
| 149 Jason's Deli | 2030-10-31 | 5th Addendum eff. 2025-11-01 | 669 |

Several of these will resolve the same way 119.5 did — the SOT carrying an option as exercised. That hypothesis is worth testing directly rather than reconciling row by row.

---

## 4. Internal inconsistency inside the workbook itself

**Unit 101 is 6,877 SF on the `Main OTB SOT` sheet and 6,677 SF on `Lease Location`, `HVAC Split`, and `LOGO`.** A 200 SF difference. `Main OTB SOT` computes `Unit_Allocation_Percent` from its own figure, so the allocation split between 101 and 103 — and therefore every allocated CAM, tax and insurance dollar for the Pink Paisley premises — depends on which number is right. Worth settling from the demise clause at package p. 3.

---

## 5. The tenant roster is current

Your two corrections are reflected: **145 is Upstream Rehabilitation** (the operating entity is Upstream Growth Partners, LLC, a Delaware LLC c/o Upstream Rehabilitation Inc.), and **131 / 133 are vacant** with Sneaker Politics gone. The SOT already had both right.

---

## Confidence & caveats

**High** on §2 — every figure was read out of the instrument, and the rent deltas are arithmetic from the documents' own PSF and SF. **High** on the SF verification in §1. **Not asserted** in §3: those are two derived sources disagreeing, and I deliberately did not pick a winner without reading the instrument. **One caution on 143**: the amendment's landlord signature block did not yield text under OCR. The tenant's did. The surrounding email traffic indicates you signed and returned it on 2026-01-22, but the $1,006 billing correction rests on that amendment being fully executed — confirm the signature before you invoice against it.
