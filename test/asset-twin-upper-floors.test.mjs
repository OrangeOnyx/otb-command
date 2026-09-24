import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const dir=new URL('../public/twin/',import.meta.url);
const data=JSON.parse(await fs.readFile(new URL('upper-floors.json',dir),'utf8'));
const bytes=await fs.readFile(new URL('upper-floors.glb',dir));
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
gltf.scene.updateMatrixWorld(true);
const center=points=>points.reduce((sum,p)=>sum.map((n,i)=>n+p[i]/points.length),[0,0]);
const rayDown=(mesh,x,z)=>new THREE.Raycaster(new THREE.Vector3(x,10,z),new THREE.Vector3(0,-1,0),0,20).intersectObject(mesh,false);

test('additive upper GLB loads with finite meter geometry and separate unit roots',()=>{
  assert.equal(bytes.readUInt32LE(0),0x46546c67);
  assert.equal(bytes.readUInt32LE(4),2);
  assert.equal(bytes.readUInt32LE(8),bytes.length);
  assert.deepEqual(data.layers.map(l=>l.id),['upper-101','upper-103']);
  assert.equal(data.units,'meters');
  for(const layer of data.layers){
    const root=gltf.scene.getObjectByName(layer.id);
    assert.ok(root,layer.id);assert.equal(root.userData.level,2);
    const bounds=new THREE.Box3().setFromObject(root);
    bounds.min.toArray().forEach((n,i)=>assert.ok(Math.abs(n-layer.boundsMeters.min[i])<1e-5));
    bounds.max.toArray().forEach((n,i)=>assert.ok(Math.abs(n-layer.boundsMeters.max[i])<1e-5));
    root.traverse(mesh=>{
      if(!mesh.isMesh)return;
      assert.equal(mesh.userData.layerId,layer.id);
      assert.ok(['walls','floors'].includes(mesh.userData.category));
      assert.ok([...mesh.geometry.attributes.position.array].every(Number.isFinite));
      const normals=mesh.geometry.attributes.normal;
      for(let i=0;i<normals.count;i++)assert.ok(Math.abs(Math.hypot(normals.getX(i),normals.getY(i),normals.getZ(i))-1)<1e-5);
    });
  }
});

test('central and rear stair voids are real holes in the upper-floor meshes',()=>{
  for(const layer of data.layers){
    const floors=gltf.scene.getObjectByName(`${layer.id}-floors`);
    for(const opening of layer.voids){
      const centroid=center(opening.outer);
      // Test the center and several points inside the void, away from edge tolerance.
      const probes=[centroid,...opening.outer.map(p=>p.map((n,i)=>n*.8+centroid[i]*.2))];
      for(const [x,z] of probes)assert.equal(rayDown(floors,x,z).length,0,`${opening.id} filled at ${x},${z}`);
    }
    // Each native area must retain at least one interior floor probe.
    for(const floor of layer.floors){
      const centroid=center(floor.outer);
      const probes=[centroid,...floor.outer.map(p=>p.map((n,i)=>n*.8+centroid[i]*.2))];
      assert.ok(probes.some(([x,z])=>rayDown(floors,x,z).length>0),`${floor.id} has no floor surface`);
    }
  }
});

test('native door openings remain empty through the wall thickness',()=>{
  let checked=0;
  for(const layer of data.layers){
    const mesh=gltf.scene.getObjectByName(`${layer.id}-walls`);
    for(const wall of layer.walls)for(const opening of wall.openings){
      const dx=wall.b[0]-wall.a[0],dz=wall.b[2]-wall.a[2],length=Math.hypot(dx,dz);
      const normal=new THREE.Vector3(-dz/length,0,dx/length);
      const midpoint=new THREE.Vector3(wall.a[0]+dx*opening.t,wall.a[1]+opening.bottomMeters+opening.heightMeters/2,wall.a[2]+dz*opening.t);
      const radius=wall.thicknessMeters+.005;
      const ray=new THREE.Raycaster(midpoint.clone().addScaledVector(normal,radius),normal.clone().negate(),0,radius*2);
      assert.equal(ray.intersectObject(mesh,false).length,0,opening.id);
      checked++;
    }
  }
  assert.equal(checked,data.validation.doorVoidCount);
  assert.ok(checked>10);
});

test('101 stays a rear strip and source height discrepancies remain explicit',()=>{
  const unit101=data.layers.find(l=>l.unit==='101');
  assert.ok(unit101.boundsMeters.max[2]-unit101.boundsMeters.min[2]<5.5);
  assert.ok(unit101.boundsMeters.max[0]-unit101.boundsMeters.min[0]>21);
  assert.equal(data.verticalDiscrepancy.upperBaseMeters,3.05);
  assert.ok(Math.abs(data.verticalDiscrepancy.overlapMeters-.8362)<1e-6);
  assert.equal(data.verticalDiscrepancy.physicalFloorToFloorHeightMeters,null);
  assert.equal(data.registration.scale,1);
  assert.equal(data.registration.rotationDegrees,0);
  assert.ok(data.registration.controls.every(p=>p.residualMeters<.00002));
  assert.ok(data.registration.independentCheck.residualMeters>.15);
  for(const layer of data.layers)for(const stair of layer.stairs){
    assert.equal(stair.treadsModeled,false);
    assert.ok(stair.quad.every(p=>p[1]>=0&&p[1]<=3.05));
  }
});

test('existing model bytes and all 37 source column IDs remain intact',async()=>{
  const original=await fs.readFile(new URL('model.glb',dir));
  const originalData=JSON.parse(await fs.readFile(new URL('model-data.json',dir),'utf8'));
  assert.equal(crypto.createHash('sha256').update(original).digest('hex'),data.preservation.baseModelSha256);
  assert.equal(data.preservation.existingModelChanged,false);
  assert.equal(data.preservation.originalColumnIds.length,37);
  assert.deepEqual(data.preservation.originalColumnIds,originalData.columns.map(c=>c.id));
});
