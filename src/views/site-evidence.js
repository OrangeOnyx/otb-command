/* A-4 Site Evidence (2026-09-27): the twin's source library as its own sheet —
   Google Earth project + dated views, the DOTD 2024 aerial, GIS captures,
   suite floor plans, the water/shutoff source map, the 2021 time-clock photos
   and the open verification notes. Read-only; every card says what its date
   means. Loaded only where the asset twin is released (same gate as A-3). */
import './site-evidence.css';
import { siteResearch } from '../lib/asset-twin-research.js';
import { sourceImageURL } from './asset-twin-sources.js';
import { esc } from '../lib/format.js';
import { clockLabel } from '../lib/site-evidence-labels.js';

const DATE_MEANING = {
  'imagery-selector': 'Imagery selector date — pixels may be older',
  'publication': 'Publication / dataset date',
  'capture': 'Capture date',
  'review': 'Review date',
};


const figure = (name, caption) => {
  const url = sourceImageURL(name);
  return url ? `<figure class="ev-fig"><a href="${esc(url)}" target="_blank" rel="noopener"><img src="${esc(url)}" alt="${esc(caption)}" loading="lazy"></a><figcaption>${esc(caption)}</figcaption></figure>` : '';
};

function referenceCard(item) {
  const link = item.url ? `<a class="ev-open" href="${esc(item.url)}" target="_blank" rel="noopener">Open ↗</a>` : '';
  return `<article class="ev-ref">
    <div class="ev-ref-head"><span class="ev-kind">${esc(item.kind === 'dated-view' ? 'Dated view' : item.kind === 'source' ? 'Source' : 'Note')}</span>${link}</div>
    <h3>${esc(item.title)}</h3>
    <dl><div><dt>Date</dt><dd>${esc(item.sourceDateLabel || item.sourceDate || 'Unknown')}</dd></div>
      <div><dt>Meaning</dt><dd>${esc(DATE_MEANING[item.dateMeaning] || item.dateMeaning || '—')}</dd></div>
      <div><dt>Provider</dt><dd>${esc(item.provider || '—')}</dd></div>
      <div><dt>Reviewed</dt><dd>${esc(item.reviewedAt || '—')}</dd></div></dl>
    <details><summary>Notes &amp; caveats</summary><p>${esc(item.notes || '')}</p></details>
  </article>`;
}

export function siteEvidenceHTML() {
  const site = new Set(siteResearch.siteEvidenceIds);
  const siteRefs = siteResearch.evidence.filter(e => site.has(e.id));
  const notes = siteResearch.evidence.filter(e => !site.has(e.id));
  const clocks = Object.keys(import.meta.glob('../assets/twin/infrastructure/time-clock-*.jpg'))
    .map(k => k.replace('../assets/twin/', '')).sort((a, b) => clockLabel(a).localeCompare(clockLabel(b), 'en', { numeric: true }));
  return `
  <p class="ev-lede">Every source behind the asset twin in one place. Imagery dates are shown with what they mean — a Google Earth selector date is not a capture date for every pixel, and none of this is a field inspection. Open any item in the twin (A-3) to see the permanent records it supports.</p>
  <section class="card ev-sec"><div class="panel-h"><h2>Google Earth &amp; aerial references</h2><div class="sub">SITE CONTEXT · ATTACHED TO EVERY TWIN RECORD</div></div>
    <div class="ev-refs">${siteRefs.map(referenceCard).join('')}</div></section>
  <section class="card ev-sec"><div class="panel-h"><h2>Aerials &amp; GIS captures</h2><div class="sub">DOTD 2024 · LAFAYETTE GIS (DISPLAYED JULY 14, 2021) · BROCHURE</div></div>
    <div class="ev-grid">${[
      ['infrastructure/dotd-2024-aerial.jpg', 'Louisiana DOTD 2024 aerial'],
      ['infrastructure/gis-overview.png', 'GIS overview · displayed Jul 14, 2021'],
      ['infrastructure/gis-south.png', 'GIS south · displayed Jul 14, 2021'],
      ['infrastructure/gis-west.png', 'GIS west · displayed Jul 14, 2021'],
      ['aerial-reference.jpg', 'Aerial · brochure p. 4'],
      ['infrastructure/site-fixtures.png', 'Columns, benches & cans source plan'],
    ].map(([f, c]) => figure(f, c)).join('')}</div>
    <div class="ev-actions"><a class="chip" href="#twin" data-twin="layout=exterior">Open exterior &amp; site in the twin →</a></div></section>
  <section class="card ev-sec"><div class="panel-h"><h2>Suite floor plans</h2><div class="sub">UNITS 101 &amp; 103 · SUPPLIED PLANS · HEIGHTS UNVERIFIED</div></div>
    <div class="ev-grid">${[['plans/101-first.png', 'Unit 101 · first floor'], ['plans/101-second.png', 'Unit 101 · upper floor (partial rear)'],
      ['plans/103-first.png', 'Unit 103 · first floor'], ['plans/103-second.png', 'Unit 103 · upper floor']].map(([f, c]) => figure(f, c)).join('')}</div>
    <div class="ev-actions"><a class="chip" href="#twin" data-twin="layout=interior">Open interior floor plans in the twin →</a>
      <a class="chip" href="${import.meta.env.BASE_URL}twin/historical-plan-review.md" target="_blank" rel="noopener">1993 plan review (A1.1, E1–E4) ↗</a></div></section>
  <section class="card ev-sec"><div class="panel-h"><h2>Water meters &amp; shutoffs</h2><div class="sub">SOURCE MAP · 24 CITY METERS AT 6 LOCATIONS · 37 SHUTOFFS AT 13 LOCATIONS</div></div>
    <div class="ev-grid ev-grid-wide">${figure('infrastructure/water-shutoff-map.png', 'Water & shutoff source map (blue = city meters, red = tenant shutoffs)')}</div>
    <p class="ev-note">Circle counts confirmed by Adam. The 28 workbook meter IDs are not yet assigned to these map locations.</p>
    <div class="ev-actions"><a class="chip" href="#twin" data-twin="water=all">Open water &amp; shutoffs in the twin →</a></div></section>
  <section class="card ev-sec"><div class="panel-h"><h2>Time-clock photographs</h2><div class="sub">${clocks.length} PHOTOS · NOVEMBER 2021 · GROUPED BY FILE NAME, NOT A VERIFIED CLOCK COUNT</div></div>
    <div class="ev-grid ev-grid-small">${clocks.map(f => figure(f, `Suite ${clockLabel(f)}`)).join('')}</div>
    <p class="ev-note">No photo on file for 111, 135B or 139. Historical photos are separate from current inspection photos.</p></section>
  <section class="card ev-sec"><div class="panel-h"><h2>Open verification notes</h2><div class="sub">WHAT STILL NEEDS A FIELD CHECK</div></div>
    <div class="ev-refs">${notes.map(referenceCard).join('')}</div></section>`;
}

export function initSiteEvidence() {
  const body = document.getElementById('evBody');
  if (!body || body.firstChild) return;
  body.innerHTML = siteEvidenceHTML();
  // Carry the twin view (layout / water) in the query without reloading the app;
  // A-3 reads it when the sheet opens.
  body.addEventListener('click', event => {
    const link = event.target.closest('a[data-twin]'); if (!link) return;
    event.preventDefault();
    const [key, value] = link.dataset.twin.split('=');
    const url = new URL(location.href); url.searchParams.set(key, value);
    history.replaceState(null, '', url); location.hash = 'twin';
  });
}
