import { NextRequest, NextResponse } from "next/server";

const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();

export function rateLimit(identifier: string, maxAttempts = 5, windowMs = 60000) {
  const now = Date.now();
  const record = loginAttempts.get(identifier);
  if (!record || now - record.lastAttempt > windowMs) {
    loginAttempts.set(identifier, { count: 1, lastAttempt: now });
    return { allowed: true, remaining: maxAttempts - 1 };
  }
  if (record.count >= maxAttempts) {
    return { allowed: false, remaining: 0 };
  }
  record.count += 1;
  record.lastAttempt = now;
  return { allowed: true, remaining: maxAttempts - record.count };
}

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}
