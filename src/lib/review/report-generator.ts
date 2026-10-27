import { jsPDF } from "jspdf";
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

// Format raw enum strings into human-readable statutory labels
function formatAppType(type: string): string {
  switch (type) {
    case "NEW_INSTITUTE":
      return "NEW INSTITUTE PROPOSAL";
    case "EXTENSION_OF_APPROVAL":
      return "EXTENSION OF APPROVAL (EoA)";
    case "INCREASE_IN_INTAKE":
      return "INCREASE IN INTAKE / DIVISION";
    case "CLOSURE_OF_COURSE":
      return "CLOSURE OF PROGRAMME";
    default:
      return type.replace(/_/g, " ");
  }
}

function formatStatus(status: string): string {
  switch (status) {
    case "PASSED_INITIAL_CHECKS":
      return "PASSED INITIAL CHECKS";
    case "APPROVED_BY_REVIEWER":
      return "APPROVED BY REVIEW OFFICER";
    case "NEEDS_REVIEW":
      return "ACTION REQUIRED: SCRUTINY REVIEW";
    case "VERIFICATION_REQUIRED":
      return "VERIFICATION REQUIRED";
    case "INCOMPLETE":
      return "INCOMPLETE DOCUMENTATION";
    case "UNABLE_TO_PROCESS":
      return "DEFICIENT / UNABLE TO PROCESS";
    case "REJECTED_BY_REVIEWER":
      return "REJECTED BY SCRUTINY AUTHORITY";
    case "RETURNED_FOR_CLARIFICATION":
      return "RETURNED FOR CLARIFICATION";
    default:
      return status.replace(/_/g, " ");
  }
}

function getSeverityToken(severity: string) {
  switch (severity) {
    case "TIER_1_CRITICAL":
    case "CRITICAL":
      return {
        fill: [254, 242, 242] as [number, number, number],
        border: [220, 38, 38] as [number, number, number],
        text: [153, 27, 27] as [number, number, number],
        label: "CRITICAL VIOLATION",
      };
    case "TIER_2_HIGH":
    case "HIGH":
      return {
        fill: [255, 247, 237] as [number, number, number],
        border: [234, 88, 12] as [number, number, number],
        text: [154, 52, 18] as [number, number, number],
        label: "HIGH RISK DEFICIENCY",
      };
    case "TIER_3_MEDIUM":
    case "MEDIUM":
    case "WARNING":
      return {
        fill: [254, 252, 232] as [number, number, number],
        border: [217, 119, 6] as [number, number, number],
        text: [146, 64, 14] as [number, number, number],
        label: "MODERATE ADVISORY",
      };
    default:
      return {
        fill: [239, 246, 255] as [number, number, number],
        border: [37, 99, 235] as [number, number, number],
        text: [30, 64, 175] as [number, number, number],
        label: "INFORMATIONAL",
      };
  }
}

/**
 * Generates an authoritative, color-coded, multi-page AICTE Statutory Scrutiny Dossier PDF
 */
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

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2; // 182mm
  let curY = 0;

  function checkPageBreak(neededHeight: number) {
    if (curY + neededHeight > pageHeight - 22) {
      doc.addPage();
      curY = 16;
    }
  }

  // ==========================================
  // 1. OFFICIAL NAVY & GOLD HEADER BAND
  // ==========================================
  const headerHeight = 22;
  doc.setFillColor(15, 23, 42); // Deep Navy
  doc.rect(0, 0, pageWidth, headerHeight, "F");

  // Gold accent rule
  doc.setFillColor(234, 179, 8); // Gold
  doc.rect(0, headerHeight, pageWidth, 1.2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("ALL INDIA COUNCIL FOR TECHNICAL EDUCATION (AICTE)", marginX, 9);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  doc.text("STATUTORY INSTITUTIONAL SCRUTINY & COMPLIANCE DOSSIER", marginX, 15);

  // Right-aligned reference & stamp in header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(234, 179, 8);
  doc.text(app.referenceId, pageWidth - marginX, 9, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  const formattedDate = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  doc.text(`Generated: ${formattedDate} | Official Copy`, pageWidth - marginX, 15, { align: "right" });

  curY = headerHeight + 5;

  // ==========================================
  // 2. 2-COLUMN METADATA & EXECUTIVE VERDICT BANNER
  // ==========================================
  const colGap = 4;
  const leftColWidth = 100;
  const rightColWidth = contentWidth - leftColWidth - colGap; // 78mm
  const metaHeight = 32;

  // Left Box: Institution Metadata
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.rect(marginX, curY, leftColWidth, metaHeight, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  const wrappedInstName = doc.splitTextToSize(app.institutionName, leftColWidth - 8);
  doc.text(wrappedInstName.slice(0, 2), marginX + 4, curY + 6);

  const instNameOffset = wrappedInstName.length > 1 ? 5 : 0;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Cycle: ${app.academicYear}  |  State: ${app.state || "Not Specified"}`, marginX + 4, curY + 14 + instNameOffset);

  // Application Type Pill
  const isNewInst = app.applicationType === "NEW_INSTITUTE";
  const pillFill = isNewInst ? [219, 234, 254] : [241, 245, 249];
  const pillBorder = isNewInst ? [147, 197, 253] : [203, 213, 225];
  const pillText = isNewInst ? [30, 64, 175] : [51, 65, 85];

  doc.setFillColor(pillFill[0], pillFill[1], pillFill[2]);
  doc.setDrawColor(pillBorder[0], pillBorder[1], pillBorder[2]);
  doc.roundedRect(marginX + 4, curY + 20 + instNameOffset, leftColWidth - 8, 7, 1.2, 1.2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(pillText[0], pillText[1], pillText[2]);
  doc.text(formatAppType(app.applicationType), marginX + leftColWidth / 2, curY + 24.5 + instNameOffset, {
    align: "center",
  });

  // Right Box: Color-Coded Executive Verdict Banner
  const rightX = marginX + leftColWidth + colGap;
  const isRejected = app.status === "REJECTED_BY_REVIEWER" || stats.tier1 > 0;
  const isApproved =
    !isRejected &&
    (app.status === "PASSED_INITIAL_CHECKS" || app.status === "APPROVED_BY_REVIEWER");

  const verdictFill: [number, number, number] = isRejected
    ? [254, 242, 242]
    : isApproved
    ? [236, 253, 245]
    : [255, 247, 237];

  const verdictBorder: [number, number, number] = isRejected
    ? [220, 38, 38]
    : isApproved
    ? [16, 185, 129]
    : [234, 88, 12];

  const verdictText: [number, number, number] = isRejected
    ? [153, 27, 27]
    : isApproved
    ? [6, 95, 70]
    : [154, 52, 18];

  doc.setFillColor(verdictFill[0], verdictFill[1], verdictFill[2]);
  doc.setDrawColor(verdictBorder[0], verdictBorder[1], verdictBorder[2]);
  doc.setLineWidth(0.4);
  doc.rect(rightX, curY, rightColWidth, metaHeight, "FD");

  // Top verdict ribbon inside right box
  doc.setFillColor(verdictBorder[0], verdictBorder[1], verdictBorder[2]);
  doc.rect(rightX, curY, rightColWidth, 5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text("EXECUTIVE REGULATORY VERDICT", rightX + rightColWidth / 2, curY + 3.8, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(verdictText[0], verdictText[1], verdictText[2]);
  const formattedVerdict = isRejected
    ? "CRITICAL VIOLATION / BLOCKED"
    : isApproved
    ? "COMPLIANT / VERIFIED"
    : "SCRUTINY REVIEW REQUIRED";
  doc.text(formattedVerdict, rightX + rightColWidth / 2, curY + 13, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Current Status: ${formatStatus(app.status)}`, rightX + rightColWidth / 2, curY + 19, {
    align: "center",
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(verdictText[0], verdictText[1], verdictText[2]);
  doc.text(`Active Findings: ${stats.total}`, rightX + rightColWidth / 2, curY + 26, {
    align: "center",
  });

  curY += metaHeight + 4;

  // ==========================================
  // 3. 4-COLOR KPI SUMMARY STRIP
  // ==========================================
  const kpiBoxWidth = (contentWidth - 9) / 4; // 4 boxes with 3mm gap
  const kpiHeight = 15;

  const kpis = [
    {
      title: "Tier 1: Critical",
      count: stats.tier1,
      fill: [254, 242, 242] as [number, number, number],
      border: [239, 68, 68] as [number, number, number],
      text: [185, 28, 28] as [number, number, number],
      sub: "Immediate Block",
    },
    {
      title: "Tier 2: High Risk",
      count: stats.tier2,
      fill: [255, 247, 237] as [number, number, number],
      border: [249, 115, 22] as [number, number, number],
      text: [194, 65, 12] as [number, number, number],
      sub: "Mandatory Fix",
    },
    {
      title: "Tier 3: Moderate",
      count: stats.tier3,
      fill: [254, 252, 232] as [number, number, number],
      border: [234, 179, 8] as [number, number, number],
      text: [161, 98, 7] as [number, number, number],
      sub: "Advisory / Review",
    },
    {
      title: "Verified Documents",
      count: app.documents.length,
      fill: [236, 253, 245] as [number, number, number],
      border: [16, 185, 129] as [number, number, number],
      text: [6, 95, 70] as [number, number, number],
      sub: "Cryptographic SHA",
    },
  ];

  kpis.forEach((kpi, idx) => {
    const boxX = marginX + idx * (kpiBoxWidth + 3);
    doc.setFillColor(kpi.fill[0], kpi.fill[1], kpi.fill[2]);
    doc.setDrawColor(kpi.border[0], kpi.border[1], kpi.border[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(boxX, curY, kpiBoxWidth, kpiHeight, 1.2, 1.2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(kpi.text[0], kpi.text[1], kpi.text[2]);
    doc.text(kpi.title.toUpperCase(), boxX + 3, curY + 4.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(String(kpi.count), boxX + 3, curY + 11.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.sub, boxX + kpiBoxWidth - 3, curY + 11.5, { align: "right" });
  });

  curY += kpiHeight + 5;

  // ==========================================
  // 4. GEMINI EXECUTIVE REGULATORY ASSESSMENT CALLOUT
  // ==========================================
  const summaryLines = doc.splitTextToSize(narrative.executiveSummary || "Evaluation completed.", contentWidth - 14);
  const summaryBoxHeight = Math.max(22, 11 + summaryLines.length * 3.5);

  checkPageBreak(summaryBoxHeight + 4);

  // Background box in Soft Royal Blue
  doc.setFillColor(239, 246, 255);
  doc.setDrawColor(191, 219, 254);
  doc.setLineWidth(0.3);
  doc.rect(marginX, curY, contentWidth, summaryBoxHeight, "FD");

  // Thick 4pt (1.4mm) accent bar on the left
  doc.setFillColor(37, 99, 235);
  doc.rect(marginX, curY, 1.6, summaryBoxHeight, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(30, 58, 138);
  doc.text("EXECUTIVE REGULATORY ASSESSMENT (CALIBRATED DECISION SUPPORT)", marginX + 5, curY + 5.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(59, 130, 246);
  doc.text(`Engine: ${provenance.model}`, marginX + contentWidth - 4, curY + 5.5, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(30, 58, 138);
  doc.text(summaryLines, marginX + 5, curY + 10.5);

  curY += summaryBoxHeight + 5;

  // ==========================================
  // 5. COLOR-CODED REGULATORY FINDINGS CARDS
  // ==========================================
  checkPageBreak(12);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`STATUTORY REGULATORY FINDINGS (${groupedFindings.length} Distinct Deduplicated Issues)`, marginX, curY);

  curY += 3.5;

  if (groupedFindings.length === 0) {
    const cleanBoxH = 14;
    doc.setFillColor(236, 253, 245);
    doc.setDrawColor(16, 185, 129);
    doc.setLineWidth(0.3);
    doc.roundedRect(marginX, curY, contentWidth, cleanBoxH, 1.2, 1.2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(6, 95, 70);
    doc.text("Zero statutory discrepancies detected.", marginX + 5, curY + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text("All submitted institutional records and credentials comply fully with AICTE Approval Process norms.", marginX + 5, curY + 10.5);

    curY += cleanBoxH + 5;
  } else {
    for (const gf of groupedFindings) {
      const nf = narrative.findings.find((f) => f.id === gf.id);
      const token = getSeverityToken(gf.severity);

      const detailText = nf?.plainEnglish || gf.title || "Discrepancy detected during rule execution.";
      const actionText = nf?.recommendedAction || "Submit compliant certificate to competent authority.";
      const affectedText = gf.affectedDocuments.join(", ");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      const detailLines = doc.splitTextToSize(`Detail: ${detailText}`, contentWidth - 16);
      const actionLines = doc.splitTextToSize(`Action Required: ${actionText}`, contentWidth - 16);
      const affectedLines = doc.splitTextToSize(`Affected Documentation: ${affectedText}`, contentWidth - 16);

      const cardH = 16 + (detailLines.length + actionLines.length + affectedLines.length) * 3.4;

      checkPageBreak(cardH + 3);

      // Card Background
      doc.setFillColor(token.fill[0], token.fill[1], token.fill[2]);
      doc.setDrawColor(token.border[0], token.border[1], token.border[2]);
      doc.setLineWidth(0.3);
      doc.roundedRect(marginX, curY, contentWidth, cardH, 1.2, 1.2, "FD");

      // 4pt Left Severity Color Bar
      doc.setFillColor(token.border[0], token.border[1], token.border[2]);
      doc.rect(marginX, curY, 1.5, cardH, "F");

      // Row 1: Severity Pill Badge + Title + Rule ID
      const pillW = doc.getTextWidth(token.label) + 4;
      doc.setFillColor(token.border[0], token.border[1], token.border[2]);
      doc.roundedRect(marginX + 4, curY + 3, pillW, 4.5, 0.8, 0.8, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(6);
      doc.setTextColor(255, 255, 255);
      doc.text(token.label, marginX + 6, curY + 6.2);

      // Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      const titleAvailableW = contentWidth - pillW - 45;
      const truncatedTitle = doc.splitTextToSize(gf.title, titleAvailableW)[0];
      doc.text(truncatedTitle, marginX + 6 + pillW, curY + 6.2);

      // Monospace Rule ID
      doc.setFont("courier", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(gf.ruleId, marginX + contentWidth - 4, curY + 6.2, { align: "right" });

      let lineY = curY + 11.5;

      // Row 2: Detail
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(51, 65, 85);
      doc.text(detailLines, marginX + 5, lineY);
      lineY += detailLines.length * 3.4;

      // Row 3: Action Required
      doc.setFont("helvetica", "bold");
      doc.setTextColor(token.text[0], token.text[1], token.text[2]);
      doc.text(actionLines, marginX + 5, lineY);
      lineY += actionLines.length * 3.4;

      // Row 4: Affected Documents
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(affectedLines, marginX + 5, lineY);

      curY += cardH + 3.5;
    }
  }

  // ==========================================
  // 6. SUBMITTED CREDENTIALS AUDIT TABLE
  // ==========================================
  checkPageBreak(30);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text("SUBMITTED CREDENTIALS AUDIT TRAIL", marginX, curY);
  curY += 3.5;

  // Table Header
  const tableColWidths = {
    name: 58,
    cat: 46,
    status: 34,
    hash: 44,
  };

  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  doc.rect(marginX, curY, contentWidth, 5.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text("DOCUMENT FILENAME", marginX + 2, curY + 3.8);
  doc.text("CATEGORY", marginX + tableColWidths.name + 2, curY + 3.8);
  doc.text("EXTRACTION STATUS", marginX + tableColWidths.name + tableColWidths.cat + 2, curY + 3.8);
  doc.text("SHA-256 DIGEST", marginX + tableColWidths.name + tableColWidths.cat + tableColWidths.status + 2, curY + 3.8);

  curY += 5.5;

  const docsToRender = app.documents.slice(0, 6);
  docsToRender.forEach((docItem, idx) => {
    checkPageBreak(7);
    const rowH = 6;
    const isEven = idx % 2 === 0;

    doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
    doc.setDrawColor(226, 232, 240);
    doc.rect(marginX, curY, contentWidth, rowH, "FD");

    // Filename
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(30, 41, 59);
    const safeName = doc.splitTextToSize(docItem.originalFilename, tableColWidths.name - 3)[0] || docItem.originalFilename;
    doc.text(safeName, marginX + 2, curY + 4);

    // Category
    doc.setFontSize(6);
    doc.setTextColor(71, 85, 105);
    doc.text(docItem.category.replace(/_/g, " "), marginX + tableColWidths.name + 2, curY + 4);

    // Status Badge
    const isDocClean = docItem.extractionStatus === "SUCCESS";
    const statusFill = isDocClean ? [236, 253, 245] : [254, 242, 242];
    const statusText = isDocClean ? [6, 95, 70] : [185, 28, 28];
    const statusLabel = isDocClean ? "VERIFIED" : "DEFICIENT";

    doc.setFillColor(statusFill[0], statusFill[1], statusFill[2]);
    doc.roundedRect(marginX + tableColWidths.name + tableColWidths.cat + 2, curY + 1.2, 18, 3.6, 0.6, 0.6, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.5);
    doc.setTextColor(statusText[0], statusText[1], statusText[2]);
    doc.text(statusLabel, marginX + tableColWidths.name + tableColWidths.cat + 11, curY + 3.8, { align: "center" });

    // SHA-256 Short Monospace
    doc.setFont("courier", "normal");
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    const shortHash = docItem.sha256Hash ? `${docItem.sha256Hash.substring(0, 18)}...` : "SHA_UNAVAILABLE";
    doc.text(shortHash, marginX + tableColWidths.name + tableColWidths.cat + tableColWidths.status + 2, curY + 4);

    curY += rowH;
  });

  curY += 5;

  // ==========================================
  // 7. INSPECTION COMMITTEE CHECKLIST WITH VECTOR CHECKBOXES
  // ==========================================
  checkPageBreak(25);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text("INSPECTION COMMITTEE STATUTORY CHECKLIST", marginX, curY);
  curY += 4;

  const checklistItems = narrative.officerChecklist.slice(0, 4);
  checklistItems.forEach((chk) => {
    checkPageBreak(8);

    // Draw Vector Checkbox
    doc.setDrawColor(100, 116, 139);
    doc.setLineWidth(0.4);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(marginX + 1, curY, 3.5, 3.5, 0.5, 0.5, "FD");

    // Checklist Text
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(30, 41, 59);
    const chkLines = doc.splitTextToSize(chk, contentWidth - 10);
    doc.text(chkLines, marginX + 8, curY + 2.8);

    curY += Math.max(5.5, chkLines.length * 3.4 + 1.5);
  });

  // ==========================================
  // 8. GLOBAL FOOTER & PAGE NUMBERING ON ALL PAGES
  // ==========================================
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Footer divider line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(marginX, pageHeight - 12, pageWidth - marginX, pageHeight - 12);

    // Left provenance
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `AICTE Regulatory Scrutiny Studio | PS 26261 | Engine: ${provenance.model}`,
      marginX,
      pageHeight - 7.5
    );

    // Center page number
    doc.setFont("helvetica", "bold");
    doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 7.5, { align: "center" });

    // Right verification seal
    doc.setFont("helvetica", "normal");
    doc.text("Official AICTE Digital Record", pageWidth - marginX, pageHeight - 7.5, { align: "right" });
  }

  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
