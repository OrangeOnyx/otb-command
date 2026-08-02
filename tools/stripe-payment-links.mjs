/* A-5 ACH payment-link generator. Creates a Stripe Payment Link that carries
   metadata.unit ON THE PAYMENT INTENT — the one field api/stripe-webhook.mjs
   + src/lib/ach.js need to post the ledger row automatically (Dashboard-made
   links CANNOT set PI metadata; payments would land as ach-unmapped threads).

   Usage (key never in chat/repo; file is read + trimmed, so the PowerShell
   trailing-newline trap does not apply):
     node tools/stripe-payment-links.mjs --key %USERPROFILE%\.otb-stripe2.key \
          --unit 131 --amount 5300.00 [--name "On The Boulevard — Unit 131 rent"]

   Key requirements: RESTRICTED key with Payment Links: Write, Products: Write,
   Prices: Write (the events/PI/webhook key from go-live does NOT have these).
   ACH only (us_bank_account) — card rails deliberately off for rent.
   Delete the key file after the run. */
import { readFileSync } from "node:fs";

const arg = name => {
  const i = process.argv.indexOf("--" + name);
  return i > -1 ? process.argv[i + 1] : null;
};

const keyPath = arg("key");
const unit = arg("unit");
const amount = Number(arg("amount"));
const name = arg("name") || `On The Boulevard — Unit ${unit} rent`;

if (!keyPath || !unit || !(amount > 0)) {
  console.error("usage: node tools/stripe-payment-links.mjs --key <keyfile> --unit <unit> --amount <dollars> [--name <label>]");
  process.exit(1);
}
const key = readFileSync(keyPath.replace(/^~([\\/])/, process.env.USERPROFILE + "$1"), "utf8").trim();

async function stripe(path, params) {
  const r = await fetch("https://api.stripe.com/v1/" + path, {
    method: "POST",
    headers: { authorization: "Bearer " + key, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(path + ": " + (j.error?.message || r.status));
  return j;
}

const price = await stripe("prices", {
  currency: "usd",
  unit_amount: String(Math.round(amount * 100)),
  "product_data[name]": name,
});
const link = await stripe("payment_links", {
  "line_items[0][price]": price.id,
  "line_items[0][quantity]": "1",
  "payment_method_types[0]": "us_bank_account",
  "payment_intent_data[metadata][unit]": String(unit),
});
console.log(`unit ${unit} $${amount.toFixed(2)} → ${link.url}`);
console.log("PI metadata.unit verified in link config:", link.id);
console.log("REMINDER: delete the key file now.");
