"""Reconcile the supplied operator fixture inventory with the existing native twin.

Read-only intake; writes the fixture JSON, reconciliation document and PDF image reference.
Requires Python, numpy, Pillow and pypdf. Run from the repo:
  python tools/extract-twin-site-fixtures.py --intake ../infrastructure-intake

The 37 native column IDs are preserved as candidate links, never replacement assets.
All registrations are drawing/model-derived and are not field verification.
"""
import argparse
import csv
import hashlib
import io
import json
import zipfile
from pathlib import Path

import numpy as np
from PIL import Image
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
# Read from numbered labels on the supplied PDF; coordinates in a 200 dpi render.
# Each square lies 68 render pixels below the corresponding label center.
TAGS = {
    1:(6765,3478),2:(6765,3287),3:(6765,3068),4:(6765,2815),5:(6765,2588),6:(6765,2360),
    7:(6765,2175),8:(6655,2175),9:(6446,2175),10:(6339,2175),11:(6153,2175),12:(6039,2175),
    13:(5860,2175),14:(5748,2175),15:(5367,2175),16:(5031,2175),17:(4747,2175),18:(4411,2175),
    19:(4103,2175),20:(3789,2175),21:(3489,2175),22:(3188,2175),23:(2881,2175),24:(2572,2175),
    25:(2260,2175),26:(1936,2175),27:(1603,2177),28:(1507,2177),29:(1241,2175),30:(922,2175),
    31:(592,2175),32:(281,2179),33:(199,2028),34:(199,1714),35:(199,1361),36:(199,1014),
    37:(200,660),38:(199,311),39:(199,169),
}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def round_values(value):
    if isinstance(value, np.ndarray):
        return round_values(value.tolist())
    if isinstance(value, (float, np.floating)):
        return round(float(value), 8)
    if isinstance(value, dict):
        return {k: round_values(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [round_values(v) for v in value]
    return value


def fit(points, targets):
    p = np.c_[np.asarray(points, float), np.ones(len(points))]
    q = np.asarray(targets, float)
    matrix = np.linalg.lstsq(p, q, rcond=None)[0]
    errors = np.linalg.norm(p @ matrix - q, axis=1)
    return matrix, errors


def apply(matrix, point):
    return np.r_[point, 1.] @ matrix


def blobs(mask, min_area):
    """Eight-connected component centroids; no OpenCV dependency."""
    mask = mask.copy()
    height, width = mask.shape
    points = []
    for sy, sx in zip(*np.where(mask)):
        if not mask[sy, sx]:
            continue
        mask[sy, sx] = False
        todo, count, sum_x, sum_y = [(int(sx), int(sy))], 0, 0, 0
        while todo:
            x, y = todo.pop()
            count += 1
            sum_x += x
            sum_y += y
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    xx, yy = x + dx, y + dy
                    if 0 <= xx < width and 0 <= yy < height and mask[yy, xx]:
                        mask[yy, xx] = False
                        todo.append((xx, yy))
        if count > min_area:
            points.append([sum_x / count, sum_y / count])
    return points


def color_points(image, kind, minimum):
    hsv = np.asarray(image.convert('HSV'), dtype=float)
    h, s, v = hsv[:, :, 0] * 180 / 255, hsv[:, :, 1], hsv[:, :, 2]
    if kind == 'purple':
        mask = (h >= 125) & (h <= 155) & (s >= 120) & (v >= 120)
    elif kind == 'red':
        mask = ((h <= 8) | (h >= 172)) & (s >= 120) & (v >= 120)
    elif kind == 'utility-red':
        mask = ((h <= 10) | (h >= 170)) & (s >= 60) & (v >= 150)
    else:
        mask = (h >= 110) & (h <= 130) & (s >= 150) & (v >= 150)
    return blobs(mask, minimum)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--intake', type=Path, default=ROOT.parent / 'infrastructure-intake')
    parser.add_argument('--columns', type=Path, default=ROOT.parent / 'column-analysis.json')
    args = parser.parse_args()
    intake = args.intake.resolve()
    pdf = intake / '07 Columns, Benches, and Cans.pdf'
    archive = intake / 'OTB_Site_Twin.zip'
    water = intake / 'Water Shutoff Clusters.png'
    model_file = ROOT / 'public/twin/model-data.json'
    model = json.loads(model_file.read_text(encoding='utf8'))
    native = json.loads(args.columns.read_text(encoding='utf8'))
    columns = {c['id']: c for c in native['columns']}
    origin = model['originFmlCm']
    with zipfile.ZipFile(archive) as z:
        prefix = 'OTB_Site_Twin/'
        data = json.loads(z.read(prefix + 'twin-data.json'))
        csv_raw = z.read(prefix + 'site-register.csv')
        register = {r['asset_id']: r for r in csv.DictReader(io.StringIO(csv_raw.decode('utf8')))}
    assets = [a for a in data['assets'] if a['category'] in ('column', 'bench', 'can')]
    counts = {kind: sum(a['category'] == kind for a in assets) for kind in ('column', 'bench', 'can')}
    assert counts == {'column': 39, 'bench': 10, 'can': 20}, counts
    plan_point = lambda a: [float(register[a['id']]['center_x_px']), float(register[a['id']]['center_y_px'])]
    native_point = lambda c: [(c['center_cm']['x'] - origin['x']) / 100, (c['center_cm']['y'] - origin['y']) / 100]
    linked = [a for a in assets if a.get('codexAssetId')]
    assert len(linked) == 37 and {a['codexAssetId'] for a in linked} == set(columns)
    source_points = np.array([plan_point(a) for a in linked])
    model_points = np.array([native_point(columns[a['codexAssetId']]) for a in linked])
    matrix, errors = fit(source_points, model_points)
    loo_errors = []
    for i in range(len(linked)):
        keep = np.arange(len(linked)) != i
        held_matrix, _ = fit(source_points[keep], model_points[keep])
        loo_errors.append(float(np.linalg.norm(apply(held_matrix, source_points[i]) - model_points[i])))
    assert max(errors) < 1.5, errors

    # Read the PDF's embedded 2500 x 1320 image directly, preserving native source pixels.
    image = PdfReader(pdf).pages[0].images[0].image.convert('RGB')
    assert image.size == (2500, 1320), image.size
    image_path = ROOT / 'src/assets/twin/infrastructure/site-fixtures.png'
    image_path.parent.mkdir(parents=True, exist_ok=True)
    image.save(image_path)
    order = lambda p: (0, -p[0]) if p[1] > 2300 * .36 else (1, -p[1])
    cans = sorted(color_points(image, 'purple', 3000 * .36 ** 2), key=order)
    benches = sorted(color_points(image, 'red', 3000 * .36 ** 2), key=order)
    assert len(cans) == 20 and len(benches) == 10, (len(cans), len(benches))
    raw_points = {f'col-{k:02}': [x * .36, (y + 68) * .36] for k, (x, y) in TAGS.items()}
    raw_points.update({f'can-{i:02}': p for i, p in enumerate(cans, 1)})
    raw_points.update({f'bench-{i:02}': p for i, p in enumerate(benches, 1)})

    items, controls = [], []
    for a in assets:
        p = plan_point(a)
        projected = apply(matrix, p)
        linked_id = a.get('codexAssetId')
        item = {
            'id': a['id'], 'sourceKey': 'otb-a1-register:' + a['id'], 'label': a['label'],
            'kind': {'column': 'column', 'bench': 'bench', 'can': 'waste_bin'}[a['category']],
            'sourcePlanPx': p, 'sourceImagePx': raw_points[a['id']],
            'modelPositionMeters': [projected[0], 0, projected[1]],
            'sourceSiteTwinPositionMeters': a['positionM'],
            'positionStatus': 'approximate_source_registered',
            'verificationStatus': 'not_field_verified',
            'seedPolicy': 'reference_only' if a['category'] == 'column' else 'new_asset_candidate',
            'provenance': {
                'sourceId': 'columns-benches-cans', 'sourceFile': pdf.name,
                'registerAssetId': a['id'], 'registerStatus': a['status'],
                'locationMethod': 'Supplied A-1 register position, affine registered to 37 linked native-model column centers.',
                'imagePointMethod': 'Approximate column-square point from the supplied generator numbered-tag coordinates plus its 68-pixel vertical offset at 200 dpi; crowded labels 27/28 are offset from their squares' if a['category'] == 'column' else 'Colored symbol centroid in embedded PDF image; numbering inherited from supplied register',
                'heightNote': 'modelPositionMeters is a ground reference (Y=0); sourceSiteTwinPositionMeters Y is presentation geometry, not a measured fixture height.',
            },
        }
        if a.get('sub'):
            item['locationNote'] = a['sub']
        if a['category'] == 'column':
            distances = sorted((float(np.linalg.norm(projected - native_point(c))), c['id'], c['label']) for c in columns.values())
            item['crosswalk'] = {
                'status': 'candidate_link' if linked_id else 'source_only_unmatched',
                'modelColumnId': linked_id, 'modelLabel': a.get('codexLabel'), 'toleranceMeters': 1.5,
                'nearestCandidates': [{'modelColumnId': cid, 'modelLabel': label, 'distanceMeters': dist} for dist, cid, label in distances[:2]],
                'candidatesWithinTolerance': [cid for dist, cid, _ in distances if dist <= 1.5],
                'basis': 'Stable native-column hash already supplied in the ZIP; independently checked against affine distances. Candidate only, not field confirmation.',
            }
            if linked_id:
                target = native_point(columns[linked_id])
                distance = float(np.linalg.norm(projected - target))
                item['modelColumnId'] = linked_id
                item['linkedModelPositionMeters'] = [target[0], 0, target[1]]
                item['crosswalk']['distanceMeters'] = distance
                item['crosswalk']['nativeModelConfidence'] = columns[linked_id]['confidence']
                controls.append({'sourceId': a['id'], 'modelColumnId': linked_id, 'sourcePlanPx': p, 'nativeModelXZ': target, 'residualMeters': distance})
            if a['id'] in ('col-27', 'col-28'):
                item['reviewNote'] = 'The inventory labels two separate columns here (27/28), linked to C25/C26. C25 remains a medium-confidence native footprint because it shares a side with a larger narrow wall feature. Preserve both existing IDs pending field review.'
        items.append(item)

    # Exact eight anchors documented by the source register generator. These are drawing control points,
    # not surveyed coordinates. Resolve targets from the local geometry's identical building rectangles.
    geometry = json.loads((ROOT / 'src/data/geometry.json').read_text(encoding='utf8'))
    u = geometry['units']
    lb = {'x133': u['133']['x'] + u['133']['w'], 'x101': u['101']['x'], 'front': u['101']['y'] + u['101']['h'], 'rear': u['101']['y']}
    sb = {'xfield': u['137']['x'], 'xpat': u['137']['x'] + u['137']['w'], 'yma': u['135A']['y'], 'yarn': u['149']['y'] + u['149']['h']}
    anchors = [
        ('long_133_front', [507.5,769], [lb['x133'],lb['front']]),
        ('long_133_rear', [507.5,1025], [lb['x133'],lb['rear']]),
        ('long_101_front', [2073.5,760], [lb['x101'],lb['front']]),
        ('long_101_rear', [2073.5,1017.5], [lb['x101'],lb['rear']]),
        ('short_149_patricia', [217.5,251], [sb['xpat'],sb['yarn']]),
        ('short_149_field', [470,251], [sb['xfield'],sb['yarn']]),
        ('short_135_patricia', [217.5,879], [sb['xpat'],sb['yma']]),
        ('short_135_field', [470,879], [sb['xfield'],sb['yma']]),
    ]
    water_matrix, water_errors = fit([a[1] for a in anchors], [a[2] for a in anchors])
    homogeneous_water = np.c_[water_matrix, [0, 0, 1]]
    composed = homogeneous_water @ matrix
    water_native_errors = [float(np.linalg.norm(apply(composed, a[1]) - apply(matrix, a[2]))) for a in anchors]
    water_image = Image.open(water).convert('RGB')
    assert water_image.size == (2500, 1164), water_image.size
    water_blue = [p for p in color_points(water_image, 'blue', 300) if p[1] > 150]
    water_red = sorted(p for p in color_points(water_image, 'utility-red', 300) if p[1] > 150)
    assert len(water_blue) == 6 and len(water_red) == 13, (len(water_blue), len(water_red))
    blue_ids = {264:'mclu-149',479:'mclu-131',1136:'mclu-119',1586:'mclu-109',1715:'mclu-107',1811:'mclu-105'}
    utility_points = {blue_ids[min(blue_ids, key=lambda x: abs(x-p[0]))]: p for p in water_blue}
    utility_points.update({f'shutoff-{i:02}': p for i,p in enumerate(water_red,1)})
    utility_references = []
    for a in data['assets']:
        if a['id'] not in utility_points:
            continue
        p = utility_points[a['id']]
        xp = apply(composed, p)
        utility_references.append({'sourceId': a['id'], 'label': a['label'], 'kind': a['category'],
            'sourceImagePx': p, 'sourcePlanPx': plan_point(a), 'modelPositionMeters': [xp[0],0,xp[1]],
            'countMarkedOnSource': a.get('count'), 'positionStatus': 'approximate_source_registered',
            'verificationStatus': 'not_field_verified', 'seedPolicy': 'reference_only'})

    report = {
        'schemaVersion': 1, 'title': 'OTB operator fixture inventory reconciliation',
        'modelSourceSha256': model['source']['sha256'],
        'counts': {'sourceColumns':39,'linkedNativeColumns':37,'sourceOnlyColumns':2,'benches':10,'wasteBins':20},
        'sources': [
            {'id':'columns-benches-cans','file':pdf.name,'sha256':sha(pdf),'page':1,'imageSizePx':[2500,1320]},
            {'id':'site-twin-package','file':archive.name,'sha256':sha(archive),'usedEntries':['twin-data.json (fixture and utility entries only)','site-register.csv (fixture and utility entries only)']},
            {'id':'water-shutoff-clusters','file':water.name,'sha256':sha(water),'imageSizePx':[2500,1164]},
        ],
        'coordinateSystem': {'model':'Current native FML-derived GLB, metres, Y up','plan':'A-1 drawing pixels','sourceImages':'Origin top-left, x right, y down','matrixConvention':'[x,y,1] @ matrix3x2 = [modelX,modelZ]','modelY':'Ground reference Y=0; no source fixture height asserted'},
        'registration': {
            'planToNative': {'matrix3x2':matrix,'controlCount':37,'rmsMeters':float(np.sqrt(np.mean(errors**2))),'maxResidualMeters':float(max(errors)),
                'leaveOneOutRmsMeters':float(np.sqrt(np.mean(np.asarray(loo_errors)**2))), 'leaveOneOutMaxMeters':max(loo_errors),'controls':controls,
                'status':'approximate_model_derived','note':'Controls are candidate correspondences supplied by the same source package, not independent surveyed controls. Residuals describe internal drawing/model agreement only.'},
            'utilityImageToPlan': {'matrix3x2':water_matrix,'rmsPlanPx':float(np.sqrt(np.mean(water_errors**2))),'maxResidualPlanPx':float(max(water_errors)),
                'controls':[{'id':a[0],'sourceImagePx':a[1],'targetPlanPx':a[2],'residualPlanPx':e} for a,e in zip(anchors,water_errors)],
                'source':'Eight building-corner controls documented in tools/digitize-site-sources.py of the supplied site-register implementation.'},
            'utilityImageToNative': {'matrix3x2':composed,'controlResidualRmsMeters':float(np.sqrt(np.mean(np.asarray(water_native_errors)**2))),
                'status':'approximate_two_stage_registration','note':'Composed utility image→A-1→native model. The reported eight-control residual excludes the separate 37-column fit error and all field uncertainty. Utility locations beyond the column-control envelope are extrapolated. Suitable for approximate visual reference only; source image remains authoritative for symbol/count reading.'},
        },
        'limitations': [
            'These inventory positions and crosslinks are drawing/model-derived, not surveyed or field verified.',
            'A-1 fixture positions were adjusted proportionally across the walks because source drawings disagree on walkway depth; the affine cannot make both sources exact.',
            'Source columns 1 and 2 have no matching native geometry; do not create duplicate or replacement column records automatically.',
            'Source Column 27 supports a separately numbered object at C25, but C25 native geometry remains ambiguous and requires field review.',
            'Preserve all 37 existing native asset IDs and labels. Source Column n labels are a separate inventory namespace.',
            'Bench/can labels are register sequence IDs for colored symbols, not physical field tags. Dimensions and elevation are unverified.',
        ],
        'items':items, 'utilityMapReferences':utility_references,
    }
    out = ROOT / 'src/data/twin-site-fixtures.json'
    out.write_text(json.dumps(round_values(report), indent=2, ensure_ascii=False)+'\n',encoding='utf8')
    rms = float(np.sqrt(np.mean(errors**2)))
    doc = f'''# Fixture inventory reconciliation

The supplied operator PDF contains **39 numbered columns, 10 red bench symbols and 20 purple can symbols**. Its supplied site-twin package links 37 columns to the existing native model IDs. This extraction preserves those IDs. Source Columns 1 and 2 are reference-only unmatched objects, not newly created assets.

`src/data/twin-site-fixtures.json` is the small reusable inventory. `items` contains 69 fixture references with source IDs, source-image pixels, A-1 pixels, approximate native-model positions and provenance. Only the 30 benches/cans have `seedPolicy: new_asset_candidate`; columns are `reference_only`. Consumers should use `sourceKey` to avoid duplicates and retain existing asset edits. No contacts, accounts or financial records are included.

## Registration and verification

The 37 supplied hash-ID correspondences were independently checked against native model column centers. An affine from A-1 pixels to current native GLB X/Z has RMS **{rms:.3f} m**, maximum **{max(errors):.3f} m**, with all 37 within the source package's 1.5 m tolerance. Leave-one-out RMS is **{np.sqrt(np.mean(np.asarray(loo_errors)**2)):.3f} m** (maximum {max(loo_errors):.3f} m). The JSON records every control, residual, nearest two candidates and all matches within tolerance. These controls are candidate links supplied with the package, so the residuals measure internal drawing/model agreement, not independent ground accuracy.

Source Column 27 links to existing **C25 / column-45d9d6177283** and source Column 28 to **C26 / column-887d27e648e6**. The inventory separately numbers both objects. C25 remains a medium-confidence native wall-loop interpretation because it shares a side with a larger narrow feature; no ID is removed, merged or renamed.

The PDF's embedded 2500×1320 image was inspected, and bench/can locations are color-component centroids in that exact image. Column square centers follow the source generator's numbered-label transcription. A-1 positions come from the supplied ZIP CSV, whose generator adjusts fixtures proportionally across the walks because Floorplanner and plat walkway depths disagree. Thus a single affine necessarily leaves small discrepancies. All fixture heights/dimensions remain unverified; native-model placement Y=0 is only a ground reference.

## Utility image registration

`Water Shutoff Clusters.png` is 2500×1164. Eight explicit long/short building-corner anchors are preserved in JSON. The source-image→A-1 fit reproduces RMS **{np.sqrt(np.mean(water_errors**2)):.3f} plan px** (maximum {max(water_errors):.3f} px). The composed image→native affine is included, together with 6 blue meter-cluster and 13 red shut-off-cluster image centroids and source-register IDs for integration. The eight-control residual expressed in model units is **{np.sqrt(np.mean(np.asarray(water_native_errors)**2)):.3f} m**, excluding the separate column-fit error. Do not quote that as physical location accuracy. Exterior utility positions can extrapolate outside the column controls. Use the source-image overlay for exact source-symbol/count reading, and label 3D utility positions approximate.

## Reproduction

Run `python tools/extract-twin-site-fixtures.py --intake ../infrastructure-intake` from this worktree with numpy, Pillow and pypdf. It reads the ZIP, supplied images, native column analysis and current local model metadata without changing originals. It validates 39/10/20 source counts, all 37 stable native IDs, 1.5 m correspondence tolerance, image dimensions and 6/13 utility symbol counts, then regenerates this document, the inventory JSON and the extracted PDF image at `src/assets/twin/infrastructure/site-fixtures.png`. Source SHA-256 hashes are stored in JSON.
'''
    (ROOT / 'docs/twin-fixture-reconciliation.md').write_text(doc,encoding='utf8')
    print(json.dumps(round_values({'output':str(out),'counts':report['counts'],'rmsMeters':rms,'maxMeters':max(errors),'waterRmsPlanPx':np.sqrt(np.mean(water_errors**2)),'utilityImageToNative':composed}),indent=2))


if __name__ == '__main__':
    main()
