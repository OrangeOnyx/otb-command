import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';

const read=path=>JSON.parse(fs.readFileSync(new URL(path,import.meta.url),'utf8'));
const aerial=read('../src/data/twin-water-aerial.json');
const water=read('../src/data/twin-water-map.json');
const official=read('../src/data/twin-water-official-imagery.json');
const overview=aerial.sources.find(s=>s.id==='gis-overview');
const apply=(m,[x,z])=>[x*m[0][0]+z*m[1][0]+m[2][0],x*m[0][1]+z*m[1][1]+m[2][1]];
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const close=(a,b,label)=>assert.ok(Math.abs(a-b)<1e-6,`${label}: ${a} versus ${b}`);
const rms=n=>Math.sqrt(n.reduce((sum,x)=>sum+x*x,0)/n.length);

test('only the historical overview receives a comparison overlay; closeups remain unregistered support',()=>{
  assert.equal(aerial.modelSourceSha256,water.modelSourceSha256);
  assert.deepEqual(aerial.sources.map(s=>s.id),['gis-overview','gis-south','gis-west']);
  assert.equal(overview.registrationStatus,'approximate-visual-registration');
  assert.equal(overview.annotations.length,19);
  for(const source of aerial.sources){
    assert.deepEqual(source.imageSizePx,[1440,900]);
    assert.deepEqual(source.crop,{x:0,y:100,width:1420,height:723});
    assert.equal(source.dateDisplay,'2021-07-14');
    assert.equal(source.dateStatus,'taskbar date; aerial acquisition unknown');
    const image=fs.readFileSync(new URL(`../src/assets/twin/${source.sourceImage}`,import.meta.url));
    assert.equal(createHash('sha256').update(image).digest('hex'),source.sha256,source.id);
    if(source!==overview){
      assert.equal(source.registrationStatus,'unregistered-support-image');
      assert.deepEqual(source.annotations,[]);
      assert.deepEqual(source.controls,[]);
      assert.equal(source.transformModelXZToImage3x2,null);
      assert.equal(source.rmsImagePixels,null);
    }
  }
});

test('all source marker identities, confirmed counts and physical model positions are preserved',()=>{
  assert.deepEqual(overview.annotations.map(a=>a.id),water.annotations.map(a=>a.id));
  for(const projected of overview.annotations){
    const original=water.annotations.find(a=>a.id===projected.id);
    for(const key of ['category','label','markerLabelRaw','markerLabelMeaning','reportedCount','modelPositionMeters']){
      assert.deepEqual(projected[key],original[key],`${projected.id}: ${key}`);
    }
    assert.equal(projected.independentLocationConfirmation,false);
    assert.equal(projected.physicalVerification,'not-field-verified');
    assert.equal(projected.positionStatus,'projected-existing-reference');
    assert.equal(projected.physicalAssetId,null);
    assert.deepEqual(projected.memberMeterIds,[]);
    assert.deepEqual(projected.servedUnits,[]);
  }
  assert.equal(overview.annotations.filter(a=>a.category==='city-meter').reduce((sum,a)=>sum+a.reportedCount,0),24);
  assert.equal(overview.annotations.filter(a=>a.category==='tenant-shutoff').reduce((sum,a)=>sum+a.reportedCount,0),37);
});

test('the four model-to-image controls reproduce honest residuals using a similarity transform without shear',()=>{
  assert.equal(overview.controls.length,4);
  const matrix=overview.transformModelXZToImage3x2;
  const errors=[];
  for(const control of overview.controls){
    const original=water.registration.controls.find(c=>c.id===control.id);
    assert.ok(original,control.id);
    assert.deepEqual(control.modelXZ,original.targetModelXZ);
    const projected=apply(matrix,control.modelXZ);
    const error=distance(projected,[control.observedImagePoint.x,control.observedImagePoint.y]);
    close(error,control.residualImagePixels,`${control.id} residual`);
    assert.ok(distance(projected,control.projectedImagePoint)<1e-6);
    errors.push(error);
  }
  close(rms(errors),overview.rmsImagePixels,'Overview RMS');
  close(Math.max(...errors),overview.maxResidualImagePixels,'Overview maximum');
  assert.ok(overview.rmsImagePixels>8&&overview.rmsImagePixels<9);
  assert.ok(overview.maxResidualImagePixels<13);
  const scaleX=Math.hypot(...matrix[0]),scaleZ=Math.hypot(...matrix[1]);
  close(scaleX,scaleZ,'Uniform scale');
  close(matrix[0][0]*matrix[1][0]+matrix[0][1]*matrix[1][1],0,'No shear');
  assert.ok(matrix[0][0]*matrix[1][1]-matrix[0][1]*matrix[1][0]>0,'No reflection');
  const heldOut=overview.controls.map(c=>c.leaveOneOutResidualImagePixels);
  close(rms(heldOut),overview.leaveOneOutRmsImagePixels,'Holdout RMS');
  close(Math.max(...heldOut),overview.leaveOneOutMaxImagePixels,'Holdout maximum');
  assert.ok(overview.leaveOneOutMaxImagePixels>overview.maxResidualImagePixels);
  assert.ok(overview.leaveOneOutMaxImagePixels<20);
});

test('projected coordinates use full screenshot pixels and crop inclusion is calculated without moving markers',()=>{
  const crop=overview.crop;
  for(const annotation of overview.annotations){
    const p=annotation.modelPositionMeters;
    const projected=apply(overview.transformModelXZToImage3x2,[p[0],p[2]]);
    close(projected[0],annotation.imagePoint.x,`${annotation.id} x`);
    close(projected[1],annotation.imagePoint.y,`${annotation.id} y`);
    const inside=projected[0]>=crop.x&&projected[0]<=crop.x+crop.width&&projected[1]>=crop.y&&projected[1]<=crop.y+crop.height;
    assert.equal(annotation.inCrop,inside);
    assert.equal(annotation.inCrop,true);
    assert.ok(annotation.imagePoint.y>100,'Toolbar crop offset has not been incorrectly subtracted from stored coordinates');
  }
});

test('the weak DOTD attempt is withheld from renderable sources while its failed sensitivity checks remain auditable',()=>{
  assert.equal(aerial.withheldRegistrations.length,1);
  const withheld=aerial.withheldRegistrations[0];
  assert.equal(withheld.registrationStatus,'withheld-insufficient-control');
  assert.equal(withheld.transformModelXZToImage3x2,undefined);
  assert.equal(withheld.candidateTransformModelXZToImage3x2.length,3);
  assert.deepEqual(withheld.annotations,[]);
  assert.equal(aerial.sources.some(s=>s.sourceImage===withheld.sourceImage),false);
  assert.equal(withheld.controls.length,4);
  const errors=withheld.controls.map(c=>distance(apply(withheld.candidateTransformModelXZToImage3x2,c.modelXZ),[c.observedImagePoint.x,c.observedImagePoint.y]));
  close(rms(errors),withheld.rmsImagePixels,'Withheld RMS');
  close(Math.max(...errors),withheld.maxResidualImagePixels,'Withheld maximum');
  const heldOut=withheld.controls.map(c=>c.leaveOneOutResidualImagePixels);
  close(rms(heldOut),withheld.leaveOneOutRmsImagePixels,'Withheld holdout RMS');
  close(Math.max(...heldOut),withheld.leaveOneOutMaxImagePixels,'Withheld holdout maximum');
  assert.ok(withheld.leaveOneOutMaxImagePixels>80,'Unacceptable far-end sensitivity is not hidden');
  assert.ok(withheld.wingScaleCheck.longToShortRatio>1.07,'Wing scale discrepancy remains explicit');
  assert.equal(withheld.sha256,official.provenance.imageSHA256);
  assert.deepEqual(withheld.officialProvenance,official.provenance);
  assert.deepEqual(withheld.officialImageGeoreferencing,official.georeferencing);
  assert.equal(official.sources[0].registrationStatus,'unregistered-context-only');
  assert.deepEqual(official.sources[0].annotations,[]);
});
