import React from "react";
import { DecisionStatus } from "@/types";

interface StatusBadgeProps {
  status: DecisionStatus;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const sizeClasses =
    size === "sm"
      ? "px-1.5 py-0.5 text-[11px] font-medium"
      : "px-2 py-0.5 text-xs font-semibold";

  switch (status) {
    case "PASSED_INITIAL_CHECKS":
    case "APPROVED_BY_REVIEWER":
      return (
        <span
          className={`inline-flex items-center rounded border border-emerald-300 bg-emerald-50 text-emerald-800 ${sizeClasses}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1.5"></span>
          {status === "PASSED_INITIAL_CHECKS" ? "Passed Checks" : "Approved"}
        </span>
      );
    case "INCOMPLETE":
      return (
        <span
          className={`inline-flex items-center rounded border border-amber-300 bg-amber-50 text-amber-900 ${sizeClasses}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-600 mr-1.5"></span>
          Incomplete
        </span>
      );
    case "NEEDS_REVIEW":
    case "AWAITING_HUMAN_REVIEW":
      return (
        <span
          className={`inline-flex items-center rounded border border-rose-300 bg-rose-50 text-rose-800 ${sizeClasses}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 mr-1.5"></span>
          Needs Review
        </span>
      );
    case "VERIFICATION_REQUIRED":
      return (
        <span
          className={`inline-flex items-center rounded border border-blue-300 bg-blue-50 text-blue-900 ${sizeClasses}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mr-1.5"></span>
          Verification Required
        </span>
      );
    case "VERIFICATION_FAILED":
    case "REJECTED_BY_REVIEWER":
      return (
        <span
          className={`inline-flex items-center rounded border border-red-400 bg-red-100 text-red-900 ${sizeClasses}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-red-700 mr-1.5"></span>
          {status === "REJECTED_BY_REVIEWER" ? "Rejected" : "Verification Failed"}
        </span>
      );
    case "UNABLE_TO_PROCESS":
      return (
        <span
          className={`inline-flex items-center rounded border border-slate-300 bg-slate-100 text-slate-800 ${sizeClasses}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-slate-600 mr-1.5"></span>
          Unable to Process
        </span>
      );
    case "RETURNED_FOR_CLARIFICATION":
      return (
        <span
          className={`inline-flex items-center rounded border border-orange-300 bg-orange-50 text-orange-900 ${sizeClasses}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-orange-600 mr-1.5"></span>
          Clarification Requested
        </span>
      );
    default:
      return (
        <span
          className={`inline-flex items-center rounded border border-slate-300 bg-slate-50 text-slate-800 ${sizeClasses}`}
        >
          {status}
        </span>
      );
  }
}
