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

/* Active property (Phase B-3): the selection lives in localStorage; unset
   means "first RLS-visible property" (created_at order — OTB today). This
   retires the last client-side property-slug literal. Switching = full page
   reload (seed, layer hydration, queue priming, and the realtime channel are
   all boot-bound to one property context — see docs/phase-b/10). */
const PROP_LS = "otb-active-property";
export function activeSlug() {
  try { return localStorage.getItem(PROP_LS) || null; } catch { return null; }
}
export function setActiveProperty(slug) {
  try {
    if (slug) localStorage.setItem(PROP_LS, slug);
    else localStorage.removeItem(PROP_LS);
  } catch { /* private mode — selection just doesn't persist */ }
}

/* RLS-visible property roster (switcher + D-0). Members see their own. */
export async function listProperties() {
  const { data, error } = await sb.from("properties")
    .select("id,org_id,slug,name,address,facts,created_at").order("created_at");
  if (error) throw error;
  return data || [];
}

/* Phase B tenancy context: resolve (org_id, property_id) uuids once per
   session. RLS prop_read only answers for members, so non-members fail here —
   callers degrade exactly like an empty RLS read always has. A stale stored
   slug (revoked/renamed) self-heals: clear it, fall back to first-visible. */
let _ctx = null;
export async function propertyContext() {
  if (_ctx) return _ctx;
  const want = activeSlug();
  let row = null;
  if (want) {
    const { data, error } = await sb.from("properties").select("id,org_id,slug").eq("slug", want).maybeSingle();
    if (error) throw error;
    row = data;
    if (!row) setActiveProperty(null); // stale selection — heal below
  }
  if (!row) {
    const { data, error } = await sb.from("properties")
      .select("id,org_id,slug").order("created_at").limit(1).maybeSingle();
    if (error) throw error;
    row = data;
  }
  if (!row) throw new Error("no membership grants access to any property");
  _ctx = { property_id: row.id, org_id: row.org_id, slug: row.slug };
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

/* ── D-0 portfolio reads (Phase B-3) ─────────────────────────────
   Cross-property aggregates: NO property filter — RLS scopes rows to the
   member's org(s); the client groups by property_id. Column lists stay
   minimal (folds only need these). */
export async function listPortfolioLedger() {
  if (!REMOTE) return [];
  const { data, error } = await sb.from("ledger_entries")
    .select("id,property_id,unit,type,amount,void_of");
  if (error) throw error;
  return (data || []).map(r => ({ ...r, voidOf: r.void_of }));
}
export async function listPortfolioMaintenance() {
  if (!REMOTE) return { rows: [], events: [] };
  const [{ data: rows, error: e1 }, { data: events, error: e2 }] = await Promise.all([
    sb.from("maintenance_requests").select("*"),
    sb.from("maintenance_events").select("*").order("created_at").order("id"),
  ]);
  if (e1 || e2) throw (e1 || e2);
  return { rows: rows || [], events: events || [] };
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

/* ── automation heartbeat (B-4; written by the cron via definer RPC,
   read owner/operator) — best-effort like the UniFi/C3 cards ────── */
export async function getCronHeartbeat(id = "auto-trigger") {
  if (!REMOTE) return null;
  const { data, error } = await sb.from("cron_heartbeats")
    .select("id,ran_at,summary").eq("id", id).maybeSingle();
  if (error) return null; // pre-migration / RLS-blind → card doesn't render
  return data;
}

/* ── client error beacon (B-4; capped definer RPC, operator read) ─ */
export async function logClientError({ page, message, stack, ua }) {
  if (!REMOTE) return;
  try { await sb.rpc("log_client_error", { p_page: page, p_message: message, p_stack: stack, p_ua: ua }); }
  catch { /* the beacon never throws into the page it watches */ }
}
export async function countClientErrors(hours = 24) {
  if (!REMOTE) return 0;
  const since = new Date(Date.now() - hours * 3600e3).toISOString();
  const { count, error } = await sb.from("client_errors")
    .select("id", { count: "exact", head: true }).gte("at", since);
  if (error) return 0; // non-operator / pre-migration → card doesn't render
  return count || 0;
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
