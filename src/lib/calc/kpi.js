/* Monthly KPI calculator — ported from belle-realty-pwa @ 19f7c06
   (kpi.service.ts). NOI, physical + economic occupancy, collections, expense
   ratio, with MoM deltas carrying a precomputed direction word so the model
   never infers sign. Pure. */

const round2 = n => Math.round(n * 100) / 100;
const round4 = n => Math.round(n * 10000) / 10000;
const money = n => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const pct = d => (d * 100).toFixed(1) + "%";

const DIRECTION_EPSILON = 0.0005; // sub-0.05% moves read as flat

const direction = delta => Math.abs(delta) < DIRECTION_EPSILON ? "flat" : (delta > 0 ? "up" : "down");

function periodKpis(input) {
  if (!(input.totalSf > 0)) throw new Error("totalSf must be greater than 0");
  if (!(input.grossPotentialRent > 0)) throw new Error("grossPotentialRent must be greater than 0");

  const noi = round2(input.actualCollections - input.operatingExpenses);
  const occupancyPct = round4(input.occupiedSf / input.totalSf);
  const collectionsPct = round2(input.actualCollections / input.grossPotentialRent);
  const economicOccupancyPct = input.scheduledBaseRent > 0
    ? round4(input.actualCollections / input.scheduledBaseRent)
    : collectionsPct;
  const expenseRatio = input.actualCollections > 0
    ? round2(input.operatingExpenses / input.actualCollections)
    : 0;

  return { noi, occupancyPct, collectionsPct, economicOccupancyPct, expenseRatio };
}

/* period / priorPeriod: { grossPotentialRent, actualCollections, operatingExpenses,
   occupiedSf, totalSf, scheduledBaseRent } */
export function computeKpis(period, priorPeriod) {
  const kpis = periodKpis(period);
  const priorKpis = priorPeriod ? periodKpis(priorPeriod) : null;

  let deltas = null;
  if (priorKpis) {
    const noiDelta = round2(kpis.noi - priorKpis.noi);
    const occupancyPctDelta = round2(kpis.occupancyPct - priorKpis.occupancyPct);
    const collectionsPctDelta = round2(kpis.collectionsPct - priorKpis.collectionsPct);
    deltas = {
      noiDelta,
      noiDeltaPct: priorKpis.noi !== 0 ? round2(noiDelta / Math.abs(priorKpis.noi)) : 0,
      noiDirection: direction(noiDelta),
      occupancyPctDelta,
      occupancyPctDeltaPct: priorKpis.occupancyPct !== 0 ? round2(occupancyPctDelta / Math.abs(priorKpis.occupancyPct)) : 0,
      occupancyDirection: direction(occupancyPctDelta),
      collectionsPctDelta,
      collectionsPctDeltaPct: priorKpis.collectionsPct !== 0 ? round2(collectionsPctDelta / Math.abs(priorKpis.collectionsPct)) : 0,
      collectionsDirection: direction(collectionsPctDelta),
    };
  }

  const noiLine = deltas
    ? `NOI ${money(kpis.noi)} (${deltas.noiDirection} ${pct(Math.abs(deltas.noiDeltaPct))} MoM)`
    : `NOI ${money(kpis.noi)}`;
  const occupancyLine = deltas
    ? `occupancy ${pct(kpis.occupancyPct)} (${deltas.occupancyDirection} MoM)`
    : `occupancy ${pct(kpis.occupancyPct)}`;
  const collectionsLine = deltas
    ? `collections ${pct(kpis.collectionsPct)} (${deltas.collectionsDirection} MoM)`
    : `collections ${pct(kpis.collectionsPct)}`;

  const narrativeInputs =
    `${noiLine}, ${occupancyLine}, ${collectionsLine}. ` +
    `Economic occupancy ${pct(kpis.economicOccupancyPct)}; expense ratio ${pct(kpis.expenseRatio)} ` +
    `of collections. All figures and directional movement are pre-computed — narrate, do not recompute.`;

  return { kpis, priorKpis, deltas, narrativeInputs };
}
