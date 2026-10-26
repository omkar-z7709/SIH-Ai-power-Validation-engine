import mongoose, { Schema, Document } from "mongoose";
import { InstitutionRecord } from "@/types/auth";

export interface IInstitutionModel extends Omit<InstitutionRecord, "id">, Document {}

const InstitutionSchema = new Schema<IInstitutionModel>(
  {
    officialCode: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, index: true },
    legalEntityName: { type: String, required: true },
    state: { type: String, required: true, index: true },
    district: { type: String, required: true, index: true },
    taluka: { type: String, required: true },
    pinCode: { type: String, required: true, index: true },
    address: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
    verificationStatus: { type: String, required: true, index: true },
    verifiedAt: { type: String },
    verifiedBy: { type: String },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  { timestamps: false }
);

InstitutionSchema.index({ state: 1, district: 1, taluka: 1 });
InstitutionSchema.index({ name: "text" });

export const InstitutionModel =
  mongoose.models.Institution || mongoose.model<IInstitutionModel>("Institution", InstitutionSchema);
