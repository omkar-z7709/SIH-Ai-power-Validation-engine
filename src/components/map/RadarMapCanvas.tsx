"use client";

import { useEffect, useState } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Tooltip, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { EnrichedGeoApplication, LandCollisionAnomaly } from "@/lib/geo/institution-coordinates";

interface RadarMapCanvasProps {
  nodes: EnrichedGeoApplication[];
  anomalies: LandCollisionAnomaly[];
  activeViewport: { center: [number, number]; zoom: number };
  collisionMode: boolean;
  selectedNodeId: string | null;
  onSelectNode: (node: EnrichedGeoApplication) => void;
}

// Map camera controller using react-leaflet useMap()
function ViewportController({ target }: { target: { center: [number, number]; zoom: number } }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(target.center, target.zoom, { duration: 1.1, easeLinearity: 0.25 });
  }, [map, target.center, target.zoom]);
  return null;
}

function createCompliancePinIcon(
  node: EnrichedGeoApplication,
  isSelected: boolean,
  isColliding: boolean
): L.DivIcon {
  let coreBg = "bg-emerald-500";
  let pulseRing = "";

  if (node.riskCategory === "CRITICAL") {
    coreBg = "bg-rose-600";
    pulseRing = "animate-ping bg-rose-500/70";
  } else if (node.riskCategory === "WARNING") {
    coreBg = "bg-amber-500";
    pulseRing = "animate-pulse bg-amber-400/50";
  }

  const selectedClass = isSelected
    ? "scale-135 ring-3 ring-primary shadow-xl z-50"
    : "hover:scale-115";

  const collisionRing = isColliding
    ? "outline-2 outline-dashed outline-rose-500 outline-offset-2 animate-bounce"
    : "";

  const newInstituteHalo = node.isNewInstitute
    ? '<span class="absolute -top-1 -right-1 flex h-2.5 w-2.5"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500"></span></span>'
    : "";

  const html = `
    <div class="relative flex items-center justify-center w-7 h-7 transition-transform duration-200 cursor-pointer ${selectedClass} ${collisionRing}">
      ${pulseRing ? `<span class="absolute inline-flex h-6 w-6 rounded-full ${pulseRing} opacity-75"></span>` : ""}
      <span class="relative flex items-center justify-center w-5 h-5 rounded-full ${coreBg} border-2 border-white shadow-md text-[9px] font-bold text-white font-mono">
        ${node.activeFindingsCount > 0 ? node.activeFindingsCount : "✓"}
      </span>
      ${newInstituteHalo}
    </div>
  `;

  return L.divIcon({
    className: "bg-transparent border-0",
    html,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    tooltipAnchor: [0, -14],
  });
}

function createAnomalyMidpointIcon(meters: number): L.DivIcon {
  const html = `
    <div class="px-2 py-1 bg-rose-600 text-white rounded-md shadow-lg border border-white text-[10px] font-mono font-bold flex items-center gap-1 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap animate-pulse">
      <span>⚡ COLLISION (${meters}m)</span>
    </div>
  `;
  return L.divIcon({
    className: "bg-transparent border-0",
    html,
    iconSize: [0, 0],
  });
}

export default function RadarMapCanvas({
  nodes,
  anomalies,
  activeViewport,
  collisionMode,
  selectedNodeId,
  onSelectNode,
}: RadarMapCanvasProps) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkDark = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    checkDark();

    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  const tileUrl = isDark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  const collidingNodeIds = new Set(
    anomalies.flatMap((a) => a.involvedApplications.map((inv) => inv.id))
  );

  return (
    <div className="relative w-full h-full isolate z-0 overflow-hidden bg-background">
      {/* Tailwind v4 Leaflet Tile override */}
      <style jsx global>{`
        .leaflet-container img.leaflet-tile {
          max-width: none !important;
          max-height: none !important;
        }
        .leaflet-container {
          font-family: inherit;
          z-index: 0;
          background-color: var(--surface-subtle);
        }
        .leaflet-pane {
          z-index: 10 !important;
        }
        .leaflet-top,
        .leaflet-bottom {
          z-index: 20 !important;
        }
      `}</style>

        <MapContainer
          center={activeViewport.center}
          zoom={activeViewport.zoom}
          zoomControl={true}
          className="w-full h-full"
        >
        <ViewportController target={activeViewport} />

        <TileLayer
          key={isDark ? "osm-dark" : "osm-standard"}
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* Land Collision Anomaly Vectors */}
        {collisionMode &&
          anomalies.map((anomaly) => (
            <div key={anomaly.id}>
              <Polyline
                positions={anomaly.polylinePositions}
                pathOptions={{
                  color: "#e11d48",
                  weight: 3,
                  dashArray: "6, 6",
                  opacity: 0.9,
                }}
              />
              <Marker
                position={anomaly.midpoint}
                icon={createAnomalyMidpointIcon(anomaly.distanceMeters)}
                interactive={false}
              />
            </div>
          ))}

        {/* Institution Markers */}
        {nodes.map((node) => {
          const isSelected = node.id === selectedNodeId;
          const isColliding = collisionMode && collidingNodeIds.has(node.id);
          const icon = createCompliancePinIcon(node, isSelected, isColliding);

          return (
            <Marker
              key={node.id}
              position={node.coordinates}
              icon={icon}
              eventHandlers={{
                click: () => onSelectNode(node),
              }}
            >
              <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                <div className="p-1 space-y-1 text-xs">
                  <div className="font-bold text-foreground">
                    {node.application.institutionName}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-1.5">
                    <span>{node.application.referenceId}</span>
                    <span>•</span>
                    <span>{node.district}</span>
                  </div>
                  <div className="flex items-center gap-1 pt-0.5">
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                        node.riskCategory === "CRITICAL"
                          ? "bg-rose-500/20 text-rose-700 dark:text-rose-300"
                          : node.riskCategory === "WARNING"
                          ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                          : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                      }`}
                    >
                      {node.riskCategory} ({node.activeFindingsCount} flags)
                    </span>
                    {node.isNewInstitute && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-700 dark:text-sky-300">
                        New Institute
                      </span>
                    )}
                  </div>
                </div>
              </Tooltip>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
