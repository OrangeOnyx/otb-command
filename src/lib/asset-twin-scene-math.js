/** Pure, meter-based camera and measurement helpers. No DOM or Three.js dependency. */
export const EYE_HEIGHT_METERS = 1.68;
export const isPoint3 = value => Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);
const add = (a,b) => a.map((n,i)=>n+b[i]);
const sub = (a,b) => a.map((n,i)=>n-b[i]);
const scale = (a,n) => a.map(v=>v*n);
const dot = (a,b) => a.reduce((n,v,i)=>n+v*b[i],0);
const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm = a => { const length=Math.hypot(...a);return length>1e-9?scale(a,1/length):[0,0,-1]; };
export function validBounds(bounds) {
  return bounds && isPoint3(bounds.min) && isPoint3(bounds.max) && bounds.min.every((v,i)=>v<=bounds.max[i]);
}
export function pointInBounds(point,bounds,margin=0) {
  return isPoint3(point) && validBounds(bounds) && Number.isFinite(margin) && point.every((v,i)=>v>=bounds.min[i]-margin&&v<=bounds.max[i]+margin);
}
export function modelDistance(a,b,bounds) {
  if(!isPoint3(a)||!isPoint3(b))throw new TypeError('Measurement requires two finite 3D surface points.');
  if(bounds&&(!pointInBounds(a,bounds,.001)||!pointInBounds(b,bounds,.001)))throw new RangeError('Measurement point is outside source model bounds.');
  return Math.hypot(...sub(a,b));
}
export function boundsCorners(bounds) {
  if(!validBounds(bounds))throw new TypeError('Invalid source model bounds.');
  const points=[];for(const x of [bounds.min[0],bounds.max[0]])for(const y of [bounds.min[1],bounds.max[1]])for(const z of [bounds.min[2],bounds.max[2]])points.push([x,y,z]);return points;
}
export function fitPerspectiveToBounds(bounds,{direction=[-.35,-.68,.48],aspect=1,fov=43,padding=1.12}={}) {
  if(!Number.isFinite(aspect)||aspect<=0||!Number.isFinite(fov)||fov<=0||fov>=160)throw new RangeError('Invalid camera aspect or field of view.');
  const corners=boundsCorners(bounds),target=bounds.min.map((n,i)=>(n+bounds.max[i])/2);
  const forward=norm(direction);let right=norm(cross(forward,[0,1,0]));
  if(Math.abs(dot(forward,[0,1,0]))>.999)right=[1,0,0];
  const up=norm(cross(right,forward)),tan=Math.tan(fov*Math.PI/360);let distance=.5;
  for(const p of corners){const offset=sub(p,target);distance=Math.max(distance,Math.abs(dot(offset,right))/(tan*aspect)-dot(offset,forward),Math.abs(dot(offset,up))/tan-dot(offset,forward));}
  distance*=Math.max(1,padding);
  return {position:add(target,scale(forward,-distance)),target,forward,right,up,distance};
}
export function buildEyeCandidates(column,columns,center,eyeHeight=EYE_HEIGHT_METERS) {
  if(!isPoint3(column?.position)||!isPoint3(center)||!Number.isFinite(eyeHeight))throw new TypeError('Source column position is required.');
  const p=column.position,target=[p[0],eyeHeight,p[2]],inward=norm([center[0]-p[0],0,center[2]-p[2]]);
  let ideal=add(target,scale(inward,8.5));
  const nearest=columns.filter(c=>c.id!==column.id&&isPoint3(c.position)).map(c=>({position:c.position,distance:Math.hypot(c.position[0]-p[0],c.position[2]-p[2])})).filter(c=>c.distance>2).sort((a,b)=>a.distance-b.distance)[0];
  if(nearest){const along=norm([nearest.position[0]-p[0],0,nearest.position[2]-p[2]]);let normal=[-along[2],0,along[0]];if(dot(normal,inward)<0)normal=scale(normal,-1);ideal=add(add(target,scale(normal,2.2)),scale(along,-4));}
  const candidates=[ideal];
  for(const radius of [3.5,5,7])for(let i=0;i<16;i++){const angle=i*Math.PI/8;candidates.push([p[0]+Math.cos(angle)*radius,eyeHeight,p[2]+Math.sin(angle)*radius]);}
  return {target,ideal,candidates};
}
/** assess(position,target) returns {clear:boolean,onWalkway:boolean}. Never accepts a blocked fallback. */
export function chooseEyePlacement(column,columns,center,assess) {
  const {target,ideal,candidates}=buildEyeCandidates(column,columns,center);
  const valid=candidates.map(position=>({position,...assess(position,target)})).filter(c=>c.clear).map(c=>({...c,score:modelDistance(c.position,ideal)+(c.onWalkway?0:100)})).sort((a,b)=>a.score-b.score);
  return valid.length?{position:[...valid[0].position],target,onWalkway:!!valid[0].onWalkway}:null;
}
export function normalizeSectionHeight(height,bounds) {
  if(height===null||height===undefined)return null;
  if(!Number.isFinite(height)||!validBounds(bounds))throw new TypeError('Section height must be a finite meter value or null.');
  return Math.max(bounds.min[1],Math.min(bounds.max[1],height));
}
export function normalizeFinishPalette(palette,previous={}) {
  if(palette===null)return {};
  if(!palette||typeof palette!=='object')return {...previous};
  const next={...previous};
  for(const key of ['walls','columns','walkway','canopy','canopyTop','glazing'])if(typeof palette[key]==='string'&&/^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(palette[key]))next[key]=palette[key];
  return next;
}
export function validateSavedView(view,bounds,categoryIds=[]) {
  if(!view||view.version!==1||!['overview','plan','eye'].includes(view.mode)||!isPoint3(view.position)||!isPoint3(view.target)||!validBounds(bounds))return false;
  const span=Math.max(1,...bounds.max.map((v,i)=>v-bounds.min[i])),center=bounds.min.map((v,i)=>(v+bounds.max[i])/2);
  if(modelDistance(view.position,view.target)<.01||modelDistance(view.position,center)>span*20||modelDistance(view.target,center)>span*5)return false;
  if(view.position[1]<bounds.min[1]-.05||!Number.isFinite(view.zoom)||view.zoom<=0||view.zoom>100)return false;
  if(view.sectionHeight!==null&&view.sectionHeight!==undefined&&(!Number.isFinite(view.sectionHeight)||view.sectionHeight<bounds.min[1]||view.sectionHeight>bounds.max[1]))return false;
  if(view.layers&&Object.entries(view.layers).some(([key,value])=>!categoryIds.includes(key)||typeof value!=='boolean'))return false;
  return true;
}
