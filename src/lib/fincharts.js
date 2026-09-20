/* P-1 chart forms — pure SVG builders (2026-09-20, Asset Command review pick 6).
   AC's Financial Dashboard had three forms worth keeping: the revenue-
   composition donut (which matches the operator's Base · CAM · Tax · Ins PSF
   breakdown rule), the revenue → NOI waterfall, and a cap-rate sensitivity.
   AC printed an assumed-expense-ratio NOI as a headline; here every figure
   comes from the rent roll or the operator's own worksheet and every estimate
   is labeled. Colors are passed in (plan-room palette from the view). No DOM,
   no network — tested in test/fincharts.test.mjs. */

const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]));
const fmt$0 = n => "$" + Math.round(n).toLocaleString("en-US");
const short$ = n => {
  const a = Math.abs(n);
  const s = a >= 1e6 ? (a / 1e6).toFixed(2).replace(/\.?0+$/, "") + "M" : a >= 1e3 ? Math.round(a / 1e3) + "K" : String(Math.round(a));
  return (n < 0 ? "−$" : "$") + s;
};

/* ---- donut ---- slices [{label,value,color}] → arcs with share; zero/invalid slices drop */
export function donutModel(slices) {
  const ok = (slices || []).filter(s => Number.isFinite(s.value) && s.value > 0);
  const total = ok.reduce((t, s) => t + s.value, 0);
  let acc = 0;
  return {
    total,
    slices: ok.map(s => { const start = acc / total; acc += s.value; return { ...s, share: s.value / total, start, end: acc / total }; }),
  };
}

const polar = (cx, cy, r, f) => { const a = (f - 0.25) * 2 * Math.PI; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };

export function donutSVG(slices, { size = 150, thickness = 26, centerLabel = "", centerValue = "" } = {}) {
  const m = donutModel(slices);
  if (!m.total) return "";
  const cx = size / 2, cy = size / 2, r = size / 2 - 4, ri = r - thickness;
  let paths = "";
  for (const s of m.slices) {
    if (s.share >= 0.9999) {
      paths += '<circle cx="' + cx + '" cy="' + cy + '" r="' + ((r + ri) / 2) + '" fill="none" stroke="' + esc(s.color) + '" stroke-width="' + thickness + '"><title>' + esc(s.label) + ' 100%</title></circle>';
      continue;
    }
    const [x0, y0] = polar(cx, cy, r, s.start), [x1, y1] = polar(cx, cy, r, s.end);
    const [xi0, yi0] = polar(cx, cy, ri, s.end), [xi1, yi1] = polar(cx, cy, ri, s.start);
    const large = s.share > 0.5 ? 1 : 0;
    paths += '<path class="dn-slice" d="M' + x0.toFixed(2) + ' ' + y0.toFixed(2) + ' A' + r + ' ' + r + ' 0 ' + large + ' 1 ' + x1.toFixed(2) + ' ' + y1.toFixed(2) +
      ' L' + xi0.toFixed(2) + ' ' + yi0.toFixed(2) + ' A' + ri + ' ' + ri + ' 0 ' + large + ' 0 ' + xi1.toFixed(2) + ' ' + yi1.toFixed(2) + ' Z" fill="' + esc(s.color) + '">' +
      '<title>' + esc(s.label) + ' · ' + fmt$0(s.value) + ' · ' + Math.round(s.share * 100) + '%</title></path>';
  }
  return '<svg class="donut" viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size + '" role="img" aria-label="' + esc(centerLabel ? centerLabel + " " + centerValue : "composition") + '">' + paths +
    (centerValue ? '<text class="dn-val" x="' + cx + '" y="' + (cy + 2) + '" text-anchor="middle">' + esc(centerValue) + '</text>' : '') +
    (centerLabel ? '<text class="dn-lbl" x="' + cx + '" y="' + (cy + 16) + '" text-anchor="middle">' + esc(centerLabel) + '</text>' : '') + '</svg>';
}

/* ---- waterfall ---- steps: [{label, value, kind:'total'|'delta', color, note}]
   Running total starts at 0; a 'total' step pins the bar to its value (from 0),
   a 'delta' step floats from the running total. Returns the geometry + the
   running totals so the view (and the test) can read them. */
export function waterfallModel(steps) {
  let run = 0;
  const bars = [];
  for (const s of steps || []) {
    if (!Number.isFinite(s.value)) continue;
    if (s.kind === "total") { bars.push({ ...s, y0: 0, y1: s.value, run: s.value }); run = s.value; }
    else { const y0 = run, y1 = run + s.value; bars.push({ ...s, y0, y1, run: y1 }); run = y1; }
  }
  const lo = Math.min(0, ...bars.map(b => Math.min(b.y0, b.y1)));
  const hi = Math.max(0, ...bars.map(b => Math.max(b.y0, b.y1)));
  return { bars, lo, hi, end: run };
}

export function waterfallSVG(steps, { width = 520, height = 200 } = {}) {
  const m = waterfallModel(steps);
  if (!m.bars.length || m.hi === m.lo) return "";
  const padL = 56, padR = 10, padT = 26, padB = 34;
  const plotW = width - padL - padR, plotH = height - padT - padB;
  const y = v => padT + (m.hi - v) / (m.hi - m.lo) * plotH;
  const n = m.bars.length, slot = plotW / n, bw = Math.min(64, slot * 0.62);
  let out = '<svg class="wfall" viewBox="0 0 ' + width + ' ' + height + '" width="' + width + '" height="' + height + '" role="img" aria-label="Revenue to NOI waterfall">';
  // gridlines at 4 levels
  for (let i = 0; i <= 4; i++) {
    const v = m.lo + (m.hi - m.lo) * i / 4;
    out += '<line class="wf-grid" x1="' + padL + '" y1="' + y(v).toFixed(1) + '" x2="' + (width - padR) + '" y2="' + y(v).toFixed(1) + '"/>' +
      '<text class="wf-axis" x="' + (padL - 6) + '" y="' + (y(v) + 3).toFixed(1) + '" text-anchor="end">' + esc(short$(v)) + '</text>';
  }
  out += '<line class="wf-zero" x1="' + padL + '" y1="' + y(0).toFixed(1) + '" x2="' + (width - padR) + '" y2="' + y(0).toFixed(1) + '"/>';
  m.bars.forEach((b, i) => {
    const x = padL + slot * i + (slot - bw) / 2;
    const top = Math.min(y(b.y0), y(b.y1)), h = Math.max(1.5, Math.abs(y(b.y1) - y(b.y0)));
    out += '<g class="wf-bar wf-' + b.kind + '"><rect x="' + x.toFixed(1) + '" y="' + top.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="2" fill="' + esc(b.color) + '"><title>' + esc(b.label) + ' · ' + fmt$0(b.value) + (b.note ? ' · ' + b.note : '') + '</title></rect>' +
      '<text class="wf-val" x="' + (x + bw / 2).toFixed(1) + '" y="' + (top - 5).toFixed(1) + '" text-anchor="middle">' + esc(short$(b.kind === "total" ? b.value : b.value)) + '</text>' +
      '<text class="wf-lbl" x="' + (x + bw / 2).toFixed(1) + '" y="' + (height - padB + 14) + '" text-anchor="middle">' + esc(b.label) + '</text>' +
      (b.note ? '<text class="wf-note" x="' + (x + bw / 2).toFixed(1) + '" y="' + (height - padB + 26) + '" text-anchor="middle">' + esc(b.note) + '</text>' : '') + '</g>';
    if (i < n - 1) {
      const nx = padL + slot * (i + 1) + (slot - bw) / 2;
      out += '<line class="wf-link" x1="' + (x + bw).toFixed(1) + '" y1="' + y(b.run).toFixed(1) + '" x2="' + nx.toFixed(1) + '" y2="' + y(b.run).toFixed(1) + '"/>';
    }
  });
  return out + '</svg>';
}

/* ---- cap-rate sensitivity ---- value = NOI / cap at the entered rate ±100bp
   in 25bp steps; `current` marks the operator's rate. A missing rate uses the
   reference placeholder and says so (reference:true) — never stored. */
export function capSensitivity(noi, capPct, { reference = null, steps = 4, stepBp = 25 } = {}) {
  const base = Number.isFinite(capPct) && capPct > 0 ? capPct : (Number.isFinite(reference) && reference > 0 ? reference : null);
  if (base == null || !Number.isFinite(noi)) return { rows: [], reference: false };
  const rows = [];
  for (let i = -steps; i <= steps; i++) {
    const cap = +(base + i * stepBp / 100).toFixed(2);
    if (cap <= 0) continue;
    rows.push({ cap, value: noi / (cap / 100), current: i === 0 });
  }
  return { rows, reference: !(Number.isFinite(capPct) && capPct > 0), base };
}

export const fmtMoney = fmt$0;
export const fmtShort = short$;
