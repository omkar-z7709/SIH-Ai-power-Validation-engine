# AI-Powered Application & Document Checking Platform (AICTE / PS 26261)

A complete, working MVP designed for scrutiny officers evaluating institutional applications (Extension of Approval, New Institutes, Intake Increases) and statutory supporting documents.

The platform automatically extracts text, classifies document categories, parses vital accreditation and affiliation fields, detects cross-document inconsistencies, identifies expired certificates and date inversions, checks for duplicate submissions via SHA-256 cryptographic hashing, runs deterministic business logic, provides optional Jev decision support, and logs all officer interventions in an immutable audit trail.

---

## 1. Key Features

- **Multi-Format Document Ingestion:** Supports PDF, PNG, and JPEG files with size enforcement (10MB per file) and MIME type validation.
- **Text & Field Extraction Pipeline:** Extracts text using `pdf-parse` for digital PDFs and an OCR service adapter for scanned documents.
- **Categorization Heuristics:** Automatically classifies documents into *Application Form*, *Accreditation Certificate (NAAC/NBA)*, *Affiliation Order*, *Statutory Undertaking*, and *Land Documents*.
- **Authoritative Deterministic Rules Engine:**
  - `RULE_REQ_DOC_MISSING`: Flags missing mandatory AICTE documents.
  - `RULE_INSTITUTION_NAME_MISMATCH`: Identifies cross-document institution name divergences.
  - `RULE_EXPIRED_CERTIFICATE`: Flags certificates where validity date is in the past.
  - `RULE_INVALID_DATE_ORDER`: Detects clerical or chronological errors where issue date post-dates expiry date.
  - `RULE_DUPLICATE_FILE`: Detects file duplication via SHA-256 hash collision.
  - `RULE_EXTRACTION_FAILURE`: Identifies unreadable, corrupted, or encrypted documents.
  - `RULE_VERIFICATION_REQUIRED`: Requires statutory authority confirmation for accreditation/affiliation.
- **Decision Engine with Jev Integration & Fallback:**
  - Connects to TypeSafe's Jev model (`TYPESAFE_API_KEY`) when configured.
  - Reverts automatically to a deterministic rules-based decision fallback if Jev credentials are absent or the endpoint is unreachable.
- **Human-in-the-Loop Scrutiny Dashboard:**
  - Status management: `PASSED_INITIAL_CHECKS`, `INCOMPLETE`, `NEEDS_REVIEW`, `VERIFICATION_REQUIRED`, `UNABLE_TO_PROCESS`, `APPROVED_BY_REVIEWER`, `REJECTED_BY_REVIEWER`, `RETURNED_FOR_CLARIFICATION`.
  - Officer controls: Approve, Request Clarification, Escalate, Reject, or Dismiss Individual Findings with recorded justification.
  - Side-by-side cross-document field comparison grid.
  - Audit log recording every file upload and officer action.
  - One-click CSV and JSON report export.
- **Pre-Configured Demo Scenarios:** Built-in seed data showcasing 6 institutional scenarios (valid, missing doc, name mismatch, expired cert, statutory verification required, corrupted file).

---

## 2. Technology Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript (Strict mode)
- **Styling:** Tailwind CSS
- **Data Validation:** Zod
- **Database:** MongoDB with Mongoose (with an in-memory fallback store when local MongoDB is not running)
- **Document Processing:** `pdf-parse` for text extraction & Tesseract.js / OCR service adapter
- **Testing:** Vitest

---

## 3. Getting Started

### Prerequisites
- Node.js (v18.x or v20.x+ recommended; tested on v25.6.0)
- npm (v10+ or v11+)
- (Optional) Local MongoDB server running on `mongodb://127.0.0.1:27017`

### Installation

```bash
# Clone or navigate to the repository directory
cd "C:\Users\NITRO\OneDrive\Desktop\web dev\own project try\SIH"

# Install all dependencies
npm install
```

### Environment Configuration

Create a `.env.local` file from the provided template:

```bash
cp .env.example .env.local
```

If you have a Jev / TypeSafe API key, set it in `.env.local`:
```env
TYPESAFE_API_KEY=your_typesafe_key_here
```
*Note: If `TYPESAFE_API_KEY` is omitted, the application operates in transparent Rule-Based Fallback Mode.*

---

## 4. Running the Application

### Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your web browser.

### Loading Demo Scenarios
1. Open [http://localhost:3000](http://localhost:3000).
2. Click **"Load Demo Scenarios"** on the dashboard top banner.
3. The platform will seed 6 synthetic institutional applications covering:
   - Apex Institute of Advanced Technology (Fully compliant, passes checks)
   - Sahyadri College of Engineering & Research (Missing required affiliation document)
   - Cauvery Institute of Engineering and Management (Institution name mismatch across NAAC cert)
   - Coromandel Academy of Technology (Expired NBA certificate and issue date > expiry date conflict)
   - Ganga Institute of Technical Studies (Statutory portal verification required)
   - Sabarmati Polytechnic (Unreadable / corrupted document handling)

### Production Build
```bash
npm run build
npm run start
```

---

## 5. Running Tests

Execute the unit test suite:
```bash
npm test
```
The test suite validates:
- Date parsing and validity calculations.
- Cross-document name normalization and mismatch detection.
- Missing required documents enforcement.
- Duplicate file hash detection.
- Jev decision adapter fallback behavior.

---

## 6. Architecture & Directory Structure

```
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── applications/       # REST endpoints for applications and reviews
│   │   │   └── demo/seed/          # Synthetic demo scenario seeder
│   │   ├── applications/           # Directory and New Application creation screens
│   │   ├── queue/                  # Priority review queue
│   │   ├── layout.tsx              # Shell with navigation header
│   │   └── page.tsx                # Dashboard metrics and high-priority case list
│   ├── components/                 # Status badges, severity tags, navbar
│   ├── lib/
│   │   ├── db/                     # MongoDB connection & fallback repository
│   │   ├── documents/              # File upload, hashing, classification, OCR
│   │   ├── jev/                    # Jev API adapter with fallback decision support
│   │   ├── review/                 # Review actions, audit logging, CSV/JSON export
│   │   ├── rules/                  # Authoritative deterministic rules engine
│   │   └── validation/             # Zod input schemas
│   ├── models/                     # Mongoose document schemas
│   └── types/                      # Shared TypeScript data models
└── tests/                          # Vitest unit test suite
```

---

## 7. Responsible AI & Security Measures

- **No Defamatory Verdicts:** An automated flag indicates a potential discrepancy or data inconsistency, never a declaration of fraud.
- **Human Authority:** All adverse determinations (clarification request or application rejection) require human reviewer input with recorded reasoning.
- **Untrusted Document Context:** Extracted text is processed strictly as data values, preventing prompt injection or instruction override.
- **Data Minimization:** Raw file buffers are stored safely outside public web folders; only structured signals are dispatched to external decision support.
