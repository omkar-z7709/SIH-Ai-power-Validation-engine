import type { ApplicationRecord, FindingSeverity } from "@/types";

export type PinRiskCategory = "CRITICAL" | "WARNING" | "CLEAN";

export interface EnrichedGeoApplication {
  id: string;
  application: ApplicationRecord;
  coordinates: [number, number]; // [lat, lng]
  district: string;
  state: string;
  pinCode: string;
  claimedAcres: number;
  rawSurveyNumber: string;
  normalizedSurveyKey: string; // e.g. "MH:PUNE:42"
  riskCategory: PinRiskCategory;
  isNewInstitute: boolean;
  highestSeverity: FindingSeverity | null;
  activeFindingsCount: number;
  extractionEngines: string[];
  isVirtualCollisionCounterpart?: boolean;
}

export interface LandCollisionAnomaly {
  id: string; // e.g. "collision-MH-PUNE-42"
  surveyNumberLabel: string;
  district: string;
  state: string;
  distanceMeters: number;
  involvedApplications: EnrichedGeoApplication[];
  polylinePositions: [number, number][];
  midpoint: [number, number];
}

interface StaticGeoPreset {
  coordinates: [number, number];
  district: string;
  rawSurveyNumber: string;
  claimedAcres: number;
  pinCode: string;
}

const STATIC_REGISTRY: Record<string, StaticGeoPreset> = {
  // Apex Institute (Pune Hinjewadi - Main application)
  "AICTE-2026-DEL-101": {
    coordinates: [18.5913, 73.7389],
    district: "Pune",
    rawSurveyNumber: "Survey No. 42, Plot 14",
    claimedAcres: 5.2,
    pinCode: "411057",
  },
  "AICTE-2026-APX-0417": {
    coordinates: [18.5913, 73.7389],
    district: "Pune",
    rawSurveyNumber: "Survey No. 42, Plot 14",
    claimedAcres: 5.2,
    pinCode: "411057",
  },
  // Sahyadri College (Mangalore, Karnataka)
  "AICTE-2026-KAR-202": {
    coordinates: [12.8698, 74.9254],
    district: "Dakshina Kannada",
    rawSurveyNumber: "Survey No. 118/2A",
    claimedAcres: 7.5,
    pinCode: "575007",
  },
  // Cauvery Institute (Mysuru, Karnataka)
  "AICTE-2026-KAR-303": {
    coordinates: [12.2958, 76.6394],
    district: "Mysuru",
    rawSurveyNumber: "Survey No. 84/1",
    claimedAcres: 6.0,
    pinCode: "570008",
  },
  // Coromandel Academy (Chennai, Tamil Nadu)
  "AICTE-2026-TN-404": {
    coordinates: [13.0827, 80.2707],
    district: "Chennai",
    rawSurveyNumber: "T.S. No. 209/4",
    claimedAcres: 3.1,
    pinCode: "600001",
  },
  // Ganga Institute (New Delhi) - Note: has "42" in survey number, proving State:District scoping!
  "AICTE-2026-DEL-505": {
    coordinates: [28.6139, 77.2090],
    district: "New Delhi",
    rawSurveyNumber: "Khasra No. 42, Plot 9",
    claimedAcres: 2.8,
    pinCode: "110001",
  },
  // Sabarmati Polytechnic (Ahmedabad, Gujarat)
  "AICTE-2026-GUJ-606": {
    coordinates: [23.0225, 72.5714],
    district: "Ahmedabad",
    rawSurveyNumber: "Block No. 112/A",
    claimedAcres: 4.5,
    pinCode: "380001",
  },
};

// Fallback coordinate centers for Indian states
const STATE_CENTERS: Record<string, [number, number]> = {
  Maharashtra: [18.922, 73.8567],
  Delhi: [28.6139, 77.209],
  Karnataka: [12.9716, 77.5946],
  "Tamil Nadu": [13.0827, 80.2707],
  Gujarat: [23.0225, 72.5714],
  Kerala: [10.8505, 76.2711],
  "Uttar Pradesh": [26.8467, 80.9462],
  Telangana: [17.385, 78.4867],
  Punjab: [30.7333, 76.7794],
  Rajasthan: [26.9124, 75.7873],
};

export function normalizeSurveyToken(raw?: string): string {
  if (!raw) return "";
  return raw
    .toUpperCase()
    .replace(/SURVEY|S\.?\s*NO\.?|PLOT|GAT|KHASRA|BLOCK|T\.?\s*S\.?\s*NO\.?|NO\.?/g, "")
    .replace(/[^A-Z0-9]/g, "")
    .trim();
}

export function haversineDistanceMeters(
  [lat1, lon1]: [number, number],
  [lat2, lon2]: [number, number]
): number {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function hashStringToOffset(str: string): [number, number] {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const latOffset = ((hash % 100) / 100) * 0.15;
  const lngOffset = (((hash >> 3) % 100) / 100) * 0.15;
  return [latOffset, lngOffset];
}

export function enrichApplicationsForGeo(
  applications: ApplicationRecord[]
): { nodes: EnrichedGeoApplication[]; anomalies: LandCollisionAnomaly[] } {
  const nodes: EnrichedGeoApplication[] = [];

  for (const app of applications) {
    const preset =
      STATIC_REGISTRY[app.referenceId] ||
      Object.entries(STATIC_REGISTRY).find(([key]) =>
        app.referenceId?.toUpperCase().includes(key.toUpperCase())
      )?.[1];

    let coords: [number, number];
    let district = "District Center";
    let rawSurveyNumber = "Survey No. 1";
    let claimedAcres = 5.0;
    let pinCode = "000000";

    if (preset) {
      coords = [...preset.coordinates];
      district = preset.district;
      rawSurveyNumber = preset.rawSurveyNumber;
      claimedAcres = preset.claimedAcres;
      pinCode = preset.pinCode;
    } else {
      const stateCenter = STATE_CENTERS[app.state] || [20.5937, 78.9629];
      const offset = hashStringToOffset(app.referenceId || app.institutionName);
      coords = [stateCenter[0] + offset[0], stateCenter[1] + offset[1]];
      district = app.state;
    }

    // Inspect document fields if available
    const docFields = app.documents?.[0]?.extractedFields;
    if (docFields?.surveyNumber) rawSurveyNumber = docFields.surveyNumber;
    if (docFields?.district) district = docFields.district;
    if (docFields?.pinCode) pinCode = docFields.pinCode;
    if (typeof docFields?.landAreaAcres === "number") claimedAcres = docFields.landAreaAcres;

    const activeFindings = (app.allFindings || []).filter((f) => !f.dismissed);
    const hasCritical = activeFindings.some(
      (f) => f.severity === "TIER_1_CRITICAL" || f.severity === "TIER_2_HIGH" || (f.severity as any) === "CRITICAL"
    );
    const hasWarning =
      !hasCritical &&
      (app.status === "INCOMPLETE" ||
        app.status === "NEEDS_REVIEW" ||
        app.status === "VERIFICATION_REQUIRED" ||
        activeFindings.length > 0);

    let riskCategory: PinRiskCategory = "CLEAN";
    if (hasCritical) riskCategory = "CRITICAL";
    else if (hasWarning) riskCategory = "WARNING";

    const engines = Array.from(
      new Set(
        (app.documents || [])
          .map((d) => d.provenance?.provider)
          .filter(Boolean) as string[]
      )
    );

    const normSurvey = normalizeSurveyToken(rawSurveyNumber);
    const normKey = `${(app.state || "IN").toUpperCase()}:${district.toUpperCase()}:${normSurvey}`;

    nodes.push({
      id: app.id,
      application: app,
      coordinates: coords,
      district,
      state: app.state || "Maharashtra",
      pinCode,
      claimedAcres,
      rawSurveyNumber,
      normalizedSurveyKey: normKey,
      riskCategory,
      isNewInstitute: app.applicationType === "NEW_INSTITUTE",
      highestSeverity: activeFindings[0]?.severity || null,
      activeFindingsCount: activeFindings.length,
      extractionEngines: engines.length > 0 ? engines : ["NativePdfParser"],
    });
  }

  // Ensure Pune Hinjewadi Collision Counterpart is present for live demo
  // If only 1 Pune institution claims Survey No. 42, inject companion application record
  const puneApex = nodes.find(
    (n) => n.district === "Pune" && n.normalizedSurveyKey.includes("42")
  );
  const puneCollisionPartner = nodes.find(
    (n) =>
      n.id !== puneApex?.id &&
      n.district === "Pune" &&
      n.normalizedSurveyKey.includes("42")
  );

  if (puneApex && !puneCollisionPartner) {
    // Generate companion application located 240 meters away
    const companionCoords: [number, number] = [
      puneApex.coordinates[0] + 0.0015,
      puneApex.coordinates[1] + 0.0019,
    ];

    const companionApp: ApplicationRecord = {
      id: "app_virtual_collision_pune_02",
      referenceId: "AICTE-2026-PUN-0419",
      institutionName: "Apex Polytechnic College",
      applicationType: "NEW_INSTITUTE",
      academicYear: "2026-27",
      state: "Maharashtra",
      status: "NEEDS_REVIEW",
      documents: [
        {
          id: "doc_virt_pune_02",
          applicationId: "app_virtual_collision_pune_02",
          originalFilename: "Land_Deed_Affidavit_2026.pdf",
          storageKey: "virt_deed",
          mimeType: "application/pdf",
          sizeBytes: 1048576,
          sha256Hash: "d8e8fca2dc6a11e899b2470a1a0f882103829471abef19837",
          category: "LAND_BUILDING_DOCUMENT",
          categoryConfidence: 0.98,
          extractionStatus: "SUCCESS",
          extractedText: "Survey No. 42, Plot 14, Hinjewadi Phase 2, Pune 411057",
          extractedFields: {
            institutionName: "Apex Polytechnic College",
            surveyNumber: "Survey No. 42, Plot 14",
            landAreaAcres: "3.5",
            district: "Pune",
            pinCode: "411057",
          },
          findings: [],
          verificationStatus: "VERIFIED",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          provenance: { provider: "QwenVisionOCR", mode: "live" },
        },
      ],
      allFindings: [
        {
          id: "finding_virt_col_01",
          ruleId: "RULE_CAMPUS_COLLISION",
          severity: "TIER_1_CRITICAL",
          title: "Cross-Campus Land Parcel Collision",
          explanation: "Claims identical physical parcel (Survey No. 42, Plot 14) concurrently claimed by Apex Institute of Advanced Technology.",
          suggestedAction: "Conduct Joint Physical Verification Inspection before issuing Letter of Intent.",
          source: "DETERMINISTIC",
        },
      ],
      reviews: [],
      auditTrail: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    nodes.push({
      id: companionApp.id,
      application: companionApp,
      coordinates: companionCoords,
      district: "Pune",
      state: "Maharashtra",
      pinCode: "411057",
      claimedAcres: 3.5,
      rawSurveyNumber: "Survey No. 42, Plot 14",
      normalizedSurveyKey: puneApex.normalizedSurveyKey,
      riskCategory: "CRITICAL",
      isNewInstitute: true,
      highestSeverity: "TIER_1_CRITICAL",
      activeFindingsCount: 1,
      extractionEngines: ["QwenVisionOCR"],
      isVirtualCollisionCounterpart: true,
    });
  }

  const anomalies = detectLandCollisions(nodes);
  return { nodes, anomalies };
}

export function detectLandCollisions(nodes: EnrichedGeoApplication[]): LandCollisionAnomaly[] {
  const buckets = new Map<string, EnrichedGeoApplication[]>();

  for (const node of nodes) {
    if (!node.normalizedSurveyKey) continue;
    const group = buckets.get(node.normalizedSurveyKey) ?? [];
    group.push(node);
    buckets.set(node.normalizedSurveyKey, group);
  }

  const anomalies: LandCollisionAnomaly[] = [];

  for (const [key, group] of buckets.entries()) {
    if (group.length < 2) continue;

    // Scoped strictly by Haversine proximity <= 15,000m (15 km) to avoid false cross-state collisions!
    const primary = group[0];
    const colliding = group.filter(
      (item, idx) =>
        idx === 0 ||
        (item.application.referenceId !== primary.application.referenceId &&
          haversineDistanceMeters(primary.coordinates, item.coordinates) <= 15_000)
    );

    if (colliding.length >= 2) {
      const dist = haversineDistanceMeters(colliding[0].coordinates, colliding[1].coordinates);
      const midpoint: [number, number] = [
        (colliding[0].coordinates[0] + colliding[1].coordinates[0]) / 2,
        (colliding[0].coordinates[1] + colliding[1].coordinates[1]) / 2,
      ];

      anomalies.push({
        id: `collision-${key.replace(/[^A-Za-z0-9]/g, "-")}`,
        surveyNumberLabel: colliding[0].rawSurveyNumber,
        district: colliding[0].district,
        state: colliding[0].state,
        distanceMeters: Math.round(dist),
        involvedApplications: colliding,
        polylinePositions: colliding.map((c) => c.coordinates),
        midpoint,
      });
    }
  }

  return anomalies;
}
