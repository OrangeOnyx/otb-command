# P1 · Document Repository — Spec + Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox syntax.

**Goal:** Any document row (K-1 register + unit-drawer documents) can carry a real uploaded file. Files live in the private Supabase `documents` bucket (signed-URL access; IndexedDB fallback local), attached via a `doc://<path>` value in the row's existing `link` field.

**Design (approved 2026-07-03):**
- **`doc://` scheme:** uploading sets `link = "doc://<storage-path>"`. Rows whose link starts with `doc://` render "Open 📎" which resolves a fresh signed URL on click. External URLs (Drive) keep working unchanged. State model unchanged — link is still a string, synced by the existing state sync.
- **`src/lib/docs.js`** mirrors `assets.js`: `addDoc(file,{unit}) → path` · `docURL(pathOrId) → url` · `removeDoc(pathOrId)`, plus pure link helpers `buildDocLink(path)` / `isDocLink(link)` / `docPath(link)` (unit-tested). Any file type; **25 MB cap** client-side (bucket enforces 26,214,400 bytes server-side).
- **UI:** in the documents edit form (recordsUI), an **"Attach file"** button uploads and fills the link input with `doc://…`. Attached rows show "Open 📎". No new sheet/nav.
- **Supabase:** DONE 2026-07-03 — private `documents` bucket (25 MB limit) + 4 policies cloned from `assets` (auth read / operator insert-update-delete), migration `documents_bucket_and_policies`.
- **Out of scope (P2/P3):** owner-only vault permissions, versioning, full-text search, vendor intake.

**Files:**

| File | Responsibility | New/Modify |
|---|---|---|
| `src/lib/docs.js` | Document storage seam (Supabase bucket / IndexedDB) + pure `doc://` helpers | Create |
| `test/docs.test.mjs` | node:test for the pure helpers | Create |
| `src/lib/recordsUI.js` | Attach-file button in the documents form; `doc://`-aware "Open 📎" | Modify |
| `src/styles.css` | `.rec-attach` button + uploading state styles | Modify |

---

## Task 1: `src/lib/docs.js` + pure-helper tests

- [ ] **Step 1: failing test** — create `test/docs.test.mjs`:

```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { DOC_SCHEME, buildDocLink, isDocLink, docPath, MAX_DOC_BYTES } from "../src/lib/docs.js";

test("buildDocLink round-trips through docPath", () => {
  const link = buildDocLink("101/abc__lease.pdf");
  assert.equal(link, "doc://101/abc__lease.pdf");
  assert.equal(docPath(link), "101/abc__lease.pdf");
});

test("isDocLink: true only for doc:// links", () => {
  assert.equal(isDocLink("doc://x/y.pdf"), true);
  assert.equal(isDocLink("https://drive.google.com/x"), false);
  assert.equal(isDocLink(""), false);
  assert.equal(isDocLink(null), false);
});

test("docPath: null for non-doc links", () => {
  assert.equal(docPath("https://x"), null);
});

test("DOC_SCHEME and MAX_DOC_BYTES constants", () => {
  assert.equal(DOC_SCHEME, "doc://");
  assert.equal(MAX_DOC_BYTES, 25 * 1024 * 1024);
});
```

Run `npm test` → FAIL (module not found).

- [ ] **Step 2: implement** — create `src/lib/docs.js`:

```javascript
/* Document store — real files behind K-1 register / unit-drawer document rows.

   Mirrors assets.js: one API over two backends. REMOTE → private Supabase
   "documents" bucket (signed URLs, auth read / operator write); local →
   IndexedDB fallback. A row "has a file" when its existing link field holds
   a doc:// value (buildDocLink); external URLs are untouched. */
import { REMOTE, sb } from "./remote.js";

export const DOC_SCHEME = "doc://";
export const MAX_DOC_BYTES = 25 * 1024 * 1024; // matches the bucket's server-side limit

/* ---- pure link helpers (tested in test/docs.test.mjs) ---- */
export function buildDocLink(path) { return DOC_SCHEME + path; }
export function isDocLink(link) { return typeof link === "string" && link.startsWith(DOC_SCHEME); }
export function docPath(link) { return isDocLink(link) ? link.slice(DOC_SCHEME.length) : null; }

const BUCKET = "documents";
const newId = () => "d" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
const sani = s => (s || "file").replace(/[^\w.\-]+/g, "_").slice(0, 80);

/* ================= IndexedDB backend (local fallback) ================= */
const DB_NAME = "otb-docs", STORE = "docs", VERSION = 1;
let _db = null;
function db() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => { _db = req.result; resolve(_db); };
    req.onerror = () => reject(req.error);
  });
}
const wrap = req => new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
async function store(mode) { return (await db()).transaction(STORE, mode).objectStore(STORE); }

/* ================= public API ================= */
// -> storage path (used inside the doc:// link)
export async function addDoc(file, { unit = "property" } = {}) {
  if (file.size > MAX_DOC_BYTES) throw new Error("File exceeds the 25 MB limit");
  const path = `${unit}/${newId()}__${sani(file.name)}`;
  if (REMOTE) {
    const { error } = await sb.storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined, upsert: false });
    if (error) throw error;
  } else {
    await wrap((await store("readwrite")).add({ id: path, name: file.name, mime: file.type, blob: file }));
  }
  return path;
}

// -> a URL that opens the file now (signed for 1h remote; object URL local)
export async function docURL(path) {
  if (REMOTE) {
    const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(path, 3600);
    if (error) throw error;
    return data.signedUrl;
  }
  const rec = await wrap((await store("readonly")).get(path));
  if (!rec) throw new Error("File not found locally");
  return URL.createObjectURL(rec.blob);
}

export async function removeDoc(path) {
  if (REMOTE) { await sb.storage.from(BUCKET).remove([path]); }
  else { await wrap((await store("readwrite")).delete(path)); }
}
```

- [ ] **Step 3:** `npm test` → all pass (19 total incl. 4 new). `node --check src/lib/docs.js` clean.
- [ ] **Step 4: commit** — `git add src/lib/docs.js test/docs.test.mjs && git commit -m "Add document store (docs.js): Supabase documents bucket + doc:// links"` (+ Co-Authored-By trailer).

---

## Task 2: recordsUI integration (attach + open)

- [ ] **Step 1:** In `src/lib/recordsUI.js`:

Add import (top, after existing imports):
```javascript
import { addDoc, docURL, buildDocLink, isDocLink, docPath } from "./docs.js";
```

Replace the link line in `docView` (the `r.link ? '<a class="rec-link"...` ternary) with:
```javascript
    (r.link
      ? (isDocLink(r.link)
        ? '<a class="rec-link rec-doclink" href="#" data-doc="' + esc(docPath(r.link)) + '">Open 📎</a>'
        : '<a class="rec-link" href="' + esc(r.link) + '" target="_blank" rel="noopener">Open ↗</a>')
      : '<span class="rec-s mute">no file linked</span>') +
```

In `formHTML`, for documents only, add an attach row before `.rec-formacts`. Change the function to:
```javascript
function formHTML(name, r) {
  return '<div class="rec-form">' + FIELDS[name].map(([k, label]) =>
    '<label class="rec-f"><span>' + label + '</span>' +
    '<input data-k="' + k + '" value="' + esc(r[k] || "") + '"></label>').join("") +
    (name === "documents"
      ? '<div class="rec-attachrow"><button class="chip rec-attach">📎 Attach file</button>' +
        '<input type="file" class="rec-file" hidden><span class="rec-attach-msg mono"></span></div>'
      : "") +
    '<div class="rec-formacts"><button class="chip on rec-save">Save</button>' +
    '<button class="chip rec-cancel">Cancel</button></div></div>';
}
```

In `openForm`, after the `form.querySelector(".rec-cancel").onclick = ...` line, add:
```javascript
    const attach = form.querySelector(".rec-attach");
    if (attach) {
      const fileIn = form.querySelector(".rec-file");
      const msg = form.querySelector(".rec-attach-msg");
      attach.onclick = e => { e.preventDefault(); fileIn.click(); };
      fileIn.onchange = async () => {
        const f = fileIn.files[0];
        fileIn.value = "";
        if (!f) return;
        attach.disabled = true; msg.textContent = "Uploading…";
        try {
          const path = await addDoc(f, scope.unit ? { unit: scope.unit } : {});
          form.querySelector('input[data-k="link"]').value = buildDocLink(path);
          msg.textContent = f.name + " attached — Save to keep it";
        } catch (err) { msg.textContent = "Upload failed: " + err.message; }
        attach.disabled = false;
      };
    }
```

In `mountRecords`, after the `el.querySelectorAll(".rec").forEach(...)` block, add the doc-link opener:
```javascript
  el.querySelectorAll(".rec-doclink").forEach(a => {
    a.onclick = async e => {
      e.preventDefault();
      try { window.open(await docURL(a.dataset.doc), "_blank", "noopener"); }
      catch (err) { alert("Could not open file: " + err.message); }
    };
  });
```

- [ ] **Step 2:** Append to END of `src/styles.css`:
```css
/* ---- document attach (P1) ---- */
.rec-attachrow { display: flex; align-items: center; gap: 8px; margin: 6px 0 2px; }
.rec-attach-msg { font-size: 10.5px; color: var(--ink50); }
.rec-doclink { font-weight: 600; }
```

- [ ] **Step 3:** `node --check src/lib/recordsUI.js && npm run build` → clean/succeeds.
- [ ] **Step 4: commit** — `git add src/lib/recordsUI.js src/styles.css && git commit -m "Wire attach-file + doc:// open into document rows (K-1 + drawers)"` (+ trailer).

---

## Task 3: Verification + deploy

- [ ] `npm test` (19 pass) · `npm run build` clean.
- [ ] Live check (move `.env` aside, preview): K-1 → edit a document → **📎 Attach file** appears; contacts form does NOT show it. Attach in local mode stores to IndexedDB; "Open 📎" opens it. Restore `.env`.
- [ ] Remote path is exercised post-deploy by the operator (signed in): attach a small PDF to a register row, Save, reload → "Open 📎" opens the signed URL.
- [ ] **Deploy:** `npx vercel deploy --prod --yes --scope adams-projects-0c52918e` (CLI logged in). Verify prod HTML serves new bundle. **Standing rule: every shipped phase deploys.**
- [ ] Update HANDOFF (P1 shipped; note doc:// scheme + bucket).

## Self-review
Covered: seam module mirrors assets.js (spec Thread 1 P1); pure helpers tested; UI only in the documents form (contacts untouched); external links unchanged; state shape unchanged; bucket provisioned with cloned RLS. Names consistent: `addDoc/docURL/removeDoc/buildDocLink/isDocLink/docPath/DOC_SCHEME/MAX_DOC_BYTES` across module/tests/UI. No placeholders. Out-of-scope items listed. `scope` is already in `mountRecords`'s closure so `openForm` can read `scope.unit` — verified against current source.
