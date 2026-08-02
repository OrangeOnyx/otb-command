-- Phase B merge-gate item (c), purges #4 + #6: audit-grade fact literals and
-- brand constants become per-property / per-org DATA. Views and generators
-- keep reading their bundled seams for OTB (identical values, single-property)
-- until onboarding wires per-property reads; property #2 gets its own rows.

-- purge #4: view-literal facts → properties.facts (sources: geometry.json
-- parking.variance/totalPlat · instruments.json · CLAUDE.md audit facts)
update properties set facts = '[
  {"key":"parking-variance","kind":"covenant","entry":"99-11797","provided":324,"required":344,"platDrawn":314,
   "note":"Floor space limited to available parking spaces. Cite 324 legally; plan ops on 314 (delta -10 unreconciled - docs/parking-reconciliation-memo.md)."},
  {"key":"jd-bank-easement","kind":"instrument","name":"JD Bank parking easement","expires":"2034-12-30","spaces":13,"monthlyToBelle":250,"supersedes":"2004-00057697"},
  {"key":"church-easement","kind":"instrument","name":"Our Savior''s Church easement","monthly":350,"termYears":25,
   "note":"Section 3a liquor waiver survives termination (restaurants OK within 175 ft; liquor line drawn on plat)."},
  {"key":"hvac-149","kind":"covenant","unit":"149","tenant":"Jason''s Deli","clause":"9.01","contractor":"Butcher Air Conditioning","requirement":"monthly PM contract must stay active"},
  {"key":"exclusive-129","kind":"exclusive","unit":"129","tenant":"HotWorx","signed":"Mar 2024","watch":"fitness"},
  {"key":"exclusive-135A","kind":"exclusive","unit":"135A","tenant":"C. Wolf","signed":"Nov 2024","watch":"barber"},
  {"key":"identity","kind":"identity","glaSf":62883,"units":27,"buildings":2,"acres":4.84,"zoning":"CH","greenAreaPct":20}
]'::jsonb
where slug = 'otb';

-- purge #6: brand constants → orgs.brand jsonb (source tools/otb_brand.py):
-- org kit plus the property''s tenant-facing kit until properties grow a
-- brand column
update orgs set brand = '{
  "org": {
    "name": "Orange Ocean, LLC",
    "palette": {"navy":"#1C2D4F","deepNavy":"#0D1E38","orange":"#E8820C","midBlue":"#4A6FA5","light":"#F0F4F8"},
    "contact": {"name":"Adam Anthony Abdalla, Founder & Operator","address":"101-149 Arnould Blvd., Lafayette, LA 70506","phone":"337-288-5411","email":"adam@orangeocean.com","web":"orangeocean.com"},
    "logos": {"light":"oo_logo_horizontal_light.png","dark":"oo_logo_horizontal_dark.png"}
  },
  "properties": {
    "otb": {
      "palette": {"navy":"#1C2D4F","offWhite":"#F5F5F5","white":"#FFFFFF"},
      "font": "Arial, Helvetica, sans-serif",
      "rule": "strict navy/white - no orange or gray in tenant-facing output",
      "contact": {"name":"Adam Anthony Abdalla, Property Manager","address":"101-149 Arnould Blvd, Lafayette, LA 70506","phone":"337-769-1554","email":"info@ontheblvd.com","web":"ontheblvd.com"},
      "attribution": "Managed by Orange Ocean, LLC on behalf of Belle Realty of Lafayette, LLC.",
      "logos": {"navy":"otb_logo.png","white":"otb_logo_white.png"}
    }
  }
}'::jsonb
where slug = 'orange-ocean';
