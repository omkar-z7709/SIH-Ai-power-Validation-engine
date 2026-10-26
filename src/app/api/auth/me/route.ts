import { NextRequest, NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth/middleware";

export async function GET(req: NextRequest) {
  const ctx = await getSessionContext(req);
  if (!ctx) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ success: true, data: ctx });
}
