import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { NativePdfExtractionProvider } from "../src/lib/documents/extraction-pipeline";
import { classifyDocument, extractFieldsFromText } from "../src/lib/documents/document-parser";
import { runDeterministicValidation } from "../src/lib/rules/rules-engine";
import { ApplicationRecord, DocumentRecord } from "../src/types";

describe("Phase 3: Synthetic Test Documents & Rules Engine Gate", () => {
  const dir = path.join(process.cwd(), "test-docs");
  const parser = new NativePdfExtractionProvider();

  it("extracts and evaluates Scenario A (Clean Statutory Form)", async () => {
    const fileA = fs.readFileSync(path.join(dir, "ScenarioA_Clean_Application.pdf"));
    const extraction = await parser.extract(fileA, "application/pdf", "ScenarioA_Clean_Application.pdf");

    expect(extraction.text).toContain("Apex Institute of Advanced Technology");
    expect(extraction.text).toContain("AICTE-2026-DEL-101");

    const classification = classifyDocument("ScenarioA_Clean_Application.pdf", extraction.text);
    expect(classification.category).toBe("APPLICATION_FORM");

    const fields = extractFieldsFromText(extraction.text, classification.category);
    expect(fields.institutionName).toBe("Apex Institute of Advanced Technology");
  });

  it("extracts and flags Scenario B (Name Mismatch & Expired NAAC)", async () => {
    const fileB = fs.readFileSync(path.join(dir, "ScenarioB_Flagged_Discrepancies.pdf"));
    const extraction = await parser.extract(fileB, "application/pdf", "ScenarioB_Flagged_Discrepancies.pdf");

    expect(extraction.text).toContain("Apex Polytechnic College");
    expect(extraction.text).toContain("2023");

    const classification = classifyDocument("ScenarioB_Flagged_Discrepancies.pdf", extraction.text);
    expect(classification.category).toBe("ACCREDITATION_CERTIFICATE");

    const fields = extractFieldsFromText(extraction.text, classification.category);
    expect(fields.institutionName).toBe("Apex Polytechnic College");
    expect(fields.expiryDate).toBeDefined();

    const docBRecord: DocumentRecord = {
      id: "doc_test_b",
      applicationId: "app_test_b",
      originalFilename: "ScenarioB_Flagged_Discrepancies.pdf",
      storageKey: "test_b",
      mimeType: "application/pdf",
      sizeBytes: fileB.length,
      sha256Hash: "hash_b",
      category: classification.category,
      categoryConfidence: 0.95,
      extractionStatus: "SUCCESS",
      extractedText: extraction.text,
      extractedFields: fields,
      findings: [],
      verificationStatus: "PENDING_VERIFICATION",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const mockApp: ApplicationRecord = {
      id: "app_test_b",
      referenceId: "AICTE-2026-DEL-101",
      institutionName: "Apex Institute of Advanced Technology",
      applicationType: "EXTENSION_OF_APPROVAL",
      academicYear: "2026-27",
      state: "Delhi",
      status: "NEEDS_REVIEW",
      documents: [docBRecord],
      allFindings: [],
      reviews: [],
      auditTrail: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { findings, computedStatus } = runDeterministicValidation(mockApp);

    // Rule 1: Missing Required Documents (Affiliation, Application Form, Undertaking)
    const missingDocs = findings.filter((f) => f.ruleId === "RULE_REQ_DOC_MISSING");
    expect(missingDocs.length).toBeGreaterThan(0);
    expect(missingDocs.some((f) => f.title.includes("AFFILIATION CERTIFICATE"))).toBe(true);

    // Rule 2: Institution Name Mismatch (Apex Polytechnic College vs Apex Institute of Advanced Technology)
    const nameMismatch = findings.find((f) => f.ruleId === "RULE_INSTITUTION_NAME_MISMATCH");
    expect(nameMismatch).toBeDefined();
    expect(nameMismatch?.severity).toBe("TIER_1_CRITICAL");

    // Rule 3: Expired Certificate (Expired in 2023)
    const expiredCert = findings.find((f) => f.ruleId === "RULE_EXPIRED_CERTIFICATE");
    expect(expiredCert).toBeDefined();

    // When required documents are missing, status is correctly categorized as INCOMPLETE
    expect(computedStatus).toBe("INCOMPLETE");
  });
});
