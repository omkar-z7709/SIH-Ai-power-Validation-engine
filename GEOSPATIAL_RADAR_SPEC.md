# COMPLETE CONTEXT & MASTER SPECIFICATION
## Project: AI-Powered Institutional Document Validation Engine (SIH PS 26261)
## Feature: Geospatial Scrutiny Radar & Regional Anomaly Map

---

### PART 1: THE PRINCIPAL ENGINEER CRITIQUE (WHY THIS FEATURE WINS)

1. The Juror's Objection to a Basic Map:
   - A generic map with simple pins looks like a surface-level hackathon gimmick.
   - Judges and AICTE officials evaluate "Automated Document Scrutiny & Fraud Prevention". They will ask: "How does a map help catch a fake NAAC certificate or forged land deed?"

2. The Regulatory Reality of Geography in Institutional Approval:
   - Geography is a primary vector for administrative fraud:
     a. Shared Land / "Ghost Campus" Fraud: Sister institutions under the same trust submit separate applications claiming the exact same land parcel or survey number to circumvent minimum continuous land requirements (5.0 acres rural, 2.5 acres urban).
     b. Regional Syndicate Clusters: Multiple colleges in one district (e.g., Pune or Delhi NCR) exhibiting identical fraudulent signatures, identical fake notary stamps, or synchronized affiliation date inversions.
     c. Regional Resource Prioritization: AICTE Regional Officers need an operational command center showing high-risk clusters (Tier-1 Critical Identity mismatches) and defect density per district.

3. The Winning Concept:
   - Not a generic Google Map, but an interactive "Geospatial Scrutiny & Regional Anomaly Radar" (`/map`).
   - Connects extracted document data (survey numbers, land acreage, addresses) directly to geospatial anomaly detection.

---

### PART 2: CURRENT PROJECT REPOSITORY CONTEXT & CODEBASE FACTS

1. Tech Stack & Environment:
   - Framework: Next.js 16.4.3 (App Router, Turbopack, React 19)
   - Language: TypeScript (Strict mode)
   - Styling: Tailwind CSS v4, Lucide React icons, OKLCH theme tokens (with dark/light support in src/app/globals.css)
   - State & Client Caching: @tanstack/react-query v5 (useApplications() in src/lib/hooks/use-applications.ts, role-scoped query keys)
   - Database: MongoDB via Mongoose with an automated in-memory repository fallback (src/lib/db/connection.ts, src/lib/db/repository.ts)
   - Auth & Session: Signed HS256 JWT via jose, stored in HttpOnly cookie aicte_session (src/lib/auth/session.ts, src/middleware.ts)
   - Extraction & OCR: Isolated child-process workers (extract-pdf-cli.mjs, extract-ocr-cli.mjs) supporting native digital PDFs (pdfjs-dist), scanned PDFs, OpenRouter Qwen 3 VL (qwen/qwen3-vl-8b-instruct), and local Tesseract.js WASM
   - Rules Engine: 11 deterministic statutory rules evaluated in src/lib/rules/rules-engine.ts across 4 severity tiers (TIER_1_CRITICAL, TIER_2_HIGH, TIER_3_MEDIUM, TIER_4_COSMETIC)
   - Active Branch: ui-ux-design
   - Port: 3000

2. Existing Data Models & Interfaces:
   - ApplicationRecord (src/types/index.ts & src/models/Application.ts):
     - id: string
     - referenceId: string (e.g. "AICTE-2026-DEL-101", "AICTE-2026-APX-0417")
     - institutionId?: string (e.g. "inst_apex_tech_01")
     - institutionName: string (e.g. "Apex Institute of Advanced Technology")
     - applicationType: "EXTENSION_OF_APPROVAL" | "NEW_INSTITUTE" | "INCREASE_IN_INTAKE" | "CLOSURE"
     - academicYear: string (e.g. "2026-27")
     - state: string (e.g. "Maharashtra", "Delhi", "Karnataka")
     - status: DecisionStatus ("PASSED_INITIAL_CHECKS", "NEEDS_REVIEW", "INCOMPLETE", "VERIFICATION_REQUIRED", "APPROVED_BY_REVIEWER", etc.)
     - documents: DocumentRecord[] (extractedFields contains: institutionName, applicationNumber, address, landAreaAcres, surveyNumber, district, pinCode, issuingAuthority, accreditationGrade)
     - allFindings: Finding[] ({ id, ruleId, severity, title, explanation, suggestedAction, dismissed })
     - reviews: ReviewRecord[]
     - auditTrail: AuditEvent[]
   - Master Institution Record (src/models/Institution.ts):
     - officialCode, legalEntityName, district, taluka, address, pinCode
   - Synthetic Test Fixtures (src/app/api/demo/seed/route.ts):
     - 6 built-in test institutions covering clean pass, missing affiliation, name mismatch, expired cert + date inversion, statutory verification required, corrupted file.

---

### PART 3: COMPLETE MASTER IMPLEMENTATION SPECIFICATION

#### A. Top Navigation Integration (src/components/Navbar.tsx)
- Add a new navigation link in the top bar:
  - Label: "Regional Radar"
  - Icon: Compass or MapPin from lucide-react
  - Route: /map
  - Position: Between Review Queue and New Intake
  - Active state styling matching the existing navbar design.

#### B. The Map Page Architecture (src/app/map/page.tsx)
- Dedicated, full-viewport responsive compliance radar:
  - Zero-API-Key Map Implementation: Use Leaflet + React-Leaflet with dynamic import (ssr: false) to prevent Next.js 16 SSR window/document hydration errors.
  - Tile Layer: OpenStreetMap CartoDB tiles (CartoDB Positron for light mode, CartoDB Dark Matter for dark mode) that adapt automatically to the user's theme.
  - Initial Center: India viewport [20.5937, 78.9629], zoom level 5.
  - Quick City Zoom Pills: Instant jump buttons for scrutiny hotspots: All India, Pune (Western Region), Delhi NCR, Bangalore, Mumbai, Chennai.

#### C. Marker Clustering & Pin Visual Language
- Plot each college using coordinates derived from its state, district, or document-extracted address:
  - Green Pin: PASSED_INITIAL_CHECKS or APPROVED_BY_REVIEWER (Zero active findings).
  - Amber Pin: INCOMPLETE or NEEDS_REVIEW with only Tier 3/4 minor findings.
  - Pulsing Crimson Pin: Applications with TIER_1_CRITICAL or TIER_2_HIGH active findings (RULE_INSTITUTION_NAME_MISMATCH, RULE_EXPIRED_CERTIFICATE, RULE_DUPLICATE_FILE).
  - Blue Ring / Star: Applications of type NEW_INSTITUTE (first-time establishment needing physical verification).
- Hover tooltip: Institution Name, Reference ID, Application Type, Current Compliance Status.

#### D. Interactive Dossier Slide-Over Drawer
- Clicking any map marker opens an accessible, clean slide-over drawer:
  - Header: Institution Name, AICTE Reference ID, State, District, Status Badge.
  - Extracted Credential Summary:
    - Land Area Claimed (e.g. 6.5 acres) & Survey/Plot Number.
    - Attached Documents Count & Verification Engine Provenance (NativePdfParser, QwenVisionOCR).
  - Active Non-Compliance Flags: List of active findings with severity badges and evidence snippets.
  - Primary CTA: "Open Complete Scrutiny Dossier" button linking directly to /applications/[id].

#### E. The Unfair Advantage Feature: Geospatial Campus Collision Detector
- Interactive switch in the map header: "Detect Land Parcel & Campus Collisions".
- Detection Algorithm:
  - Compare extracted surveyNumber, address, or GPS coordinates across all applications.
  - When two applications share matching or fuzzy-colliding survey/plot numbers under different reference IDs:
    1. Render a dashed crimson connecting vector line on the map between the two institutions.
    2. Display an urgent anomaly badge:
       "Cross-Campus Anomaly: Land Survey No. 42 / Plot 14 claimed simultaneously by 2 separate applicant institutes (AICTE-2026-APX-0417 & AICTE-2026-DEL-101)."
    3. Clicking the alert highlights both pins simultaneously.

#### F. Summary Metrics Bar
- Top-anchored metrics strip displaying real-time aggregated stats from useApplications():
  - Total Mapped Institutes (count)
  - High-Risk Hotspots (count of institutions with Tier 1/2 flags)
  - New Institute Proposals (count of NEW_INSTITUTE)
  - Land Collision Warnings (count of detected land conflicts)
  - Active Scrutiny Cycle (2026-27)

#### G. Data Enrichment (src/lib/geo/institution-coordinates.ts)
- Geographic latitude/longitude coordinates and survey numbers for synthetic test fixtures:
  1. Apex Institute of Advanced Technology: Pune/Hinjewadi, Maharashtra ([18.5913, 73.7389], Survey No. 42).
  2. Apex Polytechnic College (Collision Case): Pune/Hinjewadi, Maharashtra ([18.5925, 73.7405], Survey No. 42 - triggers land collision alert).
  3. Sahyadri College of Engineering: Mangalore/Karnataka ([12.8698, 74.9254]).
  4. Cauvery Institute of Engineering: Mysore/Karnataka ([12.2958, 76.6394]).
  5. Coromandel Academy of Technology: Chennai/Tamil Nadu ([13.0827, 80.2707]).
  6. Ganga Institute of Technical Studies: New Delhi/NCR ([28.6139, 77.2090]).

#### H. Non-Functional & Quality Constraints
- Zero external paid API keys required: runs 100% free and offline using OpenStreetMap / Leaflet tile layers.
- Zero hydration/SSR errors in Next.js App Router.
- Zero breaking changes to the 11 statutory rules in src/lib/rules/rules-engine.ts or the 32 passing Vitest unit tests.
- Design-first styling adhering to the ui-ux-design branch guidelines.

---

### PART 4: RECOMMENDED AI ADVISOR & PROMPT INSTRUCTION

Recommended Model for Optimization:
- Claude 3.7 Sonnet (with Extended Thinking) or OpenAI o3-mini / o1.

Framing to paste to that AI:
"Act as a Principal Frontend Architect and SIH Hackathon Judge. Review the attached master specification for a Next.js 16 Geospatial Scrutiny Radar in an AICTE document validation platform. Refine it to make the implementation cleaner, highlight potential Leaflet SSR hydration pitfalls, and optimize the data structure for cross-campus land collision detection so my implementer agent can build it in one shot."
