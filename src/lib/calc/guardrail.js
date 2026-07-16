/* Numeric guardrail — ported from belle-realty-pwa @ 19f7c06
   (copilot/llm/synth-validator.ts, Wave 46 + M1/M2 hardening). Every
   dollar/percent/decimal the model emits after using a calculator must trace
   back to a value the calculator returned (rounding-tolerant, k-shorthand
   aware; statute numbers and years ignored). FAILS CLOSED below threshold —
   fabricated numbers never reach the operator.

   Deliberately grounds ONLY against calculator outputs, not the full context
   blob: big contexts carry so many incidental numbers (ids, sqft, zips) they
   would whitelist almost anything (the donor's M2 lesson). */

export const VALIDATOR_THRESHOLD = 90;

const round = n => Math.round(n * 100) / 100;

/* Extract candidate numeric tokens from prose: $1,234.56 | 1,234 | 95% | 12.5 |
   12k | -$5.12. The leading guard keeps a statute range like "4701-4733" from
   being mangled into a bogus negative. */
export function extractNumbers(text) {
  const out = [];
  const re = /(?<![\d.])(-?)\$?\s?(-?)(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)(\s?k)?%?/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    const raw = m[3].replace(/,/g, "");
    let val = parseFloat(raw);
    if (Number.isNaN(val)) continue;
    if (m[4]) val *= 1000; // k-shorthand
    if (m[1] === "-" || m[2] === "-") val = -val;
    out.push(val);
  }
  return out;
}

/* Recursively collect every numeric value in the given sources (calc outputs),
   registering the 2dp and integer forms of each. */
export function collectKnownNumbers(...sources) {
  const known = new Set();
  const walk = v => {
    if (v == null) return;
    if (typeof v === "number" && Number.isFinite(v)) { known.add(round(v)); known.add(Math.round(v)); return; }
    if (typeof v === "string") {
      for (const n of extractNumbers(v)) { known.add(round(n)); known.add(Math.round(n)); }
      return;
    }
    if (Array.isArray(v)) { v.forEach(walk); return; }
    if (typeof v === "object") Object.values(v).forEach(walk);
  };
  sources.forEach(walk);
  return known;
}

/* Never hallucination flags: years, LA CCP eviction articles, small counts.
   The small-int window is ≤12 (M1: tightened from 24 so a fabricated "$18/SF"
   or "20 units" is still scanned). */
function isIgnorableNumber(n) {
  if (Number.isInteger(n)) {
    if (n >= 1900 && n <= 2100) return true; // years
    if (n >= 4700 && n <= 4740) return true; // CCP 4701–4733
    if (n >= 0 && n <= 12) return true;
  }
  return false;
}

/* Rounding-tolerant match: ≤0.5% relative (M2, down from 1%); the flat ±$1.50
   allowance applies only to small magnitudes (≤$1000) so a large fabricated
   figure can't slip through on a coincidence. */
function matchesKnown(n, known) {
  if (known.has(round(n)) || known.has(Math.round(n))) return true;
  for (const k of known) {
    if (k === 0) continue;
    const abs = Math.abs(n - k);
    if (abs / Math.abs(k) <= 0.005) return true;
    if (Math.abs(k) <= 1000 && abs <= 1.5) return true;
  }
  return false;
}

/* Validate model prose against known calc numbers.
   Returns { score, passed, hallucinated } — passed=false must fail closed. */
export function validateNumbers(prose, known) {
  const hallucinated = [];
  for (const n of extractNumbers(prose || "")) {
    if (isIgnorableNumber(n)) continue;
    if (!matchesKnown(n, known)) hallucinated.push(n);
  }
  let score = 100 - 25 * Math.min(2, hallucinated.length);
  score = Math.max(0, score);
  return { score, passed: score >= VALIDATOR_THRESHOLD, hallucinated };
}
