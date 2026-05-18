export const dynamic = "force-dynamic";

import { queryAllFreightsForDre, getVehicles, type FreightDreNode, type VehicleRest } from "@/lib/esl-api";
import { getAllFleetPositionsGrouped, TELEMETRY_IDS, type PositionRecord } from "@/lib/elithium-api";
import { supabaseAdmin } from "@/lib/supabase";
import { AnaliseVeiculoClient, type VehicleRow } from "./client";

function defaultMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthBounds(yyyymm: string): { gte: string; lte: string; monthStart: string } {
  const [y, m] = yyyymm.split("-").map(Number);
  const monthStart = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const gte = monthStart;
  const lte = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { gte, lte, monthStart };
}

const FINISHED = new Set(["done", "finished"]);

const PEN_HARSH = 2;
const PEN_IDLE_PER_H = 3;
const PEN_COAST_PER_H = 1;
const PEN_OVER_SPEED = 5;
const PEN_OVER_RPM = 5;
const SPEED_LIMIT = 90;
const RPM_LIMIT = 2200;

function computeElithiumScores(positions: PositionRecord[]) {
  if (positions.length === 0) return { ecoScore: 0, notaTelem: 0, litros: 0 };
  const first = positions[0];
  const last = positions[positions.length - 1];
  const tel = (p: PositionRecord, k: string) => Number(p.ListTelemetry?.[k] || 0);

  const fuelTotalFirst = tel(first, TELEMETRY_IDS.FUEL_TOTAL);
  const fuelTotalLast = tel(last, TELEMETRY_IDS.FUEL_TOTAL);
  const odmFirst = tel(first, TELEMETRY_IDS.ODOMETER);
  const odmLast = tel(last, TELEMETRY_IDS.ODOMETER);
  const harshBrakeDelta = Math.max(0, tel(last, TELEMETRY_IDS.HARSH_BRAKE) - tel(first, TELEMETRY_IDS.HARSH_BRAKE));
  const harshAccelDelta = Math.max(0, tel(last, TELEMETRY_IDS.HARSH_ACCEL) - tel(first, TELEMETRY_IDS.HARSH_ACCEL));
  const idleDelta = Math.max(0, tel(last, TELEMETRY_IDS.IDLE_TIME) - tel(first, TELEMETRY_IDS.IDLE_TIME));
  const coastDelta = Math.max(0, tel(last, TELEMETRY_IDS.COAST_TIME) - tel(first, TELEMETRY_IDS.COAST_TIME));
  const maxSpeed = positions.reduce((m, p) => Math.max(m, tel(p, TELEMETRY_IDS.MAX_SPEED)), 0);
  const maxRpm = positions.reduce((m, p) => Math.max(m, tel(p, TELEMETRY_IDS.MAX_RPM)), 0);

  const kmElithium = Math.max(0, odmLast - odmFirst);
  const ecoScore = tel(last, TELEMETRY_IDS.ECO_SCORE);
  const litros = Math.max(0, fuelTotalLast - fuelTotalFirst);

  let penalty = 0;
  if (kmElithium > 0) {
    const per100 = 100 / kmElithium;
    penalty += harshBrakeDelta * PEN_HARSH * per100;
    penalty += harshAccelDelta * PEN_HARSH * per100;
  }
  penalty += (idleDelta / 3600) * PEN_IDLE_PER_H;
  penalty += (coastDelta / 3600) * PEN_COAST_PER_H;
  if (maxSpeed > SPEED_LIMIT) penalty += PEN_OVER_SPEED;
  if (maxRpm > RPM_LIMIT) penalty += PEN_OVER_RPM;

  return {
    ecoScore: ecoScore > 0 ? ecoScore : 0,
    notaTelem: kmElithium > 0 ? Math.max(0, Math.min(100, 100 - penalty)) : 0,
    litros,
  };
}

function manifestCosts(m: FreightDreNode["lastManifest"]): number {
  if (!m) return 0;
  return (
    (m.freightSubtotal || 0) +
    (m.deliverySubtotal || 0) +
    (m.pickSubtotal || 0) +
    (m.fuelSubtotal || 0) +
    (m.tollSubtotal || 0) +
    (m.dailySubtotal || 0) +
    (m.expensesSubtotal || 0)
  );
}

async function fetchTcKm(monthStart: string): Promise<Map<string, number>> {
  try {
    const sb = supabaseAdmin();
    const { data } = await sb
      .from("tc_km_monthly")
      .select("placa, km_rodado")
      .eq("mes", monthStart);
    const map = new Map<string, number>();
    (data || []).forEach((r: { placa: string | null; km_rodado: number | string }) => {
      if (r.placa) map.set(r.placa, Number(r.km_rodado || 0));
    });
    return map;
  } catch {
    return new Map();
  }
}

function aggregate(
  vehicles: VehicleRest[],
  freights: FreightDreNode[],
  positionsByPlate: Record<string, PositionRecord[]>,
  kmByPlate: Map<string, number>
): VehicleRow[] {
  // Map de fretes por placa
  const freightsByPlate = new Map<string, FreightDreNode[]>();
  for (const f of freights) {
    const plate = f.lastManifest?.vehicle?.licensePlate;
    if (!plate) continue;
    if (!FINISHED.has(f.status)) continue;
    if (!freightsByPlate.has(plate)) freightsByPlate.set(plate, []);
    freightsByPlate.get(plate)!.push(f);
  }

  // Veículos do ESL + qualquer placa adicional que apareça nos fretes
  const plates = new Set<string>();
  vehicles.forEach((v) => v.license_plate && plates.add(v.license_plate));
  freightsByPlate.forEach((_, p) => plates.add(p));

  const modelByPlate = new Map<string, string>();
  vehicles.forEach((v) => v.license_plate && modelByPlate.set(v.license_plate, v.model || ""));

  const rows: VehicleRow[] = [];
  for (const placa of plates) {
    const freightList = freightsByPlate.get(placa) || [];
    const positions = positionsByPlate[placa] || [];
    const scores = computeElithiumScores(positions);
    const kmTc = kmByPlate.get(placa) || 0;
    const faturamento = freightList.reduce((s, f) => s + (f.total || 0), 0);
    const despesas = freightList.reduce((s, f) => s + manifestCosts(f.lastManifest), 0);
    const kmL = scores.litros > 0 ? kmTc / scores.litros : 0;

    // Skip placas totalmente sem dados (sem fretes, sem km, sem positions)
    if (freightList.length === 0 && kmTc === 0 && positions.length === 0) continue;

    rows.push({
      placa,
      modelo: modelByPlate.get(placa) || "",
      viagens: freightList.length,
      ecoScore: Math.round(scores.ecoScore),
      notaTelem: Math.round(scores.notaTelem),
      kmRodado: kmTc,
      faturamento,
      kmL,
      despesas,
    });
  }

  return rows.sort((a, b) => b.faturamento - a.faturamento);
}

interface PageProps {
  searchParams: Promise<{ mes?: string }>;
}

export default async function AnaliseVeiculoPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const mes = params.mes || defaultMonth();
  const { gte, lte, monthStart } = monthBounds(mes);

  const [freights, vehicles, positionsByPlate, kmByPlate] = await Promise.all([
    queryAllFreightsForDre(
      { serviceAt: { gte, lte } },
      50,
      { revalidate: 300, tags: ["freights"] }
    ).catch(() => [] as FreightDreNode[]),
    getVehicles().catch(() => [] as VehicleRest[]),
    getAllFleetPositionsGrouped().catch(() => ({} as Record<string, PositionRecord[]>)),
    fetchTcKm(monthStart),
  ]);

  const rows = aggregate(vehicles, freights, positionsByPlate, kmByPlate);

  // Lista de meses pro filter (últimos 12 + atual)
  const monthsAvailable: string[] = [];
  const today = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    monthsAvailable.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  return (
    <AnaliseVeiculoClient
      rows={rows}
      mes={mes}
      monthsAvailable={monthsAvailable}
      hasTcData={kmByPlate.size > 0}
    />
  );
}
