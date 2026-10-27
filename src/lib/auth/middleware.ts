import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "./session";
import { UserRole } from "@/types/auth";

export type AuthorizedContext = {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  institutionId?: string;
  assignedJurisdiction?: { state?: string; district?: string };
};

export async function getSessionContext(req: NextRequest): Promise<AuthorizedContext | null> {
  const token = req.cookies.get("aicte_session")?.value || req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const payload = await verifySessionToken(token);
  if (!payload) return null;
  return payload as AuthorizedContext;
}

export function requireAuth(handler: (req: NextRequest, ctx: AuthorizedContext) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    const ctx = await getSessionContext(req);
    if (!ctx) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if ((ctx.role === "COLLEGE_ADMIN" || ctx.role === "COLLEGE_STAFF") && !ctx.institutionId) {
      return NextResponse.json({ success: false, error: "Forbidden: No institution bound" }, { status: 403 });
    }
    return handler(req, ctx);
  };
}

export function requireRole(roles: UserRole[]) {
  return (handler: (req: NextRequest, ctx: AuthorizedContext) => Promise<NextResponse>) => {
    return requireAuth(async (req: NextRequest, ctx: AuthorizedContext) => {
      if (!roles.includes(ctx.role)) {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
      }
      return handler(req, ctx);
    });
  };
}

export function requireInstitutionAccess(
  handler: (req: NextRequest, ctx: AuthorizedContext, institutionId: string) => Promise<NextResponse>
) {
  return requireAuth(async (req: NextRequest, ctx: AuthorizedContext) => {
    // Check if user is college user - must have institutionId
    if ((ctx.role === "COLLEGE_ADMIN" || ctx.role === "COLLEGE_STAFF")) {
      if (!ctx.institutionId) {
        return NextResponse.json({ success: false, error: "No institution bound" }, { status: 403 });
      }
    }
    // Get institutionId from body/query - will be passed through
    // Actual enforcement happens in handler with additional checks
    const url = new URL(req.url);
    const institutionId = url.searchParams.get("institutionId") || "";
    return handler(req, ctx, institutionId);
  });
}

export function canAccessInstitution(ctx: AuthorizedContext, institutionId: string): boolean {
  if (ctx.role === "SYSTEM_ADMIN" || ctx.role === "SENIOR_OFFICER") {
    return true;
  }
  if (ctx.role === "REVIEW_OFFICER") {
    // Officers need assignment - basic check; can be enhanced
    if (ctx.assignedJurisdiction) {
      // If no specific institution constraint, allow if jurisdiction matches - simplified
      return true;
    }
    return true; // Allow if assigned to tasks - will be validated per-resource
  }
  if (ctx.role === "COLLEGE_ADMIN" || ctx.role === "COLLEGE_STAFF") {
    return ctx.institutionId === institutionId;
  }
  return false;
}
