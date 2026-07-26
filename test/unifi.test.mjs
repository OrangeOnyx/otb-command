import test from "node:test";
import assert from "node:assert/strict";
import { shapeUnifi, unifiHealthLine, unifiTriggerCandidate } from "../src/lib/unifi.js";

const HOSTS = { data: [{ reportedState: { hostname: "Belle", state: "connected" } }] };
const SITES = { data: [{ statistics: { counts: {
  totalDevice: 10, offlineDevice: 1, pendingUpdateDevice: 0, criticalNotification: 0,
  wifiClient: 10, wiredClient: 1 } } }] };
const DEVICES = { data: [{ hostName: "Belle", devices: [
  { name: "Suite 149", model: "AC Pro", status: "online", ip: "192.168.1.87" },
  { name: "Belle", model: "UDM Pro", status: "online", ip: "76.72.15.3" },
] }] };

test("shapeUnifi: site counts win; unlisted = dropped-from-list offline units", () => {
  const s = shapeUnifi(HOSTS, SITES, DEVICES);
  assert.equal(s.console.name, "Belle");
  assert.equal(s.counts.total, 10);
  assert.equal(s.counts.offline, 1);
  assert.equal(s.devices.length, 2);
  assert.equal(s.unlisted, 8); // 10 total - 2 listed in this fixture
});

test("shapeUnifi degrades to zeros on missing inputs", () => {
  const s = shapeUnifi(null, undefined, {});
  assert.equal(s.counts.total, 0);
  assert.equal(s.counts.offline, 0);
  assert.equal(s.devices.length, 0);
  assert.equal(s.console.state, "unknown");
});

test("unifiHealthLine: verdicts", () => {
  const ok = shapeUnifi(HOSTS, { data: [{ statistics: { counts: { totalDevice: 9, offlineDevice: 0 } } }] }, DEVICES);
  assert.equal(unifiHealthLine(ok), "all systems online");
  const bad = shapeUnifi(HOSTS, SITES, DEVICES);
  assert.equal(unifiHealthLine(bad), "1 device offline");
  const dc = shapeUnifi({ data: [{ reportedState: { hostname: "Belle", state: "disconnected" } }] }, SITES, DEVICES);
  assert.match(unifiHealthLine(dc), /console disconnected/);
  assert.equal(unifiHealthLine(null), "");
});

test("unifiTriggerCandidate: healthy site → null", () => {
  const ok = shapeUnifi(HOSTS,
    { data: [{ statistics: { counts: { totalDevice: 2, offlineDevice: 0 } } }] }, DEVICES);
  assert.equal(unifiTriggerCandidate(ok), null);
  assert.equal(unifiTriggerCandidate(null), null);
});

test("unifiTriggerCandidate: outage-set key is stable and order-independent", () => {
  const devs = (a, b) => ({ data: [{ devices: [
    { name: a, status: "offline" }, { name: b, status: "offline" },
    { name: "Belle", status: "online" },
  ] }] });
  const sites = { data: [{ statistics: { counts: { totalDevice: 3, offlineDevice: 2 } } }] };
  const c1 = unifiTriggerCandidate(shapeUnifi(HOSTS, sites, devs("Suite 107", "Suite 119")));
  const c2 = unifiTriggerCandidate(shapeUnifi(HOSTS, sites, devs("Suite 119", "Suite 107")));
  assert.equal(c1.triggerSource, c2.triggerSource); // same outage, same thread
  assert.equal(c1.triggerSource, "unifi:suite-107+suite-119");
  assert.equal(c1.agent, "manager");
  assert.match(c1.title, /2 of 3 devices/);
  const c3 = unifiTriggerCandidate(shapeUnifi(HOSTS, sites, devs("Suite 107", "Suite 149")));
  assert.notEqual(c1.triggerSource, c3.triggerSource); // changed outage → new thread
});

test("unifiTriggerCandidate: unlisted-only and console-down cases key distinctly", () => {
  const unl = unifiTriggerCandidate(shapeUnifi(HOSTS, SITES, DEVICES)); // fixture: 8 unlisted
  assert.equal(unl.triggerSource, "unifi:8-unlisted");
  assert.match(unl.detail, /dropped/);
  const dcHosts = { data: [{ reportedState: { hostname: "Belle", state: "disconnected" } }] };
  const dc = unifiTriggerCandidate(shapeUnifi(dcHosts, SITES, DEVICES));
  assert.match(dc.triggerSource, /^unifi:console\+/);
  assert.match(dc.detail, /disconnected/);
});
