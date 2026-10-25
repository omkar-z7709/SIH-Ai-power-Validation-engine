import { NextResponse } from "next/server";
import { ApplicationRepository } from "@/lib/db/repository";
import { generateApplicationCsv, generateApplicationJson } from "@/lib/review/report-generator";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const format = url.searchParams.get("format") || "json";

    const app = await ApplicationRepository.getById(id);
    if (!app) {
      return NextResponse.json(
        { success: false, error: "Application not found" },
        { status: 404 }
      );
    }

    if (format === "csv") {
      const csv = generateApplicationCsv(app);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="aicte_report_${app.referenceId}.csv"`,
        },
      });
    }

    const json = generateApplicationJson(app);
    return new NextResponse(json, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="aicte_report_${app.referenceId}.json"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
