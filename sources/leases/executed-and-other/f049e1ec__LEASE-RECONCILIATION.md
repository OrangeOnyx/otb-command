# Lease Extraction Reconciliation

Generated: 2026-07-25

## Decision

The owner-corrected SOT remains authoritative. Extracted lease text is candidate evidence only.
No database, rent schedule, critical date, or tenant balance was changed.

## Summary

- SOT lease rows reviewed: 21
- Ready for operator review (4+ deterministic evidence matches): 11
- Manual clause review required: 7
- Blocked: Unit 121 has only a draft lease package.
- Signature review: Unit 145 filename establishes lessor execution only; confirm lessee execution.
- No lease expected: Unit 135B is owner occupied.

## Reconciliation matrix

| Suite | Document | Tenant | SF | Monthly | Total PSF | Expiration | Disposition |
|---|---|---:|---:|---:|---:|---:|---|
| 101-103 | 101-103.md | match | - | match p.4 | match p.4 | match p.2 | ready_for_operator_review |
| 105 | 105.md | match | match | match p.3 | - | - | manual_clause_review_required |
| 107 | 107.md | match | match | match p.4 | match p.4 | - | ready_for_operator_review |
| 109 | 109.md | match p.5 | match | match p.3 | - | - | manual_clause_review_required |
| 111 | 111.md | match | match | match p.3 | match p.3 | match p.2 | ready_for_operator_review |
| 113 | 113.md | match | match | - | - | - | manual_clause_review_required |
| 115-117 | 115-117.md | match | match p.1 | - | - | match p.1 | manual_clause_review_required |
| 117 1/2 | 117.5.md | match | match | match | match | match | ready_for_operator_review |
| 119 | 119.md | match | match | match p.4 | - | - | manual_clause_review_required |
| 119 1/2 | 119.5.md | match | match p.1 | match p.1 | match p.1 | - | ready_for_operator_review |
| 121 | draft_only | - | - | - | - | - | block_activation_pending_executed_copy |
| 123 | 123.md | match | match | match | match | - | ready_for_operator_review |
| 125-127 | 125-127.md | match | match | match | match | - | ready_for_operator_review |
| 129 | 129.md | match | match p.1 | match p.3 | match p.3 | match p.2 | ready_for_operator_review |
| 135A | 135A.md | match | match p.2 | match p.2 | match p.2 | match p.2 | ready_for_operator_review |
| 135B | no_lease_expected | - | - | - | - | - | not_applicable |
| 137 | 137.md | match | match | - | - | - | manual_clause_review_required |
| 139/141 | 139-141.md | match | match p.2 | match p.4 | match p.4 | - | ready_for_operator_review |
| 143 | 143.md | match | match | - | - | match p.6 | manual_clause_review_required |
| 145 | execution_review | - | - | - | - | - | manual_signature_review |
| 149 | 149.md | match | match p.4 | match p.1 | - | match p.4 | ready_for_operator_review |

## Approval rules

1. Inspect execution/signature pages and every amendment boundary.
2. Prefer the latest executed amendment for changed terms.
3. Preserve both SOT and document values when they conflict.
4. Record an operator decision and payload hash before activation.
5. Never activate Unit 121 from the draft.
