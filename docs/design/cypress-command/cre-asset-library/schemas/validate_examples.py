"""Validate contracts/fixtures offline; optionally validate real record collections.

Requires Python 3.10+ and jsonschema>=4.18,<5. No network lookups are performed.
Default: python schemas/validate_examples.py
Real records: python schemas/validate_examples.py --records path/to/records --repo-root .
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import sys

try:
    from jsonschema import Draft202012Validator, FormatChecker
    from referencing import Registry, Resource
except ImportError:
    raise SystemExit('Install jsonschema>=4.18,<5 into a temporary virtual environment; see schemas/README.md for commands.')

HERE = Path(__file__).resolve().parent
EXAMPLES = HERE.parent / 'examples'
SCHEMAS = {p.name: json.loads(p.read_text(encoding='utf-8')) for p in HERE.glob('*.schema.json')}
REGISTRY = Registry().with_resources((s['$id'], Resource.from_contents(s)) for s in SCHEMAS.values())
FORMAT = FormatChecker()


def schema_errors(record, schema_name=None):
    if not isinstance(record, dict):
        return ['Record must be a JSON object.']
    name = schema_name or str(record.get('record_type', 'UNKNOWN')) + '.schema.json'
    if name not in SCHEMAS:
        return ['No contract for record type: ' + name]
    validator = Draft202012Validator(SCHEMAS[name], registry=REGISTRY, format_checker=FORMAT)
    return [('/' + '/'.join(map(str, e.absolute_path)) + ': ' + e.message) for e in validator.iter_errors(record)]


def walk(value, path=''):
    if isinstance(value, dict):
        yield path, value
        for key, child in value.items():
            yield from walk(child, path + '/' + key)
    elif isinstance(value, list):
        for i, child in enumerate(value):
            yield from walk(child, path + '/' + str(i))


def cross_errors(record, records, repo_root=None):
    """Enforce links and authority facts that JSON Schema cannot enforce alone."""
    errors = []
    sources = {r['id']: r for r in records if r.get('record_type') == 'source'}
    keyed = {(r.get('record_type'), r.get('id')): r for r in records}
    record_type = record.get('record_type')
    links = {'property_id': 'property', 'site_id': 'site', 'building_id': 'building', 'sign_id': 'sign'}
    list_links = {'site_ids': 'site', 'building_ids': 'building', 'suite_ids': 'suite', 'sign_ids': 'sign', 'panel_ids': 'panel', 'asset_ids': 'asset'}

    def check_link(kind, target_id, label):
        target = keyed.get((kind, target_id))
        if target is None:
            errors.append(f'{label}: unresolved {kind} {target_id}')
        elif record_type != 'source':
            owner = record['id'] if record_type == 'property' else record.get('property_id')
            target_owner = target['id'] if kind == 'property' else target.get('property_id')
            if owner and target_owner and owner != target_owner:
                errors.append(f'{label}: relationship crosses property boundary {owner} -> {target_owner}')

    for field, kind in links.items():
        if field in record:
            check_link(kind, record[field], field)
    for field, kind in list_links.items():
        for target_id in record.get(field, []):
            check_link(kind, target_id, field)
    for link in record.get('subject_refs', []):
        check_link(link['record_type'], link['id'], 'subject_refs')

    for path, value in walk(record):
        # Snapshot references have source_id rather than id.
        if 'source_id' in value:
            source = sources.get(value['source_id'])
            if source is None:
                errors.append(f'{path}: missing source {value["source_id"]}')
            else:
                for field in ['revision', 'sha256']:
                    if value.get(field) != source.get(field):
                        errors.append(f'{path}: source snapshot {field} differs from registry')
        for field in ['evidence_source_ids', 'style_reference_source_ids']:
            for source_id in value.get(field, []):
                source = sources.get(source_id)
                if source is None:
                    errors.append(f'{path}/{field}: missing evidence source {source_id}')
                elif field == 'style_reference_source_ids' and 'appearance' not in source.get('authority_domains', []):
                    errors.append(f'{path}/{field}: style source lacks appearance authority')
                elif path.endswith('/calibration') and value.get('state') == 'verified' and source['verification']['state'] != 'verified':
                    errors.append(f'{path}/{field}: verified calibration relies on unverified evidence')
        # Dimensions never inherit authority from a generated picture or ops screenshot.
        if 'quantity' in value and 'source_refs' in value:
            for snapshot in value['source_refs']:
                source = sources.get(snapshot['source_id'])
                if source and 'dimensions' not in source.get('authority_domains', []):
                    errors.append(f'{path}: measurement source lacks dimensions authority')
                if source and value['verification']['state'] == 'verified' and source['verification']['state'] != 'verified':
                    errors.append(f'{path}: verified measurement relies on unverified source')
        # Optional file integrity pass: nothing fetched from external URIs.
        if repo_root is not None and 'sha256' in value and 'location' in value:
            location = value['location']
            if 'external_uri' in location:
                errors.append(f'{path}: external source needs an approved local snapshot/integrity resolver before release')
            else:
                candidate = (repo_root / location['repository_path']).resolve()
                try:
                    candidate.relative_to(repo_root)
                except ValueError:
                    errors.append(f'{path}: source location escapes repository')
                    continue
                if not candidate.is_file():
                    errors.append(f'{path}: file does not exist: {location["repository_path"]}')
                elif value.get('sha256') is None:
                    errors.append(f'{path}: source hash is unknown')
                else:
                    hasher = hashlib.sha256()
                    with candidate.open('rb') as stream:
                        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
                            hasher.update(chunk)
                    digest = hasher.hexdigest()
                    if digest != value['sha256']:
                        errors.append(f'{path}: actual file SHA-256 differs from registered snapshot')

    geometry = record.get('geometry')
    if geometry:
        frame = geometry['coordinate_reference']
        if frame.get('origin') and len(frame['origin']['coordinates']) != len(frame['axis_order']):
            errors.append('geometry: origin coordinate count differs from axis order')
        geometry_sources = [sources.get(s['source_id']) for s in geometry['source_refs']]
        if geometry['mode'] in ['measured', 'derived-from-measurement']:
            for source in geometry_sources:
                if source and 'geometry' not in source.get('authority_domains', []):
                    errors.append('geometry: source lacks geometry authority')
                if source and geometry['verification']['state'] == 'verified' and source['verification']['state'] != 'verified':
                    errors.append('geometry: verified geometry relies on unverified source')
            if not any(s and s.get('kind') == geometry['basis_kind'] for s in geometry_sources):
                errors.append('geometry: basis_kind does not match any registered source kind')
        geometry_derivation = geometry.get('derivation')
        if geometry_derivation:
            def snapshot_key(snapshot):
                return (snapshot['source_id'], snapshot['revision'], snapshot['sha256'])
            declared_inputs = {snapshot_key(s) for s in geometry_derivation['input_source_refs']}
            governing_inputs = {snapshot_key(s) for s in geometry['source_refs']}
            if declared_inputs != governing_inputs:
                errors.append('geometry/derivation: actual input snapshots must equal geometry source snapshots')
            for snapshot in geometry_derivation['input_source_refs']:
                source = sources.get(snapshot['source_id'])
                if source and 'geometry' not in source.get('authority_domains', []):
                    errors.append('geometry/derivation: input lacks geometry authority')
                if source and geometry['verification']['state'] == 'verified' and source['verification']['state'] != 'verified':
                    errors.append('geometry/derivation: verified geometry relies on unverified input')
        derivation = record.get('render_derivation', {})
        if 'geometry_id' in derivation and derivation['geometry_id'] != geometry['geometry_id']:
            errors.append('render_derivation: geometry_id differs from canonical geometry')
    return errors


def collection_errors(records, repo_root=None):
    errors = []
    seen = set()
    # Shape-check the entire collection before resolving any relationships.
    # A malformed source must produce a readable validation failure, not a crash.
    for index, rec in enumerate(records):
        schema_issues = schema_errors(rec)
        errors.extend(f'record[{index}]: {issue}' for issue in schema_issues)
        if not isinstance(rec, dict):
            continue
        identity = (rec.get('record_type'), rec.get('id'))
        if not all(isinstance(part, str) for part in identity):
            continue
        if identity in seen:
            errors.append(f'Duplicate record identity: {identity}')
        seen.add(identity)
    if errors:
        return errors
    for rec in records:
        identity = (rec['record_type'], rec['id'])
        errors.extend(f'{identity}: {issue}' for issue in cross_errors(rec, records, repo_root))
    return errors


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--records', type=Path, action='append', help='File or directory of domain/source JSON records; repeatable. Replaces fixture validation.')
    parser.add_argument('--repo-root', type=Path, help='Also verify referenced local file existence and SHA-256; never downloads external sources.')
    args = parser.parse_args()
    for schema in SCHEMAS.values():
        Draft202012Validator.check_schema(schema)
    if args.records:
        files = []
        for path in args.records:
            files.extend(sorted(path.rglob('*.json')) if path.is_dir() else [path])
        if not files:
            raise SystemExit('No record files found.')
        records = [json.loads(p.read_text(encoding='utf-8')) for p in files]
        errors = collection_errors(records, args.repo_root.resolve() if args.repo_root else None)
        if errors:
            print('\n'.join(errors))
            return 1
        print(f'PASS: {len(SCHEMAS)} schemas; {len(records)} records; cross-record checks' + ('; file integrity checks.' if args.repo_root else '. File integrity NOT checked.'))
        print('Record validation is not a factual survey review, visual QA, or permission to deploy.')
        return 0

    files = sorted(EXAMPLES.glob('*.synthetic.json')) + [EXAMPLES / 'property.on-the-boulevard.draft.json']
    records = [json.loads(p.read_text(encoding='utf-8')) for p in files]
    errors = collection_errors(records)
    if errors:
        print('\n'.join(errors))
        return 1
    tests = json.loads((EXAMPLES / 'negative-tests.json').read_text(encoding='utf-8'))
    for test in tests:
        record = json.loads((EXAMPLES / test['file']).read_text(encoding='utf-8'))
        if test['layer'] == 'schema':
            failures = schema_errors(record, test['schema'])
        else:
            shape_failures = schema_errors(record, test['schema'])
            if shape_failures:
                raise AssertionError(f'{test["file"]}: intended cross-record fixture also fails schema: {shape_failures}')
            replacements = [r for r in records if (r['record_type'], r['id']) != (record['record_type'], record['id'])] + [record]
            failures = cross_errors(record, replacements)
        if not failures:
            raise AssertionError(f'{test["file"]}: invalid fixture unexpectedly accepted')
    # Malformed collection inputs must fail cleanly before cross-record access.
    for malformed in [None, [], {'record_type': 'source'}, {'record_type': 'source', 'id': ['invalid-id']}]:
        if not collection_errors(records + [malformed]):
            raise AssertionError('Malformed collection unexpectedly accepted')
    print(f'PASS: {len(SCHEMAS)} schemas; {len(records)} positive fixtures; {len(tests)} negative fixtures rejected.')
    print('Synthetic fixtures only. Actual OTB source files, dimensions, and production integration are not validated.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
