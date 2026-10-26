import { z } from "zod";

export const UserRoleEnum = z.enum([
  "COLLEGE_ADMIN",
  "COLLEGE_STAFF",
  "REVIEW_OFFICER",
  "SENIOR_OFFICER",
  "SYSTEM_ADMIN",
]);

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const ResetPasswordRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(16),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const InviteUserSchema = z.object({
  email: z.string().email("Invalid email address").optional(),
  institutionId: z.string().min(1),
  role: UserRoleEnum,
  expiresInHours: z.number().int().min(1).max(72).optional(),
});

export const CreateInstitutionSchema = z.object({
  officialCode: z.string().min(3),
  name: z.string().min(3),
  legalEntityName: z.string().min(3),
  state: z.string().min(2),
  district: z.string().min(2),
  taluka: z.string().min(2),
  pinCode: z.string().regex(/^\d{6}$/),
  address: z.string().min(10),
});
