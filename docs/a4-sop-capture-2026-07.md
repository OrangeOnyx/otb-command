# A-4 SOP Capture — Operator Interview (2026-07-23)

> Structured capture session per `transfer-package/17-final-build-plan.md` §A-4.
> Answers recorded verbatim-ish; each closed domain becomes (a) a K-1 runbook
> page, (b) auto-trigger detectors/checklists where automatable, (c) source
> material for the A-3 voice-agent triage scripts.
> Per-property product note: OTB's answers = the product's default settings rows.

Status legend: ☐ open · ◐ in progress · ✅ captured

## Domain map

| # | Domain | Status |
|---|--------|--------|
| 1 | Maintenance dispatch tree (trades, thresholds, emergencies) | ✅ |
| 2 | Escalation rules (after-hours, emergency, legal) | ✅ |
| 3 | Rent-collection cadence | ✅ |
| 4 | Leasing funnel (inquiry → tour → LOI → lease) | ✅ |
| 5 | Vendor selection / COI enforcement | ✅ |
| 6 | Make-ready / turnover | ✅ |
| 7 | Inspection schedule | ✅ |

## Already-encoded facts (pre-filled from repo — confirm only if wrong)

- **Late fees:** 5-day grace, $100 flat + $25/day, uniform policy unless a
  lease says otherwise (ledger-lite, 2026-07-21).
- **Rent workflow:** Aug 1 cron seeds monthly TOTAL-rent charges; operator logs
  each check in unit drawer → Ledger → Payment received.
- **Maintenance aging:** unassigned request opens a manager thread at 2 days
  (emergency: 1 day) — `get_open_maintenance` cron.
- **149 HVAC:** tenant (Jason's Deli) maintains 100%; §9.01 requires monthly PM
  contract with Butcher Air Conditioning.
- **COI badges:** expired / ≤30d critical / ≤60d expiring / ok (V-1).
- **Eviction mechanics:** LA CCP 4701→4733 sequencer already in AI-1 calc
  engines (waiver traps, 200% holdover math).
- **Open capital item:** long-building roof membrane failure (~101–109), roofer
  call pending (punch-list #1).

---

## Domain 1 — Maintenance dispatch tree ◐

**1.1 Emergency definition (dispatch-any-hour class):** ✅
Active water leak/flood · electrical hazard (burning smell / sparking / full
suite power loss) · break-in or broken storefront glass · sewer backup.
Everything else = next-business-day work order.
(HVAC no-cool classification: see 1.6.)

**1.2 Vendor proceed-without-approval spend cap:** ✅ **$500.**
Above $500 the vendor (or agent) must reach the operator before proceeding.

**1.3 Two-bid threshold:** ✅ **$5,000.**
Only genuine capital-ish work gets competed; routine repairs single-bid.

**1.4 After-hours emergency routing:** ✅ **Dispatch + notify.**
Agent dispatches the on-call trade vendor (gives number / conferences), then
sends the operator a summary text. Operator is informed, not woken for
permission. Non-emergencies: work order filed, operator sees it next day.

**1.5 Trade → vendor roster (first call):** ✅

| Trade | Vendor | Contact |
|-------|--------|---------|
| HVAC (house — all units except 149) | Butcher Air Conditioning | Ryan Haydel |
| HVAC (149 Jason's Deli) | Butcher Air — tenant-held PM contract per §9.01 | — |
| Plumbing | All Around Plumbing | Blaine Ardoin |
| Electrical | A&P Electrical | Jeremy |
| Roofing | Grizzley Roofing | Clint Baer |
| Glass / storefront | Alamo Glass | — |
| Locksmith / doors | AAA Locksmith | Joey |
| General handyman (< $500 cap jobs) | Brody Broussard | — |

No backups named — single-vendor-per-trade roster (2026-07-24).

**1.6 HVAC no-cool classification (summer):** ✅ **Same-day, business hours.**
Agent dispatches Butcher Air if reported before ~5 PM; otherwise first thing
next morning. Not a night dispatch; not a next-day work order either.

## Domain 2 — Escalation rules ✅

**2.1 Nonpayment → formal notice (CCP 4701):** **Case-by-case, no fixed rule.**
Depends on tenant history and the story. **Voice-agent consequence: agents
NEVER state or imply an eviction timeline** — collections language stays at
"the account shows a balance; the operator will follow up."

**2.2 Always-handoff callers (live patch or callback promise):**
attorneys/legal notices · **leasing prospects for vacant units (hot leads on
131/133 bypass the funnel script → straight to Adam)** · government/inspector/
code enforcement. *Escalated current tenants are NOT auto-handoffs* — the
agent works the script (log, dispatch if actionable, commit to operator
callback) rather than patching.

**2.3 Insurance claim line:** **~$5,000** — claim early; below that self-pay.
Agent/SOP: any damage event plausibly >$5K → photograph, secure, notify
operator + broker.

**2.4 Break-in / vandalism:** **Tenant of the affected suite calls police and
files the report.** Property side secures (glass/locksmith per Domain 1
roster) and documents (photos to the file). Common-area or vacant-unit
incidents default to operator's report (tenant-suite rule can't apply).

## Domain 3 — Rent-collection cadence ✅

**3.1 Payment channels:** **Electronic ONLY — all tenants required.** Either
the tenant initiates ACH or Belle initiates the pull; some Zelle/wire/other.
No checks. ⚠ Supersedes the 07-21 ledger workflow note ("log each rent
check") — Aug workflow = log each **ACH receipt** in the drawer ledger.
A-5 Stripe ACH formalizes an already-electronic reality (adoption risk low).
Voice-agent script: "where do I send a check?" → "payments are electronic —
the operator will set up ACH with you."

**3.2 Reminders:** **None — fees speak.** Commercial tenants know the date;
first contact is the late-fee suggestion flow after grace. No day-3 nudge;
do NOT build a reminder cron.

**3.3 Late-fee waivers:** **Operator-only; agent logs the ask.** Agent never
promises or refuses — "I'll pass the request to Adam."

**3.4 Partial payments:** **Accept unless eviction posture.** Normal arrears:
take the money (FIFO aging applies it oldest-first). Once a CCP 4701 notice is
contemplated or served: operator decides per the acceptance-of-rent waiver
trap (already flagged by the eviction calc engine).

## Domain 4 — Leasing funnel ✅

**4.1 Intake:** **Name + callback number only.** Speed over interrogation —
the agent's job is to not lose the lead, not to qualify it. (Use/size/timeline
surface naturally if the caller volunteers; agent doesn't press.)

**4.2 Rate quoting:** **Range only** ("high teens per square foot"). Never a
committed number — pricing is Adam's.

**4.3 Pre-screen:** **Exclusivity conflicts only** (HotWorx 129 / C. Wolf 135A
watch — a competing fitness/similar concept is told honestly it's likely a
non-starter, still logged). Parking-heavy uses and liquor-line questions are
**NOT screened by the agent** — logged neutrally, Adam runs the variance/
easement math himself.

**4.4 Tours:** **Adam only; the agent BOOKS a slot** against his availability
windows. → A-3 build consequence: the leasing persona needs a calendar/slot
seam, not just message-taking.

## Domain 5 — Vendor selection / COI enforcement ✅

**5.1 COI gate:** **Soft — dispatch + chase.** An expired/missing COI never
blocks a dispatch; the V-1 badge (expired / ≤30d / ≤60d) drives the follow-up.
→ Automation candidate: expired-COI + open-work-order = auto-trigger nudge.

**5.2 Coverage floor:** **GL $1M/$2M + Belle Realty of Lafayette, LLC named
as additional insured.** Matches the coi-parse deterministic note format —
the parser already extracts limits; add an additional-insured check to the
parse flow when convenient.

**5.3 On file BEFORE FIRST PAYMENT:** **COI + W-9 + trade license** (license
for licensed trades: electrical/plumbing/HVAC/roofing). No vendor agreement
required. Gate is at payment, not dispatch — consistent with 5.1.

## Domain 6 — Make-ready / turnover ✅

**6.1 Make-ready scope:** **As-is; the deal drives scope.** No standing
white-box or punch spend on vacancy — TI is negotiated per LOI. (Consistent
with the 131/133 marketing posture — bays shown as-is.)

**6.2 Move-out:** **Solo walk + photos at key return; itemized deposit
reconciliation ≤30 days.** House standard regardless of lease silence.
→ Checklist template candidate (photos → unit drawer, deposit line → ledger).
Note: deposits 107/137/143/149 are still unrecorded in the SOT (open item) —
reconciliation at those units needs the deposit figure chased first.

## Domain 7 — Inspection schedule ✅

**7.1 Property walk:** **Daily/near-daily informal presence + ONE documented
monthly walk** (checklist + photos → the record). → Automation candidate:
monthly walk checklist template + auto-trigger reminder thread if no walk
logged by month-end.

**7.2 House HVAC PM (all units except 149):** **Semi-annual — spring + fall,
Butcher Air.** 149 excluded (tenant-held PM per §9.01). → T-1/auto-trigger
candidate: two dated PM windows; nudge if season opens with no PM logged.

---

## Derived outputs queue (the actual A-4 deliverables)

**(a) K-1 runbook pages** — one per domain, from this doc. Registry rows so
the SOPs live in the app, not in markdown.

**(b) Automation candidates surfaced by the capture:**
1. Expired-COI × open-work-order → manager-thread nudge (5.1).
2. Additional-insured check in coi-parse (5.2 — parser already reads limits).
3. Monthly documented-walk template + missing-walk month-end reminder (7.1).
4. Semi-annual HVAC PM windows + unlogged-PM nudge (7.2).
5. Move-out checklist template (6.2).
6. NO rent-reminder cron (3.2 — deliberate non-build).

**(c) A-3 triage script derivation — the rules the voice personas inherit:**
- **Tenant line:** emergency classes (1.1) → dispatch roster (1.5) + notify;
  $500 disclosure cap context (1.2); HVAC no-cool = same-day-business-hours
  (1.6); after-hours = dispatch + text summary, never wake for permission
  (1.4); payment questions = "electronic only, operator sets up ACH" (3.1);
  fee-waiver asks logged, never answered (3.3); NO eviction-timeline language
  ever (2.1); escalated tenants stay in-script — callback promise, no patch
  (2.2); break-in = tenant files police report, we secure + document (2.4).
- **Leasing line:** collect name + number ONLY (4.1); rate = "high teens PSF"
  range (4.2); screen exclusivity conflicts honestly, nothing else (4.3);
  book a tour slot on Adam's calendar (4.4 — needs calendar seam); attorneys/
  government/hot prospects → live handoff (2.2).

**Per-property product note:** every numbered answer above is a settings row
in the Phase B schema (§14) — OTB's values become product defaults.
