import { Finding } from "@/types";

export type LocationClassification = "MEGA_METRO" | "URBAN_RURAL" | "HILLY";

export interface PlotCoordinate {
  latitude: number;
  longitude: number;
}

export interface LandParcel {
  id: string;
  surveyNumber: string;
  areaAcres: number;
  isMainPlot: boolean;
  purpose: "CORE_ACADEMIC" | "AUXILIARY_SPORTS_HOSTEL" | "RESIDENTIAL";
  coordinates?: PlotCoordinate;
}

export interface AlliedLabSpec {
  branch: string;
  totalLabAreaSqM: number;
  sharedLabAreaSqM: number;
}

export interface SpatialBreakdown {
  instructionalAreaSqM: number; // INA
  administrativeAreaSqM: number; // ADA
  amenitiesAreaSqM: number; // AMA
  circulationAreaSqM: number; // ACA
  minimumRequiredTBUASqM?: number;
  alliedLaboratories?: AlliedLabSpec[];
  locationClassification?: LocationClassification;
  landParcels?: LandParcel[];
}

export interface SpatialComplianceResult {
  totalBuiltUpAreaSqM: number; // TBUA
  coreAreaSqM: number; // INA + ADA + AMA
  circulationRatio: number; // ACA / coreArea
  isCirculationCompliant: boolean;
  isTBUACompliant: boolean;
  tbuaDeficitPercent: number;
  alliedLabSharingCompliant: boolean;
  alliedLabSharingRatio: number;
  plotContiguityCompliant: boolean;
  plotContiguityMessage: string;
  findings: Finding[];
}

/**
 * Calculates Haversine distance in kilometers between two geographic coordinates
 */
export function calculateHaversineDistanceKm(
  coord1: PlotCoordinate,
  coord2: PlotCoordinate
): number {
  const R = 6371; // Earth radius in kilometers
  const dLat = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const dLon = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;
  const lat1 = (coord1.latitude * Math.PI) / 180;
  const lat2 = (coord2.latitude * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Evaluates institutional spatial compliance per official AICTE APH regulations:
 * 1. TBUA = (INA + ADA + AMA) + ACA
 * 2. ACA >= 0.15 * (INA + ADA + AMA)
 * 3. Allied Lab Sharing <= 30% of total allied lab space
 * 4. Land parcel contiguity by zone (Metro: 1 contiguous, Urban/Rural: max 2 with dist <= 2.0km and main >= 1.5 acres, Hilly: max 3)
 */
export function evaluateSpatialCompliance(
  data: SpatialBreakdown,
  applicationId = "app_eval"
): SpatialComplianceResult {
  const findings: Finding[] = [];

  const ina = Math.max(0, data.instructionalAreaSqM || 0);
  const ada = Math.max(0, data.administrativeAreaSqM || 0);
  const ama = Math.max(0, data.amenitiesAreaSqM || 0);
  const aca = Math.max(0, data.circulationAreaSqM || 0);

  // 1. Total Built-Up Area: TBUA = (INA + ADA + AMA) + ACA
  const coreArea = ina + ada + ama;
  const tbua = coreArea + aca;

  // Circulation Area check (minimum 15% of core area)
  const minRequiredACA = coreArea * 0.15;
  const circulationRatio = coreArea > 0 ? aca / coreArea : 0;
  const isCirculationCompliant = aca >= minRequiredACA;

  if (coreArea > 0 && !isCirculationCompliant) {
    findings.push({
      id: `f_spatial_circ_${Date.now()}`,
      ruleId: "RULE_CIRCULATION_AREA_DEFICIT",
      title: "Circulation & Safety Passageway Area Deficit",
      severity: "TIER_2_HIGH",
      explanation: `Statutory norm requires circulation area (ACA) to constitute at least 15% of core built-up area (${minRequiredACA.toFixed(
        1
      )} sq.m required, provided: ${aca} sq.m, ratio: ${(circulationRatio * 100).toFixed(1)}%).`,
      suggestedAction:
        "Ensure hallways, staircases, and fire egress passages meet AICTE APH Chapter 1 circulation standards.",
      source: "DETERMINISTIC",
    });
  }

  // Built-Up Area sufficiency check against required benchmark
  let isTBUACompliant = true;
  let tbuaDeficitPercent = 0;
  if (data.minimumRequiredTBUASqM && data.minimumRequiredTBUASqM > 0) {
    if (tbua < data.minimumRequiredTBUASqM) {
      isTBUACompliant = false;
      tbuaDeficitPercent =
        ((data.minimumRequiredTBUASqM - tbua) / data.minimumRequiredTBUASqM) * 100;

      const severity = tbuaDeficitPercent > 15 ? "TIER_1_CRITICAL" : "TIER_2_HIGH";
      findings.push({
        id: `f_spatial_tbua_${Date.now()}`,
        ruleId:
          tbuaDeficitPercent > 15
            ? "RULE_BUILT_UP_AREA_DEFICIT_CRITICAL"
            : "RULE_BUILT_UP_AREA_DEFICIT",
        title: `Built-Up Area Deficit: ${tbuaDeficitPercent.toFixed(1)}% Below APH Norm`,
        severity,
        explanation: `Total built-up space provided (${tbua} sq.m) falls short of the statutory requirement of ${
          data.minimumRequiredTBUASqM
        } sq.m for the sanctioned intake.`,
        suggestedAction:
          "Expand physical instructional/administrative facilities or reduce proposed division intake.",
        source: "DETERMINISTIC",
      });
    }
  }

  // 2. Allied Lab Sharing Check (Maximum 30%)
  let alliedLabSharingCompliant = true;
  let alliedLabSharingRatio = 0;
  if (data.alliedLaboratories && data.alliedLaboratories.length > 0) {
    const totalAlliedLab = data.alliedLaboratories.reduce(
      (sum, item) => sum + item.totalLabAreaSqM,
      0
    );
    const sharedLab = data.alliedLaboratories.reduce(
      (sum, item) => sum + item.sharedLabAreaSqM,
      0
    );

    if (totalAlliedLab > 0) {
      alliedLabSharingRatio = sharedLab / totalAlliedLab;
      if (alliedLabSharingRatio > 0.3) {
        alliedLabSharingCompliant = false;
        findings.push({
          id: `f_spatial_lab_share_${Date.now()}`,
          ruleId: "RULE_ALLIED_LAB_SHARING_EXCEEDED",
          title: "Allied Engineering Laboratory Sharing Exceeds 30% Threshold",
          severity: "TIER_2_HIGH",
          explanation: `Specialized laboratory sharing across allied disciplines is ${(
            alliedLabSharingRatio * 100
          ).toFixed(1)}%, exceeding the permissible statutory ceiling of 30.0%.`,
          suggestedAction:
            "Designate dedicated branch-specific laboratories to reduce shared proportion to <= 30%.",
          source: "DETERMINISTIC",
        });
      }
    }
  }

  // 3. Spatial Contiguity & Plot Constraints
  let plotContiguityCompliant = true;
  let plotContiguityMessage = "Campus land layout compliant with regional contiguity norms.";
  const location = data.locationClassification || "URBAN_RURAL";
  const parcels = data.landParcels || [];

  if (parcels.length > 0) {
    const mainPlot = parcels.find((p) => p.isMainPlot) || parcels[0];

    if (location === "MEGA_METRO") {
      if (parcels.length > 1) {
        plotContiguityCompliant = false;
        plotContiguityMessage =
          "Mega/Metro classification mandates a single contiguous land parcel. Split parcels not permitted.";
        findings.push({
          id: `f_spatial_plot_metro_${Date.now()}`,
          ruleId: "RULE_PLOT_CONTIGUITY_METRO",
          title: "Mega/Metro Plot Contiguity Violation: Split Parcels Not Permitted",
          severity: "TIER_1_CRITICAL",
          explanation: plotContiguityMessage,
          suggestedAction: "Consolidate campus operations onto a single contiguous plot.",
          source: "DETERMINISTIC",
        });
      }
    } else if (location === "URBAN_RURAL") {
      if (parcels.length > 2) {
        plotContiguityCompliant = false;
        plotContiguityMessage = `Urban/Rural classification permits at most 2 parcels (submitted: ${parcels.length}).`;
        findings.push({
          id: `f_spatial_max_parcels_${Date.now()}`,
          ruleId: "RULE_MAX_PARCELS_EXCEEDED",
          title: "Maximum Permissible Non-Contiguous Plots Exceeded",
          severity: "TIER_1_CRITICAL",
          explanation: plotContiguityMessage,
          suggestedAction: "Campus must be consolidated within a maximum of 2 plots.",
          source: "DETERMINISTIC",
        });
      }

      if (mainPlot.areaAcres < 1.5) {
        plotContiguityCompliant = false;
        findings.push({
          id: `f_spatial_main_plot_${Date.now()}`,
          ruleId: "RULE_MAIN_PLOT_SIZE_DEFICIT",
          title: "Main Plot Acreage Deficit (< 1.5 Acres Required)",
          severity: "TIER_1_CRITICAL",
          explanation: `The primary academic plot is ${mainPlot.areaAcres} acres, below the statutory minimum threshold of 1.5 acres for core instructional infrastructure.`,
          suggestedAction: "Ensure main academic plot contains at least 1.5 contiguous acres.",
          source: "DETERMINISTIC",
        });
      }

      // Check distance and usage for auxiliary parcels
      const auxParcels = parcels.filter((p) => !p.isMainPlot);
      for (const aux of auxParcels) {
        if (aux.purpose === "CORE_ACADEMIC") {
          plotContiguityCompliant = false;
          findings.push({
            id: `f_spatial_aux_purpose_${aux.id}`,
            ruleId: "RULE_AUXILIARY_PLOT_USAGE_VIOLATION",
            title: "Auxiliary Plot Usage Violation: Core Academic Infrastructure Prohibited",
            severity: "TIER_1_CRITICAL",
            explanation: `Auxiliary plot (Survey No: ${aux.surveyNumber}) is designated for core academic instructional use. APH regulations restrict auxiliary plots to sports, hostels, and staff housing.`,
            suggestedAction:
              "Relocate instructional classrooms/labs to the primary academic plot.",
            source: "DETERMINISTIC",
          });
        }

        if (mainPlot.coordinates && aux.coordinates) {
          const distanceKm = calculateHaversineDistanceKm(mainPlot.coordinates, aux.coordinates);
          if (distanceKm > 2.0) {
            plotContiguityCompliant = false;
            plotContiguityMessage = `Separation distance between main plot and plot ${aux.surveyNumber} is ${distanceKm.toFixed(
              2
            )} km, exceeding the 2.0 km statutory ceiling.`;
            findings.push({
              id: `f_spatial_plot_distance_${aux.id}`,
              ruleId: "RULE_SPLIT_PLOT_DISTANCE_EXCEEDED",
              title: `Plot Separation Distance Exceeded: ${distanceKm.toFixed(2)} km > 2.0 km`,
              severity: "TIER_1_CRITICAL",
              explanation: plotContiguityMessage,
              suggestedAction:
                "Non-contiguous plots must have an aerial separation distance of at most 2.0 km.",
              source: "DETERMINISTIC",
            });
          }
        }
      }
    } else if (location === "HILLY") {
      if (parcels.length > 3) {
        plotContiguityCompliant = false;
        plotContiguityMessage = `Hilly terrain classification permits at most 3 parcels (submitted: ${parcels.length}).`;
        findings.push({
          id: `f_spatial_hilly_max_parcels_${Date.now()}`,
          ruleId: "RULE_MAX_PARCELS_EXCEEDED",
          title: "Hilly Terrain Maximum Plot Limit Exceeded (> 3 Plots)",
          severity: "TIER_1_CRITICAL",
          explanation: plotContiguityMessage,
          suggestedAction: "Consolidate into at most 3 motorable parcels.",
          source: "DETERMINISTIC",
        });
      }
    }
  }

  return {
    totalBuiltUpAreaSqM: tbua,
    coreAreaSqM: coreArea,
    circulationRatio,
    isCirculationCompliant,
    isTBUACompliant,
    tbuaDeficitPercent,
    alliedLabSharingCompliant,
    alliedLabSharingRatio,
    plotContiguityCompliant,
    plotContiguityMessage,
    findings,
  };
}
