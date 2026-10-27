import { NextRequest, NextResponse } from "next/server";
import { ApplicationRepository } from "@/lib/db/repository";
import { CreateApplicationSchema } from "@/lib/validation/schemas";
import { ApplicationRecord } from "@/types";
import { runDeterministicValidation } from "@/lib/rules/rules-engine";
import { jevAdapter } from "@/lib/jev/jev-adapter";
import { requireAuth, canSubmitApplication, isCollegeUser } from "@/lib/auth/rbac";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth.error) {
      return auth.error;
    }

    const apps = await ApplicationRepository.getAll(auth.scope);
    return NextResponse.json({ success: true, data: apps });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth.error) {
      return auth.error;
    }

    // Role check: Only COLLEGE_ADMIN or SYSTEM_ADMIN can create/submit an application
    if (!canSubmitApplication(auth.scope.role)) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden: College staff cannot execute final application submission",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = CreateApplicationSchema.parse(body);

    const now = new Date().toISOString();
    const assignedInstitutionId = isCollegeUser(auth.scope.role)
      ? auth.scope.institutionId
      : body.institutionId || undefined;

    const newApp: ApplicationRecord = {
      id: `app_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      referenceId: validated.referenceId,
      institutionId: assignedInstitutionId,
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
          actor: `${auth.scope.name} (${auth.scope.role})`,
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

    await ApplicationRepository.save(newApp, auth.scope);
    return NextResponse.json({ success: true, data: newApp }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.errors ? err.errors : err.message },
      { status: 400 }
    );
  }
}
