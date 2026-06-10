/* SVG element helpers + geometry.json primitive renderer. */
export const NS = "http://www.w3.org/2000/svg";

export function g(parent, cls) {
  const e = document.createElementNS(NS, "g");
  if (cls) e.setAttribute("class", cls);
  parent.appendChild(e);
  return e;
}
export function rect(p, x, y, w, h, a = {}) {
  const e = document.createElementNS(NS, "rect");
  e.setAttribute("x", x); e.setAttribute("y", y);
  e.setAttribute("width", w); e.setAttribute("height", h);
  for (const k in a) e.setAttribute(k, a[k]);
  p.appendChild(e);
  return e;
}
export function text(p, x, y, s, a = {}) {
  const e = document.createElementNS(NS, "text");
  e.setAttribute("x", x); e.setAttribute("y", y);
  for (const k in a) e.setAttribute(k, a[k]);
  e.textContent = s;
  p.appendChild(e);
  return e;
}
export function line(p, x1, y1, x2, y2, a = {}) {
  const e = document.createElementNS(NS, "line");
  e.setAttribute("x1", x1); e.setAttribute("y1", y1);
  e.setAttribute("x2", x2); e.setAttribute("y2", y2);
  for (const k in a) e.setAttribute(k, a[k]);
  p.appendChild(e);
  return e;
}
export function path(p, d, a = {}) {
  const e = document.createElementNS(NS, "path");
  e.setAttribute("d", d);
  for (const k in a) e.setAttribute(k, a[k]);
  p.appendChild(e);
  return e;
}

/* Render an array of geometry.json primitives into a group. */
export function renderPrims(parent, prims) {
  for (const pr of prims) {
    if (pr.t === "rect") rect(parent, pr.x, pr.y, pr.w, pr.h, pr.attrs);
    else if (pr.t === "line") line(parent, pr.x1, pr.y1, pr.x2, pr.y2, pr.attrs);
    else if (pr.t === "text") text(parent, pr.x, pr.y, pr.s, pr.attrs);
    else if (pr.t === "path") path(parent, pr.d, pr.attrs);
  }
}
