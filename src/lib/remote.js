/* Supabase remote: auth (magic-link) + shared state sync.
   No-op when env keys are absent — the app then runs on localStorage only. */
import { createClient } from "@supabase/supabase-js";

const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const REMOTE = !!(URL && KEY);
export const sb = REMOTE ? createClient(URL, KEY) : null;

const PROPERTY = "otb";
const LAYERS = ["comp", "notes", "actions", "contacts", "documents", "financials", "ownerSheets"];

export async function getSession() {
  if (!REMOTE) return null;
  return (await sb.auth.getSession()).data.session;
}
export async function getRole() {
  if (!REMOTE) return null;
  const u = (await sb.auth.getUser()).data.user;
  if (!u) return null;
  const { data } = await sb.from("profiles").select("role").eq("id", u.id).maybeSingle();
  return { email: u.email, role: data?.role || "owner" };
}
export async function sendMagicLink(email) {
  return sb.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
}
export async function signOut() {
  if (REMOTE) await sb.auth.signOut();
}
/* load the shared state (one row per layer) → snapshot object */
export async function loadState() {
  const { data, error } = await sb.from("property_state").select("layer,data").eq("property_id", PROPERTY);
  if (error) throw error;
  const out = {};
  (data || []).forEach(r => { out[r.layer] = r.data; });
  return out;
}
/* upsert each known layer from a store snapshot (operator only; RLS enforces) */
export async function pushState(snapshot) {
  const rows = LAYERS
    .filter(k => k in snapshot)
    .map(layer => ({ property_id: PROPERTY, layer, data: snapshot[layer], updated_at: new Date().toISOString() }));
  if (!rows.length) return { error: null };
  return sb.from("property_state").upsert(rows);
}
