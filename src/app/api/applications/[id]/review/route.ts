import { NextResponse } from "next/server";
import { ReviewService } from "@/lib/review/review-service";
import { SubmitReviewActionSchema } from "@/lib/validation/schemas";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    body.applicationId = id;

    const validated = SubmitReviewActionSchema.parse(body);
    const updatedApp = await ReviewService.applyReviewAction(validated);

    return NextResponse.json({ success: true, data: updatedApp });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.errors ? err.errors : err.message },
      { status: 400 }
    );
  }
}
