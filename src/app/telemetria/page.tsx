export const dynamic = "force-dynamic";

import { getAllFleetPositions, TELEMETRY_IDS, type PositionRecord } from "@/lib/elithium-api";
import { TelemetriaClient } from "./client";

export default async function TelemetriaPage() {
  let positions: PositionRecord[] = [];
  try {
    positions = await getAllFleetPositions();
  } catch (error) {
    console.error("Erro Elithium:", error);
  }

  const vehicles = positions.map((p) => {
    const tel = p.ListTelemetry || {};
    const odo = tel[TELEMETRY_IDS.ODOMETER] || 0;
    const fuelTotal = tel[TELEMETRY_IDS.FUEL_TOTAL] || 0;
    const kmlApi = tel[TELEMETRY_IDS.FUEL_CONSUMPTION_KML] || 0;
    const speed = tel[TELEMETRY_IDS.SPEED] || 0;
    const rpm = tel[TELEMETRY_IDS.RPM] || 0;
    const engineTemp = tel[TELEMETRY_IDS.ENGINE_TEMP] || 0;
    const fuelLevel = tel[TELEMETRY_IDS.FUEL_LEVEL_PCT] || 0;
    const coolantTemp = tel[TELEMETRY_IDS.COOLANT_TEMP] || 0;

    return {
      plate: p.Plate,
      driver: p.Driver || "Sem motorista",
      ignition: p.Ignition,
      date: p.EventDate,
      location: p.DistanceFromGeographicArea || "",
      lat: p.Latitude,
      lng: p.Longitude,
      odometer: odo,
      fuelTotal,
      kml: kmlApi,
      speed,
      rpm,
      engineTemp,
      fuelLevel,
      coolantTemp,
    };
  });

  return <TelemetriaClient vehicles={vehicles} />;
}
