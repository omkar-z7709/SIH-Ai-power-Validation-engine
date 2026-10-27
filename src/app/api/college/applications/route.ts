import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/rbac";
import { ApplicationRepository } from "@/lib/db/repository";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ["COLLEGE_ADMIN", "COLLEGE_STAFF"]);
    if (auth.error) {
      return auth.error;
    }

    if (!auth.scope.institutionId) {
      return NextResponse.json(
        { success: false, error: "No institution bound to user" },
        { status: 403 }
      );
    }

    const apps = await ApplicationRepository.getAll(auth.scope);
    return NextResponse.json({ success: true, data: apps });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
