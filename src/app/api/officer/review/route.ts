import { NextRequest, NextResponse } from "next/server";
import { requireAuth, canFinalizeDecision } from "@/lib/auth/rbac";
import { ReviewService } from "@/lib/review/review-service";
import { ApplicationRepository } from "@/lib/db/repository";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ["REVIEW_OFFICER", "SENIOR_OFFICER", "SYSTEM_ADMIN"]);
    if (auth.error) {
      return auth.error;
    }

    const body = await req.json();
    const { applicationId, action, notes, targetFindingId } = body;

    // Check final decision permission: only SENIOR_OFFICER / SYSTEM_ADMIN can finalize APPROVE / REJECT
    if ((action === "APPROVE" || action === "REJECT") && !canFinalizeDecision(auth.scope.role)) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden: Final Approve / Reject requires Senior Officer authority",
        },
        { status: 403 }
      );
    }

    const app: any = await ApplicationRepository.getById(applicationId, auth.scope);
    if (!app) {
      return NextResponse.json({ success: false, error: "Application not found" }, { status: 404 });
    }

    const updatedApp = await ReviewService.applyReviewAction({
      applicationId: app.id,
      reviewerId: auth.scope.userId,
      reviewerName: auth.scope.name,
      action: action || "ACKNOWLEDGE_FLAG",
      notes: notes || "",
      targetFindingId,
    });

    return NextResponse.json({ success: true, data: updatedApp });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
