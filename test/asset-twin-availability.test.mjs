import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { build } from 'vite';
import { assetTwinAvailable } from '../src/lib/asset-twin-availability.js';
import { assetTwinBuildGuard } from '../tools/asset-twin-build-guard.mjs';
import { maintenanceLinkFields } from '../src/lib/maintenance-model.js';

test('twin remains local-review or explicitly enabled authorized hosted functionality', () => {
  assert.equal(assetTwinAvailable(), false);
  assert.equal(assetTwinAvailable({ localReview: true }), true);
  for (const role of ['operator', 'owner', 'tenant', 'vendor', 'pending', undefined]) {
    assert.equal(assetTwinAvailable({ remote: true, role }), false);
    assert.equal(assetTwinAvailable({ remote: true, hostedEnabled: true, role }), ['operator', 'owner'].includes(role));
    assert.equal(assetTwinAvailable({ hostedEnabled: true, role }), false);
  }
  // Ordinary M-1 requests require no optional twin migration columns.
  assert.deepEqual(maintenanceLinkFields({ unit: '101' }), { unit: '101' });
});

test('compiled disabled builds omit twin evidence and preserve other public assets', async t => {
  const root = await mkdtemp(path.join(tmpdir(), 'otb-twin-gate-test-'));
  t.after(async () => {
    assert.equal(path.dirname(root), path.resolve(tmpdir()));
    assert.ok(path.basename(root).startsWith('otb-twin-gate-test-'));
    await rm(root, { recursive: true, force: true });
  });
  for (const folder of ['src/views', 'src/assets/twin', 'public/twin', 'public/brand']) await mkdir(path.join(root, folder), { recursive: true });
  await writeFile(path.join(root, 'index.html'), '<script type="module" src="/main.js"></script>');
  await writeFile(path.join(root, 'main.js'), `if (import.meta.env.DEV || import.meta.env.VITE_ASSET_TWIN_ENABLED === '1') import('./src/views/asset-twin.js').then(m => m.render());`);
  await writeFile(path.join(root, 'src/views/asset-twin.js'), `import picture from '../assets/twin/private-reference.png'; export function render() { document.body.textContent = 'TWIN_PRIVATE_EVIDENCE'; document.body.dataset.image = picture; }`);
  await writeFile(path.join(root, 'src/assets/twin/private-reference.png'), Buffer.alloc(5000, 42));
  await writeFile(path.join(root, 'public/twin/model.glb'), 'PRIVATE_MODEL');
  await writeFile(path.join(root, 'public/brand/logo.svg'), '<svg>EXISTING_PUBLIC_BRAND</svg>');
  const files = async directory => (await Promise.all((await readdir(directory, { withFileTypes: true })).map(async entry => entry.isDirectory()
    ? (await files(path.join(directory, entry.name))).map(file => entry.name + '/' + file) : [entry.name]))).flat();
  for (const enabled of [false, true]) {
    const outDir = path.join(root, enabled ? 'dist-enabled' : 'dist-disabled');
    await build({ configFile: false, root, logLevel: 'silent',
      define: { 'import.meta.env.VITE_ASSET_TWIN_ENABLED': JSON.stringify(enabled ? '1' : '0') },
      build: { outDir, copyPublicDir: enabled, minify: false }, plugins: [assetTwinBuildGuard(enabled)] });
    const output = await files(outDir);
    assert.equal(output.includes('twin/model.glb'), enabled);
    assert.equal(output.some(file => file.includes('private-reference')), enabled);
    assert.equal(await readFile(path.join(outDir, 'brand/logo.svg'), 'utf8'), '<svg>EXISTING_PUBLIC_BRAND</svg>');
    const chunks = await Promise.all(output.filter(file => file.endsWith('.js')).map(file => readFile(path.join(outDir, file), 'utf8')));
    assert.equal(chunks.some(code => code.includes('TWIN_PRIVATE_EVIDENCE')), enabled);
  }
  await writeFile(path.join(root, 'main.js'), `import { render } from './src/views/asset-twin.js'; render();`);
  await assert.rejects(build({ configFile: false, root, logLevel: 'silent', build: { outDir: path.join(root, 'dist-accidental'), copyPublicDir: false }, plugins: [assetTwinBuildGuard(false)] }), /Disabled asset twin still includes source evidence/);
});
