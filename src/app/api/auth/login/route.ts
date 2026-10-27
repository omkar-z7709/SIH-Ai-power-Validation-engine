import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/auth/rate-limit";
import { LoginSchema } from "@/lib/validation/auth-schemas";
import { UserModel } from "@/models/User";
import { connectDB } from "@/lib/db/connection";
import {
  verifyPassword,
  createSessionToken,
  getSessionCookieOptions,
} from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/audit/logger";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rate = rateLimit("login:" + ip, 15, 60000); // 15 attempts per minute
    if (!rate.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many login attempts. Try again later." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const validated = LoginSchema.parse(body);

    let cleanEmail = validated.email.toLowerCase().trim();
    // Common typo tolerance for AICTE domain
    if (cleanEmail.endsWith("@aict.gov.in")) {
      cleanEmail = cleanEmail.replace("@aict.gov.in", "@aicte.gov.in");
    }

    await connectDB();
    const user: any = await UserModel.findOne({ email: cleanEmail });

    if (!user || !user.isActive) {
      await logAuditEvent({
        actor: validated.email,
        action: "LOGIN_FAILED",
        details: { reason: "invalid_user_or_inactive" },
        ipAddress: ip,
      });
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(validated.password, user.passwordHash);
    if (!valid) {
      await logAuditEvent({
        actorId: user.id,
        actor: user.email,
        actorRole: user.role,
        action: "LOGIN_FAILED",
        details: { reason: "invalid_password" },
        ipAddress: ip,
      });
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      institutionId: user.institutionId,
      assignedJurisdiction: user.assignedJurisdiction,
    });

    await logAuditEvent({
      actorId: user.id,
      actor: user.email,
      actorRole: user.role,
      action: "LOGIN_SUCCESS",
      ipAddress: ip,
    });

    const res = NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          institutionId: user.institutionId,
        },
      },
    });

    const cookieOpts = getSessionCookieOptions(token);
    res.cookies.set(cookieOpts.name, cookieOpts.value, cookieOpts);
    return res;
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.errors || err.message },
      { status: 400 }
    );
  }
}
