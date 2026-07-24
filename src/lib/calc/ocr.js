/* Occupancy Cost Ratio (OCR) early-warning calculator — ported from
   belle-realty-pwa @ 19f7c06 (ocr.service.ts, Playbook §6). Total occupancy
   cost (base + CAM + tax + insurance + percentage rent) over annual gross
   sales — the tenant-health tripwire. Bands: ≤10% healthy · 10–15% watch ·
   15–20% elevated · >20% distress (exactly 20% is still elevated). Pure. */

const round2 = n => Math.round(n * 100) / 100;
const round4 = n => Math.round(n * 10000) / 10000;
const money = n => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const pct = d => (d * 100).toFixed(1) + "%";

const BAND_NARRATIVE = {
  healthy:
    "This tenant is in the healthy band: occupancy cost is a sustainable share of sales and no action is needed.",
  watch:
    "This tenant is in the watch band: occupancy cost is climbing and worth monitoring at the next reporting cycle.",
  elevated:
    "This tenant is in the elevated band: occupancy cost is an active concern and warrants a proactive conversation about sales trends or occupancy cost relief.",
  distress:
    "This tenant is in the distress/at-risk band: occupancy cost is consuming an unsustainable share of sales, a leading signal of default risk or a co-tenancy/kick-out exposure.",
};

/* input: { annualBaseRent, annualCam, annualTax, annualInsurance,
            percentageRent?, annualSales } */
export function computeOcr(input) {
  const {
    annualBaseRent,
    annualCam,
    annualTax,
    annualInsurance,
    percentageRent = 0,
    annualSales,
  } = input || {};

  if (!(annualSales > 0)) throw new Error("annualSales must be greater than 0");
  if (annualBaseRent < 0 || annualCam < 0 || annualTax < 0 || annualInsurance < 0 || percentageRent < 0) {
    throw new Error("occupancy cost components must not be negative");
  }

  const totalOccupancyCost = round2(annualBaseRent + annualCam + annualTax + annualInsurance + percentageRent);
  const ocr = totalOccupancyCost / annualSales;
  const ocrPct = Math.round(ocr * 1000) / 10;

  let band;
  if (ocr <= 0.1) band = "healthy";
  else if (ocr <= 0.15) band = "watch";
  else if (ocr <= 0.2) band = "elevated";
  else band = "distress";

  const atRisk = ocr > 0.2;
  const salesToReach20Pct = round2(totalOccupancyCost / 0.2);
  const salesGapToHealthy = round2(Math.max(0, salesToReach20Pct - annualSales));

  const methodology =
    "Occupancy cost ratio (OCR) divides the tenant's total annual occupancy cost of " +
    `${money(totalOccupancyCost)} (base rent ${money(round2(annualBaseRent))}, CAM ` +
    `${money(round2(annualCam))}, real estate tax recovery ${money(round2(annualTax))}, ` +
    `insurance recovery ${money(round2(annualInsurance))}` +
    (percentageRent > 0 ? `, percentage rent ${money(round2(percentageRent))}` : "") +
    `) by annual gross sales of ${money(round2(annualSales))}, producing an OCR of ` +
    `${pct(ocr)}. ${BAND_NARRATIVE[band]} To bring OCR back to the 20% distress line at the ` +
    `current cost structure, the tenant would need annual sales of ${money(salesToReach20Pct)}` +
    (salesGapToHealthy > 0
      ? `, a gap of ${money(salesGapToHealthy)} above current sales.`
      : ", which current sales already clear.") +
    " Occupancy cost ratio is the tenant-health tripwire. Over 20 percent, start the " +
    "conversation early.";

  return {
    ocr: round4(ocr),
    ocrPct,
    band,
    atRisk,
    totalOccupancyCost,
    annualBaseRent: round2(annualBaseRent),
    annualCam: round2(annualCam),
    annualTax: round2(annualTax),
    annualInsurance: round2(annualInsurance),
    percentageRent: round2(percentageRent),
    annualSales: round2(annualSales),
    salesToReach20Pct,
    salesGapToHealthy,
    methodology,
  };
}
