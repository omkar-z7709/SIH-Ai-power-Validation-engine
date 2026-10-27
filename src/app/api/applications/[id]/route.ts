import { NextRequest, NextResponse } from "next/server";
import { ApplicationRepository } from "@/lib/db/repository";
import { requireAuth } from "@/lib/auth/rbac";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (auth.error) {
      return auth.error;
    }

    const { id } = await params;
    // Scoped getById returns null if application does not match college user's institutionId
    const app = await ApplicationRepository.getById(id, auth.scope);
    if (!app) {
      return NextResponse.json(
        { success: false, error: "Application not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: app });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
