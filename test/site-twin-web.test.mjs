import test from 'node:test';
import assert from 'node:assert/strict';
import { posix } from 'node:path';
import { buildSiteTwinWebPackage } from '../tools/site-twin/web-package.mjs';
import { siteTwinWebPlugin } from '../tools/site-twin/vite-plugin.mjs';
import { validateGlb } from '../tools/site-twin/glb.mjs';

test('A-5 package is self-contained under the strict hosted script policy', () => {
  const files = buildSiteTwinWebPackage();
  assert.equal(validateGlb(files.get('model.glb')).ok, true);
  assert.doesNotMatch(files.get('index.html'), /type="importmap"/);
  assert.ok(JSON.parse(files.get('twin-data.json')).assets.some(asset => asset.category === 'stall'));
  for (const [filename, source] of files) {
    assert.doesNotMatch(filename, /server\.py|\.cmd$|README/);
    if (!filename.endsWith('.js')) continue;
    for (const match of source.matchAll(/(?:import|export)\s+(?:\*\s+as\s+\w+|\{[\s\S]*?\})\s+from\s+['"]([^'"]+)['"]/g)) {
      // Three's comments also describe optional addons that are not imports.
      const before = source.slice(0, match.index).split('\n').at(-1);
      if (before.trim().startsWith('*')) continue;
      assert.ok(match[1].startsWith('.'), filename + ': unexpected bare module ' + match[1]);
      assert.ok(files.has(posix.normalize(posix.join(posix.dirname(filename), match[1]))), filename + ': missing ' + match[1]);
    }
  }
});

function serverFor(plugin) {
  let middleware, change;
  plugin.configureServer({ watcher: { add() {}, on(_event, fn) { change = fn; } },
    middlewares: { use(fn) { middleware = fn; } }, config: { logger: { error() {} } } });
  return { change, request(url, method = 'GET') {
    const response = { statusCode: 200, headers: {}, setHeader(key, value) { this.headers[key] = value; }, end(body) { this.body = body; } };
    middleware({ url, method }, response, () => { response.next = true; });
    return response;
  } };
}

test('disabled A-5 cannot build, emit or serve private package files', () => {
  const plugin = siteTwinWebPlugin({ enabled: false, buildPackage() { throw new Error('must not generate'); } });
  plugin.generateBundle.call({ emitFile() { assert.fail('must not emit'); } });
  const server = serverFor(plugin);
  assert.equal(server.request('/site-twin/model.glb').statusCode, 404);
  assert.equal(server.request('/site-twin/index.html?embedded=1').statusCode, 404);
  assert.equal(server.request('/other').next, true);
});

test('A-5 dev serves exact package paths and production emits those same bytes', () => {
  const files = new Map([['index.html', '<html>viewer</html>'], ['model.glb', Buffer.from('model')]]);
  const plugin = siteTwinWebPlugin({ enabled: true, buildPackage: () => files });
  const server = serverFor(plugin);
  assert.equal(server.request('/site-twin/index.html?embedded=1').body, files.get('index.html'));
  assert.equal(server.request('/site-twin/').body, files.get('index.html'));
  assert.equal(server.request('/site-twin').headers.Location, '/site-twin/');
  assert.equal(server.request('/site-twin/model.glb', 'HEAD').body, undefined);
  assert.equal(server.request('/site-twin/model.glb', 'POST').statusCode, 405);
  for (const path of ['../package.json', '%2e%2e/package.json', 'server.py', 'missing.js']) {
    assert.equal(server.request('/site-twin/' + path).statusCode, 404);
  }
  const emitted = [];
  plugin.generateBundle.call({ emitFile: entry => emitted.push(entry) });
  assert.deepEqual(emitted.map(({ fileName, source }) => [fileName, source]), [...files].map(([key, body]) => ['site-twin/' + key, body]));
});
