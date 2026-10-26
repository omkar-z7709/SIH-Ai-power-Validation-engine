# AI-Powered Institutional Document Validation Engine (AICTE Scrutiny Studio)

[![Next.js 16](https://img.shields.io/badge/Next.js-16.4.3-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?logo=typescript)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-green?logo=mongodb)](https://www.mongodb.com/)
[![Vitest](https://img.shields.io/badge/Tests-32%20Passing-success?logo=vitest)](https://vitest.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Smart India Hackathon (SIH) — Problem Statement 26261**

An automated, regulatory-grade scrutiny platform designed for AICTE scrutiny officers and institutional administrators evaluating institutional approval applications (Extension of Approval, Establishment of New Institutes, Course/Intake Increases) and supporting statutory credentials.

The platform ingests digital and scanned institutional certificates, runs isolated text and entity extraction pipelines, detects cross-document naming and date discrepancies, evaluates 11 statutory deterministic compliance rules, provides AI decision support, detects cross-campus geographic land parcel collisions, and logs all officer interventions in an immutable audit trail.

---

## 1. Key Capabilities & Architecture

### Multi-Tier Document Ingestion & Extraction
- **Digital Vector PDFs:** Extracted in ~5ms using an isolated Node.js PDF engine (`pdfjs-dist`).
- **Scanned Photo & Image PDFs:** Automatically detects embedded scan streams (`/DCTDecode`) and routes through high-accuracy vision OCR.
- **Vision OCR Providers with Multi-Tier Fallback:**
  - **OpenRouter Qwen 3 VL (`qwen/qwen3-vl-8b-instruct`):** SOTA vision model delivering full document transcriptions in ~2 seconds.
  - **Google Cloud Vision OCR:** Enterprise cloud OCR adapter.
  - **Google Gemini Flash Lite (`gemini-3.5-flash-lite`):** Multimodal image OCR fallback.
  - **Local Tesseract.js (WASM):** 100% offline, zero-network fail-safe running locally in Node.js.
- **Cryptographic Tamper-Detection:** Automatic SHA-256 digest computation for duplicate detection (`RULE_DUPLICATE_FILE`).

### Authoritative Deterministic Rules Engine
Evaluates 11 statutory AICTE compliance rules across 4 severity tiers:
- **TIER 1 (CRITICAL):** Cross-document legal entity name divergence (Levenshtein + token-set fuzzy matching), chronological date order inversion (issue date > expiry date), and file hash collisions.
- **TIER 2 (HIGH):** Missing mandatory statutory credentials (Application Form, NAAC/NBA Accreditation, University Affiliation Order, Notarized Undertaking Affidavit), and expired accreditation.
- **TIER 3 (MEDIUM):** Unverified certificate registration numbers requiring statutory council confirmation.
- **TIER 4 (COSMETIC):** Punctuation, capitalization, and minor naming nuances.

### Geospatial Scrutiny Radar & Land Collision Detector (`/map`)
- **Zero-API-Key OpenStreetMap & Leaflet Integration:** Built with client-isolated dynamic rendering to prevent SSR hydration crashes.
- **Cross-Campus Land Parcel Anomaly Detection:** Compares extracted survey/khasra numbers and GPS coordinates scoped by `State + District + Haversine Proximity (<= 15 km)` to prevent false cross-state collisions.
- **Visual Fraud Vectors:** Renders dashed crimson connecting vectors between colleges claiming the same physical land parcels (e.g. Survey No. 42 in Hinjewadi, Pune).
- **Interactive Dossier Slide-Over:** Real-time side drawer displaying extracted land area (vs. 5.0 ac rural / 2.5 ac urban norms), active violations, and direct links to scrutiny files.

### AI Decision Support (Jev Layer)
- Provides calibrated next steps and urgency rankings (`URGENT`, `STANDARD`, `LOW`) for scrutiny officers without overriding deterministic compliance tiers or hallucinating findings.
- Automatic deterministic fallback mode when external keys are unconfigured.

### Role-Based Access Control (RBAC) & Portals
- **Session Security:** HS256 JWT tokens managed via `jose` inside `HttpOnly`, `SameSite=Lax` secure cookies.
- **College Portal (`/college/dashboard`):** Allows institutional admins to submit new intake bundles and monitor compliance status strictly isolated to their own institution ID.
- **Officer Review Queue (`/queue` & `/officer/dashboard`):** Filter by statutory severity tier, inspect side-by-side evidence, waive findings with justification notes, or submit official determinations (Approve, Reject, Request Clarification, Escalate).
- **Multi-Format Audit Export:** 1-click export of official AICTE Scrutiny Reports in **PDF**, **CSV**, and **JSON** formats.

---

## 2. Technology Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript (Strict mode)
- **Styling & UI:** Tailwind CSS, Radix UI Primitives, Lucide Icons
- **Database:** MongoDB Atlas via Mongoose (with automated in-memory repository fallback)
- **State Management & Caching:** TanStack React Query v5 (role-scoped query keys, 45s stale-time dedup)
- **Extraction Engines:** `pdfjs-dist`, `tesseract.js`, OpenRouter Qwen 3 VL, Google Cloud Vision
- **Geospatial & Mapping:** Leaflet, React-Leaflet, OpenStreetMap raster layers
- **Testing:** Vitest (32 unit & integration test suites)

---

## 3. Getting Started

### Prerequisites
- **Node.js:** v18.x or v20.x+ (tested on v25.6.0)
- **npm:** v10+ or v11+
- **MongoDB:** (Optional) Local MongoDB or MongoDB Atlas URI. If omitted, the engine automatically runs in memory.

### Installation

```bash
# Clone the repository
git clone https://github.com/omkar-z7709/SIH-Ai-power-Validation-engine.git
cd SIH-Ai-power-Validation-engine

# Install dependencies
npm install
```

### Environment Configuration

Copy the template environment file:

```bash
cp .env.example .env.local
```

Configure your environment variables:
```env
# Database
MONGODB_URI=mongodb://localhost:27017/aicte-scrutiny

# JWT Secret
JWT_SECRET=your_secure_random_jwt_secret_min_32_chars

# Port Configuration
PORT=3000

# (Optional) OCR & AI Keys
OPENROUTER_API_KEY=your_openrouter_key    # Activates Qwen 3 VL OCR
GEMINI_API_KEY=your_gemini_key            # Activates Gemini Flash OCR
GOOGLE_CLOUD_VISION_API_KEY=your_gcp_key  # Activates Google Cloud Vision
TYPESAFE_API_KEY=your_jev_key             # Activates Jev Decision Layer
```
*(If all external API keys are omitted, the app operates 100% offline using Native PDF Parsing, Local Tesseract OCR, OpenStreetMap layers, and Deterministic Rules.)*

---

## 4. Running the Application

### Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Server
```bash
npm run build
npm run start
```

---

## 5. Demonstration & Testing Guide

### 1-Click Demo Accounts
The login page at [http://localhost:3000/login](http://localhost:3000/login) includes 1-click test credentials in development mode:

| Role | Demo Email | Access Scope |
|---|---|---|
| **College Admin** | `college@apex.edu.in` | Submissions, College Dashboard, Uploads |
| **Review Officer** | `officer@aicte.gov.in` | Officer Queue, Adjudication, Regional Radar, Discrepancies |
| **System Admin** | `admin@aicte.gov.in` | Global Audit Log, User & Institution Admin |

*(Default test password for all demo accounts: `College@123456`, `Officer@123456`, `Admin@123456`)*

### Built-in Synthetic Test Scenarios
1. Log in or open the dashboard at [http://localhost:3000](http://localhost:3000).
2. Click **"Load 6 Sample Cases"** to seed the database with synthetic compliance cases:
   - **Apex Institute of Advanced Technology:** Clean statutory pass (Pune, Hinjewadi).
   - **Apex Polytechnic College:** Flagged for Cross-Campus Land Parcel Collision with Apex Institute (Pune, Hinjewadi).
   - **Sahyadri College of Engineering:** Flagged for missing University Affiliation (Mangalore).
   - **Cauvery Institute of Engineering:** Flagged for institution name divergence (Mysuru).
   - **Coromandel Academy of Technology:** Flagged for expired accreditation and date inversion (Chennai).
   - **Ganga Institute of Technical Studies:** Flagged for statutory portal verification required (New Delhi).
   - **Sabarmati Polytechnic:** Flagged for unreadable document handling (Ahmedabad).

---

## 6. Running Tests

Run the full regression test suite (32 unit and integration tests):

```bash
npm test
```

Test coverage includes:
- Date extraction, normalization, and chronological ordering.
- Levenshtein & token-set cross-document entity mismatch rules.
- Mandatory statutory category detection.
- SHA-256 cryptographic file collision detection.
- Isolated digital PDF and scanned image OCR pipeline.
- Double-write audit logging and officer adjudication persistence.

---

## 7. Project Directory Structure

```
SIH/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/               # Login, Logout, Session verification
│   │   │   ├── applications/       # CRUD, Document Upload, PDF/CSV reports
│   │   │   ├── college/            # College-isolated application queries
│   │   │   ├── officer/            # Official adjudication & review actions
│   │   │   ├── admin/              # User management & immutable audit logs
│   │   │   └── demo/seed/          # Synthetic fixture seeder
│   │   ├── college/dashboard/      # Institutional submission portal
│   │   ├── officer/dashboard/      # Officer priority directory
│   │   ├── applications/           # Master directory & New Intake form
│   │   ├── queue/                  # Prioritized scrutiny review queue
│   │   ├── map/                    # Geospatial Scrutiny Radar & Regional Anomaly Map
│   │   ├── login/                  # Role login with 1-click demo buttons
│   │   └── page.tsx                # Compliance overview & metrics grid
│   ├── components/
│   │   ├── map/                    # RadarMapCanvas, DossierSlideOver
│   │   └── ui/                     # Badges, Navbar, Tables, UI primitives
│   ├── lib/
│   │   ├── auth/                   # JWT session, RBAC middleware, passwords
│   │   ├── db/                     # Mongoose connection & in-memory fallback
│   │   ├── documents/              # Extraction pipeline, CLI workers, regex parser
│   │   ├── geo/                    # Spatial-lexical collision engine & coordinates
│   │   ├── jev/                    # Jev advisory adapter with honest provenance
│   │   ├── review/                 # Review state machine & PDF/CSV report generator
│   │   └── rules/                  # Authoritative 11 statutory AICTE rules
│   ├── models/                     # Application, User, Institution, AuditEvent schemas
│   └── types/                      # Shared TypeScript data models
└── tests/                          # Vitest regression suites
```

---

## 8. Responsible AI & Compliance Guardrails

1. **Human Authority Only:** AI models (Gemini, Qwen, Jev) provide extraction and advisory summaries only. No application can be approved or rejected without a human scrutiny officer recording justification.
2. **Transparent Provenance:** Every extracted document and decision records its exact engine (`NativePdfParser`, `QwenVisionOCR`, `ScannedPdfOcrParser`, `DeterministicRulesFallback`) and execution mode (`live`, `fallback`, `mock`).
3. **Data Protection:** Raw document buffers are stored in a private directory outside the public web root (`/storage/documents`) and indexed by random UUIDs with SHA-256 hashes.
