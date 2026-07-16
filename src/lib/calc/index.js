/* Calc seam — deterministic CRE engines behind ONE agent tool (run_calc).
   Harvested from belle-realty-pwa @ 19f7c06 per the 2026-07-16 consolidation
   decision. The model supplies inputs and narrates outputs; it never does
   arithmetic. Each engine also returns deterministic prose (methodology /
   summary / narrativeInputs) usable as a fail-closed fallback. */

import { compareDeals } from "./ner.js";
import { grossUp } from "./grossup.js";
import { sequenceEviction } from "./eviction.js";
import { computeKpis } from "./kpi.js";

export const CALC_TOOL = {
  name: "run_calc",
  description:
    "Run a deterministic commercial-real-estate calculator. Use this for ANY dollar/percent computation " +
    "instead of doing arithmetic yourself: comparing lease deals on a net-effective-rent basis " +
    "(retain-vs-replace, blend-and-extend, free-rent-vs-TI), grossing up variable CAM to stipulated " +
    "occupancy, sequencing a Louisiana eviction (CCP 4701-4733), or computing monthly KPIs. " +
    "After calling it, narrate ONLY numbers the tool returned.",
  input_schema: {
    type: "object",
    properties: {
      engine: { type: "string", enum: ["ner_compare", "cam_gross_up", "eviction_sequence", "kpi"] },
      ner: {
        type: "object",
        description: "For ner_compare: 2+ deal scenarios and a cap rate.",
        properties: {
          capRate: { type: "number", description: "Decimal 0-1, e.g. 0.075" },
          deals: {
            type: "array", minItems: 2,
            items: {
              type: "object",
              properties: {
                label: { type: "string" }, sf: { type: "number" },
                baseRentPsf: { type: "number" }, termMonths: { type: "number" },
                freeRentMonths: { type: "number" }, tiPsf: { type: "number" },
                lcPsf: { type: "number" }, annualEscalation: { type: "number" },
              },
              required: ["label", "sf", "baseRentPsf", "termMonths"],
            },
          },
        },
        required: ["capRate", "deals"],
      },
      grossUp: {
        type: "object",
        description: "For cam_gross_up: expense lines + actual occupancy (target defaults 0.95).",
        properties: {
          actualOccupancy: { type: "number" },
          targetOccupancy: { type: "number" },
          lines: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: { type: "string" }, actualAmount: { type: "number" },
                kind: { type: "string", enum: ["variable", "fixed", "tax", "insurance"] },
              },
              required: ["label", "actualAmount", "kind"],
            },
          },
        },
        required: ["actualOccupancy", "lines"],
      },
      eviction: {
        type: "object",
        description: "For eviction_sequence: Louisiana CCP eviction inputs.",
        properties: {
          ground: { type: "string", enum: ["monetary", "non_monetary", "holdover", "bankruptcy"] },
          waiverOfNotice: { type: "boolean" },
          acceptedRentAfterNotice: { type: "boolean" },
          daysDelinquent: { type: "number" },
          monthlyRent: { type: "number" },
        },
        required: ["ground"],
      },
      kpi: {
        type: "object",
        description: "For kpi: current period snapshot (+ optional prior period for MoM deltas).",
        properties: {
          period: {
            type: "object",
            properties: {
              grossPotentialRent: { type: "number" }, actualCollections: { type: "number" },
              operatingExpenses: { type: "number" }, occupiedSf: { type: "number" },
              totalSf: { type: "number" }, scheduledBaseRent: { type: "number" },
            },
            required: ["grossPotentialRent", "actualCollections", "operatingExpenses", "occupiedSf", "totalSf", "scheduledBaseRent"],
          },
          priorPeriod: {
            type: "object",
            properties: {
              grossPotentialRent: { type: "number" }, actualCollections: { type: "number" },
              operatingExpenses: { type: "number" }, occupiedSf: { type: "number" },
              totalSf: { type: "number" }, scheduledBaseRent: { type: "number" },
            },
          },
        },
        required: ["period"],
      },
    },
    required: ["engine"],
  },
};

/* Dispatch a run_calc tool call. Never throws — returns { ok, engine, result }
   or { ok:false, error }. */
export function runCalc(input) {
  try {
    const engine = input?.engine;
    let result;
    if (engine === "ner_compare") result = compareDeals(input.ner?.deals, input.ner?.capRate);
    else if (engine === "cam_gross_up") result = grossUp(input.grossUp?.lines || [], input.grossUp?.actualOccupancy, input.grossUp?.targetOccupancy ?? 0.95);
    else if (engine === "eviction_sequence") result = sequenceEviction(input.eviction || {});
    else if (engine === "kpi") result = computeKpis(input.kpi?.period, input.kpi?.priorPeriod);
    else return { ok: false, error: "unknown engine: " + engine };
    return { ok: true, engine, result };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/* Deterministic fallback prose when the model's narration fails validation. */
export function calcFallback(out) {
  if (!out?.ok) return "";
  const r = out.result;
  if (out.engine === "ner_compare")
    return `Verified calculator result: ${r.winner} wins at $${r.delta.nerPerSfPerYearDelta}/SF/yr NER over ${r.delta.runnerUp} (asset value delta $${r.delta.assetValueDelta.toLocaleString("en-US")} at ${r.capRate * 100}% cap).`;
  if (out.engine === "cam_gross_up") return "Verified calculator result: " + r.methodology;
  if (out.engine === "eviction_sequence") return "Verified sequence: " + r.summary;
  if (out.engine === "kpi") return "Verified KPIs: " + r.narrativeInputs;
  return "";
}
