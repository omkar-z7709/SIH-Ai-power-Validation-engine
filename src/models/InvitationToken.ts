import mongoose, { Schema, Document } from "mongoose";
import { InvitationTokenRecord } from "@/types/auth";

export interface IInvitationTokenModel extends Omit<InvitationTokenRecord, "id">, Document {}

const InvitationTokenSchema = new Schema<IInvitationTokenModel>(
  {
    tokenHash: { type: String, required: true, unique: true, index: true },
    institutionId: { type: String, required: true, index: true },
    role: { type: String, required: true },
    targetEmail: { type: String },
    expiresAt: { type: String, required: true },
    used: { type: Boolean, default: false, index: true },
    usedAt: { type: String },
    usedBy: { type: String },
    createdBy: { type: String, required: true },
    createdAt: { type: String, required: true },
  },
  { timestamps: false }
);

export const InvitationTokenModel =
  mongoose.models.InvitationToken || mongoose.model<IInvitationTokenModel>("InvitationToken", InvitationTokenSchema);
