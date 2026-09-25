"""Register existing water-map annotations without creating physical assets.

Run from the repo: python tools/register-twin-water-map.py [--check]
Dependencies: numpy and Pillow. Inputs are committed source/reference files only.
The fit bridges eight image/building corners through the existing 37-column
A-1/native-model correspondence. It is not an independent survey registration.
"""
import argparse
import copy
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
INPUTS = {
    'image': 'src/assets/twin/infrastructure/water-shutoff-map.png',
    'annotations': 'src/data/twin-infrastructure.json',
    'fixtures': 'src/data/twin-site-fixtures.json',
    'nativeModel': 'public/twin/model-data.json',
}
MAX_EXTERIOR_DISTANCE_M = 5.0  # Sanity gate for this drawing, not an accuracy claim.
DISPLAY_MARGIN_M = 2.0
COUNT_MEANING = 'count at this location (confirmed by Adam 2026-09-25)'
COUNT_PROVENANCE = {
    'source': 'user-confirmation', 'confirmedBy': 'Adam', 'confirmedOn': '2026-09-25',
    'statement': 'The circle numbers are counts at each location.',
    'scope': 'Meaning of the printed numbers; not individual meter membership or a new field inventory',
}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def fit(points, targets):
    p = np.c_[np.asarray(points, float), np.ones(len(points))]
    q = np.asarray(targets, float)
    assert np.linalg.matrix_rank(p) == 3, 'Registration controls must span two dimensions'
    matrix = np.linalg.lstsq(p, q, rcond=None)[0]
    return matrix, np.linalg.norm(p @ matrix - q, axis=1)


def apply(matrix, point):
    return np.r_[point, 1.] @ matrix


def stats(errors):
    return {'rmsMeters': float(np.sqrt(np.mean(np.asarray(errors) ** 2))),
            'maxResidualMeters': float(max(errors))}


def outside_distance(point, bounds):
    offsets = np.maximum(np.maximum(np.asarray(bounds['min']) - point,
                                    point - np.asarray(bounds['max'])), 0)
    return float(np.linalg.norm(offsets))


def hull(points):
    pts = sorted(set(map(tuple, points)))
    def cross(a, b, c):
        return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
    lower, upper = [], []
    for p in pts:
        while len(lower) > 1 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    for p in reversed(pts):
        while len(upper) > 1 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    return lower[:-1] + upper[:-1]


def inside_hull(point, polygon):
    x, y = point
    return all((b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]) >= -1e-8
               for a, b in zip(polygon, polygon[1:] + polygon[:1]))


def rounded(value):
    if isinstance(value, np.ndarray):
        return rounded(value.tolist())
    if isinstance(value, (float, np.floating)):
        return round(float(value), 10)
    if isinstance(value, dict):
        return {k: rounded(v) for k, v in value.items()}
    if isinstance(value, (tuple, list)):
        return [rounded(v) for v in value]
    return value


def build():
    infrastructure = json.loads((ROOT / INPUTS['annotations']).read_text(encoding='utf8'))
    fixtures = json.loads((ROOT / INPUTS['fixtures']).read_text(encoding='utf8'))
    model = json.loads((ROOT / INPUTS['nativeModel']).read_text(encoding='utf8'))
    image_path = ROOT / INPUTS['image']
    assert Image.open(image_path).size == (2500, 1164)
    source_image = next(s for s in infrastructure['sources'] if s['kind'] == 'annotated-water-map')
    assert digest(image_path) == source_image['sha256'], 'Map image differs from the registered source inventory'
    assert fixtures['modelSourceSha256'] == model['source']['sha256'], 'Fixture/native source versions differ'

    # Use current GLB column centers, not a copied transform or rounded historical center list.
    columns = {c['id']: c for c in model['columns']}
    bridge_controls = fixtures['registration']['planToNative']['controls']
    assert len(bridge_controls) == 37 and {c['modelColumnId'] for c in bridge_controls} == set(columns)
    plan_points = [c['sourcePlanPx'] for c in bridge_controls]
    model_points = [[columns[c['modelColumnId']]['position'][i] for i in (0, 2)] for c in bridge_controls]
    plan_matrix, bridge_errors = fit(plan_points, model_points)
    assert max(bridge_errors) < 1.5, 'The existing candidate column correspondence has drifted'
    bridge = [{**copy.deepcopy(c), 'nativeModelXZ': target, 'residualMeters': error}
              for c, target, error in zip(bridge_controls, model_points, bridge_errors)]

    corners = fixtures['registration']['utilityImageToPlan']['controls']
    assert len(corners) == 8
    image_points = [c['sourceImagePx'] for c in corners]
    plan_targets = [c['targetPlanPx'] for c in corners]
    image_plan_matrix, image_plan_errors = fit(image_points, plan_targets)
    native_targets = [apply(plan_matrix, p) for p in plan_targets]
    matrix, errors = fit(image_points, native_targets)
    assert max(errors) < 1.0, 'Building-corner registration has drifted'
    controls = [{'id': c['id'], 'sourceImagePx': c['sourceImagePx'], 'sourcePlanPx': c['targetPlanPx'],
                 'targetModelXZ': target, 'residualMeters': error,
                 'targetBasis': 'A-1 building corner transformed by the 37-column candidate bridge; not directly surveyed'}
                for c, target, error in zip(corners, native_targets, errors)]
    loo_errors = []
    for i in range(len(corners)):
        keep = np.arange(len(corners)) != i
        held, _ = fit(np.asarray(image_points)[keep], np.asarray(native_targets)[keep])
        loo_errors.append(float(np.linalg.norm(apply(held, image_points[i]) - native_targets[i])))
    polygon = hull(image_points)

    originals = infrastructure['mapAnnotations']
    assert len(originals) == 19 and len({a['id'] for a in originals}) == 19
    assert sum(a['category'] == 'city-meter' for a in originals) == 6
    assert sum(a['category'] == 'tenant-shutoff' for a in originals) == 13
    annotations = []
    for source in originals:
        assert source['physicalAssetCount'] is None and source['memberMeterIds'] == [] and source['servedUnits'] == []
        assert source['imagePoint']['width'] == 2500 and source['imagePoint']['height'] == 1164
        p = [source['imagePoint']['x'], source['imagePoint']['y']]
        assert 0 <= p[0] < 2500 and 0 <= p[1] < 1164
        xz = apply(matrix, p)
        position = np.array([xz[0], 0., xz[1]])
        outside = outside_distance(position, model['boundsMeters'])
        assert outside < MAX_EXTERIOR_DISTANCE_M, (source['id'], outside)
        sequence = source['id'].rsplit(':', 1)[1]
        kind_label = 'City meter' if source['category'] == 'city-meter' else 'Tenant shutoff'
        assert str(source['markerLabelRaw']).isdigit(), 'Confirmed count must have a numeric source label'
        reported_count = int(source['markerLabelRaw'])
        assert reported_count > 0
        annotations.append({**copy.deepcopy(source),
            'label': f'{kind_label} map marker {sequence}',
            'sourceMarkerLabelMeaning': source['markerLabelMeaning'],
            'markerLabelMeaning': COUNT_MEANING, 'reportedCount': reported_count,
            'countBasis': 'Printed source-map count; meaning confirmed by Adam on 2026-09-25',
            'countProvenance': copy.deepcopy(COUNT_PROVENANCE),
            'referenceType': 'source-map-annotation', 'physicalAssetId': None, 'seedPolicy': 'reference_only',
            'sourceRegistrationStatus': source['registration'],
            'registration': 'Approximate source-image registration to native GLB; field verification pending',
            'modelPositionMeters': position, 'positionStatus': 'approximate_source_registered',
            'physicalVerification': 'not-field-verified',
            'elevationStatus': 'Y=0 is a display reference; marker elevation/depth is unknown',
            'validation': {'outsideNativeModelBounds': outside > 1e-8, 'outsideNativeModelDistanceMeters': outside,
                           'extrapolatedBeyondBuildingControlHull': not inside_hull(p, polygon)},
        })
    positions = np.asarray([a['modelPositionMeters'] for a in annotations])
    annotation_bounds = {'min': positions.min(axis=0), 'max': positions.max(axis=0)}
    display_min = np.minimum(model['boundsMeters']['min'], positions.min(axis=0))
    display_max = np.maximum(model['boundsMeters']['max'], positions.max(axis=0))
    display_min[[0, 2]] -= DISPLAY_MARGIN_M
    display_max[[0, 2]] += DISPLAY_MARGIN_M
    validation_min = np.asarray(model['boundsMeters']['min']) - [MAX_EXTERIOR_DISTANCE_M, 0, MAX_EXTERIOR_DISTANCE_M]
    validation_max = np.asarray(model['boundsMeters']['max']) + [MAX_EXTERIOR_DISTANCE_M, 0, MAX_EXTERIOR_DISTANCE_M]
    city_total = sum(a['reportedCount'] for a in annotations if a['category'] == 'city-meter')
    shutoff_total = sum(a['reportedCount'] for a in annotations if a['category'] == 'tenant-shutoff')
    workbook_water_ids = {item['metadata']['meterIdRaw'] for item in infrastructure['items']
                          if item['metadata'].get('utility') == 'water'}
    assert (city_total, shutoff_total, len(workbook_water_ids)) == (24, 37, 28)
    result = {
        'schemaVersion': 1, 'title': 'OTB water-map annotations registered to the source model',
        'status': 'Approximate drawing references; not field-verified assets',
        'counts': {'annotations': 19, 'cityMeterAnnotations': 6, 'tenantShutoffAnnotations': 13,
                   'reportedCityMeters': city_total, 'reportedTenantShutoffs': shutoff_total, 'physicalAssets': None},
        'countInterpretation': {'meaning': COUNT_MEANING, **copy.deepcopy(COUNT_PROVENANCE)},
        'countReconciliation': {'mapReportedCityMeters': city_total, 'workbookWaterMeterIds': len(workbook_water_ids),
                                'workbookMinusMap': len(workbook_water_ids) - city_total, 'status': 'unresolved',
                                'note': 'The map reports 24 city meters while the workbook contains 28 water-meter IDs. Dates, coverage and individual membership are not reconciled; this does not establish four missing meters.'},
        'sources': [{'id': key, 'path': path, 'sha256': digest(ROOT / path)} for key, path in INPUTS.items()],
        'modelSourceSha256': model['source']['sha256'], 'modelProjectId': model['source']['projectId'],
        'modelDesignId': model['source']['designId'], 'sourceModelOriginFmlCm': model['originFmlCm'],
        'sourceImage': 'infrastructure/water-shutoff-map.png', 'sourceImageSizePx': [2500, 1164],
        'units': 'meters', 'upAxis': 'Y',
        'registration': {
            'method': 'Eight image/building corners, bridged through the 37-column A-1/native-model candidate fit',
            'matrixConvention': '[sourceImageX, sourceImageY, 1] @ matrix3x2 = [modelX, modelZ]; modelY=0',
            'matrix3x2': matrix, 'controlCount': 8, **stats(errors),
            'leaveOneOut': stats(loo_errors), 'controls': controls, 'sourceImageControlHullPx': polygon,
            'imageToPlan': {'matrix3x2': image_plan_matrix, 'rmsPlanPx': float(np.sqrt(np.mean(image_plan_errors ** 2))),
                            'maxResidualPlanPx': float(max(image_plan_errors))},
            'planToNative': {'matrix3x2': plan_matrix, 'controlCount': 37, **stats(bridge_errors), 'controls': bridge},
            'uncertaintyNote': 'The eight-corner residual excludes the separate 37-column bridge error and all field error. These are internal drawing/model checks, not survey accuracy. Exterior annotations extrapolate beyond building controls.',
        },
        'nativeModelBoundsMeters': model['boundsMeters'], 'annotationBoundsMeters': annotation_bounds,
        'displayBoundsMeters': {'min': display_min, 'max': display_max},
        'validationBoundsMeters': {'min': validation_min, 'max': validation_max},
        'validation': {'maximumAllowedExteriorDistanceMeters': MAX_EXTERIOR_DISTANCE_M,
                       'maximumObservedExteriorDistanceMeters': max(a['validation']['outsideNativeModelDistanceMeters'] for a in annotations),
                       'outsideNativeModelAnnotationCount': sum(a['validation']['outsideNativeModelBounds'] for a in annotations),
                       'displayMarginMeters': DISPLAY_MARGIN_M,
                       'boundsMeaning': 'Display/validation extents only; not a property, survey, service-area or construction boundary'},
        'limitations': [
            'Printed numbers are reported counts at each location, confirmed by Adam on 2026-09-25; they are not individual meter or valve IDs.',
            'The 24 reported city meters and 28 workbook water-meter IDs remain unreconciled; no membership is inferred.',
            'No physical asset record, meter membership, served unit, pipe, operational status or shutoff procedure is inferred.',
            'Building-corner targets are derived through the existing source-fixture correspondence, not independently measured native corners.',
            'A-1 and Floorplanner walkway widths disagree; their candidate registration retains residual differences.',
            'Y=0 is only a visual ground reference; utility elevation/depth and precise field location remain unknown.',
            'The input infrastructure inventory and original map image remain unchanged.',
        ],
        'annotations': annotations,
    }
    return rounded(result)


def documentation(data):
    r = data['registration']
    table = '\n'.join(f"| {c['id']} | {c['sourceImagePx'][0]}, {c['sourceImagePx'][1]} | {c['targetModelXZ'][0]:.3f}, {c['targetModelXZ'][1]:.3f} | {c['residualMeters']:.3f} |" for c in r['controls'])
    return f'''# Water-map registration

The existing 19 source circles are now available as approximate 3D references: 6 blue **city-meter annotations** and 13 red **tenant-shutoff annotations**. Adam confirmed on **2026-09-25** that the printed numbers are **counts at each location**. They total **24 reported city meters** and **37 reported tenant shutoffs**. Stable `water-map:*` IDs, raw printed labels, image points and source references are preserved from `twin-infrastructure.json`. The generated overlay records the new interpretation and its user-confirmation provenance while preserving the original unresolved interpretation as `sourceMarkerLabelMeaning`. No individual physical assets, meter membership or served units are created or assigned.

The workbook contains **28 water-meter IDs**, four more than the map's reported city-meter total. This is an unresolved difference between sources, not evidence of four missing meters. Dates, coverage and meter membership have not been reconciled. The historical infrastructure source file remains unchanged.

## Method and evidence

The original 2500×1164 map was visually inspected. Its two building outlines and color legend match the existing reference controls. Eight building corners from `twin-site-fixtures.json` provide source-image pixels and A-1 plan pixels. The existing 37 stable column-hash correspondences connect A-1 pixels to the **current** native GLB column centers in `model-data.json`. This tool recomputes that bridge and then fits image pixels to the eight derived model corner targets. It does not retrace or alter the map or use copied utility positions from the earlier package. Count interpretation rests on Adam's confirmation, separately from the geometric registration.

The native source hash is `{data['modelSourceSha256']}`. Input file hashes, native project/design IDs, origin, transform matrices and all controls are recorded in JSON.

| Corner | Image x, y (px) | Target model X, Z (m) | Residual (m) |
| --- | --- | --- | --- |
{table}

Eight-corner fit: **{r['rmsMeters']:.3f} m RMS**, **{r['maxResidualMeters']:.3f} m maximum**. Leave-one-out check: **{r['leaveOneOut']['rmsMeters']:.3f} m RMS**, **{r['leaveOneOut']['maxResidualMeters']:.3f} m maximum**. The separate 37-column bridge has **{r['planToNative']['rmsMeters']:.3f} m RMS**, **{r['planToNative']['maxResidualMeters']:.3f} m maximum**. The eight-corner residual excludes bridge error and all field error; none of these values represents surveyed accuracy. Source walkway depths differ, and utility symbols are exterior extrapolations beyond the building controls.

## Consumer contract

`src/data/twin-water-map.json` exposes `annotations[19]`. Each entry preserves its original ID/category/raw label/image point, adding a human-readable `label`, numeric `reportedCount`, `countBasis`, `countProvenance`, `modelPositionMeters: [X, 0, Z]`, explicit approximate/unverified location status, and per-point validation. Use `reportedCount` for the confirmed meaning of the map number. The original `physicalAssetCount` remains null because no field inventory has been verified; `physicalAssetId` remains null and `memberMeterIds`/`servedUnits` remain empty. These references must not enter the permanent individual physical-asset seed list.

Use `displayBoundsMeters` when framing or validating the water-map overlay together with the model. **{data['validation']['outsideNativeModelAnnotationCount']}** annotations lie outside the building-only native bounds by at most **{data['validation']['maximumObservedExteriorDistanceMeters']:.3f} m**. They should not be clamped onto a wall or rejected merely for being outside the building. Display bounds include a 2 m plan margin. A separate 5 m exterior-distance sanity gate catches unexpected registration drift; it is not an accuracy allowance or property boundary. Combine these bounds with upper-floor bounds in the UI as needed. Y=0 is only a display reference, not measured utility elevation/depth.

## Reproduction and checks

Run `python tools/register-twin-water-map.py` using numpy and Pillow. `--check` verifies that the committed JSON and this document match a fresh calculation without writing. The script reads only committed inputs and writes only these two generated files. Node checks live in `test/twin-water-registration.test.mjs` and cover source identity preservation, confirmed count interpretation and discrepancy, transform residuals, stable native-column controls, exterior display bounds and distinct nearby map markers.
'''


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    data = build()
    outputs = {
        ROOT / 'src/data/twin-water-map.json': json.dumps(data, indent=2, ensure_ascii=False) + '\n',
        ROOT / 'docs/twin-water-registration.md': documentation(data),
    }
    for path, text in outputs.items():
        if args.check:
            assert path.read_text(encoding='utf8') == text, f'Stale generated file: {path}'
        else:
            path.write_text(text, encoding='utf8')
    print(json.dumps({'annotations': len(data['annotations']), 'rmsMeters': data['registration']['rmsMeters'],
                      'maxResidualMeters': data['registration']['maxResidualMeters'],
                      'outsideNativeBounds': data['validation']['outsideNativeModelAnnotationCount'],
                      'displayBoundsMeters': data['displayBoundsMeters'], 'check': args.check}, indent=2))


if __name__ == '__main__':
    main()
