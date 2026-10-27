import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isCollegeUser } from "@/lib/auth/rbac";
import { ApplicationRepository } from "@/lib/db/repository";
import { readFile } from "fs/promises";
import { join } from "path";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth.error) {
      return auth.error;
    }

    const url = new URL(req.url);
    const appId = url.searchParams.get("appId");
    const docId = url.searchParams.get("docId");

    const app: any = await ApplicationRepository.getById(appId || "", auth.scope);
    if (!app) {
      return new NextResponse("Not found", { status: 404 });
    }

    // Explicit check for cross-tenant ID access returning 404
    if (isCollegeUser(auth.scope.role)) {
      if (!auth.scope.institutionId || app.institutionId !== auth.scope.institutionId) {
        return new NextResponse("Not found", { status: 404 });
      }
    }

    const doc: any = (app.documents || []).find((d: any) => d.id === docId);
    if (!doc) {
      return new NextResponse("Not found", { status: 404 });
    }

    const filePath = join(process.cwd(), "storage", doc.storageKey);
    const buf = await readFile(filePath);
    return new NextResponse(buf, {
      status: 200,
      headers: { "Content-Type": doc.mimeType || "application/octet-stream" },
    });
  } catch (e: any) {
    return new NextResponse("Error reading file", { status: 500 });
  }
}
