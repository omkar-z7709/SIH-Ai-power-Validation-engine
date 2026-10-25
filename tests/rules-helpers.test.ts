import { describe, it, expect } from "vitest";
import {
  parseFlexibleDate,
  isDateInPast,
  isIssueAfterExpiry,
  areInstitutionNamesConflicting,
  normalizeInstitutionName,
} from "../src/lib/rules/rule-helpers";

describe("Rule Helpers - Dates and Normalization", () => {
  it("parses multiple date formats reliably", () => {
    const d1 = parseFlexibleDate("2026-10-25");
    expect(d1).not.toBeNull();
    expect(d1?.getFullYear()).toBe(2026);

    const d2 = parseFlexibleDate("15-06-2024");
    expect(d2).not.toBeNull();
    expect(d2?.getFullYear()).toBe(2024);

    const d3 = parseFlexibleDate("31/07/2027");
    expect(d3).not.toBeNull();
    expect(d3?.getFullYear()).toBe(2027);
  });

  it("identifies past expired dates against reference date", () => {
    const reference = new Date("2026-10-25");
    expect(isDateInPast("2022-06-30", reference)).toBe(true);
    expect(isDateInPast("2029-06-14", reference)).toBe(false);
  });

  it("flags when issue date is later than expiry date", () => {
    expect(isIssueAfterExpiry("2026-08-15", "2026-05-01")).toBe(true);
    expect(isIssueAfterExpiry("2024-06-15", "2029-06-14")).toBe(false);
  });

  it("normalizes institution names and strips common academic noise tokens", () => {
    const norm = normalizeInstitutionName("Apex Institute of Advanced Technology & Engineering");
    expect(norm).toBe("apex advanced");
  });

  it("accurately detects conflicting institution names", () => {
    expect(
      areInstitutionNamesConflicting(
        "Apex Institute of Advanced Technology",
        "Apex Institute of Advanced Technology"
      )
    ).toBe(false);

    expect(
      areInstitutionNamesConflicting(
        "Apex Institute of Advanced Technology",
        "Vidya Vikas Memorial Polytechnic"
      )
    ).toBe(true);
  });
});
