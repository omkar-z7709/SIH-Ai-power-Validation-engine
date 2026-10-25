import { DecisionStatus } from "@/types";

export type ReviewActionType =
  | "APPROVE"
  | "REJECT"
  | "REQUEST_CLARIFICATION"
  | "ESCALATE"
  | "ACKNOWLEDGE_FLAG"
  | "DISMISS_FLAG";

export interface StateTransitionResult {
  allowed: boolean;
  targetStatus: DecisionStatus;
  guardViolationReason?: string;
}

export class ApplicationStateMachine {
  /**
   * Evaluates if a proposed officer action is legitimate given the current state and findings.
   */
  static evaluateTransition(
    currentStatus: DecisionStatus,
    action: ReviewActionType,
    hasUnresolvedCriticalFindings: boolean
  ): StateTransitionResult {
    // Guard 1: Terminal States Enforcement
    const isTerminal =
      currentStatus === "APPROVED_BY_REVIEWER" ||
      currentStatus === "REJECTED_BY_REVIEWER";

    if (isTerminal && action !== "ESCALATE" && action !== "DISMISS_FLAG" && action !== "ACKNOWLEDGE_FLAG") {
      return {
        allowed: false,
        targetStatus: currentStatus,
        guardViolationReason: `Guard Violation: Application is already finalized in terminal state '${currentStatus}'. Further approvals or rejections require formal escalation.`,
      };
    }

    switch (action) {
      case "APPROVE": {
        // Guard 2: Source State Validity for Approval
        if (currentStatus === "UNABLE_TO_PROCESS") {
          return {
            allowed: false,
            targetStatus: currentStatus,
            guardViolationReason:
              "Guard Violation: Cannot approve application while files remain unreadable or corrupted. Request replacement files or dismiss extraction errors first.",
          };
        }

        if (currentStatus === "INCOMPLETE") {
          return {
            allowed: false,
            targetStatus: currentStatus,
            guardViolationReason:
              "Guard Violation: Cannot approve incomplete application with missing mandatory documents.",
          };
        }

        if (hasUnresolvedCriticalFindings) {
          return {
            allowed: false,
            targetStatus: currentStatus,
            guardViolationReason:
              "Guard Violation: Cannot approve application while critical date or extraction violations remain unacknowledged or undismissed.",
          };
        }
        return {
          allowed: true,
          targetStatus: "APPROVED_BY_REVIEWER",
        };
      }

      case "REJECT": {
        return {
          allowed: true,
          targetStatus: "REJECTED_BY_REVIEWER",
        };
      }

      case "REQUEST_CLARIFICATION": {
        return {
          allowed: true,
          targetStatus: "RETURNED_FOR_CLARIFICATION",
        };
      }

      case "ESCALATE": {
        return {
          allowed: true,
          targetStatus: "AWAITING_HUMAN_REVIEW",
        };
      }

      case "ACKNOWLEDGE_FLAG":
      case "DISMISS_FLAG": {
        return {
          allowed: true,
          targetStatus: currentStatus,
        };
      }

      default:
        return {
          allowed: false,
          targetStatus: currentStatus,
          guardViolationReason: `Invalid transition action: ${action}`,
        };
    }
  }
}
