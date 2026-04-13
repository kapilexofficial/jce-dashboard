export const dynamic = "force-dynamic";

import { getAllFleetPositionsGrouped, TELEMETRY_IDS } from "@/lib/elithium-api";
import { TelemetriaClient, type VehicleHistory, type PositionPoint } from "./client";

export default async function TelemetriaPage() {
  let grouped: Record<string, Awaited<ReturnType<typeof getAllFleetPositionsGrouped>>[string]> = {};
  try {
    grouped = await getAllFleetPositionsGrouped();
  } catch (error) {
    console.error("Erro Elithium:", error);
  }

  const vehicles: VehicleHistory[] = Object.entries(grouped).map(([plate, positions]) => {
    const points: PositionPoint[] = positions.map((p) => {
      const tel = p.ListTelemetry || {};
      return {
        date: p.EventDate,
        odometer: Number(tel[TELEMETRY_IDS.ODOMETER] || 0),
        fuelTotal: Number(tel[TELEMETRY_IDS.FUEL_TOTAL] || 0),
        fuelLevel: Number(tel[TELEMETRY_IDS.FUEL_LEVEL_PCT] || 0),
        coolantTemp: Number(tel[TELEMETRY_IDS.COOLANT_TEMP] || 0),
        oilTemp: Number(tel[TELEMETRY_IDS.OIL_TEMP] || 0),
        battery: Number(tel["7"] || 0),
        gear: Number(tel[TELEMETRY_IDS.GEAR] || 0),
        ignition: p.Ignition,
        lat: p.Latitude,
        lng: p.Longitude,
        location: p.DistanceFromGeographicArea || "",
      };
    });

    const latest = positions[positions.length - 1];
    return {
      plate,
      driver: latest.Driver || "Sem motorista",
      model: latest.TrackedUnit || "",
      points,
    };
  });

  vehicles.sort((a, b) => a.plate.localeCompare(b.plate));

  return <TelemetriaClient vehicles={vehicles} />;
}
