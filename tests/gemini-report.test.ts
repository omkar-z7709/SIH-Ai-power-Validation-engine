import { describe, it, expect } from "vitest";
import { groupApplicationFindings, generateGeminiNarrative } from "../src/lib/report/gemini-report";
import { ApplicationRecord } from "../src/types";

describe("Gemini Report Pipeline & Finding Deduplication", () => {
  const sampleApp: ApplicationRecord = {
    id: "app_test_dedup",
    referenceId: "AICTE-2026-DEL-101",
    institutionName: "Apex Institute of Advanced Technology",
    applicationType: "EXTENSION_OF_APPROVAL",
    academicYear: "2026-27",
    state: "Delhi",
    status: "NEEDS_REVIEW",
    documents: [
      {
        id: "doc1",
        applicationId: "app_test_dedup",
        originalFilename: "Doc1_Affidavit.pdf",
        storageKey: "k1",
        mimeType: "application/pdf",
        sizeBytes: 100,
        sha256Hash: "hash1",
        category: "UNDERTAKING",
        categoryConfidence: 0.9,
        extractionStatus: "SUCCESS",
        findings: [],
        extractedText: "Undertaking text",
        extractedFields: {},
        verificationStatus: "VERIFIED",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "doc2",
        applicationId: "app_test_dedup",
        originalFilename: "Doc2_NAAC.pdf",
        storageKey: "k2",
        mimeType: "application/pdf",
        sizeBytes: 100,
        sha256Hash: "hash2",
        category: "ACCREDITATION_CERTIFICATE",
        categoryConfidence: 0.9,
        extractionStatus: "SUCCESS",
        findings: [],
        extractedText: "NAAC text",
        extractedFields: {},
        verificationStatus: "VERIFIED",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    // 3 identical repeated findings on different documents
    allFindings: [
      {
        id: "f1",
        ruleId: "RULE_INSTITUTION_NAME_MISMATCH",
        severity: "TIER_1_CRITICAL",
        title: "Institution Legal Name Mismatch",
        explanation: "Divergence between registered and document name.",
        suggestedAction: "Submit gazette deed.",
        source: "DETERMINISTIC",
        documentFilename: "Doc1_Affidavit.pdf",
      },
      {
        id: "f2",
        ruleId: "RULE_INSTITUTION_NAME_MISMATCH",
        severity: "TIER_1_CRITICAL",
        title: "Institution Legal Name Mismatch",
        explanation: "Divergence between registered and document name.",
        suggestedAction: "Submit gazette deed.",
        source: "DETERMINISTIC",
        documentFilename: "Doc2_NAAC.pdf",
      },
      {
        id: "f3",
        ruleId: "RULE_EXPIRED_CERTIFICATE",
        severity: "TIER_2_HIGH",
        title: "Expired Accreditation Certificate",
        explanation: "NAAC valid until passed.",
        suggestedAction: "Provide renewed certificate.",
        source: "DETERMINISTIC",
        documentFilename: "Doc2_NAAC.pdf",
      },
    ],
    reviews: [],
    auditTrail: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it("deduplicates repeated identical findings across multiple documents into one grouped item", () => {
    const { groupedFindings, stats } = groupApplicationFindings(sampleApp);

    expect(stats.total).toBe(3);
    expect(stats.tier1).toBe(2);
    expect(stats.tier2).toBe(1);

    // Grouped items must be 2 (NAME_MISMATCH and EXPIRED_CERT)
    expect(groupedFindings.length).toBe(2);

    const nameMismatch = groupedFindings.find((g) => g.ruleId === "RULE_INSTITUTION_NAME_MISMATCH");
    expect(nameMismatch).toBeDefined();
    // Must record both affected files in affectedDocuments list
    expect(nameMismatch?.affectedDocuments).toContain("Doc1_Affidavit.pdf");
    expect(nameMismatch?.affectedDocuments).toContain("Doc2_NAAC.pdf");
  });

  it("generates structured Gemini narrative adhering to exact count bounds and verdict logic", async () => {
    const { groupedFindings, stats } = groupApplicationFindings(sampleApp);
    const prepared = {
      institution: sampleApp.institutionName,
      referenceId: sampleApp.referenceId,
      academicYear: sampleApp.academicYear,
      applicationType: sampleApp.applicationType,
      currentStatus: sampleApp.status,
      stats,
      groupedFindings,
    };

    const { narrative, provenance } = await generateGeminiNarrative(prepared);

    expect(narrative.verdict).toBe("NOT_READY"); // because tier1 > 0
    expect(narrative.stats.total).toBe(3);
    expect(narrative.stats.tier1).toBe(2);
    expect(narrative.stats.tier2).toBe(1);
    expect(narrative.executiveSummary.length).toBeGreaterThan(20);
    expect(narrative.officerChecklist.length).toBeGreaterThan(0);
    expect(provenance.model).toBeDefined();
  });
});
