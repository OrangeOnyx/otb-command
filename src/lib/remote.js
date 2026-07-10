/* Supabase remote: auth (magic-link) + shared state sync.
   No-op when env keys are absent — the app then runs on localStorage only. */
import { createClient } from "@supabase/supabase-js";

/* Vite statically replaces these exact import.meta.env.VITE_* expressions at
   build time; the try/catch only matters under plain Node (node --test), where
   import.meta.env is undefined and the app correctly falls back to local-only. */
let URL, KEY;
try {
  URL = import.meta.env.VITE_SUPABASE_URL;
  KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
} catch { /* plain Node — no Vite env */ }
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
  const { data, error } = await sb.from("profiles").select("role").eq("id", u.id).maybeSingle();
  // Fail CLOSED: an unreadable/absent profile is least-privilege 'pending',
  // never 'owner' (the server auth gate does the same). RLS is the real
  // boundary, but the client should not fail open to owner UI + bundle seeds.
  if (error) return { email: u.email, role: "pending" };
  return { email: u.email, role: data?.role || "pending" };
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

/* ── access management (operator-only; RLS enforces) ─────────────
   Authorize an email BEFORE first sign-in (allowlist consulted by the
   sign-up trigger) and fix anyone already stuck in 'pending'. */
export async function listAuthorized() {
  const { data, error } = await sb.from("authorized_emails").select("email,role,created_at").order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}
export async function authorizeEmail(email, role = "owner") {
  const e = String(email || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw new Error("enter a valid email");
  const me = (await sb.auth.getUser()).data.user;
  const { error } = await sb.from("authorized_emails").upsert({ email: e, role, added_by: me?.email || "" });
  if (error) throw error;
  // if they already signed in and are parked in 'pending', promote in place
  const { error: e2 } = await sb.from("profiles").update({ role }).eq("email", e).eq("role", "pending");
  if (e2) console.warn("promote:", e2.message);
}
export async function revokeAuthorized(email) {
  const { error } = await sb.from("authorized_emails").delete().eq("email", email);
  if (error) throw error;
}
export async function listPendingProfiles() {
  const { data, error } = await sb.from("profiles").select("email,created_at").eq("role", "pending").order("created_at", { ascending: false });
  if (error) return [];
  return data || [];
}
