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

/**
 * Creates a clean binary PDF stream containing full AI narrative synthesis
 */
export function buildTextPdfFromLines(lines: string[]): Buffer {
  let stream = "BT /F1 9 Tf 36 765 Td\n";
  lines.forEach((line, i) => {
    const escaped = line.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    if (i === 0) {
      stream += `(${escaped}) Tj\n`;
    } else {
      stream += `0 -12 Td (${escaped}) Tj\n`;
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

export async function generateApplicationPdf(app: ApplicationRecord): Promise<Buffer> {
  const { groupApplicationFindings, generateGeminiNarrative } = await import("../report/gemini-report");
  const { groupedFindings, stats } = groupApplicationFindings(app);

  const preparedData = {
    institution: app.institutionName,
    referenceId: app.referenceId,
    academicYear: app.academicYear,
    applicationType: app.applicationType,
    currentStatus: app.status,
    stats,
    groupedFindings,
  };

  const { narrative, provenance } = await generateGeminiNarrative(preparedData);

  const lines: string[] = [
    "ALL INDIA COUNCIL FOR TECHNICAL EDUCATION (AICTE)",
    "STATUTORY INSTITUTIONAL SCRUTINY & COMPLIANCE REPORT",
    "================================================================================",
    `INSTITUTION:       ${app.institutionName}`,
    `REFERENCE ID:      ${app.referenceId}`,
    `ACADEMIC CYCLE:    ${app.academicYear} | TYPE: ${app.applicationType.replace(/_/g, " ")}`,
    `EXECUTIVE VERDICT: ${narrative.verdict} (Total Active Flags: ${stats.total})`,
    `FLAG BREAKDOWN:    Tier 1 (Critical): ${stats.tier1} | Tier 2 (High): ${stats.tier2} | Tier 3 (Med): ${stats.tier3}`,
    "--------------------------------------------------------------------------------",
    "EXECUTIVE REGULATORY ASSESSMENT (Synthesized via " + provenance.model + "):",
  ];

  // Wrap executive summary lines
  const summaryWords = narrative.executiveSummary.split(" ");
  let cur = "  ";
  for (const w of summaryWords) {
    if ((cur + " " + w).length > 80) {
      lines.push(cur);
      cur = "  " + w;
    } else {
      cur += " " + w;
    }
  }
  if (cur.trim().length > 0) lines.push(cur);

  lines.push("--------------------------------------------------------------------------------");
  lines.push(`REGULATORY FINDINGS (${groupedFindings.length} Distinct Deduplicated Issues):`);

  if (groupedFindings.length === 0) {
    lines.push("  - Zero discrepancies detected. Application complies with statutory norms.");
  } else {
    for (const gf of groupedFindings) {
      const nf = narrative.findings.find((f) => f.id === gf.id);
      lines.push(`  * [${gf.severity}] ${gf.title} (${gf.ruleId})`);
      lines.push(`    Detail: ${nf?.plainEnglish || gf.title}`);
      lines.push(`    Action: ${nf?.recommendedAction || "Inspect with competent authority."}`);
      lines.push(`    Affected Files: ${gf.affectedDocuments.join(", ")}`);
    }
  }

  lines.push("--------------------------------------------------------------------------------");
  lines.push("SUBMITTED CREDENTIALS AUDIT TRAIL:");
  for (const doc of app.documents.slice(0, 5)) {
    lines.push(`  - ${doc.originalFilename} [${doc.category}] SHA: ${doc.sha256Hash.substring(0, 16)}...`);
  }

  lines.push("--------------------------------------------------------------------------------");
  lines.push("INSPECTION COMMITTEE CHECKLIST:");
  for (const chk of narrative.officerChecklist.slice(0, 4)) {
    lines.push(`  [ ] ${chk}`);
  }

  lines.push("================================================================================");
  lines.push(`PROVENANCE: Engine: ${provenance.model} (${provenance.mode.toUpperCase()}) | Strict Rules v1.0`);

  return buildTextPdfFromLines(lines);
}
