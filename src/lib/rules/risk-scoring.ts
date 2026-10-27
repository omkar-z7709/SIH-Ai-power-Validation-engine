import { ApplicationRecord, Finding } from "@/types";

export type RiskTier = "LOW_RISK" | "MEDIUM_RISK" | "HIGH_RISK";
export type RegulatoryRoute =
  | "FAST_TRACK_CLEARANCE"
  | "FIFTEEN_DAY_RECTIFICATION"
  | "EXPERT_VISIT_COMMITTEE_PRIORITY";

export interface RiskFactor {
  id: string;
  name: string;
  weight: number;
  violated: boolean;
  ruleIdMatched?: string;
  findingTitle?: string;
}

export interface RiskAssessment {
  riskScore: number; // 0.00 to 1.00
  riskTier: RiskTier;
  riskTierLabel: string;
  regulatoryRoute: RegulatoryRoute;
  routeLabel: string;
  recommendedAction: string;
  factors: RiskFactor[];
  activePenaltyCount: number;
  calculatedAt: string;
}

export const STATUTORY_SEVERITY_WEIGHTS = [
  {
    id: "LAND_TITLE_DEFECT",
    name: "Invalid Land Title / Non-Educational Land Use",
    weight: 0.25,
    rulePatterns: [
      "RULE_LAND_USE_INVALID",
      "RULE_TITLE_ENCUMBERED",
      "LAND_USE",
      "LAND_OWNERSHIP",
    ],
  },
  {
    id: "FIRE_SAFETY_NOC",
    name: "Expired / Missing Fire Safety NOC",
    weight: 0.2,
    rulePatterns: [
      "RULE_FIRE_NOC_EXPIRED",
      "RULE_FIRE_NOC_MISSING",
      "RULE_EXPIRED_CERTIFICATE",
      "FIRE_SAFETY",
    ],
  },
  {
    id: "BUILT_UP_AREA_DEFICIT",
    name: "Built-Up Area Deficit > 15%",
    weight: 0.15,
    rulePatterns: [
      "RULE_BUILT_UP_AREA_DEFICIT_CRITICAL",
      "RULE_BUILT_UP_AREA_DEFICIT",
      "TBUA",
    ],
  },
  {
    id: "PLOT_SEPARATION_CONTIGUITY",
    name: "Split Plot Separation > 2.0 km / Missing Main Plot Acreage",
    weight: 0.12,
    rulePatterns: [
      "RULE_SPLIT_PLOT_DISTANCE_EXCEEDED",
      "RULE_MAIN_PLOT_SIZE_DEFICIT",
      "RULE_PLOT_CONTIGUITY_METRO",
      "RULE_MAX_PARCELS_EXCEEDED",
      "RULE_AUXILIARY_PLOT_USAGE_VIOLATION",
    ],
  },
  {
    id: "BUILDING_LAYOUT_COA",
    name: "Unapproved Layout Plan / Non-CoA Architect",
    weight: 0.1,
    rulePatterns: [
      "RULE_COA_REGISTRATION_INVALID",
      "RULE_LAYOUT_PLAN_UNAPPROVED",
      "RULE_BUILDING_LAYOUT",
    ],
  },
  {
    id: "UNIVERSITY_INTAKE_MISMATCH",
    name: "University Affiliation Intake Mismatch",
    weight: 0.08,
    rulePatterns: [
      "RULE_INTAKE_CAPACITY_MISMATCH",
      "RULE_AFFILIATION_DEFICIT",
      "RULE_INSTITUTION_NAME_MISMATCH",
    ],
  },
  {
    id: "STRUCTURAL_STABILITY",
    name: "Structural Stability Engineer Lacks Master's Degree",
    weight: 0.05,
    rulePatterns: [
      "RULE_STRUCTURAL_STABILITY_DEFECT",
      "STRUCTURAL_STABILITY",
    ],
  },
  {
    id: "AFFIDAVIT_CADRE_DISCREPANCY",
    name: "Minor Cadre Ratio / Affidavit Phrasing Discrepancy",
    weight: 0.05,
    rulePatterns: [
      "RULE_AFFIDAVIT_WORDING_DISCREPANCY",
      "RULE_CADRE_RATIO_IMBALANCE",
      "RULE_STAMP_PAPER_UNDERVALUED",
    ],
  },
];

/**
 * Calculates mathematical risk score S_risk = sum(w_i * c_i)
 * across statutory non-compliance parameters and routes application.
 */
export function calculateRiskScore(
  application: ApplicationRecord,
  additionalFindings: Finding[] = []
): RiskAssessment {
  const allFindings = [...(application.allFindings || []), ...additionalFindings].filter(
    (f) => !f.dismissed
  );

  let totalScore = 0;
  const factors: RiskFactor[] = [];
  const matchedFindingIds = new Set<string>();

  for (const factorSpec of STATUTORY_SEVERITY_WEIGHTS) {
    const matchedFinding = allFindings.find((f) => {
      const ruleUpper = (f.ruleId || "").toUpperCase();
      const titleUpper = (f.title || "").toUpperCase();
      return factorSpec.rulePatterns.some(
        (pattern) => ruleUpper.includes(pattern) || titleUpper.includes(pattern)
      );
    });

    const isViolated = Boolean(matchedFinding);
    if (isViolated && matchedFinding) {
      matchedFindingIds.add(matchedFinding.id);
      totalScore += factorSpec.weight;
    }

    factors.push({
      id: factorSpec.id,
      name: factorSpec.name,
      weight: factorSpec.weight,
      violated: isViolated,
      ruleIdMatched: matchedFinding?.ruleId,
      findingTitle: matchedFinding?.title,
    });
  }

  // Account for other unassigned Tier 1 or Tier 2 findings
  const unmatchedFindings = allFindings.filter((f) => !matchedFindingIds.has(f.id));
  for (const uf of unmatchedFindings) {
    if (uf.severity === "TIER_1_CRITICAL" || (uf.severity as any) === "CRITICAL") {
      totalScore += 0.15;
    } else if (uf.severity === "TIER_2_HIGH" || (uf.severity as any) === "HIGH") {
      totalScore += 0.08;
    } else if (uf.severity === "TIER_3_MEDIUM" || (uf.severity as any) === "MEDIUM") {
      totalScore += 0.03;
    }
  }

  // Clamp risk score to [0.0, 1.0] and round to 2 decimals
  const finalScore = Math.min(1.0, Math.max(0.0, Number(totalScore.toFixed(2))));

  // Determine Risk Tier and E-Governance Route
  let riskTier: RiskTier = "LOW_RISK";
  let riskTierLabel = "Low Risk (Compliant)";
  let regulatoryRoute: RegulatoryRoute = "FAST_TRACK_CLEARANCE";
  let routeLabel = "Fast-Track Bureau Clearance";
  let recommendedAction =
    "Fast-track processing recommended for Regional Scrutiny Officer statutory sign-off.";

  if (finalScore >= 0.7) {
    riskTier = "HIGH_RISK";
    riskTierLabel = "High Risk (Critical Non-Compliance)";
    regulatoryRoute = "EXPERT_VISIT_COMMITTEE_PRIORITY";
    routeLabel = "EVC Priority Site Inspection";
    recommendedAction =
      "Mandatory on-site physical inspection by Expert Visit Committee (EVC) required before any statutory consideration.";
  } else if (finalScore >= 0.3) {
    riskTier = "MEDIUM_RISK";
    riskTierLabel = "Medium Risk (Conditional Deficiency)";
    regulatoryRoute = "FIFTEEN_DAY_RECTIFICATION";
    routeLabel = "15-Day Institutional Rectification Window";
    recommendedAction =
      "Issue formal Deficiency Notice with 15-day rectification window to cure specific documentation defects.";
  }

  return {
    riskScore: finalScore,
    riskTier,
    riskTierLabel,
    regulatoryRoute,
    routeLabel,
    recommendedAction,
    factors,
    activePenaltyCount: factors.filter((f) => f.violated).length,
    calculatedAt: new Date().toISOString(),
  };
}
