import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/rbac";
import { ApplicationRepository } from "@/lib/db/repository";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ["REVIEW_OFFICER", "SENIOR_OFFICER", "SYSTEM_ADMIN"]);
    if (auth.error) {
      return auth.error;
    }

    const apps = await ApplicationRepository.getAll(auth.scope);
    const counts = {
      total: apps.length,
      needsReview: apps.filter((a: any) => a.status === "NEEDS_REVIEW").length,
      pending: apps.filter(
        (a: any) => a.status === "INCOMPLETE" || a.status === "AWAITING_HUMAN_REVIEW"
      ).length,
      approved: apps.filter((a: any) => a.status === "APPROVED_BY_REVIEWER").length,
      rejected: apps.filter((a: any) => a.status === "REJECTED_BY_REVIEWER").length,
      storageMode: ApplicationRepository.getStorageMode(),
    };

    return NextResponse.json({ success: true, data: counts });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
