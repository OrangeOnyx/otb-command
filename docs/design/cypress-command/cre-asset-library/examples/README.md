# Examples only

`*.synthetic.json` are mutually linked schema fixtures. Every synthetic name, hash, geometry path, origin, review and approval is fabricated test data, clearly identified as such. No file paths in these synthetic records point to actual source assets. Do not import them into an application, use them as CAD, or release them.

`property.on-the-boulevard.draft.json` is a starter metadata record containing only the user-provided property identity. It includes no measured dimensions, invented address, tenant, site geometry or property status. Map the slug to the repository's current property identity rather than creating a duplicate record.

`negative/` contains intentionally invalid records. `negative-tests.json` identifies their expected failures. Run `schemas/validate_examples.py` from any working directory to validate positive fixtures and confirm that negative fixtures are rejected. A green fixture test validates the package contracts, not OTB or a production integration.
