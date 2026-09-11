/* C1 — confidential seed hydration. The public bundle ships only skeletons;
   after auth, the owner/operator client fetches the confidential payload from
   the RLS/role-gated /api/seed and merges it into the store + directory +
   vendor roster. Vendors/pending never call this (they don't see that data;
   the vendor portal reads its own row straight from RLS-scoped public.vendors).

   Local-only dev mode (no backend) shows the public skeleton only — dev without
   auth intentionally doesn't surface confidential rents/PII. */
import { sb } from "./remote.js";
import { installUnitsPrivate, installRecoveriesPrivate, getStoreScope, getStoreScopeRevision, notifySeedLoaded } from "../store.js";
import { sameStateScope } from "./state-storage.js";
import { installDirectorySeed } from "./directory.js";
import { installVendors } from "../views/vendorportal.js";
import { installMaintVendors } from "../views/maintenance.js";
import { installAccessVendors } from "./access.js";

/* Pure: apply a fetched payload to the client-side seams. */
export function applySeed(payload) {
  if (getStoreScope()?.mode !== 'authenticated' || !payload || typeof payload !== "object" || Array.isArray(payload)) return;
  installUnitsPrivate(payload.unitsPrivate);
  installRecoveriesPrivate(payload.recoveries);
  installDirectorySeed(payload);
  installVendors(payload.vendors);
  installMaintVendors(payload.vendors); // M-1 assign dropdown (service kinds only)
  installAccessVendors(payload.vendors); // sidebar sign-in access vendor picker
  notifySeedLoaded();
}

/* Fetch + apply. Call BEFORE initViews so rent-roll/financial/directory render
   with the confidential fields present. Throws on transport error (caller logs;
   a failure just leaves skeletons, never leaks). */
export async function loadSeed({ client = sb, fetcher = globalThis.fetch } = {}) {
  const scope = getStoreScope();
  const revision = getStoreScopeRevision();
  const isCurrent = () => revision === getStoreScopeRevision() && sameStateScope(scope, getStoreScope());
  if (scope?.mode !== 'authenticated') return;
  const session = (await client?.auth.getSession())?.data?.session;
  if (!session || session.user?.id !== scope.userId || !isCurrent()) return;
  const r = await fetcher("/api/seed", { headers: { Authorization: "Bearer " + session.access_token } });
  if (!r.ok) throw new Error("seed fetch failed (" + r.status + ")");
  const payload = await r.json();
  if (isCurrent()) applySeed(payload);
}
