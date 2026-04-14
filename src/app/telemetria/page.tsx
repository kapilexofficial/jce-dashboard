export const dynamic = "force-dynamic";

import { getAllFleetPositionsGrouped, TELEMETRY_IDS } from "@/lib/elithium-api";
import { getVehicles } from "@/lib/esl-api";
import { TelemetriaClient, type VehicleHistory, type PositionPoint } from "./client";

function inferBrand(model: string): string {
  const m = model.toUpperCase().trim();
  if (!m) return "N/I";
  if (/^(FH|FM|VM|NH)/.test(m)) return "VOLVO";
  if (/^(XF|CF|LF)/.test(m)) return "DAF";
  if (/^R\d/.test(m) || /^T\d/.test(m) || /^G\d/.test(m) || /^P\d/.test(m)) return "SCANIA";
  if (/^(TGX|TGS|TGM)/.test(m)) return "MAN";
  if (/^(AXOR|ATEGO|ACTROS|ACCELO|ATRON)/.test(m)) return "M.BENZ";
  if (/^(CONSTELLATION|DELIVERY|METEOR|WORKER|VW)/.test(m)) return "VOLKSWAGEN";
  if (/^(CARGO|F\d)/.test(m)) return "FORD";
  return "OUTROS";
}

function inferTraction(model: string): string {
  const m = model.toUpperCase().replace(/\s+/g, "");
  const match = m.match(/(\d)X(\d)/);
  if (match) return `${match[1]}x${match[2]}`;
  return "—";
}

export default async function TelemetriaPage() {
  let grouped: Awaited<ReturnType<typeof getAllFleetPositionsGrouped>> = {};
  let eslVehicles: Awaited<ReturnType<typeof getVehicles>> = [];

  try {
    [grouped, eslVehicles] = await Promise.all([
      getAllFleetPositionsGrouped().catch(() => ({})),
      getVehicles().catch(() => []),
    ]);
  } catch (error) {
    console.error("Erro Elithium/ESL:", error);
  }

  const modelByPlate = new Map<string, string>();
  for (const v of eslVehicles) {
    modelByPlate.set(v.license_plate, v.model || "");
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
    const model = modelByPlate.get(plate) || "";
    return {
      plate,
      driver: latest.Driver || "Sem motorista",
      model,
      brand: inferBrand(model),
      traction: inferTraction(model),
      points,
    };
  });

  vehicles.sort((a, b) => a.plate.localeCompare(b.plate));

  return <TelemetriaClient vehicles={vehicles} />;
}
