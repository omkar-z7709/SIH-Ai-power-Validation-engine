import { z } from "zod";

export const DocumentCategoryEnum = z.enum([
  "APPLICATION_FORM",
  "ACCREDITATION_CERTIFICATE",
  "AFFILIATION_CERTIFICATE",
  "UNDERTAKING",
  "LAND_BUILDING_DOCUMENT",
  "OTHER_SUPPORTING",
]);

export const DecisionStatusEnum = z.enum([
  "PASSED_INITIAL_CHECKS",
  "INCOMPLETE",
  "NEEDS_REVIEW",
  "VERIFICATION_REQUIRED",
  "VERIFICATION_FAILED",
  "UNABLE_TO_PROCESS",
  "AWAITING_HUMAN_REVIEW",
  "APPROVED_BY_REVIEWER",
  "RETURNED_FOR_CLARIFICATION",
  "REJECTED_BY_REVIEWER",
]);

export const FindingSeverityEnum = z.enum([
  "TIER_1_CRITICAL",
  "TIER_2_HIGH",
  "TIER_3_MEDIUM",
  "TIER_4_COSMETIC",
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
  "INFO",
]);

export const FindingSourceEnum = z.enum(["DETERMINISTIC", "MODEL_GENERATED", "EXTERNALLY_VERIFIED"]);

export const CreateApplicationSchema = z.object({
  referenceId: z.string().min(3, "Reference ID must be at least 3 characters"),
  institutionName: z.string().min(3, "Institution name must be at least 3 characters"),
  applicationType: z.enum([
    "NEW_INSTITUTE",
    "EXTENSION_OF_APPROVAL",
    "INCREASE_IN_INTAKE",
    "CLOSURE",
  ]),
  academicYear: z.string().regex(/^\d{4}-\d{2,4}$/, "Academic year must be format YYYY-YY (e.g. 2026-27)"),
  state: z.string().min(2, "State name required"),
  region: z.string().optional(),
});

export const SubmitReviewActionSchema = z.object({
  applicationId: z.string(),
  reviewerId: z.string(),
  reviewerName: z.string(),
  action: z.enum([
    "APPROVE",
    "REJECT",
    "REQUEST_CLARIFICATION",
    "ESCALATE",
    "ACKNOWLEDGE_FLAG",
    "DISMISS_FLAG",
  ]),
  outcomeStatus: DecisionStatusEnum,
  notes: z.string().min(3, "Review notes must be provided"),
  targetFindingId: z.string().optional(),
});
