import test from "node:test";
import assert from "node:assert/strict";
import config from "../vite.config.js";
import { LOCAL_REVIEW, REMOTE } from "../src/lib/remote.js";

function middleware(options, flag) {
  const before = process.env.VITE_LOCAL_REVIEW;
  if (flag === undefined) delete process.env.VITE_LOCAL_REVIEW;
  else process.env.VITE_LOCAL_REVIEW = flag;
  let settings;
  try { settings = config(options); }
  finally {
    if (before === undefined) delete process.env.VITE_LOCAL_REVIEW;
    else process.env.VITE_LOCAL_REVIEW = before;
  }
  let handler;
  settings.plugins[0].configureServer({ middlewares: { use(fn) { handler = fn; } } });
  return { handler, settings };
}
async function request(handler, patch = {}) {
  const response = { statusCode: 200, headers: {}, body: "", setHeader(k, v) { this.headers[k] = v; }, end(body) { this.body = body; } };
  await handler({ url: "/__review/evidence", method: "GET", headers: { host: "127.0.0.1:5174" }, socket: { remoteAddress: "127.0.0.1" }, ...patch }, response, () => { response.next = true; });
  return response;
}

test("plain Node does not enable local review or create a remote client", () => {
  assert.equal(LOCAL_REVIEW, false);
  assert.equal(REMOTE, false);
});

test("review evidence is unavailable in ordinary dev and production, even with flag", async () => {
  for (const [options, flag] of [[{ command: "serve", mode: "development" }, undefined], [{ command: "build", mode: "production" }, "1"], [{ command: "serve", mode: "production" }, "1"]]) {
    const { handler, settings } = middleware(options, flag);
    assert.equal(settings.server, undefined);
    assert.equal((await request(handler)).statusCode, 404);
  }
});

test("review evidence restricts method, host, remote address and browser origin", async () => {
  const { handler, settings } = middleware({ command: "serve", mode: "development" }, "1");
  assert.deepEqual(settings.server, { host: "127.0.0.1", port: 5174, strictPort: true });
  assert.equal((await request(handler, { method: "POST" })).statusCode, 405);
  assert.equal((await request(handler, { headers: { host: "evil.test:5174" } })).statusCode, 404);
  assert.equal((await request(handler, { socket: { remoteAddress: "192.168.1.2" } })).statusCode, 404);
  assert.equal((await request(handler, { headers: { host: "127.0.0.1:5174", origin: "https://evil.test" } })).statusCode, 403);
  assert.equal((await request(handler, { url: "/some-other-route" })).next, true);
});
