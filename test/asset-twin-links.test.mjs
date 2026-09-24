import test from 'node:test';
import assert from 'node:assert/strict';
import {assetTwinLink,readAssetTwinLink,assetQrSvg,latestLocatedBinding,sourceObjectForAsset} from '../src/lib/asset-twin-links.js';
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
