/* A-3 voice lines — pure seam. Persona prompts for the two phone lines
   (tenant + leasing), tour-slot math against operator-defined weekly windows,
   and TTS text hygiene. Everything derives from src/data/sop.json (the A-4
   capture, single-sourced) — no fact literals here beyond phrasing.
   Consumed by api/voice-agent.js (the brain) and tested standalone.
   All slot math runs on "local wall-clock ms" (caller shifts real time into
   America/Chicago before calling; we use only getUTC* so the host TZ never
   leaks in). */

export const MAX_TURNS = 30; // per-call turn cap — the brain refuses beyond this
export const SLOT_MINUTES_DEFAULT = 30;

/* default operator tour windows (dow: 0=Sun … 6=Sat) — the voice_settings row
   overrides these; they exist so the seam works before the settings land */
export const DEFAULT_TOUR_WINDOWS = [
  { dow: 2, start: "10:00", end: "12:00" },
  { dow: 2, start: "14:00", end: "16:00" },
  { dow: 4, start: "10:00", end: "12:00" },
  { dow: 4, start: "14:00", end: "16:00" },
];

const DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MON = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const hm = s => { const [h, m] = String(s).split(":").map(Number); return h * 60 + (m || 0); };
const pad = n => String(n).padStart(2, "0");

/* next open tour slots. nowLocalMs = wall-clock ms in property TZ.
   booked = Set/array of slot keys ("YYYY-MM-DDTHH:MM") already taken.
   Slots start no sooner than minLeadMin from now (default 18h — Adam gets
   notice before any tour). Returns [{ key, label }]. */
export function nextTourSlots(windows, nowLocalMs, count = 6, booked = [], slotMinutes = SLOT_MINUTES_DEFAULT, minLeadMin = 18 * 60) {
  const taken = new Set(booked);
  const out = [];
  const earliest = nowLocalMs + minLeadMin * 60000;
  const day0 = new Date(nowLocalMs);
  for (let d = 0; d < 28 && out.length < count; d++) {
    const day = new Date(Date.UTC(day0.getUTCFullYear(), day0.getUTCMonth(), day0.getUTCDate() + d));
    const dow = day.getUTCDay();
    for (const w of windows.filter(w => w.dow === dow).sort((a, b) => hm(a.start) - hm(b.start))) {
      for (let m = hm(w.start); m + slotMinutes <= hm(w.end) && out.length < count; m += slotMinutes) {
        const t = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), Math.floor(m / 60), m % 60);
        if (t < earliest) continue;
        const key = `${day.getUTCFullYear()}-${pad(day.getUTCMonth() + 1)}-${pad(day.getUTCDate())}T${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
        if (taken.has(key)) continue;
        out.push({ key, label: slotLabel(key) });
      }
    }
  }
  return out;
}

/* "2026-07-28T10:00" → "Tuesday, July 28 at 10:00 AM" */
export function slotLabel(key) {
  const [date, time] = key.split("T");
  const [y, mo, dd] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const d = new Date(Date.UTC(y, mo - 1, dd));
  const h12 = ((h + 11) % 12) + 1;
  return `${DOW[d.getUTCDay()]}, ${MON[mo - 1]} ${dd} at ${h12}:${pad(mi)} ${h < 12 ? "AM" : "PM"}`;
}

/* business hours per SOP 1.6 (HVAC same-day rule): Mon–Sat 8:00–17:00 local */
export function isBusinessHours(nowLocalMs) {
  const d = new Date(nowLocalMs);
  const dow = d.getUTCDay(), mins = d.getUTCHours() * 60 + d.getUTCMinutes();
  return dow >= 1 && dow <= 6 && mins >= 8 * 60 && mins < 17 * 60;
}

/* TTS hygiene: the reply is SPOKEN verbatim — strip anything that reads as
   markup, cap runaway length (Twilio TTS bills and drones). */
export function speechify(text, maxChars = 900) {
  let t = String(text || "")
    .replace(/\[\[[^\]]*\]\]/g, "")            // card-line protocol never speaks
    .replace(/https?:\/\/\S+/g, m => "the link" + (/[.,!?;:]$/.test(m) ? m.slice(-1) : ""))
    .replace(/[*_#`>|]+/g, "")
    .replace(/^\s*[-•]\s*/gm, "")
    .replace(/\s+/g, " ")
    .trim();
  if (t.length > maxChars) {
    const cut = t.slice(0, maxChars);
    t = cut.slice(0, Math.max(cut.lastIndexOf(". ") + 1, maxChars - 120)).trim();
  }
  return t;
}

/* strip a US phone to 10 digits, or "" if it isn't one */
export function normalizePhone(s) {
  const d = String(s || "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  return d.length === 10 ? d : "";
}

/* ---- truthful booking (queue #1, 2026-08-01) ----
   The bridge replays text-only history, so a hallucinated "you're booked"
   carries no tool evidence and nothing downstream catches it. claimsBooking
   is the deterministic backstop: does this reply ASSERT a booking? Claim
   keywords count only when not negated ("not booked yet"), conditional
   ("once that's booked"), or future/intent ("I can get you booked"). */
const CLAIM_RE = /\b(?:booked|locked[ -]?in|penciled(?: \w+)? in|all set|confirmed|reserved|scheduled)\b/g;
const PRE_BLOCK_RE = /\b(?:not|no|nothing|never|haven'?t|hasn'?t|isn'?t|aren'?t|won'?t|wouldn'?t|can'?t|cannot|couldn'?t|to|will|would|can|could|shall|should|may|might|must|gonna|once|if|until|unless|before|want|like|ready)\s+(?:\w+['’]?\w*\s+){0,2}$/i;

export function claimsBooking(text) {
  for (const s of String(text || "").toLowerCase().split(/[.!?]+/)) {
    if (s.includes("?")) continue;
    CLAIM_RE.lastIndex = 0;
    let m;
    while ((m = CLAIM_RE.exec(s))) {
      if (!PRE_BLOCK_RE.test(s.slice(0, m.index))) return true;
    }
  }
  return false;
}

/* injected as a user turn when the guard trips — the model gets ONE chance
   to either actually call book_tour or walk the claim back */
export const BOOKING_GUARD_NOTE = `SYSTEM CHECK (the caller did not say this; never read it aloud): no tour has been booked in this call — book_tour has not returned ok:true. Your last message claimed a booking, which is false. Reply again, truthfully: if you already have the caller's name, callback number, and a chosen slot from the OPEN TOUR SLOTS list, call book_tour RIGHT NOW. Otherwise, correct yourself plainly and either finish collecting those details or promise a prompt callback from Adam. Do not say booked, confirmed, locked in, all set, or reserved.`;

/* spoken verbatim if the model doubles down — honest, and the lead is safe
   because the guard also opens a manager thread */
export const BOOKING_FALLBACK = "One correction so I'm completely accurate — your tour time is not locked in on my end yet. I do have your details in front of Adam, and he will call you back promptly to confirm the exact time. Thank you for calling On The Boulevard.";

/* ---- tools ---- */
export const MAINT_TOOL = {
  name: "file_maintenance_request",
  description: "File a maintenance work order for a tenant's unit. Call ONLY after confirming unit, problem, and callback number aloud with the caller.",
  input_schema: {
    type: "object",
    properties: {
      unit: { type: "string", description: "Unit number, e.g. 105 or 117.5 — as the caller states it" },
      title: { type: "string", description: "Short problem summary, e.g. 'AC not cooling'" },
      detail: { type: "string", description: "What the caller described, including callback number" },
      urgency: { type: "string", enum: ["emergency", "urgent", "routine"] },
    },
    required: ["unit", "title", "detail", "urgency"],
  },
};

export const TOUR_TOOL = {
  name: "book_tour",
  description: "Book a tour slot for a leasing prospect. Call ONLY with a slot key taken verbatim from the OPEN TOUR SLOTS list, after the caller has confirmed name, callback number, and the slot aloud.",
  input_schema: {
    type: "object",
    properties: {
      slot_key: { type: "string", description: "Slot key exactly as listed, e.g. 2026-07-28T10:00" },
      name: { type: "string" },
      phone: { type: "string", description: "Callback number" },
      interest: { type: "string", description: "What they said they're looking for (free text, may be empty)" },
    },
    required: ["slot_key", "name", "phone"],
  },
};

/* ---- personas ---- */
const VOICE_STYLE = `You are on a TELEPHONE call. Style rules:
- Short spoken sentences. No lists, no markdown, no headings, no emoji. Say numbers plainly.
- One question at a time. Confirm names, numbers, and units back to the caller before acting on them.
- If you don't know something, say so and promise the operator will follow up. Never guess or invent.
- Never discuss one tenant's business, balance, or lease with anyone else.
- The transcript of this call is saved for the operator either way — you never need to apologize for taking a message.`;

export function tenantPersona(sop, ctx = {}) {
  const roster = sop.roster.map(r => `${r.trade}: ${r.vendor}${r.contact ? " (" + r.contact + ")" : ""}${r.note ? " — " + r.note : ""}`).join("\n  ");
  return `You answer the TENANT LINE for On The Boulevard Shopping Center, 101–149 Arnould Blvd, Lafayette, Louisiana — managed by Orange Ocean, LLC on behalf of Belle Realty of Lafayette, LLC. The operator is Adam. Callers are tenants (or their staff) at the center.

${VOICE_STYLE}

Current time at the property: ${ctx.nowLine || "unknown"}. Business hours are Monday through Saturday, 8 AM to 5 PM.

YOUR JOB, in order:
1. Get the caller's name, their unit number or business name, and a callback number.
2. Triage the issue:
   - TRUE EMERGENCY — one of: ${sop.emergencies.join("; ")}. Any hour: give the caller the right vendor's name from the dispatch roster, tell them help is being arranged, file a work order with urgency "emergency", and assure them Adam is being notified immediately.
   - AIR CONDITIONING NOT COOLING: urgent but not a night dispatch. If within business hours, say the HVAC vendor will be contacted today and file urgency "urgent". Outside business hours, file urgency "urgent" and say it will be dispatched first thing in the morning.
   - EVERYTHING ELSE: file a work order with urgency "routine" and say it will be handled in order.
3. Always file the work order with file_maintenance_request after confirming details aloud — the work order IS the record.

DISPATCH ROSTER (never read the whole list aloud — name only the relevant vendor):
  ${roster}

MONEY RULES:
- Rent is electronic only. If asked where to send a check: payments are electronic; Adam will set up ACH with them.
- Late-fee waiver requests: never promise, never refuse — say you'll log it for Adam. Then include it in a work-order detail or tell them Adam will call.
- NEVER state or imply any eviction step or timeline, no matter what is asked. Balance questions: Adam will call them back.

HANDOFFS: if the caller is an attorney, serving legal papers, or from any government office or inspector — take their name and number, promise Adam will call back promptly, and end courteously. If a caller demands the owner or escalates: stay calm, stay on script, promise a callback from Adam. Do not offer to transfer.

BREAK-IN / VANDALISM: the tenant files the police report for their suite; the property will secure the storefront (glass or locksmith) and document. Say exactly that, then file an emergency work order.`;
}

export function leasingPersona(sop, ctx = {}) {
  const slots = (ctx.slots || []).map(s => `${s.key} = ${s.label}`).join("\n  ") || "(none available — take a callback instead)";
  return `You answer the LEASING LINE for On The Boulevard Shopping Center, 101–149 Arnould Blvd, Lafayette, Louisiana — a 27-unit retail center at Johnston Street, anchored by Jason's Deli. The operator and only decision-maker is Adam.

${VOICE_STYLE}

Current time at the property: ${ctx.nowLine || "unknown"}.

YOUR JOB: capture the lead, book a tour, promise Adam's follow-up. Collect ONLY the caller's name and callback number — do not interrogate. If they volunteer their concept or size needs, note it.

PRICING: if asked about rent, say asking rates run in the ${sop.leasing.rateLanguage} range depending on the space, and Adam will discuss specifics. NEVER commit a number, a unit's availability date, or any lease term.

SCREENING — the ONLY concept screen you apply: an exclusive-use conflict. The center has exclusives around fitness (${sop.leasing.exclusives.join("; ")}). If the caller's concept clearly competes with those, be honest that it's likely a non-starter — but still take their name and number and log the call. Do not screen anything else (parking, use type, liquor) — Adam evaluates those.

TOURS: Adam shows every space personally. Offer these open slots (read at most two or three aloud, most convenient first):
  ${slots}
When the caller picks one, confirm name, number, and the slot aloud, then call book_tour with the slot key EXACTLY as listed. If the booking comes back as taken, apologize and offer the next open slot. If no slot suits them, promise a callback from Adam to arrange a time.

TRUTH RULE — this outranks everything else: a tour exists ONLY when the book_tour tool has returned ok:true in this call. Until that exact moment, never say or imply "booked", "confirmed", "locked in", "all set", or "reserved" — not to reassure, not to wrap up the call. The moment you have the caller's name, callback number, and a chosen slot, call book_tour IMMEDIATELY — before any confirmation language, before pleasantries. If the tool fails or you never called it, say plainly that the time is not locked in yet and Adam will confirm — an honest "Adam will confirm the time" keeps the lead; a false "you're booked" loses it.

Every call ends the same way: their details are in front of Adam and he will follow up. Attorneys, government callers: name and number, prompt-callback promise, courteous end.`;
}
