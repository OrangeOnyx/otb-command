/* Current schedule coverage only. Unknown term dates are not zero remaining
   term, and a past recorded date does not establish legal holdover status. */
export function leaseTermCoverage(units, today = new Date()) {
  const leased = units.filter(unit => Number.isFinite(unit.monthly) && unit.monthly > 0);
  const annualRent = leased.reduce((total, unit) => total + unit.monthly * 12, 0);
  const unknownUnits = [];
  const buckets = new Map();
  let coveredRent = 0, weightedYears = 0;
  for (const unit of leased) {
    const annual = unit.monthly * 12;
    const end = unit.end ? new Date(unit.end + 'T00:00:00') : null;
    const known = end && Number.isFinite(end.getTime());
    let label;
    if (!known) {
      unknownUnits.push(String(unit.unit));
      label = 'Term unresolved';
    } else {
      coveredRent += annual;
      weightedYears += annual * Math.max(0, (end - today) / (1000 * 60 * 60 * 24 * 365.25));
      label = end < today ? 'Past recorded end' : String(end.getFullYear());
    }
    const bucket = buckets.get(label) || { label, n: 0, rent: 0 };
    bucket.n++;
    bucket.rent += annual;
    buckets.set(label, bucket);
  }
  const years = [...buckets.keys()].filter(label => /^\d{4}$/.test(label)).sort();
  const ordered = ['Past recorded end', ...years, 'Term unresolved'].filter(label => buckets.has(label));
  return {
    walt: annualRent && !unknownUnits.length ? weightedYears / annualRent : null,
    coveredRentShare: annualRent ? coveredRent / annualRent : null,
    unknownAnnualRent: annualRent - coveredRent,
    unknownUnits,
    buckets: ordered.map(label => buckets.get(label)),
  };
}
