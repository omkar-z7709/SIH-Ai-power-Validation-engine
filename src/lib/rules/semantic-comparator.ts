import { FindingSeverity } from "@/types";

export interface SemanticComparisonResult {
  match: boolean;
  severity: FindingSeverity;
  reason: string;
  confidence: number;
  isCosmetic: boolean;
  isAmbiguousIdentity: boolean;
}

// 1. Common official abbreviation dictionary for benign institutional synonyms
const SYNONYMS: Record<string, string> = {
  inst: "institute",
  institution: "institute",
  tech: "technology",
  eng: "engineering",
  engg: "engineering",
  coll: "college",
  clg: "college",
  univ: "university",
  poly: "polytechnic",
  st: "saint",
  adv: "advanced",
  res: "research",
  mgmt: "management",
  dept: "department",
  govt: "government",
  dr: "doctor",
  prof: "professor",
  sh: "shri",
  smt: "shrimati",
};

export function cleanTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 0)
    .map((t) => SYNONYMS[t] || t);
}

/**
 * Checks if one name is an initial/abbreviated form of another (e.g. "Dr. S. Rao" vs "Dr. Suresh Rao").
 * This represents a POTENTIAL IDENTITY DIVERGENCE (Tier 1) rather than a mere typo,
 * because "S. Rao" could legally be Suresh Rao, Sunil Rao, or Santosh Rao.
 */
export function checkSignatoryIdentityDivergence(nameA: string, nameB: string): {
  isDivergence: boolean;
  initialsMatch: boolean;
  details: string;
} {
  const normA = nameA.toLowerCase().replace(/^(dr|prof|mr|mrs|shri|smt)\.?\s+/i, "").trim();
  const normB = nameB.toLowerCase().replace(/^(dr|prof|mr|mrs|shri|smt)\.?\s+/i, "").trim();

  if (normA === normB) {
    return { isDivergence: false, initialsMatch: true, details: "Exact name match." };
  }

  const partsA = normA.split(/[\s.]+/).filter(Boolean);
  const partsB = normB.split(/[\s.]+/).filter(Boolean);

  // If one has single-letter initial (e.g. ["s", "rao"] vs ["suresh", "rao"])
  if (partsA.length > 1 && partsB.length > 1) {
    const lastNameA = partsA[partsA.length - 1];
    const lastNameB = partsB[partsB.length - 1];

    if (lastNameA === lastNameB) {
      const firstA = partsA[0];
      const firstB = partsB[0];

      if (
        (firstA.length === 1 && firstB.startsWith(firstA)) ||
        (firstB.length === 1 && firstA.startsWith(firstB))
      ) {
        return {
          isDivergence: true,
          initialsMatch: true,
          details: `Signatory ambiguity: '${nameA}' vs '${nameB}' share initials and surname, but may represent distinct individuals.`,
        };
      }
    }
  }

  return { isDivergence: false, initialsMatch: false, details: "No initial expansion detected." };
}

/**
 * Semantic entity comparator that classifies name variations into the 4 Tiers:
 * - Tier 1: Identity / legal entity divergence (Dr S. Rao vs Dr Suresh Rao, or Institute vs Polytechnic)
 * - Tier 2: Different institution altogether (Apex Tech vs Vidya Vikas)
 * - Tier 3: Medium discrepancies (minor location suffix or course mismatch)
 * - Tier 4: Cosmetic variation (casing, punctuation, known abbreviations like Inst. vs Institute)
 */
export function compareEntitiesSemantically(
  targetName: string,
  candidateName: string
): SemanticComparisonResult {
  if (!targetName || !candidateName) {
    return {
      match: false,
      severity: "TIER_2_HIGH",
      reason: "Missing entity name on one of the documents.",
      confidence: 1.0,
      isCosmetic: false,
      isAmbiguousIdentity: false,
    };
  }

  const rawA = targetName.trim();
  const rawB = candidateName.trim();

  // 1. Exact match (case insensitive)
  if (rawA.toLowerCase() === rawB.toLowerCase()) {
    return {
      match: true,
      severity: "TIER_4_COSMETIC",
      reason: "Identical legal entity name.",
      confidence: 1.0,
      isCosmetic: true,
      isAmbiguousIdentity: false,
    };
  }

  // 2. Check for Signatory / Trustee Person Ambiguity (e.g. Dr S. Rao vs Dr Suresh Rao)
  const signatoryCheck = checkSignatoryIdentityDivergence(rawA, rawB);
  if (signatoryCheck.isDivergence) {
    return {
      match: false,
      severity: "TIER_1_CRITICAL",
      reason: `${signatoryCheck.details} (Requires legal affidavit of same-person identity).`,
      confidence: 0.94,
      isCosmetic: false,
      isAmbiguousIdentity: true,
    };
  }

  // 3. Normalized Token Comparison (resolves abbreviations: "Apex Inst. of Tech" == "Apex Institute of Technology")
  const tokensA = cleanTokens(rawA);
  const tokensB = cleanTokens(rawB);

  // Check institutional category conflict (College vs Polytechnic vs University)
  const categoryKeywords = ["polytechnic", "university", "school", "academy"];
  for (const kw of categoryKeywords) {
    const hasA = tokensA.includes(kw);
    const hasB = tokensB.includes(kw);
    if (hasA !== hasB) {
      return {
        match: false,
        severity: "TIER_1_CRITICAL",
        reason: `Institutional charter divergence: One document references '${kw}' while the other does not.`,
        confidence: 0.98,
        isCosmetic: false,
        isAmbiguousIdentity: false,
      };
    }
  }

  // Compare core content tokens
  const setA = new Set(tokensA.filter((t) => !["of", "and", "the", "in", "for"].includes(t)));
  const setB = new Set(tokensB.filter((t) => !["of", "and", "the", "in", "for"].includes(t)));

  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  const jaccard = union.size > 0 ? intersection.size / union.size : 0;

  // 4. Benign Abbreviation / Spacing Equivalence (Tier 4 Cosmetic)
  if (jaccard >= 0.85 || (setA.size === setB.size && [...setA].every((x) => setB.has(x)))) {
    return {
      match: true,
      severity: "TIER_4_COSMETIC",
      reason: "Cosmetic formatting or accepted standard abbreviation variation.",
      confidence: 0.95,
      isCosmetic: true,
      isAmbiguousIdentity: false,
    };
  }

  // 5. Significant mismatch across core words (Tier 2 High)
  if (jaccard < 0.4) {
    return {
      match: false,
      severity: "TIER_2_HIGH",
      reason: `Substantial legal entity name mismatch: "${rawA}" vs "${rawB}".`,
      confidence: 0.95,
      isCosmetic: false,
      isAmbiguousIdentity: false,
    };
  }

  // 6. Partial overlap (Tier 3 Medium)
  return {
    match: false,
    severity: "TIER_3_MEDIUM",
    reason: `Partial naming variation detected ("${rawA}" vs "${rawB}"). Officer verification suggested.`,
    confidence: 0.8,
    isCosmetic: false,
    isAmbiguousIdentity: false,
  };
}
