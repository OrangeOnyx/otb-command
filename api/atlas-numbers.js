/* Owner/operator-only publication of a dated, server-only production-ledger extract.
   No database writes, production connection or live-data fallback. */
import { requireBundledPropertyAccess } from './_seed-auth.mjs';
import { buildAtlasNumbers, ATLAS_SOURCE } from './_atlas-numbers.mjs';
import { SUPA } from './_supa.mjs';

/* The committed extract came from ONE Supabase project. A deployment wired to
   any other project (the isolated Cypress preview branch included) must not
   publish production rent and payment figures behind that project's auth. */
export const projectRefOf = url => { try { return new URL(url).hostname.split('.')[0]; } catch { return ''; } };
import SNAPSHOT from './_atlas-numbers-snapshot.json' with { type: 'json' };
import SEED from './_seed.json' with { type: 'json' };

export function createAtlasNumbersHandler({ authorize = requireBundledPropertyAccess, build = () => buildAtlasNumbers(SNAPSHOT, SEED.unitsPrivate), projectRef = () => (SUPA ? projectRefOf(SUPA) : ATLAS_SOURCE.projectRef) } = {}) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Vary', 'Authorization');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ error: 'GET required' });
    }
    if (projectRef() !== ATLAS_SOURCE.projectRef) {
      return res.status(404).json({ error: 'Ledger extract is not published on this deployment.' });
    }
    try {
      const gate = await authorize(req);
      if (gate.error) return res.status(gate.status).json({ error: gate.error });
      if (!gate.user?.id || !gate.property?.id || !gate.property?.org_id || gate.property.slug !== 'otb' || !['owner', 'operator'].includes(gate.role)) {
        return res.status(403).json({ error: 'OTB owner/operator membership required' });
      }
      return res.status(200).json({ ...build(), accessScope: { userId: gate.user.id, orgId: gate.property.org_id, propertyId: gate.property.id, role: gate.role } });
    } catch {
      return res.status(503).json({ error: 'Ledger extract is currently unavailable.' });
    }
  };
}

export default createAtlasNumbersHandler();
