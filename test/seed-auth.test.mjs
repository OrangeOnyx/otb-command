import test from "node:test";
import assert from "node:assert/strict";
import { requireBundledPropertyAccess } from "../api/_seed-auth.mjs";

const req = { headers: { authorization: "Bearer test-session" } };
const property = { id: "property-otb", org_id: "org-orange-ocean", slug: "otb" };
const owner = { user_id: "user-1", org_id: property.org_id, property_id: property.id, role: "owner" };
function fixture({ user = { id: "user-1" }, orgs = [{ id: property.org_id }], properties = [property], members = [owner], outage = false } = {}) {
  const calls = [];
  return { calls, ready: () => true, read: async (path, token) => {
    calls.push({ path, token });
    if (outage) throw new Error("offline");
    if (path === "/auth/v1/user") return user;
    if (path.startsWith("/rest/v1/orgs?")) return orgs;
    if (path.startsWith("/rest/v1/properties?")) return properties;
    if (path.startsWith("/rest/v1/org_members?")) return members;
    throw new Error("unexpected lookup");
  } };
}

test("bundled seed requires a verified session and OTB membership using caller JWT on every lookup", async () => {
  const deps = fixture();
  const gate = await requireBundledPropertyAccess(req, deps);
  assert.equal(gate.role, "owner");
  assert.deepEqual(gate.property, property);
  assert.equal(deps.calls.length, 4);
  assert.ok(deps.calls.every(c => c.token === "test-session"));
  assert.ok(deps.calls.at(-1).path.includes("user_id=eq.user-1&org_id=eq.org-orange-ocean"));
  assert.ok(deps.calls.every(c => !c.path.includes("profiles")), "UI profile role cannot authorize private seed");
});

test("org-wide operator membership authorizes OTB; same-org other-property role does not", async () => {
  const operator = await requireBundledPropertyAccess(req, fixture({ members: [{ ...owner, property_id: null, role: "operator" }] }));
  assert.equal(operator.role, "operator");
  for (const patch of [{ property_id: "property-other" }, { org_id: "org-other" }, { user_id: "user-other" }, { role: "tenant" }, { role: "vendor" }]) {
    const gate = await requireBundledPropertyAccess(req, fixture({ members: [{ ...owner, ...patch }] }));
    assert.equal(gate.status, 403, JSON.stringify(patch));
  }
});

test("missing or revoked membership and hidden or ambiguous OTB property fail closed", async () => {
  for (const data of [{ members: [] }, { members: null }, { orgs: [] }, { properties: [] }, { properties: [property, property] }]) {
    assert.equal((await requireBundledPropertyAccess(req, fixture(data))).status, 403);
  }
  const calls = fixture();
  assert.equal((await requireBundledPropertyAccess({ headers: {} }, calls)).status, 401);
  assert.equal(calls.calls.length, 0);
  assert.equal((await requireBundledPropertyAccess(req, fixture({ user: null }))).status, 401);
  assert.equal((await requireBundledPropertyAccess(req, fixture({ outage: true }))).status, 503);
});

test("bundled property access never caches authorization across calls", async () => {
  assert.equal((await requireBundledPropertyAccess(req, fixture())).role, "owner");
  assert.equal((await requireBundledPropertyAccess(req, fixture({ members: [] }))).status, 403);
});
