export type DocumentCategory =
  | "APPLICATION_FORM"
  | "ACCREDITATION_CERTIFICATE"
  | "AFFILIATION_CERTIFICATE"
  | "UNDERTAKING"
  | "LAND_BUILDING_DOCUMENT"
  | "OTHER_SUPPORTING";

export type DecisionStatus =
  | "PASSED_INITIAL_CHECKS"
  | "INCOMPLETE"
  | "NEEDS_REVIEW"
  | "VERIFICATION_REQUIRED"
  | "VERIFICATION_FAILED"
  | "UNABLE_TO_PROCESS"
  | "AWAITING_HUMAN_REVIEW"
  | "APPROVED_BY_REVIEWER"
  | "RETURNED_FOR_CLARIFICATION"
  | "REJECTED_BY_REVIEWER";

export type FindingSeverity =
  | "TIER_1_CRITICAL"
  | "TIER_2_HIGH"
  | "TIER_3_MEDIUM"
  | "TIER_4_COSMETIC"
  // Legacy aliases for backward compatibility
  | "CRITICAL"
  | "HIGH"
  | "MEDIUM"
  | "LOW"
  | "INFO";

export type FindingSource = "DETERMINISTIC" | "MODEL_GENERATED" | "EXTERNALLY_VERIFIED";

export interface Finding {
  id: string;
  ruleId: string;
  title: string;
  severity: FindingSeverity;
  explanation: string;
  evidenceSnippet?: string;
  fieldValues?: Record<string, unknown>;
  documentId?: string;
  documentFilename?: string;
  page?: number;
  suggestedAction: string;
  source: FindingSource;
  dismissed?: boolean;
  dismissalReason?: string;
}

export interface ExtractedFields {
  institutionName?: string;
  applicationNumber?: string;
  certificateNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  institutionAddress?: string;
  issuingAuthority?: string;
  registrationNumber?: string;
  accreditationGrade?: string;
  contactEmail?: string;
  signatoryName?: string;
  courseApproved?: string;
  annualIntake?: string;
  [key: string]: string | undefined;
}

export interface DocumentRecord {
  id: string;
  applicationId: string;
  originalFilename: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  sha256Hash: string;
  category: DocumentCategory;
  categoryConfidence: number;
  extractionStatus: "SUCCESS" | "FAILED" | "PARTIAL" | "NOT_STARTED";
  extractedText: string;
  extractedFields: ExtractedFields;
  ocrConfidence?: number;
  isScannedImage?: boolean;
  provenance?: {
    provider: string;
    mode: "live" | "fallback" | "mock";
  };
  findings: Finding[];
  verificationStatus: "VERIFIED" | "PENDING_VERIFICATION" | "VERIFICATION_FAILED" | "NOT_REQUIRED";
  createdAt: string;
  updatedAt: string;
}

export interface ReviewRecord {
  id: string;
  applicationId: string;
  reviewerId: string;
  reviewerName: string;
  action: "APPROVE" | "REJECT" | "REQUEST_CLARIFICATION" | "ESCALATE" | "ACKNOWLEDGE_FLAG" | "DISMISS_FLAG";
  outcomeStatus: DecisionStatus;
  notes: string;
  targetFindingId?: string;
  timestamp: string;
}

export interface AuditEvent {
  id: string;
  applicationId: string;
  documentId?: string;
  actor: string;
  action: string;
  details: Record<string, unknown>;
  timestamp: string;
}

export interface ApplicationRecord {
  id: string;
  referenceId: string;
  institutionId?: string;
  institutionName: string;
  applicationType: "NEW_INSTITUTE" | "EXTENSION_OF_APPROVAL" | "INCREASE_IN_INTAKE" | "CLOSURE";
  academicYear: string;
  state: string;
  status: DecisionStatus;
  documents: DocumentRecord[];
  allFindings: Finding[];
  reviews: ReviewRecord[];
  auditTrail: AuditEvent[];
  assignedReviewer?: string;
  jevDecision?: {
    usedModel: string;
    proposedStatus: DecisionStatus;
    reviewPriority: "URGENT" | "STANDARD" | "LOW";
    recommendedNextStep: string;
    advisoryNotes: string;
    timestamp: string;
    isRuleBasedFallback: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationSummary {
  id: string;
  referenceId: string;
  institutionName: string;
  academicYear: string;
  state: string;
  status: DecisionStatus;
  documentCount: number;
  findingCount: number;
  highSeverityCount: number;
  assignedReviewer?: string;
  updatedAt: string;
}
