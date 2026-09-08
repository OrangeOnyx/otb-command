/* Server/dev-only read adapter. The original archive remains the source of
   truth. Return one allowlisted real request, never the archive or its test,
   tenant, access-token, payment, or personal-contact records. */
import { readFile } from "node:fs/promises";

const WORK_ORDERS = new URL("../docs/harvest/ac-archive-2026-08-29/work_orders.json", import.meta.url);
const MANIFEST = new URL("../docs/harvest/ac-archive-2026-08-29/MANIFEST.json", import.meta.url);
const HARVEST = new URL("../docs/superpowers/specs/2026-08-29-ac-harvest.md", import.meta.url);
const UNITS = new URL("../src/data/units.public.json", import.meta.url);
const GEOMETRY = new URL("../src/data/geometry.json", import.meta.url);
export const COMMAND_ISSUE_ID = "c005cdc5-fd30-41a7-b71c-e40d3b3d1874";

const json = async url => JSON.parse(await readFile(url, "utf8"));
const normalizedTenant = value => String(value || "").toLowerCase().replace(/^the\s+/, "").trim();
const publicUnit = row => Object.fromEntries(["unit", "dba", "use", "cat", "status", "start", "end", "sf"]
  .filter(key => Object.hasOwn(row, key)).map(key => [key, row[key]]));

export async function loadCommandEvidence() {
  const [orders, manifest, harvest, units, geometry] = await Promise.all([
    json(WORK_ORDERS), json(MANIFEST), readFile(HARVEST, "utf8"), json(UNITS), json(GEOMETRY),
  ]);
  const row = orders.find(item => item.id === COMMAND_ISSUE_ID);
  if (!row || /test/i.test(row.reportedBy || "") || row.propertyId !== "otb-prop-1") {
    throw new Error("The verified archive request is unavailable.");
  }
  const proof = harvest.split(/\r?\n/).find(line => line.startsWith("| work_orders "));
  if (!proof) throw new Error("The archive verification record is unavailable.");
  const roster = units.map(publicUnit);
  const related = roster.filter(unit => normalizedTenant(unit.dba) === normalizedTenant(row.reportedBy));
  const suiteArea = roster.reduce((total, unit) => total + (Number(unit.sf) || 0), 0);
  const geometryNotes = [
    "GEOMETRY AUTHORITY AND UNRESOLVED DIFFERENCES",
    `Parking: ${geometry.parking?.totalPlat} traced spaces; variance reference ${geometry.parking?.variance?.entry} states ${geometry.parking?.variance?.provided} provided / ${geometry.parking?.variance?.required} required. The ten-space difference is unresolved. These counts do not establish a new parking entitlement.`,
    `Area: ${suiteArea.toLocaleString("en-US")} SF summed rentable suite area. The supplied plan's General Notes state total area of buildings = 62,883 SF; the app has carried that headline. These measures are retained separately, not silently reconciled.`,
    "Orientation: the supplied plat labels S38°32′00″E / N38°32′00″W along the long building and adjacent streets. It trends NW–SE, not precisely north–south. Storefronts address the Arnould side; the rear/service side addresses Marie Antoinette. Johnston is at the southeast end and Patricia at the northwest end.",
    "Several suite divisions are derived from areas or shared plat blocks; 135A/B is an interpreted mid-depth split. The original plan has historic tenant labels. Current suite association uses the separately dated July 2026 roster.",
    "Remote Lot 7 is across Marie Antoinette and represented in the supplied plat and existing model. The bank corner is excluded from the main tract; a referenced parking easement does not make it Belle-owned land.",
    "Instrument status and priority are not adjudicated here. The parking agreements source sheet contains unconfirmed references; executed instrument links and archive assertions do not resolve legal conflicts. Liquor-line geometry includes raster-fit interpretation. No legal permission is inferred from the display.",
  ].join("\n\n");
  const excerptRow = Object.fromEntries([
    "id", "title", "description", "unitId", "priority", "status", "reportedBy", "reportedAt",
    "vendorName", "cost", "assignedAt", "completedAt", "linkedVoiceIntakeId", "updatedAt",
  ].map(key => [key, row[key] ?? null]));
  const issue = {
    id: row.id,
    liveRequestId: "ac:" + row.id,
    title: row.title,
    description: row.description,
    reportedAt: row.reportedAt,
    reportedBy: row.reportedBy,
    priority: row.priority,
    archivedStatus: row.status,
    asOf: manifest.exported,
    vendorName: row.vendorName ?? null,
    cost: row.cost ?? null,
    completedAt: row.completedAt ?? null,
    location: {
      kind: "frontage-association",
      suiteIds: related.map(unit => unit.unit),
      label: `${row.description}. Associated storefronts face the Arnould Boulevard side of the long building.`,
      precision: "Exact location unverified",
    },
    unknowns: ["Exact defect point and extent", "Current condition and repair status", "Vendor / assignment", "Repair scope and quote", "Completion evidence", "Payment status"],
    sourceIds: ["pothole-record", "harvest-verification", "roster-101-103"],
  };
  return {
    version: 1,
    asOf: manifest.exported,
    issue,
    sources: [
      { id: "pothole-record", title: "Pothole repair · original archived request", path: "docs/harvest/ac-archive-2026-08-29/work_orders.json", asOf: manifest.exported, kind: "Archived operational record", excerpt: JSON.stringify(excerptRow, null, 2) + "\n\nArchive date: " + manifest.exported + ". Naive source timestamps were interpreted as America/Chicago during the documented import. Open is the archived status, not a current inspection result. This archived record contains no photograph, vendor, quote, assignment, or completion evidence." },
      { id: "harvest-verification", title: "Import verification · real request retained", path: "docs/superpowers/specs/2026-08-29-ac-harvest.md", asOf: manifest.exported, kind: "Repository import record", excerpt: proof + "\n\nThis record documents excluding 23 cancelled test tickets and retaining the one real Pothole Repair request. It does not establish its condition after the archive date." },
      { id: "roster-101-103", title: "The Pink Paisley · suite association", path: "src/data/units.public.json; docs/sot-2026-07/", asOf: "2026-07-16", kind: "Adopted source extract", excerpt: JSON.stringify(related, null, 2) + "\n\nAssociation is derived from the reported business name and July 2026 roster. The work order has unitId=null. No precise defect location is supplied." },
      { id: "suite-roster", title: "July 2026 · public suite roster", path: "src/data/units.public.json; docs/sot-2026-07/", asOf: "2026-07-16", kind: "Adopted source extract", excerpt: JSON.stringify(roster, null, 2) + "\n\nOwner-corrected source extracts adopted 2026-07-16. A dated roster, not current occupancy verification; no financial or private fields included." },
      { id: "geometry", title: "Existing geometry · " + geometry.rev, path: "src/data/geometry.json; reference/plat-full-72.png", asOf: "2019-07-19", kind: "Plat trace and derived geometry", excerpt: geometryNotes + "\n\nEXISTING MODEL EXCERPT\n" + JSON.stringify({ revision: geometry.rev, source: geometry.source, demising: geometry.demising, streetBearings: geometry.boundary?.mainTract?.courses?.filter(course => course.type === "line" && /Arnould|Marie Antoinette|Patricia/.test(course.along || "")), parkingVariance: geometry.parking?.variance, tracedParkingTotal: geometry.parking?.totalPlat }, null, 2) },
      { id: "plan-source", title: "Supplied survey plan · original scan", path: "reference/plat-full-72.png", asOf: "2019-07-19", kind: "Supplied source scan", excerpt: "Actual supplied plan scan retained in the repository: ALTA/ACSM survey for Belle Realty of Lafayette, LLC, Montagnet & Domingue, dated May 20, 1994, last revised July 19, 2019. The scan includes the survey title, seal, revision table, bearings, historic tenant labels, excluded bank corner, and remote Lot 7. General Notes state total area of buildings 62,883 SF and parking spaces 324; traced stall count is separately recorded as 314 in geometry.json. This is a source image, not independent authentication of the legal instrument or certification of current site conditions. The scan's street-oriented rotation differs from the operating model." },
      { id: "plat", title: "CAD reproduction of recorded plat", path: "public/plat-render.svg", asOf: "2019-07-19", kind: "Source reproduction", excerpt: "Existing CAD reproduction of the Montagnet & Domingue plat (1994-05-20; revised 2019-07-19). This is a schematic reproduction, not the certified legal instrument. Suite divisions marked derived in geometry.json are not surveyed demising walls.", imageUrl: "/plat-render.svg" },
    ],
  };
}
