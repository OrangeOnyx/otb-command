# H1.1 Voice Line Cutover — Runbook (2026-09-01)

**Decision H-2 (punch list, saved Sep 1): PUBLISH the Atlas bridge's numbers;
AC's Vapi/Retell line retires after a forwarding soak.** This runbook is the
whole cutover. Everything Claude can build is built (see "Built"); the steps
below are the operator's, in order. Total hands-on time ≈ 30 minutes plus a
30-day soak.

## Built (this repo, live after the 2026-09-01 deploy)

- `voice_settings.tenant_number` / `leasing_number` (E.164, checked) +
  `published_lines()` (any signed-in member) + `set_voice_lines()`
  (operator-only, normalizes any US format, refuses identical lines).
  Migration `20260901230000_voice_lines_publish.sql`.
- Sidebar → **Phone lines…** (operator): paste the two Twilio numbers once,
  Save. Until then every surface below stays silent (nothing renders).
- **M-1 tenant face:** "Urgent after hours? Call the tenant service line …"
  strip with a tap-to-call link — tenants see only the tenant line.
- **K-1 Directory:** "Property lines" block at the top of Property Contacts
  (both lines, tap-to-call).
- Pure seam `src/lib/voicelines.js` (normalize / format / validate / rows),
  tested in `test/voicelines.test.mjs`.

## Operator steps

1. **Read the two numbers off Twilio.** Console → Phone Numbers → Manage →
   Active numbers. The tenant line is the one whose voice webhook is
   `…/twiml?line=tenant`, leasing is `…/twiml?line=leasing`
   (docs/a3-voice-runbook.md step 4). If only one number was bought, the
   leasing field can stay blank — the tenant line publishes alone.
2. **Publish in Atlas.** orangeoceanatlas.com → sidebar → *Phone lines…* →
   paste → Save. Confirm: K-1 shows "Property lines"; a tenant login (or the
   owner-preview of M-1 is NOT enough — tenant face only) shows the strip.
   Mark punch-list **SMK-7**.
3. **Forward AC's number (the soak).** In whichever console owns the number
   AC's Vapi/Retell agent answers (Twilio, Vapi, or the carrier), point it at
   the Atlas **tenant** line — a plain call-forward, not the agent. Every
   caller who still has the old number saved lands on the bridge from this
   moment; nothing is lost while the notice circulates.
4. **Retire the AC agent.** Disable / delete the Vapi/Retell assistant (the
   forward in step 3 keeps the number answering). AC's `voice_intake`
   webhook stops receiving — expected; its 62 rows are already in L-1.
5. **Tenant notice (same day).** Send the notice below to every tenant
   contact (K-1 / M-1 tenant logins carry the emails). Log it in L-1 as a
   `notice` entry so the comm log shows the cutover date.
6. **Verify (first week).** `voice_calls` rows keep landing (AI-1 threads
   `voice-tenant` / `voice-leasing`); M-1 shows `vr-…` requests from real
   callers. If a caller reports reaching a dead line, the forward in step 3
   is wrong — fix that, nothing in Atlas.
7. **Release the old number (after ≥ 30 days of forward + notice).** Drop
   the forward and release the number in its console. Mark wave **H1.1
   Done** on the punch list. Register row #1 goes from PORT to DONE.

## Tenant notice (draft — edit tone, keep the facts)

> Subject: New tenant service line for On The Boulevard
>
> Starting today, maintenance requests and after-hours emergencies for On
> The Boulevard go to our new tenant service line: **(337) XXX-XXXX**. Save
> it in your phone. The line is answered around the clock; routine requests
> can also be filed any time from your tenant login at orangeoceanatlas.com.
> The previous number forwards to the new line through [date + 30 days],
> then retires.
>
> — Adam Abdalla, Orange Ocean, LLC, property manager for Belle Realty of
> Lafayette, LLC

## Surfaces deliberately NOT switched (operator call)

- Lease template contact block (`src/lib/lease.js` — office line
  337-769-1554) and the owner-brief / board-report footers (337-288-5411)
  are entity contact facts, not the voice lines. Say the word if the tenant
  service line should replace the office line in new leases.
- The leasing SMS blurb (`src/lib/leasing.js`) still signs with Adam's
  direct number. If the leasing line should take over, that's a one-line
  change — decide once the leasing line is published and smoked.
- Vinyl QR still encodes `tel:` — re-run per the HANDOFF note once the
  canonical-domain decision lands (unchanged by H-2).
