import mongoose, { Schema, Document } from "mongoose";

export interface IAuditEventModel extends Document {
  id: string;
  applicationId?: string;
  institutionId?: string;
  documentId?: string;
  actorId?: string;
  actor: string;
  actorRole?: string;
  action: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  timestamp: string;
}

const AuditEventSchema = new Schema<IAuditEventModel>(
  {
    id: { type: String, required: true, unique: true, index: true },
    applicationId: { type: String, index: true },
    institutionId: { type: String, index: true },
    documentId: { type: String },
    actorId: { type: String, index: true },
    actor: { type: String, required: true },
    actorRole: { type: String },
    action: { type: String, required: true, index: true },
    details: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
    timestamp: { type: String, required: true, index: true },
  },
  { timestamps: false }
);

export const AuditEventModel =
  mongoose.models.AuditEvent || mongoose.model<IAuditEventModel>("AuditEvent", AuditEventSchema);
