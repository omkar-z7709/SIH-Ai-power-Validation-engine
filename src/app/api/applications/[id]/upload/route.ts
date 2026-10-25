import { NextResponse } from "next/server";
import { ApplicationRepository } from "@/lib/db/repository";
import { processUploadedFile } from "@/lib/documents/document-processor";
import { runDeterministicValidation } from "@/lib/rules/rules-engine";
import { jevAdapter } from "@/lib/jev/jev-adapter";
import { DocumentCategory } from "@/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const app = await ApplicationRepository.getById(id);
    if (!app) {
      return NextResponse.json(
        { success: false, error: "Application not found" },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const category = formData.get("category") as DocumentCategory | null;

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: "No files uploaded" },
        { status: 400 }
      );
    }

    // Guard: Enforce max batch size (max 10 files per upload)
    if (files.length > 10) {
      return NextResponse.json(
        { success: false, error: "Maximum batch limit exceeded. Upload at most 10 documents per request." },
        { status: 400 }
      );
    }

    // Guard: Enforce cumulative size ceiling (max 25MB total batch)
    const totalBatchBytes = files.reduce((acc, f) => acc + f.size, 0);
    if (totalBatchBytes > 25 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "Total batch size exceeds maximum limit of 25MB." },
        { status: 400 }
      );
    }

    const processedDocs = [];
    for (const file of files) {
      // 10MB limit enforcement
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { success: false, error: `File ${file.name} exceeds max size limit of 10MB.` },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const docRecord = await processUploadedFile(
        buffer,
        file.name,
        file.type || "application/octet-stream",
        app.id,
        category || undefined
      );

      app.documents.push(docRecord);
      processedDocs.push(docRecord);

      // Audit file upload
      app.auditTrail.push({
        id: `audit_upload_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        applicationId: app.id,
        documentId: docRecord.id,
        actor: "System Upload Handler",
        action: "DOCUMENT_UPLOADED",
        details: {
          filename: docRecord.originalFilename,
          size: docRecord.sizeBytes,
          sha256: docRecord.sha256Hash,
          category: docRecord.category,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Re-run validation rules on updated document list
    const { findings, computedStatus } = runDeterministicValidation(app);
    app.allFindings = findings;
    app.status = computedStatus;

    // Refresh decision support
    const jevResult = await jevAdapter.getDecisionSupport({
      institutionName: app.institutionName,
      referenceId: app.referenceId,
      documentCount: app.documents.length,
      deterministicFindings: findings,
      extractedSummary: {},
    });
    app.jevDecision = jevResult;

    await ApplicationRepository.save(app);

    return NextResponse.json({
      success: true,
      data: {
        application: app,
        uploadedDocuments: processedDocs,
      },
    });
  } catch (err: any) {
    console.error("Upload error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
