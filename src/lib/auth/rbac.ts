import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "./session";
import { AccessScope, UserRole } from "@/types/auth";

export function isCollegeUser(role: UserRole): boolean {
  return role === "COLLEGE_ADMIN" || role === "COLLEGE_STAFF";
}

export function isOfficerUser(role: UserRole): boolean {
  return role === "REVIEW_OFFICER" || role === "SENIOR_OFFICER" || role === "SYSTEM_ADMIN";
}

export function canFinalizeDecision(role: UserRole): boolean {
  return role === "SENIOR_OFFICER" || role === "SYSTEM_ADMIN";
}

export function canSubmitApplication(role: UserRole): boolean {
  return role === "COLLEGE_ADMIN" || role === "SYSTEM_ADMIN";
}

export async function getSessionScope(req: NextRequest): Promise<AccessScope | null> {
  const token =
    req.cookies.get("aicte_session")?.value ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return null;
  }

  const payload = await verifySessionToken(token);
  if (!payload || !payload.userId || !payload.role) {
    return null;
  }

  return {
    userId: payload.userId,
    email: payload.email,
    name: payload.name,
    role: payload.role,
    institutionId: payload.institutionId,
    assignedJurisdiction: payload.assignedJurisdiction,
  };
}

export async function requireAuth(
  req: NextRequest,
  allowedRoles?: UserRole[]
): Promise<{ scope: AccessScope; error?: never } | { scope?: never; error: NextResponse }> {
  const scope = await getSessionScope(req);

  if (!scope) {
    return {
      error: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(scope.role)) {
    return {
      error: NextResponse.json({ success: false, error: "Forbidden: insufficient permissions" }, { status: 403 }),
    };
  }

  // Multi-tenant check: college users MUST have an institutionId bound
  if (isCollegeUser(scope.role) && !scope.institutionId) {
    return {
      error: NextResponse.json(
        { success: false, error: "Forbidden: no institution bound to account" },
        { status: 403 }
      ),
    };
  }

  return { scope };
}

export function withAuth(
  handler: (req: NextRequest, scope: AccessScope) => Promise<NextResponse>,
  allowedRoles?: UserRole[]
) {
  return async (req: NextRequest) => {
    const auth = await requireAuth(req, allowedRoles);
    if (auth.error) {
      return auth.error;
    }
    return handler(req, auth.scope);
  };
}
