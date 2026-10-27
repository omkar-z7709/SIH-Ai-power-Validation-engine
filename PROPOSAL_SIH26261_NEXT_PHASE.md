# ARCHITECTURAL PROPOSAL & REGULATORY ENGINE SPECIFICATION
## Project: AI-Powered Institutional Document Validation & Regulatory Compliance Engine
### Context: Smart India Hackathon (SIH Problem Statement SIH26261 — AICTE Approval Process Handbook Compliance)

---

## 1. PURPOSE OF THIS DOCUMENT
This document is a technical and regulatory blueprint to discuss, critique, and refine with AI systems, regulatory domain experts, and systems architects. It bridges the gap between official **AICTE Approval Process Handbook (APH)** gazette mandates and an operational Next.js/TypeScript production e-governance engine.

---

## 2. EXISTING ARCHITECTURAL BASELINE (WHAT IS CURRENTLY RUNNING)
The codebase is operational and verified on branch `fix/dashboard-switching`:

| System Component | Current Implementation | Operational Status |
|---|---|---|
| **Framework & Runtime** | Next.js 16.4.3 (App Router, Turbopack, React 19, TypeScript strict) | Production build active (`npm run start -p 3000`) |
| **Database & Caching** | MongoDB Atlas via Mongoose + resilient in-memory fallback | Dual-mode persistence with zero-downtime fallback |
| **Document Storage** | Local filesystem storage (`storage/documents/`) with SHA-256 deduplication | **Scope constraint:** Cloud S3 / object DB deferred to future phase |
| **Authentication & RBAC** | Signed HS256 JWT in `aicte_session` cookie + Bearer authorization headers | Verified server-side scoping, tenant boundary isolation |
| **Multi-Tenant Isolation** | College users (`COLLEGE_ADMIN`, `COLLEGE_STAFF`) strictly isolated to their own `institutionId` (e.g., `inst_apex_tech_01`). Cross-tenant access returns HTTP 404 (prevents ID enumeration). | Enforced at repository, API, and UI layers |
| **Two-Tier Scrutiny Review** | `REVIEW_OFFICER` audits queue, flags discrepancies, and requests clarification; statutory `APPROVE` and `REJECT` are exclusively restricted to `SENIOR_OFFICER` and `SYSTEM_ADMIN` (HTTP 403 enforcement). | Enforced across state machine and UI |
| **PDF Statutory Dossier** | Multi-color vector PDF engine (`jsPDF`) with Navy & Gold header, dynamic verdict ribbon, 4-color KPI tiles, 4pt severity-accented cards, credentials audit table, drawn vector checkboxes, and `Page X of Y` footers. | Non-blocking reactive `ExportPdfButton` with progress UX |
| **Geospatial Scrutiny Radar** | Interactive Leaflet GIS Radar at `/map` displaying state/district defect density, anomaly clusters, and slide-over dossier previews. | Operational for officer roles |
| **Automated Test Suite** | 51 automated unit and integration tests across 12 test suites (all passing in ~3s). | Vitest (`vitest.config.mts`) |

---

## 3. CORE REGULATORY DOMAINS TO CODIFY

### DOMAIN A: Quantitative Spatial & Built-Up Area Norms
The engine must codify the exact mathematical equations governing institutional physical infrastructure.

#### 1. Total Built-Up Area ($TBUA$) Equation
$$TBUA = (INA + ADA + AMA) + ACA$$

- **$INA$ (Instructional Area):** Classrooms, tutorial rooms, specialized engineering laboratories, workshops, computer centers, and central library carpet areas.
- **$ADA$ (Administrative Area):** Principal chambers, board room, administrative offices, faculty lounges, and central stores.
- **$AMA$ (Amenities Area):** Common rooms, canteen/cafeteria, medical/first-aid stations, toilets, and sports facilities.
- **$ACA$ (Circulation Area):** Hallways, staircases, entrance foyers, and safety passages standardly calculated as a minimum percentage of $(INA + ADA + AMA)$ (typically $15\text{–}20\%$).

#### 2. Specialized Spatial Sharing Norms
- **Allied Engineering Laboratory Sharing Ceiling (30% Rule):**
  $$INA_{shared\_lab} \le 0.30 \times \sum INA_{allied\_labs}$$
  Specialized labs can only be shared across complementary/allied branches up to a maximum of 30% of total required lab area.
- **PG / UG Campus Sharing:**
  Postgraduate (PG) programs operating within an existing technical campus are permitted to share the established Administrative Area ($ADA_{UG}$) of Under Graduate (UG) programs, avoiding redundant physical construction while meeting threshold mandates.

#### 3. Spatial Land Norms & Geographic Contiguity Constraints
| Location Category | Max Parcels | Separation Distance | Minimum Main Plot | Auxiliary Parcel Permitted Usage |
|---|---|---|---|---|
| **Mega / Metro Municipalities** | 1 parcel | 0.0 km (contiguous) | Determined by local FSI / FAR bye-laws | N/A |
| **Urban / Rural Regions** | Max 2 parcels | $\le 2.0\text{ km}$ aerial distance via all-weather road | $\ge 1.5\text{ acres}$ housing $INA + ADA + AMA$ | Hostels, sports fields, staff quarters only (no core instructional) |
| **Hilly Terrains** (J&K, Ladakh, HP, UK, North-East) | Max 3 parcels | $\le 2.0\text{ km}$ with motorable road access | Terrain-adjusted baseline | Residential, sports, and non-instructional facilities |

---

### DOMAIN B: 10 Canonical Statutory Documents & Validation Matrix
The ingestion pipeline parses, authenticates, and validates 10 regulatory documents:

1. **Land Use Certificate (LUC):**
   - *Issuer:* Competent Revenue Authority / District Collector.
   - *Constraint:* Classification must explicitly state "Educational Purpose". Non-educational, agricultural, or residential land without an official land conversion order triggers an immediate block.
2. **Approved Building Layout Plan:**
   - *Issuer:* Architect registered with Council of Architecture (CoA) / Local Development Authority.
   - *Constraint:* Room dimensions must satisfy minimum program carpet areas; CoA registration number and official seal must be valid.
3. **Fire and Life Safety Clearance (Fire NOC):**
   - *Issuer:* State Fire Services Department / Chief Fire Officer.
   - *Constraint:* Certificate must remain valid on the final date of submission. Address must match institutional campus coordinates exactly.
4. **Occupancy / Building Completion Certificate:**
   - *Issuer:* Municipal Corporation / Urban Development Authority.
   - *Constraint:* Provisional certificates are valid for a maximum of 2 consecutive academic cycles.
5. **Structural Stability Certificate:**
   - *Issuer:* Structural Engineer possessing a recognized Master’s Degree (M.Tech/M.E.) in Structural Engineering.
   - *Constraint:* Required for all vertical extensions / additional floors. Certifying engineer without master's credential triggers a critical defect.
6. **Registered Land / Building Lease Deed:**
   - *Issuer:* Sub-Registrar Office under the Registration Act.
   - *Constraint:* Private lease agreements must carry an unexpired continuous term $\ge 25\text{ years}$.
7. **Institutional Affidavit (Affidavit 2):**
   - *Issuer:* Sworn before First Class Judicial Magistrate or Public Notary on Non-Judicial Stamp Paper ($\ge \text{₹}100$).
   - *Constraint:* Must strictly conform to verbatim AICTE statutory phrasing.
8. **State Government NOC & University Affiliation Order:**
   - *Issuer:* State Department of Technical Education & Affiliating State University.
   - *Constraint:* Approved intake numbers must match AICTE Format 2 and synchronize across all application tiers.
9. **Student Credentials & Faculty Registry (APAAR ID Portal):**
   - *Issuer:* Ministry of Education / National Academic Depository.
   - *Constraint:* Validates against duplicate student enrollments across technical campuses via APAAR (One Nation One Student ID).
10. **Site Title & Encumbrance Certificate:**
    - *Issuer:* Revenue Authority / Sub-Registrar.
    - *Constraint:* Must certify unencumbered title free from legal disputes or non-educational mortgages.

---

### DOMAIN C: Mathematical Risk Quantification & Administrative Routing ($S_{risk}$)
Rather than simple binary approvals, the engine computes a composite Risk Metric:

$$S_{risk} = \sum_{i=1}^n w_i \cdot c_i$$

Where:
- $c_i \in \{0, 1\}$ represents the compliance violation status of condition $i$ ($1 = \text{failed}, 0 = \text{compliant}$).
- $w_i \in [0, 1]$ represents the normalized statutory severity weight such that $\sum w_i = 1.0$.

#### Proposed Severity Weight Distribution:
| Violation Check ($i$) | Weight ($w_i$) | Statutory Justification |
|---|---|---|
| Invalid Land Title / Non-Educational Land Use | **0.25** | Absolute prerequisite for physical campus establishment |
| Expired / Missing Fire Safety NOC | **0.20** | Non-negotiable life safety threshold |
| Built-Up Area Deficit $> 15\%$ | **0.15** | Prevents acute classroom/laboratory overcrowding |
| Split Plot Separation $> 2.0\text{ km}$ / Missing Main Plot Acreage | **0.12** | Violates campus physical contiguity norms |
| Unapproved Layout Plan / Non-CoA Architect | **0.10** | Structural and municipal regularity mandate |
| University Affiliation Intake Mismatch | **0.08** | Statutory alignment between University and Council |
| Structural Stability Engineer Lacks Master's Degree | **0.05** | Engineering certification integrity |
| Minor Cadre Ratio / Non-Critical Affidavit Wording Discrepancy | **0.05** | Administrative rectification candidate |

#### Risk Profile Tiers & Automated E-Governance Outcomes:
```
           S_risk Score
  0.0 ──────────── 0.30 ──────────── 0.70 ──────────── 1.0
  [   LOW RISK     ] [  MEDIUM RISK   ] [   HIGH RISK     ]
          │                   │                   │
          ▼                   ▼                   ▼
     Fast-Track        15-Day Deficiency      Auto-Escalate
    Bureau Clear       Notice Generated      to EVC Site Visit
```

1. **High Risk ($S_{risk} \ge 0.70$):**
   - Automatically marks application as `CRITICAL_INSPECTION_REQUIRED`.
   - Routes to the **Expert Visit Committee (EVC)** priority queue for mandatory physical campus inspection.
2. **Medium Risk ($0.30 \le S_{risk} < 0.70$):**
   - Automatically triggers a **15-Day Institutional Rectification Window**.
   - Emits an official Deficiency Letter specifying exact clauses and upload slots for remediation.
3. **Low Risk ($S_{risk} < 0.30$):**
   - Classifies as `STATUTORILY_COMPLIANT`.
   - Generates a **Fast-Track Clearance Recommendation** for regional officer endorsement.

---

### DOMAIN D: Dynamic Temporal Monitoring & Expiry Cascades
Statutory clearances (Fire NOC, provisional building approvals, lease deeds) are time-bound. The engine maintains automated notification cascades:
- **90-Day Early Warning:** Amber notice on college portal dashboard.
- **60-Day Administrative Notice:** Email alert to registered Trust / Society signatories.
- **30-Day Critical Escalation:** Locks new intake expansion requests until renewal clearance is uploaded.

---

## 4. PROPOSED IMPLEMENTATION MILESTONES

### Milestone 1: Quantitative Spatial & Contiguity Solvers
- File: `src/lib/rules/spatial-rules.ts`
- Implement $TBUA$ formula evaluator and 30% allied lab sharing constraint.
- Implement multi-plot aerial distance contiguity checker ($\le 2.0\text{ km}$) and terrain-aware plot count validator.
- Unit tests: `tests/spatial-rules.test.ts`.

### Milestone 2: Mathematical Risk Quantification Engine
- File: `src/lib/rules/risk-scoring.ts`
- Calculate $S_{risk} = \sum w_i \cdot c_i$ across all evaluated findings.
- Return calibrated score, risk tier (Low, Medium, High), and recommended regulatory route (Fast-Track, 15-Day Deficiency Notice, or EVC Site Inspection).
- Embed visual Risk Meter gauge on `/applications/[id]`, `/college/dashboard`, and the PDF statutory dossier.
- Unit tests: `tests/risk-scoring.test.ts`.

### Milestone 3: 10-Document Statutory Matrix Expansion & Expiry Cascades
- File: `src/lib/documents/statutory-document-matrix.ts`
- Extend category classifications and extractor heuristics for LUC, CoA Building Plans, Structural Stability, 25-yr Leases, and State University NOCs.
- Add proactive 90d / 60d / 30d expiry warning banners on institutional portals.

---

## 5. QUESTIONS FOR CRITIQUE & DISCUSSION WITH EXTERNAL AI
When sharing this proposal with another AI or architect, ask:
1. *Are the assigned severity weights ($w_i$) in the risk penalty formula balanced, or should Fire Safety and Land Use hold even higher weightings?*
2. *For institutions in Hilly terrains vs. Metro municipalities, how should the spatial calculator dynamically adjust the baseline FSI/FAR divisors when municipal bye-laws differ by state?*
3. *What is the cleanest user experience for presenting the 3-tier regulatory routing (Fast-Track vs. 15-Day Notice vs. EVC Site Visit) on the officer scrutiny queue without confusing human officers?*
