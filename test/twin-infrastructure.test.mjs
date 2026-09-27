import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const source=JSON.parse(fs.readFileSync(new URL('../src/data/twin-infrastructure.json',import.meta.url),'utf8'));
const item=key=>source.items.find(i=>i.sourceKey===key);

test('infrastructure source identifiers and exceptional associations remain distinct',()=>{
  assert.equal(source.counts.workbookRows,30);
  assert.equal(source.items.filter(i=>i.metadata.utility==='water').length,28);
  assert.equal(source.items.filter(i=>i.metadata.utility==='electric').length,28);
  assert.equal(new Set(source.items.map(i=>i.sourceKey)).size,source.items.length);
  assert.equal(item('utility-meter:water:W1252003').unit,'113');
  assert.equal(item('utility-meter:water:W1202593').unit,'113');
  assert.equal(item('utility-meter:water:W1217102').unit,null);
  assert.equal(item('utility-meter:water:W1217102').metadata.purposeRaw,'Sprinkler');
  assert.equal(item('utility-meter:water:W1276858').metadata.approximateLocationRaw,'?');
  assert.equal(item('utility-meter:water:W1276858').metadata.locationStatus,'unknown');
  assert.equal(item('utility-meter:water:W1214160').unit,'117.5');
  assert.equal(item('utility-meter:water:W1263981').unit,'135A');
  assert.equal(item('utility-meter:water:W1204099').metadata.reportedMeterSizeRaw,"3/4'");
  assert.equal(source.sourceRows.find(r=>r.row===3).rawCells.A3.raw,'101.0');
});

test('clock filenames and source-map points never become invented physical counts or 3D positions',()=>{
  assert.equal(source.counts.timeClockPhotoFiles,24);
  assert.equal(source.items.filter(i=>i.metadata.assetKind==='time_clock').length,23);
  assert.equal(item('time-clock-reference:119.5').metadata.photoCount,2);
  assert.equal(item('time-clock-reference:119.5').metadata.physicalClockCount,null);
  assert.equal(item('time-clock-reference:131+133').unit,null);
  assert.deepEqual(item('time-clock-reference:131+133').metadata.servedUnits,['131','133']);
  assert.equal(source.mapAnnotations.filter(m=>m.category==='tenant-shutoff').length,13);
  assert.equal(source.mapAnnotations.filter(m=>m.category==='city-meter').length,6);
  assert.equal(source.counts.physicalShutoffCount,null);
  assert.ok(source.items.every(i=>i.metadata.position===undefined));
  assert.ok(source.mapAnnotations.every(m=>m.physicalAssetCount===null && m.memberMeterIds.length===0));
  assert.ok(source.mapAnnotations.every(m=>m.imagePoint.width===2500 && m.imagePoint.height===1164));
  const maps=source.sources.filter(s=>s.kind==='annotated-water-map'||s.kind==='identical-map-alias');
  assert.equal(maps[0].sha256,maps[1].sha256);
});
