import { NextResponse } from "next/server";
import { ApplicationRepository } from "@/lib/db/repository";
import { CreateApplicationSchema } from "@/lib/validation/schemas";
import { ApplicationRecord } from "@/types";
import { runDeterministicValidation } from "@/lib/rules/rules-engine";
import { jevAdapter } from "@/lib/jev/jev-adapter";

export async function GET() {
  try {
    const apps = await ApplicationRepository.getAll();
    return NextResponse.json({ success: true, data: apps });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = CreateApplicationSchema.parse(body);

    const now = new Date().toISOString();
    const newApp: ApplicationRecord = {
      id: `app_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      referenceId: validated.referenceId,
      institutionName: validated.institutionName,
      applicationType: validated.applicationType,
      academicYear: validated.academicYear,
      state: validated.state,
      status: "INCOMPLETE", // initial status until documents are uploaded and evaluated
      documents: [],
      allFindings: [],
      reviews: [],
      auditTrail: [
        {
          id: `audit_${Date.now()}`,
          applicationId: validated.referenceId,
          actor: "System / Applicant Portal",
          action: "APPLICATION_CREATED",
          details: { ...validated },
          timestamp: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    // Run initial deterministic check (e.g. missing documents)
    const { findings, computedStatus } = runDeterministicValidation(newApp);
    newApp.allFindings = findings;
    newApp.status = computedStatus;

    // Decision support from Jev (or rule-based fallback)
    const jevResult = await jevAdapter.getDecisionSupport({
      institutionName: newApp.institutionName,
      referenceId: newApp.referenceId,
      documentCount: 0,
      deterministicFindings: findings,
      extractedSummary: {},
    });
    newApp.jevDecision = jevResult;

    await ApplicationRepository.save(newApp);
    return NextResponse.json({ success: true, data: newApp }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.errors ? err.errors : err.message },
      { status: 400 }
    );
  }
}
