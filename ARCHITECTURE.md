# Architecture & System Design Specification: AICTE Institutional Document Scrutiny Platform (PS 26261)
**Author:** Principal Systems Architect & Engineer  
**Date:** October 2026  
**Status:** Approved for Implementation  

---

## 1. System Mission & Operational Context

The AICTE Institutional Scrutiny Platform evaluates large batches of annual institutional applications (Extension of Approval, Establishment of New Institutes, Intake Variations) against statutory norms defined in the AICTE Approval Process Handbook (APH).

The platform enforces three core architectural mandates:
1. **Deterministic Authority:** Regulatory compliance checks (document completeness, name identity, validity dates, cryptographic file deduplication) are deterministic, transparent, and auditable. AI does not hallucinate regulatory compliance.
2. **Advisory Decision Support:** Model inference (via Jev System-One typed probability queries or local fallback) serves exclusively to calibrate review priority, detect anomalies, and suggest action vectors. AI output never automatically rejects an application or declares fraud.
3. **Strict Human-in-the-Loop Sovereign Gate:** Adverse determinations (rejection, return for clarification) require an authenticated scrutiny officer's signature and immutable rationale.

---

## 2. High-Level Component Topology

```
+-----------------------------------------------------------------------------------+
|                              PRESENTATION LAYER (Next.js)                         |
|  - Scrutiny Dashboard (Metrics, Priority Triage)                                  |
|  - Applications Directory (Faceted Search, Status Filters)                         |
|  - Application Detail Studio (Side-by-Side Comparison Grid, Document Inspector)   |
|  - Human Determination Controls (Approve, Clarification, Escalate, Reject)        |
+------------------------------------------+----------------------------------------+
                                           | HTTP / REST (Zod-Validated Payloads)
+------------------------------------------v----------------------------------------+
|                                  API GATEWAY & DOMAIN ROUTING                     |
|  /api/applications               - Application lifecycle & intake                 |
|  /api/applications/[id]/upload   - Multipart streaming & cryptographic hashing    |
|  /api/applications/[id]/review   - State machine transition & audit logging       |
|  /api/applications/[id]/report   - Deterministic CSV/JSON audit generation        |
|  /api/demo/seed                  - Reproducible sandbox scenario engine           |
+-------------------+----------------------+--------------------+-------------------+
                    |                      |                    |
+-------------------v---+  +---------------v---+  +-------------v----+  +-----------v---+
| DOCUMENT PIPELINE     |  | DETERMINISTIC     |  | VERIFICATION     |  | JEV ADVISORY  |
| - Mime/Size Guard     |  | RULES ENGINE      |  | REGISTRY SERVICE |  | DECISION CORE |
| - SHA-256 Digest      |  | - Registry Pattern|  | - NAAC Portal    |  | - State + Type|
| - Text Extraction     |  | - Context Object  |  | - NBA Registry   |  |   Questions   |
| - Layout/OCR Adapter  |  | - Priority Sorter |  | - Univ Registrar |  | - Calibrated  |
| - Field Normalizer    |  | - Transition Guard|  | - Mock/Live Mode |  |   Confidence  |
+-------------------+---+  +---------------+---+  +-------------+----+  +-----------+---+
                    |                      |                    |                   |
+-------------------v----------------------v--------------------v-------------------v---+
|                              DATA PERSISTENCE & AUDIT BUS                             |
|  - Mongoose Document Model / Fallback Repository (Zero-downtime offline storage)      |
|  - Immutable Event Log: actor, action, timestamp, cryptographic document fingerprint  |
+---------------------------------------------------------------------------------------+
```

---

## 3. Data Flow & Execution Pipeline

When an application is created or documents are uploaded:

1. **Ingestion & Cryptographic Fingerprinting:**
   - Files are validated against MIME type allowlists (`application/pdf`, `image/png`, `image/jpeg`) and size caps (10MB).
   - A SHA-256 content digest is computed immediately from the raw buffer.
   - Files are stored using opaque, collision-resistant storage keys outside the public web tree.

2. **Text Extraction & Optical Processing:**
   - Native digital PDFs pass through `pdf-parse` (high throughput, zero external binary dependency).
   - Low-yield text (< 50 chars) or raw image buffers pass to the `IExtractionProvider` / OCR adapter.
   - Field extraction isolates: Institution Name, Application ID, Certificate ID, Issue Date, Expiry Date, Authority, and Address.

3. **Deterministic Rule Execution (`RuleRegistry`):**
   - Rules are registered as discrete, testable strategy classes implementing `IRule`.
   - Each rule receives a read-only `RuleExecutionContext` containing:
     - The target application record
     - The full document set
     - Configured reference date
     - Known authority whitelist
   - Findings report: Rule ID, Title, Severity (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `INFO`), Explanation, Evidence Snippet, and Suggested Action.

4. **External Registry Verification (`IVerificationProvider`):**
   - Documents requiring statutory verification (Accreditation & Affiliation) trigger the registry adapter.
   - Status transitions to `VERIFICATION_REQUIRED` until statutory lookups confirm or deny validity.

5. **Jev Decision Engine Advisory Scoring:**
   - Structured context (findings count, critical flags, document categories) compiles into a Jev System-One query.
   - If Jev API credentials exist, it queries calibrated review priority (`URGENT`, `STANDARD`, `LOW`) and recommended triage vector.
   - If unconfigured, the deterministic fallback engine computes equivalent priority without application disruption.

6. **State Machine Evaluation:**
   - Status automatically resolves to the highest priority condition:
     `UNABLE_TO_PROCESS` > `INCOMPLETE` > `NEEDS_REVIEW` > `VERIFICATION_REQUIRED` > `PASSED_INITIAL_CHECKS`.

7. **Human Scrutiny Decision:**
   - Authorized reviewer executes determination (`APPROVE`, `REQUEST_CLARIFICATION`, `ESCALATE`, `REJECT`).
   - Action produces an append-only `AuditEvent` storing reviewer identity, timestamp, outcome, and justification.

---

## 4. Key Design Patterns Applied

- **Pipeline Pattern:** Sequential document processing stages (Ingest -> Hash -> Extract -> Classify -> Normalize).
- **Strategy & Registry Pattern:** All deterministic checks adhere to `IRule` and register in `RuleRegistry`. New AICTE rules can be added without modifying existing checks.
- **Adapter Pattern:** OCR providers (`IOcrService`), Registry verifiers (`IVerificationProvider`), and Jev Decision Support (`IJevAdapter`) are isolated behind strict contracts.
- **Repository Pattern:** Abstracted persistence layer with automatic MongoDB / in-memory zero-configuration fallback.
- **Finite State Machine:** Guarded status transitions preventing invalid states (e.g. approving an application with unreadable files without explicit escalation).
