/* Status/category color system + plan color-mode fills (identical to baseline). */
import { pDate, monthsTo } from "./format.js";

export function lerp(a, b, t) { return a + (b - a) * t; }
export function mix(c1, c2, t) {
  const p = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const A = p(c1), B = p(c2);
  return "rgb(" + Math.round(lerp(A[0], B[0], t)) + "," + Math.round(lerp(A[1], B[1], t)) + "," + Math.round(lerp(A[2], B[2], t)) + ")";
}

export const STATUS_META = {
  active: { label: "Active", fill: "#2F6B4F", pill: "p-active" },
  anchor: { label: "Anchor", fill: "#1E4F3C", pill: "p-anchor" },
  expired: { label: "Holdover", fill: "#C25E33", pill: "p-expired" },
  vacant: { label: "Vacant", fill: "url(#hatch)", pill: "p-vacant" },
  owner: { label: "Owner", fill: "#5F6E64", pill: "p-owner" }
};
export const CAT_META = {
  retail: ["Retail", "#2F6B4F"], food: ["Food & Bev", "#C25E33"], services: ["Services", "#3A5570"],
  medical: ["Medical", "#2F6B6B"], financial: ["Financial", "#6B4E71"], office: ["Office", "#5F6E64"],
  vacant: ["Vacant", "url(#hatch)"]
};

export function unitFill(u, mode) {
  if (mode === "status") return STATUS_META[u.status].fill;
  if (mode === "use") return CAT_META[u.cat][1];
  if (u.status === "vacant") return "url(#hatch)";
  if (mode === "expiry") {
    if (!u.end) return "#5F6E64";
    const m = monthsTo(pDate(u.end));
    if (m <= 0) return "#C25E33";
    if (m <= 12) return mix("#C25E33", "#C99A33", Math.min(1, m / 12));
    return mix("#C99A33", "#2F6B4F", Math.min(1, (m - 12) / 48));
  }
  if (mode === "rent") {
    if (!u.total) return "#5F6E64";
    const t = (u.total - 15) / (20.5 - 15);
    return mix("#7E8C7C", "#A87E2F", Math.max(0, Math.min(1, t)));
  }
  return "#5F6E64";
}

export function legendFor(mode) {
  if (mode === "status") return [["Active", "#2F6B4F"], ["Anchor", "#1E4F3C"], ["Holdover", "#C25E33"], ["Vacant", "repeating-linear-gradient(45deg,#fff,#fff 3px,#c9cebe 3px,#c9cebe 5px)"], ["Owner", "#5F6E64"]];
  if (mode === "expiry") return [["Expired", "#C25E33"], ["< 12 mo", "#C99A33"], ["12–60 mo", "#7F9A5E"], ["5 yr +", "#2F6B4F"], ["No term", "#5F6E64"]];
  if (mode === "rent") return [["$15.50 PSF", "#7E8C7C"], ["$20.20 PSF", "#A87E2F"], ["No rent", "#5F6E64"]];
  return Object.values(CAT_META).filter(c => c[1].indexOf("url") < 0).map(c => [c[0], c[1]]);
}
