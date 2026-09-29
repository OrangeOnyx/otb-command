# Data contracts

JSON Schema draft 2020-12; contract version `1.0.0`. These are portable metadata contracts, not a replacement database or a command to migrate existing operational records. Map existing canonical IDs into `existing_operations_refs` and use adapters at current repository seams. Keep tenant, lease, rent, availability, and operational status in their existing authoritative systems.

| Contract | Purpose |
| --- | --- |
| `common.schema.json` | Reused provenance, snapshot, geometry, units, coordinate reference, review and release rules |
| `source.schema.json` | One immutable source revision and its authority domains |
| `property.schema.json` | Reusable property identity and child references |
| `site.schema.json` | Site and property relationships |
| `building.schema.json` | Building and site relationships |
| `suite.schema.json` | Physical suite identity; operations remain referenced |
| `sign.schema.json` | Physical sign and its panels |
| `panel.schema.json` | Physical panel identity; tenant/display content stays in existing operations |
| `asset.schema.json` | Visual/geometry/UI artifact with canonical subject and source links |

Schema identifiers use `schemas.cypress-command.invalid` as an intentionally nonresolving namespace. All `$ref` dependencies are local package files. `validate_examples.py` registers them locally and never fetches schemas.

## Authority and verification

- CAD, surveys/plats, floor plans, verified property data, and calibrated digital-twin/LiDAR/scan data may supply geometry or dimensions. Register their actual revision and SHA-256. A source category alone does not prove accuracy: scope, date, calibration, review and conflicts must also be resolved.
- A photograph, generated image, or style reference cannot have geometry/dimensions authority. Generated images are styling only. Photogrammetric geometry must be registered as a derived calibrated scan with traceable measured inputs, not as a photograph.
- `geometry` points to a canonical measured file and its exact input snapshots; it never stores guessed dimensions. Derived geometry includes tool/version/method/input provenance. Styled renderings retain this geometry link and add render derivation metadata.
- A verified record needs reviewer, timestamp, review method, and evidence source IDs. A record cannot be verified while its geometry or measurements remain unverified. A verified scan-derived geometry also needs verified calibration, units, tolerance, and evidence.
- `release.state` starts as `candidate`. `approved` requires explicit approver/date/evidence and verified record metadata. Merely passing validation never grants approval or permission to deploy.
- Generated illustrations remain candidates with an explicit display label and cannot carry geometry or measurements. A human can use one as visual guidance without calling it a measured or released property representation.

## Units, frames and conflicts

`ft` means the international foot (0.3048 m); `ft-us-survey` means the US survey foot (1200/3937 m). Do not silently convert either. `sqft` and `sqft-us-survey` are the squares of those respective units. `feet`, bare `sf`, and unitless dimensions are invalid. Measurements record quantity, value, unit, measurement basis and source snapshots; do not conflate rentable, usable, gross, lease, or surveyed area.

Each geometry records length units and a coordinate reference. Local frames require a documented origin; projected/geographic frames require a datum. Keep axis order explicit. Record a reviewed transform before combining frames; preserve original coordinates and record vertical datum where elevation is used. Angular CRS units do not substitute for geometry length units. Never invent georeferencing for an unreferenced plan.

If authoritative measured sources conflict, mark the affected record `conflict`, preserve both source snapshots, log the discrepancy and withhold verified/released measurements until resolved. Do not average dimensions or let the newest decorative image win.

## Validate

Python 3.10+; only validator dependency: `jsonschema>=4.18,<5` (its transitive dependencies are installed by pip). No environment variables, API keys, runtime app dependencies, or network access are needed after installation.

Use a temporary virtual environment so the validation dependency does not alter the application or global Python installation. The commands below are run from the repository root; exclude the temporary `work/schema-validation-venv` directory from commits.

```powershell
python -m venv work/schema-validation-venv
& work/schema-validation-venv/Scripts/python.exe -m pip install "jsonschema>=4.18,<5"
& work/schema-validation-venv/Scripts/python.exe docs/design/cypress-command/cre-asset-library/schemas/validate_examples.py
```

For a collection containing only real library record JSON files, including all referenced sources and domain entities:

```powershell
& work/schema-validation-venv/Scripts/python.exe docs/design/cypress-command/cre-asset-library/schemas/validate_examples.py --records PATH/TO/LIBRARY-RECORDS --repo-root .
```

Use a dedicated record directory, not the entire repository or the `examples/` directory; all JSON files in the supplied record directories are treated as records. Repeat `--records` to include additional record files/directories. This is a metadata validator, not the repo-wide asset inventory scanner. Do not confuse their scope.

The included validator checks schema shape, relationship existence and property ownership, source snapshot hashes/revisions, evidence resolution, geometry/measurement authority against actual source records, verified source state and render/geometry links. For geometry derivation, `input_source_refs` must equal the full set in `geometry.source_refs` (source ID, revision and hash); every input must have geometry authority, and verified geometry requires verified inputs. Appearance-only inputs belong in render derivation, never geometry derivation. Ancestors must be registered and listed when directly used; do not silently omit a direct input from either set. `--repo-root` also checks repository-contained source/artifact files and SHA-256; an external URI requires a separate approved integrity resolver/local snapshot and is rejected by that pass. No external source is downloaded. Without `--repo-root`, file integrity has not been checked.

JSON Schema alone cannot prove that a referenced file exists, that its bytes match a hash, that CAD matches an as-built condition, that a reviewer is authorized, or that data is accurate. Release also requires repository-wide coverage, measured-source reconciliation, human approval where required, consumer/reference checks, and visual/interaction checks described in the integration instructions. The validator intentionally does not perform production writes.

## Examples and negative cases

All `*.synthetic.json` fixtures are explicitly synthetic, including fake checksums, origin, source paths, review dates and approvals. They are not real OTB assets and must never enter a production registry. `property.on-the-boulevard.draft.json` uses only the requested property name and slug; dimensions, addresses, tenants and geometry remain absent. Resolve its canonical ID against the existing repo before importing it.

`examples/negative-tests.json` lists invalid fixtures and their expected rejection layer. Tests cover generated-image authority, verified generated geometry, missing verification evidence, ambiguous feet, missing local origin, uncalibrated scans, unverified nested geometry, missing release approval, source hash mismatch, source-kind laundering, missing property links, generated derivation inputs, and unverified scan derivation inputs. The cross-record fixtures are deliberately schema-valid and must fail relationship/authority validation. The runner also confirms that malformed collection entries fail cleanly before any cross-record access.
