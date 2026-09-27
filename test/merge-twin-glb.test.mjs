import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {mergeGlbs,parseGlb,validateGlb,writeGlb} from '../tools/merge-twin-glb.mjs';

const files=['model.glb','upper-floors.glb','fixtures.glb','site-context.glb'];
const sources=files.map(name=>({name,bytes:fs.readFileSync(new URL(`../public/twin/${name}`,import.meta.url))}));

test('complete GLB round trip preserves every source primitive, byte range, material, node identity and extras',()=>{
  const result=mergeGlbs(sources), merged=parseGlb(result.bytes);assert.equal(validateGlb(merged),true);
  for(const [sourceIndex,source]of sources.entries()){
    const input=parseGlb(source.bytes), provenance=result.report.sourceDocuments[sourceIndex];
    // Every original source node name/ID remains independently identifiable.
    const group=merged.json.nodes[provenance.sourceGroupNode];
    const originalRoot=input.json.scenes[input.json.scene||0].nodes[0];
    const nodeOffset=group.children[0]-originalRoot;
    input.json.nodes.forEach((node,index)=>{
      const output=merged.json.nodes[index+nodeOffset];
      assert.equal(output.name,node.name);assert.deepEqual(output.extras,node.extras);
      for(const key of ['translation','rotation','scale','matrix'])assert.deepEqual(output[key],node[key]);
    });
    input.json.bufferViews.forEach(view=>{
      const offset=view.byteOffset||0;
      assert.deepEqual(merged.bin.subarray(provenance.binaryOffset+offset,provenance.binaryOffset+offset+view.byteLength),input.bin.subarray(offset,offset+view.byteLength));
    });
    const meshOffset=merged.json.nodes[nodeOffset+input.json.nodes.findIndex(n=>n.mesh!==undefined)].mesh-input.json.nodes.find(n=>n.mesh!==undefined).mesh;
    input.json.meshes.forEach((mesh,index)=>{
      const target=merged.json.meshes[meshOffset+index];assert.equal(target.primitives.length,mesh.primitives.length);
      mesh.primitives.forEach((p,i)=>{
        const output=target.primitives[i];assert.equal(output.mode,p.mode);
        assert.deepEqual(merged.json.materials[output.material],input.json.materials[p.material]);
        for(const name of Object.keys(p.attributes)){
          const old=input.json.accessors[p.attributes[name]],next=merged.json.accessors[output.attributes[name]];
          assert.deepEqual({...next,bufferView:old.bufferView},old);
        }
      });
    });
  }
});

test('complete default scene reaches columns, upper levels, fixtures and every site zone with no export-only hidden geometry',()=>{
  const {json}=parseGlb(mergeGlbs(sources).bytes), reached=new Set();
  function visit(i){assert.ok(!reached.has(i),'source hierarchy must not share or cycle nodes');reached.add(i);for(const c of json.nodes[i].children||[])visit(c);}
  for(const node of json.scenes[json.scene].nodes)visit(node);
  const nodes=[...reached].map(i=>json.nodes[i]);
  const base=parseGlb(sources[0].bytes).json;
  const columns=base.nodes.filter(n=>n.name?.startsWith('column_'));
  assert.equal(columns.length,37);
  assert.deepEqual(nodes.filter(n=>n.name?.startsWith('column_')).map(n=>n.extras),columns.map(n=>n.extras));
  const upperNodes=nodes.filter(n=>n.extras?.level===2);
  assert.equal(upperNodes.length,8);
  assert.deepEqual(upperNodes.filter(n=>n.children?.length).map(n=>n.name).sort(),['upper-101','upper-103']);
  assert.ok(nodes.some(n=>n.name==='canopy'));
  const fixtureGroups=nodes.filter(n=>n.children?.length&&n.extras?.sourceKey?.startsWith('otb-a1-register:'));
  assert.equal(fixtureGroups.length,30);
  assert.equal(fixtureGroups.filter(n=>n.extras.assetKind==='bench').length,10);
  assert.equal(fixtureGroups.filter(n=>n.extras.assetKind==='waste_bin').length,20);
  assert.equal(new Set(fixtureGroups.map(n=>n.extras.sourceKey)).size,30);
  const siteCatalog=JSON.parse(fs.readFileSync(new URL('../public/twin/site-context.json',import.meta.url)));
  const siteGroups=nodes.filter(n=>n.children?.length&&n.extras?.siteZoneId);
  assert.equal(siteGroups.length,siteCatalog.zones.length);
  assert.deepEqual(siteGroups.map(n=>n.extras.siteZoneId).sort(),siteCatalog.zones.map(z=>z.id).sort());
  for(const zone of siteCatalog.zones){
    const group=siteGroups.find(n=>n.extras.siteZoneId===zone.id);
    assert.equal(group.extras.siteCategory,zone.kind);
    assert.equal(group.extras.contextOnly,zone.contextOnly===true);
    assert.equal(group.extras.physicalVerification,'unverified');
    assert.equal(group.extras.presentationElevationOnly,true);
    for(const child of group.children){
      assert.equal(json.nodes[child].extras.siteZoneId,zone.id);
      assert.equal(json.nodes[child].extras.physicalVerification,'unverified');
    }
  }
  assert.ok(siteGroups.some(n=>n.extras.siteZoneId==='lot-7'));
  assert.ok(siteGroups.some(n=>n.extras.siteZoneId==='jd-bank-context'&&n.extras.contextOnly));
  assert.equal(reached.size,json.nodes.length);
});

test('downloadable complete model includes the current base, upper-floor, fixture and site-context documents',()=>{
  const {json}=parseGlb(fs.readFileSync(new URL('../public/twin/complete-model.glb',import.meta.url)));
  const expected=mergeGlbs(sources).report.sourceDocuments.map(({file,sha256})=>({file,sha256}));
  assert.deepEqual(json.extras.sourceDocuments.map(({file,sha256})=>({file,sha256})),expected);
  const siteSource=json.extras.sourceDocuments.find(source=>source.file==='site-context.glb');
  assert.equal(json.nodes[siteSource.sourceGroupNode].name,'source-site-context');
  assert.ok(json.scenes[json.scene].nodes.includes(siteSource.sourceGroupNode));
});

test('malformed input and unsupported extension references fail instead of silently corrupting the package',()=>{
  const damaged=Buffer.from(sources[0].bytes);damaged.writeUInt32LE(1,8);
  assert.throws(()=>parseGlb(damaged),/declared length/);
  assert.throws(()=>mergeGlbs([sources[0]]),/At least two/);
  const unsupported=parseGlb(sources[0].bytes);
  unsupported.json.nodes[0].extensions={KHR_unknown:{node:0}};
  assert.throws(()=>parseGlb(writeGlb(unsupported.json,unsupported.bin)),/explicit index-remapping support/);
});
