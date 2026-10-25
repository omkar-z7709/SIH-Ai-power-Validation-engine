import { describe, it, expect } from "vitest";
import { runDeterministicValidation } from "../src/lib/rules/rules-engine";
import { ApplicationRecord } from "../src/types";

describe("Deterministic Rules Engine", () => {
  const baseApp: ApplicationRecord = {
    id: "app_test_1",
    referenceId: "AICTE-2026-TEST-01",
    institutionName: "Kalinga Institute of Technology",
    applicationType: "EXTENSION_OF_APPROVAL",
    academicYear: "2026-27",
    state: "Odisha",
    status: "INCOMPLETE",
    documents: [],
    allFindings: [],
    reviews: [],
    auditTrail: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it("flags missing mandatory documents when application is empty", () => {
    const { findings, computedStatus } = runDeterministicValidation({ ...baseApp });
    expect(computedStatus).toBe("INCOMPLETE");
    const missingDocs = findings.filter((f) => f.ruleId === "RULE_REQ_DOC_MISSING");
    expect(missingDocs.length).toBe(4); // Application form, NAAC/NBA, Affiliation, Undertaking
  });

  it("detects cross-document institution name mismatch", () => {
    const appWithMismatch: ApplicationRecord = {
      ...baseApp,
      documents: [
        {
          id: "doc_1",
          applicationId: baseApp.id,
          originalFilename: "App_Form.pdf",
          storageKey: "key_1",
          mimeType: "application/pdf",
          sizeBytes: 1000,
          sha256Hash: "hash_1",
          category: "APPLICATION_FORM",
          categoryConfidence: 1,
          extractionStatus: "SUCCESS",
          extractedText: "Application Form",
          extractedFields: {
            institutionName: "Kalinga Institute of Technology",
            applicationNumber: "AICTE-2026-TEST-01",
          },
          findings: [],
          verificationStatus: "NOT_REQUIRED",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "doc_2",
          applicationId: baseApp.id,
          originalFilename: "NAAC_Certificate.pdf",
          storageKey: "key_2",
          mimeType: "application/pdf",
          sizeBytes: 1000,
          sha256Hash: "hash_2",
          category: "ACCREDITATION_CERTIFICATE",
          categoryConfidence: 1,
          extractionStatus: "SUCCESS",
          extractedText: "NAAC Certificate",
          extractedFields: {
            institutionName: "Southern Polytechnic Institute", // Mismatch!
            certificateNumber: "NAAC/999",
            expiryDate: "2028-01-01",
          },
          findings: [],
          verificationStatus: "PENDING_VERIFICATION",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    };

    const { findings, computedStatus } = runDeterministicValidation(appWithMismatch);
    const mismatch = findings.find((f) => f.ruleId === "RULE_INSTITUTION_NAME_MISMATCH");
    expect(mismatch).toBeDefined();
    // In our 4-tier model, an entity mismatch between an Institute and a Polytechnic is properly classified as TIER_1_CRITICAL
    expect(mismatch?.severity).toBe("TIER_1_CRITICAL");
    expect(computedStatus).toBe("INCOMPLETE"); // Still missing affiliation & undertaking
  });

  it("detects duplicate document upload via SHA-256 hash collision", () => {
    const appWithDuplicate: ApplicationRecord = {
      ...baseApp,
      documents: [
        {
          id: "doc_1",
          applicationId: baseApp.id,
          originalFilename: "Doc_A.pdf",
          storageKey: "key_1",
          mimeType: "application/pdf",
          sizeBytes: 500,
          sha256Hash: "identical_hash_12345",
          category: "APPLICATION_FORM",
          categoryConfidence: 1,
          extractionStatus: "SUCCESS",
          extractedText: "Text",
          extractedFields: {},
          findings: [],
          verificationStatus: "NOT_REQUIRED",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "doc_2",
          applicationId: baseApp.id,
          originalFilename: "Doc_B_Copy.pdf",
          storageKey: "key_2",
          mimeType: "application/pdf",
          sizeBytes: 500,
          sha256Hash: "identical_hash_12345", // Collision!
          category: "OTHER_SUPPORTING",
          categoryConfidence: 1,
          extractionStatus: "SUCCESS",
          extractedText: "Text",
          extractedFields: {},
          findings: [],
          verificationStatus: "NOT_REQUIRED",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    };

    const { findings } = runDeterministicValidation(appWithDuplicate);
    const dup = findings.find((f) => f.ruleId === "RULE_DUPLICATE_FILE");
    expect(dup).toBeDefined();
    expect(dup?.title).toContain("Duplicate Document Upload Detected");
  });

  it("marks status as UNABLE_TO_PROCESS when an unreadable file is encountered", () => {
    const appWithFailedDoc: ApplicationRecord = {
      ...baseApp,
      documents: [
        {
          id: "doc_corrupted",
          applicationId: baseApp.id,
          originalFilename: "corrupted.pdf",
          storageKey: "key_c",
          mimeType: "application/pdf",
          sizeBytes: 2000,
          sha256Hash: "hash_c",
          category: "APPLICATION_FORM",
          categoryConfidence: 1,
          extractionStatus: "FAILED",
          extractedText: "",
          extractedFields: {},
          findings: [],
          verificationStatus: "NOT_REQUIRED",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    };

    const { computedStatus } = runDeterministicValidation(appWithFailedDoc);
    expect(computedStatus).toBe("UNABLE_TO_PROCESS");
  });
});
