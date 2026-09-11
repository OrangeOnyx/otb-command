import test from 'node:test';
import assert from 'node:assert/strict';
import { leaseEvidenceMarkup, leaseSourceUrl } from '../src/lib/lease-evidence-ui.js';

test('lease evidence remains absent until private evidence is supplied', () => {
  for (const value of [undefined, null, {}, [], 'untrusted']) assert.equal(leaseEvidenceMarkup(value), '');
});

test('source references are text and only genuine Gmail HTTPS URLs are links', () => {
  for (const url of ['file:///G:/leases/a.pdf','javascript:alert(1)','https://mail.google.com.evil.test/mail/u/','https://mail.google.com@evil.test/mail/u/','http://mail.google.com/mail/u/','https://evil.test/','https://user:password@mail.google.com/mail/u/']) assert.equal(leaseSourceUrl(url), null);
  const safe = 'https://mail.google.com/mail/u/?authuser=example%40example.com#all/123';
  assert.equal(leaseSourceUrl(safe), safe);
  const markup = leaseEvidenceMarkup({label:'Owner <confirmed>',summary:'<script>bad</script>',sources:[{title:'A <source>',reference:'G:/Private/lease.pdf',url:'file:///G:/Private/lease.pdf'},{title:'Email',url:safe}]});
  assert.match(markup,/Owner &lt;confirmed&gt;/);
  assert.doesNotMatch(markup,/<script>|href="file:/);
  assert.match(markup,/G:\/Private\/lease.pdf/);
  assert.match(markup,/rel="noopener noreferrer"/);
});

test('combined planned renewal is distinct from the current schedule', () => {
  const markup = leaseEvidenceMarkup({label:'Tenant signed',status:'tenant-signed',plannedRenewal:{monthly:6150.38,start:'2026-08-01',end:'2029-07-31',scope:'Combined suites 139/141',includedInSchedule:false},openItems:['Landlord signature pending.']});
  assert.match(markup,/Proposed renewal/);
  assert.match(markup,/\$6,150\.38/);
  assert.match(markup,/Combined suites 139\/141/);
  assert.match(markup,/Not included in the current rent schedule/);
  assert.match(markup,/Aug 1, 2026 – Jul 31, 2029/);
  assert.doesNotMatch(markup,/fully executed|current charge/i);
});

test('rent phases and owner reports retain calendar and bank qualifications', () => {
  const markup = leaseEvidenceMarkup({label:'Signed lease reviewed',status:'document-reviewed',rentPhases:[{label:'Owner-mapped abatement',start:'2026-07-01',end:'2026-12-31',monthly:798.75},{label:'Owner-mapped full rent',start:'2027-01-01',end:null,monthly:3035.25}],ownerReportedPayment:{monthly:798.75,confirmedAt:'2026-09-09',bankReconciled:false}});
  assert.match(markup,/Jan 1, 2027 onward/);
  assert.match(markup,/\$3,035\.25/);
  assert.match(markup,/Calendar mapping is attributed to the owner/);
  assert.match(markup,/Owner reports \$798\.75\/month being paid/);
  assert.match(markup,/Bank settlement has not been reconciled/);
});

test('authorized source button opens the report evidence source', () => {
  const calls=[];
  const markup=leaseEvidenceMarkup({label:'Current term unresolved',status:'conflict',summary:'Conflicting signed dates.'},{sourceId:'lease-review-119',sourceButton:(id,label)=>{calls.push({id,label});return '<button>Evidence</button>';}});
  assert.deepEqual(calls,[{id:'lease-review-119',label:'Lease evidence & source records'}]);
  assert.match(markup,/is-conflict/);
  assert.match(markup,/<button>Evidence<\/button>/);
  assert.doesNotMatch(markup,/holdover/);
});
