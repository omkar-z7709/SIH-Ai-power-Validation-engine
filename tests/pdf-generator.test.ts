import { describe, it, expect } from "vitest";
import { generateApplicationPdf } from "../src/lib/review/report-generator";
import { ApplicationRecord } from "../src/types";

describe("Color-Coded Statutory PDF Engine", () => {
  const sampleApp: ApplicationRecord = {
    id: "app_test_611",
    referenceId: "AICTE-2026-GJ-611",
    institutionId: "inst_sabarmati_611",
    institutionName: "Sabarmati Polytechnic & Engineering Center",
    applicationType: "NEW_INSTITUTE",
    academicYear: "2026-27",
    state: "Gujarat",
    status: "UNABLE_TO_PROCESS",
    documents: [
      {
        id: "doc_1",
        applicationId: "app_test_611",
        originalFilename: "Scanned_Corrupted_Application.pdf",
        storageKey: "doc_1_key.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024,
        sha256Hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        category: "APPLICATION_FORM",
        categoryConfidence: 1,
        extractedText: "",
        extractedFields: {},
        extractionStatus: "FAILED",
        verificationStatus: "VERIFICATION_FAILED",
        findings: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    allFindings: [
      {
        id: "finding_1",
        ruleId: "RULE_REQ_DOC_MISSING",
        severity: "TIER_2_HIGH",
        title: "Required Document Missing: ACCREDITATION CERTIFICATE",
        explanation:
          "Statutory norm violation: Mandatory accreditation documentation was not located in the uploaded credentials dossier.",
        suggestedAction:
          "Upload valid NBA / NAAC accreditation certificate certified by competent institutional authority.",
        source: "DETERMINISTIC",
        documentFilename: "General Application Form",
        dismissed: false,
      },
      {
        id: "finding_2",
        ruleId: "RULE_REQ_DOC_MISSING",
        severity: "TIER_1_CRITICAL",
        title: "Critical Defect: Land Ownership Title Deed Missing",
        explanation:
          "Immediate block: Statutory land ownership records could not be verified.",
        suggestedAction:
          "Provide registered lease / title deed in accordance with AICTE Approval Process Handbook Appendix 4.",
        source: "DETERMINISTIC",
        documentFilename: "General Application Form",
        dismissed: false,
      },
    ],
    reviews: [],
    auditTrail: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it("generates a valid binary PDF buffer with %PDF- header", async () => {
    const pdfBuffer = await generateApplicationPdf(sampleApp);
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(1000);

    const pdfHeader = pdfBuffer.subarray(0, 5).toString("utf-8");
    expect(pdfHeader).toBe("%PDF-");
  });

  it("evaluates verdict as critical violation when Tier 1 findings exist even if status was passing", async () => {
    const appWithPassingStatus: ApplicationRecord = {
      ...sampleApp,
      status: "PASSED_INITIAL_CHECKS",
    };
    const pdfBuffer = await generateApplicationPdf(appWithPassingStatus);
    const pdfText = pdfBuffer.toString("latin1");
    // Verdict should state CRITICAL VIOLATION / BLOCKED due to Tier 1 findings
    expect(pdfText).toContain("CRITICAL VIOLATION / BLOCKED");
  });
});
