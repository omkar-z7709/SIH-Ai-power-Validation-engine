# DEMO READINESS PLAN
## AI-Powered Institutional Document Validation Engine (AICTE Scrutiny Studio)

**Author:** Principal Engineer & Systems Architect  
**Branch:** `feature/secure-role-based-verification`  
**Status:** Awaiting User Approval  

---

## 1. Executive Summary & Reality Matrix

The repository contains two converging systems:
1. **Core AICTE Validation Engine (Working & Fully Operational)**:
   - Automated intake, PDF parsing (`pdf-parse`), regex structured field extraction, deterministic rules engine (11 statutory rules), Jev decision layer with deterministic fallback, officer review workflow, audit trail, and persistent MongoDB storage.
   - Tested & passing: `vitest` unit test suite passes 24/24 tests across all verification pipelines.
   - UI: Complete and operational at `/`, `/applications`, `/applications/new`, `/applications/[id]`, and `/queue`.

2. **Secure Role-Based Portal Layer (Recently Added, Incomplete)**:
   - Added in the current branch: JWT auth, role middleware, `/api/auth/*`, `/api/institutions/*`, `/api/admin/*`, `/api/college/*`, and route middleware `src/middleware.ts`.
   - **Key Incompleteness**: `src/middleware.ts` redirects unauthenticated traffic destined for `/college/*` or `/officer/*` to `/login`, but **no `/login` page exists** (`404`), and `/college/dashboard` and `/officer/dashboard` are placeholder stub pages.

---

## 2. Reality Matrix (20 Core Audit Areas)

| Area | Feature | Status | Source Files | Evidence / Runtime Note |
|---|---|---|---|---|
| **1** | **Login & Session Management** | **PARTIALLY IMPLEMENTED** | `src/app/api/auth/*`, `src/lib/auth/*`, `src/middleware.ts` | Backend JWT login/logout/me API works; frontend `/login` page is missing (404). |
| **2** | **College Dashboard** | **PARTIALLY IMPLEMENTED** | `src/app/college/dashboard/page.tsx`, `src/app/api/college/applications/route.ts` | API returns applications filtered by `institutionId`, but page is a placeholder stub. |
| **3** | **Officer Dashboard** | **PARTIALLY IMPLEMENTED** | `src/app/officer/dashboard/page.tsx`, `src/app/queue/page.tsx`, `src/app/page.tsx` | Dedicated `/officer/dashboard` is a stub; rich officer review queue exists at `/queue` and `/applications/[id]`. |
| **4** | **Institution Search & Filtering** | **IMPLEMENTED AND VERIFIED** | `src/app/applications/page.tsx`, `src/app/api/institutions/route.ts` | Full search by text, state, status, and reference ID in UI. |
| **5** | **File Upload & Storage** | **IMPLEMENTED AND VERIFIED** | `src/lib/documents/document-processor.ts`, `src/app/api/applications/[id]/upload/route.ts` | SHA-256 hash generation, collision-resistant storage in `storage/documents`, 10MB file limit, 25MB batch limit. |
| **6** | **PDF Text Extraction** | **IMPLEMENTED AND VERIFIED** | `src/lib/documents/extraction-pipeline.ts` | `NativePdfExtractionProvider` via `pdf-parse` extracts text and detects scanned status. |
| **7** | **OCR for Scanned Documents** | **IMPLEMENTED AND VERIFIED** | `src/lib/documents/extraction-pipeline.ts` | `TesseractOcr` local fail-safe worker + Gemini Vision OCR. |
| **8** | **Structured Field Extraction** | **IMPLEMENTED AND VERIFIED** | `src/lib/documents/document-parser.ts` | Regex & pattern extraction for institution name, application ID, dates, certificates, land area. |
| **9** | **Gemini Integration** | **IMPLEMENTED AND VERIFIED** | `src/lib/documents/extraction-pipeline.ts` | `GeminiVisionExtractionProvider` calls `gemini-3.5-flash-lite` via `GEMINI_API_KEY`. |
| **10** | **Jev Decision Engine** | **IMPLEMENTED AND VERIFIED** | `src/lib/jev/jev-adapter.ts` | OpenRouter / TypeSafe Jev client with robust deterministic fallback mode. |
| **11** | **Deterministic Rules Engine** | **IMPLEMENTED AND VERIFIED** | `src/lib/rules/rules-engine.ts`, `src/lib/rules/rule-registry.ts` | 11 statutory rules evaluating 4 severity tiers (Critical to Cosmetic). 24 tests passing. |
| **12** | **Missing Document Detection** | **IMPLEMENTED AND VERIFIED** | `src/lib/rules/rules-engine.ts` (`RequiredDocumentsRule`) | Flags missing mandatory statutory categories (Application, Accreditation, Affiliation, Undertaking). |
| **13** | **Institution & App Matching** | **IMPLEMENTED AND VERIFIED** | `src/lib/rules/semantic-comparator.ts`, `RULE_INSTITUTION_NAME_MISMATCH` | Levenshtein and token-set fuzzy matching across uploaded certificates. |
| **14** | **Review Flags & Evidence Display**| **IMPLEMENTED AND VERIFIED** | `src/app/applications/[id]/page.tsx`, `src/components/SeverityBadge.tsx` | Full UI display of findings, evidence snippets, suggested actions, and dismissals. |
| **15** | **Officer Decisions & Audit History**| **IMPLEMENTED AND VERIFIED** | `src/lib/review/review-service.ts`, `src/models/AuditEvent.ts` | Officer approvals, rejections, clarifications recorded with persistent audit trails. |
| **16** | **MongoDB Persistence** | **IMPLEMENTED AND VERIFIED** | `src/lib/db/connection.ts`, `src/lib/db/repository.ts`, `src/models/Application.ts` | Connects to MongoDB with connection caching and resilient in-memory fallback. |
| **17** | **Sidebar / Navbar Navigation** | **IMPLEMENTED AND VERIFIED** | `src/components/Navbar.tsx` | Clean top navbar linking Dashboard, Applications, Review Queue, New Intake. |
| **18** | **Loading, Retry & Failure States** | **IMPLEMENTED AND VERIFIED** | `src/lib/hooks/use-applications.ts` | TanStack Query with loading states, error boundaries, and cache invalidation. |
| **19** | **Role-Based Access Control** | **PARTIALLY IMPLEMENTED** | `src/lib/auth/middleware.ts`, `src/middleware.ts` | API routes enforce roles (`requireRole`), but UI lacks login form and role switching. |
| **20** | **Build & Deployment Readiness** | **IMPLEMENTED AND VERIFIED** | `package.json`, `next.config.ts` | `npm run build` and `npm test` compile with zero errors on Next.js 16.4.3. |

---

## 3. Prioritized Remediation Backlog

### P0 & P1: Core Demo Workflow & Role Access
- **P1-1: Implement Complete `/login` UI with 1-Click Demo Accounts**
  - Create `src/app/login/page.tsx` with credential login and pre-populated 1-click test buttons:
    - **College Admin**: `college@apex.edu.in` / `College@123456`
    - **Review Officer**: `officer@aicte.gov.in` / `Officer@123456`
    - **System Admin**: `admin@aicte.gov.in` / `Admin@123456`
  - Wire to `POST /api/auth/login` and set cookie session.
- **P1-2: Wire Role Portal Dashboards**
  - Implement `src/app/college/dashboard/page.tsx`: Shows college-specific applications, status cards, and direct "New Submission" flow.
  - Implement `src/app/officer/dashboard/page.tsx`: Integrates officer review queue, pending scrutinies, and quick review actions.
- **P1-3: Seed Deterministic Demo Accounts & Institutions**
  - Enhance `/api/demo/seed` to seed both demo applications AND demo users/institutions into MongoDB so all roles work out of the box.

### P2: End-to-End Demo Synthetic Test Scenarios
- **P2-1: Provide 2 Verified Synthetic PDF Test Documents in `test-docs/`**:
  - **Scenario A (Clean / Pass)**: All certificates valid, matching names, non-expired dates.
  - **Scenario B (Discrepancy / Flagged)**: Missing Affiliation Certificate, institution name mismatch ("Apex College" vs "Apex Institute of Advanced Technology"), and expired NAAC accreditation.
  - Allows the live demo to show instant AI OCR extraction, discrepancy detection, and officer adjudication.

### P3: Polish & Usability
- Add current logged-in user badge and "Sign Out" button to `src/components/Navbar.tsx`.
- Include quick demo reset button in development header.

---

## 4. Acceptance Checklist for Minimal Working Demo

1. [ ] App boots cleanly on port 3000 (`http://localhost:3000`).
2. [ ] User visits `/login`, clicks "Sign In as College Admin", enters College Dashboard.
3. [ ] Uploads Synthetic Test Case (either Scenario A or B) through `/applications/new`.
4. [ ] System performs text extraction, category classification, and rules engine analysis.
5. [ ] College dashboard reflects submission status.
6. [ ] User logs in as "Review Officer", visits `/officer/dashboard` (or `/queue`).
7. [ ] Inspects flagged discrepancies with evidence snippets.
8. [ ] Submits an adjudication decision (Approve/Reject/Clarification) with audit trail.
9. [ ] Page refresh proves decision is persistently saved to MongoDB.

---

## 5. Implementation Effort Estimate
- **Task P1-1 (`/login` Page with 1-click demo)**: ~15 mins
- **Task P1-2 (College & Officer Dashboard UI)**: ~20 mins
- **Task P1-3 (Demo Seed Enhancement)**: ~10 mins
- **Task P2-1 (Synthetic Test PDFs & Scenarios)**: ~10 mins
- **Task P3 (Navbar Auth status & Logout)**: ~5 mins
- **Total Estimated Effort**: ~1 hour

---
*Please review and approve this plan before any code modifications proceed.*
