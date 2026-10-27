import { describe, it, expect } from "vitest";
import {
  evaluateSpatialCompliance,
  calculateHaversineDistanceKm,
  SpatialBreakdown,
} from "../src/lib/rules/spatial-rules";

describe("Quantitative Spatial & Built-Up Area Norms", () => {
  it("accurately computes TBUA and validates 15% circulation area threshold", () => {
    // INA: 2000, ADA: 500, AMA: 500 -> coreArea = 3000. 15% of 3000 = 450.
    const compliantBreakdown: SpatialBreakdown = {
      instructionalAreaSqM: 2000,
      administrativeAreaSqM: 500,
      amenitiesAreaSqM: 500,
      circulationAreaSqM: 500, // 500 >= 450 -> compliant
      minimumRequiredTBUASqM: 3500,
    };

    const result = evaluateSpatialCompliance(compliantBreakdown);
    expect(result.totalBuiltUpAreaSqM).toBe(3500);
    expect(result.coreAreaSqM).toBe(3000);
    expect(result.isCirculationCompliant).toBe(true);
    expect(result.isTBUACompliant).toBe(true);
    expect(result.findings.length).toBe(0);

    // Deficit circulation area test (300 < 450)
    const deficitBreakdown: SpatialBreakdown = {
      ...compliantBreakdown,
      circulationAreaSqM: 300,
    };
    const deficitResult = evaluateSpatialCompliance(deficitBreakdown);
    expect(deficitResult.isCirculationCompliant).toBe(false);
    expect(
      deficitResult.findings.some((f) => f.ruleId === "RULE_CIRCULATION_AREA_DEFICIT")
    ).toBe(true);
  });

  it("enforces the 30% statutory sharing limit on allied engineering laboratories", () => {
    // Total: 1000 sq.m, Shared: 250 sq.m (25% <= 30%) -> compliant
    const compliantLab: SpatialBreakdown = {
      instructionalAreaSqM: 2000,
      administrativeAreaSqM: 500,
      amenitiesAreaSqM: 500,
      circulationAreaSqM: 500,
      alliedLaboratories: [
        { branch: "Computer Science & Information Tech", totalLabAreaSqM: 600, sharedLabAreaSqM: 150 },
        { branch: "Electronics & Communication", totalLabAreaSqM: 400, sharedLabAreaSqM: 100 },
      ],
    };
    const compResult = evaluateSpatialCompliance(compliantLab);
    expect(compResult.alliedLabSharingCompliant).toBe(true);
    expect(compResult.alliedLabSharingRatio).toBe(0.25);
    expect(compResult.findings.length).toBe(0);

    // Total: 1000 sq.m, Shared: 350 sq.m (35% > 30%) -> violation
    const excessiveLab: SpatialBreakdown = {
      ...compliantLab,
      alliedLaboratories: [
        { branch: "Computer Science & IT", totalLabAreaSqM: 600, sharedLabAreaSqM: 250 },
        { branch: "Electronics & Comm", totalLabAreaSqM: 400, sharedLabAreaSqM: 100 },
      ],
    };
    const excessResult = evaluateSpatialCompliance(excessiveLab);
    expect(excessResult.alliedLabSharingCompliant).toBe(false);
    expect(excessResult.alliedLabSharingRatio).toBe(0.35);
    expect(
      excessResult.findings.some((f) => f.ruleId === "RULE_ALLIED_LAB_SHARING_EXCEEDED")
    ).toBe(true);
  });

  it("calculates Haversine distance and checks Urban/Rural 2.0 km plot separation limit", () => {
    // Delhi Connaught Place to India Gate ~ 2.2 km
    const plot1 = { latitude: 28.6315, longitude: 77.2167 };
    const plot2 = { latitude: 28.6129, longitude: 77.2295 };

    const distance = calculateHaversineDistanceKm(plot1, plot2);
    expect(distance).toBeGreaterThan(2.0);
    expect(distance).toBeLessThan(2.5);

    const splitParcels: SpatialBreakdown = {
      instructionalAreaSqM: 2000,
      administrativeAreaSqM: 500,
      amenitiesAreaSqM: 500,
      circulationAreaSqM: 500,
      locationClassification: "URBAN_RURAL",
      landParcels: [
        {
          id: "p1",
          surveyNumber: "101/A",
          areaAcres: 2.5,
          isMainPlot: true,
          purpose: "CORE_ACADEMIC",
          coordinates: plot1,
        },
        {
          id: "p2",
          surveyNumber: "102/B",
          areaAcres: 1.0,
          isMainPlot: false,
          purpose: "AUXILIARY_SPORTS_HOSTEL",
          coordinates: plot2,
        },
      ],
    };

    const result = evaluateSpatialCompliance(splitParcels);
    expect(result.plotContiguityCompliant).toBe(false);
    expect(
      result.findings.some((f) => f.ruleId === "RULE_SPLIT_PLOT_DISTANCE_EXCEEDED")
    ).toBe(true);
  });

  it("flags violation when Urban/Rural main plot acreage is below 1.5 acres", () => {
    const smallMainPlot: SpatialBreakdown = {
      instructionalAreaSqM: 2000,
      administrativeAreaSqM: 500,
      amenitiesAreaSqM: 500,
      circulationAreaSqM: 500,
      locationClassification: "URBAN_RURAL",
      landParcels: [
        {
          id: "p1",
          surveyNumber: "55",
          areaAcres: 1.1, // < 1.5 acres
          isMainPlot: true,
          purpose: "CORE_ACADEMIC",
        },
      ],
    };

    const result = evaluateSpatialCompliance(smallMainPlot);
    expect(result.plotContiguityCompliant).toBe(false);
    expect(
      result.findings.some((f) => f.ruleId === "RULE_MAIN_PLOT_SIZE_DEFICIT")
    ).toBe(true);
  });

  it("prohibits split non-contiguous parcels in Mega/Metro zones", () => {
    const metroSplit: SpatialBreakdown = {
      instructionalAreaSqM: 2000,
      administrativeAreaSqM: 500,
      amenitiesAreaSqM: 500,
      circulationAreaSqM: 500,
      locationClassification: "MEGA_METRO",
      landParcels: [
        { id: "m1", surveyNumber: "1", areaAcres: 1.0, isMainPlot: true, purpose: "CORE_ACADEMIC" },
        { id: "m2", surveyNumber: "2", areaAcres: 0.5, isMainPlot: false, purpose: "AUXILIARY_SPORTS_HOSTEL" },
      ],
    };

    const result = evaluateSpatialCompliance(metroSplit);
    expect(result.plotContiguityCompliant).toBe(false);
    expect(
      result.findings.some((f) => f.ruleId === "RULE_PLOT_CONTIGUITY_METRO")
    ).toBe(true);
  });
});
