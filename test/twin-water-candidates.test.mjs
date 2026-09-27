import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => JSON.parse(fs.readFileSync(new URL(path, import.meta.url), 'utf8'));
const candidates = read('../src/data/twin-water-candidates.json');
const infrastructure = read('../src/data/twin-infrastructure.json');
const map = read('../src/data/twin-water-map.json');
const meterItems = infrastructure.items.filter(item => item.metadata?.utility === 'water');
const meterById = new Map(meterItems.map(item => [item.metadata.meterIdRaw, item]));
const mapById = new Map(map.annotations.map(item => [item.id, item]));

test('water candidates cover the six original blue map references without confirming membership', () => {
  assert.equal(candidates.status, 'candidate-not-confirmed');
  assert.equal(candidates.supportedRelation, 'meter-to-map-location');
  assert.deepEqual(candidates.candidates.map(item => item.mapAnnotationId),
    map.annotations.filter(item => item.category === 'city-meter').map(item => item.id));
  assert.equal(candidates.candidates.length, 6);
  for (const group of candidates.candidates) {
    const point = mapById.get(group.mapAnnotationId);
    assert.equal(group.code, `M${point.id.split(':').at(-1)}`);
    assert.equal(group.reportedMapCount, point.reportedCount);
    assert.equal(group.status, 'candidate-not-confirmed');
    assert.equal(group.supportedRelation, 'meter-to-map-location');
    assert.ok(group.rationale && group.contradictions.length && group.confidenceBasis.length);
    assert.deepEqual(group.sourceRefs[0].imagePoint, point.imagePoint);
    for (const key of ['memberMeterIds', 'servedUnits', 'physicalAssetId', 'modelPositionMeters']) {
      assert.equal(Object.hasOwn(group, key), false, `No automatic ${key} assignment`);
    }
    assert.deepEqual(point.memberMeterIds, []);
    assert.deepEqual(point.servedUnits, []);
  }
});

test('every proposed meter retains its actual workbook location, ID and exact cell provenance', () => {
  for (const group of candidates.candidates) {
    assert.equal(group.proposedMeterCount, group.proposedMeterIds.length);
    assert.equal(group.proposedMinusReportedCount, group.proposedMeterCount - group.reportedMapCount);
    assert.deepEqual(group.proposedMeterIds, meterItems
      .filter(item => group.sourceLocationTexts.includes(item.metadata.approximateLocationRaw))
      .map(item => item.metadata.meterIdRaw));
    for (const [index, id] of group.proposedMeterIds.entries()) {
      const item = meterById.get(id);
      assert.ok(item, `Known water ID ${id}`);
      assert.equal(group.proposedMeterSourceKeys[index], item.sourceKey);
      assert.equal(group.sourceAddressLabels[index], item.metadata.originalUnitLabel);
      const source = item.metadata.sourceRefs[0];
      const ref = group.sourceRefs.find(ref => ref.meterCell === source.meterCell);
      assert.equal(ref.file, source.file);
      assert.equal(ref.sheet, source.sheet);
      assert.equal(ref.row, source.row);
      assert.equal(ref.locationCell, `H${source.row}`);
      assert.equal(ref.addressRange, `A${source.row}:C${source.row}`);
      const sourceRow = infrastructure.sourceRows.find(row => row.row === source.row);
      assert.equal(sourceRow.values.E, id);
      assert.equal(sourceRow.values.H, item.metadata.approximateLocationRaw);
    }
  }
});

test('count discrepancies and adjacent-suite discrepancies are not promoted to stronger matches', () => {
  const byCode = new Map(candidates.candidates.map(group => [group.code, group]));
  assert.deepEqual(['M01', 'M04'].map(code => byCode.get(code).classification),
    ['stronger-location-and-count', 'stronger-location-and-count']);
  for (const code of ['M02', 'M03']) assert.equal(byCode.get(code).classification, 'location-with-count-conflict');
  assert.equal(byCode.get('M02').proposedMinusReportedCount, 3);
  assert.equal(byCode.get('M03').proposedMinusReportedCount, -1);
  for (const code of ['M05', 'M06']) {
    assert.equal(byCode.get(code).classification, 'needs-review');
    assert.equal(byCode.get(code).proposedMinusReportedCount, 0);
    assert.match(byCode.get(code).contradictions.join(' '), /offset by an adjacent suite/);
  }
  assert.match(byCode.get('M05').locationContext, /labeled 105/);
  assert.match(byCode.get('M06').locationContext, /labeled 103/);
});

test('all 28 workbook IDs reconcile to 26 candidates and two explicit gaps without duplicates', () => {
  const proposed = candidates.candidates.flatMap(group => group.proposedMeterIds);
  assert.equal(proposed.length, 26);
  assert.equal(new Set(proposed).size, 26);
  assert.deepEqual(candidates.unassignedMeters.map(item => item.meterId).sort(), ['W1217102', 'W1276858']);
  assert.deepEqual(new Set([...proposed, ...candidates.unassignedMeters.map(item => item.meterId)]), new Set(meterById.keys()));
  assert.equal(candidates.summary.mapReportedCityMeters, 24);
  assert.equal(candidates.summary.workbookWaterMeterIds, 28);
  assert.equal(candidates.summary.workbookMinusMap, 4);
  assert.equal(candidates.summary.confirmedMemberships, 0);
  assert.equal(candidates.unassignedMeters.find(item => item.meterId === 'W1217102').purpose, 'Sprinkler');
  assert.equal(candidates.unassignedMeters.find(item => item.meterId === 'W1276858').sourceLocationText, '?');
  assert.ok(candidates.candidates.find(group => group.code === 'M04').proposedMeterIds.includes('W1252003'));
  assert.ok(candidates.candidates.find(group => group.code === 'M03').proposedMeterIds.includes('W1202593'));
});

test('all thirteen shutoff entries preserve map identity/count and provide geography only', () => {
  assert.equal(candidates.shutoffContexts.length, 13);
  assert.equal(candidates.shutoffContexts.reduce((sum, item) => sum + item.reportedCount, 0), 37);
  for (const context of candidates.shutoffContexts) {
    const point = mapById.get(context.mapAnnotationId);
    assert.equal(point.category, 'tenant-shutoff');
    assert.equal(context.reportedCount, point.reportedCount);
    assert.equal(context.status, 'geographic-context-only');
    assert.equal(context.supportedRelation, 'marker-to-nearby-site-feature');
    assert.equal(context.serviceConnectionEstablished, false);
    assert.match(context.note, /does not establish which suite or meter/);
    assert.deepEqual(context.sourceRefs[0].imagePoint, point.imagePoint);
    for (const key of ['proposedMeterIds', 'memberMeterIds', 'servedUnits']) assert.equal(Object.hasOwn(context, key), false);
  }
});

test('GIS observations preserve source hashes and distinguish taskbar dates from acquisition dates', () => {
  assert.equal(candidates.gisEvidence.length, 3);
  for (const image of candidates.gisEvidence) {
    const source = infrastructure.sources.find(source => source.filename === image.file);
    assert.ok(source);
    assert.equal(image.sourceSha256, source.sha256);
    assert.equal(image.dateVisibleInTaskbar, '2021-07-14');
    assert.match(image.dateMeaning, /not the imagery acquisition date/);
    assert.match(image.geographicRegistration, /cursor coordinate is not assigned/);
    assert.ok(image.doesNotEstablish.length >= 2);
  }
  const summary = candidates.summary;
  assert.equal(summary.strongerLocationAndCountGroups, candidates.candidates.filter(group => group.classification === 'stronger-location-and-count').length);
  assert.equal(summary.locationWithCountConflictGroups, candidates.candidates.filter(group => group.classification === 'location-with-count-conflict').length);
  assert.equal(summary.needsReviewGroups, candidates.candidates.filter(group => group.classification === 'needs-review').length);
});
