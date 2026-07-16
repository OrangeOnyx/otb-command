/* Net Effective Rent (NER) calculator — ported from belle-realty-pwa @ 19f7c06
   (apps/api/src/modules/copilot/calculators/ner.service.ts), Wave 46 Operator
   Copilot. NER is the valuation-frame rent: the level, constant-dollar rent a
   deal actually delivers after amortizing every concession (free rent, TI, LC)
   over the term. Pure and deterministic — the model narrates these numbers,
   it never computes them. */

const round2 = n => Math.round(n * 100) / 100;

/* deal: { label, sf, baseRentPsf, termMonths, freeRentMonths?, tiPsf?, lcPsf?, annualEscalation? } */
export function computeDeal(input) {
  const { label, sf, baseRentPsf, termMonths,
    freeRentMonths = 0, tiPsf = 0, lcPsf = 0, annualEscalation = 0 } = input;

  if (!(sf > 0)) throw new Error("sf must be positive");
  if (!(termMonths > 0)) throw new Error("termMonths must be positive");

  const termYears = termMonths / 12;

  // Gross base rent over the whole term, compounding any escalation annually.
  let grossRentTotal = 0;
  let monthsRemaining = termMonths;
  let yearIndex = 0;
  while (monthsRemaining > 0) {
    const monthsThisYear = Math.min(12, monthsRemaining);
    const rateThisYear = baseRentPsf * Math.pow(1 + annualEscalation, yearIndex);
    grossRentTotal += (rateThisYear * sf) * (monthsThisYear / 12);
    monthsRemaining -= monthsThisYear;
    yearIndex += 1;
  }

  // Free rent is valued at the year-1 face rate (toolkit convention).
  const freeRentTotal = baseRentPsf * sf * (freeRentMonths / 12);
  const tiTotal = tiPsf * sf;
  const lcTotal = lcPsf * sf;
  const totalConcessions = freeRentTotal + tiTotal + lcTotal;
  const netRentTotal = grossRentTotal - totalConcessions;
  const annualizedNer = netRentTotal / termYears;
  const nerPerSfPerYear = annualizedNer / sf;

  return {
    label, sf, termMonths,
    termYears: round2(termYears),
    grossRentTotal: round2(grossRentTotal),
    freeRentTotal: round2(freeRentTotal),
    tiTotal: round2(tiTotal),
    lcTotal: round2(lcTotal),
    totalConcessions: round2(totalConcessions),
    netRentTotal: round2(netRentTotal),
    annualizedNer: round2(annualizedNer),
    nerPerSfPerYear: round2(nerPerSfPerYear),
    assetValueAtCap: 0, // filled by compareDeals once cap rate is known
  };
}

/* Compare 2+ deals at a cap rate; pre-computes every pairwise delta so the
   model never has to subtract. */
export function compareDeals(deals, capRate) {
  if (!Array.isArray(deals) || deals.length < 2) throw new Error("compare requires at least 2 deals");
  if (!(capRate > 0 && capRate < 1)) throw new Error("capRate must be a decimal between 0 and 1");

  const results = deals.map(d => {
    const r = computeDeal(d);
    r.assetValueAtCap = round2(r.annualizedNer / capRate);
    return r;
  });

  const ranked = [...results].sort((x, y) => y.nerPerSfPerYear - x.nerPerSfPerYear);
  const winner = ranked[0], runnerUp = ranked[1];

  const delta = {
    winner: winner.label,
    runnerUp: runnerUp.label,
    nerPerSfPerYearDelta: round2(winner.nerPerSfPerYear - runnerUp.nerPerSfPerYear),
    annualizedNerDelta: round2(winner.annualizedNer - runnerUp.annualizedNer),
    assetValueDelta: round2(winner.assetValueAtCap - runnerUp.assetValueAtCap),
  };

  const pairwiseDeltas = [];
  for (let i = 0; i < results.length; i++) for (let j = 0; j < results.length; j++) {
    if (i === j) continue;
    const a = results[i], b = results[j];
    pairwiseDeltas.push({
      a: a.label, b: b.label,
      nerPerSfPerYearDelta: round2(a.nerPerSfPerYear - b.nerPerSfPerYear),
      annualizedNerDelta: round2(a.annualizedNer - b.annualizedNer),
      assetValueDelta: round2(a.assetValueAtCap - b.assetValueAtCap),
    });
  }

  return { capRate, deals: results, winner: winner.label, delta, pairwiseDeltas };
}
