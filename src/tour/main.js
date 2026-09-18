/* /tour — public microsite for the vacant suites (2026-09-18, operator pick
   "1 2 and 3"; the old B2 item, un-gated by the Insta360 + LiDAR scans).
   Reads manifest.json from the PUBLIC `tour` bucket (published from the B-1
   sheet); each suite gets a 360° viewer (three.js — already a dependency —
   inside-out sphere + drag / touch / wheel) over its equirectangular
   panoramas, or the site plan + numbers while the scan is pending. No
   framework, no auth, no analytics. Public copy = OTB brand, welcoming,
   local; asking rates are never printed. */
import * as THREE from "three";
import UNITS from "../data/units.public.json";
import corridor from "../data/corridor.json";

const SUPA = import.meta.env.VITE_SUPABASE_URL || "";
const MANIFEST = SUPA ? SUPA.replace(/\/$/, "") + "/storage/v1/object/public/tour/manifest.json" : "";
const PHONE = "(337) 270-7044", TEL = "tel:+13372707044", SMS = "sms:+13372707044";
const LEASING = "/leasing";

const roll = UNITS.units || UNITS;
const vacant = roll.filter(u => u.status === "vacant");
const anchor = roll.find(u => u.status === "anchor");
const gla = roll.reduce((s, u) => s + (Number(u.sf) || 0), 0);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]));
const n0 = n => Number(n || 0).toLocaleString("en-US");

/* ---- 360 viewer ---- */
function viewer(el, urls) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  el.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1100);
  const geo = new THREE.SphereGeometry(500, 60, 40); geo.scale(-1, 1, 1);
  const mat = new THREE.MeshBasicMaterial({ color: 0x1c2d4f });
  const mesh = new THREE.Mesh(geo, mat); scene.add(mesh);
  const loader = new THREE.TextureLoader(); loader.setCrossOrigin("anonymous");
  let lon = 0, lat = 0, drag = null, auto = true;
  function load(i) {
    el.classList.add("loading");
    loader.load(urls[i], t => { t.colorSpace = THREE.SRGBColorSpace; mat.map = t; mat.color.set(0xffffff); mat.needsUpdate = true; el.classList.remove("loading"); },
      undefined, () => el.classList.remove("loading"));
    el.querySelectorAll(".dot").forEach((d, j) => d.classList.toggle("on", j === i));
  }
  function size() { const w = el.clientWidth, h = el.clientHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  const c = renderer.domElement;
  const down = (x, y) => { drag = { x, y, lon, lat }; auto = false; };
  const move = (x, y) => { if (!drag) return; lon = drag.lon - (x - drag.x) * 0.2; lat = Math.max(-85, Math.min(85, drag.lat + (y - drag.y) * 0.2)); };
  c.addEventListener("pointerdown", e => { down(e.clientX, e.clientY); c.setPointerCapture(e.pointerId); });
  c.addEventListener("pointermove", e => move(e.clientX, e.clientY));
  c.addEventListener("pointerup", () => { drag = null; }); c.addEventListener("pointercancel", () => { drag = null; });
  c.addEventListener("wheel", e => { e.preventDefault(); camera.fov = Math.max(40, Math.min(95, camera.fov + e.deltaY * 0.03)); camera.updateProjectionMatrix(); }, { passive: false });
  if (urls.length > 1) {
    const dots = document.createElement("div"); dots.className = "dots";
    urls.forEach((_, i) => { const d = document.createElement("button"); d.className = "dot"; d.title = "View " + (i + 1); d.onclick = () => load(i); dots.appendChild(d); });
    el.appendChild(dots);
  }
  const hint = document.createElement("div"); hint.className = "hint"; hint.textContent = "drag to look around · scroll to zoom"; el.appendChild(hint);
  new ResizeObserver(size).observe(el); size(); load(0);
  (function frame() {
    requestAnimationFrame(frame);
    if (auto) lon += 0.03;
    const phi = THREE.MathUtils.degToRad(90 - lat), theta = THREE.MathUtils.degToRad(lon);
    camera.lookAt(500 * Math.sin(phi) * Math.cos(theta), 500 * Math.cos(phi), 500 * Math.sin(phi) * Math.sin(theta));
    renderer.render(scene, camera);
  })();
}

/* ---- page ---- */
function suiteCard(u, media) {
  const panos = (media && media.panos || []).map(p => p.url);
  const hero = media && media.hero;
  const sibling = vacant.filter(v => v.unit !== u.unit);
  return '<section class="suite" id="suite-' + esc(u.unit) + '">' +
    '<div class="s-head"><div><div class="k">Suite ' + esc(u.unit) + '</div><h2>' + n0(u.sf) + ' <small>SF</small></h2><div class="use">' + esc(u.use || "Retail / service") + '</div></div>' +
    '<div class="s-cta"><a class="btn" href="' + TEL + '">Call Adam</a><a class="btn ghost" href="' + SMS + '?body=' + encodeURIComponent("Hi Adam — I'd like to see Suite " + u.unit + " at On The Boulevard.") + '">Text to tour</a></div></div>' +
    (panos.length ? '<div class="pano" data-panos="' + esc(JSON.stringify(panos)) + '"></div>'
      : '<div class="pending">' + (hero ? '<img src="' + esc(hero) + '" alt="Suite ' + esc(u.unit) + '">' : '<img src="/plat-render.svg" alt="Site plan" class="plan">') +
        '<div class="pend-note"><b>Interior 360° scan coming.</b> Until then: the numbers are real, the plan is the recorded plat, and Adam walks it with you any weekday.</div></div>') +
    '<div class="s-facts"><div><b>Available</b>now</div><div><b>Terms</b>NNN · rate quoted per space</div>' +
    (sibling.length ? '<div><b>Combine</b>with Suite ' + esc(sibling.map(s => s.unit).join(" / ")) + ' → ' + n0(u.sf + sibling.reduce((s, x) => s + x.sf, 0)) + ' SF</div>' : '') +
    '<div><b>Neighbors</b>' + esc(anchor ? anchor.dba : "On The Boulevard tenants") + ' and 20+ local shops</div></div></section>';
}

async function boot() {
  const root = document.getElementById("suites");
  let manifest = { suites: {} };
  if (MANIFEST) { try { const r = await fetch(MANIFEST, { cache: "no-cache" }); if (r.ok) manifest = await r.json(); } catch { /* pending */ } }
  root.innerHTML = vacant.length ? vacant.map(u => suiteCard(u, manifest.suites && manifest.suites[u.unit])).join("")
    : '<section class="suite"><h2>Fully leased</h2><p>Join the waitlist — call or text ' + PHONE + '.</p></section>';
  root.querySelectorAll(".pano").forEach(el => { try { viewer(el, JSON.parse(el.dataset.panos)); } catch { el.remove(); } });
  const st = document.getElementById("stats");
  if (st) st.innerHTML = '<div><b>' + n0(gla) + '</b>SF center</div><div><b>' + roll.length + '</b>suites</div>' +
    (corridor.centerListing && corridor.centerListing.rating ? '<div><b>' + esc(corridor.centerListing.rating) + ' ★</b>Google · ' + n0(corridor.centerListing.ratings) + ' reviews</div>' : '') +
    (corridor.driveTimes || []).slice(0, 3).map(d => '<div><b>' + esc(d.minutes) + ' min</b>' + esc(d.name) + '</div>').join("");
  document.getElementById("leasingLink").href = LEASING;
}
boot();
