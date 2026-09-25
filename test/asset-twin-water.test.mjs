import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {waterLocationCode,waterLocations,findWaterMeters,waterLocationsCSV} from '../src/lib/asset-twin-water.js';
const source=JSON.parse(fs.readFileSync(new URL('../src/data/twin-infrastructure.json',import.meta.url),'utf8'));
test('water search retains duplicate suite meters and common-area service distinctions',()=>{
  assert.equal(findWaterMeters(source.items).length,28);
  assert.deepEqual(findWaterMeters(source.items,'113').map(item=>item.metadata.meterIdRaw).sort(),['W1202593','W1252003']);
  const sprinkler=findWaterMeters(source.items,'sprinkler');assert.equal(sprinkler.length,1);assert.equal(sprinkler[0].unit,null);
  assert.equal(findWaterMeters(source.items,'W1276858')[0].metadata.approximateLocationRaw,'?');
  assert.equal(findWaterMeters(source.items,'behind 109').length,4);
  assert.equal(findWaterMeters(source.items,'no matching location').length,0);
});
test('repeated source labels get unique map codes without becoming device IDs or memberships',()=>{
  const data={annotations:source.mapAnnotations.map(item=>({...item,modelPositionMeters:[1,0,2],positionStatus:'approximate_source_registered'}))};
  const result=waterLocations(data);assert.equal(new Set(result.map(waterLocationCode)).size,19);
  assert.equal(result[0].code,'M01');assert.equal(result.find(item=>item.category==='tenant-shutoff').code,'S01');
  for(const item of result){assert.equal(item.physicalAssetCount,null);assert.deepEqual(item.memberMeterIds,[]);assert.deepEqual(item.servedUnits,[]);}
  const csv=waterLocationsCSV(data);assert.equal(csv.trim().split('\r\n').length,20);assert.match(csv,/"member_meter_ids","served_units"/);assert.match(csv,/"M01","city-meter","8"/);
});
test('location export carries confirmed counts and coordinates while leaving device memberships empty',()=>{
  const mapped=JSON.parse(fs.readFileSync(new URL('../src/data/twin-water-map.json',import.meta.url),'utf8'));
  const rows=waterLocationsCSV(mapped).trim().split('\r\n').map(line=>line.slice(1,-1).split('","'));
  const headers=rows.shift();
  assert.equal(headers.length,14);
  const records=rows.map(row=>{assert.equal(row.length,headers.length);return Object.fromEntries(headers.map((key,i)=>[key,row[i]]));});
  assert.equal(records.filter(item=>item.category==='city-meter').reduce((sum,item)=>sum+Number(item.reported_count),0),24);
  assert.equal(records.filter(item=>item.category==='tenant-shutoff').reduce((sum,item)=>sum+Number(item.reported_count),0),37);
  records.forEach((record,index)=>{assert.equal(Number(record.model_x_m),mapped.annotations[index].modelPositionMeters[0]);assert.equal(record.member_meter_ids,'');assert.equal(record.served_units,'');});
});
