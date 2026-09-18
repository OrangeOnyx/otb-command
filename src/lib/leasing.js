/* Leasing-package v1.5 — pure seam. Matches the Google Places corridor
   snapshot (src/data/corridor.json, tools/gmaps-pull.mjs) against the rent
   roll so tenant ratings display under their SOT names, formats the
   drive-time strip, and composes the ready-to-send lead SMS (the app sends
   NOTHING — the operator copies the text into his own phone; v1 boundary).
   Consumed by tools/leasing-package.py (via JSON contract) and the AI-1
   leasing chip. No fact literals beyond phrasing. */

/* canonical hosted one-pager (public/leasing.html rides every deploy; the
   product domain serves it today — swap when the tenant-facing canonical
   domain decision lands, then regen the page + any printed QR) */
export const LEASING_URL = "https://orangeoceanatlas.com/leasing.html";

const STOP = new Set(["the", "of", "and", "a", "an", "llc", "inc", "co"]);

/* "The Tux Shoppe" → ["tux","shop"] — lowercase, strip punctuation,
   drop stopwords, fold shoppe→shop so listing-vs-SOT spelling matches */
export function normTokens(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(t => t && !STOP.has(t))
    .map(t => (t === "shoppe" ? "shop" : t));
}

/* Google listing names that share no tokens with the SOT dba — maintained
   by hand when a mismatch is confirmed on the ground (phrasing, not fact) */
export const GOOGLE_NAME_ALIASES = {
  "mary ellen's tux shop": "123", // Google name for The Tux Shoppe
};

/* Match corridor places to rent-roll units. A place matches a dba when one
   token set contains the other with ≥2 shared tokens (or full overlap for
   single-token names). Returns { tenants: [{unit, dba, rating, ratings}],
   neighbors: [places…] } — tenants under SOT names, best-rated first. */
export function matchTenants(places, units, aliases = GOOGLE_NAME_ALIASES) {
  const roster = units
    .filter(u => u.dba && u.status !== "vacant")
    .map(u => ({ unit: u.unit, dba: u.dba, toks: normTokens(u.dba) }));
  const tenants = [], neighbors = [], seen = new Set();
  for (const p of places || []) {
    const aliasUnit = aliases[String(p.name || "").toLowerCase()];
    let hit = aliasUnit != null ? roster.find(r => r.unit === aliasUnit) : null;
    if (!hit) {
      const pt = normTokens(p.name);
      hit = roster.find(r => {
        if (!r.toks.length || !pt.length) return false;
        const shared = r.toks.filter(t => pt.includes(t)).length;
        const need = Math.min(2, Math.min(r.toks.length, pt.length));
        return shared >= need && (shared === r.toks.length || shared === pt.length);
      });
    }
    if (hit && !seen.has(hit.unit)) {
      seen.add(hit.unit);
      tenants.push({ unit: hit.unit, dba: hit.dba, rating: p.rating, ratings: p.ratings });
    } else if (!hit) {
      neighbors.push(p);
    }
  }
  tenants.sort((a, b) => b.rating - a.rating || b.ratings - a.ratings);
  return { tenants, neighbors };
}

/* [{name,minutes}...] → "9 min to Downtown Lafayette · 7 min to UL…" */
export function driveLine(driveTimes) {
  return (driveTimes || [])
    .map(d => `${d.minutes} min to ${d.name}`)
    .join(" · ");
}

/* Ready-to-send lead SMS. vacants = [{unit, sf}] (rent roll), url = hosted
   one-pager. Plain text, no markup — lands in the operator's SMS app. */
export function smsText(vacants, url) {
  const suites = (vacants || [])
    .map(v => `Suite ${v.unit} (${Number(v.sf).toLocaleString("en-US")} SF)`)
    .join(" and ");
  return (
    `Thanks for your interest in On The Boulevard! Available now: ${suites}. ` +
    `Full leasing package: ${url} ` +
    `Call or text me to set up a tour — Adam, On The Boulevard, (337) 270-7044.`
  );
}

/* Leasing package e-mail (voice line, 2026-09-18 — closes the loop Asset
   Command never did: its agent promised a package and sent nothing). Pure:
   units = rent roll (public shape), url = hosted one-pager. Rates are never
   quoted (persona rule) — "upon request". Returns { subject, text, html }. */
export function leasingPackageEmail({ units, url = LEASING_URL, prospect = "", contactPhone = "(337) 270-7044" } = {}) {
  const roll = Array.isArray(units) ? units : [];
  const vacants = roll.filter(u => u.status === "vacant")
    .map(u => ({ unit: u.unit, sf: Number(u.sf) || 0, use: u.use || "" }));
  const anchor = roll.find(u => u.unit === "149");
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]));
  const hello = prospect ? `Hi ${prospect},` : "Hello,";
  const suiteLines = vacants.length
    ? vacants.map(v => `Suite ${v.unit} — ${v.sf.toLocaleString("en-US")} SF${v.use ? " · " + v.use : ""}`)
    : ["No suites are open today — we keep a short waitlist and will reach out first when one comes up."];
  const subject = "On The Boulevard — leasing package" + (vacants.length ? ` (${vacants.length} suite${vacants.length === 1 ? "" : "s"} available)` : "");
  const text = [
    hello, "",
    "Thanks for calling about space at On The Boulevard Shopping Center, 101–149 Arnould Blvd at Johnston Street, Lafayette" +
      (anchor && anchor.dba ? ` — anchored by ${anchor.dba}.` : "."),
    "", "Available now:", ...suiteLines.map(l => "  • " + l), "",
    "Asking rates are quoted per space on request. Full package (site plan, traffic, co-tenancy, drive times): " + url,
    "", "Adam shows every space personally — reply to this e-mail or call/text " + contactPhone + " to set a tour.",
    "", "— Adam Abdalla, Orange Ocean, LLC", "Property manager for Belle Realty of Lafayette, LLC",
  ].join("\n");
  const html = '<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:600px;color:#1C2B26;line-height:1.5">' +
    '<div style="font:600 11px ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase;color:#A87E2F;border-bottom:3px solid #2F6B4F;padding-bottom:8px;margin-bottom:14px">On The Boulevard · Leasing</div>' +
    '<p>' + esc(hello) + '</p>' +
    '<p>Thanks for calling about space at <b>On The Boulevard Shopping Center</b>, 101–149 Arnould Blvd at Johnston Street, Lafayette' +
      (anchor && anchor.dba ? ' — anchored by ' + esc(anchor.dba) + '.' : '.') + '</p>' +
    '<div style="font:600 11px ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase;color:#5F6E64">Available now</div>' +
    '<ul style="margin:4px 0 14px;padding-left:18px">' + suiteLines.map(l => '<li>' + esc(l) + '</li>').join("") + '</ul>' +
    '<p>Asking rates are quoted per space on request. <a href="' + esc(url) + '" style="color:#A87E2F;font-weight:600">Open the full leasing package →</a></p>' +
    '<p>Adam shows every space personally — reply to this e-mail or call/text <b>' + esc(contactPhone) + '</b> to set a tour.</p>' +
    '<p style="color:#5F6E64;font-size:12px;margin-top:18px">— Adam Abdalla, Orange Ocean, LLC<br>Property manager for Belle Realty of Lafayette, LLC</p></div>';
  return { subject, text, html, vacants };
}
