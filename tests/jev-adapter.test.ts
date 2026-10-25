import { describe, it, expect } from "vitest";
import { jevAdapter } from "../src/lib/jev/jev-adapter";

describe("Jev Decision Adapter & Fallback Mode", () => {
  it("executes fallback mode transparently when API key is not present", async () => {
    const decision = await jevAdapter.getDecisionSupport({
      institutionName: "Apex Institute",
      referenceId: "AICTE-2026-TEST",
      documentCount: 2,
      deterministicFindings: [
        {
          id: "f1",
          ruleId: "RULE_EXPIRED_CERTIFICATE",
          title: "Potentially Expired Certificate",
          severity: "HIGH",
          explanation: "Expired in 2022",
          suggestedAction: "Check renewal",
          source: "DETERMINISTIC",
        },
      ],
      extractedSummary: {},
    });

    expect(decision).toBeDefined();
    expect(decision.isRuleBasedFallback).toBe(true);
    expect(decision.reviewPriority).toBe("STANDARD");
    expect(decision.proposedStatus).toBe("NEEDS_REVIEW");
    expect(decision.usedModel).toContain("Deterministic Rules Engine");
  });

  it("assigns URGENT priority for critical date order violations", async () => {
    const decision = await jevAdapter.getDecisionSupport({
      institutionName: "Apex Institute",
      referenceId: "AICTE-2026-TEST",
      documentCount: 3,
      deterministicFindings: [
        {
          id: "f_crit",
          ruleId: "RULE_INVALID_DATE_ORDER",
          title: "Issue Date Later Than Expiry",
          severity: "CRITICAL",
          explanation: "Issue: 2026-08 > Expiry: 2026-05",
          suggestedAction: "Investigate immediately",
          source: "DETERMINISTIC",
        },
      ],
      extractedSummary: {},
    });

    expect(decision.reviewPriority).toBe("URGENT");
  });
});
