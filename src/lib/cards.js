/* [[type:token|label]] card-line protocol — shared registry + parser
   (2026-07-20 horizontal layer; extractPackages and extractBriefs were
   structurally identical per-type parsers chained by hand in the AI-1 view).

   A card line rides plain text (the concierge stream, cron-seeded thread
   messages) and is stripped out for rendering as a card. Each type owns ONE
   validate predicate — the token is the only routable payload, so validation
   is strict (the model/DB streams these lines; never trust them).

   Adding a type = registerCard("coi", validator) + a renderer in the view.
   Tested in test/cards.test.mjs. */

const REGISTRY = new Map();

export function registerCard(type, validate) {
  if (!/^[a-z][a-z0-9-]*$/.test(type)) throw new Error("card type must be kebab-case: " + type);
  REGISTRY.set(type, validate);
}
export const cardTypes = () => [...REGISTRY.keys()];

/* built-ins */
registerCard("package", t => /^https:\/\//i.test(t)); // Supabase signed URL — https only, never javascript:/data:
registerCard("brief", t => /^\d{4}-(0[1-9]|1[0-2])$/.test(t)); // strict YYYY-MM — nothing else rides the marker

const reFor = type => new RegExp("\\[\\[" + type + ":([^\\]|]+)\\|([^\\]]+)\\]\\]", "g");

/* Extract ONE type → { clean, cards:[{type,token,label}] }. Invalid tokens
   are stripped but NOT returned (a bad line must never render). */
export function extractCardsOf(text, type) {
  const validate = REGISTRY.get(type);
  if (!validate) throw new Error("unregistered card type: " + type);
  const cards = [];
  const clean = String(text || "").replace(reFor(type), (_, token, label) => {
    const t = token.trim();
    if (validate(t)) cards.push({ type, token: t, label: label.trim() });
    return "";
  }).trim();
  return { clean, cards };
}

/* Extract EVERY registered type in one pass — what views should call. */
export function extractCards(text) {
  let clean = String(text || "");
  const cards = [];
  for (const type of REGISTRY.keys()) {
    const r = extractCardsOf(clean, type);
    clean = r.clean;
    cards.push(...r.cards);
  }
  return { clean, cards };
}

/* Card-free text (voice, previews). */
export const stripCards = text => extractCards(text).clean;
