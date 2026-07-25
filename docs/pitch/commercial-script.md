# OTB Property Command — Commercial
**"The Instrumented Asset" · 90-second master + 30-second cut**
Brand: Orange Ocean (Ocean Navy #1C2D4F / Sunset Orange #E8820C, Helvetica).
Tone per brand doc: an operator speaking, not a software vendor. No buzzwords,
no "disruption." Every claim in this script is true of the live system.

**VO status: RENDERED** (2026-07-25) — all 8 scenes in the in-app "Jack John"
voice, embedded in `commercial.html` (▶ PLAY WITH VOICE button; per-scene
playback stays in sync on manual advance). Re-render after script changes:
`tools/render-commercial-vo.py` (key drill in its header). With VO the closing
scene holds 14s → the reel runs 92s total.

Production paths (pick one):
- **A. Screen-record the HTML piece** (`commercial.html`, this folder) — it
  self-plays the full sequence **with voice built in**; record at 1080p with
  system audio, add music.
- **B. Live-footage cut** — drone footage (golden-hour clips 0008–0016) +
  screen capture of the real app per the shot list below.
- **C. Present live** — the HTML piece loops; use it as a booth/lobby reel
  with the on-screen text carrying the story (no VO needed).

---

## 90-second master — script & storyboard

| # | Time | Visual | Voice-over | On-screen text |
|---|---|---|---|---|
| 1 | 0:00–0:08 | Black → slow fade up on navy. A single amber cursor blinks. | "A shopping center runs on memory. Paper leases. A binder on a shelf. Somebody's inbox." | A SHOPPING CENTER RUNS ON MEMORY. |
| 2 | 0:08–0:16 | Drone golden-hour orbit of On The Boulevard (or the plat drawing itself, drawn on in white line-art). | "This one is different. We rebuilt ours — as software." | 27 UNITS · 62,883 SF · LAFAYETTE, LA |
| 3 | 0:16–0:28 | Screen capture: A-1 site plan; the 🚗 chip flips on; stalls paint green in real time; cut to the 7-day sparkline. | "Seventeen cameras watch the parking field. Thirty-four stalls, classified every five minutes. Occupancy here isn't a guess in a spreadsheet — it's measured." | OCCUPANCY: MEASURED. NOT ESTIMATED. |
| 4 | 0:28–0:42 | Screen capture: AI-1 leasing question ("retain at $17 vs replace at $20…") — answer streams; a figure glows amber, traced to the engine output beside it. | "The AI is allowed to talk. It is not allowed to guess. Every dollar in every answer must trace to a deterministic formula — or the answer is thrown away and recalculated." | NUMBERS THAT CANNOT HALLUCINATE. |
| 5 | 0:42–0:54 | Screen capture: ledger panel — entries appending; a void entry appears *below* its target, nothing deleted; C-1 ⏱ history scrolls. | "Every payment. Every signature. Every compliance change. Recorded forever — corrections are new entries. Nothing is ever erased." | NOTHING IS EVER ERASED. |
| 6 | 0:54–1:06 | Night exterior still; phone UI ring; transcript thread materializes; a work order card slides onto M-1. | "At 2 a.m., the phone answers with our policies. A leak gets dispatched. A leasing call gets a tour booked. Every call becomes a transcript." | THE PHONE ANSWERS AT 2 A.M. |
| 7 | 1:06–1:18 | The monthly owner brief scrolls — KPI tiles, expiration table; stamp: DETERMINISTIC. | "And on the first of the month, the owner receives a brief no one had to remember to write — and no AI was allowed to embellish." | THE OWNER SEES EVERYTHING. |
| 8 | 1:18–1:30 | Cut to navy. Orange rule draws across. OO logo (dark variant). | "One property proved it, end to end. The next twenty are the point. OTB Property Command, by Orange Ocean — built by an operator, for the owners of real places." | ORANGE OCEAN · OTB PROPERTY COMMAND — orangeocean.ai |

**Music:** restrained, low pulse; no EDM builds. **VO:** measured, unhurried
male/neutral read (the ElevenLabs "Jack John" voice already used in-app keeps
it on-brand).

---

## 30-second cut

| Time | Beat |
|---|---|
| 0:00–0:06 | Scene 1 compressed: "A shopping center runs on memory. We rebuilt ours as software." |
| 0:06–0:14 | Scene 3: measured parking. "Occupancy is measured — not estimated." |
| 0:14–0:22 | Scene 4: guardrail. "Our AI can talk. It can't guess. Every number traces to a formula." |
| 0:22–0:30 | Scene 8 close: logo + "Built by an operator, for the owners of real places." |

---

## Claims register (legal/accuracy check — all verified July 2026)

| On-screen claim | Basis |
|---|---|
| 27 units · 62,883 SF | Audited GLA (CLAUDE.md property facts) |
| 17 cameras / 34 stalls / 5-minute sampling | C3 pipeline, live since 2026-07 |
| "Measured, not estimated" | Camera-derived samples vs Placer.ai modeled panels (competitive file §16) |
| Numeric guardrail behavior | lib/calc/guardrail.js — fail-closed, 0.5% tolerance, engine-substituted replies |
| Append-only ledger / compliance | ledger_entries + compliance_events: no update/delete policies exist |
| 2 a.m. phone answering | A-3 voice lines (Twilio ConversationRelay) — built; carrier go-live in progress. **If airing before go-live, soften to "the phone can answer…" or hold scene 6.** |
| Monthly deterministic brief | lib/brief.js — no LLM in the loop |
| "One property proved it" | Live production system, 269 tests, real money from Aug 2026 |

**Do not add:** revenue claims, tenant names without consent, "70,000 SF"
(brand doc figure — overridden by operator decision: audited 62,883 only),
investment-return language of any kind.
