/* Capex plan check / reserve-gate — ported from belle-realty-pwa @ 19f7c06
   (capex.service.ts, Playbook §9: "reserve-frame, not spending-frame").
   A capital project is evaluated against the reserve fund — coverage,
   post-project balance, replenishment runway — plus optional EUL urgency
   flagging on the underlying asset. Pure; currentYear must be supplied
   whenever an asset block is present (never derived from Date.now()). */

const round2 = n => Math.round(n * 100) / 100;
const money = n => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

/* input: { projectCost, currentReserveBalance, annualReserveContribution,
            asset?: { assetType?, installYear?, expectedUsefulLifeYears?, currentYear } } */
export function checkCapexPlan(input) {
  const { projectCost, currentReserveBalance, annualReserveContribution = 0, asset } = input || {};

  if (!(projectCost > 0)) throw new Error("projectCost must be greater than 0");
  if (!(currentReserveBalance >= 0)) throw new Error("currentReserveBalance cannot be negative");

  const notes = [];

  const postProjectReserve = round2(currentReserveBalance - projectCost);
  const reserveCoverage = round2(currentReserveBalance / projectCost);
  const fundedFromReserve = postProjectReserve >= 0;

  let monthsToReplenish = null;
  if (fundedFromReserve) {
    if (annualReserveContribution > 0) {
      monthsToReplenish = Math.ceil(projectCost / (annualReserveContribution / 12));
    } else {
      notes.push("annualReserveContribution is zero or negative — replenishment runway cannot be computed.");
    }
  }

  let assetResult = null;
  if (asset && (asset.installYear !== undefined || asset.expectedUsefulLifeYears !== undefined)) {
    if (!(asset.currentYear > 1900)) throw new Error("asset.currentYear must be supplied with the asset block");
    const currentYear = asset.currentYear;
    const installYear = asset.installYear ?? currentYear;
    const expectedUsefulLifeYears = asset.expectedUsefulLifeYears ?? 0;
    const assetAge = currentYear - installYear;
    const remainingLife = expectedUsefulLifeYears - assetAge;
    const pastEul = remainingLife <= 0;
    const urgency = pastEul ? "replace_now" : (remainingLife <= 2 ? "plan_replacement" : "monitor");
    assetResult = { assetType: asset.assetType, installYear, expectedUsefulLifeYears, currentYear, assetAge, remainingLife, pastEul, urgency };
  }

  let recommendation;
  if (fundedFromReserve) {
    recommendation = monthsToReplenish !== null
      ? `Fund from reserve; replenish over ${monthsToReplenish} months.`
      : "Fund from reserve; replenishment runway unknown until contributions resume.";
  } else {
    recommendation = `Reserve short by ${money(Math.abs(postProjectReserve))}; stage the project or top up the reserve before committing.`;
  }
  if (assetResult?.pastEul) {
    recommendation += ` Note: the ${assetResult.assetType ?? "asset"} is past its expected useful life and should be prioritized.`;
  }

  const coveragePct = Math.round(reserveCoverage * 100) + "%";
  let methodology =
    "This project is evaluated against the reserve fund, not as a standalone spend " +
    "(Playbook §9: reserve-frame, not spending-frame). Current reserve balance " +
    `${money(currentReserveBalance)} covers ${coveragePct} of the ${money(projectCost)} project cost, ` +
    `leaving a post-project reserve of ${money(postProjectReserve)}. ` +
    (fundedFromReserve
      ? "Because the reserve can absorb the full cost, the project is funded from reserve" +
        (monthsToReplenish !== null
          ? ` and the reserve replenishes over an estimated ${monthsToReplenish} months at the current ` +
            `annual contribution of ${money(annualReserveContribution)}.`
          : ", though the replenishment runway cannot be estimated without a positive annual contribution.")
      : "Because the reserve cannot absorb the full cost, the project should be staged or the reserve " +
        "topped up before committing funds.");

  if (assetResult) {
    methodology +=
      ` The underlying asset${assetResult.assetType ? ` (${assetResult.assetType})` : ""} was installed in ` +
      `${assetResult.installYear} with an expected useful life of ${assetResult.expectedUsefulLifeYears} years, ` +
      `putting it at ${assetResult.assetAge} years of age with ${assetResult.remainingLife} years of remaining life. ` +
      (assetResult.pastEul
        ? "The asset is past its expected useful life, so this project should be treated as replace-now."
        : assetResult.urgency === "plan_replacement"
          ? "The asset is nearing the end of its expected useful life, so replacement should be planned."
          : "The asset has healthy remaining life, so this project can simply be monitored.");
  }

  return {
    projectCost: round2(projectCost),
    currentReserveBalance: round2(currentReserveBalance),
    annualReserveContribution: round2(annualReserveContribution),
    postProjectReserve,
    reserveCoverage,
    fundedFromReserve,
    monthsToReplenish,
    asset: assetResult,
    recommendation,
    methodology,
    notes,
  };
}
