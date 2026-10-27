import { ApplicationRecord } from "@/types";
import {
  groupApplicationFindings,
  generateGeminiNarrative,
  type PreparedReportData,
} from "./gemini-report";

export function renderScrutinyHtmlTemplate(
  app: ApplicationRecord,
  prepared: PreparedReportData,
  narrative: Awaited<ReturnType<typeof generateGeminiNarrative>>["narrative"],
  provenance: { model: string; mode: "live" | "fallback" }
): string {
  const isDark = false;
  const verdictColor =
    narrative.verdict === "READY"
      ? "#059669"
      : narrative.verdict === "NOT_READY"
      ? "#dc2626"
      : "#d97706";

  const verdictBg =
    narrative.verdict === "READY"
      ? "#ecfdf5"
      : narrative.verdict === "NOT_READY"
      ? "#fef2f2"
      : "#fffbeb";

  const verdictLabel =
    narrative.verdict === "READY"
      ? "STATUTORY SCRUTINY READY"
      : narrative.verdict === "NOT_READY"
      ? "NOT READY (CRITICAL DEFECTS)"
      : "NEEDS REVIEW (ACTION REQUIRED)";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>AICTE Regulatory Scrutiny Audit Report - ${app.referenceId}</title>
  <style>
    @page {
      size: A4;
      margin: 15mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      color: #0f172a;
      line-height: 1.45;
      font-size: 11px;
      margin: 0;
      padding: 0;
      background: #ffffff;
    }
    .header {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 15px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .logo-title {
      font-size: 16px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: -0.02em;
      color: #0f172a;
    }
    .sub-title {
      font-size: 10px;
      color: #64748b;
      margin-top: 2px;
    }
    .meta-box {
      text-align: right;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 10px;
      color: #475569;
    }
    .panel-kpi {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 8px;
      margin-bottom: 15px;
    }
    .kpi-card {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 10px;
      background: #f8fafc;
      text-align: center;
    }
    .kpi-label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      letter-spacing: 0.05em;
    }
    .kpi-value {
      font-size: 18px;
      font-weight: 800;
      margin-top: 2px;
      font-family: ui-monospace, monospace;
    }
    .verdict-card {
      grid-column: span 2;
      border: 1.5px solid ${verdictColor};
      background: ${verdictBg};
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 8px 12px;
      border-radius: 6px;
    }
    .verdict-badge {
      font-size: 11px;
      font-weight: 800;
      color: ${verdictColor};
      letter-spacing: 0.02em;
    }
    .section-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #0f172a;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
      margin-top: 14px;
      margin-bottom: 8px;
    }
    .exec-summary {
      background: #f1f5f9;
      border-left: 3px solid #2563eb;
      padding: 10px 12px;
      border-radius: 0 6px 6px 0;
      font-size: 11px;
      color: #1e293b;
      margin-bottom: 14px;
      line-height: 1.5;
    }
    .finding-card {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 12px;
      margin-bottom: 8px;
      background: #ffffff;
      page-break-inside: avoid;
    }
    .finding-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }
    .severity-pill {
      font-size: 9px;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .sev-critical { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
    .sev-high { background: #ffedd5; color: #9a3412; border: 1px solid #fed7aa; }
    .sev-medium { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
    .sev-cosmetic { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
    .table-docs {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
      margin-top: 6px;
      margin-bottom: 14px;
    }
    .table-docs th, .table-docs td {
      border: 1px solid #e2e8f0;
      padding: 6px 8px;
      text-align: left;
    }
    .table-docs th {
      background: #f8fafc;
      font-weight: 700;
      color: #475569;
    }
    .checklist-list {
      margin: 0;
      padding-left: 18px;
      color: #334155;
      font-size: 10.5px;
    }
    .checklist-list li {
      margin-bottom: 4px;
    }
    .footer {
      border-top: 1px solid #cbd5e1;
      padding-top: 8px;
      margin-top: 18px;
      display: flex;
      justify-content: space-between;
      color: #64748b;
      font-size: 9px;
      font-family: ui-monospace, monospace;
    }
  </style>
</head>
<body>

  <div class="header">
    <div>
      <div class="logo-title">All India Council for Technical Education</div>
      <div class="sub-title">STATUTORY INSTITUTIONAL SCRUTINY & COMPLIANCE EVALUATION REPORT</div>
    </div>
    <div class="meta-box">
      <div>REF: <strong>${app.referenceId}</strong></div>
      <div>CYCLE: ${app.academicYear}</div>
      <div>DATE: ${new Date().toLocaleDateString("en-IN")}</div>
    </div>
  </div>

  <table style="width: 100%; margin-bottom: 12px; font-size: 11px;">
    <tr>
      <td style="width: 65%;"><strong>Institution:</strong> ${app.institutionName}</td>
      <td style="width: 35%;"><strong>Application Type:</strong> ${app.applicationType.replace(/_/g, " ")}</td>
    </tr>
    <tr>
      <td><strong>State / Region:</strong> ${app.state || "Not Specified"}</td>
      <td><strong>Current Status:</strong> ${app.status}</td>
    </tr>
  </table>

  <!-- KPI Flag Panel -->
  <div class="panel-kpi">
    <div class="verdict-card">
      <div class="kpi-label">Executive Verdict</div>
      <div class="verdict-badge">${verdictLabel}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Total Flags</div>
      <div class="kpi-value">${prepared.stats.total}</div>
    </div>
    <div class="kpi-card" style="border-color: #fca5a5;">
      <div class="kpi-label" style="color: #dc2626;">Tier 1 Crit</div>
      <div class="kpi-value" style="color: #dc2626;">${prepared.stats.tier1}</div>
    </div>
    <div class="kpi-card" style="border-color: #fdba74;">
      <div class="kpi-label" style="color: #ea580c;">Tier 2 High</div>
      <div class="kpi-value" style="color: #ea580c;">${prepared.stats.tier2}</div>
    </div>
    <div class="kpi-card" style="border-color: #fde047;">
      <div class="kpi-label" style="color: #d97706;">Tier 3 Med</div>
      <div class="kpi-value" style="color: #d97706;">${prepared.stats.tier3}</div>
    </div>
  </div>

  <!-- Executive Narrative -->
  <div class="section-title">Executive Scrutiny Synthesis (AICTE Assessment)</div>
  <div class="exec-summary">
    ${narrative.executiveSummary}
  </div>

  <!-- Grouped Findings -->
  <div class="section-title">Regulatory Discrepancy Findings (${prepared.groupedFindings.length} Grouped Items)</div>
  ${
    prepared.groupedFindings.length === 0
      ? '<div style="padding: 10px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; color: #065f46;"><strong>Zero Discrepancies Detected:</strong> All submitted statutory credentials align with prescribed AICTE norms.</div>'
      : prepared.groupedFindings
          .map((gf) => {
            const narrativeFinding = narrative.findings.find((f) => f.id === gf.id) || {
              plainEnglish: gf.title,
              whyItMatters: "Mandatory compliance check.",
              recommendedAction: "Verify with authority.",
            };

            const sevClass =
              gf.severity.includes("CRITICAL") || gf.severity.includes("TIER_1")
                ? "sev-critical"
                : gf.severity.includes("HIGH") || gf.severity.includes("TIER_2")
                ? "sev-high"
                : gf.severity.includes("MEDIUM") || gf.severity.includes("TIER_3")
                ? "sev-medium"
                : "sev-cosmetic";

            return `
    <div class="finding-card">
      <div class="finding-header">
        <div>
          <span class="severity-pill ${sevClass}">${gf.severity}</span>
          <strong style="margin-left: 6px; font-size: 11.5px;">${gf.title}</strong>
        </div>
        <span style="font-family: monospace; font-size: 9.5px; color: #64748b;">${gf.ruleId}</span>
      </div>
      <div style="font-size: 11px; color: #1e293b; margin-top: 4px;">
        <strong>Details:</strong> ${narrativeFinding.plainEnglish}
      </div>
      <div style="font-size: 10.5px; color: #475569; margin-top: 3px;">
        <strong>Regulatory Consequence:</strong> ${narrativeFinding.whyItMatters}
      </div>
      <div style="font-size: 10.5px; color: #0284c7; margin-top: 3px;">
        <strong>Required Action:</strong> ${narrativeFinding.recommendedAction}
      </div>
      <div style="font-size: 9.5px; color: #64748b; font-family: monospace; margin-top: 4px; border-top: 1px dashed #e2e8f0; padding-top: 3px;">
        Affected Document(s): ${gf.affectedDocuments.join(", ")}
      </div>
    </div>`;
          })
          .join("")
  }

  <!-- Documents Table -->
  <div class="section-title">Submitted Statutory Credentials (${app.documents.length} Files Attached)</div>
  <table class="table-docs">
    <thead>
      <tr>
        <th style="width: 35%;">Document Name</th>
        <th style="width: 25%;">Category</th>
        <th style="width: 20%;">Extracted Identity</th>
        <th style="width: 20%;">SHA-256 Digest</th>
      </tr>
    </thead>
    <tbody>
      ${
        app.documents.length === 0
          ? '<tr><td colspan="4" style="text-align: center; color: #94a3b8;">No documents attached.</td></tr>'
          : app.documents
              .map(
                (d) => `<tr>
          <td><strong>${d.originalFilename}</strong></td>
          <td>${d.category}</td>
          <td>${d.extractedFields?.institutionName || d.extractedFields?.certificateNumber || "Verified Clean"}</td>
          <td style="font-family: monospace;">${d.sha256Hash.substring(0, 16)}...</td>
        </tr>`
              )
              .join("")
      }
    </tbody>
  </table>

  <!-- Officer Checklist -->
  <div class="section-title">Statutory Scrutiny Checklist for Inspection Committee</div>
  <ul class="checklist-list">
    ${narrative.officerChecklist.map((item) => `<li>${item}</li>`).join("")}
  </ul>

  <!-- Provenance Footer -->
  <div class="footer">
    <div>PROVENANCE: AI Synthesis via <strong>${provenance.model}</strong> (${provenance.mode.toUpperCase()})</div>
    <div>VALIDATION ENGINE: Deterministic Rules v1.0 (Strict Rule-Count Grounding)</div>
    <div>AICTE SCRUTINY STUDIO - CONFIDENTIAL REGULATORY AUDIT RECORD</div>
  </div>

</body>
</html>`;
}
