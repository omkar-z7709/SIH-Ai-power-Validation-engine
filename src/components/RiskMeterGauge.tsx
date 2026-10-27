"use client";

import React from "react";
import { ShieldAlert, ShieldCheck, AlertTriangle, ArrowRight, Gauge } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RiskAssessment } from "@/lib/rules/risk-scoring";

export function RiskMeterGauge({ assessment }: { assessment: RiskAssessment }) {
  const { riskScore, riskTier, regulatoryRoute, routeLabel, recommendedAction, factors } =
    assessment;

  const scorePercent = Math.min(100, Math.max(0, Math.round(riskScore * 100)));

  const getTierStyling = () => {
    switch (riskTier) {
      case "HIGH_RISK":
        return {
          barColor: "bg-red-500",
          textColor: "text-red-600 dark:text-red-400",
          bgColor: "bg-red-500/10 border-red-500/30",
          badgeColor: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
          icon: <ShieldAlert className="h-4 w-4 text-red-500" />,
        };
      case "MEDIUM_RISK":
        return {
          barColor: "bg-amber-500",
          textColor: "text-amber-600 dark:text-amber-400",
          bgColor: "bg-amber-500/10 border-amber-500/30",
          badgeColor: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
          icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
        };
      case "LOW_RISK":
      default:
        return {
          barColor: "bg-emerald-500",
          textColor: "text-emerald-600 dark:text-emerald-400",
          bgColor: "bg-emerald-500/10 border-emerald-500/30",
          badgeColor: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
          icon: <ShieldCheck className="h-4 w-4 text-emerald-500" />,
        };
    }
  };

  const style = getTierStyling();
  const violatedFactors = factors.filter((f) => f.violated);

  return (
    <div className={`p-4 rounded-xl border ${style.bgColor} transition-all space-y-3`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center space-x-2">
          {style.icon}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-tight text-foreground uppercase">
                Regulatory Risk Index (S_risk)
              </span>
              <Badge variant="outline" className={`text-[10px] font-mono px-2 py-0 ${style.badgeColor}`}>
                {scorePercent}% Risk ({riskScore.toFixed(2)} / 1.00)
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Weighted statutory penalty: S_risk = Σ (w_i · c_i) per AICTE APH Chapter 1
            </p>
          </div>
        </div>

        {/* Recommended Route Badge */}
        <div className="flex items-center space-x-1.5 self-start sm:self-auto bg-card/80 px-2.5 py-1 rounded-lg border border-border text-xs">
          <span className="text-[10px] text-muted-foreground font-medium">Route:</span>
          <span className={`font-semibold ${style.textColor}`}>{routeLabel}</span>
        </div>
      </div>

      {/* 3-Tier Multi-Segment Meter Bar */}
      <div className="space-y-1">
        <div className="relative h-2.5 w-full bg-muted rounded-full overflow-hidden flex">
          <div className="h-full w-[30%] bg-emerald-500/25 border-r border-background" title="Low Risk Zone (0.0 - 0.30)" />
          <div className="h-full w-[40%] bg-amber-500/25 border-r border-background" title="Medium Risk Zone (0.30 - 0.70)" />
          <div className="h-full w-[30%] bg-red-500/25" title="High Risk Zone (0.70 - 1.00)" />

          {/* Active Score Fill Indicator */}
          <div
            className={`absolute top-0 left-0 h-full ${style.barColor} transition-all duration-700 ease-out shadow-xs`}
            style={{ width: `${scorePercent}%` }}
          />
        </div>

        <div className="flex justify-between text-[9px] font-mono text-muted-foreground px-0.5">
          <span>0.0 (Fast-Track)</span>
          <span className="text-amber-500 font-semibold">0.30 (15-Day Notice)</span>
          <span className="text-red-500 font-semibold">0.70 (EVC Site Visit)</span>
          <span>1.00</span>
        </div>
      </div>

      {/* Recommended Action & Penalty Breakdown */}
      <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-start gap-1.5 text-muted-foreground">
          <ArrowRight className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
          <span>
            <strong className="text-foreground">Next Action:</strong> {recommendedAction}
          </span>
        </div>

        {violatedFactors.length > 0 && (
          <div className="text-[10px] font-mono text-muted-foreground shrink-0">
            Penalties Active: <span className="font-semibold text-foreground">{violatedFactors.length}</span> factor{violatedFactors.length > 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
}
