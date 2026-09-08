/* Presentation of a bounded, dated request read. No store or network. */
import { deriveRequest } from './maintenance-model.js';
import { previewEvidenceNotice } from './command-evidence.js';

export function maintenanceEvidence({request,events,photos,readAt,mode='snapshot',sourcePath=null,method=null}) {
  if (!request?.id || !Array.isArray(events) || !readAt || !Number.isFinite(Date.parse(readAt))) throw new Error('Incomplete maintenance evidence.');
  if (events.some(event => event.request_id !== request.id)) throw new Error('Unrelated maintenance event.');
  const derived = deriveRequest(request,events);
  return {
    state:'verified',mode,readAt,sourcePath,method,requestId:request.id,unit:request.unit,title:request.title,
    detail:request.detail,createdAt:request.created_at,status:derived.displayStatus,
    explicitStatus:events.some(event => event.kind === 'status'),vendorId:derived.vendorId,
    lastAt:derived.lastAt,events:events.map(({id,kind,status,vendor_id,note,created_at})=>({id,kind,status,vendor_id,note,created_at})),
    photos:photos?.state === 'checked' && Number.isInteger(photos.count) && photos.count >= 0
      ? {state:'checked',count:photos.count,complete:photos.complete === true} : {state:'unavailable'},
  };
}

export function maintenanceReadSource(read) {
  if (read?.state !== 'verified') return null;
  return {
    id:'maintenance-system-record', title:read.preview ? 'Linked M-1 work order · isolated test copy' : 'Linked M-1 work order · dated system read',
    kind:read.preview ? 'Authenticated preview database read' : read.mode === 'live-read' ? 'Authenticated database read' : 'Database verification snapshot',
    path:`${read.sourcePath ? read.sourcePath+' · ' : ''}${read.preview ? 'Isolated Cypress test database' : 'Supabase otb-command'} · public.maintenance_requests / public.maintenance_events · ${read.requestId}`,
    asOf:read.readAt,
    excerpt:(read.preview ? previewEvidenceNotice(read.preview)+'\n\n' : '')+JSON.stringify(read,null,2)+'\n\nThis is a dated read of the request and its event trail, not an on-site inspection. The open status may be unchanged since import. No quote, invoice, payment or completion document is established by this read. Photo counts describe only the visible maintenance-photos request folder. The archived work order and physical frontage association retain their separate sources.',
  };
}

export function attachMaintenanceRead(evidence,read,{preview=null}={}) {
  if (preview) read={...read,preview};
  const source = maintenanceReadSource(read);
  return {...evidence,...(preview?{preview}:{}),currentRead:read,issue:{...evidence.issue,...(preview?{preview}:{}),systemRecord:source ? read : null,
    sourceIds:[...evidence.issue.sourceIds.filter(id=>id!=='maintenance-system-record'),...(source?['maintenance-system-record']:[])]},
    sources:[...evidence.sources.filter(item=>item.id!=='maintenance-system-record'),...(source?[source]:[])]};
}
