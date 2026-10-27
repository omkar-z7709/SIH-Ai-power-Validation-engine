import { IRule, RuleExecutionContext, RuleRegistry } from "./rule-registry";
import { DocumentCategory, Finding, DocumentRecord } from "@/types";
import { isDateInPast, isIssueAfterExpiry } from "./rule-helpers";
import { compareEntitiesSemantically } from "./semantic-comparator";
import { validateStatutoryDocumentMatrix } from "../documents/statutory-document-matrix";
import { evaluateSpatialCompliance } from "./spatial-rules";
import { calculateRiskScore } from "./risk-scoring";

// 1. Tier 2: Mandatory AICTE Document Missing
export class RequiredDocumentsRule implements IRule {
  id = "RULE_REQ_DOC_MISSING";
  title = "Mandatory Statutory Document Missing";
  description = "Verifies presence of mandatory AICTE statutory documents.";

  private requiredCategories: DocumentCategory[] = [
    "APPLICATION_FORM",
    "ACCREDITATION_CERTIFICATE",
    "AFFILIATION_CERTIFICATE",
    "UNDERTAKING",
  ];

  evaluate(context: RuleExecutionContext): Finding[] {
    const findings: Finding[] = [];
    const submittedCategories = new Set(context.documents.map((d) => d.category));

    for (const reqCat of this.requiredCategories) {
      if (!submittedCategories.has(reqCat)) {
        findings.push({
          id: `f_missing_doc_${reqCat}`,
          ruleId: this.id,
          title: `Required Document Missing: ${reqCat.replace(/_/g, " ")}`,
          severity: "TIER_2_HIGH",
          explanation: `Application lacks mandatory statutory document: ${reqCat.replace(/_/g, " ")}.`,
          suggestedAction: `Request applicant to upload the official ${reqCat.replace(/_/g, " ")}.`,
          source: "DETERMINISTIC",
        });
      }
    }
    return findings;
  }
}

// 2. Tier 1: Duplicate File / Certificate Collision (Fraud / Resubmission Risk)
export class DuplicateDocumentRule implements IRule {
  id = "RULE_DUPLICATE_FILE";
  title = "Duplicate Document Upload Detected";
  description = "Identifies duplicate submissions by comparing SHA-256 cryptographic digests.";

  evaluate(context: RuleExecutionContext): Finding[] {
    const findings: Finding[] = [];
    const seenHashes = new Map<string, DocumentRecord>();

    for (const doc of context.documents) {
      if (seenHashes.has(doc.sha256Hash)) {
        const original = seenHashes.get(doc.sha256Hash)!;
        findings.push({
          id: `f_dup_file_${doc.id}`,
          ruleId: this.id,
          title: "Duplicate Document Upload Detected",
          severity: "TIER_1_CRITICAL",
          explanation: `File '${doc.originalFilename}' has the identical cryptographic SHA-256 hash as '${original.originalFilename}'. Potential duplicate file submission.`,
          evidenceSnippet: `SHA-256: ${doc.sha256Hash.substring(0, 16)}...`,
          documentId: doc.id,
          documentFilename: doc.originalFilename,
          suggestedAction: "Investigate whether applicant mistakenly submitted identical files or duplicate certificate.",
          source: "DETERMINISTIC",
        });
      } else {
        seenHashes.set(doc.sha256Hash, doc);
      }
    }
    return findings;
  }
}

// 3. Tier 2/3: Unreadable or Corrupted Extraction
export class ExtractionIntegrityRule implements IRule {
  id = "RULE_EXTRACTION_FAILURE";
  title = "Unreadable or Corrupted Document";
  description = "Detects files that failed machine-readable text extraction.";

  evaluate(context: RuleExecutionContext): Finding[] {
    const findings: Finding[] = [];

    for (const doc of context.documents) {
      if (doc.extractionStatus === "FAILED" || (!doc.extractedText && doc.sizeBytes > 100)) {
        findings.push({
          id: `f_extract_fail_${doc.id}`,
          ruleId: this.id,
          title: "Unreadable or Corrupted Document",
          severity: "TIER_2_HIGH",
          explanation: `Text extraction failed for '${doc.originalFilename}'. File may be corrupt, password-protected, or unreadable scan.`,
          documentId: doc.id,
          documentFilename: doc.originalFilename,
          suggestedAction: "Request unencrypted high-resolution document or execute multimodal OCR.",
          source: "DETERMINISTIC",
        });
      } else if (doc.extractionStatus === "PARTIAL") {
        findings.push({
          id: `f_extract_partial_${doc.id}`,
          ruleId: "RULE_EXTRACTION_LOW_TEXT",
          title: "Limited Extracted Characters",
          severity: "TIER_3_MEDIUM",
          explanation: `Document '${doc.originalFilename}' contains very few machine-readable characters. Manual visual inspection suggested.`,
          documentId: doc.id,
          documentFilename: doc.originalFilename,
          suggestedAction: "Inspect document preview manually.",
          source: "DETERMINISTIC",
        });
      }
    }
    return findings;
  }
}

// 4. Semantic Entity & Name Disambiguation Rule (AI / NLP-Powered)
// Distinguishes Tier 1 (Identity/Charter divergence like Dr S Rao vs Dr Suresh Rao, or College vs Polytechnic)
// from Tier 4 (Benign abbreviations like Inst. vs Institute)
export class SemanticEntityConsistencyRule implements IRule {
  id = "RULE_INSTITUTION_NAME_MISMATCH";
  title = "Entity Name Discrepancy";
  description = "Performs semantic evaluation to classify entity variations into 4 Risk Tiers.";

  evaluate(context: RuleExecutionContext): Finding[] {
    const findings: Finding[] = [];
    const appInstName = context.application.institutionName;

    for (const doc of context.documents) {
      const docInstName = doc.extractedFields?.institutionName;
      if (docInstName) {
        const comparison = compareEntitiesSemantically(appInstName, docInstName);

        // If not a pure cosmetic match, register finding under its calibrated tier
        if (!comparison.isCosmetic) {
          findings.push({
            id: `f_name_mismatch_${doc.id}`,
            ruleId: this.id,
            title: comparison.isAmbiguousIdentity
              ? "Potential Signatory Identity Divergence"
              : "Institution Name Discrepancy",
            severity: comparison.severity,
            explanation: `${comparison.reason} Document displays '${docInstName}' while master application records '${appInstName}'.`,
            evidenceSnippet: `Master: "${appInstName}" vs Document: "${docInstName}" (Match Confidence: ${(comparison.confidence * 100).toFixed(0)}%)`,
            fieldValues: {
              applicationInstitution: appInstName,
              documentInstitution: docInstName,
              isAmbiguousIdentity: comparison.isAmbiguousIdentity,
            },
            documentId: doc.id,
            documentFilename: doc.originalFilename,
            suggestedAction: comparison.isAmbiguousIdentity
              ? "Require notary affidavit confirming whether names denote the identical individual."
              : "Verify registered legal name change with Registrar of Societies or Trust Deed.",
            source: "DETERMINISTIC",
          });
        }
      }
    }
    return findings;
  }
}

// 5. Tier 3: Application Reference Number Mismatch
export class ReferenceNumberConsistencyRule implements IRule {
  id = "RULE_APP_NUMBER_MISMATCH";
  title = "Conflicting Reference Number";
  description = "Verifies cross-document reference numbers against master record.";

  evaluate(context: RuleExecutionContext): Finding[] {
    const findings: Finding[] = [];
    const masterRef = context.application.referenceId.trim().toUpperCase();

    for (const doc of context.documents) {
      const docAppNum = doc.extractedFields?.applicationNumber;
      if (docAppNum && masterRef) {
        const cleanDocApp = docAppNum.trim().toUpperCase();
        if (cleanDocApp !== masterRef && !cleanDocApp.includes(masterRef) && !masterRef.includes(cleanDocApp)) {
          findings.push({
            id: `f_ref_mismatch_${doc.id}`,
            ruleId: this.id,
            title: "Conflicting Reference Number",
            severity: "TIER_3_MEDIUM",
            explanation: `Document '${doc.originalFilename}' references identifier '${docAppNum}', differing from master record '${masterRef}'.`,
            evidenceSnippet: `Master: "${masterRef}" vs Document: "${docAppNum}"`,
            documentId: doc.id,
            documentFilename: doc.originalFilename,
            suggestedAction: "Ensure the attached document belongs to the active application cycle.",
            source: "DETERMINISTIC",
          });
        }
      }
    }
    return findings;
  }
}

// 6. Tier 2: Certificate Validity and Expiry
export class CertificateValidityRule implements IRule {
  id = "RULE_EXPIRED_CERTIFICATE";
  title = "Potentially Expired Certificate";
  description = "Validates that certificate expiry dates have not passed.";

  evaluate(context: RuleExecutionContext): Finding[] {
    const findings: Finding[] = [];

    for (const doc of context.documents) {
      const expiry = doc.extractedFields?.expiryDate;
      if (expiry && isDateInPast(expiry, context.referenceDate)) {
        findings.push({
          id: `f_expired_date_${doc.id}`,
          ruleId: this.id,
          title: "Potentially Expired Certificate",
          severity: "TIER_2_HIGH",
          explanation: `Document '${doc.originalFilename}' displays an expiry/validity date of '${expiry}', which is in the past.`,
          evidenceSnippet: `Expiry Date: ${expiry} (Evaluated against cycle: ${context.referenceDate.toISOString().split("T")[0]})`,
          documentId: doc.id,
          documentFilename: doc.originalFilename,
          suggestedAction: "Verify if renewal certification has been issued or requested from the issuing body.",
          source: "DETERMINISTIC",
        });
      }
    }
    return findings;
  }
}

// 7. Tier 1: Chronological Inversion (Issue Date > Expiry Date)
export class DateChronologyRule implements IRule {
  id = "RULE_INVALID_DATE_ORDER";
  title = "Issue Date Later Than Expiry Date";
  description = "Flags chronological inversions where issue date post-dates stated expiry.";

  evaluate(context: RuleExecutionContext): Finding[] {
    const findings: Finding[] = [];

    for (const doc of context.documents) {
      const issue = doc.extractedFields?.issueDate;
      const expiry = doc.extractedFields?.expiryDate;
      if (issue && expiry && isIssueAfterExpiry(issue, expiry)) {
        findings.push({
          id: `f_invalid_date_range_${doc.id}`,
          ruleId: this.id,
          title: "Issue Date Later Than Expiry Date",
          severity: "TIER_1_CRITICAL",
          explanation: `Chronological impossibility: Document '${doc.originalFilename}' has an issue date (${issue}) after its stated expiry date (${expiry}).`,
          evidenceSnippet: `Issue: ${issue} > Expiry: ${expiry}`,
          documentId: doc.id,
          documentFilename: doc.originalFilename,
          suggestedAction: "High-priority investigation: Possible clerical error or document tampering.",
          source: "DETERMINISTIC",
        });
      }
    }
    return findings;
  }
}

// 8. Tier 3: Statutory Authority Verification Required
export class StatutoryVerificationRule implements IRule {
  id = "RULE_VERIFICATION_REQUIRED";
  title = "Issuing Authority Verification Required";
  description = "Flags accreditation and affiliation claims requiring external registry lookup.";

  evaluate(context: RuleExecutionContext): Finding[] {
    const findings: Finding[] = [];

    for (const doc of context.documents) {
      if (
        doc.category === "ACCREDITATION_CERTIFICATE" ||
        doc.category === "AFFILIATION_CERTIFICATE"
      ) {
        findings.push({
          id: `f_verify_req_${doc.id}`,
          ruleId: this.id,
          title: "Issuing Authority Verification Required",
          severity: "TIER_3_MEDIUM",
          explanation: "Accreditation and affiliation documents require external validation against statutory portal (e.g. NAAC/NBA/University database).",
          documentId: doc.id,
          documentFilename: doc.originalFilename,
          suggestedAction: "Cross-reference certificate number with the statutory university or board portal.",
          source: "DETERMINISTIC",
        });
      }
    }
    return findings;
  }
}

// 9. Statutory 10-Document Matrix & Expiry Cascades
export class StatutoryMatrixRule implements IRule {
  id = "RULE_STATUTORY_MATRIX";
  title = "Statutory Document Matrix & Temporal Expiry Cascades";
  description = "Evaluates the 10 canonical statutory documents and 90d/60d/30d temporal expiry warnings.";

  evaluate(context: RuleExecutionContext): Finding[] {
    const { findings } = validateStatutoryDocumentMatrix(
      context.documents,
      context.referenceDate
    );
    return findings;
  }
}

// 10. Spatial & Built-Up Area Norms
export class SpatialNormsRule implements IRule {
  id = "RULE_SPATIAL_INFRASTRUCTURE";
  title = "Spatial & Built-Up Area Infrastructure Norms";
  description = "Computes TBUA, circulation area, allied lab sharing limits, and parcel contiguity.";

  evaluate(context: RuleExecutionContext): Finding[] {
    if (!context.application?.spatialBreakdown) {
      return [];
    }
    const result = evaluateSpatialCompliance(
      context.application.spatialBreakdown,
      context.application.id
    );
    return result.findings;
  }
}

export function createDefaultRuleRegistry(): RuleRegistry {
  const registry = new RuleRegistry();
  registry
    .register(new RequiredDocumentsRule())
    .register(new DuplicateDocumentRule())
    .register(new ExtractionIntegrityRule())
    .register(new SemanticEntityConsistencyRule())
    .register(new ReferenceNumberConsistencyRule())
    .register(new CertificateValidityRule())
    .register(new DateChronologyRule())
    .register(new StatutoryVerificationRule())
    .register(new StatutoryMatrixRule())
    .register(new SpatialNormsRule());
  return registry;
}

export const defaultRuleRegistry = createDefaultRuleRegistry();

export function runDeterministicValidation(
  app: any,
  referenceDate: Date = new Date()
) {
  const result = defaultRuleRegistry.evaluateAll({
    application: app,
    documents: app.documents || [],
    referenceDate,
  });

  const riskAssessment = calculateRiskScore(app, result.findings);

  return {
    ...result,
    riskAssessment,
  };
}
