"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Plus, Filter, ArrowUpRight } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApplications } from "@/lib/hooks/use-applications";

export default function ApplicationsPage() {
  const { data: apps = [], isLoading: loading } = useApplications();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const filteredApps = apps.filter((app) => {
    const matchesSearch =
      app.institutionName.toLowerCase().includes(search.toLowerCase()) ||
      app.referenceId.toLowerCase().includes(search.toLowerCase()) ||
      app.state.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" || app.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Applications Directory
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Search, filter, and inspect institutional submissions and attached credentials.
          </p>
        </div>
        <Link
          href="/applications/new"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs transition"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Intake</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <Card className="shadow-xs">
        <CardContent className="p-3 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by institution, ID, or state..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 text-xs h-9"
            />
          </div>

          <div className="flex items-center space-x-2 w-full md:w-auto">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground">Filter:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs rounded-md border border-input bg-card py-1.5 px-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono"
            >
              <option value="ALL">All Submissions ({apps.length})</option>
              <option value="PASSED_INITIAL_CHECKS">Passed Checks</option>
              <option value="NEEDS_REVIEW">Needs Review</option>
              <option value="INCOMPLETE">Incomplete</option>
              <option value="VERIFICATION_REQUIRED">Verification Required</option>
              <option value="UNABLE_TO_PROCESS">Unable to Process</option>
              <option value="APPROVED_BY_REVIEWER">Approved by Reviewer</option>
              <option value="REJECTED_BY_REVIEWER">Rejected by Reviewer</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card className="shadow-xs overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="text-xs font-bold">Reference ID</TableHead>
              <TableHead className="text-xs font-bold">Institution Name</TableHead>
              <TableHead className="text-xs font-bold">Type & State</TableHead>
              <TableHead className="text-xs font-bold">Documents</TableHead>
              <TableHead className="text-xs font-bold">Findings</TableHead>
              <TableHead className="text-xs font-bold">Status</TableHead>
              <TableHead className="text-xs font-bold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-xs">
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground font-mono">
                  Loading records...
                </TableCell>
              </TableRow>
            ) : filteredApps.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground font-mono">
                  No matching applications found.
                </TableCell>
              </TableRow>
            ) : (
              filteredApps.map((app) => (
                <TableRow key={app.id} className="hover:bg-muted/20">
                  <TableCell className="font-mono font-semibold text-foreground">
                    {app.referenceId}
                  </TableCell>
                  <TableCell className="font-semibold text-foreground">
                    <Link
                      href={`/applications/${app.id}`}
                      className="hover:text-primary transition"
                    >
                      {app.institutionName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-[11px]">
                    <div>{app.applicationType.replace(/_/g, " ")}</div>
                    <div>{app.state} • {app.academicYear}</div>
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground">
                    {app.documents.length} files
                  </TableCell>
                  <TableCell>
                    {app.allFindings.length === 0 ? (
                      <span className="text-emerald-600 font-mono font-semibold">0</span>
                    ) : (
                      <Badge variant="destructive" className="font-mono text-[10px]">
                        {app.allFindings.length} flagged
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={app.status} size="sm" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/applications/${app.id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition"
                    >
                      <span>Inspect</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
