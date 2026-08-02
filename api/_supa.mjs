/* Server-side Supabase plumbing — the single place that spells the project
   URL, anon key, and auth headers (2026-07-20 horizontal layer; these were
   re-declared and hand-spelled per fetch across _auth/concierge/auto-trigger).

   Two auth families:
   - USER-JWT calls: the caller's magic-link session token rides in
     `authorization`; RLS scopes everything → supaJson / supaPost / rpcUser.
   - SECRET-GATED RPCs (cron pattern): anon key in both headers, the
     SECURITY DEFINER function verifies p_secret against app_secrets
     internally → rpcSecret. NO service-role key anywhere.

   Storage helpers cover the upload→sign flow (lease packages today; any
   future server-written artifact tomorrow). */

export const SUPA = process.env.VITE_SUPABASE_URL;
export const ANON = process.env.VITE_SUPABASE_ANON_KEY;
export const configured = () => !!(SUPA && ANON);

export const authHeaders = (token, extra = {}) =>
  ({ apikey: ANON, authorization: "Bearer " + (token || ANON), ...extra });

/* GET a REST/auth path → parsed JSON, or null on any non-2xx. */
export async function supaJson(path, token) {
  const r = await fetch(SUPA + path, { headers: authHeaders(token) });
  if (!r.ok) return null;
  return r.json();
}

/* POST JSON to a REST path. Returns the raw Response (callers differ on
   how they treat failures — some best-effort, some fail closed). */
export function supaPost(path, token, body, extra = {}) {
  return fetch(SUPA + path, {
    method: "POST",
    headers: authHeaders(token, { "content-type": "application/json", ...extra }),
    body: JSON.stringify(body),
  });
}

/* PostgREST RPC as the user (JWT). Throws on non-2xx. */
export async function rpcUser(name, token, body) {
  const r = await supaPost("/rest/v1/rpc/" + name, token, body);
  if (!r.ok) throw new Error(name + ": HTTP " + r.status);
  return r.json();
}

/* Secret-gated SECURITY DEFINER RPC (cron family): anon in both header slots;
   the function itself verifies p_secret. Throws on non-2xx. */
export const rpcSecret = (name, body) => rpcUser(name, null, body);

/* Phase B tenancy: resolve the (org_id, property_id) uuid stamp for the
   default property slug as the calling user (RLS answers for members only;
   null for anyone else). The uuids are immutable — cached for the life of a
   warm serverless instance. */
const PROPERTY_SLUG = "otb";
let _tenancy = null;
export async function tenancyContext(token) {
  if (_tenancy) return _tenancy;
  const rows = await supaJson("/rest/v1/properties?slug=eq." + PROPERTY_SLUG + "&select=id,org_id", token);
  const p = Array.isArray(rows) ? rows[0] : null;
  if (!p) return null;
  _tenancy = { property_id: p.id, org_id: p.org_id };
  return _tenancy;
}

/* Storage: raw upload (upsert) into a private bucket as the user. */
export function storageUpload(bucket, path, token, body, contentType) {
  return fetch(`${SUPA}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: authHeaders(token, { "content-type": contentType, "x-upsert": "true" }),
    body,
  });
}

/* Storage: mint a signed URL → absolute https URL, or null on failure. */
export async function storageSignedUrl(bucket, path, token, expiresIn) {
  const r = await supaPost(`/storage/v1/object/sign/${bucket}/${path}`, token, { expiresIn });
  if (!r.ok) return null;
  const { signedURL } = await r.json();
  return SUPA + "/storage/v1" + signedURL;
}
