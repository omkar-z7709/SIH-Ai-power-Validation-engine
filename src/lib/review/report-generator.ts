import { ApplicationRecord } from "@/types";

export function generateApplicationCsv(app: ApplicationRecord): string {
  const rows: string[] = [];
  rows.push(["Application Reference", "Institution Name", "Type", "Academic Year", "Status"].join(","));
  rows.push(
    [
      `"${app.referenceId}"`,
      `"${app.institutionName}"`,
      `"${app.applicationType}"`,
      `"${app.academicYear}"`,
      `"${app.status}"`,
    ].join(",")
  );

  rows.push("");
  rows.push(["Document Filename", "Category", "Extraction Status", "SHA-256 Hash", "Issues Count"].join(","));
  for (const doc of app.documents) {
    rows.push(
      [
        `"${doc.originalFilename}"`,
        `"${doc.category}"`,
        `"${doc.extractionStatus}"`,
        `"${doc.sha256Hash}"`,
        `"${doc.findings.length}"`,
      ].join(",")
    );
  }

  rows.push("");
  rows.push(["Rule ID", "Severity", "Finding Title", "Explanation", "Suggested Action", "Source", "Dismissed"].join(","));
  for (const f of app.allFindings) {
    rows.push(
      [
        `"${f.ruleId}"`,
        `"${f.severity}"`,
        `"${f.title.replace(/"/g, '""')}"`,
        `"${f.explanation.replace(/"/g, '""')}"`,
        `"${f.suggestedAction.replace(/"/g, '""')}"`,
        `"${f.source}"`,
        `"${f.dismissed ? "YES" : "NO"}"`,
      ].join(",")
    );
  }

  rows.push("");
  rows.push(["Reviewer", "Action", "Outcome Status", "Timestamp", "Notes"].join(","));
  for (const r of app.reviews) {
    rows.push(
      [
        `"${r.reviewerName}"`,
        `"${r.action}"`,
        `"${r.outcomeStatus}"`,
        `"${r.timestamp}"`,
        `"${r.notes.replace(/"/g, '""')}"`,
      ].join(",")
    );
  }

  return rows.join("\n");
}

export function generateApplicationJson(app: ApplicationRecord): string {
  return JSON.stringify(app, null, 2);
}

export function generateApplicationPdf(app: ApplicationRecord): Buffer {
  const lines: string[] = [
    "AICTE SCRUTINY AUDIT REPORT",
    "==================================================",
    `Institution Name:   ${app.institutionName}`,
    `Reference ID:       ${app.referenceId}`,
    `Academic Year:      ${app.academicYear}`,
    `Application Type:   ${app.applicationType.replace(/_/g, " ")}`,
    `Current Status:     ${app.status}`,
    `Report Generated:   ${new Date().toISOString()}`,
    "--------------------------------------------------",
    "SUBMITTED STATUTORY CREDENTIALS:",
  ];

  if (app.documents.length === 0) {
    lines.push("  - No documents attached.");
  } else {
    for (const doc of app.documents) {
      lines.push(`  * ${doc.originalFilename} [${doc.category}]`);
      lines.push(`    Status: ${doc.extractionStatus} | SHA256: ${doc.sha256Hash.substring(0, 16)}...`);
      if (doc.extractedFields?.institutionName) {
        lines.push(`    Extracted Entity: ${doc.extractedFields.institutionName}`);
      }
      if (doc.extractedFields?.certificateNumber) {
        lines.push(`    Cert/Ref #: ${doc.extractedFields.certificateNumber}`);
      }
    }
  }

  lines.push("--------------------------------------------------");
  lines.push("STATUTORY COMPLIANCE FINDINGS:");
  if (app.allFindings.length === 0) {
    lines.push("  - No statutory discrepancies identified. All checks passed.");
  } else {
    for (const f of app.allFindings) {
      lines.push(`  [${f.severity}] ${f.title}`);
      lines.push(`    Rule ID: ${f.ruleId} | Action: ${f.suggestedAction}`);
      if (f.dismissed) {
        lines.push(`    Status: DISMISSED BY OFFICER (${f.dismissalReason || "Justified"})`);
      }
    }
  }

  lines.push("--------------------------------------------------");
  lines.push("OFFICER AUDIT HISTORY:");
  if (app.reviews.length === 0) {
    lines.push("  - Pending scrutiny adjudication.");
  } else {
    for (const r of app.reviews) {
      lines.push(`  * ${r.timestamp} - ${r.reviewerName}: ${r.action} -> ${r.outcomeStatus}`);
      if (r.notes) lines.push(`    Notes: ${r.notes}`);
    }
  }

  lines.push("==================================================");
  lines.push("CONFIDENTIAL & STATUTORY RECORD - AICTE SCRUTINY STUDIO");

  // Format into valid PDF-1.4 binary structure
  let stream = "BT /F1 9 Tf 40 760 Td\n";
  lines.forEach((line, i) => {
    const escaped = line.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    if (i === 0) {
      stream += `(${escaped}) Tj\n`;
    } else {
      stream += `0 -13 Td (${escaped}) Tj\n`;
    }
  });
  stream += "ET";
  const streamLength = Buffer.byteLength(stream);

  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n",
    `4 0 obj\n<< /Length ${streamLength} >>\nstream\n${stream}\nendstream\nendobj\n`,
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n",
  ];

  let offset = 9;
  const xref = ["xref\n0 6\n0000000000 65535 f \n"];
  let body = "%PDF-1.4\n";

  for (let i = 0; i < objects.length; i++) {
    xref.push(String(offset).padStart(10, "0") + " 00000 n \n");
    body += objects[i];
    offset = Buffer.byteLength(body);
  }

  const startxref = offset;
  body += xref.join("") + "trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n" + startxref + "\n%%EOF";
  return Buffer.from(body);
}
