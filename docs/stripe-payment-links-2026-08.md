# OTB Rent Payment Links — ACH only (created 2026-08-08)

A-5 runbook §1 complete: 24 links, one per occupied unit, amounts = TOTAL
monthly rent from the live August ledger ($90,291.23/mo across the roll).
Every link's PaymentIntent carries `metadata.unit`, so a payment posts
itself to the unit's ledger via the webhook (`ach:<pi_id>` row); unmapped
or failed payments open `ach-unmapped:` / `ach-fail:` manager threads.
ACH bank-debit only — no cards, no card fees. Key file deleted post-run.

**Distribution is the operator's channel (the app sends nothing).** Send
each tenant their unit's link; it's reusable monthly. Amount changes
(renewals, escalations) = re-run `tools/stripe-payment-links.mjs` for that
unit and retire the old link in the Stripe dashboard.

| Unit | Tenant | Monthly | Link |
|------|--------|---------|------|
| 101 | The Pink Paisley | $11,085.81 | https://buy.stripe.com/5kQ4gycig3IGaGF7xa6AM00 |
| 103 | The Pink Paisley | $4,923.09 | https://buy.stripe.com/7sY6oG1DCfrodSR5p26AM01 |
| 105 | Painted Bayou | $3,231.16 | https://buy.stripe.com/dRmbJ05TSbb86qp4kY6AM02 |
| 107 | Great American Cookies / Hershey's | $2,541.88 | https://buy.stripe.com/fZu00i964a74aGFeZC6AM03 |
| 109 | JC Kate Boutique | $3,808.39 | https://buy.stripe.com/3cI3cu0zy0wu7utcRu6AM04 |
| 111 | BERNINA Lafayette (Lola Pink) | $2,605.42 | https://buy.stripe.com/6oU5kCdmkbb89CB18M6AM05 |
| 113 | Graze Acadiana | $4,017.58 | https://buy.stripe.com/4gM7sK6XW0wuaGF7xa6AM06 |
| 115 | The Clothing Loft Exchange | $3,327.34 | https://buy.stripe.com/8x24gygyw1Ayg0Z9Fi6AM07 |
| 117 | The Clothing Loft Exchange | $3,327.34 | https://buy.stripe.com/dRm7sK6XW4MK2a9dVy6AM08 |
| 117.5 | Victoria Nails | $2,800.92 | https://buy.stripe.com/7sYcN4gywgvs6qp3gU6AM09 |
| 119 | OUPAC Financial | $2,890.42 | https://buy.stripe.com/3cI3cu1DCcfcdSRbNq6AM0a |
| 119.5 | Cat Clinic of Lafayette | $3,035.03 | https://buy.stripe.com/eVq8wO3LKa746qpaJm6AM0b |
| 121 | Magnolia Salon | $2,527.90 | https://buy.stripe.com/5kQ28qgyw1Ay6qpcRu6AM0c |
| 123 | The Tux Shoppe | $5,492.96 | https://buy.stripe.com/8x228q8207YWdSR04I6AM0d |
| 125 | Jordan Amanda by Shoetique | $2,674.79 | https://buy.stripe.com/9B6aEWcig930bKJ3gU6AM0e |
| 127 | Jordan Amanda by Shoetique | $3,912.75 | https://buy.stripe.com/8x27sKbec3IGcON5p26AM0f |
| 129 | HotWorx | $2,832.58 | https://buy.stripe.com/bJedR83LKcfc021cRu6AM0g |
| 135A | C. Wolf Barber Shop | $2,040.83 | https://buy.stripe.com/5kQ8wO4PO3IG2a9g3G6AM0h |
| 137 | Greek Expressions | $3,165.04 | https://buy.stripe.com/00w8wObec2EC1658Be6AM0i |
| 139 | Fast Pass Tag & Title | $2,955.38 | https://buy.stripe.com/cNieVc2HG2EC3ed9Fi6AM0j |
| 141 | Fast Pass Tag & Title | $2,955.38 | https://buy.stripe.com/14A00idmkenk6qp8Be6AM0k |
| 143 | 1st Franklin Financial | $3,187.01 | https://buy.stripe.com/cNi00ibeccfc9CB4kY6AM0l |
| 145 | Upstream Rehabilitation | $3,187.01 | https://buy.stripe.com/4gM4gybec9302a9dVy6AM0m |
| 149 | Jason's Deli | $7,765.22 | https://buy.stripe.com/5kQ6oG6XWfroeWVcRu6AM0n |

Vacant 131/133 and owner-occupied 135B have no links by design.

**Remaining smoke:** first real payment — send one link to yourself or a
willing tenant; the unit's ledger should gain the `ach:<pi_id>` row without
anyone touching the app.
