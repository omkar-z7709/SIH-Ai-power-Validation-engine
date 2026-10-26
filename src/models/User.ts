import mongoose, { Schema, Document } from "mongoose";
import { UserRecord } from "@/types/auth";

export interface IUserModel extends Omit<UserRecord, "id">, Document {}

const UserSchema = new Schema<IUserModel>(
  {
    email: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, index: true },
    institutionId: { type: String, index: true },
    assignedJurisdiction: {
      state: { type: String },
      district: { type: String },
    },
    isActive: { type: Boolean, default: true, index: true },
    isVerified: { type: Boolean, default: false },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  { timestamps: false }
);

export const UserModel = mongoose.models.User || mongoose.model<IUserModel>("User", UserSchema);
