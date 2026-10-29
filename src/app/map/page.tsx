"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Compass,
  AlertTriangle,
  Building2,
  Layers,
  MapPin,
  Sparkles,
  ShieldAlert,
  Flame,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { useApplications, useCurrentUser } from "@/lib/hooks/use-applications";
import {
  enrichApplicationsForGeo,
  type EnrichedGeoApplication,
  type LandCollisionAnomaly,
} from "@/lib/geo/institution-coordinates";
import { DossierSlideOver } from "@/components/map/DossierSlideOver";
import { Button } from "@/components/ui/button";

// Dynamic import with ssr: false to prevent Next.js 16 SSR window/document initialization error
const RadarMapCanvas = dynamic(
  () => import("@/components/map/RadarMapCanvas"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-muted/20 text-muted-foreground text-xs space-y-2">
        <span className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin inline-block"></span>
        <span className="font-mono">Initializing Geospatial Scrutiny Engine...</span>
      </div>
    ),
  }
);

interface RegionPreset {
  label: string;
  center: [number, number];
  zoom: number;
}

const REGION_PRESETS: RegionPreset[] = [
  { label: "All India", center: [21.84, 82.79], zoom: 4.5 },
  { label: "Pune (Western Hub)", center: [18.5913, 73.7389], zoom: 15 },
  { label: "Delhi NCR", center: [28.6139, 77.209], zoom: 11 },
  { label: "Bangalore / Karnataka", center: [12.8698, 75.8], zoom: 7 },
  { label: "Chennai", center: [13.0827, 80.2707], zoom: 11 },
  { label: "Ahmedabad", center: [23.0225, 72.5714], zoom: 11 },
];

export default function GeospatialRadarPage() {
  const { data: user } = useCurrentUser();
  const { data: applications = [], isLoading, refetch } = useApplications();

  const isPuneOfficer = user?.assignedJurisdiction?.region === "PUNE";
  const userRegion = user?.assignedJurisdiction?.region;

  const [activeViewport, setActiveViewport] = useState<{
    center: [number, number];
    zoom: number;
  }>({
    center: [18.5913, 73.7389],
    zoom: 13,
  });

  const availablePresets = useMemo(() => {
    if (isPuneOfficer) {
      return [{ label: "Pune Jurisdiction", center: [18.5913, 73.7389] as [number, number], zoom: 13 }];
    }
    if (userRegion && userRegion !== "ALL") {
      return REGION_PRESETS.filter(p => p.label.toUpperCase().includes(userRegion));
    }
    return REGION_PRESETS;
  }, [isPuneOfficer, userRegion]);

  const [selectedNode, setSelectedNode] = useState<EnrichedGeoApplication | null>(null);
  const [riskFilter, setRiskFilter] = useState<"ALL" | "CRITICAL" | "NEW">("ALL");
  const [collisionMode, setCollisionMode] = useState<boolean>(true);

  // Compute enriched nodes and land collision anomalies
  const { nodes, anomalies } = useMemo(() => {
    return enrichApplicationsForGeo(applications);
  }, [applications]);

  const filteredNodes = useMemo(() => {
    return nodes.filter((n) => {
      if (riskFilter === "CRITICAL") return n.riskCategory === "CRITICAL";
      if (riskFilter === "NEW") return n.isNewInstitute;
      return true;
    });
  }, [nodes, riskFilter]);

  const criticalCount = nodes.filter((n) => n.riskCategory === "CRITICAL").length;
  const newInstituteCount = nodes.filter((n) => n.isNewInstitute).length;
  const totalCollisions = anomalies.length;

  const handleFocusCollision = (anomaly: LandCollisionAnomaly) => {
    setActiveViewport({
      center: anomaly.midpoint,
      zoom: 16,
    });
    const involved = anomaly.involvedApplications[0];
    if (involved) setSelectedNode(involved);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] w-full overflow-hidden bg-background">
      {/* Top Scrutiny Command Strip */}
      <div className="border-b border-border bg-card/90 backdrop-blur px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0 z-20">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
            <Compass className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-foreground">
                Regional Scrutiny Radar
              </h1>
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                {isPuneOfficer ? "RO - Pune Jurisdiction" : userRegion ? `RO - ${userRegion}` : "Official Radar"}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Geospatial land collision detection and regional institutional risk clusters.
            </p>
          </div>
        </div>

        {/* 5 Key Metric Cards */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="px-2.5 py-1 rounded bg-muted/60 border border-border flex items-center gap-1.5">
            <Building2 className="h-3 w-3 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">Mapped:</span>
            <span className="font-bold text-foreground">{nodes.length}</span>
          </div>

          <div className="px-2.5 py-1 rounded bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
            <Flame className="h-3 w-3 text-rose-600" />
            <span className="text-[11px]">Hotspots:</span>
            <span className="font-bold">{criticalCount}</span>
          </div>

          <div className="px-2.5 py-1 rounded bg-sky-500/10 border border-sky-500/20 text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-sky-500" />
            <span className="text-[11px]">New Institutes:</span>
            <span className="font-bold">{newInstituteCount}</span>
          </div>

          <div
            className={`px-2.5 py-1 rounded border flex items-center gap-1.5 transition ${
              totalCollisions > 0
                ? "bg-rose-600 text-white border-rose-700 shadow-sm animate-pulse"
                : "bg-muted/60 border-border text-muted-foreground"
            }`}
          >
            <AlertTriangle className="h-3 w-3" />
            <span className="text-[11px]">Land Collisions:</span>
            <span className="font-bold">{totalCollisions}</span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            title="Refresh geospatial registry"
            aria-label="Refresh geospatial registry"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Control & Region Pills Bar */}
      <div className="px-4 py-2 border-b border-border bg-muted/30 flex flex-wrap items-center justify-between gap-2 shrink-0 z-10 text-xs">
        {/* City Presets */}
        <div className="flex items-center space-x-1 overflow-x-auto py-0.5 scrollbar-none">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mr-1.5 shrink-0">
            Hotspots:
          </span>
          {availablePresets.map((preset) => (
            <button
              key={preset.label}
              onClick={() =>
                setActiveViewport({
                  center: preset.center,
                  zoom: preset.zoom,
                })
              }
              className="px-2.5 py-1 text-[11px] font-medium rounded-md border border-input bg-card hover:bg-muted text-foreground transition whitespace-nowrap shadow-2xs"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Filter & Unfair Advantage Collision Switch */}
        <div className="flex items-center space-x-3 shrink-0">
          <div className="flex items-center bg-card rounded-md border border-input p-0.5 text-[11px]">
            <button
              onClick={() => setRiskFilter("ALL")}
              className={`px-2 py-0.5 rounded font-medium transition ${
                riskFilter === "ALL"
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Pins
            </button>
            <button
              onClick={() => setRiskFilter("CRITICAL")}
              className={`px-2 py-0.5 rounded font-medium transition ${
                riskFilter === "CRITICAL"
                  ? "bg-rose-600 text-white font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Critical
            </button>
            <button
              onClick={() => setRiskFilter("NEW")}
              className={`px-2 py-0.5 rounded font-medium transition ${
                riskFilter === "NEW"
                  ? "bg-sky-600 text-white font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              New Institutes
            </button>
          </div>

          <label className="flex items-center space-x-2 cursor-pointer bg-card px-2.5 py-1 rounded-md border border-input shadow-2xs">
            <input
              type="checkbox"
              checked={collisionMode}
              onChange={(e) => setCollisionMode(e.target.checked)}
              className="h-3.5 w-3.5 rounded text-rose-600 accent-rose-600 cursor-pointer"
            />
            <span className="text-[11px] font-semibold text-foreground flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping inline-block"></span>
              Detect Land Parcel Collisions
            </span>
          </label>
        </div>
      </div>

      {/* Collision Alert Banner */}
      {collisionMode && anomalies.length > 0 && (
        <div className="bg-rose-600 text-white px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2 shrink-0 z-10 shadow-md">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-white" />
            <span className="font-semibold">
              Cross-Campus Fraud Anomaly Detected:
            </span>
            <span className="text-rose-100">
              Land {anomalies[0].surveyNumberLabel} ({anomalies[0].district}) claimed concurrently by 2 separate applicant institutes ({anomalies[0].involvedApplications.map((a) => a.application.referenceId).join(" & ")}).
            </span>
          </div>

          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleFocusCollision(anomalies[0])}
            className="h-6 text-[11px] px-2.5 font-bold text-rose-800 bg-white hover:bg-rose-50 shadow-sm"
          >
            Focus Collision Vector
          </Button>
        </div>
      )}

      {/* Interactive Map Canvas Container */}
      <div className="relative flex-1 w-full h-full">
        <RadarMapCanvas
          nodes={filteredNodes}
          anomalies={anomalies}
          activeViewport={activeViewport}
          collisionMode={collisionMode}
          selectedNodeId={selectedNode?.id || null}
          onSelectNode={(node) => setSelectedNode(node)}
        />

        {/* Slide-over Inspection Drawer */}
        <DossierSlideOver
          node={selectedNode}
          anomalies={anomalies}
          onClose={() => setSelectedNode(null)}
        />
      </div>
    </div>
  );
}
