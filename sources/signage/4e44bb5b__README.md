# Tenants Directory

One subfolder per tenant, named `{UNIT}_{Tenant_Name}` (non-alphanumeric chars → `_`).

## Subfolder layout (per tenant)

| Folder | Contents |
|--------|----------|
| `logo_source/` | Original logo files supplied by tenant/brand owner |
| `prompts/`     | Generated layered prompts for each scene |
| `renders/`     | Raw AI-generated renders (timestamped, never overwritten) |
| `finals/`      | Approved, QC-passed renders ready for deliverables |
| `revisions/`   | Rejected renders + revision notes, kept for audit |

## Tenant count: **25**

- Logos on file: **19**
- Logos needed: **5**

See `logo_mapping.json` for the complete logo placement map.

## Editing rules

- **Do not** rename tenant folders by hand. Re-run `/home/ubuntu/build_otb.py`
  after editing `tenant_database.json`.
- **Do** keep `logo_source/` clean — only original brand assets.
