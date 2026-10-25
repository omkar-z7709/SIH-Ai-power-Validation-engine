import { describe, it, expect } from "vitest";
import {
  compareEntitiesSemantically,
  checkSignatoryIdentityDivergence,
} from "../src/lib/rules/semantic-comparator";

describe("Semantic Entity & 4-Tier Risk Comparator", () => {
  describe("Signatory & Personal Name Ambiguity (Tier 1 Critical)", () => {
    it("flags 'Dr. S. Rao' vs 'Dr. Suresh Rao' as Tier 1 Critical due to potential identity divergence", () => {
      const res = compareEntitiesSemantically("Dr. Suresh Rao", "Dr. S. Rao");
      expect(res.match).toBe(false);
      expect(res.severity).toBe("TIER_1_CRITICAL");
      expect(res.isAmbiguousIdentity).toBe(true);
      expect(res.reason).toContain("Signatory ambiguity");
    });

    it("identifies initial match expansion helper correctly", () => {
      const check = checkSignatoryIdentityDivergence("Dr. Suresh Rao", "Dr. S. Rao");
      expect(check.isDivergence).toBe(true);
      expect(check.initialsMatch).toBe(true);
    });

    it("treats completely identical signatory names as clean match", () => {
      const check = checkSignatoryIdentityDivergence("Dr. Suresh Rao", "Dr. Suresh Rao");
      expect(check.isDivergence).toBe(false);
    });
  });

  describe("Institutional Charter Divergence (Tier 1 Critical)", () => {
    it("flags 'Apex College of Engineering' vs 'Apex Polytechnic' as Tier 1 Critical", () => {
      const res = compareEntitiesSemantically(
        "Apex College of Engineering",
        "Apex Polytechnic"
      );
      expect(res.match).toBe(false);
      expect(res.severity).toBe("TIER_1_CRITICAL");
      expect(res.reason).toContain("Institutional charter divergence");
    });
  });

  describe("Substantial Entity Mismatch (Tier 2 High)", () => {
    it("flags completely unrelated institutions as Tier 2 High", () => {
      const res = compareEntitiesSemantically(
        "Kalinga Institute of Technology",
        "Vidya Vikas Memorial Trust"
      );
      expect(res.match).toBe(false);
      expect(res.severity).toBe("TIER_2_HIGH");
    });
  });

  describe("Benign & Cosmetic Variations (Tier 4 Cosmetic / Ignored)", () => {
    it("treats known abbreviations like 'Inst. of Tech' vs 'Institute of Technology' as Tier 4 Cosmetic", () => {
      const res = compareEntitiesSemantically(
        "Apex Institute of Technology",
        "Apex Inst. of Tech"
      );
      expect(res.match).toBe(true);
      expect(res.severity).toBe("TIER_4_COSMETIC");
      expect(res.isCosmetic).toBe(true);
    });

    it("treats pure casing and spacing differences as Tier 4 Cosmetic", () => {
      const res = compareEntitiesSemantically(
        "APEX INSTITUTE OF TECHNOLOGY",
        "Apex Institute Of Technology"
      );
      expect(res.match).toBe(true);
      expect(res.severity).toBe("TIER_4_COSMETIC");
      expect(res.isCosmetic).toBe(true);
    });
  });
});
