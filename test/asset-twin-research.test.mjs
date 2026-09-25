import test from 'node:test';
import assert from 'node:assert/strict';
import { researchEvidenceForAsset, siteResearch } from '../src/lib/asset-twin-research.js';
import { infrastructure, fixtureSeeds } from '../src/lib/asset-twin-source-data.js';
import { PHYSICAL_ASSET_TYPES } from '../src/lib/physical-assets-model.js';

const assetFor = (source, overrides = {}) => ({
  id: 'pa_a54bac91-97f6-4a3a-9c67-ac35829dff53', type: source.type,
  unit: source.unit, label: 'Operator renamed this asset',
  bindings: [{ source_key: source.sourceKey }], ...overrides,
});
const idsFor = asset => researchEvidenceForAsset(asset).map(item => item.id);

test('every asset type receives one project and two explicitly qualified dated site views', () => {
  for (const type of Object.keys(PHYSICAL_ASSET_TYPES)) {
    const evidence = researchEvidenceForAsset({ type, label: 'Any label' });
    const context = evidence.filter(item => item.scope === 'site-context');
    assert.deepEqual(context.map(item => item.id), siteResearch.siteEvidenceIds);
    assert.equal(context.filter(item => item.id === 'otb-earth-site-project').length, 1);
    assert.equal(context.filter(item => item.kind === 'dated-view').length, 2);
    assert.ok(context.every(item => item.status === 'reference'));
    assert.equal(new Set(evidence.map(item => item.id)).size, evidence.length);
  }
  assert.deepEqual(researchEvidenceForAsset(null), []);
  assert.deepEqual(researchEvidenceForAsset([]), []);
});

test('date meanings preserve selector and source-year limits instead of asserting field observation', () => {
  const byId = new Map(siteResearch.evidence.map(item => [item.id, item]));
  const latest = byId.get('otb-earth-view-2026-01-27');
  assert.equal(latest.sourceDate, '2026-01-27');
  assert.equal(latest.dateMeaning, 'imagery-selector');
  assert.match(latest.sourceDateLabel, /pixels may be older/i);
  assert.match(latest.notes, /not.*asset.*location or condition/i);
  const prior = byId.get('otb-earth-view-2024-03-19');
  assert.equal(prior.sourceDate, '2024-03-19');
  assert.equal(prior.dateMeaning, 'imagery-selector');
  assert.equal(prior.provider, 'Google Earth');
  assert.match(prior.notes, /not individually reviewed/i);
  const dotd = byId.get('otb-dotd-2024-site-context');
  assert.equal(dotd.sourceDate, null);
  assert.equal(dotd.dateMeaning, 'source-year');
  assert.match(dotd.sourceDateLabel, /exact flight date unknown/i);
  assert.match(dotd.notes, /registration was withheld/i);
  for (const item of siteResearch.evidence) {
    assert.equal(item.reviewedAt, '2026-09-25');
    assert.ok(item.sourceDate === null || /^\d{4}-\d{2}-\d{2}$/.test(item.sourceDate));
    if (item.sourceDate) assert.equal(new Date(item.sourceDate).toISOString().slice(0, 10), item.sourceDate);
    assert.notEqual(item.status, 'field-observation');
    assert.notEqual(item.dateMeaning, 'observed-on');
  }
});

test('all catalog URLs are credential-free HTTPS source pages, with no copied Google media', () => {
  assert.equal(siteResearch.provenance.googleMediaCopied, false);
  assert.equal(new Set(siteResearch.evidence.map(item => item.id)).size, siteResearch.evidence.length);
  for (const item of siteResearch.evidence) {
    assert.match(item.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(['source', 'dated-view', 'verification-note'].includes(item.kind));
    assert.ok(['reference', 'needs-verification'].includes(item.status));
    assert.ok(['site-context', 'asset-specific'].includes(item.scope));
    assert.ok(item.title && item.provider && item.notes);
    assert.equal(item.asset_id, undefined);
    if (!item.url) {
      assert.equal(item.kind, 'verification-note');
      continue;
    }
    const url = new URL(item.url);
    assert.equal(url.protocol, 'https:');
    assert.equal(url.username, '');
    assert.equal(url.password, '');
    assert.ok(![...url.searchParams.keys()].some(key => /token|secret|password|authuser/i.test(key)));
    assert.ok(['earth.google.com', 'maps.dotd.la.gov'].includes(url.hostname));
    if (url.hostname === 'earth.google.com') assert.match(url.pathname, /^\/web\//);
    assert.doesNotMatch(url.pathname, /\.(png|jpe?g|webp|glb|kmz)$/i);
  }
  assert.doesNotMatch(JSON.stringify(siteResearch), /data:image|googleusercontent|streetviewpixels|pa_[0-9a-f-]{36}/i);
});

test('water-meter notes follow explicit source utility through renames and never attach to electric or unknown meters', () => {
  const water = infrastructure.items.filter(item => item.metadata?.utility === 'water');
  const electric = infrastructure.items.filter(item => item.metadata?.utility === 'electric');
  assert.equal(water.length, 28);
  assert.equal(electric.length, 28);
  for (const item of water) {
    const evidence = researchEvidenceForAsset(assetFor(item, { label: 'Electric meter' }));
    const note = evidence.find(entry => entry.id === 'otb-water-meter-inventory-gap');
    assert.ok(note, item.sourceKey);
    assert.match(note.notes, /24 city meters/);
    assert.match(note.notes, /28 distinct water-meter IDs/);
    assert.match(note.notes, /37 tenant shutoffs/);
  }
  for (const item of electric) {
    assert.ok(!idsFor(assetFor(item, { label: 'Water meter 37 shutoffs', unit: '101' })).includes('otb-water-meter-inventory-gap'));
    assert.ok(!idsFor(assetFor(item)).some(id => id.includes('upper-floor')));
  }
  assert.deepEqual(idsFor({ type: 'meter', label: 'Water meter W1204084', unit: '149' }), siteResearch.siteEvidenceIds);
  assert.deepEqual(idsFor({ type: 'other', label: 'Water meter', bindings: [{ object_id: water[0].objectId }] }), siteResearch.siteEvidenceIds);
});

test('columns, fixtures, shutoffs and upper-floor units receive only applicable verification notes', () => {
  const column = researchEvidenceForAsset({ type: 'column', label: 'Renamed pillar' }).find(item => item.kind === 'verification-note');
  assert.match(column.notes, /39 numbered columns/);
  assert.match(column.notes, /37 stable column candidates/);
  assert.match(column.notes, /not field-confirmed/);
  assert.match(column.notes, /C25\/C26/);
  for (const item of fixtureSeeds) {
    const evidence = researchEvidenceForAsset(assetFor(item));
    const notes = evidence.filter(entry => entry.kind === 'verification-note');
    assert.equal(notes.length, 1);
    assert.equal(notes[0].id, item.metadata.assetKind === 'bench' ? 'otb-bench-model-assumptions' : 'otb-waste-bin-model-assumptions');
    assert.match(notes[0].notes, /assumption/);
    assert.match(notes[0].notes, /unverified/);
  }
  const shutoff = researchEvidenceForAsset({ type: 'shutoff' }).find(item => item.kind === 'verification-note');
  assert.match(shutoff.notes, /37 tenant shutoffs/);
  assert.match(shutoff.notes, /remain unassigned/);
  for (const unit of ['101', '103']) {
    const note = researchEvidenceForAsset({ type: 'unit', unit, label: 'Renamed suite' }).find(item => item.kind === 'verification-note');
    assert.equal(note.id, `otb-unit-${unit}-upper-floor-verification`);
    assert.match(note.notes, /3\.05 m/);
    assert.match(note.notes, /heights are unverified/);
    assert.match(note.notes, /not measured tread\/riser/);
  }
  assert.deepEqual(idsFor({ type: 'unit', unit: '105', label: 'Unit 101' }), siteResearch.siteEvidenceIds);
  assert.deepEqual(idsFor({ type: 'unit', label: '103' }), siteResearch.siteEvidenceIds);
});

test('suggestions are fresh copies and never mutate permanent asset identity or attached evidence', () => {
  const source = infrastructure.items.find(item => item.metadata?.utility === 'water');
  const asset = assetFor(source, { verification: 'field-verified' });
  const suggestions = researchEvidenceForAsset(asset);
  const attached = suggestions.map(item => ({ ...item, asset_id: asset.id }));
  asset.evidence = attached;
  const before = JSON.parse(JSON.stringify(asset));
  suggestions[0].notes = 'Caller edited its suggestion';
  assert.notEqual(researchEvidenceForAsset(asset)[0].notes, suggestions[0].notes);
  assert.deepEqual(asset, before);
  asset.label = 'New name';
  asset.bindings = [{ source_key: 'replacement-model:unidentified' }];
  const next = researchEvidenceForAsset(asset);
  assert.deepEqual(asset.evidence, attached, 'Binding changes do not detach existing evidence');
  assert.ok(asset.evidence.every(item => item.asset_id === asset.id));
  assert.ok(next.every(item => item.status === 'reference'), 'An inspected asset does not turn source references into field observations');
});
