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

import { LAYER_KEYS as LAYERS } from "./layers.js"; // single source — no twin list

const PROPERTY = "otb";

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

/* ── event-sourced compliance (C-1 audit trail; append-only) ─────
   State still syncs whole via property_state.comp; these rows are the
   who/when/what history behind it. Logging is best-effort — an audit
   outage must never block the matrix click. */
export async function logCompEvent(row) {
  if (!REMOTE || !row) return;
  try {
    const me = (await sb.auth.getUser()).data.user;
    await sb.from("compliance_events").insert({ ...row, changed_by: me?.email || "" });
  } catch (e) { console.warn("comp event:", e.message); }
}
export async function listCompEvents(limit = 80) {
  if (!REMOTE) return [];
  const { data, error } = await sb.from("compliance_events")
    .select("unit,field,old_state,new_state,changed_by,created_at")
    .order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return data || [];
}

/* ── ledger-lite (P-1/drawer money trail; append-only) ───────────
   Reads owner/operator, inserts operator (RLS). Money writes FAIL LOUD —
   unlike the best-effort audit trail, a dropped payment entry is a real
   bookkeeping error the operator must see. */
export async function listLedgerEntries(unit) {
  if (!REMOTE) return [];
  let q = sb.from("ledger_entries")
    .select("id,unit,type,code,amount,date,due,description,void_of,entered_by,created_at")
    .order("date").order("id");
  if (unit) q = q.eq("unit", unit);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []).map(r => ({ ...r, voidOf: r.void_of }));
}
export async function addLedgerEntry(row) {
  if (!REMOTE) throw new Error("ledger requires the hosted backend");
  const me = (await sb.auth.getUser()).data.user;
  const rec = {
    id: row.id || "e" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36),
    property_id: "otb", unit: row.unit, type: row.type, code: row.code || null,
    amount: row.amount, date: row.date, due: row.due || null,
    description: row.description || "", void_of: row.voidOf || null,
    entered_by: me?.email || "",
  };
  const { error } = await sb.from("ledger_entries").insert(rec);
  if (error) throw error;
  return rec;
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
