import { DocumentCategory, DecisionStatus, Finding, FindingSeverity } from "./index";

export type UserRole =
  | "COLLEGE_ADMIN"
  | "COLLEGE_STAFF"
  | "REVIEW_OFFICER"
  | "SENIOR_OFFICER"
  | "SYSTEM_ADMIN";

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: UserRole;
  institutionId?: string; // Bound to an approved institution for COLLEGE_ADMIN and COLLEGE_STAFF
  assignedJurisdiction?: {
    state?: string;
    district?: string;
  };
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InstitutionRecord {
  id: string;
  officialCode: string; // Official permanent AICTE code e.g. "1-10928371"
  name: string;
  legalEntityName: string; // Trust / Society / Section 8 Company name
  state: string;
  district: string;
  taluka: string;
  pinCode: string;
  address: string;
  isVerified: boolean;
  verificationStatus: "PENDING_VERIFICATION" | "VERIFIED" | "REJECTED";
  verifiedAt?: string;
  verifiedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvitationTokenRecord {
  id: string;
  tokenHash: string; // Cryptographic SHA-256 hash of token
  institutionId: string;
  role: UserRole;
  targetEmail?: string;
  expiresAt: string;
  used: boolean;
  usedAt?: string;
  usedBy?: string;
  createdBy: string;
  createdAt: string;
}

export interface AuthSessionPayload {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  institutionId?: string;
  assignedJurisdiction?: {
    state?: string;
    district?: string;
  };
}

export type AccessScope = AuthSessionPayload;

export interface GeographicAdministrativeUnit {
  state: string;
  districts: {
    name: string;
    talukas: string[];
  }[];
}
