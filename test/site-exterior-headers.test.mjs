import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { headers } = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url)));
const applicable = path => headers.filter(rule => new RegExp('^' + rule.source + '$').test(path)).flatMap(rule => rule.headers);
test('only site-model files permit same-origin framing, with one policy per response', () => {
  for (const path of ['/', '/index.html', '/tour', '/api/seed', '/site-twin-other/index.html', '/site-twin/index.html', '/site-twin/viewer.js']) {
    const values = applicable(path);
    const csp = values.filter(h => h.key === 'Content-Security-Policy');
    const frame = values.filter(h => h.key === 'X-Frame-Options');
    assert.equal(csp.length, 1, path); assert.equal(frame.length, 1, path);
    const model = path.startsWith('/site-twin/');
    assert.ok(csp[0].value.includes(model ? "frame-ancestors 'self'" : "frame-ancestors 'none'"), path);
    assert.equal(frame[0].value, model ? 'SAMEORIGIN' : 'DENY', path);
    assert.ok(!csp[0].value.includes("script-src 'self' 'unsafe-inline'"));
  }
});
