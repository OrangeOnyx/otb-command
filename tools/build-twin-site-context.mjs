import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { SITE_CONTEXT_VERSION, SITE_CONTEXT_CATEGORIES, planPointToModel, createSiteContextModel } from '../src/lib/asset-twin-site-context.js';
import { encodeFixtureGlb } from './build-twin-fixtures.mjs';
import { parseGlb, writeGlb, validateGlb } from './merge-twin-glb.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const r = n => Math.round(n * 1e6) / 1e6;
const rect = ({ x, y, w, h }) => [[x,y],[x+w,y],[x+w,y+h],[x,y+h]];

/** Only the absolute M/L/A/Z subset emitted by extract-geometry.mjs is accepted. */
export function sourcePathPolygon(d) {
  const tokens = d.match(/[MLAZ]|-?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi) ?? [];
  const points = []; let i = 0, p, start;
  const number = () => { const value = Number(tokens[i++]); if (!Number.isFinite(value)) throw new Error('Invalid source path number'); return value; };
  while (i < tokens.length) {
    const command = tokens[i++];
    if (command === 'M' || command === 'L') { p = [number(),number()]; points.push(p); start ??= p; }
    else if (command === 'A') {
      let rx = number(), ry = number(); const rotation = number(), large = number(), sweep = number(), end = [number(),number()];
      if (rotation !== 0 || rx <= 0 || ry <= 0 || !p) throw new Error('Unsupported source arc');
      const dx = (p[0]-end[0])/2, dy = (p[1]-end[1])/2;
      const scale = Math.sqrt(dx*dx/(rx*rx)+dy*dy/(ry*ry)); if (scale > 1) { rx *= scale; ry *= scale; }
      const den = rx*rx*dy*dy+ry*ry*dx*dx;
      const factor = (large === sweep ? -1 : 1) * Math.sqrt(Math.max(0,(rx*rx*ry*ry-den)/den));
      const cx = factor*rx*dy/ry, cy = -factor*ry*dx/rx;
      const center = [cx+(p[0]+end[0])/2,cy+(p[1]+end[1])/2];
      const a = Math.atan2((dy-cy)/ry,(dx-cx)/rx), b = Math.atan2((-dy-cy)/ry,(-dx-cx)/rx);
      let delta = b-a; if (!sweep && delta > 0) delta -= Math.PI*2; if (sweep && delta < 0) delta += Math.PI*2;
      const steps = Math.max(2,Math.ceil(Math.abs(delta)/(Math.PI/32)));
      for (let step = 1; step <= steps; step++) points.push([center[0]+rx*Math.cos(a+delta*step/steps),center[1]+ry*Math.sin(a+delta*step/steps)]);
      p=end;
    } else if (command === 'Z') { p=start; }
    else throw new Error(`Unsupported source path command ${command}`);
  }
  if (points.length < 3) throw new Error('Source surface has fewer than three points');
  return points;
}

function sourceShape(element) {
  if (element?.t === 'rect') return rect(element);
  if (element?.t === 'path') return sourcePathPolygon(element.d);
  throw new Error('Expected a source rectangle or polygon');
}

export async function buildSiteContext({ outputDirectory = path.join(ROOT,'public/twin') } = {}) {
  const geometryBytes = fs.readFileSync(path.join(ROOT,'src/data/geometry.json'));
  const fixtureBytes = fs.readFileSync(path.join(ROOT,'src/data/twin-site-fixtures.json'));
  const modelBytes = fs.readFileSync(path.join(ROOT,'public/twin/model.glb'));
  const geometry = JSON.parse(geometryBytes), fixtures = JSON.parse(fixtureBytes);
  if (geometry.rev !== 'REV 14') throw new Error('Review source element mappings before adopting a new plan revision');
  const fit = fixtures.registration.planToNative, matrix = fit.matrix3x2;
  // Verify frame identity independently: these corners come from current geometry.json,
  // not from the fixture registration. This detects a changed/scaled/cropped A-1 frame.
  const u = geometry.units, corners = {
    long_133_front:[u['133'].x+u['133'].w,u['133'].y+u['133'].h],
    long_133_rear:[u['133'].x+u['133'].w,u['133'].y],
    long_101_front:[u['101'].x,u['101'].y+u['101'].h], long_101_rear:[u['101'].x,u['101'].y],
    short_149_patricia:[u['149'].x+u['149'].w,u['149'].y+u['149'].h],
    short_149_field:[u['149'].x,u['149'].y+u['149'].h],
    short_135_patricia:[u['149'].x+u['149'].w,u['135A'].y], short_135_field:[u['135A'].x,u['135A'].y],
  };
  const gltf = await new GLTFLoader().parseAsync(modelBytes.buffer.slice(modelBytes.byteOffset,modelBytes.byteOffset+modelBytes.byteLength),'');
  let floorPositions;
  gltf.scene.traverse(o=>{if(o.userData.assetId==='ground-floor-areas')floorPositions=o.geometry.getAttribute('position');});
  if (!floorPositions) throw new Error('Native floor geometry required for registration diagnostics');
  const checks = fixtures.registration.utilityImageToPlan.controls.map(control=>{
    const point = corners[control.id]; if (!point) throw new Error(`Unknown frame corner ${control.id}`);
    const difference = Math.hypot(...point.map((n,i)=>n-control.targetPlanPx[i]));
    if (difference > .025) throw new Error(`A-1 frame mismatch at ${control.id}: ${difference}px`);
    const native = planPointToModel(point,matrix); let distance=Infinity, nearest;
    for(let i=0;i<floorPositions.count;i++) {
      const p=[floorPositions.getX(i),0,floorPositions.getZ(i)], d=Math.hypot(p[0]-native[0],p[2]-native[2]);
      if(d<distance){distance=d;nearest=p;}
    }
    return {id:control.id,planPoint:point,frameDifferencePx:r(difference),modelPointMeters:native.map(r),nearestNativeFloorVertex:nearest.map(r),nearestVertexDistanceMeters:r(distance)};
  });
  if (Math.max(...checks.map(c=>c.nearestVertexDistanceMeters)) > 3) throw new Error('Native floor / plan alignment changed; manual review required');
  const zones=[];
  const elevations={parking:-.035,landscape:.008,sidewalk:.035,service:-.025,roads:-.045,'off-parcel':-.055};
  const colors={parking:'#757d78',landscape:'#789168',sidewalk:'#cccabc',service:'#a4a69a',roads:'#929991','off-parcel':'#b3aea2'};
  const add=(id,label,kind,polygon,sourceRefs,extra={})=>{
    const height=(extra.height??elevations[kind])+zones.length*.00002;
    const points=polygon.map(p=>planPointToModel(p,matrix,height).map(r));
    const bounds={min:[0,1,2].map(a=>Math.min(...points.map(p=>p[a]))),max:[0,1,2].map(a=>Math.max(...points.map(p=>p[a])))};
    const entry={id,label,kind,color:colors[kind],geometryStatus:'source-derived-approximation',physicalVerification:'unverified',
      position:bounds.min.map((v,i)=>r((v+bounds.max[i])/2)),boundsMeters:bounds,polygonMeters:points,
      source:'A-1 REV 14 / recorded plat and architect CAD',provenance:{sourceFile:'src/data/geometry.json',sourceRevision:geometry.rev,sourceRefs,
        registration:'A-1 plan to native Floorplanner model; existing 37-column affine fit after 8-corner frame identity check',
        sourceDates:['1994-05-20','2019-07-19'],dateMeaning:'Referenced plat original and last revision; not current surface inspection dates'},
      notes:'Approximate drawing-derived area. Current surface, edges and condition need field confirmation. Flat offsets are for rendering only.',...extra};
    delete entry.height; zones.push(entry); return entry;
  };
  const layerZone=(layer,index,id,label,kind,extra={})=>add(id,label,kind,sourceShape(geometry.layers[layer][index]),[`${layer}[${index}]`],extra);
  const baseBoundary=geometry.layers.base.findIndex(e=>e.t==='path'&&e.attrs['stroke-dasharray']==='14 5 3 5');
  layerZone('base',baseBoundary,'site-common-ground','Common ground — surface unclassified','service',{height:-.075,assetRecord:false,notes:'Base context inside the source drawing outline. Surface material and ownership are not inferred; detailed surfaces overlay this base.'});
  // Footprint of the excluded corner is contextual and never offered as a Belle asset seed.
  add('jd-bank-context','JD Bank — excluded corner reference','off-parcel',[[71.85,473.33],[295.16,473.33],[295.16,661.99],[70,661.99]],['base: excluded corner notch','parking: JD Bank'],{contextOnly:true,assetRecord:false,notes:'Source drawing labels this corner NOT A PART. Context only; reciprocal parking/access terms are not a parcel ownership assertion.'});
  const parkingNames={0:['main-field','Main parking field'],1:['storefront-row','Long-building storefront parking'],2:['lot-8','Lot 8 parking'],3:['rear-ma','Rear Marie Antoinette parking / service strip'],4:['johnston-strip','Johnston parking strip'],230:['lot-6-island','Lot 6 parking module'],242:['short-frontage','Short-building frontage parking'],339:['notch-aisle','Shared notch access aisle'],340:['johnston-aisle','Johnston service / access aisle'],341:['johnston-candidate-row','Johnston candidate 10-stall row']};
  for (const [i,[id,label]] of Object.entries(parkingNames)) layerZone('parking',Number(i),id,label,'parking',id==='johnston-candidate-row'?{notes:'CAD-striped candidate 10-stall row. Ground confirmation is required before resolving the 314-versus-324 parking discrepancy.'}:{});
  const landscapes=geometry.layers.parking.map((e,i)=>({e,i})).filter(({e})=>e.t==='rect'&&e.attrs.fill==='#DDE0D4');
  const grassNames=['Arnould landscape near Unit 149','Arnould frontage planting strip — north module','Arnould planting nose','Arnould narrow planting strip','Arnould planting end cap A','Arnould planting end cap B','Arnould planting end cap C','Arnould planting end cap D','Main field island A1','Main field island A2','Main field island A3','Main field island B1','Main field island B2','Main field island B3','Lot 6 planting island A','Lot 6 planting island B'];
  landscapes.forEach(({e,i},index)=>add(`planting-${String(index+1).padStart(2,'0')}`,grassNames[index]??`Planting area ${index+1}`,'landscape',rect(e),[`parking[${i}]`],{notes:'Planting/landscape area per the plat/CAD drawing. Grass versus other planting, curb condition, exact edge and utility contents need a site check.'}));
  layerZone('parking',52,'walk-149-arnould','Unit 149 to Arnould sidewalk','sidewalk');
  layerZone('parking',257,'short-loading-pad','Short-building loading pad','service');
  layerZone('parking',315,'pylon-pad','Pylon sign pocket / pad','service');
  layerZone('access',0,'arnould-sidewalk','Arnould frontage sidewalk','sidewalk');
  layerZone('access',31,'service-149','Unit 149 rear service pad','service');
  layerZone('access',32,'service-135-137','Units 135B / 137 rear service pad','service');
  const drives={15:['drive-arnould-a','Arnould driveway A'],16:['drive-arnould-b','Arnould driveway B — shared access'],27:['drive-johnston','Johnston access drive'],33:['drive-patricia-149','Patricia / Unit 149 service drive'],34:['drive-patricia-135','Patricia / Units 135B–137 drive'],35:['drive-patricia-lot8','Patricia / Lot 8 drive'],45:['drive-ma-lot8','Marie Antoinette / Lot 8 drive'],46:['breezeway-apron','Breezeway pedestrian apron']};
  for(const[i,[id,label]]of Object.entries(drives))layerZone('access',Number(i),id,label,Number(i)===46?'sidewalk':'parking');
  layerZone('remoteLot',0,'lot-7','Lot 7 remote parking','parking',{notes:'Remote Lot 7 across Marie Antoinette. Source plan labels 32 spaces; canopy can obscure this area in aerial imagery. Exact pavement/planting limits require the field scan.'});
  // Road corridor bands are context only; use CAD asphalt-edge lines where present.
  add('road-ma','Marie Antoinette — road reference','roads',rect({x:0,y:38.66,w:1480,h:37.73}),['access[3]','access[4]'],{contextOnly:true,assetRecord:false});
  add('road-arnould','Arnould Boulevard — road reference','roads',rect({x:0,y:690.3,w:1480,h:61.7}),['access[1]','base[5]'],{contextOnly:true,assetRecord:false,notes:'Near boulevard lanes shown within source sheet clipping. Not the full road width.'});
  add('road-patricia','Patricia — road reference','roads',rect({x:1408.23,y:-310,w:44.35,h:1000.3}),['access[2]','base[10]'],{contextOnly:true,assetRecord:false});
  layerZone('base',14,'road-johnston','Johnston — clipped road corridor reference','roads',{contextOnly:true,assetRecord:false,notes:'Clipped road corridor for orientation, not an exact pavement-edge or lane-width model.'});
  for(const i of [6,8])layerZone('access',i,`arnould-median-${i===6?'north':'south'}`,'Arnould median — road context','landscape',{contextOnly:true,assetRecord:false});
  add('ma-shoulder','Marie Antoinette roadside shoulder','service',rect({x:125.47,y:76.39,w:1188.24,h:19.61}),['access[3]','base: near right-of-way edge'],{contextOnly:true,assetRecord:false,notes:'Roadside shoulder strip for orientation. Its paving/grass mix and exact edge await the field scan; no utility location is inferred.'});
  add('patricia-shoulder','Patricia ditch / shoulder context','service',rect({x:1360,y:181.91,w:48.23,h:339.59}),['access[2]','access: drainage open ditch description'],{contextOnly:true,assetRecord:false,notes:'Plan-described roadside open-ditch shoulder. Flat reference only; drainage slope and depth are not modeled.'});
  // Preserve source striping without turning line count into a parking capacity claim.
  const lineZone=(index)=>index<51?'main-field':index<168?'main-field':index<230?'storefront-row':index<242?'lot-6-island':index<258?'short-frontage':index<282?'lot-8':index<306?'rear-ma':index<320?'johnston-strip':index<339?'jd-bank-context':'johnston-candidate-row';
  const attachLines=(layer,selector)=>geometry.layers[layer].forEach((e,i)=>{
    if(e.t!=='line'||!['#C9CEBE','#8A937F'].includes(e.attrs.stroke)||e.attrs['stroke-dasharray'])return;
    const zone=zones.find(z=>z.id===selector(i)); if(!zone)return;
    (zone.linesMeters??=[]).push([[e.x1,e.y1],[e.x2,e.y2]].map(p=>planPointToModel(p,matrix,.018).map(r)));
  });
  attachLines('parking',lineZone); attachLines('remoteLot',()=> 'lot-7');
  const all=zones.flatMap(z=>z.polygonMeters);
  const catalog={schemaVersion:1,modelVersion:SITE_CONTEXT_VERSION,title:'OTB parking and common-area reference model',units:'meters',upAxis:'Y',
    physicalVerification:'unverified',geometryStatus:'source-derived-approximation',categories:SITE_CONTEXT_CATEGORIES,
    boundsMeters:{min:[0,1,2].map(a=>Math.min(...all.map(p=>p[a]))),max:[0,1,2].map(a=>Math.max(...all.map(p=>p[a])))},
    registration:{matrix3x2:matrix,controlCount:fit.controlCount,rmsMeters:fit.rmsMeters,maxResidualMeters:fit.maxResidualMeters,
      status:'same-frame-verified-drawing-registration',frameChecks:checks,
      note:'Eight building-corner coordinates establish that geometry.json shares the registered A-1 frame. The existing 37-column affine fit is then reused, retaining all utility/fixture alignment. Residuals describe source/model agreement, not field accuracy. Nearest-floor-vertex distances are diagnostics, not independent surveyed controls.'},
    sources:[{path:'src/data/geometry.json',sha256:hash(geometryBytes),revision:geometry.rev},{path:'src/data/twin-site-fixtures.json',sha256:hash(fixtureBytes)},{path:'public/twin/model.glb',sha256:hash(modelBytes)}],
    parking:{platLabeledCount:geometry.parking.totalPlat,cadCandidateAdditionalCount:10,cadStripedCount:geometry.parking.totalStriped,varianceProvidedCount:geometry.parking.variance.provided,varianceRequiredCount:geometry.parking.variance.required,reconciliationStatus:'pending-field-confirmation',note:geometry.parking.reconciliation},
    searchAreas:[{id:'grass-near-blvd',label:'Sprinkler meter — broad grass-area search',
      zoneIds:landscapes.slice(0,8).map((_,index)=>`planting-${String(index+1).padStart(2,'0')}`),
      sourceKey:'utility-meter:water:W1217102',meterId:'W1217102',position:null,verification:'unverified',
      sourceLocationText:'Grass near Blvd',sourceFile:'Water Meter Number Reference.xlsx',
      notes:'The workbook supplies only a broad grass-near-boulevard description. These Arnould planting areas are a suggested search area, not evidence that the meter is within any particular polygon. No individual meter point or group membership is assigned.'}],
    limitations:['Source-derived visual registration only; no surveyed asset positions or current-condition claim.','All Y offsets are rendering assumptions; no actual grades, curb heights, terrain or drainage elevations.','Roads, roadside shoulders, medians and the excluded JD Bank corner are contextual and do not seed managed assets.','Existing native buildings, permanent asset IDs, water markers and fixture positions are unchanged.','Existing native walkway supplies storefront sidewalks; it is not duplicated by this additive layer.','Parking stripes are drawing marks, not an independent present-day space count.','Scan date, measured controls and field observations are required before replacing approximations.'],zones};
  const root=createSiteContextModel(catalog),encoded=parseGlb(encodeFixtureGlb(root));
  encoded.json.asset.generator=SITE_CONTEXT_VERSION; encoded.json.scenes[0].name='On The Boulevard · parking and common areas';
  const bytes=writeGlb(encoded.json,encoded.bin); validateGlb(parseGlb(bytes));
  catalog.glbSha256=hash(bytes); catalog.glbBytes=bytes.length;
  fs.mkdirSync(outputDirectory,{recursive:true});fs.writeFileSync(path.join(outputDirectory,'site-context.glb'),bytes);fs.writeFileSync(path.join(outputDirectory,'site-context.json'),`${JSON.stringify(catalog,null,2)}\n`);
  for(const item of [root,gltf.scene])item.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
  return catalog;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const result=await buildSiteContext();console.log(JSON.stringify({zones:result.zones.length,managedZones:result.zones.filter(z=>z.assetRecord!==false&&!z.contextOnly).length,bytes:result.glbBytes,bounds:result.boundsMeters}));
}
