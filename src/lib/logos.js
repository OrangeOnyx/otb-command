/* Tenant logo thumbnails. Manifest = generated src/data/logo-thumbs.json
   (units that have a thumb in public/tenant-logos/) — regenerate with
   `npm run logo-thumbs` after changing tools/brand-assets/tenant-logos/. */
import thumbs from "../data/logo-thumbs.json";

const HAS = new Set(thumbs);

export function logoUrl(unit) {
  return HAS.has(String(unit)) ? "/tenant-logos/" + unit + ".png" : null;
}
