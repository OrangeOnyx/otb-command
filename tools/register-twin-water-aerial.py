"""Project the existing water-map references onto a historical GIS screenshot.

python tools/register-twin-water-aerial.py [--check] [--intake ../infrastructure-intake]
Requires numpy and Pillow. This comparison layer never changes model positions,
physical assets, counts, or meter membership. Roof/outline tracing is approximate.
"""
import argparse
import copy
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CROP = {'x': 0, 'y': 100, 'width': 1420, 'height': 723}
# Full-screenshot pixels, visually read from original image002.png. These four
# rear/end outline intersections span both wings. Parking-facing canopy/eave
# corners are excluded because their overhang differs from the wall footprint.
CONTROL_POINTS = [
    ('long_133_rear', [331, 390], 'Long wing, 133 end / Marie Antoinette rear outline intersection'),
    ('long_101_rear', [631, 764], 'Long wing, 101 end / Marie Antoinette rear outline intersection'),
    ('short_135_patricia', [316, 269], 'Short wing, 135 end / Patricia rear outline intersection'),
    ('short_149_patricia', [462, 170], 'Short wing, 149 end / Patricia rear outline intersection'),
]
# Same rear/end features observed in the 1600-pixel review of the 3072-pixel
# official image, scaled by 1.92 and rounded to source pixels. No geographic
# cursor coordinates or imported marker positions are used as image controls.
DOTD_CONTROL_POINTS = [
    ('long_133_rear', [518, 1006], 'Long wing, 133 end / rear outline intersection'),
    ('long_101_rear', [1236, 2033], 'Long wing, 101 end / rear outline intersection'),
    ('short_135_patricia', [470, 732], 'Short wing, 135 end / Patricia rear outline intersection'),
    ('short_149_patricia', [826, 467], 'Short wing, 149 end / Patricia rear outline intersection'),
]
SOURCE_IMAGES = [
    ('gis-overview', 'Historical aerial overview', 'image002.png', 'infrastructure/gis-overview.png'),
    ('gis-south', 'Historical aerial · south wing', 'image001 (1).png', 'infrastructure/gis-south.png'),
    ('gis-west', 'Historical aerial · west wing', 'image004.png', 'infrastructure/gis-west.png'),
]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def fit(points, targets):
    p, q = np.asarray(points, float), np.asarray(targets, float)
    assert np.linalg.matrix_rank(np.c_[p, np.ones(len(p))]) == 3, 'Controls must span two model axes'
    pc, qc = p.mean(axis=0), q.mean(axis=0)
    a, b = p - pc, q - qc
    u, singular, vt = np.linalg.svd(b.T @ a)
    rotation = u @ vt
    assert np.linalg.det(rotation) > 0, 'Reflection is not allowed'
    scale = singular.sum() / np.square(a).sum()
    matrix = np.vstack([(scale * rotation).T, qc - scale * rotation @ pc])
    return matrix, np.linalg.norm(np.c_[p, np.ones(len(p))] @ matrix - q, axis=1)


def apply(matrix, point):
    return np.r_[point, 1.] @ matrix


def rounded(value):
    if isinstance(value, np.ndarray):
        return rounded(value.tolist())
    if isinstance(value, (float, np.floating)):
        return round(float(value), 10)
    if isinstance(value, dict):
        return {k: copy.deepcopy(v) if k in ('officialProvenance', 'officialImageGeoreferencing') else rounded(v) for k, v in value.items()}
    if isinstance(value, (tuple, list)):
        return [rounded(v) for v in value]
    return value


def project_annotations(water, matrix, crop):
    out = []
    for a in water['annotations']:
        point = apply(matrix, [a['modelPositionMeters'][0], a['modelPositionMeters'][2]])
        in_crop = crop['x'] <= point[0] <= crop['x'] + crop['width'] and crop['y'] <= point[1] <= crop['y'] + crop['height']
        out.append({'id': a['id'], 'category': a['category'], 'label': a['label'],
            'markerLabelRaw': a['markerLabelRaw'], 'markerLabelMeaning': a['markerLabelMeaning'],
            'reportedCount': a['reportedCount'], 'modelPositionMeters': a['modelPositionMeters'],
            'imagePoint': {'x': float(point[0]), 'y': float(point[1])}, 'inCrop': bool(in_crop),
            'positionStatus': 'projected-existing-reference', 'physicalVerification': 'not-field-verified',
            'independentLocationConfirmation': False, 'physicalAssetId': None,
            'memberMeterIds': [], 'servedUnits': []})
    return out


def official_registration(water, by_id):
    official_path = ROOT / 'src/data/twin-water-official-imagery.json'
    official = json.loads(official_path.read_text(encoding='utf8'))
    original = official['sources'][0]
    image_path = ROOT / 'src/assets/twin' / original['sourceImage']
    assert Image.open(image_path).size == tuple(original['imageSizePx']) == (3072, 3072)
    assert digest(image_path) == official['provenance']['imageSHA256']
    p = np.asarray([by_id[c[0]]['targetModelXZ'] for c in DOTD_CONTROL_POINTS])
    q = np.asarray([c[1] for c in DOTD_CONTROL_POINTS])
    matrix, errors = fit(p, q)
    scales = np.linalg.svd(matrix[:2], compute_uv=False)
    assert 7 < min(scales) < 9 and max(errors) < 40
    loo = []
    for i in range(len(p)):
        keep = np.arange(len(p)) != i
        held, _ = fit(p[keep], q[keep])
        loo.append(float(np.linalg.norm(apply(held, p[i]) - q[i])))
    source = copy.deepcopy(original)
    source.update({'id': 'dotd-2024-registered', 'label': '2024 DOTD aerial · approximate overlay',
        'sourceRegistrationStatus': original['registrationStatus'],
        'registrationStatus': 'approximate-visual-registration',
        'registrationModel': 'Uniform scale + rotation + translation; constrained affine, no shear',
        'registrationNote': 'Existing water references projected using four visually observed rear/end roof-outline corners. No physical utility location is independently confirmed.',
        'controls': [{'id': c[0], 'description': c[2], 'modelXZ': model_point,
                      'observedImagePoint': {'x': c[1][0], 'y': c[1][1]},
                      'projectedImagePoint': apply(matrix, model_point), 'residualImagePixels': error,
                      'modelReference': f'twin-water-map.json registration.controls[{c[0]}]',
                      'observedFeature': 'Approximate rear/end roof-or-wall outline; read on 1600 px preview and converted to full 3072 px image coordinates'}
                     for c, model_point, error in zip(DOTD_CONTROL_POINTS, p, errors)],
        'sha256': digest(image_path), 'transformModelXZToImage3x2': matrix,
        'rmsImagePixels': float(np.sqrt(np.mean(errors ** 2))), 'maxResidualImagePixels': float(max(errors)),
        'leaveOneOutRmsImagePixels': float(np.sqrt(np.mean(np.asarray(loo) ** 2))),
        'leaveOneOutMaxImagePixels': float(max(loo)), 'scalePixelsPerModelMeter': scales,
        'scaleAnisotropyRatio': float(max(scales) / min(scales)),
        'annotations': project_annotations(water, matrix, original['crop']),
        'officialProvenance': copy.deepcopy(official['provenance']),
        'officialImageGeoreferencing': copy.deepcopy(official['georeferencing']),
        'registrationLimitations': [
            'Four visually read rooftop/end-outline controls; exact wall/eave boundaries and roof overhangs are uncertain.',
            'The affine is constrained to uniform scale/rotation to avoid unsupported shear from sparse controls.',
            'Leave-one-out far-end sensitivity exceeds the fitted residual. This is comparison context, not utility-location accuracy.',
            'Existing water-map/model positions are unchanged. No individual meter, valve or connection was identified in the aerial.',
            'The official image georeference remains intact; it does not convert the source model into surveyed geometry.',
        ]})
    for control, error in zip(source['controls'], loo):
        control['leaveOneOutResidualImagePixels'] = error
    long_scale = float(np.linalg.norm(q[1] - q[0]) / np.linalg.norm(p[1] - p[0]))
    short_scale = float(np.linalg.norm(q[3] - q[2]) / np.linalg.norm(p[3] - p[2]))
    source['wingScaleCheck'] = {'longWingPixelsPerModelMeter': long_scale,
                               'shortWingPixelsPerModelMeter': short_scale,
                               'longToShortRatio': long_scale / short_scale,
                               'interpretation': 'Traced rear endpoints imply inconsistent wing scales. Corner choice/eave/shadow uncertainty and model proportions cannot be separated from these controls.'}
    return source


def build(intake):
    water_path = ROOT / 'src/data/twin-water-map.json'
    water = json.loads(water_path.read_text(encoding='utf8'))
    native = json.loads((ROOT / 'public/twin/model-data.json').read_text(encoding='utf8'))
    assert water['modelSourceSha256'] == native['source']['sha256']
    by_id = {c['id']: c for c in water['registration']['controls']}
    model_points = np.asarray([by_id[c[0]]['targetModelXZ'] for c in CONTROL_POINTS])
    image_points = np.asarray([c[1] for c in CONTROL_POINTS])
    matrix, errors = fit(model_points, image_points)
    singular_values = np.linalg.svd(matrix[:2], compute_uv=False)
    # The screenshot's two axes should not need arbitrary stretching to match.
    assert max(singular_values) / min(singular_values) < 1.10
    assert 2 < min(singular_values) < 4
    assert max(errors) < 15, 'Visual registration no longer matches the documented controls'
    loo_errors = []
    for i in range(len(CONTROL_POINTS)):
        keep = np.arange(len(CONTROL_POINTS)) != i
        held, _ = fit(model_points[keep], image_points[keep])
        loo_errors.append(float(np.linalg.norm(apply(held, model_points[i]) - image_points[i])))
    controls = []
    for (corner_id, observed, description), target, error in zip(CONTROL_POINTS, model_points, errors):
        controls.append({'id': corner_id, 'description': description, 'modelXZ': target,
                         'observedImagePoint': {'x': observed[0], 'y': observed[1]},
                         'projectedImagePoint': apply(matrix, target), 'residualImagePixels': error,
                         'modelReference': f'twin-water-map.json registration.controls[{corner_id}]',
                         'observedFeature': 'Visually traced rear/end roof-or-wall outline; exact wall/eave boundary is uncertain'})
    for control, error in zip(controls, loo_errors):
        control['leaveOneOutResidualImagePixels'] = error
    sources = []
    for source_id, label, filename, asset_path in SOURCE_IMAGES:
        committed = ROOT / 'src/assets/twin' / asset_path
        staged = intake / filename
        path = committed if committed.exists() else staged
        assert Image.open(path).size == (1440, 900), filename
        if committed.exists() and staged.exists():
            assert digest(committed) == digest(staged), f'Copied image changed: {asset_path}'
        source = {'id': source_id, 'label': label, 'sourceImage': asset_path,
                  'originalFilename': filename, 'sha256': digest(path), 'imageSizePx': [1440, 900], 'crop': CROP,
                  'dateDisplay': '2021-07-14', 'dateStatus': 'taskbar date; aerial acquisition unknown',
                  'providerVisible': 'LUS Map · ArcMap screenshot',
                  'geographicRegistration': 'None; screenshot cursor coordinates are not georeferencing controls',
                  'registrationStatus': 'unregistered-support-image', 'controls': [],
                  'transformModelXZToImage3x2': None, 'rmsImagePixels': None, 'annotations': []}
        if source_id == 'gis-overview':
            annotations = project_annotations(water, matrix, CROP)
            source.update({'registrationStatus': 'approximate-visual-registration', 'controls': controls,
                'registrationModel': 'Uniform scale + rotation + translation; constrained affine, no shear',
                'transformModelXZToImage3x2': matrix, 'rmsImagePixels': float(np.sqrt(np.mean(errors ** 2))),
                'maxResidualImagePixels': float(max(errors)),
                'leaveOneOutRmsImagePixels': float(np.sqrt(np.mean(np.asarray(loo_errors) ** 2))),
                'leaveOneOutMaxImagePixels': float(max(loo_errors)),
                'scalePixelsPerModelMeter': singular_values,
                'scaleAnisotropyRatio': float(max(singular_values) / min(singular_values)),
                'annotations': annotations,
                'registrationLimitations': [
                    'Four manually observed outline corners; low-resolution roofing, shadows and overhang obscure exact wall positions.',
                    'Only rear/end outline corners are controls; parking-side eaves are excluded because they include covered walks.',
                    'Corner residuals are fit consistency, not physical utility-location accuracy. The native/model-to-water-map registration adds separate uncertainty.',
                    'Four controls provide limited redundancy; leave-one-out sensitivity is reported and is larger than the fitted residual.',
                    'Existing marker positions are projected onto an aerial of unknown acquisition date. No meter or valve has been independently identified.',
                ]})
        else:
            source['registrationReason'] = 'Closeup clips part of the building/site; retained as visual support without independently established control points.'
        sources.append(source)
    withheld = official_registration(water, by_id)
    withheld['id'] = 'dotd-2024-registration-attempt'
    withheld['label'] = '2024 DOTD registration attempt · withheld'
    withheld['registrationStatus'] = 'withheld-insufficient-control'
    withheld['candidateTransformModelXZToImage3x2'] = withheld.pop('transformModelXZToImage3x2')
    withheld['annotations'] = []
    withheld['registrationNote'] = 'Not released as an overlay: sparse-control holdout error and inconsistent wing scales are too large for trustworthy marker placement. Use the unchanged official dataset as context only.'
    assert len(sources[0]['annotations']) == 19
    return rounded({'schemaVersion': 1, 'title': 'Aerial comparison for existing water-map references',
        'purpose': 'Comparison overlay only; does not establish or move utility locations',
        'modelSourceSha256': native['source']['sha256'], 'waterMapDataSha256': digest(water_path),
        'coordinateConvention': '[modelX,modelZ,1] @ transformModelXZToImage3x2 = full screenshot [x,y] pixels; crop does not change coordinates',
        'sources': sources, 'withheldRegistrations': [withheld]})


def documentation(data):
    overview = data['sources'][0]
    dotd = data['withheldRegistrations'][0]
    rows = '\n'.join(f"| {c['id']} | {c['modelXZ'][0]:.3f}, {c['modelXZ'][1]:.3f} | {c['observedImagePoint']['x']}, {c['observedImagePoint']['y']} | {c['residualImagePixels']:.2f} |" for c in overview['controls'])
    return f'''# Water-reference aerial comparison

Only the historical overview (`image002.png`, exposed as `infrastructure/gis-overview.png`) is registered for approximate comparison. The south and west closeups (`image001 (1).png` / `image004.png`) remain unregistered visual support. A registration attempt on the **2024 Louisiana DOTD aerial was withheld** because its sparse-control checks were too weak; the official image remains context only. All images were visually inspected. The historical screenshots show a taskbar date of **2021-07-14**; their aerial acquisition date is unknown. No geographic coordinates were inferred from the ArcMap cursor readout. This tool performs no network fetching and does not modify any image bytes or official imagery metadata.

## Visual registration

Four manually observed rear/end outline intersections on both building wings connect to the corresponding derived model corners already documented in `twin-water-map.json`. These control coordinates are approximate: rooftop shadows, pixels and overhangs can obscure the exact wall line. Parking-side roof edges include the covered walks and were excluded to avoid treating eaves as storefront walls.

| Control | Model X, Z (m) | Observed screenshot x, y (px) | Fit residual (px) |
| --- | --- | --- | --- |
{rows}

The transform is constrained to uniform scale, rotation and translation, avoiding arbitrary shear from four sparse controls. It has **{overview['rmsImagePixels']:.2f} px RMS** and **{overview['maxResidualImagePixels']:.2f} px maximum residual**. Its scale is {overview['scalePixelsPerModelMeter'][0]:.3f} px/model-m. These numbers describe internal fit consistency, not surveyed accuracy. Four controls have limited redundancy: leave-one-out RMS is **{overview['leaveOneOutRmsImagePixels']:.2f} px**, maximum **{overview['leaveOneOutMaxImagePixels']:.2f} px**. This larger sensitivity, the earlier model/map fit uncertainty and the unknown image acquisition date limit the overlay to visual comparison. It is not suitable for selecting an operating valve or declaring a meter-to-location match.

## 2024 DOTD attempt withheld

The non-renderable `withheldRegistrations` diagnostic retains the four attempted control points, candidate transform and all residuals for the unchanged 3072×3072 official JPEG. **It has no annotations and is not included in `sources`.** The points were read on the 1600 px inspection preview, converted to source pixels and rounded. The uniform-scale fit has **{dotd['rmsImagePixels']:.2f} px RMS**, **{dotd['maxResidualImagePixels']:.2f} px maximum**, and scale {dotd['scalePixelsPerModelMeter'][0]:.3f} px/model-m. Leave-one-out RMS is **{dotd['leaveOneOutRmsImagePixels']:.2f} px**, maximum **{dotd['leaveOneOutMaxImagePixels']:.2f} px**. That far-end sensitivity is too large for a useful marker overlay.

The rear-endpoint pairs separately imply {dotd['wingScaleCheck']['longWingPixelsPerModelMeter']:.3f} px/model-m for the long wing and {dotd['wingScaleCheck']['shortWingPixelsPerModelMeter']:.3f} for the short wing (ratio {dotd['wingScaleCheck']['longToShortRatio']:.3f}). Exact corner choice, roof/eave/shadow offsets and source-model proportions cannot be separated with these observations. No markers or model geometry were moved to hide that discrepancy. Additional independently identified ground-wall control points or a surveyed registration would be needed before releasing a DOTD marker overlay.

Attribution: **Louisiana DOTD**. [2024 Lafayette imagery service]({dotd['sourceURL']}). Year and georeferencing are copied from `twin-water-official-imagery.json`; the exact flight date is unknown. Original image hash, returned map extent, provider provenance and service URL are retained. The official georeference does not make the native model surveyed. Official source metadata and JPEG bytes are unchanged.

## Consumer contract

`src/data/twin-water-aerial.json` provides `sources[]`. Each source has `id`, `label`, `sourceImage`, `imageSizePx`, `crop`, displayed date/provenance and registration status. Only the overview has `transformModelXZToImage3x2`, controls, residuals and 19 projected `annotations`. Each annotation preserves its source ID, category, raw printed label, confirmed reported count and existing model position, adding `imagePoint: {{x,y}}` and `inCrop`. Render the separate official DOTD metadata source as context only; never use `withheldRegistrations` for pins.

Coordinates are **full source-image pixels**. Historical screenshots use x=0, y=100, width=1420, height=723; DOTD uses the full 3072×3072 image. Subtract the crop origin only when drawing in a cropped image coordinate system. The transform is `[modelX, modelZ, 1] @ matrix = [imageX, imageY]`. The overlay does not alter any existing model position, physical asset, count, meter membership or served-unit association. No aerial feature independently confirms a shutoff or meter position.

## Reproduction

Run `python tools/register-twin-water-aerial.py` with numpy and Pillow; add `--check` to compare without writing. The tool prefers the copied source assets and falls back to `../infrastructure-intake` (configurable with `--intake`). Binary hashes prevent silently using changed copies. It writes only this document and `twin-water-aerial.json`. Node tests validate source provenance, transform controls, crop coordinates, preserved water references and unregistered closeups.
'''


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--intake', type=Path, default=ROOT.parent / 'infrastructure-intake')
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    data = build(args.intake)
    outputs = {ROOT / 'src/data/twin-water-aerial.json': json.dumps(data, indent=2, ensure_ascii=False) + '\n',
               ROOT / 'docs/twin-water-aerial-registration.md': documentation(data)}
    for path, content in outputs.items():
        if args.check:
            assert path.read_text(encoding='utf8') == content, f'Stale generated file: {path}'
        else:
            path.write_text(content, encoding='utf8')
    overview = data['sources'][0]
    print(json.dumps({'registeredSource': overview['id'], 'annotations': len(overview['annotations']),
        'inCrop': sum(a['inCrop'] for a in overview['annotations']), 'rmsImagePixels': overview['rmsImagePixels'],
        'leaveOneOutMaxImagePixels': overview['leaveOneOutMaxImagePixels'], 'check': args.check}, indent=2))


if __name__ == '__main__':
    main()
