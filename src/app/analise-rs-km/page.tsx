export const dynamic = "force-dynamic";

import { queryAllFreightsForDre, type FreightDreNode } from "@/lib/esl-api";
import { supabaseAdmin } from "@/lib/supabase";
import { AnaliseRsKmClient, type PlateMonthly, type PlateDaily } from "./client";

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

async function fetchKmDaily(yyyymm: string): Promise<{ placa: string; dia: string; km_rodado: number }[]> {
  try {
    const sb = supabaseAdmin();
    const { gte, lte } = monthBounds(yyyymm);
    const { data } = await sb
      .from("tc_km_daily")
      .select("placa, dia, km_rodado")
      .gte("dia", gte)
      .lte("dia", lte);
    return (data || [])
      .filter((r: { placa: string | null }) => r.placa)
      .map((r: { placa: string | null; dia: string; km_rodado: number | string }) => ({
        placa: r.placa!,
        dia: r.dia,
        km_rodado: Number(r.km_rodado || 0),
      }));
  } catch {
    return [];
  }
}

function aggregate(
  freights: FreightDreNode[],
  kmDailyByPlate: Map<string, Map<string, number>>
): PlateMonthly[] {
  // faturamento por (placa, dia)
  const revenueByPlateDay = new Map<string, Map<string, number>>();
  for (const f of freights) {
    if (!FINISHED.has(f.status)) continue;
    const placa = f.lastManifest?.vehicle?.licensePlate;
    if (!placa) continue;
    const dia = f.serviceAt.split("T")[0];
    if (!revenueByPlateDay.has(placa)) revenueByPlateDay.set(placa, new Map());
    const dayMap = revenueByPlateDay.get(placa)!;
    dayMap.set(dia, (dayMap.get(dia) || 0) + (f.total || 0));
  }

  const allPlates = new Set<string>();
  revenueByPlateDay.forEach((_, p) => allPlates.add(p));
  kmDailyByPlate.forEach((_, p) => allPlates.add(p));

  const rows: PlateMonthly[] = [];
  for (const placa of allPlates) {
    const kmDays = kmDailyByPlate.get(placa) || new Map();
    const revDays = revenueByPlateDay.get(placa) || new Map();
    const allDays = new Set<string>([...kmDays.keys(), ...revDays.keys()]);

    const daily: PlateDaily[] = [];
    let totalKm = 0;
    let totalRev = 0;
    for (const dia of allDays) {
      const km = kmDays.get(dia) || 0;
      const rev = revDays.get(dia) || 0;
      totalKm += km;
      totalRev += rev;
      daily.push({
        dia,
        km,
        faturamento: rev,
        rsPorKm: km > 0 ? rev / km : 0,
      });
    }
    daily.sort((a, b) => a.dia.localeCompare(b.dia));

    rows.push({
      placa,
      kmMes: totalKm,
      faturamentoMes: totalRev,
      rsPorKmMes: totalKm > 0 ? totalRev / totalKm : 0,
      diasComDado: daily.filter((d) => d.km > 0 || d.faturamento > 0).length,
      daily,
    });
  }

  // Ordenar por R$/km DESC (placas mais lucrativas no topo)
  rows.sort((a, b) => b.rsPorKmMes - a.rsPorKmMes);
  return rows;
}

interface PageProps {
  searchParams: Promise<{ mes?: string }>;
}

export default async function AnaliseRsKmPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const mes = params.mes || defaultMonth();
  const { gte, lte } = monthBounds(mes);

  // ESL GraphQL não aceita serviceAt: { gte, lte } como param do FreightInput —
  // o filtro silenciosamente é ignorado e a query retorna fretes recentes.
  // Padrão do projeto: buscar fretes e filtrar in-memory pela data.
  const [allFreights, kmDailyRows] = await Promise.all([
    queryAllFreightsForDre({}, 30, { revalidate: 86400, tags: ["freights"] })
      .catch(() => [] as FreightDreNode[]),
    fetchKmDaily(mes),
  ]);

  const freights = allFreights.filter((f) => {
    const date = f.serviceAt.split("T")[0];
    return date >= gte && date <= lte;
  });

  // Group km daily by placa
  const kmDailyByPlate = new Map<string, Map<string, number>>();
  for (const r of kmDailyRows) {
    if (!kmDailyByPlate.has(r.placa)) kmDailyByPlate.set(r.placa, new Map());
    kmDailyByPlate.get(r.placa)!.set(r.dia, r.km_rodado);
  }

  const rows = aggregate(freights, kmDailyByPlate);

  const monthsAvailable: string[] = [];
  const today = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    monthsAvailable.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  return (
    <AnaliseRsKmClient
      rows={rows}
      mes={mes}
      monthsAvailable={monthsAvailable}
      hasTcData={kmDailyByPlate.size > 0}
    />
  );
}
