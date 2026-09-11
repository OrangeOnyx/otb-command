import test from "node:test";
import assert from "node:assert/strict";
import { createCommandDraftSession, clearCommandDraftSessions, COMMAND_DRAFT_SESSION_PREFIX, MAX_COMMAND_DRAFT_TEXT } from "../src/lib/command-draft-session.js";

function memoryStorage() {
  const data = new Map();
  return { data, get length() { return data.size; }, key: index => [...data.keys()][index] ?? null,
    getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
}
const review = { mode: "local-review", propertyId: "otb" };
const account = { mode: "authenticated", userId: "user-a", propertyId: "property-a" };
const sourceFingerprint = "a".repeat(64);
const args = (storage, scope = review, patch = {}) => ({ storage, scope, issueId: "issue-a", sourceFingerprint, ...patch });
const draft = { text: "Review only. Current completion and payment remain unknown.", generatedAt: "2026-09-08" };

test("tab recovery saves only text and dates with the exact binding, including an intentionally empty editor", () => {
  const storage = memoryStorage(), session = createCommandDraftSession(args(storage));
  assert.equal(session.load().status, "empty");
  assert.equal(session.save({ ...draft, sources: ["must not persist"], privateSnapshot: "must not persist" }).status, "saved");
  const record = JSON.parse([...storage.data.values()][0]);
  assert.deepEqual(Object.keys(record).sort(), ["version", "binding", "text", "generatedAt", "updatedAt"].sort());
  assert.deepEqual(record.binding, { mode: "local-review", userId: null, propertyId: "otb", issueId: "issue-a", sourceFingerprint });
  const restored = createCommandDraftSession(args(storage)).load();
  assert.equal(restored.status, "restored");
  assert.equal(restored.draft.text, draft.text);
  assert.equal(restored.draft.generatedAt, draft.generatedAt);
  assert.equal(session.save({ ...draft, text: "" }).status, "saved");
  assert.equal(session.load().draft.text, "");
});

test("review, user, property and issue namespaces never restore one another; changed evidence is rejected", () => {
  const storage = memoryStorage();
  createCommandDraftSession(args(storage, account)).save(draft);
  for (const options of [args(storage), args(storage, { ...account, userId: "user-b" }),
    args(storage, { ...account, propertyId: "property-b" }), args(storage, account, { issueId: "issue-b" })])
    assert.equal(createCommandDraftSession(options).load().status, "empty");
  assert.deepEqual(createCommandDraftSession(args(storage, account, { sourceFingerprint: "b".repeat(64) })).load(),
    { status: "rejected", reason: "source-changed" });
});

test("missing or malformed scope, issue and fingerprint fail closed without reading or writing storage", () => {
  const storage = memoryStorage();
  storage.getItem = () => { throw new Error("must not read"); };
  for (const patch of [{ scope: null }, { scope: {} }, { scope: { mode: "local-review", propertyId: "other" } },
    { scope: { mode: "authenticated", propertyId: "property-a" } }, { scope: { ...account, userId: "someone@example.com" } },
    { issueId: "" }, { issueId: 105 }, { issueId: "bad:issue" }, { sourceFingerprint: "" }, { sourceFingerprint: "not-a-hash" }]) {
    const session = createCommandDraftSession(args(storage, review, patch));
    for (const result of [session.load(), session.save(draft), session.remove()])
      assert.deepEqual(result, { status: "rejected", reason: "invalid-binding" });
  }
  assert.equal(createCommandDraftSession(null).load().status, "rejected");
  assert.equal(storage.data.size, 0);
});

test("corrupt, foreign, future-version and oversized records are rejected without surfacing text", () => {
  const storage = memoryStorage(), session = createCommandDraftSession(args(storage));
  session.save(draft);
  assert.equal(session.save(null).status, "rejected");
  const [key, raw] = [...storage.data.entries()][0], good = JSON.parse(raw);
  const bad = ["{", "null", JSON.stringify({ ...good, version: 2 }),
    JSON.stringify({ ...good, binding: { ...good.binding, userId: "user-b" } }),
    JSON.stringify({ ...good, binding: { ...good.binding, issueId: "issue-b" } }),
    JSON.stringify({ ...good, sources: [] }), JSON.stringify({ ...good, text: "x".repeat(MAX_COMMAND_DRAFT_TEXT + 1) }),
    JSON.stringify({ ...good, generatedAt: "2026-02-30" }), JSON.stringify({ ...good, updatedAt: "yesterday" }), "x".repeat(100_001)];
  for (const record of bad) {
    storage.setItem(key, record);
    const result = session.load();
    assert.equal(result.status, "rejected");
    assert.ok(!("draft" in result));
  }
});

test("invalid or oversized edits preserve the previously saved draft", () => {
  const storage = memoryStorage(), session = createCommandDraftSession(args(storage));
  session.save(draft);
  for (const patch of [{ text: "x".repeat(MAX_COMMAND_DRAFT_TEXT + 1) }, { text: null }, { generatedAt: "2026-02-30" },
    { text: "\u0000".repeat(MAX_COMMAND_DRAFT_TEXT) }]) {
    assert.equal(session.save({ ...draft, ...patch }).status, "rejected");
    assert.equal(session.load().draft.text, draft.text);
  }
});

test("blocked storage getter and quota errors return statuses without changing the editor or saved value", () => {
  const session = createCommandDraftSession(args(() => { throw new Error("blocked"); }));
  for (const result of [session.load(), session.save(draft), session.remove()])
    assert.deepEqual(result, { status: "unavailable", reason: "storage-blocked" });
  const storage = memoryStorage(), quotaSession = createCommandDraftSession(args(storage));
  quotaSession.save(draft);
  storage.setItem = () => { const error = new Error("full"); error.name = "QuotaExceededError"; throw error; };
  assert.deepEqual(quotaSession.save({ ...draft, text: "unsaved editor" }), { status: "unavailable", reason: "storage-quota" });
  assert.equal(quotaSession.load().draft.text, draft.text);
  assert.equal(draft.text, "Review only. Current completion and payment remain unknown.");
});

test("remove is explicit and sign-out cleanup clears only owned namespace keys", () => {
  const storage = memoryStorage(), session = createCommandDraftSession(args(storage));
  session.save(draft);
  assert.equal(session.remove().status, "removed");
  assert.equal(session.load().status, "empty");
  session.save(draft);
  createCommandDraftSession(args(storage, account)).save(draft);
  storage.setItem(COMMAND_DRAFT_SESSION_PREFIX + "v0:old-draft", "old");
  storage.setItem("unrelated-session", "keep");
  storage.setItem("sb-auth-token", "keep-auth");
  storage.setItem("otb-command-state-v1", "keep-legacy");
  assert.deepEqual(clearCommandDraftSessions(storage), { status: "cleared", removed: 3 });
  assert.deepEqual([...storage.data.entries()], [["unrelated-session", "keep"], ["sb-auth-token", "keep-auth"], ["otb-command-state-v1", "keep-legacy"]]);
  assert.equal(clearCommandDraftSessions(() => { throw new Error("blocked"); }).status, "unavailable");
});
