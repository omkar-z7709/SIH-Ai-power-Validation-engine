"use client";

import React from "react";
import {
  Building2,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Ruler,
  Layers,
  FlaskConical,
  Compass,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  SpatialBreakdown,
  evaluateSpatialCompliance,
} from "@/lib/rules/spatial-rules";

export function SpatialComplianceCard({
  spatialData,
}: {
  spatialData?: SpatialBreakdown;
}) {
  // Fallback defaults if spatial breakdown wasn't explicitly populated
  const defaultData: SpatialBreakdown = {
    instructionalAreaSqM: 3200,
    administrativeAreaSqM: 800,
    amenitiesAreaSqM: 600,
    circulationAreaSqM: 750,
    minimumRequiredTBUASqM: 5200,
    locationClassification: "URBAN_RURAL",
    alliedLaboratories: [
      { branch: "Computer Science & IT", totalLabAreaSqM: 800, sharedLabAreaSqM: 200 },
      { branch: "Electronics & Communication", totalLabAreaSqM: 600, sharedLabAreaSqM: 150 },
    ],
    landParcels: [
      {
        id: "plot_1",
        surveyNumber: "101/A",
        areaAcres: 2.8,
        isMainPlot: true,
        purpose: "CORE_ACADEMIC",
        coordinates: { latitude: 28.6139, longitude: 77.209 },
      },
    ],
  };

  const data = spatialData || defaultData;
  const result = evaluateSpatialCompliance(data);

  return (
    <div className="space-y-4">
      {/* Top Equation Ribbon */}
      <div className="p-3.5 rounded-lg border border-border bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div>
          <span className="font-semibold text-foreground flex items-center gap-1.5">
            <Ruler className="h-4 w-4 text-primary" />
            AICTE Built-Up Area Statutory Formula:
          </span>
          <p className="font-mono text-muted-foreground mt-0.5">
            TBUA = (INA + ADA + AMA) + ACA = ({data.instructionalAreaSqM} + {data.administrativeAreaSqM} +{" "}
            {data.amenitiesAreaSqM}) + {data.circulationAreaSqM} ={" "}
            <span className="font-bold text-foreground">{result.totalBuiltUpAreaSqM} sq.m</span>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {result.isTBUACompliant ? (
            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              TBUA Compliant
            </Badge>
          ) : (
            <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 text-xs">
              <AlertCircle className="h-3.5 w-3.5 mr-1" />
              TBUA Deficit ({result.tbuaDeficitPercent.toFixed(1)}%)
            </Badge>
          )}
        </div>
      </div>

      {/* 4 Spatial Metric Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg border border-border bg-card">
          <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
            <Layers className="h-3 w-3 text-primary" />
            Instructional (INA)
          </p>
          <p className="text-lg font-bold text-foreground mt-1">
            {data.instructionalAreaSqM.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">sq.m</span>
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Classrooms & Core Labs</p>
        </div>

        <div className="p-3 rounded-lg border border-border bg-card">
          <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
            <Building2 className="h-3 w-3 text-sky-500" />
            Administrative (ADA)
          </p>
          <p className="text-lg font-bold text-foreground mt-1">
            {data.administrativeAreaSqM.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">sq.m</span>
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Offices & Faculty Chambers</p>
        </div>

        <div className="p-3 rounded-lg border border-border bg-card">
          <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
            <Compass className="h-3 w-3 text-amber-500" />
            Amenities (AMA)
          </p>
          <p className="text-lg font-bold text-foreground mt-1">
            {data.amenitiesAreaSqM.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">sq.m</span>
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Common Rooms & Canteen</p>
        </div>

        <div className="p-3 rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Ruler className="h-3 w-3 text-purple-500" />
              Circulation (ACA)
            </p>
            {result.isCirculationCompliant ? (
              <Badge variant="outline" className="text-[9px] text-emerald-600 border-emerald-500/30 px-1 py-0">
                &ge; 15%
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[9px] text-red-600 border-red-500/30 px-1 py-0">
                &lt; 15% Deficit
              </Badge>
            )}
          </div>
          <p className="text-lg font-bold text-foreground mt-1">
            {data.circulationAreaSqM.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">sq.m</span>
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Ratio: {(result.circulationRatio * 100).toFixed(1)}% of core space
          </p>
        </div>
      </div>

      {/* 2-Column Rules: Allied Lab Sharing & Land Parcel Contiguity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {/* Allied Lab Sharing 30% Card */}
        <div className="p-3.5 rounded-lg border border-border bg-card/60 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <FlaskConical className="h-4 w-4 text-primary" />
              Allied Lab Sharing (Max 30% Ceiling)
            </span>
            {result.alliedLabSharingCompliant ? (
              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                {(result.alliedLabSharingRatio * 100).toFixed(1)}% / 30% Allowed
              </Badge>
            ) : (
              <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 text-[10px]">
                {(result.alliedLabSharingRatio * 100).toFixed(1)}% Exceeded
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            AICTE APH Chapter 1 permits complementary disciplines to share specialized engineering lab facilities up to a maximum of 30.0% of total required lab floor space.
          </p>
        </div>

        {/* Spatial Contiguity & Parcel Constraints Card */}
        <div className="p-3.5 rounded-lg border border-border bg-card/60 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-primary" />
              Spatial Contiguity &amp; Land Parcels
            </span>
            <Badge variant="outline" className="text-[10px] font-mono">
              {data.locationClassification || "URBAN_RURAL"}
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {result.plotContiguityMessage}
          </p>
          {data.landParcels && data.landParcels.length > 0 && (
            <div className="flex items-center gap-3 pt-1 text-[11px] font-mono text-muted-foreground">
              <span>Main Plot: {data.landParcels[0].areaAcres} acres</span>
              <span>• Total Parcels: {data.landParcels.length}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
