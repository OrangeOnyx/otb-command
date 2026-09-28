import test from 'node:test';
import assert from 'node:assert/strict';
import {assetTwinLink,readAssetTwinLink,shouldAutoOpenTwin,assetQrSvg,latestLocatedBinding,sourceObjectForAsset} from '../src/lib/asset-twin-links.js';
import {cleanSourceBinding} from '../src/lib/physical-assets-model.js';
const id='pa_a54bac91-97f6-4a3a-9c67-ac35829dff53';
test('asset link retains permanent ID and drops unrelated query credentials',()=>{
  const link=assetTwinLink('https://example.com/app?token=secret#roll',id);
  assert.equal(link,`https://example.com/app?view=twin&asset=${id}#spatial`);
  assert.deepEqual(readAssetTwinLink(link),{open:true,assetId:id});
  assert.equal(readAssetTwinLink('https://example.com/?view=twin&asset=C12').assetId,null);
  assert.throws(()=>assetTwinLink('javascript:alert(1)',id));
  assert.throws(()=>assetTwinLink('https://user:password@example.com',id));
});
test('QR is generated locally as SVG with a quiet margin',()=>{
  const svg=assetQrSvg(assetTwinLink('https://example.com/',id));
  assert.match(svg,/<svg /); assert.match(svg,/<path /); assert.doesNotMatch(svg,/<(?:script|image|iframe)\b/);
});
test('replacement model binding changes location without changing asset identity or history',()=>{
  const asset={id,inspections:[{id:'history'}],bindings:[{object_id:'old',created_at:'2026-01-01',metadata:{position:[1,2,3]}},{object_id:'new',created_at:'2026-02-01',metadata:{position:[4,5,6]}},{object_id:'invalid',created_at:'2026-03-01',metadata:{position:[NaN,0,0]}}]};
  assert.deepEqual(latestLocatedBinding(asset).metadata.position,[4,5,6]);
  assert.equal(sourceObjectForAsset(asset,[{id:'new'}]),'new');
  assert.equal(asset.id,id);assert.equal(asset.inspections.length,1);
});

test('latest explicit upper-floor placement keeps its source level across JSON persistence and later invalid bindings',()=>{
  const upperBinding=cleanSourceBinding(id,{sourceKey:'operator-upper-placement',modelId:'otb-floorplanner',modelVersion:'placement-1',objectId:id,
    metadata:{position:[66,3.05,25],source:{meshAssetId:'upper-103-floors',category:'floors',layerId:'upper-103'},placement:'operator-placed-unverified'}},'2026-09-24T10:00:00Z');
  const asset={id,bindings:[
    {source_key:'imported-ground-reference',created_at:'2026-09-23T10:00:00Z',metadata:{position:[66,0,25]}},
    upperBinding,
    {source_key:'unlocated-new-source',created_at:'2026-09-24T11:00:00Z',metadata:{source:{layerId:'ground'}}},
  ]};
  const restored=JSON.parse(JSON.stringify(asset));
  const binding=latestLocatedBinding(restored);
  assert.equal(binding.source_key,'operator-upper-placement');
  assert.deepEqual(binding.metadata.position,[66,3.05,25]);
  assert.equal(binding.metadata.source.layerId,'upper-103');
  assert.equal(binding.metadata.source.meshAssetId,'upper-103-floors');
  assert.equal(binding.metadata.placement,'operator-placed-unverified');
  assert.equal(binding.asset_id,id);
  assert.equal(restored.id,id);
  assert.equal(restored.bindings.length,3,'Finding a location does not remove older source associations');
});

test('only a fresh shared asset link reopens the twin; reloads land on A-2',()=>{
  const link=`https://otb.example/?view=twin&asset=${id}#spatial`;
  assert.equal(shouldAutoOpenTwin(link,'navigate'),true);
  assert.equal(shouldAutoOpenTwin(link,'reload'),false);
  assert.equal(shouldAutoOpenTwin(link,'back_forward'),false);
  assert.equal(shouldAutoOpenTwin('https://otb.example/?view=twin#spatial','navigate'),false);
  assert.equal(shouldAutoOpenTwin('https://otb.example/?view=twin&layout=interior#spatial'),false);
  assert.equal(shouldAutoOpenTwin('https://otb.example/#spatial'),false);
});
