"use client";

import Link from "next/link";
import { X, AlertTriangle, Building2, MapPin, Layers, ArrowRight, ShieldCheck, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { SeverityBadge } from "@/components/SeverityBadge";
import type { EnrichedGeoApplication, LandCollisionAnomaly } from "@/lib/geo/institution-coordinates";

interface DossierSlideOverProps {
  node: EnrichedGeoApplication | null;
  anomalies: LandCollisionAnomaly[];
  onClose: () => void;
}

export function DossierSlideOver({ node, anomalies, onClose }: DossierSlideOverProps) {
  if (!node) return null;

  const app = node.application;
  const collision = anomalies.find((a) =>
    a.involvedApplications.some((inv) => inv.application.referenceId === app.referenceId)
  );

  const counterpart = collision?.involvedApplications.find(
    (inv) => inv.application.referenceId !== app.referenceId
  );

  const activeFindings = (app.allFindings || []).filter((f) => !f.dismissed);

  return (
    <div className="absolute top-0 right-0 h-full w-full sm:w-[440px] bg-card/95 backdrop-blur-md border-l border-border shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-250">
      {/* Header */}
      <div className="p-5 pb-4 border-b border-border flex items-start justify-between gap-3 bg-muted/20">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="font-mono text-[10px]">
              {app.referenceId}
            </Badge>
            {node.isNewInstitute ? (
              <Badge className="bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-400/30 text-[10px]">
                New Establishment
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px]">
                Extension of Approval
              </Badge>
            )}
            <StatusBadge status={app.status} size="sm" />
          </div>
          <h2 className="text-base font-bold text-foreground leading-snug pt-1">
            {app.institutionName}
          </h2>
          <div className="flex items-center text-xs text-muted-foreground gap-1.5 font-medium">
            <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
            <span>
              {node.district}, {node.state} (PIN {node.pinCode})
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition"
          aria-label="Close dossier"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs scrollbar-fancy">
        {/* Collision Warning Banner if implicated */}
        {collision && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-800 dark:text-rose-300 space-y-1.5 shadow-2xs">
            <div className="flex items-center gap-1.5 font-bold text-xs text-rose-700 dark:text-rose-400">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>Cross-Campus Land Parcel Collision Alert</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              This institution's claimed parcel (<span className="font-mono font-bold">{collision.surveyNumberLabel}</span>) is simultaneously claimed by{" "}
              <span className="font-semibold underline">
                {counterpart?.application.institutionName || "Sister Institution"}
              </span>{" "}
              located {collision.distanceMeters} meters away.
            </p>
            <div className="text-[10px] font-mono text-muted-foreground pt-1 border-t border-rose-500/20">
              Violation Code: APH-2026-SEC-4.2 (Contiguous Non-Overlapping Land)
            </div>
          </div>
        )}

        {/* Land & Infrastructure Card */}
        <div className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-foreground uppercase tracking-wide">
            <span className="flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-primary" />
              Physical Infrastructure & Land Metrics
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
            <div className="p-2 rounded bg-card border border-border/60">
              <span className="text-[10px] text-muted-foreground block font-sans">Claimed Land</span>
              <span className="font-bold text-foreground text-sm">{node.claimedAcres} Acres</span>
              <span className="text-[9px] text-emerald-600 block font-sans">Norm: ≥ 5.0 Ac (Rural)</span>
            </div>
            <div className="p-2 rounded bg-card border border-border/60">
              <span className="text-[10px] text-muted-foreground block font-sans">Survey / Khasra #</span>
              <span className="font-bold text-foreground truncate block">{node.rawSurveyNumber}</span>
              <span className="text-[9px] text-muted-foreground block font-sans">Zone: {node.district}</span>
            </div>
          </div>
        </div>

        {/* Extraction Provenance */}
        <div className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-2">
          <span className="text-[11px] font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-primary" />
            Submitted Credentials ({app.documents?.length || 0})
          </span>
          <div className="space-y-1.5">
            {(app.documents || []).map((doc, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded bg-card border border-border/60">
                <span className="font-medium truncate max-w-[200px]">{doc.originalFilename}</span>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  {doc.provenance?.provider || "NativePdfParser"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Active Findings */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-foreground uppercase tracking-wide">
            <span>Regulatory Discrepancy Findings ({activeFindings.length})</span>
          </div>

          {activeFindings.length === 0 ? (
            <div className="p-4 text-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 space-y-1">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 mx-auto" />
              <p className="font-bold text-xs">Zero Discrepancies</p>
              <p className="text-[11px] text-muted-foreground">All statutory credentials verified clean.</p>
            </div>
          ) : (
            activeFindings.map((finding) => (
              <div key={finding.id} className="p-3 rounded-lg border border-border bg-card shadow-2xs space-y-1.5">
                <div className="flex items-center gap-2">
                  <SeverityBadge severity={finding.severity} />
                  <span className="font-bold text-foreground leading-tight">{finding.title}</span>
                </div>
                <p className="text-muted-foreground text-[11px] leading-relaxed">{finding.explanation}</p>
                <div className="text-[10px] pt-1 text-primary font-medium">
                  Action: {finding.suggestedAction}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer CTA */}
      <div className="p-4 border-t border-border bg-card">
        {node.isVirtualCollisionCounterpart ? (
          <Link
            href="/applications"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs transition"
          >
            <span>Inspect in Applications Directory</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <Link
            href={`/applications/${app.id}`}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs transition"
          >
            <span>Open Complete Scrutiny Dossier</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
}
