/* Photos & Plans UI — drag-drop / pick images, thumbnail grid, click-to-enlarge
   lightbox. Async (IndexedDB-backed); manages object-URL lifecycle so nothing
   leaks across re-mounts. Used by the unit drawer; reusable for property scope. */
import { ASSET_KINDS, addAsset, listAssets, removeAsset, revokeURL, onAssetChange } from "./assets.js";
import { esc } from "./format.js";

const KIND_LABEL = Object.fromEntries(ASSET_KINDS);

let lightbox = null;
function openLightbox(url, caption) {
  if (!lightbox) {
    lightbox = document.createElement("div");
    lightbox.className = "lightbox";
    lightbox.onclick = () => lightbox.classList.remove("on");
    document.body.appendChild(lightbox);
  }
  lightbox.innerHTML = '<figure><img src="' + url + '"><figcaption>' + esc(caption || "") + '</figcaption></figure>';
  lightbox.classList.add("on");
}

/* mount into el for a given scope ("property" or a unit id). Returns a cleanup fn. */
export function mountAssets(el, scope) {
  let urls = [];
  let unsub = null;
  let disposed = false;

  const cleanupURLs = () => { urls.forEach(revokeURL); urls = []; };

  async function render() {
    if (disposed) return;
    const assets = await listAssets(scope);
    if (disposed) return;
    cleanupURLs();

    const kindOpts = ASSET_KINDS.map(([k, l]) => '<option value="' + k + '">' + l + '</option>').join("");
    const grid = assets.map(a => {
      const url = a.url; urls.push(url);
      return '<figure class="asset" data-id="' + esc(a.id) + '" data-url="' + url + '">' +
        '<img src="' + url + '" alt="' + esc(a.name) + '" loading="lazy">' +
        '<button class="asset-x" data-id="' + esc(a.id) + '" title="Remove">✕</button>' +
        '<figcaption><span class="asset-kind">' + esc(KIND_LABEL[a.kind] || a.kind) + '</span>' + esc(a.name) + '</figcaption>' +
        '</figure>';
    }).join("");

    el.innerHTML =
      '<div class="asset-grid">' + grid + '</div>' +
      '<div class="asset-add" id="assetDrop">' +
      '<select class="asset-kindsel">' + kindOpts + '</select>' +
      '<label class="asset-pick">+ Add image<input type="file" accept="image/*" multiple hidden></label>' +
      '<span class="asset-hint">or drag &amp; drop</span></div>';

    const kindSel = el.querySelector(".asset-kindsel");
    const ingest = files => {
      const kind = kindSel.value;
      Promise.all([...files].filter(f => f.type.startsWith("image/")).map(f => addAsset(f, { unit: scope, kind })));
    };
    el.querySelector(".asset-pick input").onchange = e => ingest(e.target.files);
    const drop = el.querySelector("#assetDrop");
    drop.ondragover = e => { e.preventDefault(); drop.classList.add("drag-over"); };
    drop.ondragleave = () => drop.classList.remove("drag-over");
    drop.ondrop = e => { e.preventDefault(); drop.classList.remove("drag-over"); ingest(e.dataTransfer.files); };

    el.querySelectorAll(".asset").forEach(fig => {
      fig.querySelector("img").onclick = () => openLightbox(fig.dataset.url, fig.querySelector("figcaption").textContent);
      fig.querySelector(".asset-x").onclick = e => { e.stopPropagation(); removeAsset(fig.dataset.id); };
    });
  }

  render();
  unsub = onAssetChange(render); // refresh on add/remove from anywhere
  return () => { disposed = true; cleanupURLs(); if (unsub) unsub(); };
}
