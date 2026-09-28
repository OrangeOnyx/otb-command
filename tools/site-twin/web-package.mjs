import { readFileSync } from 'node:fs';
import { join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTwin } from '../build-site-twin.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const VIEWER = join(ROOT, 'tools/site-twin/viewer');
const THREE = join(ROOT, 'node_modules/three');

/* The standalone viewer uses an inline import map. Hosted CSP permits only
   external scripts, so its small dependency graph uses relative module URLs.
   Source files stay portable and the standalone export remains unchanged. */
function moduleURLs(source, filename) {
  return source.replace(/(from\s+)(['"])(three(?:\/addons\/[^'"]+)?)(\2)/g,
    (_match, from, quote, specifier) => {
      const target = specifier === 'three' ? 'vendor/three.module.js' : 'vendor/addons/' + specifier.slice('three/addons/'.length);
      let relative = posix.relative(posix.dirname(filename), target);
      if (!relative.startsWith('.')) relative = './' + relative;
      return from + quote + relative + quote;
    });
}

export const SITE_TWIN_INPUTS = [
  'src/data/geometry.json', 'src/data/site-register.json', 'src/data/meters.json',
  'src/data/heights.json', 'src/data/cameras.json', 'src/data/pylon.json',
  'src/data/footprints-geo.json', 'src/data/units.json',
  'src/lib/siteassets.js', 'src/lib/cameras.js', 'tools/build-site-twin.mjs',
  'tools/site-twin/coords.mjs', 'tools/site-twin/glb.mjs',
  'tools/site-twin/meshes.mjs', 'tools/site-twin/categories.mjs',
  'tools/site-twin/viewer/index.html', 'tools/site-twin/viewer/viewer.js',
  'tools/site-twin/viewer/styles.css',
].map(file => join(ROOT, file));

/* Only browser assets are published. No Python server, launcher, source paths,
   Drive output, or independently maintained copy in public/ is needed. */
export function buildSiteTwinWebPackage() {
  const twin = buildTwin();
  if (!twin.report.validation.ok) throw new Error('A-5 model validation failed: ' + twin.report.validation.errors.join('; '));
  const files = new Map([
    ['model.glb', twin.glb],
    ['twin-data.json', JSON.stringify(twin.data, null, 1) + '\n'],
    ['site-register.csv', twin.csv],
    ['twin-report.json', JSON.stringify(twin.report, null, 2) + '\n'],
  ]);
  for (const filename of ['index.html', 'styles.css', 'viewer.js']) {
    let source = readFileSync(join(VIEWER, filename), 'utf8');
    if (filename === 'index.html') source = source.replace(/\s*<script\s+type="importmap">[\s\S]*?<\/script>/, '');
    if (filename.endsWith('.js')) source = moduleURLs(source, filename);
    files.set(filename, source);
  }
  const vendor = {
    'vendor/three.module.js': 'build/three.module.js',
    'vendor/three.core.js': 'build/three.core.js',
    'vendor/addons/controls/OrbitControls.js': 'examples/jsm/controls/OrbitControls.js',
    'vendor/addons/loaders/GLTFLoader.js': 'examples/jsm/loaders/GLTFLoader.js',
    'vendor/addons/utils/BufferGeometryUtils.js': 'examples/jsm/utils/BufferGeometryUtils.js',
    'vendor/addons/utils/SkeletonUtils.js': 'examples/jsm/utils/SkeletonUtils.js',
    'vendor/THREE-LICENSE.txt': 'LICENSE',
  };
  for (const [filename, sourcePath] of Object.entries(vendor)) {
    files.set(filename, moduleURLs(readFileSync(join(THREE, sourcePath), 'utf8'), filename));
  }
  return files;
}
