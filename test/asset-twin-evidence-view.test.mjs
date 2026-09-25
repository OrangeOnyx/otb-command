import test from 'node:test';
import assert from 'node:assert/strict';
import { evidenceLink, evidenceSectionHTML } from '../src/views/asset-twin-evidence.js';

test('evidence links reject executable protocols and credentials', () => {
  for (const value of ['javascript:alert(1)', 'data:text/html,<script>', 'http://example.com', 'https://user:secret@example.com', '/relative', null]) assert.equal(evidenceLink(value), null);
  assert.equal(evidenceLink('https://example.com/view?date=2026-01-27'), 'https://example.com/view?date=2026-01-27');
});

test('evidence renderer escapes source content and distinguishes source dates, review dates and scope', () => {
  const html=evidenceSectionHTML({label:'C12'}, [{id:'source-1',title:'<img onerror=alert(1)>',url:'javascript:alert(1)',kind:'dated-view',status:'reference',scope:'site-context',sourceDate:'2026-01-27',dateMeaning:'imagery-selector',reviewedAt:'2026-09-25',provider:'A&B',notes:'<script>bad()</script>'}],[],false);
  assert.ok(!html.includes('<img'));
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('href="javascript:'));
  assert.ok(html.includes('&lt;img onerror=alert(1)&gt;'));
  assert.ok(html.includes('Imagery selector date: 2026-01-27'));
  assert.ok(html.includes('Reviewed 2026-09-25'));
  assert.ok(html.includes('does not locate this individual asset'));
  assert.ok(html.includes('<fieldset disabled>'));
});

test('saved source-date caveats are displayed without substituting a precise acquisition date', () => {
  const html=evidenceSectionHTML({label:'Meter 1'},[{id:'source-2',title:'Aerial',url:'https://example.com/',kind:'source',status:'reference',scope:'site-context',sourceDate:null,sourceDateLabel:'2024 service; exact flight date unknown',dateMeaning:'source-year',reviewedAt:'2026-09-25'}],[],true);
  assert.ok(html.includes('2024 service; exact flight date unknown'));
  assert.ok(html.includes('rel="noopener noreferrer"'));
});
