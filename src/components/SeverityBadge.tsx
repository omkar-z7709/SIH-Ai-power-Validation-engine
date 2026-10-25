import React from "react";
import { FindingSeverity } from "@/types";

interface SeverityBadgeProps {
  severity: FindingSeverity;
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  switch (severity) {
    case "TIER_1_CRITICAL":
    case "CRITICAL":
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-destructive/15 text-destructive border border-destructive/30 font-mono tracking-tight">
          TIER 1 · CRITICAL
        </span>
      );
    case "TIER_2_HIGH":
    case "HIGH":
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 font-mono tracking-tight">
          TIER 2 · HIGH
        </span>
      );
    case "TIER_3_MEDIUM":
    case "MEDIUM":
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30 font-mono tracking-tight">
          TIER 3 · MEDIUM
        </span>
      );
    case "TIER_4_COSMETIC":
    case "LOW":
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border font-mono tracking-tight">
          TIER 4 · COSMETIC
        </span>
      );
    case "INFO":
    default:
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border font-mono tracking-tight">
          TIER 4 · BENIGN
        </span>
      );
  }
}
