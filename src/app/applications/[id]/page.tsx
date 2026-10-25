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
import { useApplicationDetail, useInvalidateApplications } from "@/lib/hooks/use-applications";

export default function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const { data: app, isLoading: loading } = useApplicationDetail(resolvedParams.id);
  const { setDetailData } = useInvalidateApplications();

  // Review Action Form State
  const [actionNotes, setActionNotes] = useState("");
  const [selectedAction, setSelectedAction] = useState<
    "APPROVE" | "REJECT" | "REQUEST_CLARIFICATION" | "ESCALATE"
  >("APPROVE");
  const [reviewerName, setReviewerName] = useState("Dr. R. K. Verma (Scrutiny Officer)");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);

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
          reviewerId: "REV_OFFICER_01",
          reviewerName,
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

  const handleDismissFinding = async (findingId: string) => {
    if (!app) return;
    const reason = prompt("Enter official reason for acknowledging or dismissing this finding:");
    if (!reason) return;

    try {
      const res = await fetch(`/api/applications/${app.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: app.id,
          reviewerId: "REV_OFFICER_01",
          reviewerName,
          action: "DISMISS_FLAG",
          notes: reason,
          targetFindingId: findingId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDetailData(app.id, data.data);
      }
    } catch (err) {
      console.error(err);
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

            {app.jevDecision && (
              <div className="bg-muted/40 p-2.5 rounded-md border border-border text-right">
                <div className="text-[11px] font-mono text-muted-foreground">
                  Layer: <span className="font-semibold text-foreground">{app.jevDecision.usedModel}</span>
                </div>
                <div className="text-[11px] font-mono text-foreground mt-0.5">
                  Priority: <span className="font-bold">{app.jevDecision.reviewPriority}</span> • Suggested: {app.jevDecision.proposedStatus}
                </div>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-5">
          <Tabs defaultValue="findings" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="findings" className="text-xs font-semibold">
                Findings ({app.allFindings.length})
              </TabsTrigger>
              <TabsTrigger value="comparison" className="text-xs font-semibold">
                Comparison Grid
              </TabsTrigger>
              <TabsTrigger value="documents" className="text-xs font-semibold">
                Credentials ({app.documents.length})
              </TabsTrigger>
              <TabsTrigger value="review" className="text-xs font-semibold">
                Determination
              </TabsTrigger>
              <TabsTrigger value="audit" className="text-xs font-semibold">
                Audit Trail ({app.auditTrail.length})
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Findings */}
            <TabsContent value="findings" className="space-y-3">
              {app.allFindings.length === 0 ? (
                <div className="p-6 text-center bg-emerald-500/10 rounded-md border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs">
                  <CheckCircle2 className="h-6 w-6 mx-auto mb-1 text-emerald-600" />
                  <p className="font-bold">Zero Violations Detected</p>
                  <p className="mt-0.5">Application complies with preliminary statutory norms.</p>
                </div>
              ) : (
                app.allFindings.map((finding) => (
                  <div
                    key={finding.id}
                    className={`p-3.5 rounded-md border transition ${
                      finding.dismissed
                        ? "bg-muted/30 border-border opacity-60"
                        : "bg-card border-border shadow-2xs"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <SeverityBadge severity={finding.severity} />
                          <span className="font-bold text-xs text-foreground">
                            {finding.title}
                          </span>
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {finding.ruleId}
                          </Badge>
                          {finding.dismissed && (
                            <Badge variant="secondary" className="font-mono text-[10px]">
                              Dismissed by Officer
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground pt-0.5">
                          {finding.explanation}
                        </p>
                      </div>

                      {!finding.dismissed && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDismissFinding(finding.id)}
                          className="text-[11px] h-7 shadow-2xs"
                        >
                          Dismiss / Justify
                        </Button>
                      )}
                    </div>

                    {finding.evidenceSnippet && (
                      <div className="mt-2.5 p-2 bg-muted/40 rounded border border-border text-[11px] text-muted-foreground font-mono">
                        <span className="font-bold text-foreground">Evidence: </span>
                        {finding.evidenceSnippet}
                      </div>
                    )}

                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border font-mono">
                      <div>
                        <span className="font-bold text-foreground">Next Step: </span>
                        {finding.suggestedAction}
                      </div>
                      <div>Source: {finding.source}</div>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            {/* Tab 2: Comparison Grid */}
            <TabsContent value="comparison" className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Side-by-side comparison across all submitted credentials against the master registration.
              </p>
              <div className="border border-border rounded-md overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="text-xs font-bold">Document</TableHead>
                      <TableHead className="text-xs font-bold">Category</TableHead>
                      <TableHead className="text-xs font-bold">Extracted Entity Name</TableHead>
                      <TableHead className="text-xs font-bold">Cert / Ref #</TableHead>
                      <TableHead className="text-xs font-bold">Issue Date</TableHead>
                      <TableHead className="text-xs font-bold">Expiry Date</TableHead>
                      <TableHead className="text-xs font-bold">Issuing Authority</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs font-mono">
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell className="font-sans">Master Application</TableCell>
                      <TableCell>APPLICATION_FORM</TableCell>
                      <TableCell className="text-primary font-sans">{app.institutionName}</TableCell>
                      <TableCell>{app.referenceId}</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell className="font-sans">AICTE Portal</TableCell>
                    </TableRow>

                    {app.documents.map((doc) => {
                      const fields = doc.extractedFields || {};
                      const instName = fields.institutionName;
                      const isMismatch =
                        instName &&
                        instName.toLowerCase() !== app.institutionName.toLowerCase();

                      return (
                        <TableRow key={doc.id} className="hover:bg-muted/20">
                          <TableCell className="font-sans font-medium">{doc.originalFilename}</TableCell>
                          <TableCell className="text-muted-foreground">{doc.category}</TableCell>
                          <TableCell className="font-sans">
                            {instName ? (
                              <span
                                className={
                                  isMismatch
                                    ? "text-destructive font-bold bg-destructive/10 px-1 py-0.5 rounded"
                                    : "text-emerald-600 font-medium"
                                }
                              >
                                {instName}
                              </span>
                            ) : (
                              <span className="text-muted-foreground italic">None</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {fields.certificateNumber ||
                              fields.applicationNumber ||
                              "-"}
                          </TableCell>
                          <TableCell>{fields.issueDate || "-"}</TableCell>
                          <TableCell>{fields.expiryDate || "-"}</TableCell>
                          <TableCell className="font-sans">{fields.issuingAuthority || "-"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Tab 3: Documents and Raw Extracted Text */}
            <TabsContent value="documents" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Attached Credentials ({app.documents.length})
                </h3>
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold rounded-md shadow-2xs transition">
                  <Upload className="h-3.5 w-3.5" />
                  <span>{uploadingFiles ? "Uploading..." : "Attach File"}</span>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,image/png,image/jpeg"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="space-y-3">
                {app.documents.map((doc) => (
                  <Card key={doc.id} className="shadow-xs p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="font-bold text-xs text-foreground font-sans">
                            {doc.originalFilename}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            Category: {doc.category} • Size: {(doc.sizeBytes / 1024).toFixed(1)} KB • Hash: {doc.sha256Hash.substring(0, 16)}...
                          </div>
                        </div>
                      </div>
                      <Badge
                        variant={doc.extractionStatus === "SUCCESS" ? "outline" : "destructive"}
                        className="font-mono text-[10px]"
                      >
                        {doc.extractionStatus}
                      </Badge>
                    </div>

                    <div>
                      <div className="text-[10px] font-mono font-bold text-muted-foreground uppercase mb-1">
                        Raw Text Content:
                      </div>
                      <div className="p-2.5 bg-muted/30 border border-border rounded-md text-[11px] font-mono text-foreground max-h-28 overflow-y-auto whitespace-pre-wrap">
                        {doc.extractedText || "(No readable text detected)"}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Tab 4: Reviewer Action */}
            <TabsContent value="review" className="max-w-xl space-y-4">
              <div className="bg-muted/40 p-3 rounded-md border border-border text-xs text-muted-foreground leading-relaxed">
                <span className="font-bold text-foreground">Scrutiny Requirement:</span> Record justification notes for every adverse determination or clarification request.
              </div>

              <form onSubmit={handleReviewAction} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Officer Identity *
                  </label>
                  <Input
                    required
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Determination Action *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <Button
                      type="button"
                      variant={selectedAction === "APPROVE" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedAction("APPROVE")}
                      className="text-xs"
                    >
                      Approve
                    </Button>
                    <Button
                      type="button"
                      variant={selectedAction === "REQUEST_CLARIFICATION" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedAction("REQUEST_CLARIFICATION")}
                      className="text-xs"
                    >
                      Clarification
                    </Button>
                    <Button
                      type="button"
                      variant={selectedAction === "ESCALATE" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedAction("ESCALATE")}
                      className="text-xs"
                    >
                      Escalate
                    </Button>
                    <Button
                      type="button"
                      variant={selectedAction === "REJECT" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedAction("REJECT")}
                      className="text-xs"
                    >
                      Reject
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Justification Notes *
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="State the regulatory grounds and referenced document pages..."
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-md border border-input bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  ></textarea>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmittingReview}
                  size="sm"
                  className="font-semibold text-xs shadow-2xs"
                >
                  {isSubmittingReview ? "Recording..." : "Record Official Determination"}
                </Button>
              </form>

              {app.reviews.length > 0 && (
                <div className="pt-4 border-t border-border space-y-2">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">
                    Decision History ({app.reviews.length})
                  </h3>
                  {app.reviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-2.5 bg-card border border-border rounded-md text-xs space-y-1 font-mono text-[11px]"
                    >
                      <div className="flex items-center justify-between font-bold text-foreground">
                        <span>{rev.reviewerName}</span>
                        <span className="text-muted-foreground">{rev.timestamp}</span>
                      </div>
                      <div className="text-primary font-semibold">
                        Action: {rev.action} &rarr; Status: {rev.outcomeStatus}
                      </div>
                      <p className="text-muted-foreground font-sans">{rev.notes}</p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

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
    </div>
  );
}
