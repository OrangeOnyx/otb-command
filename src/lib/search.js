/* Global search (harvested from the v9 concept) — pure matcher over the app's
   entities. No DOM. Entries are {type, key, title, sub, haystack[]}; search()
   scores prefix > word-start > substring matches, field order = weight.
   Consumed by views/search.js (topbar box, "/" hotkey). */

export function normalize(s) { return String(s || "").toLowerCase().trim(); }

// score one entry against a query; 0 = no match
export function scoreEntry(entry, q) {
  let best = 0;
  entry.haystack.forEach((field, i) => {
    const f = normalize(field);
    if (!f) return;
    const weight = entry.haystack.length - i; // earlier fields weigh more
    let s = 0;
    if (f === q) s = 100;
    else if (f.startsWith(q)) s = 60;
    else if (f.split(/[^a-z0-9.]+/).some(w => w.startsWith(q))) s = 40;
    else if (f.includes(q)) s = 20;
    if (s) best = Math.max(best, s + weight);
  });
  return best;
}

export function search(entries, query, limit = 8) {
  const q = normalize(query);
  if (q.length < 1) return [];
  return entries
    .map(e => ({ e, s: scoreEntry(e, q) }))
    .filter(r => r.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map(r => r.e);
}
