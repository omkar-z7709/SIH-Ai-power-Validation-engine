import { NextRequest, NextResponse } from "next/server";
import { getClearSessionCookieOptions } from "@/lib/auth/session";
import { getSessionContext } from "@/lib/auth/middleware";
import { logAuditEvent } from "@/lib/audit/logger";
import { getClientIp } from "@/lib/auth/rate-limit";

export async function POST(req: NextRequest) {
  const ctx = await getSessionContext(req);
  const ip = getClientIp(req);
  if (ctx) {
    await logAuditEvent({
      actorId: ctx.userId,
      actor: ctx.email,
      actorRole: ctx.role,
      action: "LOGOUT",
      ipAddress: ip,
    });
  }
  const res = NextResponse.json({ success: true });
  const cookieOpts = getClearSessionCookieOptions();
  res.cookies.set(cookieOpts.name, cookieOpts.value, cookieOpts);
  return res;
}
