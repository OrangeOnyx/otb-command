-- NOT YET APPLIED (written 2026-09-11, F-5 register row #23) — apply when the SQL door is open.
-- AC property_identifiers (25 label/value rows, archive
-- docs/harvest/ac-archive-2026-08-29/property_identifiers.json, MANIFEST md5
-- 4af6f163ddd3dc32358036889e3f8897) → properties.facts for the OTB row.
--
-- Shape: properties.facts is a jsonb ARRAY (phase_b_foundation default '[]';
-- purge #4 entries are {key, kind, ...}). Each identifier lands as
--   {key:"identifier:<group>:<label>", kind:"identifier", group, label, value,
--    sortOrder, asOf, source:"ac:property_identifiers:<id>"}
-- Values are VERBATIM from the archive — 12 of 25 are null (the gap IS the
-- record: an unknown account number stays unknown, not invented). Known
-- anomalies are surfaced, not fixed (docs/parity-reconciliation-2026-09-11.md
-- §23): "Owner Entity (Legal Name)" reads "On The Boulevard, LLC" vs the
-- audit record Belle Realty of Lafayette, LLC; "PM platform: DoorLoop" and
-- "Domain: orangeoceanassetcommand.com" are stale as of 2026-09 (asOf stamps
-- carry the AC updatedAt date). No credentials or tokens are present —
-- policy numbers and the broker contact line are business identifiers.
--
-- Idempotent: strips any prior kind='identifier' entries, then appends these
-- 25; other facts entries are untouched. Groups: Entity & Legal · Tax & Parcel · Loan · Insurance · Title · Utilities · Technology.
update properties
set facts = coalesce((
    select jsonb_agg(f order by ord)
    from jsonb_array_elements(case when jsonb_typeof(facts) = 'array' then facts else '[]'::jsonb end)
      with ordinality as t(f, ord)
    where f->>'kind' is distinct from 'identifier'
  ), '[]'::jsonb) || '[
  {
    "key": "identifier:entity-legal:owner-entity-legal-name",
    "kind": "identifier",
    "group": "Entity & Legal",
    "label": "Owner Entity (Legal Name)",
    "value": "On The Boulevard, LLC",
    "sortOrder": 0,
    "asOf": "2026-07-31",
    "source": "ac:property_identifiers:67196655-45ce-4912-b8af-63c204fb97bd"
  },
  {
    "key": "identifier:entity-legal:property-manager-contract",
    "kind": "identifier",
    "group": "Entity & Legal",
    "label": "Property Manager (contract)",
    "value": "Abdalla Enterprises, LLC (via Belle Realty)",
    "sortOrder": 1,
    "asOf": "2026-07-02",
    "source": "ac:property_identifiers:5541c39d-8717-4e7d-ab7a-54ace8b1f946"
  },
  {
    "key": "identifier:entity-legal:owner-ein",
    "kind": "identifier",
    "group": "Entity & Legal",
    "label": "Owner EIN",
    "value": null,
    "sortOrder": 2,
    "asOf": "2026-07-02",
    "source": "ac:property_identifiers:12509159-4c40-40f1-83d9-2a3f55dac44e"
  },
  {
    "key": "identifier:entity-legal:la-sos-charter-registered-agent",
    "kind": "identifier",
    "group": "Entity & Legal",
    "label": "LA SOS Charter / Registered Agent",
    "value": null,
    "sortOrder": 3,
    "asOf": "2026-07-02",
    "source": "ac:property_identifiers:69b06425-3c14-45d6-9b1b-7c3e23d18e1c"
  },
  {
    "key": "identifier:entity-legal:boi-fincen-filing-status",
    "kind": "identifier",
    "group": "Entity & Legal",
    "label": "BOI (FinCEN) filing status",
    "value": null,
    "sortOrder": 4,
    "asOf": "2026-07-02",
    "source": "ac:property_identifiers:9b2cc893-6cad-495d-a68b-1053c097fb8c"
  },
  {
    "key": "identifier:tax-parcel:tax-parcel-id-s",
    "kind": "identifier",
    "group": "Tax & Parcel",
    "label": "Tax Parcel ID(s)",
    "value": null,
    "sortOrder": 5,
    "asOf": "2026-07-02",
    "source": "ac:property_identifiers:4a4494ff-c5a9-4526-a67c-b84503a52076"
  },
  {
    "key": "identifier:tax-parcel:lafayette-parish-assessor-account",
    "kind": "identifier",
    "group": "Tax & Parcel",
    "label": "Lafayette Parish Assessor account",
    "value": null,
    "sortOrder": 6,
    "asOf": "2026-07-02",
    "source": "ac:property_identifiers:3934413d-e19f-4149-9441-d2e1218adc37"
  },
  {
    "key": "identifier:tax-parcel:lat-5-personal-property-acct",
    "kind": "identifier",
    "group": "Tax & Parcel",
    "label": "LAT-5 personal property acct",
    "value": null,
    "sortOrder": 7,
    "asOf": "2026-07-02",
    "source": "ac:property_identifiers:63b37e2d-cf6f-482f-8d55-e03a93b035d7"
  },
  {
    "key": "identifier:loan:lender",
    "kind": "identifier",
    "group": "Loan",
    "label": "Lender",
    "value": "Investar Bank",
    "sortOrder": 8,
    "asOf": "2026-07-02",
    "source": "ac:property_identifiers:40f5c76b-dcfc-49ae-9c58-52bb26356b61"
  },
  {
    "key": "identifier:loan:loan-amount-balance",
    "kind": "identifier",
    "group": "Loan",
    "label": "Loan amount / balance",
    "value": "$1,500,000 (orig.)",
    "sortOrder": 9,
    "asOf": "2026-07-02",
    "source": "ac:property_identifiers:9c6b730e-02cc-4780-8e63-09fe7db235c5"
  },
  {
    "key": "identifier:loan:maturity-date",
    "kind": "identifier",
    "group": "Loan",
    "label": "Maturity date",
    "value": "2030-04-30",
    "sortOrder": 10,
    "asOf": "2026-07-02",
    "source": "ac:property_identifiers:d48dfc7c-273a-45bb-a185-ced85dc0f07c"
  },
  {
    "key": "identifier:loan:loan-account-number",
    "kind": "identifier",
    "group": "Loan",
    "label": "Loan / account number",
    "value": null,
    "sortOrder": 11,
    "asOf": "2026-07-02",
    "source": "ac:property_identifiers:b2574962-7e29-47d2-8c11-20d7966cf697"
  },
  {
    "key": "identifier:insurance:carrier-current",
    "kind": "identifier",
    "group": "Insurance",
    "label": "Carrier (current)",
    "value": "The Hartford (GL/Umbrella) + Lloyd''s of London (Property) + LWCC (WC)",
    "sortOrder": 12,
    "asOf": "2026-07-02",
    "source": "ac:property_identifiers:7d454f18-246b-49ee-84ce-1fe96cf20d39"
  },
  {
    "key": "identifier:insurance:policy-number-s",
    "kind": "identifier",
    "group": "Insurance",
    "label": "Policy number(s)",
    "value": "Hartford 43SBMAL3XX2 (GL/Umbrella); Lloyd''s property # to obtain; LWCC # to obtain",
    "sortOrder": 13,
    "asOf": "2026-07-02",
    "source": "ac:property_identifiers:374ae497-bb8e-4018-8780-ae65211ecf9d"
  },
  {
    "key": "identifier:insurance:agent-broker-tsl",
    "kind": "identifier",
    "group": "Insurance",
    "label": "Agent / broker (TSL)",
    "value": "TSL Insurance Group — Ryan Thomson (337) 889-0717, rthomson@tslins.com; AM Angela Viator (337) 889-0734",
    "sortOrder": 14,
    "asOf": "2026-07-02",
    "source": "ac:property_identifiers:90896d41-8944-4cc2-8f8b-bf27ce91f5a6"
  },
  {
    "key": "identifier:insurance:flood-policy-nfip-private",
    "kind": "identifier",
    "group": "Insurance",
    "label": "Flood policy (NFIP/private)",
    "value": "NONE in program — flood excluded on property policy; NFIP/private decision needed",
    "sortOrder": 15,
    "asOf": "2026-07-02",
    "source": "ac:property_identifiers:cea24f4f-6e53-41fb-8cb2-9271699575b7"
  },
  {
    "key": "identifier:title:title-company-2007-policy",
    "kind": "identifier",
    "group": "Title",
    "label": "Title company (2007 policy)",
    "value": "Fidelity National Title",
    "sortOrder": 16,
    "asOf": "2026-07-02",
    "source": "ac:property_identifiers:dc12687e-427f-4531-8664-b674241ac14a"
  },
  {
    "key": "identifier:title:owner-policy-status",
    "kind": "identifier",
    "group": "Title",
    "label": "Owner policy status",
    "value": "MISSING — order needed",
    "sortOrder": 17,
    "asOf": "2026-07-02",
    "source": "ac:property_identifiers:188e0c31-7cf6-47eb-8fc6-1d74c53b51fd"
  },
  {
    "key": "identifier:utilities:lus-account-water-sewer-electric",
    "kind": "identifier",
    "group": "Utilities",
    "label": "LUS account (water/sewer/electric)",
    "value": null,
    "sortOrder": 18,
    "asOf": "2026-07-02",
    "source": "ac:property_identifiers:7a853666-935f-436a-9560-0a5a381d96c8"
  },
  {
    "key": "identifier:utilities:slemco-account-if-any",
    "kind": "identifier",
    "group": "Utilities",
    "label": "SLEMCO account (if any)",
    "value": null,
    "sortOrder": 19,
    "asOf": "2026-07-02",
    "source": "ac:property_identifiers:4bef1bfc-3f65-4083-a2ff-f94c11141e76"
  },
  {
    "key": "identifier:utilities:atmos-gas-account",
    "kind": "identifier",
    "group": "Utilities",
    "label": "Atmos / gas account",
    "value": null,
    "sortOrder": 20,
    "asOf": "2026-07-02",
    "source": "ac:property_identifiers:d8307147-33fe-4d47-b574-b07bcb789e95"
  },
  {
    "key": "identifier:technology:pm-platform",
    "kind": "identifier",
    "group": "Technology",
    "label": "PM platform",
    "value": "DoorLoop",
    "sortOrder": 21,
    "asOf": "2026-07-02",
    "source": "ac:property_identifiers:3bc7e3cc-ebf7-47e2-b03f-8135f08ab658"
  },
  {
    "key": "identifier:technology:doorloop-property-id",
    "kind": "identifier",
    "group": "Technology",
    "label": "DoorLoop property ID",
    "value": null,
    "sortOrder": 22,
    "asOf": "2026-07-02",
    "source": "ac:property_identifiers:9eb4eabe-6318-4d2a-ba44-9475a1fe3a65"
  },
  {
    "key": "identifier:technology:domain",
    "kind": "identifier",
    "group": "Technology",
    "label": "Domain",
    "value": "orangeoceanassetcommand.com",
    "sortOrder": 23,
    "asOf": "2026-07-31",
    "source": "ac:property_identifiers:cb78cfe5-f541-40b5-bd54-01e3867f72b3"
  },
  {
    "key": "identifier:technology:google-business-profile",
    "kind": "identifier",
    "group": "Technology",
    "label": "Google Business Profile",
    "value": null,
    "sortOrder": 24,
    "asOf": "2026-07-02",
    "source": "ac:property_identifiers:3cb30162-0d16-40d5-ad7e-8bae0e4e1410"
  }
]'::jsonb
where slug = 'otb';

-- verify (expect 25):
-- select count(*) from properties, jsonb_array_elements(facts) f
--   where slug = 'otb' and f->>'kind' = 'identifier';
