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

import { LAYER_DEFS } from "./layers.js"; // single source — no twin list

const PROPERTY = "otb"; // property slug — resolved to uuid tenancy at first use

/* Phase B tenancy context: resolve (org_id, property_id) uuids from the slug
   once per session. RLS prop_read only answers for members, so non-members
   fail here — callers degrade exactly like an empty RLS read always has. */
let _ctx = null;
export async function propertyContext() {
  if (_ctx) return _ctx;
  const { data, error } = await sb.from("properties").select("id,org_id").eq("slug", PROPERTY).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("no membership grants access to property " + PROPERTY);
  _ctx = { property_id: data.id, org_id: data.org_id };
  return _ctx;
}

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
/* ── typed layer state (Phase B-5, purge #7) ─────────────────────
   One row per diverged item across 7 typed tables; the snapshot shape is
   reassembled via each layer's fromRows so store/views never changed. */
export async function fetchLayerRows(table) {
  const ctx = await propertyContext();
  const { data, error } = await sb.from(table).select("*").eq("property_id", ctx.property_id);
  if (error) throw error;
  return data || [];
}

/* load the shared state (typed rows → snapshot object, layers with data only) */
export async function loadState() {
  const tables = [...new Set(LAYER_DEFS.map(d => d.table))];
  const results = await Promise.all(tables.map(t => fetchLayerRows(t)));
  const byTable = Object.fromEntries(tables.map((t, i) => [t, results[i]]));
  loadState.lastRows = byTable; // boot primes the sync queue from this
  const out = {};
  for (const d of LAYER_DEFS) {
    const rows = byTable[d.table].filter(r => d.ownsRow(r));
    if (!rows.length) continue;
    const v = d.fromRows(rows);
    if (v !== undefined) out[d.key] = v;
  }
  return out;
}

/* Apply drained SyncQueue batches (operator only; RLS enforces). Upserts go
   one call per table; deletes grouped — single-col pk via .in(), composite
   via per-row .match() (deletes are rare: reverts/removals only). */
export async function pushOps(batches, origin) {
  const ctx = await propertyContext();
  for (const { table, pk, upserts, deletes } of batches) {
    if (upserts.length) {
      const rows = upserts.map(r => ({ ...r, org_id: ctx.org_id, property_id: ctx.property_id, origin: origin || "" }));
      const { error } = await sb.from(table).upsert(rows, { onConflict: ["property_id", ...pk].join(",") });
      if (error) return { error };
    }
    if (deletes.length) {
      if (pk.length === 1) {
        const { error } = await sb.from(table).delete()
          .eq("property_id", ctx.property_id).in(pk[0], deletes.map(r => r[pk[0]]));
        if (error) return { error };
      } else {
        for (const r of deletes) {
          const { error } = await sb.from(table).delete()
            .eq("property_id", ctx.property_id).match(Object.fromEntries(pk.map(c => [c, r[c]])));
          if (error) return { error };
        }
      }
    }
  }
  return { error: null };
}

/* ── event-sourced compliance (C-1 audit trail; append-only) ─────
   State still syncs whole via property_state.comp; these rows are the
   who/when/what history behind it. Logging is best-effort — an audit
   outage must never block the matrix click. */
export async function logCompEvent(row) {
  if (!REMOTE || !row) return;
  try {
    const ctx = await propertyContext();
    const me = (await sb.auth.getUser()).data.user;
    await sb.from("compliance_events").insert({ ...row, org_id: ctx.org_id, property_id: ctx.property_id, changed_by: me?.email || "" });
  } catch (e) { console.warn("comp event:", e.message); }
}
export async function listCompEvents(limit = 80) {
  if (!REMOTE) return [];
  const ctx = await propertyContext();
  const { data, error } = await sb.from("compliance_events")
    .select("unit,field,old_state,new_state,changed_by,created_at")
    .eq("property_id", ctx.property_id)
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
  const ctx = await propertyContext();
  let q = sb.from("ledger_entries")
    .select("id,unit,type,code,amount,date,due,description,void_of,entered_by,created_at")
    .eq("property_id", ctx.property_id)
    .order("date").order("id");
  if (unit) q = q.eq("unit", unit);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []).map(r => ({ ...r, voidOf: r.void_of }));
}
export async function addLedgerEntry(row) {
  if (!REMOTE) throw new Error("ledger requires the hosted backend");
  const ctx = await propertyContext();
  const me = (await sb.auth.getUser()).data.user;
  const rec = {
    id: row.id || "e" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36),
    org_id: ctx.org_id, property_id: ctx.property_id, unit: row.unit, type: row.type, code: row.code || null,
    amount: row.amount, date: row.date, due: row.due || null,
    description: row.description || "", void_of: row.voidOf || null,
    entered_by: me?.email || "",
  };
  const { error } = await sb.from("ledger_entries").insert(rec);
  if (error) throw error;
  return rec;
}

/* ── C3 parking occupancy (append-only; uploaded from the capture
   machine via tools/c3-upload.mjs; read = owner/operator RLS) ──── */
export async function listOccupancy(hours = 6) {
  if (!REMOTE) return [];
  const ctx = await propertyContext();
  const since = new Date(Date.now() - hours * 3600e3).toISOString();
  const { data, error } = await sb.from("occupancy_samples")
    .select("stall,state,ts").eq("property_id", ctx.property_id).gte("ts", since);
  if (error) throw error;
  return data || [];
}

/* Trailing-week samples for the D-1 rollup sparkline (~1.5k rows/wk today;
   revisit as SQL aggregation if coverage grows past the storefront cams). */
export async function listOccupancyWeek(days = 7) {
  if (!REMOTE) return [];
  const ctx = await propertyContext();
  const since = new Date(Date.now() - days * 86400e3).toISOString();
  const { data, error } = await sb.from("occupancy_samples")
    .select("stall,state,ts").eq("property_id", ctx.property_id).gte("ts", since);
  if (error) throw error;
  return data || [];
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
  const ctx = await propertyContext();
  const me = (await sb.auth.getUser()).data.user;
  const { error } = await sb.from("authorized_emails").upsert({ email: e, role, added_by: me?.email || "", org_id: ctx.org_id });
  if (error) throw error;
  // if they already signed in and are parked in 'pending', promote in place —
  // the definer RPC syncs profiles.role AND creates the org_members row
  // (post-Phase-B, membership is the RLS authority)
  const { error: e2 } = await sb.rpc("promote_authorized", { p_email: e });
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
