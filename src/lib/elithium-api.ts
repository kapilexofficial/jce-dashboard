const API_URL = process.env.ELITHIUM_API_URL || "";
const USERNAME = process.env.ELITHIUM_USERNAME || "";
const PASSWORD = process.env.ELITHIUM_PASSWORD || "";
const HASH_AUTH = process.env.ELITHIUM_HASH_AUTH || "";

let cachedToken: string | null = null;
let tokenExpiry = 0;

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const params = new URLSearchParams({
    Username: USERNAME,
    Password: PASSWORD,
    HashAuth: HASH_AUTH,
  });

  const res = await fetch(`${API_URL}/Login?${params}`, {
    method: "POST",
    headers: { "Content-Length": "0" },
  });

  if (!res.ok) throw new Error(`Elithium login failed: ${res.status}`);

  const data = await res.json();
  if (!data.AccessToken) throw new Error(`Elithium login error: ${data.Message || "no token"}`);
  cachedToken = data.AccessToken;
  tokenExpiry = Date.now() + 3600000;
  return cachedToken!;
}

async function request<T>(path: string, body: unknown = {}): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Elithium API error ${res.status}: ${text}`);
  }

  return res.json();
}

// ============ Endpoints ============

export async function getPositionsByPlatePrefix(prefix: string) {
  return request<PositionRecord[]>("/v3/Tracking/PositionHistory/List", [
    { PropertyName: "Plate", Condition: "StartsWith", Value: prefix },
  ]);
}

export async function getPositionByPlate(plate: string) {
  return request<PositionRecord[]>("/v3/Tracking/PositionHistory/List", [
    { PropertyName: "Plate", Condition: "Equal", Value: plate },
  ]);
}

export async function getAllFleetPositions(): Promise<PositionRecord[]> {
  const grouped = await getAllFleetPositionsGrouped();
  // Return only the latest position per plate (backwards compat)
  return Object.values(grouped).map((positions) => positions[positions.length - 1]);
}

export async function getAllFleetPositionsGrouped(): Promise<Record<string, PositionRecord[]>> {
  const prefixes = "BCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const grouped: Record<string, PositionRecord[]> = {};

  for (const prefix of prefixes) {
    try {
      const data = await getPositionsByPlatePrefix(prefix);
      for (const p of data) {
        if (!grouped[p.Plate]) grouped[p.Plate] = [];
        grouped[p.Plate].push(p);
      }
    } catch {
      // ignore prefixes without results
    }
  }

  for (const plate of Object.keys(grouped)) {
    grouped[plate].sort((a, b) => new Date(a.EventDate).getTime() - new Date(b.EventDate).getTime());
  }

  return grouped;
}

export async function getTelemetryTypes() {
  return request<TelemetryType[]>("/Tracking/Telemetry/List", {});
}

export async function getEventTypes() {
  return request<EventType[]>("/Tracking/Event/List", {});
}

export async function getMaintenanceList() {
  return request<MaintenanceRecord[]>("/Tracking/Report/Maintenance/List", {});
}

// ============ Telemetry IDs ============
// Key telemetry IDs from the API:
export const TELEMETRY_IDS = {
  ODOMETER: "15",           // Odômetro (km)
  SPEED: "17",              // Velocidade
  RPM: "35",                // RPM
  FUEL_TOTAL: "322",        // Total de combustível utilizado (litros)
  FUEL_LEVEL_PCT: "304",    // Percentual combustível
  FUEL_CONSUMPTION_KML: "336", // Consumo médio km/l
  FUEL_BETWEEN_POS: "159",  // Consumo entre posições
  FUEL_IDLE: "18000",       // Consumo em motor ocioso
  AVG_SPEED: "307",         // Velocidade média
  MAX_SPEED: "319",         // Velocidade máxima
  AVG_RPM: "308",           // RPM médio
  MAX_RPM: "309",           // RPM máximo
  ENGINE_TEMP: "167",       // Temperatura do motor
  OIL_TEMP: "166",          // Temperatura do óleo
  COOLANT_TEMP: "305",      // Temperatura líquido arrefecimento
  IDLE_TIME: "316",         // Tempo motor ocioso
  COAST_TIME: "317",        // Tempo em banguela
  HARSH_ACCEL: "312",       // Quantidade aceleração brusca
  HARSH_BRAKE: "313",       // Quantidade freada brusca
  ECO_SCORE: "521",         // Eco score
  HOURMETER: "16",          // Horímetro
  BATTERY_MAIN: "7",        // Nível bateria principal
  GEAR: "535",              // Marcha
  TORQUE: "321",            // Torque
  TRUCK_WEIGHT: "325",      // Peso do caminhão
  TOTAL_WEIGHT: "171",      // Peso total
};

// ============ Types ============

export interface PositionRecord {
  Plate: string;
  DriverIdentification: string | null;
  DocumentNumber: string | null;
  IdTrackedUnit: number;
  TrackedUnit: string;
  TrackedUnitIntegrationCode: string;
  IdEvent: number;
  Ignition: boolean;
  ValidGPS: boolean;
  EventDate: string;
  UpdateDate: string;
  Driver: string | null;
  Latitude: number;
  Longitude: number;
  Address: string | null;
  DistanceFromGeographicArea: string | null;
  ListTelemetry: Record<string, number>;
  ListTrailer: unknown[];
}

export interface TelemetryType {
  IdTelemetry: number;
  Name: string;
}

export interface EventType {
  IdEvent: number;
  Name: string;
}

export interface MaintenanceRecord {
  MaintenanceCode: number;
  VehicleId: number;
  TypeId: number;
  StatusId: number;
  Name: string;
  Observation: string | null;
  PlannedDate: string | null;
  PlannedHodometer: number | null;
  ExecutedDate: string | null;
  ExecutedHodometer: number | null;
  ExecutedItemPrice: number | null;
  ExecutedServicePrice: number | null;
  ExecutedServiceTime: number | null;
  VehicleIntegrationCode: string;
  VehicleClientIntegrationCode: string;
  TrackedUnit: string;
  VehicleOrganizationUnit: string;
  TrackedUnitGroup: string;
  VehicleModel: string;
  RegisterDate: string;
  Itens: MaintenanceItem[];
}

export interface MaintenanceItem {
  Code: string | null;
  Name: string | null;
  TypeId: number;
  Price: number | null;
  Quantity: number | null;
}
