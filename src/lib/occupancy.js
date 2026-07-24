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

/* Plan-px rect for a non-row56 stall — explicit per-index rects authored in
   stall-map.json zoneRects (lot8 pocket, field-149 rank; est-geometric like
   the indices until the operator stall walk). */
export function zoneStallRect(stallMap, rank, index, inset = 1.5) {
  const r = stallMap.zoneRects?.[rank]?.[index];
  if (!r) return null;
  return { x: r.x + inset, y: r.y + inset, w: r.w - 2 * inset, h: r.h - 2 * inset };
}

/* Overlay paint states for EVERY camera-covered stall that has plan geometry:
   row56 via rowMeta ticks, other ranks via zoneRects. Ranks without geometry
   (aisle-101, north-edge) simply don't paint — same contract as before. */
export function stallOverlay(latest, stallMap) {
  const out = [];
  for (const [id, m] of Object.entries(stallMap.stalls || {})) {
    const rect = m.rank === "row56"
      ? rowStallRect(stallMap.rowMeta, m.index)
      : zoneStallRect(stallMap, m.rank, m.index);
    if (!rect) continue;
    const s = latest.get(id);
    out.push({ id, rank: m.rank, index: m.index, state: s ? s.state : "stale", rect });
  }
  return out.sort((a, b) => a.rank === b.rank ? a.index - b.index : a.rank.localeCompare(b.rank));
}

/* Overlay paint states for every row56 stall the cameras cover.
   (Kept for compatibility; stallOverlay supersedes it on A-1.) */
export function rowOverlay(latest, stallMap) {
  return stallOverlay(latest, stallMap).filter(s => s.rank === "row56");
}

/* C3 heartbeat (carry-forward #3: the sampler died silently 3× before the
   watchdog; classify/upload can still fail quietly). The daily cron feeds
   get_occupancy_freshness output here; a stale pipeline yields ONE manager-
   thread candidate keyed by the last-sample day (idempotent per outage —
   a week-long outage nags once, not daily). null = healthy. */
export function c3StaleCandidate(freshness, nowISO, { hours = 36 } = {}) {
  const latestISO = freshness && freshness.latest_ts ? String(freshness.latest_ts) : null;
  const latest = latestISO ? Date.parse(latestISO) : NaN;
  const ageH = (Date.parse(nowISO) - latest) / 3600e3;
  if (!isNaN(latest) && ageH < hours) return null;
  const lastDay = !isNaN(latest) ? latestISO.slice(0, 10) : "never";
  return {
    agent: "manager",
    triggerSource: "c3-stale:" + lastDay,
    title: "C3 occupancy pipeline stale",
    detail: "No parking-occupancy samples since " +
      (lastDay === "never" ? "— none have ever landed" : lastDay +
        " (" + Math.floor(ageH) + "h ago)") + ". " +
      "The capture→classify→upload chain has broken somewhere. Check, in order: " +
      "1) the sampler on the capture machine (watchdog task OTB-C3-Sampler-Watchdog; " +
      "PID file in the capture dir), 2) the nightly classify+upload task " +
      "OTB-C3-Nightly (23:45 local; log in the capture dir), 3) Vercel env " +
      "secrets it pulls at runtime. A-1 🚗 and the D-1 card go blank while this is down.",
  };
}

/* Weekly rollup — sample-weighted daily utilization over the covered stalls
   (occupied / (occupied+empty) per UTC day; unclear never counts, matching
   occSummary). Pure over occupancy_samples rows → D-1 sparkline today and a
   ready-made owner-brief section when C3 coverage warrants it (A2 pattern:
   the brief stays deterministic — this fn IS the figure source). */
export function weeklyRollup(rows, nowMs, { days = 7 } = {}) {
  const byDay = new Map();
  for (const r of rows || []) {
    if (!r || !r.ts || (r.state !== "occupied" && r.state !== "empty")) continue;
    const day = String(r.ts).slice(0, 10);
    const d = byDay.get(day) || { occupied: 0, known: 0 };
    d.known++;
    if (r.state === "occupied") d.occupied++;
    byDay.set(day, d);
  }
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(nowMs - i * 86400e3).toISOString().slice(0, 10);
    const d = byDay.get(day);
    out.push({ day, occupied: d ? d.occupied : 0, known: d ? d.known : 0,
      pct: d && d.known ? Math.round(100 * d.occupied / d.known) : null });
  }
  return out;
}

/* Unicode sparkline + week average for the D-1 card note. Days without data
   render as a midline dot so gaps read as gaps, not as empty lots. */
export function rollupLine(rollup) {
  const BARS = "▁▂▃▄▅▆▇█";
  const spark = rollup.map(d =>
    d.pct === null ? "·" : BARS[Math.min(7, Math.floor(d.pct / 12.5))]).join("");
  const known = rollup.reduce((s, d) => s + d.known, 0);
  const occ = rollup.reduce((s, d) => s + d.occupied, 0);
  return known ? "7d " + spark + " avg " + Math.round(100 * occ / known) + "%" : "";
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
