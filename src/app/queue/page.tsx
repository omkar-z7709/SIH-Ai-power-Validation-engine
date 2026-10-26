"use client";

import { useState } from "react";
import Link from "next/link";
import { Filter, ArrowUpRight } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { SeverityBadge } from "@/components/SeverityBadge";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useApplications } from "@/lib/hooks/use-applications";

export default function ReviewQueuePage() {
  const { data: apps = [], isLoading: loading } = useApplications();
  const [filterType, setFilterType] = useState<string>("ALL_FLAGGED");

  const queueItems = apps.flatMap((app) =>
    app.allFindings
      .filter((f) => !f.dismissed)
      .map((finding) => ({
        app,
        finding,
      }))
  );

  const filteredItems = queueItems.filter(({ finding }) => {
    if (filterType === "ALL_FLAGGED") return true;
    if (filterType === "TIER_1") return finding.severity === "TIER_1_CRITICAL" || finding.severity === "CRITICAL";
    if (filterType === "TIER_2") return finding.severity === "TIER_2_HIGH" || finding.severity === "HIGH";
    if (filterType === "TIER_3") return finding.severity === "TIER_3_MEDIUM" || finding.severity === "MEDIUM";
    if (filterType === "TIER_4") return finding.severity === "TIER_4_COSMETIC" || finding.severity === "LOW";
    if (filterType === "MISSING_DOC") return finding.ruleId === "RULE_REQ_DOC_MISSING";
    if (filterType === "DATE_ISSUE")
      return (
        finding.ruleId === "RULE_EXPIRED_CERTIFICATE" ||
        finding.ruleId === "RULE_INVALID_DATE_ORDER"
      );
    if (filterType === "NAME_MISMATCH")
      return finding.ruleId === "RULE_INSTITUTION_NAME_MISMATCH";
    if (filterType === "VERIFICATION_REQ")
      return finding.ruleId === "RULE_VERIFICATION_REQUIRED";
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Priority Review Queue
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Active non-compliance flags and required statutory verifications.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-xs rounded-md border border-input bg-card py-1.5 px-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono font-medium"
          >
            <option value="ALL_FLAGGED">All Active Flags ({queueItems.length})</option>
            <option value="TIER_1">Tier 1 · Critical Risk (Identity & Dates)</option>
            <option value="TIER_2">Tier 2 · High Risk (Missing Statutory / Expired)</option>
            <option value="TIER_3">Tier 3 · Medium Risk (Verification Queries)</option>
            <option value="TIER_4">Tier 4 · Cosmetic & Benign Notes</option>
            <option value="NAME_MISMATCH">Entity / Signatory Conflicts</option>
            <option value="DATE_ISSUE">Expired or Inverted Dates</option>
          </select>
        </div>
      </div>

      <div className="space-y-2.5">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground text-xs bg-card rounded-lg border border-border">
            <div className="flex flex-col items-center justify-center space-y-2">
              <span className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin inline-block"></span>
              <span>Loading review queue...</span>
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center bg-card rounded-lg border border-border">
            <p className="font-semibold text-xs text-foreground">No active discrepancies in this view</p>
            <p className="text-[11px] text-muted-foreground mt-1 prose-readable mx-auto">
              All statutory credentials matching this severity level have been verified or resolved.
            </p>
          </div>
        ) : (
          filteredItems.map(({ app, finding }) => (
            <Card
              key={`${app.id}-${finding.id}`}
              className="p-4 shadow-xs hover:border-primary/50 transition flex flex-col md:flex-row md:items-center justify-between gap-4 border-border"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityBadge severity={finding.severity} />
                  <span className="font-bold text-xs text-foreground">
                    {finding.title}
                  </span>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted/80 text-muted-foreground border border-border">
                    {finding.ruleId}
                  </span>
                </div>

                <div className="text-xs text-muted-foreground">
                  Institution:{" "}
                  <span className="font-semibold text-foreground">
                    {app.institutionName}
                  </span>{" "}
                  <span className="font-mono text-[11px]">({app.referenceId})</span> • {app.state}
                </div>

                <p className="text-xs text-muted-foreground prose-readable leading-relaxed">
                  {finding.explanation}
                </p>

                {finding.evidenceSnippet && (
                  <div className="text-[11px] font-mono text-muted-foreground bg-muted/40 p-2 rounded border border-border">
                    <span className="font-bold text-foreground">Extracted Text: </span>
                    {finding.evidenceSnippet}
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-3 shrink-0 self-start md:self-auto">
                <StatusBadge status={app.status} size="sm" />
                <Link
                  href={`/applications/${app.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold rounded-md shadow-2xs transition"
                >
                  <span>Review & Adjudicate</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
