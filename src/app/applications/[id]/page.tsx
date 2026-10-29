"use client";

import { use, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  FileDown,
  Upload,
  FileCode,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { ApplicationRecord, DecisionStatus } from "@/types";
import { StatusBadge } from "@/components/StatusBadge";
import { SeverityBadge } from "@/components/SeverityBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { ExportPdfButton } from "@/components/ExportPdfButton";
import { RiskMeterGauge } from "@/components/RiskMeterGauge";
import { SpatialComplianceCard } from "@/components/SpatialComplianceCard";
import { calculateRiskScore } from "@/lib/rules/risk-scoring";
import { useApplicationDetail, useInvalidateApplications, useCurrentUser } from "@/lib/hooks/use-applications";

export default function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const { data: user } = useCurrentUser();
  const { data: app, isLoading: loading } = useApplicationDetail(resolvedParams.id);
  const { setDetailData } = useInvalidateApplications();

  const isCollege = user?.role === "COLLEGE_ADMIN" || user?.role === "COLLEGE_STAFF";
  const canFinalize = user?.role === "SENIOR_OFFICER" || user?.role === "SYSTEM_ADMIN";

  // Review Action Form State
  const [actionNotes, setActionNotes] = useState("");
  const [selectedAction, setSelectedAction] = useState<
    "APPROVE" | "REJECT" | "REQUEST_CLARIFICATION" | "ESCALATE"
  >("REQUEST_CLARIFICATION");
  const [reviewerName, setReviewerName] = useState(user?.name || "Dr. Milind Kulkarni (RO - Pune)");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // Dismiss Finding Dialog State
  const [dismissingFinding, setDismissingFinding] = useState<{ id: string; title: string } | null>(null);
  const [dismissReason, setDismissReason] = useState("");
  const [isSubmittingDismiss, setIsSubmittingDismiss] = useState(false);
  const [dismissError, setDismissError] = useState<string | null>(null);

  const handleReviewAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!app || !actionNotes.trim()) return;

    setIsSubmittingReview(true);
    let outcomeStatus: DecisionStatus = "APPROVED_BY_REVIEWER";
    if (selectedAction === "REJECT") outcomeStatus = "REJECTED_BY_REVIEWER";
    else if (selectedAction === "REQUEST_CLARIFICATION") outcomeStatus = "RETURNED_FOR_CLARIFICATION";
    else if (selectedAction === "ESCALATE") outcomeStatus = "AWAITING_HUMAN_REVIEW";

    try {
      const res = await fetch(`/api/applications/${app.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: app.id,
          reviewerId: user?.userId || "RO_PUNE_OFFICER",
          reviewerName: user?.name || reviewerName,
          action: selectedAction,
          outcomeStatus,
          notes: actionNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDetailData(app.id, data.data);
        setActionNotes("");
      } else {
        alert(`Action Blocked: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Request failed: ${err.message}`);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const openDismissDialog = (finding: { id: string; title: string }) => {
    setDismissingFinding(finding);
    setDismissReason("");
    setDismissError(null);
  };

  const submitDismissFinding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!app || !dismissingFinding) return;
    if (!dismissReason.trim()) {
      setDismissError("Please provide an official justification note.");
      return;
    }

    setIsSubmittingDismiss(true);
    setDismissError(null);

    try {
      const res = await fetch(`/api/applications/${app.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: app.id,
          reviewerId: user?.userId || "RO_PUNE_OFFICER",
          reviewerName: user?.name || reviewerName,
          action: "DISMISS_FLAG",
          notes: dismissReason.trim(),
          targetFindingId: dismissingFinding.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDetailData(app.id, data.data);
        setDismissingFinding(null);
        setDismissReason("");
      } else {
        setDismissError(data.error || "Failed to dismiss violation.");
      }
    } catch (err: any) {
      setDismissError(err.message || "Failed to submit request.");
    } finally {
      setIsSubmittingDismiss(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !app) return;
    setUploadingFiles(true);

    const formData = new FormData();
    for (const f of Array.from(e.target.files)) {
      formData.append("files", f);
    }

    try {
      const res = await fetch(`/api/applications/${app.id}/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setDetailData(app.id, data.data.application);
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingFiles(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-muted-foreground text-xs font-mono">
        Loading institutional application record...
      </div>
    );
  }

  if (!app) {
    return (
      <div className="py-20 text-center text-destructive text-xs font-mono">
        Application record not found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-3">
        <Link
          href="/applications"
          className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Directory</span>
        </Link>

        <div className="flex items-center space-x-2">
          <ExportPdfButton applicationId={app.id} referenceId={app.referenceId} />
          <a
            href={`/api/applications/${app.id}/report?format=csv`}
            download
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border border-input bg-card hover:bg-muted text-foreground transition shadow-2xs"
          >
            <FileDown className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Export CSV</span>
          </a>
          <a
            href={`/api/applications/${app.id}/report?format=json`}
            download
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border border-input bg-card hover:bg-muted text-foreground transition shadow-2xs"
          >
            <FileCode className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Export JSON</span>
          </a>
        </div>
      </div>

      {/* Main Info Card */}
      <Card className="shadow-xs">
        <CardHeader className="p-5 pb-4 border-b border-border">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-xl font-bold text-foreground">
                  {app.institutionName}
                </h1>
                <StatusBadge status={app.status} size="sm" />
              </div>
              <div className="text-xs text-muted-foreground mt-1 font-mono">
                Ref ID: <span className="font-semibold text-foreground">{app.referenceId}</span> • Type: {app.applicationType.replace(/_/g, " ")} • Cycle: {app.academicYear} • State: {app.state}
              </div>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
              <Badge variant="outline" className="font-mono text-xs px-2.5 py-1">
                {app.academicYear} Cycle
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5">
          {/* Dynamic Mathematical Compliance Risk Meter Gauge */}
          <div className="mb-5">
            <RiskMeterGauge assessment={app.riskAssessment || calculateRiskScore(app)} />
          </div>

          <Tabs defaultValue="findings" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="findings" className="text-xs font-semibold">
                Findings ({app.allFindings.length})
              </TabsTrigger>
              <TabsTrigger value="spatial" className="text-xs font-semibold">
                Infrastructure &amp; Spatial
              </TabsTrigger>
              <TabsTrigger value="comparison" className="text-xs font-semibold">
                Comparison Grid
              </TabsTrigger>
              <TabsTrigger value="documents" className="text-xs font-semibold">
                Credentials ({app.documents.length})
              </TabsTrigger>
              {!isCollege && (
                <TabsTrigger value="review" className="text-xs font-semibold">
                  Determination
                </TabsTrigger>
              )}
              <TabsTrigger value="audit" className="text-xs font-semibold">
                Audit Trail ({app.auditTrail.length})
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Findings */}
            <TabsContent value="findings" className="space-y-3">
              {app.allFindings.length === 0 ? (
                <div className="p-8 text-center bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-600 dark:text-emerald-400" />
                  <p className="font-bold text-sm">All Statutory Checks Passed</p>
                  <p className="mt-1 text-xs text-muted-foreground prose-readable mx-auto">
                    No discrepancies, expired certificates, or naming mismatches were found. The application complies with preliminary AICTE requirements.
                  </p>
                </div>
              ) : (
                app.allFindings.map((finding, idx) => (
                  <div
                    key={`${finding.id || finding.ruleId}_${idx}`}
                    className={`p-4 rounded-lg border transition ${
                      finding.dismissed
                        ? "bg-muted/30 border-border opacity-65"
                        : "bg-card border-border shadow-2xs"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <SeverityBadge severity={finding.severity} />
                          <span className="font-bold text-xs text-foreground">
                            {finding.title}
                          </span>
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted/80 text-muted-foreground border border-border">
                            {finding.ruleId}
                          </span>
                          {finding.dismissed && (
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              Waived by Scrutiny Officer
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground prose-readable leading-relaxed">
                          {finding.explanation}
                        </p>
                      </div>

                      {!finding.dismissed && !isCollege && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openDismissDialog({ id: finding.id, title: finding.title })}
                          className="text-[11px] h-8 shrink-0 border-dashed hover:border-solid hover:bg-muted"
                        >
                          Waive Violation
                        </Button>
                      )}
                    </div>

                    {finding.evidenceSnippet && (
                      <div className="mt-3 p-2.5 bg-muted/40 rounded border border-border text-[11px] text-muted-foreground font-mono">
                        <span className="font-bold text-foreground">Extracted Document Text: </span>
                        {finding.evidenceSnippet}
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground pt-2.5 border-t border-border">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-foreground">Required Action: </span>
                        <span>{finding.suggestedAction}</span>
                      </div>
                      <div className="font-mono text-[10px]">Evaluation Source: {finding.source}</div>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            {/* Tab: Infrastructure & Spatial Norms */}
            <TabsContent value="spatial" className="space-y-4">
              <SpatialComplianceCard spatialData={app.spatialBreakdown} />
            </TabsContent>

            {/* Tab 2: Comparison Grid */}
            <TabsContent value="comparison" className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Side-by-side comparison across all submitted credentials against the master registration.
                </p>
                <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                  Scroll horizontally to view all fields →
                </span>
              </div>
              <div className="border border-border rounded-lg overflow-hidden bg-card/60 shadow-xs">
                <Table className="min-w-[840px]">
                  <TableHeader className="bg-muted/40 border-b border-border">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs font-semibold py-3 pl-4">Document</TableHead>
                      <TableHead className="text-xs font-semibold py-3">Category</TableHead>
                      <TableHead className="text-xs font-semibold py-3">Extracted Entity Name</TableHead>
                      <TableHead className="text-xs font-semibold py-3">Cert / Ref #</TableHead>
                      <TableHead className="text-xs font-semibold py-3">Issue Date</TableHead>
                      <TableHead className="text-xs font-semibold py-3">Expiry Date</TableHead>
                      <TableHead className="text-xs font-semibold py-3 pr-4">Issuing Authority</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs font-mono">
                    <TableRow className="bg-primary/5 font-semibold border-b border-border">
                      <TableCell className="font-sans pl-4 text-foreground flex items-center gap-1.5 py-3">
                        <span className="h-2 w-2 rounded-full bg-primary inline-block"></span>
                        Master Application
                      </TableCell>
                      <TableCell className="text-primary font-sans font-medium">APPLICATION_FORM</TableCell>
                      <TableCell className="text-primary font-sans font-bold">{app.institutionName}</TableCell>
                      <TableCell className="text-foreground">{app.referenceId}</TableCell>
                      <TableCell className="text-muted-foreground">-</TableCell>
                      <TableCell className="text-muted-foreground">-</TableCell>
                      <TableCell className="font-sans text-foreground pr-4">AICTE Portal</TableCell>
                    </TableRow>

                    {app.documents.map((doc) => {
                      const fields = doc.extractedFields || {};
                      const instName = fields.institutionName;
                      const isMismatch =
                        instName &&
                        instName.toLowerCase() !== app.institutionName.toLowerCase();

                      return (
                        <TableRow key={doc.id} className="hover:bg-muted/30 transition-colors border-b border-border/60">
                          <TableCell className="font-sans font-medium text-foreground pl-4 py-3">
                            {doc.originalFilename}
                          </TableCell>
                          <TableCell className="text-muted-foreground font-sans">
                            <span className="px-1.5 py-0.5 rounded bg-muted/60 text-[11px]">
                              {doc.category}
                            </span>
                          </TableCell>
                          <TableCell className="font-sans">
                            {instName ? (
                              <span
                                className={
                                  isMismatch
                                    ? "text-destructive font-bold bg-destructive/10 px-2 py-0.5 rounded border border-destructive/20 inline-block"
                                    : "text-emerald-600 dark:text-emerald-400 font-medium"
                                }
                              >
                                {instName}
                              </span>
                            ) : (
                              <span className="text-muted-foreground italic font-sans">None</span>
                            )}
                          </TableCell>
                          <TableCell className="text-foreground">
                            {fields.certificateNumber ||
                              fields.applicationNumber ||
                              "-"}
                          </TableCell>
                          <TableCell className="text-foreground">{fields.issueDate || "-"}</TableCell>
                          <TableCell className="text-foreground">{fields.expiryDate || "-"}</TableCell>
                          <TableCell className="font-sans text-muted-foreground pr-4">{fields.issuingAuthority || "-"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Tab 3: Documents and Raw Extracted Text */}
            <TabsContent value="documents" className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Attached Statutory Credentials ({app.documents.length})
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Original files uploaded by the institution with cryptographic verification digests and OCR text.
                  </p>
                </div>
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold rounded-md shadow-2xs transition self-start sm:self-auto">
                  <Upload className="h-3.5 w-3.5" />
                  <span>{uploadingFiles ? "Processing Document..." : "Upload Additional Document"}</span>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,image/png,image/jpeg"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {app.documents.length === 0 ? (
                <div className="p-8 text-center bg-card rounded-lg border border-border">
                  <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="font-semibold text-xs text-foreground">No documents attached yet</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 prose-readable mx-auto">
                    Upload statutory PDFs or scanned images to extract credentials and execute compliance validation.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {app.documents.map((doc) => (
                    <Card key={doc.id} className="shadow-xs p-4 space-y-3 border-border">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border">
                        <div className="flex items-center space-x-2.5">
                          <div className="h-8 w-8 rounded bg-muted/60 flex items-center justify-center shrink-0">
                            <FileText className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <div className="font-bold text-xs text-foreground font-sans">
                              {doc.originalFilename}
                            </div>
                            <div className="text-[11px] text-muted-foreground font-mono">
                              Category: <span className="font-semibold text-foreground">{doc.category}</span> • Size: {(doc.sizeBytes / 1024).toFixed(1)} KB • SHA-256: {doc.sha256Hash.substring(0, 16)}...
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {doc.provenance?.provider && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                              Engine: {doc.provenance.provider}
                            </span>
                          )}
                          <Badge
                            variant={doc.extractionStatus === "SUCCESS" ? "outline" : "destructive"}
                            className="font-mono text-[10px]"
                          >
                            {doc.extractionStatus === "SUCCESS" ? "Parsed Successfully" : "Extraction Failed"}
                          </Badge>
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] font-mono font-bold text-muted-foreground uppercase mb-1">
                          Extracted Text Content:
                        </div>
                        <div className="p-3 bg-muted/30 border border-border rounded-md text-[11px] font-mono text-foreground max-h-32 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                          {doc.extractedText || "No readable text was detected in this file. If this is a password-protected PDF or blurred image, please re-upload a clear unencrypted copy."}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Tab 4: Reviewer Action */}
            {!isCollege && (
              <TabsContent value="review" className="max-w-xl space-y-4">
                <div className="bg-muted/30 p-3.5 rounded-lg border border-border text-xs text-muted-foreground prose-readable">
                  <p className="font-semibold text-foreground">Scrutiny Adjudication Guidelines</p>
                  <p className="mt-1 text-[11px] leading-relaxed">
                    Decisions recorded here become an immutable part of the statutory audit trail. Adverse determinations or requests for clarification must cite specific document discrepancies and AICTE Approval Process Handbook (APH) clauses.
                  </p>
                </div>

                <form onSubmit={handleReviewAction} className="space-y-4">
                  <div>
                    <label htmlFor="officer-name" className="block text-xs font-semibold text-foreground mb-1.5">
                      Scrutiny Officer Name & Designation *
                    </label>
                    <Input
                      id="officer-name"
                      required
                      value={reviewerName}
                      onChange={(e) => setReviewerName(e.target.value)}
                      className="text-xs h-9"
                      placeholder="e.g. Dr. R. K. Verma (Senior Review Officer)"
                    />
                  </div>

                  <fieldset className="space-y-1.5" role="radiogroup" aria-labelledby="adjudication-legend">
                    <legend id="adjudication-legend" className="block text-xs font-semibold text-foreground">
                      Adjudication Determination *
                    </legend>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
                      <Button
                        type="button"
                        role="radio"
                        aria-checked={selectedAction === "APPROVE"}
                        variant={selectedAction === "APPROVE" ? "default" : "outline"}
                        size="sm"
                        disabled={!canFinalize}
                        onClick={() => setSelectedAction("APPROVE")}
                        className={`text-xs h-9 font-semibold ${!canFinalize ? "opacity-50 cursor-not-allowed" : ""}`}
                        title={!canFinalize ? "Requires Senior Officer authority" : ""}
                      >
                        Approve
                      </Button>
                      <Button
                        type="button"
                        role="radio"
                        aria-checked={selectedAction === "REQUEST_CLARIFICATION"}
                        variant={selectedAction === "REQUEST_CLARIFICATION" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedAction("REQUEST_CLARIFICATION")}
                        className="text-xs h-9 font-semibold"
                      >
                        Clarify
                      </Button>
                      <Button
                        type="button"
                        role="radio"
                        aria-checked={selectedAction === "ESCALATE"}
                        variant={selectedAction === "ESCALATE" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedAction("ESCALATE")}
                        className="text-xs h-9 font-semibold"
                      >
                        Escalate
                      </Button>
                      <Button
                        type="button"
                        role="radio"
                        aria-checked={selectedAction === "REJECT"}
                        variant={selectedAction === "REJECT" ? "default" : "outline"}
                        size="sm"
                        disabled={!canFinalize}
                        onClick={() => setSelectedAction("REJECT")}
                        className={`text-xs h-9 font-semibold ${!canFinalize ? "opacity-50 cursor-not-allowed" : ""}`}
                        title={!canFinalize ? "Requires Senior Officer authority" : ""}
                      >
                        Reject
                      </Button>
                    </div>
                    {!canFinalize && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-1">
                        * Final Approve and Reject decisions require Senior Officer authority (OFFICER_2 / SENIOR_OFFICER).
                      </p>
                    )}
                  </fieldset>

                  <div>
                    <label htmlFor="action-notes" className="block text-xs font-semibold text-foreground mb-1.5">
                      Official Justification & Decision Notes *
                    </label>
                    <textarea
                      id="action-notes"
                      rows={3}
                      required
                      placeholder="Enter factual grounds for this determination and reference relevant certificate pages..."
                      value={actionNotes}
                      onChange={(e) => setActionNotes(e.target.value)}
                      className="w-full text-xs p-3 rounded-md border border-input bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-ring leading-relaxed"
                    ></textarea>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmittingReview}
                    className="font-semibold text-xs h-9 px-4 shadow-2xs"
                  >
                    {isSubmittingReview ? "Saving Decision..." : "Submit Official Adjudication"}
                  </Button>
                </form>
              </TabsContent>
            )}

            {/* Tab 5: Audit Trail */}
            <TabsContent value="audit" className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Chronological audit log of uploads, rule executions, and officer interventions.
              </p>
              <div className="divide-y divide-border border border-border rounded-md overflow-hidden bg-card">
                {app.auditTrail.map((ev) => (
                  <div key={ev.id} className="p-2.5 text-xs flex items-center justify-between font-mono text-[11px]">
                    <div className="space-y-0.5">
                      <div className="font-bold text-foreground">
                        {ev.action}
                      </div>
                      <div className="text-muted-foreground">
                        Actor: {ev.actor}
                      </div>
                    </div>
                    <div className="text-muted-foreground">
                      {ev.timestamp}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Accessible In-App Waiver / Dismissal Dialog */}
      {dismissingFinding && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="waiver-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in-0"
        >
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-lg space-y-4">
            <div className="space-y-1">
              <h2 id="waiver-dialog-title" className="text-base font-bold text-foreground">
                Waive Regulatory Violation
              </h2>
              <p className="text-xs text-muted-foreground prose-readable">
                Record an official justification for overriding this finding. This action will be immutably recorded in the statutory audit trail.
              </p>
            </div>

            <div className="p-3 bg-muted/30 rounded-md border border-border text-xs text-foreground font-medium">
              <span className="text-muted-foreground text-[11px] block font-mono uppercase mb-0.5">Target Violation</span>
              {dismissingFinding.title}
            </div>

            {dismissError && (
              <div className="p-2.5 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-md">
                {dismissError}
              </div>
            )}

            <form onSubmit={submitDismissFinding} className="space-y-4">
              <div>
                <label htmlFor="dismiss-reason-input" className="block text-xs font-semibold text-foreground mb-1.5">
                  Official Justification & Governing Handbook Clause *
                </label>
                <textarea
                  id="dismiss-reason-input"
                  required
                  rows={3}
                  value={dismissReason}
                  onChange={(e) => setDismissReason(e.target.value)}
                  placeholder="e.g. Verified valid trustee resolution and state gazette notification approving entity name amendment."
                  className="w-full text-xs p-3 rounded-md border border-input bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-ring leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDismissingFinding(null);
                    setDismissReason("");
                    setDismissError(null);
                  }}
                  className="text-xs h-9"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingDismiss}
                  className="text-xs h-9 font-semibold shadow-2xs"
                >
                  {isSubmittingDismiss ? "Recording Waiver..." : "Confirm & Record Waiver"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
