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
