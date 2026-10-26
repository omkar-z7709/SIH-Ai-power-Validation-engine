import crypto from "crypto";
import path from "path";
import fs from "fs/promises";
import { DocumentCategory, DocumentRecord } from "@/types";
import { classifyDocument, extractFieldsFromText } from "./document-parser";
import { extractionPipeline } from "./extraction-pipeline";

const UPLOAD_DIR = path.join(process.cwd(), "storage", "documents");

export async function ensureStorageDir(): Promise<void> {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

export async function processUploadedFile(
  fileBuffer: Buffer,
  originalFilename: string,
  mimeType: string,
  applicationId: string,
  forcedCategory?: DocumentCategory
): Promise<DocumentRecord> {
  await ensureStorageDir();

  // 1. Calculate SHA-256 Digest
  const hash = crypto.createHash("sha256").update(fileBuffer).digest("hex");

  // 2. Generate Safe Collision-Resistant Storage Key
  const safeExt = path.extname(originalFilename).toLowerCase() || (mimeType === "application/pdf" ? ".pdf" : ".png");
  const storageId = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${safeExt}`;
  const filePath = path.join(UPLOAD_DIR, storageId);

  // Store file safely outside public directory
  await fs.writeFile(filePath, fileBuffer);

  // 3. Extract text through the Composite Extraction Pipeline
  const extractionResult = await extractionPipeline.process(fileBuffer, mimeType, originalFilename);

  let extractionStatus: "SUCCESS" | "FAILED" | "PARTIAL" = "SUCCESS";
  if (extractionResult.confidence === 0 && extractionResult.text.length === 0) {
    extractionStatus = "FAILED";
  } else if (extractionResult.isScanned && extractionResult.text.length < 50) {
    extractionStatus = "PARTIAL";
  }

  // 4. Classify Category
  const classification = forcedCategory
    ? { category: forcedCategory, confidence: 1.0 }
    : classifyDocument(originalFilename, extractionResult.text);

  // 5. Extract Structured Fields
  const extractedFields = extractFieldsFromText(extractionResult.text, classification.category);

  const now = new Date().toISOString();
  let provenanceMode: "live" | "fallback" | "mock" = "live";
  if (extractionResult.provider === "TesseractOcr" || extractionResult.provider === "GeminiVisionOCR") {
    provenanceMode = "fallback";
  } else if (extractionResult.provider === "None") {
    provenanceMode = "fallback";
  }

  const docRecord: DocumentRecord = {
    id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    applicationId,
    originalFilename,
    storageKey: storageId,
    mimeType,
    sizeBytes: fileBuffer.length,
    sha256Hash: hash,
    category: classification.category,
    categoryConfidence: classification.confidence,
    extractionStatus,
    extractedText: extractionResult.text,
    extractedFields,
    ocrConfidence: extractionResult.confidence,
    isScannedImage: extractionResult.isScanned,
    provenance: {
      provider: extractionResult.provider,
      mode: provenanceMode,
    },
    findings: [],
    verificationStatus:
      classification.category === "ACCREDITATION_CERTIFICATE" ||
      classification.category === "AFFILIATION_CERTIFICATE"
        ? "PENDING_VERIFICATION"
        : "NOT_REQUIRED",
    createdAt: now,
    updatedAt: now,
  };

  return docRecord;
}
