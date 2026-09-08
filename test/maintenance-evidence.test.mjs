import test from 'node:test';
import assert from 'node:assert/strict';
import {readCurrentMaintenance} from '../api/_maintenance-read.mjs';
import {maintenanceEvidence,attachMaintenanceRead} from '../src/lib/maintenance-evidence.js';
import {loadCommandEvidence} from '../tools/command-evidence-data.mjs';
import {buildOwnerUpdate} from '../src/lib/command-evidence.js';

// Synthetic rows exercise failure boundaries; the application fixture remains
// the separately dated real request read from repository records.
const property={id:'p1',org_id:'o1'},requestId='ac:request-1',readAt='2026-09-08T06:00:00Z';
const request={id:requestId,property_id:'p1',org_id:'o1',unit:'Common Area',title:'Test only',created_at:'2026-07-28T00:00:00Z'};
const event={id:1,request_id:requestId,property_id:'p1',org_id:'o1',kind:'status',status:'open',created_at:'2026-07-28T00:00:00Z'};
const args={token:'caller-token',property,requestId};
function dependencies({requests=[request],events=[event],photoResult={state:'checked',count:0,complete:true},outage=false}={}) {
  const calls=[];
  return {calls,now:()=>readAt,read:async(path,token)=>{
    calls.push({path,token});if(outage)throw new Error('outage');
    return path.includes('maintenance_requests?')?requests:events;
  },photos:async(id,token)=>{calls.push({id,token});if(photoResult instanceof Error)throw photoResult;return photoResult;}};
}

test('maintenance read binds every request/event lookup to property, organization and caller JWT',async()=>{
  const deps=dependencies(), result=await readCurrentMaintenance(args,deps);
  assert.equal(result.state,'verified');assert.equal(result.mode,'live-read');
  assert.equal(result.status,'open');assert.equal(result.explicitStatus,true);
  assert.equal(result.readAt,readAt);assert.equal(result.photos.count,0);
  assert.ok(deps.calls.every(call=>call.token==='caller-token'));
  assert.ok(deps.calls.slice(0,2).every(call=>call.path.includes('org_id=eq.o1&property_id=eq.p1')));
  assert.ok(deps.calls[1].path.includes('order=created_at.asc,id.asc'));
  assert.ok(!JSON.stringify(result).includes('org_id'));
});

test('missing credentials do not trigger a read',async()=>{
  const deps=dependencies();assert.equal((await readCurrentMaintenance({...args,token:null},deps)).state,'unavailable');
  assert.equal(deps.calls.length,0);
});

test('request missing, denied, wrong property or outage never becomes a cached open record',async()=>{
  for (const [opts,state] of [[{requests:[]},'not-found'],[{requests:null},'unavailable'],[{requests:[{...request,property_id:'other'}]},'unavailable'],[{requests:[{...request,org_id:'other'}]},'unavailable'],[{requests:[request,request]},'unavailable'],[{outage:true},'unavailable']]) {
    const deps=dependencies(opts),result=await readCurrentMaintenance(args,deps);
    assert.equal(result.state,state);assert.equal(result.status,undefined);assert.equal(deps.calls.length,1);
  }
});

test('incomplete or unrelated event trails cannot establish status',async()=>{
  for (const events of [null,Array(1000).fill(event),[{...event,request_id:'other'}],[{...event,property_id:'other'}],[{...event,org_id:'other'}]]) {
    const result=await readCurrentMaintenance(args,dependencies({events}));
    assert.equal(result.state,'unavailable');assert.equal(result.status,undefined);
  }
});

test('photo permission failure leaves valid request evidence and explicitly unverified photos',async()=>{
  const result=await readCurrentMaintenance(args,dependencies({photoResult:new Error('forbidden')}));
  assert.equal(result.state,'verified');assert.deepEqual(result.photos,{state:'unavailable'});
});

test('empty event trail labels default state; ordered later events use existing M-1 derivation',async()=>{
  const empty=await readCurrentMaintenance(args,dependencies({events:[]}));
  assert.equal(empty.status,'open');assert.equal(empty.explicitStatus,false);
  const events=[event,{...event,id:2,kind:'assign',vendor_id:'vendor-1'}, {...event,id:3,status:'done'}];
  const result=await readCurrentMaintenance(args,dependencies({events}));
  assert.equal(result.status,'done');assert.equal(result.vendorId,'vendor-1');
  assert.throws(()=>maintenanceEvidence({request,events:[{...event,request_id:'other'}],readAt}),/Unrelated/);
});

test('dated local verification is excluded from the hosted evidence base',async()=>{
  const local=await loadCommandEvidence(),hosted=await loadCommandEvidence({includeSnapshot:false});
  assert.equal(local.issue.systemRecord.requestId,local.issue.liveRequestId);
  assert.equal(local.issue.systemRecord.readAt,'2026-09-08T05:24:33.481499+00:00');
  assert.equal(local.issue.systemRecord.mode,'snapshot');
  assert.equal(local.issue.systemRecord.events.length,1);
  assert.equal(local.issue.systemRecord.status,'open');
  assert.equal(hosted.issue.systemRecord,undefined);
  assert.equal(hosted.sources.some(source=>source.id==='maintenance-system-record'),false);
  const unavailable=attachMaintenanceRead(local,{state:'unavailable',readAt});
  assert.equal(unavailable.issue.systemRecord,null);
  assert.equal(unavailable.sources.some(source=>source.id==='maintenance-system-record'),false);
  assert.equal(unavailable.issue.archivedStatus,'open');
});

test('owner update cites the dated system read without claiming a current inspection, payment or photo proof',async()=>{
  const {issue}=await loadCommandEvidence();
  const current=buildOwnerUpdate({issue,generatedAt:'2026-09-08'});
  assert.equal(current.sourceIds.length,4);
  assert.match(current.text,/LINKED WORK-ORDER CHECK/);
  assert.match(current.text,/Recorded state: open/);
  assert.match(current.text,/Photo folder: 0 visible files/);
  assert.match(current.text,/database status is not a site inspection/);
  assert.match(current.text,/Payment: unknown/);
  assert.equal(current.text.includes('unpaid'),false);
  const earlier=buildOwnerUpdate({issue,generatedAt:'2026-09-07'});
  assert.equal(earlier.sourceIds.length,3);
  assert.equal(earlier.text.includes('maintenance-system-record'),false);
});
