import test from "node:test";
import assert from "node:assert/strict";
import {
  ASSIGNABLE_ROLES, installAccessVendors, accessVendorOptions,
  accessUnitOptions, scopeKind, validateAssignment,
} from "../src/lib/access.js";

test("operator is never an assignable role", () => {
  assert.deepEqual(ASSIGNABLE_ROLES, ["owner", "vendor", "tenant"]);
});

test("vendor options label non-service kinds and sort by label", () => {
  installAccessVendors([
    { id: "zeta-plumbing", company: "Zeta Plumbing", kind: "service" },
    { id: "acme-bank", company: "Acme Bank", kind: "payee" },
    { id: "", company: "no id — dropped" },
  ]);
  const opts = accessVendorOptions();
  assert.deepEqual(opts, [
    { id: "acme-bank", label: "Acme Bank · payee" },
    { id: "zeta-plumbing", label: "Zeta Plumbing" },
  ]);
});

test("unit options carry the DBA when present", () => {
  const opts = accessUnitOptions([{ unit: "131" }, { unit: "149", dba: "Jason's Deli" }, {}]);
  assert.deepEqual(opts, [
    { id: "131", label: "131" },
    { id: "149", label: "149 — Jason's Deli" },
  ]);
});

test("scopeKind: vendor→vendor, tenant→unit, owner→none", () => {
  assert.equal(scopeKind("vendor"), "vendor");
  assert.equal(scopeKind("tenant"), "unit");
  assert.equal(scopeKind("owner"), null);
});

test("validateAssignment gates email, role, and role-specific scope", () => {
  assert.equal(validateAssignment("bad", "owner", ""), "enter a valid email");
  assert.equal(validateAssignment("a@b.co", "operator", ""), "pick a role");
  assert.equal(validateAssignment("a@b.co", "vendor", ""), "pick the vendor company");
  assert.equal(validateAssignment("a@b.co", "tenant", ""), "pick the tenant's unit");
  assert.equal(validateAssignment("a@b.co", "owner", ""), null);
  assert.equal(validateAssignment("A@B.CO ", "vendor", "brian-zorn"), null);
  assert.equal(validateAssignment("a@b.co", "tenant", "131"), null);
});
