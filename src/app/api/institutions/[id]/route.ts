import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/middleware";
import { connectDB } from "@/lib/db/connection";
import { InstitutionModel } from "@/models/Institution";

export const GET = requireRole([
  "SYSTEM_ADMIN",
  "SENIOR_OFFICER",
  "REVIEW_OFFICER",
])(async (_req: NextRequest, _ctx: any, routeContext?: { params: Promise<{ id: string }> }) => {
  try {
    const params = await routeContext?.params;
    const id = params?.id;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Institution ID is required" },
        { status: 400 }
      );
    }

    await connectDB();
    const institution = await InstitutionModel.findById(id).lean();

    if (!institution) {
      return NextResponse.json(
        { success: false, error: "Institution not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: institution });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch institution" },
      { status: 500 }
    );
  }
});
