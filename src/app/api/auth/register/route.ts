import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit, getClientIp } from "@/lib/auth/rate-limit";
import { UserModel } from "@/models/User";
import { connectDB } from "@/lib/db/connection";
import { hashPassword, createSessionToken, getSessionCookieOptions } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/audit/logger";

const RegisterSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Valid institutional or official email required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum([
    "COLLEGE_ADMIN",
    "COLLEGE_STAFF",
    "REVIEW_OFFICER",
    "SENIOR_OFFICER",
    "SYSTEM_ADMIN",
  ]),
  institutionName: z.string().optional(),
  jurisdictionState: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rate = rateLimit("register:" + ip, 6, 60000);
    if (!rate.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many registration attempts. Please wait." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const validated = RegisterSchema.parse(body);

    await connectDB();

    const existing = await UserModel.findOne({ email: validated.email.toLowerCase() });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "An account with this email address already exists. Please sign in." },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(validated.password);
    const now = new Date().toISOString();

    const institutionId =
      validated.role === "COLLEGE_ADMIN" || validated.role === "COLLEGE_STAFF"
        ? `inst_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
        : undefined;

    const newUser = await UserModel.create({
      name: validated.name.trim(),
      email: validated.email.toLowerCase().trim(),
      passwordHash,
      role: validated.role,
      institutionId,
      assignedJurisdiction: validated.jurisdictionState
        ? { state: validated.jurisdictionState }
        : undefined,
      isActive: true,
      isVerified: true,
      createdAt: now,
      updatedAt: now,
    });

    const token = await createSessionToken({
      userId: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      institutionId: newUser.institutionId,
      assignedJurisdiction: newUser.assignedJurisdiction,
    });

    await logAuditEvent({
      actorId: newUser.id,
      actor: newUser.email,
      actorRole: newUser.role,
      action: "REGISTER_SUCCESS",
      details: { role: newUser.role, institutionId: newUser.institutionId },
      ipAddress: ip,
    });

    const res = NextResponse.json({
      success: true,
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          institutionId: newUser.institutionId,
        },
      },
    });

    const cookieOpts = getSessionCookieOptions(token);
    res.cookies.set(cookieOpts.name, cookieOpts.value, cookieOpts);
    return res;
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.errors?.[0]?.message || err.message || "Registration failed" },
      { status: 400 }
    );
  }
}
