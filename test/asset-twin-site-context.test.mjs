import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createSiteContextModel, pointInSiteZone, planPointToModel, SITE_CONTEXT_CATEGORIES } from '../src/lib/asset-twin-site-context.js';
import { sourcePathPolygon } from '../tools/build-twin-site-context.mjs';
import { parseGlb, validateGlb } from '../tools/merge-twin-glb.mjs';
const read = file => fs.readFileSync(new URL(file,import.meta.url));
const catalog=JSON.parse(read('../public/twin/site-context.json'));
const geometry=JSON.parse(read('../src/data/geometry.json'));
const bytes=read('../public/twin/site-context.glb');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');

test('site artifact provenance and binary bytes match current source files',()=>{
  for(const source of catalog.sources)assert.equal(source.sha256,sha(read(`../${source.path}`)));
  assert.equal(catalog.glbSha256,sha(bytes)); assert.equal(catalog.glbBytes,bytes.length);
  validateGlb(parseGlb(bytes));
});

test('site registration uses verified identical A-1 corners and preserves the existing native frame',()=>{
  assert.equal(catalog.registration.frameChecks.length,8);
  for(const check of catalog.registration.frameChecks){
    assert.ok(check.frameDifferencePx<.025);
    const actual=planPointToModel(check.planPoint,catalog.registration.matrix3x2);
    actual.forEach((n,i)=>assert.ok(Math.abs(n-check.modelPointMeters[i])<1e-6));
    assert.ok(check.nearestVertexDistanceMeters<3);
  }
  const front=catalog.registration.frameChecks.find(c=>c.id==='long_101_front');
  assert.deepEqual(front.planPoint,[geometry.units['101'].x,geometry.units['101'].y+geometry.units['101'].h]);
  assert.ok(catalog.registration.rmsMeters>.5 && catalog.registration.rmsMeters<.6);
  assert.match(catalog.registration.note,/not field accuracy/);
  assert.throws(()=>planPointToModel([NaN,0],catalog.registration.matrix3x2),/finite/);
});

test('native Y-up surfaces raycast from above and exported zone identity survives GLB load',async()=>{
  const procedural=createSiteContextModel(catalog);
  const loaded=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const ids=new Set(catalog.zones.map(z=>z.id)); assert.equal(ids.size,catalog.zones.length);
  const validKinds=new Set(SITE_CONTEXT_CATEGORIES.map(c=>c.id));
  for(const zone of catalog.zones){
    assert.ok(validKinds.has(zone.kind));
    assert.equal(zone.physicalVerification,'unverified');
    assert.ok(zone.polygonMeters.flat().every(Number.isFinite));
    assert.ok(zone.polygonMeters.every(p=>p[1]>-.1 && p[1]<.1),'Offsets should be rendering offsets, not fabricated grades');
    const object=loaded.scene.getObjectByName(`site-zone-${zone.id}`);assert.ok(object,zone.id);
    assert.equal(object.userData.siteZoneId,zone.id);assert.equal(object.userData.siteCategory,zone.kind);
    object.updateWorldMatrix(true,true);
    // At least one triangle centroid must be visible from directly above the surface.
    const mesh=object.children.find(o=>o.userData.surfacePart==='surface'),p=mesh.geometry.getAttribute('position'),index=mesh.geometry.getIndex();
    const center=new THREE.Vector3();for(let i=0;i<3;i++)center.add(new THREE.Vector3().fromBufferAttribute(p,index?index.getX(i):i));center.multiplyScalar(1/3);
    const ray=new THREE.Raycaster(center.clone().add(new THREE.Vector3(0,2,0)),new THREE.Vector3(0,-1,0));
    assert.ok(ray.intersectObject(mesh).length,`Upward ray target ${zone.id}`);
    assert.ok(pointInSiteZone(center.toArray(),zone),`Interior triangle belongs to ${zone.id}`);
  }
  for(const root of [procedural,loaded.scene])root.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
});

test('off-parcel references and broad meter searches cannot imply managed or exact assets',()=>{
  const bank=catalog.zones.find(z=>z.id==='jd-bank-context');
  assert.equal(bank.contextOnly,true);assert.equal(bank.assetRecord,false);assert.match(bank.notes,/NOT A PART/);
  for(const zone of catalog.zones.filter(z=>z.kind==='roads')){assert.equal(zone.contextOnly,true);assert.equal(zone.assetRecord,false);}
  const search=catalog.searchAreas.find(s=>s.meterId==='W1217102');assert.equal(search.position,null);assert.equal(search.verification,'unverified');
  assert.ok(search.zoneIds.length>1);for(const id of search.zoneIds)assert.equal(catalog.zones.find(z=>z.id===id).kind,'landscape');
  assert.equal(catalog.parking.platLabeledCount,314);assert.equal(catalog.parking.varianceProvidedCount,324);
  assert.equal(catalog.parking.reconciliationStatus,'pending-field-confirmation');
});

test('source arc conversion retains endpoints and rejects unsupported source commands',()=>{
  const polygon=sourcePathPolygon('M 0 0 L 10 0 A 10 10 0 0 1 0 10 Z');
  assert.deepEqual(polygon[0],[0,0]);assert.deepEqual(polygon[1],[10,0]);
  const last=polygon.at(-1);assert.ok(Math.abs(last[0])<1e-8 && Math.abs(last[1]-10)<1e-8);
  assert.throws(()=>sourcePathPolygon('M 0 0 C 1 2 3 4 5 6 Z'),/Unsupported/);
});
