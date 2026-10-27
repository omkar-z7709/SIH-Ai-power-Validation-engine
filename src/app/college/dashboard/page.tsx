"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Building2, FileText, CheckCircle2, AlertCircle, Clock, Database } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function CollegeDashboard() {
  const [user, setUser] = useState<any>(null);
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [storageMode, setStorageMode] = useState<string>("mongodb");

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [meRes, appsRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/college/applications"),
        ]);
        const meData = await meRes.json();
        const appsData = await appsRes.json();
        if (isMounted) {
          if (meData.success) setUser(meData.data);
          if (appsData.success) setApps(appsData.data);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              College Portal
            </h1>
            <Badge variant="outline" className="text-[10px] uppercase font-mono">
              {user?.role || "COLLEGE_ADMIN"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Institutional document compliance, approval requests, and submission tracking.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px] font-mono gap-1">
            <Database className="h-3 w-3" />
            Storage: {storageMode}
          </Badge>
          <Link
            href="/applications/new"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs transition"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Submission</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">My Submissions</p>
              <h3 className="text-2xl font-bold mt-0.5">{apps.length}</h3>
            </div>
            <FileText className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card className="shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Passed Checks</p>
              <h3 className="text-2xl font-bold mt-0.5 text-emerald-600">
                {apps.filter((a) => a.status === "PASSED_INITIAL_CHECKS" || a.status === "APPROVED_BY_REVIEWER").length}
              </h3>
            </div>
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </CardContent>
        </Card>
        <Card className="shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Under Scrutiny</p>
              <h3 className="text-2xl font-bold mt-0.5 text-amber-600">
                {apps.filter((a) => a.status === "NEEDS_REVIEW" || a.status === "AWAITING_HUMAN_REVIEW").length}
              </h3>
            </div>
            <Clock className="h-5 w-5 text-amber-600" />
          </CardContent>
        </Card>
        <Card className="shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Action Required</p>
              <h3 className="text-2xl font-bold mt-0.5 text-rose-600">
                {apps.filter((a) => a.status === "INCOMPLETE" || a.status === "RETURNED_FOR_CLARIFICATION").length}
              </h3>
            </div>
            <AlertCircle className="h-5 w-5 text-rose-600" />
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-xs">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-semibold">Institutional Submissions</CardTitle>
          <CardDescription className="text-xs">
            Review live status and officer feedback for your uploaded document bundles
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="text-[11px] font-medium">
                <TableHead className="pl-4">Reference ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Academic Year</TableHead>
                <TableHead>Documents</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right pr-4">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-xs text-muted-foreground">
                    Loading institutional submissions...
                  </TableCell>
                </TableRow>
              ) : apps.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-xs text-muted-foreground">
                    No submissions found for your institution. Click "New Submission" to begin intake.
                  </TableCell>
                </TableRow>
              ) : (
                apps.map((app) => (
                  <TableRow key={app.id} className="text-xs">
                    <TableCell className="pl-4 font-mono font-semibold text-foreground">
                      {app.referenceId}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {app.applicationType.replace(/_/g, " ")}
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {app.academicYear}
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold">{app.documents?.length || 0}</span> attached
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={app.status} />
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <Link
                        href={`/applications/${app.id}`}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        View Scrutiny
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
