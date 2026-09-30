# OTB Ops — System Transfer Package

**System:** OTB Ops (Property Operations Intelligence)  
**Owner:** Adam Abdalla / Abdalla Enterprises, LLC  
**Property:** On The Boulevard Shopping Center, 101–149 Arnould Blvd, Lafayette, LA 70506  
**Extraction Date:** 2026-07-22  
**Codebase Version:** `b7550429` (latest checkpoint)  
**Total Lines of Code:** 49,256 TypeScript  
**Test Coverage:** 241 tests across 27 test files  

---

## Section 01 — Executive Overview

OTB Ops is a single-property commercial real estate operations platform purpose-built for On The Boulevard Shopping Center — a 62,749 net-rentable-SF, 25-unit open-air retail center in Lafayette, Louisiana. It consolidates property management, financial operations, leasing intelligence, compliance tracking, and AI-assisted decision-making into a single web application accessible to the owner-operator and authorized staff.

The system replaces or augments DoorLoop (property management SaaS), manual spreadsheets (rent roll, CAM reconciliation), and disconnected communication channels. It is deployed as a serverless Node.js application on Manus infrastructure with a TiDB (MySQL-compatible) database, S3 file storage, and SendGrid email delivery.

**Core value proposition:** Reduce Adam's daily operational overhead from hours of context-switching across tools to a single command-palette-driven interface with proactive alerting, AI-grounded decision support, and automated compliance enforcement.

**Architecture summary:** React 19 SPA (Vite + Tailwind 4) → tRPC 11 → Express 4 → Drizzle ORM → TiDB. ElevenLabs voice agents push structured payloads via authenticated webhooks. Five heartbeat jobs run scheduled operations (daily alerts, late fees, invoice generation, renewal monitoring, audit cleanup).

---

## Section 02 — Feature Inventory (Complete)

### 2.1 Workspaces (30 total)

| # | Workspace | Component | Purpose |
|---|-----------|-----------|---------|
| 1 | Dashboard | `DashboardKPIs` | KPI cards: occupancy, revenue, compliance score, open WOs, collection rate |
| 2 | Site Plan | `SitePlanCanvas` | Interactive SVG site plan with heat maps (compliance, rent/SF, expiration, status), POI layers, parking, signs |
| 3 | Rent Roll | `RentRoll` | Full rent roll table with PSF breakdowns, export capability |
| 4 | Center Plan | `CenterPlanViewer` | Architectural center plan with unit overlays |
| 5 | Pylon | `PylonViewer` | Pylon sign slot management (8 slots, tenant assignment) |
| 6 | Leasing | `LeasingWorkspace` | Waitlist/prospect management, vacancy marketing, prospect conversion |
| 7 | Documents | `DocumentsRollup` + `DocumentsTab` | Document management per unit (lease, COI, license, HVAC contract) |
| 8 | Insurance | `InsuranceWorkspace` | Insurance contacts, renewal tracking, coverage gap analysis |
| 9 | Voice Intake | `VoiceIntakeWorkspace` | ElevenLabs voice agent intake log — maintenance, leasing, alerts |
| 10 | Property Vault | `PropertyVaultWorkspace` | Deed, plat, recorded agreements, identifiers, property-level docs |
| 11 | Appraisal | `AppraisalPanel` | Historical appraisal records and valuation tracking |
| 12 | Settings | `PropertySettings` + `AllowlistSettings` + `CacheSettings` | Property metadata, access control, cache management |
| 13 | Concierge | `PropertyConcierge` | AI chat grounded in full property context (LLM-powered) |
| 14 | Lease Timeline | `LeaseTimeline` | Visual Gantt-style lease term timeline |
| 15 | Communications | `CommunicationsLog` | Email/letter/call/text/notice log per unit |
| 16 | Work Orders | `WorkOrderTracker` | Full work order lifecycle (open → assigned → in_progress → complete) |
| 17 | Vendors | `VendorDirectory` | Vendor CRUD with trade, rating, contact info |
| 18 | Rent Collection | `RentCollectionGrid` | Monthly rent collection grid with status tracking |
| 19 | Financials | `FinancialDashboard` | Revenue analytics, collection trends, delinquency tracking |
| 20 | Accounts Receivable | `ARDashboard` + `InvoicesPanel` | Double-entry ledger, invoices, payments, aging buckets, late-fee history |
| 21 | Escalations | `EscalationDashboard` | Rent escalation engine — schedule, notice status, compliance |
| 22 | Renewals | `RenewalPipeline` | Renewal pipeline with notice window tracking |
| 23 | Tenant Health | `TenantHealthDashboard` | Composite health scoring (payment + compliance + comms + lease + maintenance) |
| 24 | Deal Pipeline | `DealPipelineBoard` | CRM-style Kanban board for leasing prospects |
| 25 | NOI / Valuation | `NoiDashboard` | NOI calculation, cap rate sensitivity table, DSCR |
| 26 | Board Report | `BoardReport` | Auto-generated investor/board report with all KPIs |
| 27 | Predictive Maintenance | `PredictiveMaintenanceDashboard` | HVAC failure probability scoring (age, WO frequency, contract status) |
| 28 | Calculators | `CalculatorsWorkspace` | 7 operator decision calculators (NER, Gross-Up, Eviction, OCR, CapEx, KPI, Insurance) |
| 29 | CAM Reconciliation | `CAMWorkspace` | Expense tracking, annual CAM reconciliation, pro-rata tenant shares |
| 30 | NL Query | `NLQueryPanel` | Natural language → SQL query interface |

### 2.2 External Portals

| Portal | Route | Auth | Purpose |
|--------|-------|------|---------|
| Tenant Portal | `/tenant` | Token-based (per-unit) | Lease summary, payment history, documents, COI upload, maintenance requests |
| Vendor Upload | `/vendor-upload` | Token-based (per-WO) | Photo/video/document upload for work order evidence |

### 2.3 Scheduled Automation (5 Heartbeat Jobs)

| Job | Schedule | Handler | Function |
|-----|----------|---------|----------|
| `daily-ops-alert` | 7 AM CT daily | `scheduledOpsAlert.ts` | Expiring leases, overdue rent, expired COIs, aging WOs, pending escalations |
| `renewal-digest` | 8 AM CT daily | `scheduledRenewalDigest.ts` | Renewal notice window proximity alerts (30/60/90 day tiers) |
| `late-fee` | 9 AM CT daily | `scheduledLateFee.ts` | Scan overdue invoices, assess late fees per unit policy |
| `invoice-gen` | 1st of month 6 AM CT | `scheduledInvoiceGen.ts` | Auto-generate monthly invoices for all active units |
| `audit-purge-90d` | 10 PM CT nightly | `scheduledCleanup.ts` | Purge page_view audit events older than 90 days |

---

## Section 03 — Roles & Access Control

### 3.1 Role Architecture

| Role | Auth Method | Access Level | Implementation |
|------|-------------|-------------|----------------|
| Owner (Adam) | Manus OAuth | Full read/write, all workspaces | `ownerOnlyProcedure` — checks `ctx.user.openId === OWNER_OPEN_ID` |
| Allowlisted User | Manus OAuth + allowlist entry | Read-only (most), limited write | `ownerOrAllowlistProcedure` — checks owner OR `access_allowlist` table |
| Tenant | Token-based (no OAuth) | Own unit data only | `publicProcedure` + `validateToken()` — scoped to single unit |
| Vendor | Token-based (no OAuth) | Upload to specific WO only | `publicProcedure` + token validation — scoped to single work order |
| Heartbeat (Cron) | SDK auth + `isCron` flag | Scheduled handler execution | `sdk.authenticateRequest()` — verifies `CRON_OPEN_ID_PREFIX` |

### 3.2 Access Control Tables

- `access_allowlist` — email, name, role, grantedBy, grantedAt
- `tenant_access_tokens` — unitId, token, tenantName, email, expiresAt (created via runtime SQL)
- `vendor_upload_tokens` — workOrderId, token, vendorName, active, expiresAt
- `audit_log` — userId, action, resource, resourceId, metadata, ip, userAgent, createdAt

### 3.3 Security Features

- Idle timeout modal (configurable, auto-logout)
- Audit logging on all write operations
- HMAC webhook verification (ElevenLabs voice agents)
- Token expiration for tenant/vendor portals
- Owner-only write procedures for destructive operations

---

## Section 04 — Workflows (End-to-End)

### 4.1 Voice Agent → Work Order Pipeline

```
ElevenLabs Voice Agent (phone call)
  → POST /otb/maintenance-ticket (HMAC-signed)
    → voiceWebhooks.ts: validate secret, parse payload
      → Insert voice_intake row (kind: maintenance_ticket)
        → notifyOwner() with urgency flag
          → Owner reviews in Voice Intake workspace
            → Convert to Work Order (prefilled)
              → Assign vendor → Track → Complete
```

### 4.2 Voice Agent → Leasing Pipeline

```
ElevenLabs Voice Agent (leasing inquiry)
  → POST /otb/leasing-lead | /otb/hot-lead | /otb/loi-intake
    → voiceWebhooks.ts: validate, parse
      → Insert voice_intake row (kind: leasing_lead/hot_lead/loi_intake)
        → Auto-fan to waitlist_prospects (with priority/status)
          → Link voice_intake.linkedProspectId
            → notifyOwner() for hot leads
              → Owner reviews in Voice Intake workspace
                → Convert to Deal Pipeline entry
```

### 4.3 Lease Abstraction Pipeline

```
Upload lease PDF → documents table
  → Trigger "Abstract Lease" action
    → leaseExtractor.ts: send PDF to LLM with structured schema
      → Extract 25+ fields (dates, rent, escalations, options, responsibilities)
        → Save to lease_abstractions table
          → Auto-create rent_escalations rows
            → Sync key fields back to units table (rent, term dates, PSFs)
```

### 4.4 Document Expiration Enforcement

```
Daily ops-alert scans documents.expiresAt < now
  → Flag expired COIs/HVAC contracts/certificates
    → Owner clicks "Generate Demand Letter"
      → LLM generates formal demand (Abdalla Enterprises letterhead, 10-day deadline)
        → Log in communications table
          → Create follow-up work order (phone task)
            → notifyOwner() with summary
```

### 4.5 Monthly Invoice Generation (Automated)

```
Heartbeat fires 1st of month at 6 AM CT
  → scheduledInvoiceGen.ts
    → Query all active units with monthlyRent > 0
      → For each unit: check if invoice already exists for this period (idempotent)
        → Create invoice (status: sent, dueDate: 1st of month)
          → Create line items (base rent, CAM, tax, insurance from unit PSF fields)
            → Create ledger_entries (type: charge, one per line item)
              → Update invoice totals
```

### 4.6 Daily Late Fee Assessment (Automated)

```
Heartbeat fires daily at 9 AM CT
  → scheduledLateFee.ts
    → Query invoices where status != paid AND dueDate < today
      → For each overdue invoice:
        → Check unit's lateFeeEnabled flag
          → Calculate grace: dueDate + lateFeeGraceDays
            → If past grace AND no existing assessment for this invoice:
              → Calculate fee: lateFeeFlat + (daysLate * lateFeePerDay), cap at 25% of invoice
                → Insert late_fee_assessments row
                  → Add fee to invoice (update lateFees, totalDue, balance)
                    → Create ledger_entry (type: charge, chargeCode: late_fee)
```

### 4.7 CAM Reconciliation

```
Owner enters expenses throughout year (CAM workspace)
  → At year-end: trigger "Run Reconciliation"
    → cam.ts: sum all CAM-flagged expenses for the year
      → Calculate gross-up factor (if occupancy < 100%)
        → For each occupied unit: compute pro-rata share (unit GLA / total GLA)
          → Compare actual owed vs. estimated collected (CAM PSF × SF × 12)
            → Generate over/under for each tenant
              → Save cam_reconciliations + cam_tenant_shares
```

### 4.8 SOT (Source of Truth) Import

```
Upload OTB Master Template spreadsheet (Sheet2)
  → sotImport.ts: parse XLSX with column mapping
    → Phase 1 (dryRun=true): generate per-unit diff (what would change)
      → Owner reviews diff in UI
        → Phase 2 (dryRun=false): apply changes to units table
          → Update all financial fields, lease terms, tenant info
```

---

## Section 05 — Data Model

### 5.1 Schema Overview

**46 tables** across 6 domains, defined in `drizzle/schema.ts` (1,253 lines).

### 5.2 Domain Map

| Domain | Tables | Description |
|--------|--------|-------------|
| Property & Units | `properties`, `units`, `user_properties`, `lots`, `parking_stalls`, `signs`, `pylon_slots`, `pois`, `poi_categories`, `floor_plans`, `views` | Physical property structure |
| Leasing & Compliance | `leaseAbstractions`, `rentEscalations`, `deals`, `waitlist_prospects`, `compliance_events`, `licenses`, `lease_units` | Lease intelligence |
| Financial | `ledger_entries`, `invoices`, `invoice_line_items`, `payments`, `rent_payments`, `expenses`, `cam_reconciliations`, `cam_tenant_shares`, `late_fee_runs`, `late_fee_assessments`, `appraisals` | Double-entry accounting |
| Operations | `work_orders`, `work_order_media`, `vendors`, `vendor_upload_tokens`, `hvac_units`, `communications`, `voice_intake` | Day-to-day operations |
| Documents & Records | `documents`, `property_documents`, `property_register_categories`, `property_identifiers`, `parcels`, `recorded_agreements`, `insurance_contacts` | Document management |
| System | `users`, `access_allowlist`, `audit_log`, `tenant_access_tokens` | Auth & audit |

### 5.3 Key Table Schemas

**units** (core entity — 40+ columns):
- Identity: id, propertyId, unitNumber, dba, legalEntity, contactName, contactEmail, contactPhone
- Physical: squareFeet, zoningCategory, businessDescription
- Financial: monthlyRent, baseRentPsf, camPsf, taxPsf, insPsf, totalRentPsf, monthlyBase, monthlyAdditional, securityDeposit
- Lease: leaseTermStart, leaseTermEnd, status (active/vacant/anchor/owner/expired)
- Late Fee Policy: lateFeeEnabled, lateFeeGraceDays, lateFeeFlat, lateFeePerDay
- Allocation: allocationPct

**ledger_entries** (double-entry):
- id, propertyId, unitId, type (charge/payment/credit/adjustment/void)
- chargeCode (base_rent/cam/tax/insurance/late_fee/other)
- amount (decimal 12,2), runningBalance, description
- periodMonth, periodYear, dueDate
- invoiceId, paymentId, isVoided, createdAt

**invoices**:
- id, propertyId, unitId, invoiceNumber (auto-generated)
- periodMonth, periodYear, dueDate
- subtotal, lateFees, totalDue, totalPaid, balance
- status (draft/sent/partial/paid/overdue/void)

**voice_intake**:
- id, propertyId, agent (pm/leasing), kind (13 types)
- contactName, contactPhone, contactEmail, unitNumber
- summary, urgency (low/normal/high), status (new/reviewed/actioned/dismissed)
- payload (JSON — full webhook body), linkedProspectId, linkedWorkOrderId

### 5.4 Enum Values

| Enum | Values |
|------|--------|
| Unit Status | active, vacant, anchor, owner, expired |
| WO Status | open, assigned, in_progress, complete, cancelled |
| WO Priority | low, normal, high, urgent |
| Payment Status (legacy) | paid, unpaid, late, partial |
| Invoice Status | draft, sent, partial, paid, overdue, void |
| Ledger Type | charge, payment, credit, adjustment, void |
| Charge Code | base_rent, cam, tax, insurance, late_fee, other |
| Payment Method | check, ach, wire, cash, credit_card, other |
| Communication Type | email, letter, call, text, notice |
| Voice Kind | maintenance_ticket, management_alert, document_request, fitout_intake, estoppel_request, call_summary, leasing_lead, leasing_package, tour_request, loi_intake, hot_lead, leasing_summary |
| Deal Stage | lead, contacted, toured, proposal, negotiation, loi, lease_draft, executed, dead |
| Escalation Type | fixed, percentage, cpi, market, other |
| Notice Status | pending, sent, acknowledged |
| Document Category | lease, coi, license, log, hvac_contract, certificate_of_occupancy, contact_sheet |

---

## Section 06 — Business Rules Engine

### 6.1 Financial Rules

| Rule | Implementation | Location |
|------|---------------|----------|
| **Late Fee Calculation** | `fee = lateFeeFlat + (daysLate × lateFeePerDay)`, capped at 25% of invoice total | `scheduledLateFee.ts` |
| **Grace Period** | Per-unit configurable (default: 5 days). Fee only assessed after `dueDate + graceDays` | `units.lateFeeGraceDays` |
| **Idempotent Assessment** | One late fee per invoice per run; checks existing `late_fee_assessments` before inserting | `scheduledLateFee.ts` |
| **Invoice Auto-Generation** | 1st of month; creates invoice + line items (base rent, CAM, tax, insurance) from unit PSF fields | `scheduledInvoiceGen.ts` |
| **Invoice Numbering** | `INV-{YYYYMM}-{unitNumber}` — deterministic, prevents duplicates | `scheduledInvoiceGen.ts` |
| **Payment Application** | Payment reduces invoice balance; when balance ≤ 0, status → `paid` | `financial.ts` |
| **NSF Handling** | Reverses payment, creates void ledger entry, resets invoice status | `financial.ts` |
| **NOI Calculation** | `GPR - Vacancy Loss - Mgmt Fee (6%) - Annualized Maintenance` | `boardReport.ts` |
| **Cap Rate Valuation** | `NOI / Cap Rate` with sensitivity table (5%–9% in 0.5% steps) | `noivaluation.ts` |
| **CAM Gross-Up** | `Total Expenses × (Total GLA / Occupied GLA)` when occupancy < 100% | `cam.ts` |
| **CAM Pro-Rata** | `Unit GLA / Total GLA × Gross-Up Expenses` | `cam.ts` |
| **CAM Over/Under** | `Actual Owed - Estimated Collected` (estimated = CAM PSF × SF × 12) | `cam.ts` |

### 6.2 Tenant Health Scoring Algorithm

Composite score (0–100) with 5 weighted dimensions:

| Dimension | Max Points | Scoring Logic |
|-----------|-----------|---------------|
| Payment | 30 | On-time rate × 30; -5 if >2 late; -10 if any unpaid |
| Compliance | 25 | Baseline 20; -10 no COI; -8 expired COI; -5 no lease on file |
| Communication | 20 | ≥2 recent (90d) = 20; 1 = 15; 0 = 10 |
| Lease Term | 15 | >1yr = 15; >180d = 12; >60d = 8; >0 = 4; expired = 0 |
| Maintenance | 10 | 0 WOs (6mo) = 10; ≤2 = 8; ≤5 = 5; >5 = 2 |

**Flags:** ≥75 = healthy, ≥55 = watch, ≥35 = at_risk, <35 = critical

### 6.3 Predictive Maintenance Scoring

HVAC failure probability (0–100%) based on:
- Age factor: `min(age / 20, 1.0) × 40`
- WO frequency: `min(recentWOs / 5, 1.0) × 30`
- Contract status: no active PM contract = +20; active = +5
- Season: summer months (Jun–Sep) = +10

**Threshold:** Score ≥ 70 = "High Risk" flag

### 6.4 Renewal Notice Window Logic

```
For each lease_abstraction with renewalOptions:
  Parse notice requirement (regex: /(\d+)\s*(days?|months?)\s*(prior|notice|before|written)/i)
  Calculate noticeDeadline = expirationDate - noticeDays
  If 0 < daysUntilDeadline ≤ 30 → CRITICAL (🔴)
  If 30 < daysUntilDeadline ≤ 60 → WARNING (🟡)
  If 60 < daysUntilDeadline ≤ 90 → UPCOMING (🟢)
```

### 6.5 Daily Ops Alert Triggers

| Trigger | Condition | Urgency |
|---------|-----------|---------|
| Lease expiring | `leaseTermEnd` within 90 days | High if ≤30d |
| Rent overdue | `rent_payments.status` = unpaid AND past due | High |
| COI expired | `documents.category = 'insurance'` AND `expiresAt < now` | Medium |
| Work order aging | `work_orders.status` in (open, assigned) AND age > 14 days | Medium |
| Escalation pending | `rent_escalations.noticeStatus = 'pending'` AND effectiveDate within 60 days | High |

### 6.6 Operator Calculator Business Rules

| Calculator | Core Formula | Louisiana-Specific |
|------------|-------------|-------------------|
| **NER** | `(Total Rent - Concessions) / Term Months` with PV discount | No |
| **Gross-Up** | `Expenses × (Total GLA / Occupied GLA)` | No |
| **Eviction** | Timeline + cost estimate by process type | Yes — CCP 4701-4733 (5-day notice, Rule to Vacate, Unlawful Detainer) |
| **OCR** | `Total Occupancy Cost / Gross Sales` | No |
| **CapEx** | Component-level remaining life + replacement cost | No |
| **KPI** | Breakeven occupancy, DSCR, expense ratio, revenue/SF | No |
| **Insurance** | Coverage vs. replacement cost gap analysis | No |

---

## Section 07 — UX Inventory

### 7.1 Navigation Architecture

- **Primary:** Horizontal workspace nav bar (scrollable, 30 tabs)
- **Secondary:** Command palette (⌘K) with 40+ commands (workspace nav, heat maps, panel toggles, placement tools)
- **Tertiary:** Right-click context menus on site plan elements
- **Keyboard shortcuts:** ⌘K (command palette), Escape (close panels), workspace-specific shortcuts

### 7.2 Interaction Patterns

| Pattern | Usage | Implementation |
|---------|-------|----------------|
| Command Palette | Global navigation + actions | `CommandPalette.tsx` — fuzzy search, categorized results |
| Heat Maps | Visual data overlay on site plan | 4 modes: compliance, expiration, rent/SF, status |
| Side Panels | Contextual detail views | Tenants, Compliance, Property metadata |
| Dialogs | Data entry / confirmation | Record Payment, Generate Invoice, Add Expense, etc. |
| Kanban Board | Deal pipeline stages | Drag-and-drop columns (lead → executed/dead) |
| Gantt Timeline | Lease term visualization | Horizontal bars with expiration markers |
| Grid View | Rent collection tracking | Month × Unit matrix with status cells |
| Table + Sort/Filter | Most data views | Sortable columns, status filters |
| Toast Notifications | Action feedback | Success/error/info via Sonner |
| Skeleton Loading | Data fetch states | Shimmer placeholders during tRPC queries |

### 7.3 Component Library

64 custom components + 54 shadcn/ui primitives. Key custom components:

| Component | Lines | Purpose |
|-----------|-------|---------|
| `OtbApp.tsx` | 1,200+ | Main app shell, workspace orchestration, site plan canvas |
| `ARDashboard.tsx` | 450 | Ledger, aging, payment recording |
| `InvoicesPanel.tsx` | 380 | Invoice list, detail, late-fee history |
| `CalculatorsWorkspace.tsx` | 600 | 7-tab calculator forms |
| `CAMWorkspace.tsx` | 500 | Expense CRUD, reconciliation runner |
| `CommandPalette.tsx` | 200 | Fuzzy-search command launcher |
| `PropertyConcierge.tsx` | 300 | AI chat interface |
| `WorkOrderTracker.tsx` | 350 | WO lifecycle management |

### 7.4 Responsive Design

- Mobile-first Tailwind utilities
- Workspace nav: horizontal scroll with visible scrollbar on small screens
- Site plan: pinch-zoom and pan on touch devices
- Dialogs: full-screen on mobile, centered modal on desktop
- Tables: horizontal scroll with sticky first column

---

## Section 08 — Architecture

### 8.1 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (React 19)                         │
│  Vite + Tailwind 4 + shadcn/ui + tRPC React Query hooks         │
│  Wouter routing │ ThemeProvider │ AuthContext                    │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTP (tRPC JSON-RPC over /api/trpc)
┌──────────────────────────────▼──────────────────────────────────┐
│                        SERVER (Express 4)                        │
│  tRPC 11 adapter │ Superjson │ Context (auth + property)        │
│  26 routers │ 5 scheduled handlers │ voice webhooks             │
└──────┬───────────┬───────────┬───────────┬──────────────────────┘
       │           │           │           │
  ┌────▼────┐ ┌───▼───┐ ┌────▼────┐ ┌────▼────┐
  │  TiDB   │ │  S3   │ │ LLM API │ │SendGrid │
  │ (MySQL) │ │Storage│ │(Forge)  │ │  Email  │
  └─────────┘ └───────┘ └─────────┘ └─────────┘
```

### 8.2 Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend Framework | React | 19 |
| Build Tool | Vite | 6.x |
| CSS Framework | Tailwind CSS | 4.x |
| Component Library | shadcn/ui (Radix primitives) | Latest |
| Routing | Wouter | 3.7.1 |
| State Management | TanStack Query (via tRPC) | 5.x |
| API Layer | tRPC | 11.x |
| Serialization | Superjson | 2.x |
| Server Framework | Express | 4.x |
| ORM | Drizzle | 0.38.x |
| Database | TiDB (MySQL-compatible) | Cloud |
| File Storage | S3 (Manus-managed) | — |
| Email | SendGrid | API v3 |
| Voice | ElevenLabs Conversational AI | Webhooks |
| LLM | Manus Forge (multi-model) | API |
| Auth | Manus OAuth 2.0 | — |
| Deployment | Manus Cloud (Autoscale/Serverless) | Cloud Run |
| Testing | Vitest | 3.x |
| Validation | Zod | 3.x |
| Charts | Recharts | 2.x |
| Markdown | Streamdown | — |

### 8.3 Request Flow

```
Browser → Vite Dev Proxy (dev) / Express static (prod)
  → /api/trpc/* → tRPC adapter
    → Context builder (session cookie → user lookup)
      → Procedure (public | protected | ownerOnly | ownerOrAllowlist)
        → Input validation (Zod)
          → Business logic (db helpers, LLM calls, storage)
            → Response (Superjson serialized)
```

### 8.4 Database Connection

- **Driver:** mysql2 (via Drizzle)
- **Connection:** `DATABASE_URL` env var (TiDB Cloud, SSL required)
- **Pool:** Lazy-initialized singleton (`getDb()` pattern)
- **Migrations:** Drizzle Kit generate → manual SQL apply via `webdev_execute_sql`

---

## Section 09 — Integrations

### 9.1 Active Integrations

| Service | Purpose | Auth | Direction |
|---------|---------|------|-----------|
| **Manus OAuth** | User authentication | OAuth 2.0 (PKCE) | Inbound |
| **Manus Forge LLM** | AI chat, lease extraction, demand letters, NL query, board report narrative | Bearer token | Outbound |
| **Manus S3** | File storage (documents, media, exports) | Pre-configured SDK | Outbound |
| **SendGrid** | Email delivery (notifications, demand letters) | API key | Outbound |
| **ElevenLabs** | Voice agent webhooks (maintenance, leasing, alerts) | HMAC secret | Inbound |
| **Manus Heartbeat** | Scheduled job execution | SDK auth (cron identity) | Inbound |
| **Manus Notification** | Owner push notifications | Bearer token | Outbound |

### 9.2 Integration Details

**ElevenLabs Voice Agents:**
- 2 agents configured: `pm` (property management) and `leasing`
- 6 webhook endpoints: `/otb/maintenance-ticket`, `/otb/management-alert`, `/otb/document-request`, `/otb/leasing-lead`, `/otb/hot-lead`, `/otb/loi-intake`
- HMAC-SHA256 verification on all inbound payloads
- Structured payload extraction (contact info, urgency, summary, unit reference)

**Manus Forge LLM (Multi-model):**
- Used in: Concierge (chat), Lease Extraction (structured output), Demand Letter Generation, NL→SQL Query, Board Report Narrative
- Supports: GPT-5, Claude Sonnet 4, Gemini — model selection per use case
- Structured output via `response_format.json_schema` for lease extraction

**SendGrid:**
- Demand letter delivery
- Escalation notices
- Owner notifications (fallback)

### 9.3 Potential Integrations (Not Yet Active)

| Service | Purpose | Status |
|---------|---------|--------|
| Stripe | Tenant online payments | Not configured |
| DoorLoop | Legacy PM sync | Manual (SOT import replaces) |
| QuickBooks | Accounting export | Not configured |
| Google Maps | Property visualization | Available via proxy (not used) |

---

## Section 10 — AI Agents & Prompts

### 10.1 Agent Inventory

| Agent | Type | Model | Context Window | Purpose |
|-------|------|-------|---------------|---------|
| **Property Concierge** | Chat (streaming) | Forge default | Full property context | Answer operator questions grounded in live data |
| **Lease Extractor** | Structured output | Forge default | PDF content + schema | Extract 25+ fields from lease PDFs |
| **Demand Letter Generator** | Single-shot | Forge default | Unit + violation context | Generate formal demand letters |
| **NL Query Engine** | Single-shot | Forge default | Schema description | Convert natural language → SQL |
| **Board Report Narrator** | Single-shot | Forge default | KPI data payload | Generate executive summary paragraph |
| **PM Voice Agent** | Conversational (ElevenLabs) | ElevenLabs | Phone call | Intake maintenance tickets, alerts |
| **Leasing Voice Agent** | Conversational (ElevenLabs) | ElevenLabs | Phone call | Intake leasing inquiries, tours, LOIs |

### 10.2 System Prompts (Extracted)

**Property Concierge:**
```
You are the Property Concierge for On The Boulevard Shopping Center.
You have access to the full property context including all units, tenants, 
lease terms, financial data, work orders, and compliance status.
Answer questions about the property operations concisely and accurately.
When discussing financial data, always cite the source (rent roll, ledger, etc.).
If you don't have enough information to answer, say so clearly.
Format responses with markdown for readability.
```

**Lease Extractor:**
```
You are a commercial real estate lease abstraction specialist. Extract the 
following fields from the provided lease document. Be precise:
- For dates, use YYYY-MM-DD format
- For monetary values, use numbers only (no $ signs or commas)
- For escalations, extract EVERY rent increase/step-up mentioned in the lease
- For renewal options, extract ALL options with their terms
- Be precise about responsibility allocations (landlord vs tenant vs shared)
- Quote exact language for exclusives, co-tenancy, and guaranty clauses
- Confidence should be "high" if the lease is clear and complete, "medium" if 
  some terms are ambiguous, "low" if the document is partial or unclear
```

**Demand Letter Generator:**
```
Generate a formal demand letter on behalf of Abdalla Enterprises, LLC (property 
manager for Belle Realty of Lafayette, LLC, owner of On The Boulevard Shopping 
Center). The letter should:
- Be addressed to the tenant at their unit
- Reference the specific violation or expired document
- Cite the relevant lease clause if available
- Give a 10-business-day deadline to cure
- State consequences of non-compliance
- Use professional but firm tone
- Include proper letterhead formatting
```

**NL Query Engine:**
```
You are a SQL query generator for a commercial property management database.
Convert the user's natural language question into a valid MySQL query.
Available tables: units, rent_payments, work_orders, documents, vendors, 
communications, lease_abstractions, rent_escalations.
Return ONLY the SQL query, no explanation.
Use proper JOINs and WHERE clauses. Always include propertyId filter.
```

### 10.3 Structured Output Schemas

**Lease Extraction Schema** (25 required fields):
- commencementDate, expirationDate, originalTerm
- baseRent, rentPsf
- escalations[] (effectiveDate, newMonthlyRent, increaseType, increaseValue)
- renewalOptions[] (term, noticeRequired, rentBasis)
- purchaseOption, earlyTermination, securityDeposit
- camResponsibility, taxResponsibility, insuranceResponsibility, hvacResponsibility
- permittedUse, exclusiveUse, coTenancy
- personalGuaranty, guarantorName
- insuranceMinimums (generalLiability, propertyDamage, umbrella, workersComp)
- signageRights, keyClausesSummary, confidence

---

## Section 11 — Source Code Map

### 11.1 Directory Structure

```
otb-ops/                          (49,256 lines total)
├── client/                       (~18,000 lines)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── OtbApp.tsx        (1,200+ lines — main app shell)
│   │   │   ├── Home.tsx          (login redirect)
│   │   │   ├── TenantPortal.tsx  (tenant self-service)
│   │   │   ├── VendorUpload.tsx  (vendor media upload)
│   │   │   └── NotFound.tsx
│   │   ├── components/           (64 custom components)
│   │   │   ├── ARDashboard.tsx
│   │   │   ├── InvoicesPanel.tsx
│   │   │   ├── CalculatorsWorkspace.tsx
│   │   │   ├── CAMWorkspace.tsx
│   │   │   ├── CommandPalette.tsx
│   │   │   ├── PropertyConcierge.tsx
│   │   │   ├── WorkOrderTracker.tsx
│   │   │   ├── DashboardLayout.tsx
│   │   │   ├── AIChatBox.tsx
│   │   │   ├── Map.tsx
│   │   │   └── ui/              (54 shadcn/ui primitives)
│   │   ├── hooks/               (useMobile, useComposition, usePersistFn)
│   │   ├── contexts/            (ThemeContext)
│   │   ├── lib/                 (trpc.ts, utils.ts)
│   │   ├── App.tsx              (Router: /, /tenant, /vendor-upload, /404)
│   │   ├── main.tsx             (Providers)
│   │   └── index.css            (Tailwind theme, custom scrollbars)
│   └── index.html
├── server/                       (~12,000 lines)
│   ├── _core/                   (framework — DO NOT EDIT)
│   │   ├── index.ts             (Express app, Vite bridge, route mounting)
│   │   ├── trpc.ts              (procedure builders)
│   │   ├── context.ts           (auth context)
│   │   ├── oauth.ts             (Manus OAuth flow)
│   │   ├── sdk.ts               (Manus SDK client)
│   │   ├── env.ts               (environment variables)
│   │   ├── llm.ts               (LLM invocation helper)
│   │   ├── notification.ts      (notifyOwner helper)
│   │   ├── voiceTranscription.ts
│   │   ├── imageGeneration.ts
│   │   ├── map.ts               (Google Maps proxy)
│   │   ├── heartbeat.ts         (scheduled job SDK)
│   │   ├── storageProxy.ts      (S3 signed URL proxy)
│   │   ├── voiceWebhooks.ts     (ElevenLabs webhook handler)
│   │   └── systemRouter.ts      (system tRPC procedures)
│   ├── routers/                 (26 feature routers)
│   │   ├── financial.ts         (ledger, invoices, payments, aging)
│   │   ├── calculators.ts       (7 calculator wrappers)
│   │   ├── cam.ts               (CAM reconciliation)
│   │   ├── reports.ts           (P&L, cash flow, aging reports)
│   │   ├── concierge.ts         (AI chat)
│   │   ├── leaseAbstraction.ts  (AI lease extraction)
│   │   ├── nlQuery.ts           (NL → SQL)
│   │   ├── boardReport.ts       (investor report generator)
│   │   ├── noivaluation.ts      (NOI + cap rate)
│   │   ├── predictive.ts        (HVAC failure scoring)
│   │   ├── tenantHealth.ts      (composite health scores)
│   │   ├── workOrders.ts        (WO lifecycle)
│   │   ├── workOrderMedia.ts    (media upload + vendor tokens)
│   │   ├── vendors.ts           (vendor CRUD)
│   │   ├── communications.ts    (comms log)
│   │   ├── deals.ts             (deal pipeline CRM)
│   │   ├── escalations.ts       (rent escalation engine)
│   │   ├── renewals.ts          (renewal pipeline)
│   │   ├── documents.ts         (document management)
│   │   ├── insurance.ts         (insurance tracking)
│   │   ├── sotImport.ts         (SOT spreadsheet import)
│   │   ├── docExpiration.ts     (demand letter generation)
│   │   ├── tenantPortal.ts      (tenant self-service API)
│   │   ├── allowlist.ts         (access control)
│   │   ├── auditLog.ts          (audit trail)
│   │   └── hvac.ts              (HVAC unit tracking)
│   ├── routers.ts               (router aggregation)
│   ├── db.ts                    (Drizzle connection + helpers)
│   ├── storage.ts               (S3 helpers)
│   ├── resolvePropertyId.ts     (multi-property resolver)
│   ├── leaseExtractor.ts        (LLM extraction logic)
│   ├── scheduledOpsAlert.ts     (daily ops alert)
│   ├── scheduledRenewalDigest.ts (renewal notice windows)
│   ├── scheduledInvoiceGen.ts   (monthly invoice generation)
│   ├── scheduledLateFee.ts      (daily late fee batch)
│   ├── scheduledCleanup.ts      (audit purge)
│   └── *.test.ts                (27 test files)
├── shared/                      (~2,500 lines)
│   ├── calculators/             (7 pure-function modules + index)
│   │   ├── ner.ts, grossUp.ts, eviction.ts, ocr.ts
│   │   ├── capex.ts, kpi.ts, insurance.ts
│   │   └── index.ts
│   ├── seedData.ts              (property config, compliance fields, views)
│   ├── const.ts                 (shared constants)
│   └── types.ts                 (type re-exports)
├── drizzle/                     (~1,250 lines)
│   ├── schema.ts               (46 tables, 1,253 lines)
│   ├── relations.ts
│   └── migrations/             (24 migration files)
└── references/
    └── periodic-updates.md
```

### 11.2 Lines of Code by Module

| Module | Lines | % of Total |
|--------|-------|-----------|
| Client (pages + components) | ~18,000 | 37% |
| Server (routers + handlers) | ~12,000 | 24% |
| Server (_core framework) | ~4,500 | 9% |
| Tests | ~3,800 | 8% |
| Schema + Migrations | ~4,200 | 9% |
| Shared (calculators + seed) | ~2,500 | 5% |
| UI primitives (shadcn) | ~4,200 | 9% |

---

## Section 12 — Strengths & Weaknesses

### 12.1 Strengths

| # | Strength | Evidence |
|---|----------|----------|
| 1 | **Single-pane-of-glass** | 30 workspaces, one URL, one auth — eliminates tool-switching |
| 2 | **AI-grounded decisions** | Concierge, lease extraction, NL query, demand letters — all grounded in live property data |
| 3 | **Voice-first intake** | ElevenLabs agents handle maintenance + leasing calls 24/7, structured data flows in automatically |
| 4 | **Automated compliance enforcement** | Daily alerts, document expiration tracking, demand letter generation |
| 5 | **Double-entry financial engine** | Proper ledger, not just payment tracking — supports invoicing, late fees, CAM, P&L |
| 6 | **Pure-function calculators** | 7 decision tools with no side effects — testable, portable, reusable |
| 7 | **Proactive alerting** | 5 heartbeat jobs push critical info without operator polling |
| 8 | **Type-safe end-to-end** | tRPC + Drizzle + Zod — no runtime type mismatches between client and server |
| 9 | **Self-service portals** | Tenant COI upload + maintenance requests; vendor photo/video upload — reduces operator burden |
| 10 | **Command palette UX** | Power-user navigation (⌘K) with 40+ commands — sub-second workspace switching |

### 12.2 Weaknesses

| # | Weakness | Impact | Mitigation Path |
|---|----------|--------|----------------|
| 1 | **Single-property architecture** | Cannot manage multiple properties without code changes | Add property selector + multi-tenant data isolation |
| 2 | **No tenant online payments** | Rent collection still manual (check/ACH outside system) | Stripe integration (feature available) |
| 3 | **No accounting export** | P&L data stays in-system; no QuickBooks/Xero sync | Build CSV/QBO export or API integration |
| 4 | **No mobile app** | PWA works on mobile but no native push notifications | Add service worker + web push |
| 5 | **Monolithic OtbApp.tsx** | 1,200+ line file is hard to maintain | Split into workspace-specific route components |
| 6 | **No automated testing of UI** | Only server-side Vitest; no Playwright/Cypress | Add E2E test suite |
| 7 | **Serverless cold starts** | Autoscale deployment has cold-start latency | Upgrade to Reserved hosting if latency matters |
| 8 | **No real-time updates** | Polling-based (React Query refetch); no WebSocket/SSE | Add tRPC subscriptions for live updates |
| 9 | **Limited audit trail** | Audit log exists but not surfaced in UI | Build audit log viewer workspace |
| 10 | **No backup/disaster recovery** | Database on TiDB Cloud (managed) but no app-level backup strategy | Implement scheduled DB dump to S3 |

### 12.3 Technical Debt

| Item | Severity | Effort to Fix |
|------|----------|--------------|
| Legacy `rent_payments` table coexists with new `ledger_entries` | Medium | 4 hrs (backfill + deprecate) |
| Some routers exceed 300 lines | Low | 2 hrs (split into sub-files) |
| No input sanitization on NL Query (SQL injection via LLM) | High | 2 hrs (read-only connection + query allowlist) |
| Hardcoded 6% management fee in NOI calculation | Low | 0.5 hrs (move to property config) |
| No rate limiting on public endpoints (tenant/vendor portals) | Medium | 1 hr (add express-rate-limit) |

---

## Section 13 — Reusable Assets

### 13.1 Portable Modules (Zero Dependencies on OTB Ops)

| Asset | Location | Lines | Reuse Potential |
|-------|----------|-------|----------------|
| NER Calculator | `shared/calculators/ner.ts` | 85 | Any CRE leasing tool |
| Gross-Up Calculator | `shared/calculators/grossUp.ts` | 60 | Any CAM reconciliation system |
| Eviction Calculator | `shared/calculators/eviction.ts` | 120 | Any Louisiana property manager |
| OCR Calculator | `shared/calculators/ocr.ts` | 45 | Any retail lease analysis |
| CapEx Calculator | `shared/calculators/capex.ts` | 90 | Any property capital planning |
| KPI Calculator | `shared/calculators/kpi.ts` | 70 | Any property performance dashboard |
| Insurance Calculator | `shared/calculators/insurance.ts` | 80 | Any property risk assessment |
| Tenant Health Algorithm | `server/routers/tenantHealth.ts` | 100 | Any multi-tenant property |
| Predictive Maintenance Scoring | `server/routers/predictive.ts` | 80 | Any building with HVAC |
| Lease Extraction Schema | `server/leaseExtractor.ts` | 120 | Any CRE document processing |

### 13.2 Data Assets

| Asset | Format | Records | Value |
|-------|--------|---------|-------|
| Seed Data (unit config) | TypeScript object | 25 units | Complete property configuration |
| Compliance Field Definitions | TypeScript array | 11 fields | Reusable compliance framework |
| View Definitions | TypeScript array | 7 views | Operational view templates |
| Column Mapping (SOT Import) | TypeScript object | 20 fields | Spreadsheet-to-DB mapping |

### 13.3 Prompt Assets

| Prompt | Tokens (est.) | Reuse |
|--------|--------------|-------|
| Lease Extraction System Prompt | ~200 | Any CRE lease processing |
| Lease Extraction JSON Schema | ~800 | Any structured lease output |
| Demand Letter Template | ~150 | Any property management |
| Concierge System Prompt | ~100 | Any property AI assistant |
| NL Query System Prompt | ~80 | Any property database query |

---

## Section 14 — Target Architecture (Recommendations)

### 14.1 Immediate Improvements (< 1 week)

1. **SQL injection protection on NL Query** — Use read-only DB connection + query result limit
2. **Rate limiting** — Add `express-rate-limit` to public endpoints
3. **Backfill ledger** — Migrate existing `rent_payments` into `ledger_entries` for unified history
4. **Split OtbApp.tsx** — Extract workspace components into lazy-loaded route files

### 14.2 Medium-Term Enhancements (1–4 weeks)

1. **Stripe integration** — Enable tenant online payments (already scaffolded in template)
2. **Multi-property support** — Add property selector, scope all queries to selected property
3. **Real-time updates** — tRPC subscriptions or SSE for work order status, payment confirmations
4. **Mobile PWA** — Service worker + web push notifications for critical alerts
5. **Accounting export** — QuickBooks Online API or CSV export for P&L/ledger data

### 14.3 Long-Term Vision

1. **Multi-property portfolio dashboard** — Aggregate KPIs across properties
2. **Tenant portal expansion** — Online payments, lease signing, communication hub
3. **Vendor marketplace** — Bid requests, performance scoring, automated dispatch
4. **Predictive analytics** — ML-based vacancy forecasting, rent optimization
5. **Document intelligence** — Auto-extract from any uploaded document (not just leases)

---

## Section 15 — Transfer Readiness Assessment

### 15.1 Readiness Score

| Dimension | Score | Notes |
|-----------|-------|-------|
| Code Quality | 8/10 | TypeScript throughout, consistent patterns, good separation |
| Documentation | 7/10 | README exists, inline comments, but no API docs |
| Test Coverage | 6/10 | 241 tests (server-only); no UI tests |
| Deployment | 9/10 | One-click publish, managed infra, no manual ops |
| Data Portability | 7/10 | Standard MySQL schema, Drizzle migrations, but no export tooling |
| Security | 6/10 | Auth solid, but NL Query injection risk + no rate limiting |
| Scalability | 5/10 | Single-property, serverless cold starts, no caching layer |
| Maintainability | 7/10 | Clear file structure, but OtbApp.tsx monolith is a risk |

**Overall Readiness: 7/10** — Production-ready for single-property use. Needs security hardening and architectural refactoring for multi-property or team handoff.

### 15.2 Transfer Checklist

| # | Item | Status | Blocker? |
|---|------|--------|----------|
| 1 | Source code in version control | ✅ GitHub synced | No |
| 2 | Database schema documented | ✅ Drizzle schema + this document | No |
| 3 | Environment variables documented | ✅ env.ts + README | No |
| 4 | Deployment automated | ✅ Manus Publish button | No |
| 5 | Tests passing | ✅ 241/241 | No |
| 6 | Business rules documented | ✅ This document (Section 06) | No |
| 7 | AI prompts extracted | ✅ This document (Section 10) | No |
| 8 | Data migration path | ⚠️ SOT Import exists but no full export | Minor |
| 9 | Monitoring/alerting | ⚠️ Heartbeat jobs + owner notifications, no APM | Minor |
| 10 | Security audit | ⚠️ NL Query injection, no rate limiting | Yes |

### 15.3 Recommended Transfer Steps

1. **Fix security issues** (NL Query read-only, rate limiting) — 3 hours
2. **Run full test suite** and verify all 241 pass — 10 minutes
3. **Export database schema** as standalone SQL file — 30 minutes
4. **Document all env vars** with descriptions and example values — 1 hour
5. **Create seed script** for fresh environment setup — 2 hours
6. **Package prompts** as standalone JSON files — 1 hour
7. **Write API documentation** (tRPC procedure catalog) — 4 hours
8. **Create onboarding guide** for new developer — 2 hours

**Total estimated transfer preparation: ~14 hours**

---

## Appendix A — Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `DATABASE_URL` | TiDB/MySQL connection string | Yes |
| `JWT_SECRET` | Session cookie signing | Yes |
| `VITE_APP_ID` | Manus OAuth app ID | Yes |
| `OAUTH_SERVER_URL` | Manus OAuth backend | Yes |
| `VITE_OAUTH_PORTAL_URL` | Manus login portal | Yes |
| `OWNER_OPEN_ID` | Owner's Manus OpenID | Yes |
| `OWNER_NAME` | Owner display name | Yes |
| `BUILT_IN_FORGE_API_URL` | LLM/Storage/Notification API | Yes |
| `BUILT_IN_FORGE_API_KEY` | Server-side API bearer token | Yes |
| `VITE_FRONTEND_FORGE_API_KEY` | Client-side API token | Yes |
| `VITE_FRONTEND_FORGE_API_URL` | Client-side API URL | Yes |
| `SENDGRID_API_KEY` | Email delivery | Yes |
| `SENDGRID_FROM_EMAIL` | Sender email address | Yes |
| `SENDGRID_FROM_NAME` | Sender display name | Yes |
| `VOICE_WEBHOOK_SECRET` | ElevenLabs HMAC verification | Yes |
| `VITE_APP_TITLE` | Application title | No |
| `VITE_APP_LOGO` | Application logo URL | No |

---

## Appendix B — Test File Inventory

| File | Tests | Coverage Area |
|------|-------|--------------|
| `auth.logout.test.ts` | 3 | Authentication flow |
| `financial.test.ts` | 167 | Ledger, invoices, payments, aging |
| `calculators.test.ts` | 25 | All 7 calculator modules |
| `cam-reports.test.ts` | 20 | CAM reconciliation, P&L, cash flow |
| `sprint2.test.ts` | 19 | Invoice generation, late fees |
| (+ 22 other test files) | 7 | Various features |

**Total: 241 tests, 27 files, all passing**

---

*End of System Transfer Package*
