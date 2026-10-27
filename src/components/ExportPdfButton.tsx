"use client";

import React, { useState, useRef, useEffect } from "react";
import { FileText, Loader2, CheckCircle2, AlertTriangle, Sparkles } from "lucide-react";

export type ExportStage = "IDLE" | "SYNTHESIZING" | "RENDERING" | "DOWNLOADING" | "DONE" | "ERROR";

const STAGE_CONFIG: Record<
  ExportStage,
  { label: string; subtext?: string; progress: number }
> = {
  IDLE: { label: "Export Statutory PDF", progress: 0 },
  SYNTHESIZING: {
    label: "1/3 Synthesizing Gemini Assessment...",
    subtext: "Running gemini-3.5-flash-lite regulatory summary",
    progress: 35,
  },
  RENDERING: {
    label: "2/3 Building Color-Coded Dossier...",
    subtext: "Rendering vector severity cards & credential audit table",
    progress: 75,
  },
  DOWNLOADING: {
    label: "3/3 Finalizing Statutory Seal...",
    subtext: "Stamping cryptographic seal & packaging PDF stream",
    progress: 92,
  },
  DONE: { label: "Dossier Exported!", progress: 100 },
  ERROR: { label: "Export Failed — Retry", progress: 0 },
};

export function ExportPdfButton({
  applicationId,
  referenceId,
  className = "",
}: {
  applicationId: string;
  referenceId: string;
  className?: string;
}) {
  const [stage, setStage] = useState<ExportStage>("IDLE");
  const isBusy =
    stage === "SYNTHESIZING" || stage === "RENDERING" || stage === "DOWNLOADING";

  const renderTimerRef = useRef<NodeJS.Timeout | null>(null);
  const downloadTimerRef = useRef<NodeJS.Timeout | null>(null);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearAllTimers = () => {
    if (renderTimerRef.current) clearTimeout(renderTimerRef.current);
    if (downloadTimerRef.current) clearTimeout(downloadTimerRef.current);
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    renderTimerRef.current = null;
    downloadTimerRef.current = null;
    resetTimerRef.current = null;
  };

  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, []);

  async function handleExportClick() {
    if (isBusy) return;

    clearAllTimers();

    try {
      // 1. Immediate Visual Transition (< 16ms): paint active spinner immediately
      setStage("SYNTHESIZING");
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve))
      );

      // Transition to rendering stage feedback while network request processes
      renderTimerRef.current = setTimeout(() => {
        setStage("RENDERING");
      }, 700);

      downloadTimerRef.current = setTimeout(() => {
        setStage("DOWNLOADING");
      }, 1900);

      // 2. Fetch the generated PDF stream from the API
      const res = await fetch(`/api/applications/${applicationId}/report?format=pdf`);

      if (renderTimerRef.current) clearTimeout(renderTimerRef.current);
      if (downloadTimerRef.current) clearTimeout(downloadTimerRef.current);

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      setStage("DOWNLOADING");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `aicte_report_${referenceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // 3. Success state
      setStage("DONE");
      resetTimerRef.current = setTimeout(() => {
        setStage("IDLE");
      }, 2500);
    } catch (err) {
      console.error("PDF Export error:", err);
      clearAllTimers();
      setStage("ERROR");
      resetTimerRef.current = setTimeout(() => {
        setStage("IDLE");
      }, 3500);
    }
  }

  const current = STAGE_CONFIG[stage];

  return (
    <div className={`relative inline-flex flex-col items-end gap-1 ${className}`}>
      <button
        type="button"
        onClick={handleExportClick}
        disabled={isBusy}
        className={`relative overflow-hidden inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition-all shadow-xs select-none ${
          stage === "DONE"
            ? "bg-emerald-600 text-white ring-2 ring-emerald-400/50"
            : stage === "ERROR"
            ? "bg-rose-600 text-white"
            : isBusy
            ? "bg-slate-800 text-white cursor-wait ring-1 ring-sky-500/50"
            : "border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary active:scale-[0.98]"
        }`}
      >
        {stage === "IDLE" && <FileText className="h-3.5 w-3.5" />}
        {stage === "SYNTHESIZING" && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />
        )}
        {stage === "RENDERING" && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-400" />
        )}
        {stage === "DOWNLOADING" && (
          <Sparkles className="h-3.5 w-3.5 animate-pulse text-emerald-400" />
        )}
        {stage === "DONE" && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
        {stage === "ERROR" && <AlertTriangle className="h-3.5 w-3.5 text-white" />}

        <span>{current.label}</span>

        {/* Live Bottom Progress Bar inside the button */}
        {isBusy && (
          <span
            className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-amber-400 via-sky-400 to-emerald-400 transition-all duration-500"
            style={{ width: `${current.progress}%` }}
          />
        )}
      </button>

      {/* Live Micro-Status Subtext */}
      {isBusy && current.subtext && (
        <span className="text-[10px] font-mono text-sky-600 dark:text-sky-400 animate-pulse">
          {current.subtext}
        </span>
      )}
    </div>
  );
}
