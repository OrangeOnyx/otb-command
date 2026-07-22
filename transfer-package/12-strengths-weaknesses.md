# 12 — Strengths, Weaknesses, and Technical Debt

System code: **OTBC**.

## Strongest product ideas
1. **Governed source of truth** — authority-ranked sources, blocking validation
   rules, and a known-exceptions log ("store both, bill the stated amount").
   Most PM systems have data; this one has *jurisprudence* about its data.
2. **Plat-exact site plan as the hub** — legal geometry (variance, easements,
   liquor line) is first-class data, so every leasing decision surfaces its
   constraints visually.
3. **Anti-hallucination AI by construction** — deterministic calc engines +
   fail-closed numeric guardrail + deterministic (no-LLM) owner reports. The AI
   is allowed to talk but never allowed to do math.
4. **Suggest-only automation** — late fees, lease drafts, trigger threads all
   stop at a human confirm. Right trust posture for money/legal actions.
5. **Derived-seed + override-layer pattern** (action board, cameras) — computed
   facts never go stale; human edits persist on top.
6. **Role-faced single deployment** — operator/owner/vendor see different apps
   from one codebase, sealed by RLS not routing.
7. **Everything regenerable** — posters, exports, georefs, seeds, graphs all
   from committed re-runnable tools; outputs are disposable.
8. **Event-sourced operational memory** — compliance events, safe/vendor logs,
   append-only ledger: who/when/what for every consequential act.
9. **4D property twin trajectory** — plan → iso → 3D → satellite → photoreal
   splat → live camera-derived occupancy, all on one drawer/selection model.
10. **Drawing-set document vernacular** — sheet codes/title blocks/print stamps
    give an internal tool document-of-record credibility with owners.

## Strongest implementation choices
1. Pure-seam discipline → 197 dependency-free tests on a vanilla stack.
2. Single-source registries (layers.js, pages.js, cards.js, bucketstore
   factory) killing twin-list drift bug classes.
3. Idempotency everywhere it matters: deterministic ids (`rent:YYYY-MM:unit`),
   insert-once briefs, unique trigger_source, on-conflict-do-nothing.
4. Security model: RLS fails closed, pending-by-default, no service-role key,
   secret-gated definer RPCs, confidential-seed split, prompt-cache-stable
   context weaving, version-controlled security snapshot.
5. Computational fits over eyeballing (georef, splat alignment) with committed
   re-fit tools and offline verification artifacts.
6. Fail-soft loading for heavy assets (mesh/splat toggles absent, not broken).

## Weakest product assumptions
1. **Single property, single operator, single browser** — org/property ids are
   hardcoded ("otb"); concurrency is last-write-wins debounced push; no
   conflict handling (B4 realtime deferred).
2. **Operator-in-the-loop for everything** — no tenant-facing surface at all
   (no portal, no payments, no requests); fine for this asset, a wall for
   productization.
3. **Maintenance is out of scope** — no work orders/PM/inspections; ops memory
   lives in kanban cards and vendor folders.
4. **The rent cycle starts at the ledger** — no bank feed, no deposit
   reconciliation; collections truth still depends on the operator typing
   checks in.

## Weakest implementation choices
1. Hardcoded facts inside views (parking KPI, JD Bank date, covenant prose).
2. CSS-as-permission for read-only faces (RLS is the real boundary and holds,
   but the pattern invites a future mistake).
3. No URL routing (no deep links/back button); label-text nav hop in search.
4. alert()/confirm() error surfaces; silent best-effort catches on non-money
   writes (correct priority, but no operator-visible failure telemetry).
5. `property_state` JSONB layers are schema-free — layers.js is the only
   schema; formal validation lives client-side only.
6. Money-as-string in hvac.json; "true"-as-missing artifacts in lease_clauses.

## Security risks
1. **Rate-limit fail-open** — a Supabase outage removes the paid-endpoint
   ceiling (documented tradeoff).
2. **48h/10min signed URLs are bearer links** — lease packages get mailto'd;
   anyone with the link opens the doc during the window (by design; note it).
3. **CAPTCHA still off** (operator console task) — magic-link email-bomb /
   junk-pending abuse possible; magic link is the only factor, no MFA.
4. **Owner read scope is all-layers server-side** — sheet hiding is client-side;
   an owner with devtools can read layers the operator hid (financials are
   owner-visible by design here, but a rebuild must enforce per-layer RLS).
5. ElevenLabs key was once pasted in chat (rotation done for Anthropic;
   ElevenLabs rotation was still pending at last audit note — verify).
6. Six residual esc() copies in tools/server contexts = 7-place XSS patch
   surface (app layer consolidated).

## Data-integrity risks
1. Dual headline totals (62,883 GLA vs 62,810 demised; 324 vs 314 parking) —
   labeled conventions, but every downstream consumer must know the rule.
2. Combined-lease allocations look billable in units.json; the guard flag
   lives only in the CSV layer.
3. Unit-label format drift (117 1/2 vs 117.5) across CSV/JSON joins.
4. Generated-file staleness (forgetting split-seed / concierge-context /
   extract-georef after edits) — the known footgun class; only convention
   defends it.
5. Open items: deposits 107/137/143/149 missing; parking Δ −10 unreconciled;
   contacts email coverage ~16%.

## Scalability risks
1. The C3/camera pipeline runs on one Windows machine + Tailscale + detached
   processes with a watchdog — no cloud path, no alerting when it dies quietly.
2. Whole-state JSONB rows per layer — fine at one property; N properties needs
   normalization (B4's deferred work).
3. Vercel function 60s cap bounds AI tool loops; fine now.

## Maintainability risks
1. Bus factor = 1 human + AI-session memory (CLAUDE.md/HANDOFF.md are
   load-bearing; HANDOFF already drifts from code — "8 sheets" vs 12).
2. Manual deploy step — forgetting `vercel deploy` leaves prod silently stale
   (mitigated by "deployed means done" discipline, not tooling).
3. Migration SQL lives only in Supabase; repo has a snapshot.

## Legal / compliance risks
1. AI-drafted lease/notice documents — mitigated by DRAFT stamps + human send;
   keep that boundary.
2. Eviction sequencer is Louisiana-specific legal guidance embedded in code —
   correct here, must be jurisdiction-gated if reused.
3. Camera/occupancy imagery retention has no stated policy (frames bank
   indefinitely on local disk).
4. PII (tenant contacts) correctly kept out of the public bundle — preserve
   the seed split in any rebuild.

## Property-management domain gaps (vs full PM suite)
Work orders/PM/dispatch · invoices/POs/approvals · CAM reconciliation &
true-up statements · security-deposit accounting (deposits partly unknown) ·
tenant insurance (COI tracked for vendors only) · budgeting/variance ·
delinquency workflow beyond aging + suggestions · tenant portal/payments ·
inspections/incidents · listing syndication · e-sign. All were consciously
deferred or queued (merger queue #5/#6), not overlooked.

## Complexity without sufficient value (candidates to drop in a rebuild)
1. Knowledge-graph auto-refresh hook (dev tooling; keep offline, don't port).
2. The 5-variant poster suite beyond the blessed B + X (exploratory).
3. Iso Lens A vs 3D Lens B overlap — one massing lens likely suffices.
4. UniFi card (nice-to-have telemetry; port last).
5. Local-mode IndexedDB fallbacks *if* a rebuild commits to hosted-only —
   today they serve the demo/offline path; decide deliberately.
