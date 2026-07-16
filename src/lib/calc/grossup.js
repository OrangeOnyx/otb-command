/* CAM gross-up calculator — ported from belle-realty-pwa @ 19f7c06
   (gross-up.service.ts). Variable CAM lines are grossed up to a stipulated
   occupancy (OTB uses 95%); fixed/tax/insurance bill at actual and are never
   grossed up. Never grosses DOWN (factor floored at 1.0). Pure math. */

const round2 = n => Math.round(n * 100) / 100;
const money = n => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

/* lines: [{ label, actualAmount, kind: 'variable'|'fixed'|'tax'|'insurance' }] */
export function grossUp(lines, actualOccupancy, targetOccupancy = 0.95) {
  if (!(actualOccupancy > 0 && actualOccupancy <= 1)) throw new Error("actualOccupancy must be a decimal between 0 and 1");
  if (!(targetOccupancy > 0 && targetOccupancy <= 1)) throw new Error("targetOccupancy must be a decimal between 0 and 1");

  const grossUpFactor = targetOccupancy / actualOccupancy;

  const resultLines = lines.map(line => {
    const isVariable = line.kind === "variable";
    const effectiveFactor = isVariable ? Math.max(1, grossUpFactor) : 1;
    const grossedAmount = round2(line.actualAmount * effectiveFactor);
    return {
      label: line.label, kind: line.kind,
      actualAmount: round2(line.actualAmount),
      grossedAmount,
      grossUpAdjustment: round2(grossedAmount - line.actualAmount),
      grossedUp: isVariable && effectiveFactor > 1,
    };
  });

  const totalActual = round2(resultLines.reduce((s, l) => s + l.actualAmount, 0));
  const totalGrossed = round2(resultLines.reduce((s, l) => s + l.grossedAmount, 0));
  const totalGrossUpAdjustment = round2(totalGrossed - totalActual);

  const pct = d => Math.round(d * 100) + "%";
  const methodology =
    `Variable CAM expenses are grossed up from actual ${pct(actualOccupancy)} occupancy ` +
    `to the stipulated ${pct(targetOccupancy)} occupancy (factor ${round2(grossUpFactor)}), ` +
    `so tenants bear only their pro-rata share of a ${pct(targetOccupancy)}-occupied center ` +
    `and the landlord is not over-recovered. Real estate taxes, insurance, and fixed expenses ` +
    `are billed at actual cost and are not grossed up. Total billed to the CAM pool: ` +
    `${money(totalGrossed)} (${money(totalGrossUpAdjustment)} of gross-up adjustment). See Exhibit C.`;

  return {
    actualOccupancy, targetOccupancy,
    grossUpFactor: round2(grossUpFactor),
    lines: resultLines, totalActual, totalGrossed, totalGrossUpAdjustment, methodology,
  };
}
