import { extname } from 'node:path';
import { buildSiteTwinWebPackage, SITE_TWIN_INPUTS } from './web-package.mjs';

const PREFIX = '/site-twin/';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.glb': 'model/gltf-binary', '.csv': 'text/csv', '.txt': 'text/plain' };

export function siteTwinWebPlugin({ enabled, buildPackage = buildSiteTwinWebPackage }) {
  let files;
  const getFiles = () => files ||= buildPackage();
  return {
    name: 'otb-site-twin-web-package',
    buildStart() {
      if (enabled) for (const path of SITE_TWIN_INPUTS) this.addWatchFile(path);
    },
    configureServer(server) {
      if (enabled) {
        server.watcher.add(SITE_TWIN_INPUTS);
        const inputs = new Set(SITE_TWIN_INPUTS.map(path => path.replaceAll('\\', '/')));
        server.watcher.on('change', path => {
          if (inputs.has(path.replaceAll('\\', '/'))) files = undefined;
        });
      }
      server.middlewares.use((req, res, next) => {
        const pathname = (req.url || '').split('?')[0];
        if (pathname !== '/site-twin' && !pathname.startsWith(PREFIX)) return next();
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'self'; base-uri 'self'; object-src 'none'");
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');
        if (!enabled) { res.statusCode = 404; return res.end('Site model unavailable'); }
        if (!['GET', 'HEAD'].includes(req.method)) {
          res.statusCode = 405; res.setHeader('Allow', 'GET, HEAD'); return res.end();
        }
        if (pathname === '/site-twin') {
          res.statusCode = 302; res.setHeader('Location', PREFIX); return res.end();
        }
        // Exact allowlist lookup: encoded traversal, source and server files
        // never fall through to Vite's SPA fallback or filesystem handler.
        const filename = pathname.slice(PREFIX.length) || 'index.html';
        try {
          const body = getFiles().get(filename);
          if (body === undefined) { res.statusCode = 404; return res.end('Site model file not found'); }
          res.setHeader('Content-Type', MIME[extname(filename)] || 'application/octet-stream');
          res.end(req.method === 'HEAD' ? undefined : body);
        } catch (error) {
          server.config.logger.error('A-5 package: ' + error.message);
          res.statusCode = 503; res.end('Site model could not be built. Check the development server output.');
        }
      });
    },
    generateBundle() {
      if (!enabled) return;
      for (const [filename, source] of getFiles()) {
        this.emitFile({ type: 'asset', fileName: 'site-twin/' + filename, source });
      }
    },
  };
}
