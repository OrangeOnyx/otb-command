/* Cypress Command: presentation-only evidence and a deterministic review draft.
   No network, DOM, financial inference, mutable records, or bundled archive. */
export const ROSTER_AS_OF = "2026-09-10";
export const COMMAND_PREVIEW = Object.freeze({
  label: 'Preview · isolated test data',
  sourceSnapshotAt: '2026-09-08T18:59:20Z',
});

export function previewEvidenceNotice(preview) {
  return preview ? `Isolated Cypress test database, seeded from a production record snapshot dated ${preview.sourceSnapshotAt}. Subsequent reads and edits describe this test copy; they do not establish current production records or site conditions.` : '';
}

/** Keep the environment qualification in downloads/copies even after edits. */
export function ownerUpdateExportText(text, preview) {
  const notice = previewEvidenceNotice(preview);
  if (!notice) return text;
  const heading = `${COMMAND_PREVIEW.label.toUpperCase()}\n${notice}`;
  return String(text).includes(heading) ? text : `${heading}\n\n${text}`;
}

/** Property-local calendar date. A date-only source is already a calendar date;
    instants must carry a timezone (or be a Date / epoch millisecond value). */
export function commandDate(value) {
  if (typeof value === "string") {
    const day = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
    const calendar = day ? new Date(day + "T00:00:00Z") : null;
    if (!calendar || !Number.isFinite(calendar.getTime()) || calendar.toISOString().slice(0, 10) !== day) {
      throw new RangeError("A valid command date or timestamp is required.");
    }
    if (value === day) return day;
    if (!/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) {
      throw new RangeError("Command timestamps must include a timezone.");
    }
  } else if (!(value instanceof Date) && typeof value !== "number") {
    throw new RangeError("A valid command date or timestamp is required.");
  }
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new RangeError("A valid command date or timestamp is required.");
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date).filter(part => part.type !== "literal").map(part => [part.type, part.value]));
  return `${parts.year.padStart(4, "0")}-${parts.month}-${parts.day}`;
}

const statusLabel = { active: "Active in source", anchor: "Anchor in source", owner: "Owner occupied in source", vacant: "Vacant in source" };
const sourceRef = (id, title, path, asOf, kind, excerpt) => ({ id, title, path, asOf, kind, excerpt });

/** Derive field-level provenance from the existing shared unit and geometry. */
export function suiteEvidence(unit, geometry) {
  if (!unit?.unit) return null;
  const id = String(unit.unit);
  const long = geometry?.demising?.longBuilding?.bays || [];
  const short = geometry?.demising?.shortBuilding?.bays || [];
  const split135 = id === "135A" || id === "135B";
  const bay = [...long, ...short].find(row => String(row[0]) === (split135 ? "135" : id));
  const note = split135
    ? geometry?.demising?.shortBuilding?.split135 || "Mid-depth split; independent field confirmation unavailable."
    : bay?.[2] || "No demising source recorded for this suite.";
  const classification = !bay ? "Unknown" : split135 ? "Interpreted split" : /^derived/i.test(note) ? "Derived boundary" : "Plat dimension";
  const publicRow = Object.fromEntries(["unit", "dba", "use", "cat", "status", "start", "end", "sf"]
    .filter(key => Object.hasOwn(unit, key)).map(key => [key, unit[key]]));
  const fields = [
    { label: "Tenant / use", value: unit.dba || "Not recorded", sourceId: "suite-roster" },
    { label: "Source status", value: statusLabel[unit.status] || "Unknown", sourceId: "suite-roster" },
    { label: "Recorded suite area", value: unit.sf !== null && unit.sf !== undefined && unit.sf !== "" && Number.isFinite(Number(unit.sf)) ? Number(unit.sf).toLocaleString("en-US") + " SF" : "Unknown", sourceId: "suite-roster" },
    { label: "Term end in source", value: unit.end || "Not recorded / not applicable", sourceId: "suite-roster" },
  ];
  return {
    asOf: ROSTER_AS_OF,
    fields,
    geometry: { classification, description: note, sourceId: "suite-geometry" },
    sources: [
      sourceRef("suite-roster", `Suite ${id} · adopted roster extract`, "src/data/units.public.json; docs/sot-2026-07/", ROSTER_AS_OF, "Adopted roster with reviewed term updates", JSON.stringify(publicRow, null, 2) + "\n\nTenant names, status and areas retain July 2026 roster authority. Term fields include the September 10 lease review and owner confirmations; blank dates remain unresolved. Authorized suite reviews show individual evidence and limitations. This is not confirmation of occupancy today. Financial and private fields excluded."),
      sourceRef("suite-geometry", `Suite ${id} · geometry provenance`, "src/data/geometry.json", "2019-07-19", classification, JSON.stringify({ revision: geometry?.rev, source: geometry?.source, demising: bay || null, ...(split135 ? { split: note } : {}) }, null, 2) + "\n\nRendering follows the existing geometry. Derived/interpreted boundaries are not independently surveyed demising walls."),
      { id: "plan-source", title: "Supplied survey plan · original scan", path: "reference/plat-full-72.png", asOf: "2019-07-19", kind: "Supplied source scan", excerpt: "The supplied ALTA/ACSM survey scan includes the survey title, seal, revision table and bearings. Historic tenant labels on the plan do not establish current tenant status. Derived suite subdivisions are qualified separately in the model. This source image is not an independent legal-instrument authentication." },
      { id: "plat", title: "CAD reproduction of recorded plat", path: "public/plat-render.svg", asOf: "2019-07-19", kind: "Source reproduction", excerpt: "Montagnet & Domingue plat: 1994-05-20, revised 2019-07-19. This existing CAD reproduction supports visual comparison; it is not the certified instrument. Street-facing descriptions are approximate compass relationships; the long building follows the plat bearing, not exact north–south.", imageUrl: "/plat-render.svg" },
    ],
  };
}

/** Plain-text draft for review. It intentionally does not create or send records. */
export function buildOwnerUpdate({ issue, generatedAt } = {}) {
  if (!issue?.id || !issue?.asOf || !issue?.reportedAt || !issue?.title) {
    throw new Error("A dated source-backed maintenance issue is required.");
  }
  const generated = commandDate(generatedAt === undefined ? new Date() : generatedAt);
  const suites = issue.location?.suiteIds || [];
  const system = issue.systemRecord?.state === 'verified' && commandDate(issue.systemRecord.readAt) <= generated ? issue.systemRecord : null;
  const references = (issue.sourceIds || []).filter(id=>id!=='maintenance-system-record' || system);
  const costLine = issue.cost === null || issue.cost === undefined
    ? "Cost / quote: not recorded in the source."
    : `Recorded cost field: ${issue.cost}; this field does not establish approval, invoice receipt, or payment.`;
  const text = [
    "CYPRESS COMMAND · OWNER UPDATE DRAFT",
    "On The Boulevard · For owner review",
    `Prepared ${generated} · Source archive as of ${issue.asOf}`,
    "",
    issue.title,
    `The archived maintenance record reports “${issue.description || issue.title}”. Reported by ${issue.reportedBy || "an unspecified reporter"} on ${String(issue.reportedAt).slice(0, 10)}. [pothole-record]`,
    `Recorded status: ${issue.archivedStatus || "not recorded"} in the ${issue.asOf} archive. Current repair/completion status has not been verified by this draft. [pothole-record]`,
    ...(system ? [
      '', 'LINKED WORK-ORDER CHECK',
      `The ${issue.preview ? 'isolated test copy of' : 'canonical'} M-1 request ${system.requestId} was read at ${system.readAt}. ${system.explicitStatus ? 'Recorded state' : 'Default request state (no status event)'}: ${system.status}. Last logged activity: ${system.lastAt}. [maintenance-system-record]`,
      system.vendorId ? `Assignment identifier in the event trail: ${system.vendorId}. A company name or work authorization is not inferred. [maintenance-system-record]` : 'No vendor assignment appears in the retrieved event trail. [maintenance-system-record]',
      system.photos?.state === 'checked' ? `Photo folder: ${system.photos.complete ? '' : 'at least '}${system.photos.count} visible files at the read. This is not a search of every document repository. [maintenance-system-record]` : 'The photo folder could not be verified in this read.',
      'A database status is not a site inspection. Physical condition, repair completion evidence, scope, cost and payment remain to be verified.',
    ] : []),
    "",
    "LOCATION",
    issue.location?.label || "Location not verified.",
    suites.length ? `The frontage association uses the July 2026 roster for suites ${suites.join(" / ")}; the work order itself does not assign a suite. The exact defect point and extent remain unverified. [roster-101-103]` : "No suite association is supported by the selected records.",
    "",
    system ? "ARCHIVED RECORD GAPS" : "RECORD GAPS",
    issue.vendorName ? `Vendor named in source: ${issue.vendorName}.` : "Vendor / assignment: not recorded in the source.",
    costLine,
    issue.completedAt ? `Completion field in source: ${issue.completedAt}; current condition still requires confirmation.` : "Completion: no completion date or supporting completion record in this source.",
    "Payment: unknown; no payment evidence is included in these records.",
    "This archived record contains no supporting photograph or repair scope.",
    "",
    "RECOMMENDED NEXT ACTION · FOR REVIEW",
    "Confirm the current condition on site, document the exact location with a photograph, and request a repair scope and quote if work remains necessary. Confirm any interim access measures during inspection. These are recommendations, not evidence of completed actions or authorization to dispatch or spend.",
    "",
    "SOURCE REFERENCES",
    ...references.map(id => `[${id}] ${id === "pothole-record" ? "docs/harvest/ac-archive-2026-08-29/work_orders.json · " + issue.id : id === "harvest-verification" ? "docs/superpowers/specs/2026-08-29-ac-harvest.md · live imports table" : id === "roster-101-103" ? "src/data/units.public.json · suites 101 / 103 · July 2026 adopted snapshot" : id === 'maintenance-system-record' ? `${system.sourcePath || 'Authenticated Supabase read'} · public.maintenance_requests / public.maintenance_events · ${system.requestId} · ${system.readAt}` : id}`),
    "",
    "DRAFT ONLY · Not sent. No maintenance, accounting, or external business record changed.",
  ].join("\n");
  return { title: "Owner update · " + issue.title, text:ownerUpdateExportText(text,issue.preview), sourceIds: [...references], generatedAt: generated, reviewOnly: true };
}
