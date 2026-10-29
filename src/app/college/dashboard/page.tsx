"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Building2,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldAlert,
  ArrowUpRight,
  UploadCloud,
  FileCheck2,
  Info,
  BadgeAlert,
  GraduationCap,
  AlertTriangle,
  CalendarClock,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApplications, useCurrentUser } from "@/lib/hooks/use-applications";
import { calculateRiskScore } from "@/lib/rules/risk-scoring";
import { evaluateDocumentExpiry, ExpiryAlert } from "@/lib/documents/statutory-document-matrix";

export default function CollegeDashboard() {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: apps = [], isLoading: appsLoading } = useApplications();

  const loading = userLoading || appsLoading;

  // Resolve institution name & official code
  const institutionName =
    apps[0]?.institutionName ||
    (user?.institutionId === "inst_apex_tech_01"
      ? "Bharat Institute of Advanced Engineering"
      : "Institutional Portal");

  const officialCode =
    user?.institutionId === "inst_apex_tech_01"
      ? "AICTE-INST-DEL-101"
      : user?.institutionId || "AICTE-PORTAL";

  // Scoped KPI counts
  const totalSubmissions = apps.length;
  const underScrutiny = apps.filter(
    (a) =>
      a.status === "NEEDS_REVIEW" ||
      a.status === "VERIFICATION_REQUIRED" ||
      a.status === "AWAITING_HUMAN_REVIEW"
  ).length;
  const actionRequired = apps.filter(
    (a) =>
      a.status === "INCOMPLETE" ||
      a.status === "RETURNED_FOR_CLARIFICATION" ||
      a.status === "UNABLE_TO_PROCESS"
  ).length;
  const approved = apps.filter(
    (a) => a.status === "APPROVED_BY_REVIEWER" || a.status === "PASSED_INITIAL_CHECKS"
  ).length;

  // Aggregate active deficiencies across own applications
  const activeDeficiencies = apps.flatMap((app, appIdx) =>
    (app.allFindings || [])
      .filter((f) => !f.dismissed)
      .map((f, findingIdx) => ({
        ...f,
        uniqueKey: `def_${app.id || app.referenceId || appIdx}_${f.id || f.ruleId || findingIdx}_${appIdx}_${findingIdx}`,
        appRef: app.referenceId,
        appId: app.id || app.referenceId,
        appName: app.institutionName,
      }))
  );

  // Proactive temporal expiry monitoring (90d, 60d, 30d cascades)
  const allExpiryAlerts: ExpiryAlert[] = apps.flatMap((app) =>
    (app.documents || [])
      .map((doc) => evaluateDocumentExpiry(doc))
      .filter((alert): alert is ExpiryAlert => alert !== null && alert.alertSeverity !== "NONE")
  );

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "TIER_1_CRITICAL":
      case "CRITICAL":
        return <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 text-[10px]">Critical</Badge>;
      case "HIGH":
        return <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px]">High</Badge>;
      case "MEDIUM":
      case "WARNING":
        return <Badge className="bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30 text-[10px]">Warning</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">Notice</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* College Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-foreground">
                  {institutionName}
                </h1>
                <Badge variant="outline" className="text-[10px] font-mono uppercase px-2 py-0.5">
                  {officialCode}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Logged in as <span className="font-semibold text-foreground">{user?.name || "College Administrator"}</span> (
                <span className="font-mono text-primary font-medium">{user?.role || "COLLEGE_ADMIN"}</span>)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user?.role === "COLLEGE_ADMIN" ? (
            <Link
              href="/intake"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition"
            >
              <Plus className="h-4 w-4" />
              <span>New Application Intake</span>
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Button disabled variant="outline" size="sm" className="text-xs opacity-70 cursor-not-allowed">
                <Plus className="h-3.5 w-3.5 mr-1" />
                New Application Intake
              </Button>
              <Badge variant="secondary" className="text-[10px]">
                Staff (Drafts Only)
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* Proactive Temporal Expiry Alert Cascade (90d / 60d / 30d monitoring) */}
      {allExpiryAlerts.length > 0 && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                Proactive Statutory Clearance Expiry Monitor ({allExpiryAlerts.length} Alert{allExpiryAlerts.length > 1 ? "s" : ""})
              </span>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono border-amber-500/40 text-amber-700 dark:text-amber-300">
              APH Automated Watchdog
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {allExpiryAlerts.map((alert, idx) => (
              <div
                key={idx}
                className="flex items-start justify-between gap-2 p-2.5 rounded-lg bg-card/80 border border-border/70"
              >
                <div>
                  <p className="font-semibold text-foreground">{alert.documentFilename}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{alert.message}</p>
                </div>
                <Badge
                  variant="outline"
                  className={
                    alert.alertLevel === "CRITICAL_30_DAYS" || alert.alertLevel === "EXPIRED"
                      ? "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 text-[10px] shrink-0"
                      : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] shrink-0"
                  }
                >
                  {alert.alertLevel.replace(/_/g, " ")}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scoped KPI Strip (Own Institution Only) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-xs border-border/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Total Submissions</p>
              <h3 className="text-2xl font-bold mt-1 text-foreground">{totalSubmissions}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
              <FileText className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Under Scrutiny / Queue</p>
              <h3 className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">
                {underScrutiny}
              </h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Action Required</p>
              <h3 className="text-2xl font-bold mt-1 text-rose-600 dark:text-rose-400">
                {actionRequired}
              </h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <AlertCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Approved</p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                {approved}
              </h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Applications Table */}
      <Card className="shadow-xs border-border/80">
        <CardHeader className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-primary" />
                My Institution&apos;s Applications
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Scoped strictly to {institutionName} dossiers and compliance status
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono">
              {apps.length} Record{apps.length !== 1 ? "s" : ""}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="text-[11px] font-medium bg-muted/30">
                <TableHead className="pl-4">Reference ID</TableHead>
                <TableHead>Academic Year</TableHead>
                <TableHead>Application Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Risk Index (S_risk)</TableHead>
                <TableHead>Active Findings</TableHead>
                <TableHead className="text-right pr-4">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-xs text-muted-foreground">
                    Loading your institutional applications...
                  </TableCell>
                </TableRow>
              ) : apps.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-xs text-muted-foreground">
                    <div className="max-w-sm mx-auto space-y-2">
                      <p className="font-semibold text-foreground">No applications found</p>
                      <p className="text-[11px]">
                        Your institution has no active submissions recorded yet. Click &ldquo;New Application Intake&rdquo; above to start.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                apps.map((app) => {
                  const activeCount = (app.allFindings || []).filter((f: any) => !f.dismissed).length;
                  const risk = app.riskAssessment || calculateRiskScore(app);
                  const riskColor =
                    risk.riskTier === "HIGH_RISK"
                      ? "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30"
                      : risk.riskTier === "MEDIUM_RISK"
                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                      : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";

                  return (
                    <TableRow key={app.id} className="text-xs hover:bg-muted/40 transition">
                      <TableCell className="pl-4 font-mono font-semibold text-foreground">
                        {app.referenceId}
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground">
                        {app.academicYear}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {app.applicationType.replace(/_/g, " ")}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={app.status} />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] font-mono ${riskColor}`}>
                          {(risk.riskScore * 100).toFixed(0)}% • {risk.routeLabel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {activeCount > 0 ? (
                          <Badge variant="outline" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 text-[11px] font-mono">
                            {activeCount} issue{activeCount > 1 ? "s" : ""}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[11px]">
                            Clean
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <Link
                          href={`/applications/${app.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition"
                        >
                          <span>View Dossier / Upload Docs</span>
                          <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Plain-Language Deficiency & Action Required Panel */}
      <Card className="shadow-xs border-border/80">
        <CardHeader className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BadgeAlert className="h-4 w-4 text-rose-500" />
                Plain-Language Deficiency & Action Required Panel
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Active discrepancies, missing statutory documentation, and suggested remediation steps
              </CardDescription>
            </div>
            <Badge
              variant="outline"
              className={
                activeDeficiencies.length > 0
                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 text-[10px]"
                  : "bg-emerald-500/10 text-emerald-600 text-[10px]"
              }
            >
              {activeDeficiencies.length} Action Item{activeDeficiencies.length !== 1 ? "s" : ""}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {activeDeficiencies.length === 0 ? (
            <div className="flex items-center gap-3 py-6 px-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <div className="text-xs">
                <p className="font-semibold">All institutional documents are in statutory compliance</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  No active deficiencies or unaddressed scrutiny flags were detected for {institutionName}.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {activeDeficiencies.map((finding) => (
                <div
                  key={finding.uniqueKey}
                  className="p-3.5 rounded-lg border border-border bg-card/50 hover:bg-muted/30 transition space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {getSeverityBadge(finding.severity)}
                      <span className="font-semibold text-foreground">
                        {finding.title || finding.ruleId || "Compliance Discrepancy"}
                      </span>
                    </div>
                    <Link
                      href={`/applications/${finding.appId}`}
                      className="inline-flex items-center gap-1 font-mono text-[11px] text-primary hover:underline"
                    >
                      <span>{finding.appRef}</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </div>

                  <p className="text-muted-foreground leading-relaxed">
                    {finding.explanation || "Discrepancy detected during rule validation."}
                  </p>

                  {finding.suggestedAction && (
                    <div className="flex items-start gap-2 pt-1 text-[11px] bg-muted/40 p-2.5 rounded-md border border-border/60">
                      <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-foreground">How to Remediate: </span>
                        <span className="text-muted-foreground">{finding.suggestedAction}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
