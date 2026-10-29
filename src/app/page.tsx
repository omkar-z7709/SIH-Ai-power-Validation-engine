"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileText,
  AlertTriangle,
  Clock,
  ShieldCheck,
  CheckCircle2,
  FileX2,
  RotateCcw,
  ArrowRight,
  Database,
  ArrowUpRight,
} from "lucide-react";
import { ApplicationRecord } from "@/types";
import { StatusBadge } from "@/components/StatusBadge";
import { SeverityBadge } from "@/components/SeverityBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useApplications, useInvalidateApplications } from "@/lib/hooks/use-applications";

export default function DashboardPage() {
  const { data: apps = [], isLoading: loading, refetch } = useApplications();
  const { invalidateAll } = useInvalidateApplications();
  const [seeding, setSeeding] = useState(false);

  const handleSeedDemo = async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/demo/seed", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        invalidateAll();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSeeding(false);
    }
  };

  const totalApps = apps.length;
  const pendingReviews = apps.filter(
    (a) => a.status === "NEEDS_REVIEW" || a.status === "AWAITING_HUMAN_REVIEW"
  ).length;
  const missingDocs = apps.filter((a) => a.status === "INCOMPLETE").length;
  const verificationReq = apps.filter(
    (a) => a.status === "VERIFICATION_REQUIRED"
  ).length;
  const passedChecks = apps.filter(
    (a) => a.status === "PASSED_INITIAL_CHECKS" || a.status === "APPROVED_BY_REVIEWER"
  ).length;
  const unableToProcess = apps.filter(
    (a) => a.status === "UNABLE_TO_PROCESS"
  ).length;

  const highPriorityCases = apps
    .filter((a) =>
      a.allFindings.some((f) => f.severity === "CRITICAL" || f.severity === "HIGH")
    )
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Overview Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Compliance Scrutiny Studio
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 prose-readable">
            Automated scrutiny of institutional credentials, cross-document discrepancies, and officer review queue.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSeedDemo}
            disabled={seeding}
            className="text-xs font-semibold gap-1.5 h-8"
          >
            <Database className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{seeding ? "Seeding..." : "Load 6 Sample Cases"}</span>
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            className="h-8 w-8"
            title="Refresh application data"
            aria-label="Refresh application data"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Metrics Bento Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="shadow-xs">
          <CardHeader className="p-3.5 pb-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <span>Total Intake</span>
              <FileText className="h-3.5 w-3.5" />
            </div>
            <CardTitle className="text-2xl font-bold font-mono tracking-tight text-foreground">
              {totalApps}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 pt-0 text-[11px] text-muted-foreground">
            Applications
          </CardContent>
        </Card>

        <Card className="shadow-xs border-destructive/30 bg-destructive/5">
          <CardHeader className="p-3.5 pb-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-destructive uppercase tracking-wider">
              <span>Needs Review</span>
              <AlertTriangle className="h-3.5 w-3.5" />
            </div>
            <CardTitle className="text-2xl font-bold font-mono tracking-tight text-destructive">
              {pendingReviews}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 pt-0 text-[11px] text-muted-foreground">
            Inconsistent data
          </CardContent>
        </Card>

        <Card className="shadow-xs border-amber-500/30 bg-amber-500/5">
          <CardHeader className="p-3.5 pb-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              <span>Incomplete</span>
              <Clock className="h-3.5 w-3.5" />
            </div>
            <CardTitle className="text-2xl font-bold font-mono tracking-tight text-amber-700 dark:text-amber-400">
              {missingDocs}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 pt-0 text-[11px] text-muted-foreground">
            Missing documents
          </CardContent>
        </Card>

        <Card className="shadow-xs border-blue-500/30 bg-blue-500/5">
          <CardHeader className="p-3.5 pb-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
              <span>Verification</span>
              <ShieldCheck className="h-3.5 w-3.5" />
            </div>
            <CardTitle className="text-2xl font-bold font-mono tracking-tight text-blue-700 dark:text-blue-400">
              {verificationReq}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 pt-0 text-[11px] text-muted-foreground">
            Statutory queries
          </CardContent>
        </Card>

        <Card className="shadow-xs border-emerald-500/30 bg-emerald-500/5">
          <CardHeader className="p-3.5 pb-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              <span>Passed Checks</span>
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
            <CardTitle className="text-2xl font-bold font-mono tracking-tight text-emerald-700 dark:text-emerald-400">
              {passedChecks}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 pt-0 text-[11px] text-muted-foreground">
            Clean submissions
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="p-3.5 pb-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <span>Unreadable</span>
              <FileX2 className="h-3.5 w-3.5" />
            </div>
            <CardTitle className="text-2xl font-bold font-mono tracking-tight text-foreground">
              {unableToProcess}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 pt-0 text-[11px] text-muted-foreground">
            Extraction errors
          </CardContent>
        </Card>
      </div>

      {/* High-Priority Review Queue */}
      <Card className="shadow-xs overflow-hidden">
        <CardHeader className="px-4 py-3 bg-muted/30 border-b border-border flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
              High-Priority Review Queue
            </CardTitle>
            <CardDescription className="text-[11px] text-muted-foreground mt-0.5">
              Submissions requiring officer determination
            </CardDescription>
          </div>
          <Link
            href="/queue"
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition"
          >
            <span>View All Queue</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>

        <CardContent className="p-0 divide-y divide-border">
          {highPriorityCases.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No active high-priority flags. Click &quot;Seed 6 Test Scenarios&quot; to test.
            </div>
          ) : (
            highPriorityCases.map((app) => (
              <div key={app.id} className="p-4 hover:bg-muted/20 transition">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <Link
                        href={`/applications/${app.id}`}
                        className="font-bold text-sm text-foreground hover:text-primary transition"
                      >
                        {app.institutionName}
                      </Link>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {app.referenceId}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                      {app.state} • {app.academicYear} • {app.documents.length} credentials attached
                    </div>
                  </div>
                  <StatusBadge status={app.status} size="sm" />
                </div>

                <div className="mt-2.5 space-y-1.5">
                  {app.allFindings.slice(0, 2).map((finding, idx) => (
                    <div
                      key={`${app.id}_${finding.id || finding.ruleId}_${idx}`}
                      className="flex items-start space-x-2 text-xs bg-muted/40 p-2 rounded-md border border-border"
                    >
                      <SeverityBadge severity={finding.severity} />
                      <span className="font-semibold text-foreground">
                        {finding.title}:
                      </span>
                      <span className="text-muted-foreground line-clamp-1">
                        {finding.explanation}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex justify-end">
                  <Link
                    href={`/applications/${app.id}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border border-input bg-card hover:bg-muted text-foreground transition shadow-2xs"
                  >
                    <span>Examine Details</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
