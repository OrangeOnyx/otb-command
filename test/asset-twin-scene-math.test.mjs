import test from 'node:test';
import assert from 'node:assert/strict';
import {
  boundsCorners,buildEyeCandidates,chooseEyePlacement,fitPerspectiveToBounds,modelDistance,
  normalizeFinishPalette,normalizeSectionHeight,pointInBounds,validateSavedView,
} from '../src/lib/asset-twin-scene-math.js';

const bounds={min:[-95,0,-42],max:[95,3.8862,41]};
const dot=(a,b)=>a.reduce((sum,x,i)=>sum+x*b[i],0);
test('model measurement preserves real 3D meter distance and rejects out-of-model picks',()=>{
  assert.equal(modelDistance([0,0,0],[3,4,12]),13);
  assert.equal(modelDistance([1,2,3],[1,2,3],bounds),0);
  assert.throws(()=>modelDistance([0,0,0],[1,NaN,3]),TypeError);
  assert.throws(()=>modelDistance([0,0,0],[96,0,0],bounds),RangeError);
  assert.throws(()=>modelDistance([0,0,0],['1',0,0]),TypeError);
  assert.equal(pointInBounds([0,4,0],bounds),false);
});
test('overview fit keeps every model corner inside portrait and wide landscape camera frames',()=>{
  for(const aspect of [.35,1,2.4]){
    const fit=fitPerspectiveToBounds(bounds,{aspect,fov:43});const tangent=Math.tan(43*Math.PI/360);
    for(const corner of boundsCorners(bounds)){
      const offset=corner.map((v,i)=>v-fit.position[i]),depth=dot(offset,fit.forward);
      assert.ok(depth>0);
      assert.ok(Math.abs(dot(offset,fit.right)/(depth*tangent*aspect))<1,`horizontal corner escapes aspect ${aspect}`);
      assert.ok(Math.abs(dot(offset,fit.up)/(depth*tangent))<1,`vertical corner escapes aspect ${aspect}`);
    }
  }
  assert.throws(()=>fitPerspectiveToBounds(bounds,{aspect:0}),RangeError);
});
test('eye candidates remain finite without mutating source records, including centered singleton',()=>{
  const c={id:'one',position:[0,1.9431,0]},before=structuredClone(c);const built=buildEyeCandidates(c,[c],[0,1.9431,0]);
  assert.equal(built.candidates.length,49);assert.deepEqual(c,before);
  assert.ok(built.candidates.every(p=>p.every(Number.isFinite)&&p[1]===1.68));
});
test('eye placement refuses blocked fallbacks and prioritizes an available walkway point',()=>{
  const c={id:'one',position:[0,1.9431,0]},columns=[c];
  assert.equal(chooseEyePlacement(c,columns,[10,1,0],()=>({clear:false,onWalkway:true})),null);
  const placement=chooseEyePlacement(c,columns,[10,1,0],p=>({clear:true,onWalkway:p[0]<0}));
  assert.ok(placement.position[0]<0);assert.equal(placement.onWalkway,true);
});
test('saved views reject invalid vectors, unknown layers, and out-of-range section heights',()=>{
  const view={version:1,mode:'overview',position:[0,70,-120],target:[0,1,0],zoom:1,layers:{walls:true},sectionHeight:null};
  assert.equal(validateSavedView(view,bounds,['walls']),true);
  for(const mutation of [{position:[NaN,1,1]},{position:[0,-8,0]},{target:[0,70,-120]},{layers:{fake:true}},{sectionHeight:10},{zoom:0}])assert.equal(validateSavedView({...view,...mutation},bounds,['walls']),false);
  assert.equal(normalizeSectionHeight(-3,bounds),0);
  assert.equal(normalizeSectionHeight(100,bounds),3.8862);
  assert.equal(normalizeSectionHeight(null,bounds),null);
  assert.throws(()=>normalizeSectionHeight(Infinity,bounds),TypeError);
});
test('neutral finish resets a prior reference palette without accepting malformed color instructions',()=>{
  const existing={walls:'#e6e2d7',canopyTop:'#666760'};
  assert.deepEqual(normalizeFinishPalette(null,existing),{});
  assert.deepEqual(normalizeFinishPalette({columns:'#fff',walls:'url(example)',unknown:'#123456'},existing),{...existing,columns:'#fff'});
  assert.deepEqual(existing,{walls:'#e6e2d7',canopyTop:'#666760'});
});

test('saved-view validation accepts legacy ground views and explicit upper-floor views in the combined model',()=>{
  const combinedBounds={min:[-95,0,-42],max:[95,6.9362,41]};
  const layerIds=['walls','floors','walkway','columns','canopy','assets','ground','upper-101','upper-103'];
  const legacy={version:1,mode:'overview',position:[0,70,-120],target:[0,1,0],zoom:1,
    layers:{walls:true,floors:true,walkway:true,columns:true,canopy:false,assets:true},sectionHeight:null};
  assert.equal(validateSavedView(legacy,combinedBounds,layerIds),true,'Old layer maps remain valid after adding levels');
  const upper={...legacy,position:[80,18,22],target:[66,4.5,25],sectionHeight:5.5,
    layers:{...legacy.layers,ground:false,'upper-101':false,'upper-103':true}};
  const before=structuredClone(upper);
  assert.equal(validateSavedView(upper,combinedBounds,layerIds),true);
  assert.deepEqual(upper,before,'Validation must preserve saved camera and layer state');
  assert.equal(validateSavedView({...upper,layers:{...upper.layers,'upper-999':true}},combinedBounds,layerIds),false);
  assert.equal(validateSavedView({...upper,sectionHeight:7},combinedBounds,layerIds),false);
});
