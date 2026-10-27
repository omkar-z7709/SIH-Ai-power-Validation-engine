import { describe, it, expect } from "vitest";
import { calculateRiskScore } from "../src/lib/rules/risk-scoring";
import { ApplicationRecord } from "../src/types";

describe("Mathematical Risk Quantification Engine (S_risk)", () => {
  const baseApp: ApplicationRecord = {
    id: "app_test_risk",
    referenceId: "AICTE-2026-DEL-101",
    institutionName: "Apex Institute of Advanced Technology",
    applicationType: "EXTENSION_OF_APPROVAL",
    academicYear: "2026-27",
    state: "Delhi",
    status: "NEEDS_REVIEW",
    documents: [],
    allFindings: [],
    reviews: [],
    auditTrail: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it("yields Low Risk (0.00) and Fast-Track Bureau Clearance when zero findings exist", () => {
    const assessment = calculateRiskScore(baseApp);
    expect(assessment.riskScore).toBe(0);
    expect(assessment.riskTier).toBe("LOW_RISK");
    expect(assessment.regulatoryRoute).toBe("FAST_TRACK_CLEARANCE");
  });

  it("calculates Medium Risk and routes to 15-Day Rectification Window for moderate violations", () => {
    const appWithMediumRisk: ApplicationRecord = {
      ...baseApp,
      allFindings: [
        {
          id: "f_land",
          ruleId: "RULE_LAND_USE_INVALID",
          title: "Land Use Not Certified For Educational Purpose",
          severity: "TIER_1_CRITICAL",
          explanation: "Land designated as agricultural.",
          suggestedAction: "Obtain collector conversion.",
          source: "DETERMINISTIC",
          dismissed: false,
        },
        {
          id: "f_intake",
          ruleId: "RULE_INTAKE_CAPACITY_MISMATCH",
          title: "Intake Capacity Mismatch With University NOC",
          severity: "TIER_2_HIGH",
          explanation: "Requested intake exceeds affiliated capacity.",
          suggestedAction: "Align intake values.",
          source: "DETERMINISTIC",
          dismissed: false,
        },
      ],
    };

    // 0.25 (Land) + 0.08 (Intake) = 0.33 -> Medium Risk (0.30 <= S_risk < 0.70)
    const assessment = calculateRiskScore(appWithMediumRisk);
    expect(assessment.riskScore).toBe(0.33);
    expect(assessment.riskTier).toBe("MEDIUM_RISK");
    expect(assessment.regulatoryRoute).toBe("FIFTEEN_DAY_RECTIFICATION");
  });

  it("calculates High Risk (>= 0.70) and routes to EVC Priority Site Inspection for severe statutory deficits", () => {
    const appWithHighRisk: ApplicationRecord = {
      ...baseApp,
      allFindings: [
        {
          id: "f1",
          ruleId: "RULE_LAND_USE_INVALID",
          title: "Land Title Defect",
          severity: "TIER_1_CRITICAL",
          explanation: "Invalid title.",
          suggestedAction: "Clear title.",
          source: "DETERMINISTIC",
        },
        {
          id: "f2",
          ruleId: "RULE_FIRE_NOC_EXPIRED",
          title: "Fire Safety NOC Expired",
          severity: "TIER_1_CRITICAL",
          explanation: "Expired NOC.",
          suggestedAction: "Renew fire clearance.",
          source: "DETERMINISTIC",
        },
        {
          id: "f3",
          ruleId: "RULE_BUILT_UP_AREA_DEFICIT_CRITICAL",
          title: "Built-Up Area Deficit > 15%",
          severity: "TIER_1_CRITICAL",
          explanation: "Deficit.",
          suggestedAction: "Expand area.",
          source: "DETERMINISTIC",
        },
        {
          id: "f4",
          ruleId: "RULE_SPLIT_PLOT_DISTANCE_EXCEEDED",
          title: "Split Plot Separation > 2.0 km",
          severity: "TIER_1_CRITICAL",
          explanation: "Too far.",
          suggestedAction: "Consolidate.",
          source: "DETERMINISTIC",
        },
      ],
    };

    // 0.25 + 0.20 + 0.15 + 0.12 = 0.72 -> High Risk (>= 0.70)
    const assessment = calculateRiskScore(appWithHighRisk);
    expect(assessment.riskScore).toBe(0.72);
    expect(assessment.riskTier).toBe("HIGH_RISK");
    expect(assessment.regulatoryRoute).toBe("EXPERT_VISIT_COMMITTEE_PRIORITY");
  });

  it("ignores dismissed findings when computing risk score", () => {
    const appWithDismissed: ApplicationRecord = {
      ...baseApp,
      allFindings: [
        {
          id: "f_waived",
          ruleId: "RULE_LAND_USE_INVALID",
          title: "Land Title Defect",
          severity: "TIER_1_CRITICAL",
          explanation: "Waived by officer.",
          suggestedAction: "None.",
          source: "DETERMINISTIC",
          dismissed: true, // Dismissed!
        },
      ],
    };

    const assessment = calculateRiskScore(appWithDismissed);
    expect(assessment.riskScore).toBe(0);
    expect(assessment.riskTier).toBe("LOW_RISK");
  });
});
