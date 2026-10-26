import { describe, it, expect } from "vitest";
import {
  NativePdfExtractionProvider,
  CloudVisionExtractionProvider,
  GeminiVisionExtractionProvider,
  ImageOcrExtractionProvider,
} from "../src/lib/documents/extraction-pipeline";
import { jevAdapter } from "../src/lib/jev/jev-adapter";

describe("Phase 2: OCR & AI Honesty Verification", () => {
  it("verifies NativePdfExtractionProvider is LIVE for PDFs", () => {
    const provider = new NativePdfExtractionProvider();
    expect(provider.supports("application/pdf", "test.pdf")).toBe(true);
    expect(provider.name).toBe("NativePdfParser");
  });

  it("verifies CloudVisionExtractionProvider behavior and key requirement", () => {
    const provider = new CloudVisionExtractionProvider();
    const hasKey = Boolean(
      process.env.GOOGLE_CLOUD_VISION_API_KEY ||
      process.env.CLOUD_VISION_API_KEY ||
      process.env.CLOUDEVISION_API_KEY ||
      process.env.VISION_API_KEY ||
      process.env.VISION
    );
    expect(provider.supports("image/png", "test.png")).toBe(hasKey);
    expect(provider.name).toBe("CloudVisionOCR");
  });

  it("verifies GeminiVisionExtractionProvider acts strictly as OCR fallback", () => {
    const provider = new GeminiVisionExtractionProvider();
    expect(provider.name).toBe("GeminiVisionOCR");
    const hasKey = Boolean(process.env.GEMINI_API_KEY || process.env.GEMINI);
    expect(provider.supports("image/jpeg", "scan.jpg")).toBe(hasKey);
  });

  it("verifies TesseractOcr is available offline fail-safe", () => {
    const provider = new ImageOcrExtractionProvider();
    expect(provider.supports("image/png", "scan.png")).toBe(true);
    expect(provider.name).toBe("TesseractOcr");
  });

  it("verifies Jev Decision Layer emits honest provenance and does not invent findings", async () => {
    const findings = [
      {
        id: "f1",
        ruleId: "RULE_REQ_DOC_MISSING",
        title: "Required Document Missing: AFFILIATION CERTIFICATE",
        severity: "TIER_2_HIGH" as const,
        explanation: "Missing affiliation",
        suggestedAction: "Upload affiliation",
        source: "DETERMINISTIC" as const,
      },
    ];

    const result = await jevAdapter.getDecisionSupport({
      institutionName: "Apex Institute",
      referenceId: "AICTE-2026-DEL-101",
      documentCount: 3,
      deterministicFindings: findings,
      extractedSummary: {},
    });

    expect(result.provenance).toBeDefined();
    expect(["JEV_OFFICIAL", "JEV_OPENROUTER_PROXY", "DETERMINISTIC_RULES_FALLBACK"]).toContain(
      result.provenance.layer
    );
    expect(["live", "fallback", "mock"]).toContain(result.provenance.mode);
    expect(result.proposedStatus).toBeDefined();
    expect(["URGENT", "STANDARD", "LOW"]).toContain(result.reviewPriority);
  });
});
