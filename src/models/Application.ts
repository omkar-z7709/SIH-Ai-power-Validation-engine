import mongoose, { Schema, Document } from "mongoose";
import { ApplicationRecord } from "@/types";

export interface IApplicationModel extends Omit<ApplicationRecord, "id">, Document {}

const FindingSchema = new Schema({
  id: { type: String, required: true },
  ruleId: { type: String, required: true },
  title: { type: String, required: true },
  severity: { type: String, required: true },
  explanation: { type: String, required: true },
  evidenceSnippet: { type: String },
  fieldValues: { type: Schema.Types.Mixed },
  documentId: { type: String },
  documentFilename: { type: String },
  page: { type: Number },
  suggestedAction: { type: String, required: true },
  source: { type: String, required: true },
  dismissed: { type: Boolean, default: false },
  dismissalReason: { type: String },
});

const DocumentRecordSchema = new Schema({
  id: { type: String, required: true },
  applicationId: { type: String, required: true },
  originalFilename: { type: String, required: true },
  storageKey: { type: String, required: true },
  mimeType: { type: String, required: true },
  sizeBytes: { type: Number, required: true },
  sha256Hash: { type: String, required: true },
  category: { type: String, required: true },
  categoryConfidence: { type: Number, default: 1.0 },
  extractionStatus: { type: String, required: true },
  extractedText: { type: String, default: "" },
  extractedFields: { type: Schema.Types.Mixed, default: {} },
  ocrConfidence: { type: Number },
  isScannedImage: { type: Boolean, default: false },
  provenance: {
    provider: { type: String },
    mode: { type: String, enum: ["live", "fallback", "mock"] },
  },
  findings: [FindingSchema],
  verificationStatus: { type: String, required: true },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true },
});

const ReviewRecordSchema = new Schema({
  id: { type: String, required: true },
  applicationId: { type: String, required: true },
  reviewerId: { type: String, required: true },
  reviewerName: { type: String, required: true },
  action: { type: String, required: true },
  outcomeStatus: { type: String, required: true },
  notes: { type: String, required: true },
  targetFindingId: { type: String },
  timestamp: { type: String, required: true },
});

const AuditEventSchema = new Schema({
  id: { type: String, required: true },
  applicationId: { type: String, required: true },
  documentId: { type: String },
  actor: { type: String, required: true },
  action: { type: String, required: true },
  details: { type: Schema.Types.Mixed },
  timestamp: { type: String, required: true },
});

const ApplicationSchema = new Schema<IApplicationModel>(
  {
    referenceId: { type: String, required: true, index: true },
    institutionId: { type: String, index: true },
    institutionName: { type: String, required: true, index: true },
    applicationType: { type: String, required: true },
    academicYear: { type: String, required: true },
    state: { type: String, required: true },
    region: { type: String, index: true },
    status: { type: String, required: true, index: true },
    documents: [DocumentRecordSchema],
    allFindings: [FindingSchema],
    reviews: [ReviewRecordSchema],
    auditTrail: [AuditEventSchema],
    assignedReviewer: { type: String },
    jevDecision: { type: Schema.Types.Mixed },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  { timestamps: false }
);

export const ApplicationModel =
  mongoose.models.Application || mongoose.model<IApplicationModel>("Application", ApplicationSchema);
