import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

/* Vite normally copies public/ verbatim, independent of tree shaking. A
   disabled hosted release instead emits the same public files except twin/.
   No source or output directory is deleted or changed by this guard. */
export function assetTwinBuildGuard(enabled) {
  let publicDir = false;
  return {
    name: 'otb-asset-twin-release-gate',
    apply: 'build',
    configResolved(config) { publicDir = config.publicDir; },
    async generateBundle(_options, bundle) {
      if (enabled) return;
      for (const output of Object.values(bundle)) {
        if (output.type !== 'chunk') continue;
        const exposed = Object.keys(output.modules).some(id =>
          /\/src\/(?:assets\/twin\/|data\/twin-|(?:views|lib)\/asset-twin)/.test(id.replaceAll('\\', '/')));
        if (exposed) throw new Error('Disabled asset twin still includes source evidence in the production bundle.');
      }
      if (!publicDir) return;
      const emitPublic = async (directory, prefix = '') => {
        const entries = await readdir(directory, { withFileTypes: true });
        for (const entry of entries) {
          if (!prefix && entry.name.toLowerCase() === 'twin') continue;
          const fileName = prefix + entry.name;
          const sourcePath = path.join(directory, entry.name);
          if (entry.isDirectory()) await emitPublic(sourcePath, fileName + '/');
          else if (entry.isFile()) this.emitFile({ type: 'asset', fileName, source: await readFile(sourcePath) });
          else throw new Error('Unsupported public-directory entry; refusing an incomplete release.');
        }
      };
      await emitPublic(publicDir);
    },
  };
}
