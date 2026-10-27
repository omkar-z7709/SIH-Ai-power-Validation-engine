import { NextRequest, NextResponse } from "next/server";
import { ReviewService } from "@/lib/review/review-service";
import { SubmitReviewActionSchema } from "@/lib/validation/schemas";
import { requireAuth, canFinalizeDecision } from "@/lib/auth/rbac";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request, ["REVIEW_OFFICER", "SENIOR_OFFICER", "SYSTEM_ADMIN"]);
    if (auth.error) {
      return auth.error;
    }

    const { id } = await params;
    const body = await request.json();
    body.applicationId = id;

    const validated = SubmitReviewActionSchema.parse(body);

    // Enforce 2-tier scrutiny: REVIEW_OFFICER cannot finalize Approve / Reject
    const isFinalDecision =
      validated.action === "APPROVE" ||
      validated.action === "REJECT" ||
      validated.outcomeStatus === "APPROVED_BY_REVIEWER" ||
      validated.outcomeStatus === "REJECTED_BY_REVIEWER";

    if (isFinalDecision && !canFinalizeDecision(auth.scope.role)) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden: Final Approve / Reject requires Senior Officer authority",
        },
        { status: 403 }
      );
    }

    validated.reviewerId = auth.scope.userId;
    validated.reviewerName = auth.scope.name;

    const updatedApp = await ReviewService.applyReviewAction(validated);
    return NextResponse.json({ success: true, data: updatedApp });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.errors ? err.errors : err.message },
      { status: 400 }
    );
  }
}
