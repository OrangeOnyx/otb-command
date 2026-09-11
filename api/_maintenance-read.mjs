/* Fresh, bounded GETs with caller JWT/RLS. No legacy cache fallback. */
import { supaJson,supaPost } from './_supa.mjs';
import { maintenanceEvidence } from '../src/lib/maintenance-evidence.js';

async function readPhotos(requestId,token) {
  const response = await supaPost('/storage/v1/object/list/maintenance-photos',token,{prefix:requestId+'/',limit:100,offset:0,sortBy:{column:'name',order:'asc'}});
  if (!response.ok) return {state:'unavailable'};
  const rows = await response.json();
  if (!Array.isArray(rows)) return {state:'unavailable'};
  return {state:'checked',count:rows.filter(row=>row.id).length,complete:rows.length<100};
}

export async function readCurrentMaintenance({token,property,requestId},{read=supaJson,photos=readPhotos,now=()=>new Date().toISOString()}={}) {
  const readAt = now();
  if (!token || !property?.id || !property?.org_id || !requestId) return {state:'unavailable',readAt};
  const scope = `org_id=eq.${encodeURIComponent(property.org_id)}&property_id=eq.${encodeURIComponent(property.id)}`;
  const id = encodeURIComponent(requestId);
  try {
    const rows = await read(`/rest/v1/maintenance_requests?${scope}&id=eq.${id}&select=id,unit,title,detail,urgency,created_at,org_id,property_id&limit=2`,token);
    if (!Array.isArray(rows)) return {state:'unavailable',readAt};
    if (!rows.length) return {state:'not-found',readAt};
    if (rows.length!==1 || rows[0].id!==requestId || rows[0].property_id!==property.id || rows[0].org_id!==property.org_id) return {state:'unavailable',readAt};
    const events = await read(`/rest/v1/maintenance_events?${scope}&request_id=eq.${id}&select=id,request_id,kind,status,vendor_id,note,created_at,org_id,property_id&order=created_at.asc,id.asc&limit=1000`,token);
    if (!Array.isArray(events) || events.length>=1000 || events.some(event=>event.request_id!==requestId || event.property_id!==property.id || event.org_id!==property.org_id)) return {state:'unavailable',readAt};
    let photoRead;
    try { photoRead=await photos(requestId,token); } catch { photoRead={state:'unavailable'}; }
    return maintenanceEvidence({request:rows[0],events,photos:photoRead,readAt,mode:'live-read'});
  } catch { return {state:'unavailable',readAt}; }
}
