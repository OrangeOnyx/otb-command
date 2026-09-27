/** Additive upper-floor reconstruction. Original ground GLB/FML and asset IDs are never edited. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { ShapeUtils, Vector2 } from 'three';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const nativePath=process.argv[2]??path.resolve(root,'../../outputs/OTB_Editable_Export_2026-09-23/On_The_Boulevard.native.fml');
const intake=process.argv[3]??path.resolve(root,'../infrastructure-intake');
const output=path.join(root,'public/twin');
const bytes=fs.readFileSync(nativePath),native=JSON.parse(bytes);
const groundFloor=native.floors.find(f=>f.designs.some(d=>d.id===241952337));
const upperFloor=native.floors.find(f=>f.designs.some(d=>d.id===193835178));
const ground=groundFloor.designs.find(d=>d.id===241952337);
const upper=upperFloor.designs.find(d=>d.id===193835178);
const modelData=JSON.parse(fs.readFileSync(path.join(output,'model-data.json'),'utf8'));
const sha=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');
const baseHash=sha(fs.readFileSync(path.join(output,'model.glb')));
const origin=modelData.originFmlCm;
// The corresponding facade/shared-wall segment is 10.66525 m long in both native designs.
const controlPairs=[
  {name:'103 facade / shared 103-105 wall',upper:upper.walls[186].a,ground:ground.walls[369].a},
  {name:'103 facade / shared 101-103 wall',upper:upper.walls[186].b,ground:ground.walls[369].b},
];
const dx=controlPairs.reduce((s,p)=>s+p.ground.x-p.upper.x,0)/controlPairs.length;
const dy=controlPairs.reduce((s,p)=>s+p.ground.y-p.upper.y,0)/controlPairs.length;
const levelBase=groundFloor.height/100; // Native story metadata, explicitly unverified.
const p3=(x,y,z=0)=>[(x+dx-origin.x)/100,z/100,(y+dy-origin.y)/100];
const xz=p=>{const q=p3(p[0],p[1]);return [q[0],q[2]];};
const sharedX=upper.walls[186].b.x,rearStripY=3726.13846544325;
const registration={method:'Rigid translation only; no scaling or rotation',translationFmlCm:[dx,dy],rotationDegrees:0,scale:1,
  controls:controlPairs.map(p=>({...p,residualMeters:Math.hypot(p.upper.x+dx-p.ground.x,p.upper.y+dy-p.ground.y)/100})),
  independentCheck:{name:'103 rear wall',upperFmlCm:[sharedX,4255.67027827759],groundFmlCm:[718.032865686532,1363.60969784303],residualMeters:Math.abs(4255.67027827759+dy-1363.60969784303)/100,status:'Unresolved native drawing discrepancy; not scaled away'},
  confidence:'high model-pattern correspondence, not surveyed registration',
};
const sources=[
  {id:'native-upper',name:'On_The_Boulevard.native.fml',sha256:sha(bytes),floorId:upperFloor.id,designId:upper.id},
  ...['101 - First Floor.png','101 - Second Floor.png','103 - First Floor.png','103 - Second Floor.png'].map(name=>({id:name.replaceAll(' ','-').replace('.png','').toLowerCase(),name:`Floor Plans/${name}`,sha256:sha(fs.readFileSync(path.join(intake,'Floor Plans',name)))})),
  ...['101 103/project.pdf','103/June 14, 1993 - 93-003/A2.3.pdf','103/June 14, 1993 - 93-003/A5.1.pdf'].map(name=>({id:name.split('/').at(-1),name,sha256:sha(fs.readFileSync(path.join(intake,name))),status:'Historical architectural drawing; visual corroboration, not current as-built certification'})),
];
const limitations=[
  'User confirms Units 101 and 103 have upper floors; geometry is source-derived and not a field survey.',
  'Native story metadata places the upper floor at 3.05 m. All existing ground-wall heights are 3.8862 m, an unresolved 0.8362 m conflict. Existing ground geometry is preserved and therefore extends above the displayed upper-floor plane.',
  'Upper walls retain native 3.8862 m extrusion heights. These uniform heights are unverified defaults and must not be treated as measured upper-story heights.',
  'Unit 101 receives only the native narrow rear upper-floor strip. No slab or rooms are added across the large front ground-floor space.',
  'The 103 central opening is cut out, rather than filled by the native auto-generated area polygon. The source PNG and historical mezzanine plan show the opening and stair arrangement.',
  'Eight native segments around the 103 central opening are interpreted as guard boundaries from the historical section, not full-height room partitions. Their actual guardrail height/detail is unknown, so vertical guardrail geometry is omitted.',
  'Stairs are schematic sloped flight envelopes located from the supplied floor-plan symbols. Riser counts, tread dimensions, landing elevation and construction are unverified; no individual treads or code-compliance claims are modeled.',
  'Rear stair openings are derived from the visible stair symbols within native wall bounds. The floor planes have zero thickness because no reliable slab thickness was supplied.',
  'Door voids use native positions and dimensions. Door leaves, frames, finishes, roof structure, lights and furniture are omitted.',
  'A roughly 0.16 m rear-edge registration discrepancy is preserved and disclosed. No scaling is applied to force the separate source drawings to agree.',
];

// The central auto-filled native area is actually the source-plan stair/open-to-below region.
const centralVoid=upper.areas[3].poly.map(p=>[p.x,p.y]);
const rear103Void=[[-120,4148.0360663],[233.437821,4148.0360663],[233.437821,4240.67],[-120,4240.67]];
const rear101Void=[[1424.950511,4150.40523],[1839.2,4150.40523],[1839.2,4240.841337],[1424.950511,4240.841337]];
const holesByArea=new Map([[0,[rear103Void]],[2,[centralVoid]],[10,[rear101Void]]]);
const omittedGuardWalls=new Set([36,37,38,39,40,41,42,43]);
const layers=['101','103'].map(unit=>({id:`upper-${unit}`,nodeName:`upper-${unit}`,unit,level:2,label:`Unit ${unit} · upper floor`,defaultVisible:true,
  elevationMeters:levelBase,elevationStatus:'native-floor-height-metadata-unverified',nativeFloorHeightMeters:upperFloor.height/100,
  nativeWallHeightMeters:upper.walls[0].az.h/100,registration,walls:[],floors:[],voids:[],stairs:[],omittedGuardBoundaryWallIndices:unit==='103'?[...omittedGuardWalls]:[],
  provenance:{sourceDesignId:upper.id,sourceFloorId:upperFloor.id,sourceIds:unit==='101'?['native-upper','101---second-floor','project.pdf']:['native-upper','103---second-floor','A2.3.pdf','A5.1.pdf'],physicalVerification:'unverified',occupancyExtent:unit==='101'?'Partial rear strip only':'Native 103 upper footprint with central void and rear stair opening'},
}));
const layerFor=unit=>layers.find(l=>l.unit===unit);
for(let i=0;i<upper.walls.length;i++){
  const w=upper.walls[i];if(omittedGuardWalls.has(i))continue;
  const unit=(w.a.x+w.b.x)/2>sharedX+.1?'101':'103';
  const add=(target,a=w.a,b=w.b,shared=false)=>layerFor(target).walls.push({id:`upper-${target}-wall-${i}`,a:p3(a.x,a.y,levelBase*100+(w.az?.z??0)),b:p3(b.x,b.y,levelBase*100+(w.bz?.z??0)),heightMeters:w.az.h/100,thicknessMeters:w.thickness/100,balance:w.balance??.5,openings:w.openings.map((o,oi)=>({id:`upper-${target}-opening-${i}-${oi}`,type:o.type,t:o.t,widthMeters:o.width/100,bottomMeters:o.z/100,heightMeters:o.z_height/100,sourceCatalogRef:o.refid})),sourceRefs:{designId:upper.id,wallIndex:i,sharedBoundary:shared}});
  add(unit);
  // A shared wall must also be visible when only the 101 layer is displayed.
  if(unit==='103'&&Math.abs(w.a.x-sharedX)<.1&&Math.abs(w.b.x-sharedX)<.1&&Math.min(w.a.y,w.b.y)>=rearStripY-.1)add('101',w.a,w.b,true);
}
for(let i=0;i<upper.areas.length;i++){
  if(i===3)continue;
  const area=upper.areas[i],unit=i<7?'103':'101',outer=area.poly.map(p=>[p.x,p.y]),holes=holesByArea.get(i)??[];
  layerFor(unit).floors.push({id:`upper-${unit}-floor-${i}`,outer:outer.map(xz),holes:holes.map(h=>h.map(xz)),elevationMeters:levelBase,thicknessMeters:0,sourceRefs:{designId:upper.id,areaIndex:i,areaGuid:area.guid??null},holeStatus:holes.length?'source-plan interpretation; see void records':null});
}
function addVoid(unit,id,poly,source,role){layerFor(unit).voids.push({id,outer:poly.map(xz),elevationMeters:levelBase,role,source,confidence:role==='central-open-to-below'?'native outline corroborated by PNG and historical mezzanine plan':'stair symbol interpreted within native wall bounds'});}
addVoid('103','upper-103-central-void',centralVoid,'Native area 3 and walls 36–43; 103 - Second Floor.png; A2.3.pdf','central-open-to-below');
addVoid('103','upper-103-rear-stair-void',rear103Void,'Native rear stair enclosure wall 56; 103 - Second Floor.png','rear-stair-opening');
addVoid('101','upper-101-rear-stair-void',rear101Void,'Native wall 45 / area 10; 101 - Second Floor.png','rear-stair-opening');
// Each flight is only an envelope; the source images do not establish a measured tread count.
function flight(unit,id,quad,source){layerFor(unit).stairs.push({id,kind:'schematic-stair-flight-envelope',quad:quad.map(([x,y,z])=>p3(x,y,z*100)),source,confidence:'plan-symbol location; vertical interpolation assumes native 3.05 m floor level',treadsModeled:false});}
const mid=levelBase/2;
flight('103','upper-103-central-lower-flight',[[222,2632,0],[324,2632,0],[324,2830,mid],[222,2830,mid]],'103 first/second-floor PNG central Y-shaped stair symbol; approximate symbol bounds within native opening');
flight('103','upper-103-central-landing',[[222,2830,mid],[324,2830,mid],[324,2925,mid],[222,2925,mid]],'103 second-floor PNG central stair landing; elevation is illustrative midpoint');
flight('103','upper-103-central-left-flight',[[222,2830,mid],[222,2925,mid],[90.1,2925,levelBase],[90.1,2830,levelBase]],'103 second-floor PNG left branch of central Y-shaped stair');
flight('103','upper-103-central-right-flight',[[324,2925,mid],[324,2830,mid],[441.7,2830,levelBase],[441.7,2925,levelBase]],'103 second-floor PNG right branch of central Y-shaped stair');
flight('103','upper-103-rear-flight',[[233.437821,4148.0360663,0],[233.437821,4240.67,0],[-120,4240.67,levelBase],[-120,4148.0360663,levelBase]],'103 second-floor PNG rear stair flight; source wall enclosure retained');
flight('101','upper-101-rear-flight',[[1424.950511,4150.40523,0],[1424.950511,4240.841337,0],[1839.2,4240.841337,levelBase],[1839.2,4150.40523,levelBase]],'101 second-floor PNG gray flight at native rear stair bay; tan landing preserved');

// Portable non-indexed glTF writer with normals and semantic extras.
const gltf={asset:{version:'2.0',generator:'OTB native upper-floor additive converter'},scene:0,scenes:[{name:'OTB upper floors 101 and 103',nodes:[]}],nodes:[],meshes:[],materials:[],accessors:[],bufferViews:[],buffers:[]};
const chunks=[];let length=0;
function attribute(values){const arr=new Float32Array(values),raw=Buffer.from(arr.buffer);const view=gltf.bufferViews.length;gltf.bufferViews.push({buffer:0,byteOffset:length,byteLength:raw.length,target:34962});chunks.push(raw);length+=raw.length;const a={bufferView:view,componentType:5126,count:values.length/3,type:'VEC3',min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};for(let i=0;i<arr.length;i++){a.min[i%3]=Math.min(a.min[i%3],arr[i]);a.max[i%3]=Math.max(a.max[i%3],arr[i]);}gltf.accessors.push(a);return gltf.accessors.length-1;}
function material(name,color){gltf.materials.push({name,pbrMetallicRoughness:{baseColorFactor:[...color,1],metallicFactor:0,roughnessFactor:.9},doubleSided:true});return gltf.materials.length-1;}
const materials={walls:material('Upper native walls',[.78,.76,.69]),floors:material('Upper source floor planes',[.80,.76,.66]),stairs:material('Schematic stair envelopes',[.42,.47,.48])};
const geometry=()=>({positions:[],normals:[]});
function tri(g,a,b,c,normal){let u=b.map((v,i)=>v-a[i]),v=c.map((n,i)=>n-a[i]);let n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],L=Math.hypot(...n);if(L<1e-12)return;if(normal&&n.reduce((s,x,i)=>s+x*normal[i],0)<0){[b,c]=[c,b];n=n.map(x=>-x);}n=n.map(x=>x/L);g.positions.push(...a,...b,...c);g.normals.push(...n,...n,...n);}
function quad(g,a,b,c,d,normal){tri(g,a,b,c,normal);tri(g,a,c,d,normal);}
function flat(g,outer,holes,elevation){const contours=outer.map(p=>new Vector2(...p)),holeVectors=holes.map(h=>h.map(p=>new Vector2(...p)));const points=contours.concat(...holeVectors);const faces=ShapeUtils.triangulateShape(contours,holeVectors);for(const face of faces)tri(g,...face.map(i=>[points[i].x,elevation,points[i].y]),[0,1,0]);}
function prism(g,w,s0,s1,low,high){if(s1-s0<1e-6||high-low<1e-6)return;const dx=w.b[0]-w.a[0],dz=w.b[2]-w.a[2],L=Math.hypot(dx,dz),ux=dx/L,uz=dz/L;const offsets=[w.thicknessMeters*w.balance,-w.thicknessMeters*(1-w.balance)];const p=(s,off,y)=>[w.a[0]+s*ux-off*uz,y,w.a[2]+s*uz+off*ux];const a=p(s0,offsets[0],low),b=p(s1,offsets[0],low),c=p(s1,offsets[1],low),d=p(s0,offsets[1],low),at=p(s0,offsets[0],high),bt=p(s1,offsets[0],high),ct=p(s1,offsets[1],high),dt=p(s0,offsets[1],high);quad(g,at,bt,ct,dt,[0,1,0]);quad(g,a,b,c,d,[0,-1,0]);quad(g,a,b,bt,at,[-uz,0,ux]);quad(g,b,c,ct,bt,[ux,0,uz]);quad(g,c,d,dt,ct,[uz,0,-ux]);quad(g,d,a,at,dt,[-ux,0,-uz]);}
function wallMesh(g,w){const L=Math.hypot(w.b[0]-w.a[0],w.b[2]-w.a[2]),base=w.a[1],top=base+w.heightMeters;const openings=w.openings.map(o=>({start:Math.max(0,o.t*L-o.widthMeters/2),end:Math.min(L,o.t*L+o.widthMeters/2),bottom:Math.max(base,base+o.bottomMeters),top:Math.min(top,base+o.bottomMeters+o.heightMeters)}));const cuts=[...new Set([0,L,...openings.flatMap(o=>[o.start,o.end])])].sort((a,b)=>a-b);for(let i=0;i<cuts.length-1;i++){const a=cuts[i],b=cuts[i+1],middle=(a+b)/2;let y=base;for(const o of openings.filter(o=>o.start<=middle&&o.end>=middle).sort((a,b)=>a.bottom-b.bottom)){if(o.bottom>y)prism(g,w,a,b,y,o.bottom);y=Math.max(y,o.top);}if(y<top)prism(g,w,a,b,y,top);}}
const allBounds={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};
for(const layer of layers){const nodeIndex=gltf.nodes.length;gltf.nodes.push({name:layer.id,children:[],extras:{layerId:layer.id,unit:layer.unit,level:2,elevationStatus:layer.elevationStatus}});gltf.scenes[0].nodes.push(nodeIndex);layer.boundsMeters={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};
  function add(name,g,role,mat){if(!g.positions.length)return;const position=attribute(g.positions),normal=attribute(g.normals),meshIndex=gltf.meshes.length;gltf.meshes.push({name,primitives:[{attributes:{POSITION:position,NORMAL:normal},material:materials[mat],mode:4}]});const child=gltf.nodes.length;gltf.nodes.push({name,mesh:meshIndex,extras:{assetId:name,layerId:layer.id,category:role==='walls'?'walls':'floors',elementType:role,unit:layer.unit,level:2,physicalVerification:'unverified'}});gltf.nodes[nodeIndex].children.push(child);const bounds=gltf.accessors[position];for(let i=0;i<3;i++){layer.boundsMeters.min[i]=Math.min(layer.boundsMeters.min[i],bounds.min[i]);layer.boundsMeters.max[i]=Math.max(layer.boundsMeters.max[i],bounds.max[i]);allBounds.min[i]=Math.min(allBounds.min[i],bounds.min[i]);allBounds.max[i]=Math.max(allBounds.max[i],bounds.max[i]);}}
  const walls=geometry();for(const w of layer.walls)wallMesh(walls,w);add(`${layer.id}-walls`,walls,'walls','walls');
  const floors=geometry();for(const f of layer.floors)flat(floors,f.outer,f.holes,f.elevationMeters);add(`${layer.id}-floors`,floors,'floors','floors');
  const stairs=geometry();for(const s of layer.stairs)quad(stairs,...s.quad,[0,1,0]);add(`${layer.id}-stairs`,stairs,'schematic-stair-envelope','stairs');
}
gltf.buffers=[{byteLength:length}];const json=Buffer.from(JSON.stringify(gltf));const jsonPadded=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]),binary=Buffer.concat(chunks);const header=Buffer.alloc(12),jsonHeader=Buffer.alloc(8),binHeader=Buffer.alloc(8);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+jsonPadded.length+binary.length,8);jsonHeader.writeUInt32LE(jsonPadded.length);jsonHeader.writeUInt32LE(0x4e4f534a,4);binHeader.writeUInt32LE(binary.length);binHeader.writeUInt32LE(0x004e4942,4);const glb=Buffer.concat([header,jsonHeader,jsonPadded,binHeader,binary]);
const result={schemaVersion:1,title:'OTB · source-derived upper floors 101 and 103',units:'meters',upAxis:'Y',modelFile:'upper-floors.glb',sourceModelOriginFmlCm:origin,sources,registration,layers,boundsMeters:allBounds,limitations,verticalDiscrepancy:{upperBaseMeters:levelBase,upperBaseBasis:'native ground-floor height metadata',existingGroundWallHeightMeters:ground.walls[0].az.h/100,overlapMeters:ground.walls[0].az.h/100-levelBase,physicalFloorToFloorHeightMeters:null},preservation:{baseModelSha256:baseHash,originalColumnIds:modelData.columns.map(c=>c.id),existingModelChanged:false},validation:{glbBytes:glb.length,nodes:gltf.nodes.length,meshes:gltf.meshes.length,sourceUpperWalls:upper.walls.length,sourceUpperAreas:upper.areas.length,centralVoidAutoFillOmitted:true,guardBoundarySegmentsOmitted:omittedGuardWalls.size,doorVoidCount:layers.reduce((s,l)=>s+l.walls.reduce((n,w)=>n+w.openings.length,0),0)}};
if(glb.readUInt32LE(8)!==glb.length||!Number.isFinite(allBounds.max[1]))throw new Error('Invalid generated upper-floor geometry.');
if(sha(fs.readFileSync(path.join(output,'model.glb')))!==baseHash||sha(fs.readFileSync(nativePath))!==sha(bytes))throw new Error('Original geometry changed during build.');
fs.writeFileSync(path.join(output,'upper-floors.json'),JSON.stringify(result,null,2));fs.writeFileSync(path.join(output,'upper-floors.glb'),glb);
console.log(JSON.stringify({translationCm:[dx,dy],elevationMeters:levelBase,layers:layers.map(l=>({id:l.id,walls:l.walls.length,floors:l.floors.length,voids:l.voids.length,stairs:l.stairs.length,bounds:l.boundsMeters})),validation:result.validation,sourceUnchanged:true},null,2));
