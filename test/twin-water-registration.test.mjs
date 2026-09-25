import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';

const read=path=>JSON.parse(fs.readFileSync(new URL(path,import.meta.url),'utf8'));
const water=read('../src/data/twin-water-map.json');
const infrastructure=read('../src/data/twin-infrastructure.json');
const fixtures=read('../src/data/twin-site-fixtures.json');
const model=read('../public/twin/model-data.json');
const apply=(m,[x,y])=>[x*m[0][0]+y*m[1][0]+m[2][0],x*m[0][1]+y*m[1][1]+m[2][1]];
const distance=(a,b)=>Math.hypot(...a.map((n,i)=>n-b[i]));
const inBounds=(p,b)=>p.every((n,i)=>n>=b.min[i]-1e-8&&n<=b.max[i]+1e-8);
const outsideDistance=(p,b)=>Math.hypot(...p.map((n,i)=>Math.max(b.min[i]-n,n-b.max[i],0)));
const close=(actual,expected,message)=>assert.ok(Math.abs(actual-expected)<1e-6,`${message}: ${actual} versus ${expected}`);

test('water overlay preserves all 19 annotation identities and pixels while recording confirmed count interpretation',()=>{
  assert.equal(water.annotations.length,19);
  assert.equal(water.annotations.filter(a=>a.category==='city-meter').length,6);
  assert.equal(water.annotations.filter(a=>a.category==='tenant-shutoff').length,13);
  assert.equal(new Set(water.annotations.map(a=>a.id)).size,19);
  assert.deepEqual(water.annotations.map(a=>a.id),infrastructure.mapAnnotations.map(a=>a.id));
  for(const a of water.annotations){
    const original=infrastructure.mapAnnotations.find(source=>source.id===a.id);
    for(const key of ['category','legendText','markerLabelRaw','imagePoint','sourceImage','sourceRefs']){
      assert.deepEqual(a[key],original[key],`${a.id} preserves ${key}`);
    }
    assert.equal(a.sourceRegistrationStatus,original.registration);
    assert.equal(a.referenceType,'source-map-annotation');
    assert.equal(a.seedPolicy,'reference_only');
    assert.equal(a.physicalAssetId,null);
    assert.equal(a.physicalAssetCount,null);
    assert.deepEqual(a.memberMeterIds,[]);
    assert.deepEqual(a.servedUnits,[]);
    assert.equal(a.sourceMarkerLabelMeaning,original.markerLabelMeaning);
    assert.match(a.sourceMarkerLabelMeaning,/unresolved/);
    assert.equal(a.markerLabelMeaning,'count at this location (confirmed by Adam 2026-09-25)');
    assert.equal(a.reportedCount,Number(original.markerLabelRaw));
    assert.ok(Number.isInteger(a.reportedCount)&&a.reportedCount>0);
    assert.equal(a.countProvenance.source,'user-confirmation');
    assert.equal(a.countProvenance.confirmedBy,'Adam');
    assert.equal(a.countProvenance.confirmedOn,'2026-09-25');
    assert.match(a.countBasis,/confirmed by Adam/);
    assert.equal(a.physicalVerification,'not-field-verified');
    assert.equal(a.positionStatus,'approximate_source_registered');
  }
  assert.equal(water.counts.physicalAssets,null);
});

test('confirmed location counts total 24 city meters and 37 shutoffs without assigning workbook membership',()=>{
  const total=category=>water.annotations.filter(a=>a.category===category).reduce((sum,a)=>sum+a.reportedCount,0);
  assert.equal(total('city-meter'),24);
  assert.equal(total('tenant-shutoff'),37);
  assert.equal(water.counts.reportedCityMeters,24);
  assert.equal(water.counts.reportedTenantShutoffs,37);
  const workbookIds=new Set(infrastructure.items.filter(item=>item.metadata.utility==='water').map(item=>item.metadata.meterIdRaw));
  assert.equal(workbookIds.size,28);
  assert.equal(water.countReconciliation.mapReportedCityMeters,24);
  assert.equal(water.countReconciliation.workbookWaterMeterIds,28);
  assert.equal(water.countReconciliation.workbookMinusMap,4);
  assert.equal(water.countReconciliation.status,'unresolved');
  assert.match(water.countReconciliation.note,/does not establish four missing meters/);
  assert.ok(water.annotations.every(a=>a.memberMeterIds.length===0&&a.servedUnits.length===0&&a.physicalAssetId===null));
  assert.ok(infrastructure.mapAnnotations.every(a=>a.markerLabelMeaning.includes('unresolved')),'Historical source interpretation remains unchanged');
});

test('registration is tied to the unchanged binary map and current native source model',()=>{
  const image=fs.readFileSync(new URL('../src/assets/twin/infrastructure/water-shutoff-map.png',import.meta.url));
  const hash=createHash('sha256').update(image).digest('hex');
  assert.equal(water.sources.find(s=>s.id==='image').sha256,hash);
  assert.equal(infrastructure.sources.find(s=>s.kind==='annotated-water-map').sha256,hash);
  assert.deepEqual(water.sourceImageSizePx,[2500,1164]);
  assert.equal(water.modelSourceSha256,model.source.sha256);
  assert.equal(water.modelSourceSha256,fixtures.modelSourceSha256);
  assert.equal(water.modelProjectId,model.source.projectId);
  assert.equal(water.modelDesignId,model.source.designId);
  for(const axis of ['x','y','z'])close(water.sourceModelOriginFmlCm[axis],model.originFmlCm[axis],`Native origin ${axis}`);
  assert.equal(water.units,'meters');
  assert.equal(water.upAxis,'Y');
});

test('the 37-column bridge uses native stable IDs and reproduces its separately reported residuals',()=>{
  const bridge=water.registration.planToNative;
  assert.equal(bridge.controls.length,37);
  assert.deepEqual(new Set(bridge.controls.map(c=>c.modelColumnId)),new Set(model.columns.map(c=>c.id)));
  const errors=[];
  for(const c of bridge.controls){
    const native=model.columns.find(column=>column.id===c.modelColumnId);
    const target=[native.position[0],native.position[2]];
    target.forEach((n,i)=>close(c.nativeModelXZ[i],n,c.modelColumnId));
    const error=distance(apply(bridge.matrix3x2,c.sourcePlanPx),target);
    close(error,c.residualMeters,`${c.modelColumnId} residual`);
    assert.ok(error<1.5);
    errors.push(error);
  }
  close(Math.sqrt(errors.reduce((sum,n)=>sum+n*n,0)/errors.length),bridge.rmsMeters,'Bridge RMS');
  close(Math.max(...errors),bridge.maxResidualMeters,'Bridge maximum');
  assert.ok(bridge.rmsMeters>.5,'The drawing/model disagreement must not be reported as a zero-error survey fit');
});

test('eight explicit building-corner controls reproduce the image-to-model fit and reference positions',()=>{
  const registration=water.registration;
  assert.equal(registration.controls.length,8);
  const errors=[];
  for(const c of registration.controls){
    const source=fixtures.registration.utilityImageToPlan.controls.find(p=>p.id===c.id);
    assert.ok(source,c.id);
    assert.deepEqual(c.sourceImagePx,source.sourceImagePx);
    assert.deepEqual(c.sourcePlanPx,source.targetPlanPx);
    const target=apply(registration.planToNative.matrix3x2,c.sourcePlanPx);
    assert.ok(distance(target,c.targetModelXZ)<1e-6);
    const error=distance(apply(registration.matrix3x2,c.sourceImagePx),target);
    close(error,c.residualMeters,`${c.id} corner residual`);
    errors.push(error);
  }
  close(Math.sqrt(errors.reduce((sum,n)=>sum+n*n,0)/errors.length),registration.rmsMeters,'Corner RMS');
  close(Math.max(...errors),registration.maxResidualMeters,'Corner maximum');
  assert.ok(registration.rmsMeters<.5&&registration.maxResidualMeters<1);
  assert.match(registration.uncertaintyNote,/excludes the separate 37-column bridge error/);
  for(const a of water.annotations){
    const expected=apply(registration.matrix3x2,[a.imagePoint.x,a.imagePoint.y]);
    assert.ok(distance([a.modelPositionMeters[0],a.modelPositionMeters[2]],expected)<1e-6,a.id);
    assert.equal(a.modelPositionMeters[1],0,'Ground plane is a display reference, not a utility elevation');
  }
});

test('exterior annotations remain outside the building when appropriate and all fit the expanded display bounds',()=>{
  let outside=0,maxDistance=0;
  for(const a of water.annotations){
    const point=a.modelPositionMeters;
    assert.ok(point.every(Number.isFinite),a.id);
    const gap=outsideDistance(point,model.boundsMeters);
    close(gap,a.validation.outsideNativeModelDistanceMeters,`${a.id} exterior distance`);
    assert.equal(a.validation.outsideNativeModelBounds,gap>1e-8);
    if(gap>1e-8)outside++;
    maxDistance=Math.max(maxDistance,gap);
    assert.ok(inBounds(point,water.displayBoundsMeters),`${a.id} must be visible without snapping to a wall`);
    assert.ok(inBounds(point,water.validationBoundsMeters),`${a.id} exceeds the registration sanity envelope`);
  }
  assert.equal(outside,8);
  assert.equal(water.validation.outsideNativeModelAnnotationCount,outside);
  close(maxDistance,water.validation.maximumObservedExteriorDistanceMeters,'Maximum exterior distance');
  assert.ok(maxDistance>2&&maxDistance<3);
  assert.ok(inBounds(model.boundsMeters.min,water.displayBoundsMeters));
  assert.ok(inBounds(model.boundsMeters.max,water.displayBoundsMeters));
});

test('nearby blue and red symbols stay separate and duplicate printed labels never merge identities',()=>{
  const meter=water.annotations.find(a=>a.id==='water-map:city-meter:03');
  const shutoff=water.annotations.find(a=>a.id==='water-map:tenant-shutoff:05');
  assert.equal(meter.imagePoint.x,shutoff.imagePoint.x);
  assert.notEqual(meter.id,shutoff.id);
  const separation=distance(meter.modelPositionMeters,shutoff.modelPositionMeters);
  assert.ok(separation>3&&separation<3.3,'The distinct 32-pixel source symbols must not be collapsed');
  const repeatedEight=water.annotations.filter(a=>a.category==='city-meter'&&a.markerLabelRaw==='8');
  assert.equal(repeatedEight.length,2);
  assert.notEqual(repeatedEight[0].id,repeatedEight[1].id);
  assert.ok(distance(repeatedEight[0].modelPositionMeters,repeatedEight[1].modelPositionMeters)>100);
});
