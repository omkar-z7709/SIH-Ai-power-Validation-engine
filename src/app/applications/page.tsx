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
import { useApplications, useCurrentUser } from "@/lib/hooks/use-applications";

export default function ApplicationsPage() {
  const { data: user } = useCurrentUser();
  const { data: apps = [], isLoading: loading } = useApplications();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const userRegion = user?.assignedJurisdiction?.region;

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
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Applications Directory
            </h1>
            {userRegion && userRegion !== "ALL" && (
              <Badge variant="outline" className="font-mono text-[10px] text-primary border-primary/30 bg-primary/5">
                RO - {userRegion} Jurisdiction
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {userRegion && userRegion !== "ALL"
              ? `Regional institutional submissions and verified credentials under ${userRegion} scrutiny jurisdiction.`
              : "Search, filter, and inspect institutional submissions and attached credentials."}
          </p>
        </div>
        <Link
          href="/applications/new"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs transition"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Submission</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <Card className="shadow-xs border-border">
        <CardContent className="p-3.5 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            <Input
              id="applications-search-input"
              aria-label="Search applications by institution name, reference ID, or state"
              placeholder="Search by institution name, ref ID, or state..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 text-xs h-9"
            />
          </div>

          <div className="flex items-center space-x-2 w-full md:w-auto">
            <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
            <label htmlFor="applications-status-filter" className="text-xs font-semibold text-muted-foreground shrink-0">
              Filter by Status:
            </label>
            <select
              id="applications-status-filter"
              aria-label="Filter applications by review status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs rounded-md border border-input bg-card py-1.5 px-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono h-9"
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
      <Card className="shadow-xs overflow-hidden border-border">
        <Table>
          <TableHeader className="bg-muted/40 border-b border-border">
            <TableRow>
              <TableHead className="text-xs font-semibold py-3 pl-4">Reference ID</TableHead>
              <TableHead className="text-xs font-semibold py-3">Institution Name</TableHead>
              <TableHead className="text-xs font-semibold py-3">Type & State</TableHead>
              <TableHead className="text-xs font-semibold py-3">Documents</TableHead>
              <TableHead className="text-xs font-semibold py-3">Findings</TableHead>
              <TableHead className="text-xs font-semibold py-3">Status</TableHead>
              <TableHead className="text-xs font-semibold py-3 text-right pr-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-xs">
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground text-xs">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <span className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin inline-block"></span>
                    <span>Loading institutional submissions...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredApps.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground text-xs">
                  <p className="font-semibold text-foreground">No matching applications found</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Try adjusting your search terms or clearing the status filter.
                  </p>
                  {(search || statusFilter !== "ALL") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearch("");
                        setStatusFilter("ALL");
                      }}
                      className="mt-3 text-xs h-7"
                    >
                      Reset Filters
                    </Button>
                  )}
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
