import { ApplicationRecord, DecisionStatus, ReviewRecord, AuditEvent } from "@/types";
import { ApplicationRepository } from "../db/repository";
import { ApplicationStateMachine, ReviewActionType } from "./state-machine";

export interface ReviewActionInput {
  applicationId: string;
  reviewerId: string;
  reviewerName: string;
  action: ReviewActionType;
  outcomeStatus?: DecisionStatus;
  notes: string;
  targetFindingId?: string;
}

export class ReviewService {
  static async applyReviewAction(input: ReviewActionInput): Promise<ApplicationRecord> {
    const app = await ApplicationRepository.getById(input.applicationId);
    if (!app) {
      throw new Error(`Application with ID ${input.applicationId} not found`);
    }

    // Check transition guards: Tier 1 critical findings or unaddressed extraction failures block approval
    const hasUnresolvedCritical = app.allFindings.some(
      (f) =>
        !f.dismissed &&
        (f.severity === "TIER_1_CRITICAL" ||
          f.severity === "CRITICAL" ||
          f.ruleId === "RULE_EXTRACTION_FAILURE")
    );

    const transition = ApplicationStateMachine.evaluateTransition(
      app.status,
      input.action,
      hasUnresolvedCritical
    );

    if (!transition.allowed) {
      throw new Error(transition.guardViolationReason || "Transition denied by state machine guard.");
    }

    const timestamp = new Date().toISOString();
    const resolvedOutcomeStatus = transition.targetStatus;

    const reviewRecord: ReviewRecord = {
      id: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      applicationId: input.applicationId,
      reviewerId: input.reviewerId,
      reviewerName: input.reviewerName,
      action: input.action,
      outcomeStatus: resolvedOutcomeStatus,
      notes: input.notes,
      targetFindingId: input.targetFindingId,
      timestamp,
    };

    app.reviews.push(reviewRecord);
    app.status = resolvedOutcomeStatus;
    app.assignedReviewer = input.reviewerName;

    // Handle individual finding dismissals or acknowledgements
    if ((input.action === "DISMISS_FLAG" || input.action === "ACKNOWLEDGE_FLAG") && input.targetFindingId) {
      const isDismiss = input.action === "DISMISS_FLAG";
      const finding = app.allFindings.find((f) => f.id === input.targetFindingId);
      if (finding) {
        finding.dismissed = isDismiss;
        finding.dismissalReason = input.notes;
      }
      for (const doc of app.documents) {
        const docFinding = doc.findings.find((f) => f.id === input.targetFindingId);
        if (docFinding) {
          docFinding.dismissed = isDismiss;
          docFinding.dismissalReason = input.notes;
        }
      }
    }

    // Append-only Audit Trail on Application
    const auditEvent: AuditEvent = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      applicationId: input.applicationId,
      actor: `${input.reviewerName} (${input.reviewerId})`,
      action: `REVIEW_ACTION_${input.action}`,
      details: {
        newStatus: resolvedOutcomeStatus,
        notes: input.notes,
        targetFindingId: input.targetFindingId,
      },
      timestamp,
    };
    app.auditTrail.push(auditEvent);

    await ApplicationRepository.save(app);

    // Also persist directly to standalone AuditEventModel collection
    try {
      const { logAuditEvent } = await import("@/lib/audit/logger");
      await logAuditEvent({
        applicationId: input.applicationId,
        institutionId: app.institutionId,
        actorId: input.reviewerId,
        actor: input.reviewerName,
        actorRole: "REVIEW_OFFICER",
        action: `OFFICER_${input.action}`,
        details: {
          previousStatus: app.status,
          outcomeStatus: resolvedOutcomeStatus,
          notes: input.notes,
          targetFindingId: input.targetFindingId,
        },
      });
    } catch (auditErr) {
      console.warn("Global audit log error in ReviewService:", auditErr);
    }

    return app;
  }
}
