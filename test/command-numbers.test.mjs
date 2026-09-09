import test from 'node:test';
import assert from 'node:assert/strict';
import { atlasSuiteMarkup, recordedAmount } from '../src/views/command-numbers.js';

test('a missing receipt is not rendered as zero cash collected', () => {
  for (const record of [undefined,null,{count:0,amount:null},{count:0,amount:0},{count:2,amount:null},{count:2,amount:NaN}]) {
    assert.equal(recordedAmount(record,'No receipts recorded'),'No receipts recorded');
  }
  assert.equal(recordedAmount({count:1,amount:0}),'$0.00');
  assert.equal(recordedAmount({count:2,amount:1205.5}),'$1,205.50');
});

test('suite finance stays absent without an authorized report or a matching suite', () => {
  assert.equal(atlasSuiteMarkup(null,'101',()=>{throw new Error('must not request a source');}), '');
  assert.equal(atlasSuiteMarkup({scheduled:{units:{}}},'101',()=>{throw new Error('must not request a source');}), '');
});

test('scheduled suite zero remains a dated contractual value with its source', () => {
  const report = {scheduled:{asOf:'2026-07-16',sourceId:'atlas-rent-roll',units:{'135B':{monthly:0}}}};
  const markup = atlasSuiteMarkup(report,'135B',(id,label)=>`<button data-source="${id}">${label}</button>`);
  assert.match(markup,/\$0\.00/);
  assert.match(markup,/Contractual schedule · Jul 16, 2026/);
  assert.match(markup,/data-source="atlas-rent-roll"/);
  assert.match(markup,/current occupancy and payment are unverified/);
});

test('combined-suite reporting allocation is visible and escaped', () => {
  const report = {scheduled:{asOf:'2026-07-16',sourceId:'atlas-rent-roll',units:{'101':{monthly:1450.67,allocationNote:'Combined 101/103 reporting allocation; <not separately billable>.'}}}};
  const markup = atlasSuiteMarkup(report,'101',()=>'<button>Source</button>');
  assert.match(markup,/\$1,450\.67/);
  assert.match(markup,/Combined 101\/103 reporting allocation; &lt;not separately billable&gt;/);
  assert.doesNotMatch(markup,/<not separately billable>/);
});
