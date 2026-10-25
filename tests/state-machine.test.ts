import { describe, it, expect } from "vitest";
import { ApplicationStateMachine } from "../src/lib/review/state-machine";

describe("Application State Machine & Guard Policies", () => {
  it("blocks approval when critical findings are active and unaddressed", () => {
    const result = ApplicationStateMachine.evaluateTransition(
      "NEEDS_REVIEW",
      "APPROVE",
      true // has unresolved critical findings
    );

    expect(result.allowed).toBe(false);
    expect(result.guardViolationReason).toContain("Guard Violation");
    expect(result.targetStatus).toBe("NEEDS_REVIEW");
  });

  it("permits approval when all critical findings are resolved or dismissed", () => {
    const result = ApplicationStateMachine.evaluateTransition(
      "NEEDS_REVIEW",
      "APPROVE",
      false // critical findings cleared
    );

    expect(result.allowed).toBe(true);
    expect(result.targetStatus).toBe("APPROVED_BY_REVIEWER");
  });

  it("allows rejection or clarification requests regardless of finding severity", () => {
    const rejectRes = ApplicationStateMachine.evaluateTransition(
      "NEEDS_REVIEW",
      "REJECT",
      true
    );
    expect(rejectRes.allowed).toBe(true);
    expect(rejectRes.targetStatus).toBe("REJECTED_BY_REVIEWER");

    const clarifyRes = ApplicationStateMachine.evaluateTransition(
      "NEEDS_REVIEW",
      "REQUEST_CLARIFICATION",
      true
    );
    expect(clarifyRes.allowed).toBe(true);
    expect(clarifyRes.targetStatus).toBe("RETURNED_FOR_CLARIFICATION");
  });
});
