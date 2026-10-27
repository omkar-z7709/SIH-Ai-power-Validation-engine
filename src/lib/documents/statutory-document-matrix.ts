import { DocumentRecord, Finding, CanonicalDocumentCategory } from "@/types";

export interface StatutoryCategorySpec {
  category: CanonicalDocumentCategory;
  name: string;
  issuingAuthority: string;
  extractedEntities: string[];
  mandatoryConstraint: string;
  primaryDeficiencyTrigger: string;
}

export const CANONICAL_DOCUMENT_SPECS: Record<
  CanonicalDocumentCategory,
  StatutoryCategorySpec
> = {
  LAND_USE_CERTIFICATE: {
    category: "LAND_USE_CERTIFICATE",
    name: "Land Use Certificate (LUC)",
    issuingAuthority: "Competent Revenue Authority / District Collector",
    extractedEntities: ["Survey / Khasra Numbers", "Total Area", "Land Classification", "Owner Name"],
    mandatoryConstraint: "Classification must explicitly state 'Educational Purpose'.",
    primaryDeficiencyTrigger: "Agricultural or residential land lacking official conversion order.",
  },
  APPROVED_BUILDING_PLAN: {
    category: "APPROVED_BUILDING_PLAN",
    name: "Approved Building Layout Plan",
    issuingAuthority: "Registered Architect (CoA) / Local Development Authority",
    extractedEntities: ["Architect CoA Reg No", "Total Built-Up Area", "Room Carpet Areas"],
    mandatoryConstraint: "Carpet areas must meet or exceed program norms; valid CoA registration.",
    primaryDeficiencyTrigger: "Unapproved layout changes; missing CoA architect stamp or seal.",
  },
  FIRE_SAFETY_NOC: {
    category: "FIRE_SAFETY_NOC",
    name: "Fire and Life Safety NOC",
    issuingAuthority: "Chief Fire Officer / State Fire Services Department",
    extractedEntities: ["Issue Date", "Expiry Date", "Building Height", "Fire Clearance Status"],
    mandatoryConstraint: "Clearance certificate must remain valid on the final date of submission.",
    primaryDeficiencyTrigger: "Expired Fire NOC; campus address mismatch on safety certificate.",
  },
  OCCUPANCY_CERTIFICATE: {
    category: "OCCUPANCY_CERTIFICATE",
    name: "Occupancy / Building Completion Certificate",
    issuingAuthority: "Municipal Corporation / Urban Development Authority",
    extractedEntities: ["Permit Number", "Completion Status", "Approved Building Blocks", "Issue Date"],
    mandatoryConstraint: "Provisional certificates are valid for a maximum of 2 consecutive academic years.",
    primaryDeficiencyTrigger: "Exceeded 2-year provisional window without final completion submission.",
  },
  STRUCTURAL_STABILITY_CERTIFICATE: {
    category: "STRUCTURAL_STABILITY_CERTIFICATE",
    name: "Structural Stability Certificate",
    issuingAuthority: "Registered Structural Engineer (Master's Degree in Structural Engineering)",
    extractedEntities: ["Engineer Name", "Degree Qualification", "Registration Number", "Building Load"],
    mandatoryConstraint: "Mandatory for vertical expansions; engineer must hold Master's degree (M.Tech/M.E.).",
    primaryDeficiencyTrigger: "Certifying engineer lacks required Master's in Structural Engineering.",
  },
  LAND_BUILDING_LEASE_DEED: {
    category: "LAND_BUILDING_LEASE_DEED",
    name: "Registered Land / Building Lease Deed",
    issuingAuthority: "Sub-Registrar Office under the Registration Act",
    extractedEntities: ["Lessor/Lessee Names", "Lease Duration", "Execution Date", "Encumbrance"],
    mandatoryConstraint: "Private lease agreements must carry an unexpired continuous term >= 25 years.",
    primaryDeficiencyTrigger: "Remaining lease term < 25 years; mortgaged property without clear title.",
  },
  INSTITUTIONAL_AFFIDAVIT: {
    category: "INSTITUTIONAL_AFFIDAVIT",
    name: "Institutional Affidavit (Affidavit 2)",
    issuingAuthority: "First Class Judicial Magistrate or Public Notary",
    extractedEntities: ["Stamp Paper Serial", "Stamp Value (>= Rs. 100)", "Declarant Name"],
    mandatoryConstraint: "Must strictly match prescribed legal AICTE text formats on proper stamp value.",
    primaryDeficiencyTrigger: "Missing notary seal; under-valued stamp paper; altered legal phrasing.",
  },
  STATE_GOVT_UNIVERSITY_NOC: {
    category: "STATE_GOVT_UNIVERSITY_NOC",
    name: "State Government & University NOC",
    issuingAuthority: "Department of Technical Education & Affiliating State University",
    extractedEntities: ["Program Names", "Sanctioned Intake", "Academic Cycle", "Registrar Signature"],
    mandatoryConstraint: "Formatted strictly per AICTE Format 2; intake values must align across documents.",
    primaryDeficiencyTrigger: "Discrepancy between requested intake and university-sanctioned capacity.",
  },
  STUDENT_FACULTY_CREDENTIALS: {
    category: "STUDENT_FACULTY_CREDENTIALS",
    name: "Student Credentials & Faculty Data",
    issuingAuthority: "Ministry of Education / National Academic Depository (APAAR ID)",
    extractedEntities: ["APAAR ID", "Aadhaar Hash", "Enrolled Program", "Faculty Cadre"],
    mandatoryConstraint: "Student and faculty data must link directly to centralized digital academic credit banks.",
    primaryDeficiencyTrigger: "Duplicate student records detected across multiple technical institutions.",
  },
  SITE_TITLE_ENCUMBRANCE: {
    category: "SITE_TITLE_ENCUMBRANCE",
    name: "Site Title & Encumbrance Certificate",
    issuingAuthority: "Competent Revenue Authority / Sub-Registrar",
    extractedEntities: ["Survey Numbers", "Encumbrance Status", "Search Period (>= 30 yrs)"],
    mandatoryConstraint: "Site title must be free from bank encumbrances or adverse property claims.",
    primaryDeficiencyTrigger: "Property encumbered by non-educational financial lien or court dispute.",
  },
};

export interface ExpiryAlert {
  documentId: string;
  documentFilename: string;
  category: string;
  expiryDate: string;
  daysRemaining: number;
  alertLevel: "EXPIRED" | "CRITICAL_30_DAYS" | "WARNING_60_DAYS" | "EARLY_90_DAYS" | "VALID";
  alertSeverity: "TIER_1_CRITICAL" | "TIER_2_HIGH" | "TIER_3_MEDIUM" | "NONE";
  message: string;
}

/**
 * Evaluates document expiry cascades at 90d, 60d, and 30d thresholds
 */
export function evaluateDocumentExpiry(
  doc: DocumentRecord,
  referenceDate: Date = new Date()
): ExpiryAlert | null {
  const expiryStr = doc.extractedFields?.expiryDate;
  if (!expiryStr) {
    return null;
  }

  const expDate = new Date(expiryStr);
  if (isNaN(expDate.getTime())) {
    return null;
  }

  const diffTime = expDate.getTime() - referenceDate.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysRemaining <= 0) {
    return {
      documentId: doc.id,
      documentFilename: doc.originalFilename,
      category: doc.category,
      expiryDate: expiryStr,
      daysRemaining,
      alertLevel: "EXPIRED",
      alertSeverity: "TIER_1_CRITICAL",
      message: `Certificate expired ${Math.abs(daysRemaining)} days ago on ${expiryStr}. Immediate renewal required.`,
    };
  } else if (daysRemaining <= 30) {
    return {
      documentId: doc.id,
      documentFilename: doc.originalFilename,
      category: doc.category,
      expiryDate: expiryStr,
      daysRemaining,
      alertLevel: "CRITICAL_30_DAYS",
      alertSeverity: "TIER_1_CRITICAL",
      message: `Critical: Certificate expires in ${daysRemaining} days (on ${expiryStr}). New intake requests locked until renewal is submitted.`,
    };
  } else if (daysRemaining <= 60) {
    return {
      documentId: doc.id,
      documentFilename: doc.originalFilename,
      category: doc.category,
      expiryDate: expiryStr,
      daysRemaining,
      alertLevel: "WARNING_60_DAYS",
      alertSeverity: "TIER_2_HIGH",
      message: `Administrative Notice: Certificate expires in ${daysRemaining} days (on ${expiryStr}). Initiate renewal with issuing authority.`,
    };
  } else if (daysRemaining <= 90) {
    return {
      documentId: doc.id,
      documentFilename: doc.originalFilename,
      category: doc.category,
      expiryDate: expiryStr,
      daysRemaining,
      alertLevel: "EARLY_90_DAYS",
      alertSeverity: "TIER_3_MEDIUM",
      message: `Early Warning: Certificate expires in ${daysRemaining} days (on ${expiryStr}). Schedule annual compliance inspection.`,
    };
  }

  return {
    documentId: doc.id,
    documentFilename: doc.originalFilename,
    category: doc.category,
    expiryDate: expiryStr,
    daysRemaining,
    alertLevel: "VALID",
    alertSeverity: "NONE",
    message: `Certificate valid for ${daysRemaining} more days (expires ${expiryStr}).`,
  };
}

/**
 * Validates canonical statutory document requirements across uploaded credentials
 */
export function validateStatutoryDocumentMatrix(
  documents: DocumentRecord[],
  referenceDate: Date = new Date()
): { findings: Finding[]; expiryAlerts: ExpiryAlert[] } {
  const findings: Finding[] = [];
  const expiryAlerts: ExpiryAlert[] = [];

  for (const doc of documents) {
    // 1. Expiry Cascade Check
    const expiryAlert = evaluateDocumentExpiry(doc, referenceDate);
    if (expiryAlert && expiryAlert.alertSeverity !== "NONE") {
      expiryAlerts.push(expiryAlert);
      findings.push({
        id: `f_exp_cascade_${doc.id}`,
        ruleId:
          expiryAlert.alertLevel === "EXPIRED" || expiryAlert.alertLevel === "CRITICAL_30_DAYS"
            ? "RULE_FIRE_NOC_EXPIRED"
            : "RULE_EXPIRED_CERTIFICATE",
        title: `${doc.originalFilename}: ${expiryAlert.alertLevel.replace(/_/g, " ")}`,
        severity: expiryAlert.alertSeverity,
        explanation: expiryAlert.message,
        documentId: doc.id,
        documentFilename: doc.originalFilename,
        suggestedAction: "Upload renewed statutory certificate approved by competent authority.",
        source: "DETERMINISTIC",
      });
    }

    // 2. Structural Stability Engineer Qualification Check
    if (
      doc.category === "STRUCTURAL_STABILITY_CERTIFICATE" ||
      doc.originalFilename.toLowerCase().includes("structural")
    ) {
      const text = (doc.extractedText || "").toLowerCase();
      const hasMasters =
        text.includes("m.tech") ||
        text.includes("m.e.") ||
        text.includes("master of engineering") ||
        text.includes("master of technology") ||
        text.includes("structural engineering");

      if (!hasMasters && text.length > 50) {
        findings.push({
          id: `f_struct_deg_${doc.id}`,
          ruleId: "RULE_STRUCTURAL_STABILITY_DEFECT",
          title: "Structural Engineer Lacks Mandated Master's Specialization",
          severity: "TIER_1_CRITICAL",
          explanation:
            "AICTE APH regulations mandate that Structural Stability Certificates must be certified by an engineer holding a Master's Degree (M.Tech/M.E.) in Structural Engineering.",
          documentId: doc.id,
          documentFilename: doc.originalFilename,
          suggestedAction:
            "Provide endorsement by a certified structural engineer holding an M.Tech / Master's degree in Structural Engineering.",
          source: "DETERMINISTIC",
        });
      }
    }

    // 3. Land / Building Lease Duration Check (>= 25 Years)
    if (
      doc.category === "LAND_BUILDING_LEASE_DEED" ||
      doc.originalFilename.toLowerCase().includes("lease")
    ) {
      const text = (doc.extractedText || "").toLowerCase();
      const leaseYearMatch = text.match(/(\d+)\s*(?:years|yrs)/);
      if (leaseYearMatch) {
        const years = parseInt(leaseYearMatch[1], 10);
        if (years < 25) {
          findings.push({
            id: `f_lease_term_${doc.id}`,
            ruleId: "RULE_TITLE_ENCUMBERED",
            title: `Land Lease Term Deficit: ${years} Years (< 25 Years Mandatory)`,
            severity: "TIER_1_CRITICAL",
            explanation: `The registered lease agreement specifies a duration of ${years} years. APH Appendix 4 mandates a minimum continuous lease period of 25 years.`,
            documentId: doc.id,
            documentFilename: doc.originalFilename,
            suggestedAction:
              "Execute and register a lease deed modification with a minimum validity of 25 continuous years.",
            source: "DETERMINISTIC",
          });
        }
      }
    }

    // 4. Land Use Certificate Check (Educational Purpose)
    if (
      doc.category === "LAND_USE_CERTIFICATE" ||
      doc.originalFilename.toLowerCase().includes("land")
    ) {
      const text = (doc.extractedText || "").toLowerCase();
      const isAgricultural = text.includes("agricultural") || text.includes("kheti");
      const isEducational = text.includes("educational") || text.includes("shikshan");

      if (isAgricultural && !isEducational && text.length > 50) {
        findings.push({
          id: `f_land_use_${doc.id}`,
          ruleId: "RULE_LAND_USE_INVALID",
          title: "Land Use Prohibited: Agricultural Classification Without Educational Conversion",
          severity: "TIER_1_CRITICAL",
          explanation:
            "Revenue documentation indicates agricultural land classification without the mandatory Non-Agricultural (NA) conversion order for Educational Purpose.",
          documentId: doc.id,
          documentFilename: doc.originalFilename,
          suggestedAction:
            "Obtain and upload official Collector / Sub-Divisional Officer Land Use Conversion order for Educational Purpose.",
          source: "DETERMINISTIC",
        });
      }
    }
  }

  return { findings, expiryAlerts };
}
