import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {chooseEyePlacement,modelDistance} from '../src/lib/asset-twin-scene-math.js';

const data=JSON.parse(await fs.readFile(new URL('../public/twin/model-data.json',import.meta.url),'utf8'));
const buffer=await fs.readFile(new URL('../public/twin/model.glb',import.meta.url));
const gltf=await new GLTFLoader().parseAsync(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength),'');
gltf.scene.updateMatrixWorld(true);
const walls=gltf.scene.getObjectByName('walls'),walkway=gltf.scene.getObjectByName('walkway'),columns=[];
gltf.scene.traverse(mesh=>{if(mesh.isMesh&&mesh.userData.category==='columns')columns.push(mesh);});
test('every registered source column has a meter-scaled GLB object with matching stable ID',()=>{
  assert.equal(data.columns.length,37);assert.equal(columns.length,data.columns.length);
  for(const c of data.columns){const mesh=columns.find(m=>m.userData.assetId===c.id);assert.ok(mesh,c.id);const size=new THREE.Box3().setFromObject(mesh).getSize(new THREE.Vector3()).toArray();size.forEach((v,i)=>assert.ok(Math.abs(v-c.dimensionsMeters[i])<.0001));assert.ok(modelDistance(c.boundsMeters.min,c.boundsMeters.max)>3);}
});
test('all 37 source columns have unobstructed eye positions on the actual source walkway',()=>{
  const failed=[],offWalkway=[];
  for(const c of data.columns){
    const placement=chooseEyePlacement(c,data.columns,data.centerMeters,(position,target)=>{
      const origin=new THREE.Vector3().fromArray(position),aim=new THREE.Vector3().fromArray(target),direction=aim.clone().sub(origin).normalize();
      const ray=new THREE.Raycaster(origin,direction,.03,origin.distanceTo(aim)-.6);
      const blocked=ray.intersectObject(walls,true).some(h=>h.object.isMesh)||ray.intersectObjects(columns.filter(m=>m.userData.assetId!==c.id),false).length>0;
      if(blocked)return {clear:false,onWalkway:false};
      ray.set(new THREE.Vector3(position[0],10,position[2]),new THREE.Vector3(0,-1,0));ray.near=0;ray.far=20;
      return {clear:true,onWalkway:ray.intersectObject(walkway,true).some(h=>h.object.isMesh)};
    });
    if(!placement)failed.push(c.label);else if(!placement.onWalkway)offWalkway.push(c.label);
  }
  assert.deepEqual(failed,[],'Columns with no clear eye placement');
  assert.deepEqual(offWalkway,[],'Eye placements outside the supplied walkway');
});
