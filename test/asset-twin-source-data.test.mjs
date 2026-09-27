import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  infrastructure, fixtures, fixtureSeeds, sourceItems, sourceItemForAsset,
  sourceMetadata, sourceAssetKind, columnReference, sourceSearchText,
} from '../src/lib/asset-twin-source-data.js';

const model=JSON.parse(fs.readFileSync(new URL('../public/twin/model-data.json',import.meta.url),'utf8'));
const boundAsset=(sourceKey,overrides={})=>({
  id:'pa_permanent-test-id',label:'Operator renamed this asset',type:'other',unit:null,
  bindings:[{source_key:sourceKey}],...overrides,
});

test('fixture seeding adds only the 10 benches and 20 cans, preserving source provenance',()=>{
  assert.equal(fixtureSeeds.length,30);
  assert.equal(fixtureSeeds.filter(s=>s.metadata.assetKind==='bench').length,10);
  assert.equal(fixtureSeeds.filter(s=>s.metadata.assetKind==='waste_bin').length,20);
  assert.equal(new Set(fixtureSeeds.map(s=>s.sourceKey)).size,30);
  assert.ok(fixtureSeeds.every(s=>s.type==='other'&&s.unit===null));
  assert.ok(fixtureSeeds.every(s=>!s.objectId.startsWith('col-')&&!s.sourceKey.includes('column-')));
  for(const seed of fixtureSeeds){
    const reference=fixtures.items.find(item=>item.sourceKey===seed.sourceKey);
    assert.ok(reference,seed.sourceKey);
    assert.equal(reference.seedPolicy,'new_asset_candidate');
    assert.equal(seed.objectId,reference.id);
    assert.deepEqual(seed.metadata.position,reference.modelPositionMeters);
    assert.ok(seed.metadata.position.length===3&&seed.metadata.position.every(Number.isFinite));
    assert.equal(seed.metadata.physicalVerification,'not-verified');
    assert.equal(seed.metadata.positionStatus,'approximate_source_registered');
    assert.equal(seed.metadata.sourceRefs[0].file,'07 Columns, Benches, and Cans.pdf');
    assert.equal(seed.metadata.registrationRmsMeters,fixtures.registration.planToNative.rmsMeters);
    assert.equal(seed.metadata.registrationMaxMeters,fixtures.registration.planToNative.maxResidualMeters);
  }
});

test('combining fixtures retains every infrastructure record, including unlocated and shared associations',()=>{
  assert.equal(infrastructure.items.length,79);
  assert.equal(sourceItems.length,109);
  assert.equal(new Set(sourceItems.map(item=>item.sourceKey)).size,109);
  for(const original of infrastructure.items){
    assert.deepEqual(sourceItems.find(item=>item.sourceKey===original.sourceKey),original,original.sourceKey);
  }
  const sprinkler=sourceItemForAsset(boundAsset('utility-meter:water:W1217102'));
  assert.equal(sprinkler.unit,null);
  assert.equal(sprinkler.metadata.purposeRaw,'Sprinkler');
  assert.equal(sprinkler.metadata.position,undefined);
  const shared=sourceItemForAsset(boundAsset('time-clock-reference:131+133'));
  assert.equal(shared.unit,null);
  assert.deepEqual(shared.metadata.servedUnits,['131','133']);
  assert.equal(shared.metadata.physicalClockCount,null);
});

test('source lookup follows explicit bindings through renames and skips unrelated bindings',()=>{
  const source=infrastructure.items.find(item=>item.sourceKey==='utility-meter:water:W1204084');
  const asset=boundAsset(source.sourceKey,{
    label:'Water meter W1252003',unit:'149',type:'other',
    bindings:[{source_key:'operator:manual-placement'},{object_id:'W1252003'},{source_key:source.sourceKey}],
  });
  assert.equal(sourceItemForAsset(asset),source);
  assert.equal(sourceMetadata(asset).meterIdRaw,'W1204084');
  assert.equal(sourceAssetKind(asset),'utility_meter');
  const identicalLabel={label:source.label,type:'meter',unit:source.unit,bindings:[{object_id:source.objectId}]};
  assert.equal(sourceItemForAsset(identicalLabel),null);
  assert.deepEqual(sourceMetadata(identicalLabel),{});
  assert.equal(sourceAssetKind(identicalLabel),'meter');
  assert.equal(sourceItemForAsset(null),null);
  assert.equal(sourceItemForAsset({label:source.label}),null);
});

test('meter search retains raw source identifiers and location text after the asset is renamed',()=>{
  const water=boundAsset('utility-meter:water:W1204084',{label:'Rear service',unit:'101'});
  const electric=boundAsset('utility-meter:electric:E1103824',{label:'Electrical service',unit:'101'});
  assert.match(sourceSearchText(water),/w1204084/);
  assert.match(sourceSearchText(water),/behind 105/);
  assert.match(sourceSearchText(water),/water/);
  assert.match(sourceSearchText(electric),/e1103824/);
  assert.match(sourceSearchText(electric),/electric/);
  assert.doesNotMatch(sourceSearchText(electric),/w1204084/);
  assert.match(sourceSearchText(boundAsset('time-clock-reference:131+133')),/131.*133/);
  const operatorAsset={label:'Rear service',unit:'101',type:'meter',bindings:[]};
  assert.equal(sourceSearchText(operatorAsset),'rear service 101');
});

test('37 native column IDs link to candidate references without seeding or renumbering columns',()=>{
  const references=fixtures.items.filter(item=>item.kind==='column');
  assert.equal(references.length,39);
  assert.equal(model.columns.length,37);
  assert.equal(new Set(references.filter(r=>r.modelColumnId).map(r=>r.modelColumnId)).size,37);
  for(const column of model.columns){
    const reference=columnReference(column.id);
    assert.ok(reference,column.id);
    assert.equal(reference.modelColumnId,column.id);
    assert.equal(reference.crosswalk.modelLabel,column.label);
    assert.equal(reference.crosswalk.status,'candidate_link');
    assert.equal(reference.verificationStatus,'not_field_verified');
    assert.equal(reference.seedPolicy,'reference_only');
    assert.ok(reference.crosswalk.distanceMeters<=reference.crosswalk.toleranceMeters);
    assert.equal(sourceItems.some(item=>item.sourceKey===reference.sourceKey),false);
  }
  assert.deepEqual(references.filter(r=>!r.modelColumnId).map(r=>r.id),['col-01','col-02']);
  assert.equal(columnReference('C25'),null,'Display labels must not bind a physical column');
  assert.equal(columnReference('col-27'),null,'Source numbering must not replace native IDs');
  assert.equal(columnReference('column-not-present'),null);
  assert.equal(columnReference('column-45d9d6177283').id,'col-27');
  assert.equal(columnReference('column-887d27e648e6').id,'col-28');
  assert.equal(columnReference('column-45d9d6177283').crosswalk.nativeModelConfidence,'medium_model_pattern_match');
  assert.equal(columnReference('column-887d27e648e6').crosswalk.candidatesWithinTolerance.length,2);
});
