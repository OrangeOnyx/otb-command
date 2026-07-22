/* C3 occupancy seam — pure shaping of occupancy_samples rows (Supabase,
   append-only; uploaded from the capture machine by tools/c3-upload.mjs)
   into the A-1 stall overlay and the D-1 KPI card. Stall identity comes
   from src/data/stall-map.json (camera-local id → rank + index; row56 =
   the 56-space storefront row, index 1 at the Johnston/101 end).
   Tested in test/occupancy.test.mjs. */

/* Latest sample per stall id. Rows in any order; ties broken by ts. */
export function latestByStall(rows) {
  const out = new Map();
  for (const r of rows || []) {
    if (!r || !r.stall || !r.ts) continue;
    const prev = out.get(r.stall);
    if (!prev || r.ts > prev.ts) out.set(r.stall, r);
  }
  return out;
}

/* Join latest states onto the stall map → per-rank tallies.
   states counts only occupied/empty ("known"); unclear is surfaced apart
   so a dark camera never inflates either side. */
export function occSummary(latest, stallMap) {
  const ranks = {};
  let asOf = "";
  for (const [id, m] of Object.entries(stallMap.stalls || {})) {
    const rank = ranks[m.rank] || (ranks[m.rank] = { covered: 0, occupied: 0, empty: 0, unclear: 0, stale: 0 });
    rank.covered++;
    const s = latest.get(id);
    if (!s) { rank.stale++; continue; }
    if (s.ts > asOf) asOf = s.ts;
    if (s.state === "occupied") rank.occupied++;
    else if (s.state === "empty") rank.empty++;
    else rank.unclear++;
  }
  return { ranks, asOf };
}

/* row56 overlay geometry: plan-px rect for stall index i (1-based) from the
   map's rowMeta (tick x origin + pitch; y band of the head-on row). */
export function rowStallRect(rowMeta, index, inset = 1.5) {
  if (!rowMeta || index < 1 || index > rowMeta.count) return null;
  const x = rowMeta.tickX0 + (index - 1) * rowMeta.pitch;
  return {
    x: x + inset,
    y: rowMeta.y - 26,
    w: rowMeta.pitch - 2 * inset,
    h: 52,
  };
}

/* Overlay paint states for every row56 stall the cameras cover. */
export function rowOverlay(latest, stallMap) {
  const out = [];
  for (const [id, m] of Object.entries(stallMap.stalls || {})) {
    if (m.rank !== "row56") continue;
    const s = latest.get(id);
    out.push({
      id,
      index: m.index,
      state: s ? s.state : "stale",
      rect: rowStallRect(stallMap.rowMeta, m.index),
    });
  }
  return out.sort((a, b) => a.index - b.index);
}

/* One-line note for the D-1 card. Total known-occupied over known, per rank
   label; unclear/stale folded into a trailing qualifier when present. */
export function occLine(summary, labels = { row56: "storefront row", lot8: "Lot 8", "field-149": "149 corner" }) {
  const parts = [];
  let unclear = 0, stale = 0;
  for (const [rank, r] of Object.entries(summary.ranks)) {
    unclear += r.unclear; stale += r.stale;
    const label = labels[rank];
    if (!label) continue; // minor ranks (aisle/north-edge) stay out of the note
    parts.push(label + " " + r.occupied + "/" + (r.occupied + r.empty));
  }
  const quals = [];
  if (unclear) quals.push(unclear + " unclear");
  if (stale) quals.push(stale + " no data");
  return parts.join(" · ") + (quals.length ? " · " + quals.join(", ") : "");
}
