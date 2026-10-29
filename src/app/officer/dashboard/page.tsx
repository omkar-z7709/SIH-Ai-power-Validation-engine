"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldAlert, CheckCircle2, Clock, FileText, Database, ArrowUpRight } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function OfficerDashboard() {
  const [counts, setCounts] = useState<any>({
    total: 0,
    needsReview: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    storageMode: "mongodb",
  });
  const [apps, setApps] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [countsRes, appsRes, meRes] = await Promise.all([
          fetch("/api/dashboard/counts"),
          fetch("/api/applications"),
          fetch("/api/auth/me"),
        ]);
        const countsData = await countsRes.json();
        const appsData = await appsRes.json();
        const meData = await meRes.json();
        if (isMounted) {
          if (countsData.success) setCounts(countsData.data);
          if (appsData.success) setApps(appsData.data);
          if (meData.success) setCurrentUser(meData.user);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const officerRegion = currentUser?.assignedJurisdiction?.region || (currentUser?.role === "SENIOR_OFFICER" ? "ALL" : null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Officer Portal
            </h1>
            <Badge variant="outline" className="text-[10px] uppercase font-mono">
              {currentUser?.role || "REVIEW_OFFICER"}
            </Badge>
            {officerRegion && (
              <Badge variant="secondary" className="text-[10px] uppercase font-semibold bg-primary/10 text-primary border border-primary/20">
                {officerRegion === "ALL" ? "Central HQ (All Regions)" : `Regional Office: ${officerRegion}`}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {officerRegion === "ALL" 
              ? "All-India statutory queue oversight, appellate escalations, and apex approval decisions." 
              : `Jurisdiction: ${officerRegion} regional scrutiny queue, document verification, and discrepancy adjudication.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px] font-mono gap-1">
            <Database className="h-3 w-3" />
            Storage: {counts.storageMode || "mongodb"}
          </Badge>
          <Link
            href="/queue"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs transition"
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Open Review Queue</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Total In Queue</p>
              <h3 className="text-2xl font-bold mt-0.5">{counts.total}</h3>
            </div>
            <FileText className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card className="shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Needs Review</p>
              <h3 className="text-2xl font-bold mt-0.5 text-amber-600">{counts.needsReview}</h3>
            </div>
            <Clock className="h-5 w-5 text-amber-600" />
          </CardContent>
        </Card>
        <Card className="shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Adjudicated Approved</p>
              <h3 className="text-2xl font-bold mt-0.5 text-emerald-600">{counts.approved}</h3>
            </div>
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </CardContent>
        </Card>
        <Card className="shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Adjudicated Rejected</p>
              <h3 className="text-2xl font-bold mt-0.5 text-rose-600">{counts.rejected}</h3>
            </div>
            <ShieldAlert className="h-5 w-5 text-rose-600" />
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-xs">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-semibold">Priority Scrutiny Directory</CardTitle>
          <CardDescription className="text-xs">
            Submissions ordered by statutory urgency and decision status
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="text-[11px] font-medium">
                <TableHead className="pl-4">Reference ID</TableHead>
                <TableHead>Institution</TableHead>
                <TableHead>State / Region</TableHead>
                <TableHead>Findings</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right pr-4">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-xs text-muted-foreground">
                    Loading queue items...
                  </TableCell>
                </TableRow>
              ) : apps.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-xs text-muted-foreground">
                    No applications currently under scrutiny.
                  </TableCell>
                </TableRow>
              ) : (
                apps.map((app) => (
                  <TableRow key={app.id} className="text-xs">
                    <TableCell className="pl-4 font-mono font-semibold text-foreground">
                      {app.referenceId}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {app.institutionName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {app.state}
                      {app.region && (
                        <span className="ml-1.5 inline-block text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-muted">
                          {app.region}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {app.allFindings?.length > 0 ? (
                        <span className="text-rose-600 font-semibold">
                          {app.allFindings.filter((f: any) => !f.dismissed).length} active flags
                        </span>
                      ) : (
                        <span className="text-emerald-600">0 flags</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={app.status} />
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <Link
                        href={`/applications/${app.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        Inspect & Adjudicate
                        <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
