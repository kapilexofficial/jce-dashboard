export const dynamic = "force-dynamic";

import { getVehicles, queryAllFreightsForDre, getAllFreightMargins, type VehicleRest, type FreightDreNode, type FreightMargin } from "@/lib/esl-api";
import { supabaseAdmin } from "@/lib/supabase";
import { DreClient, type TcKmEntry } from "./client";

async function fetchTcKmDaily(gte: string, lte: string): Promise<TcKmEntry[]> {
  try {
    const sb = supabaseAdmin();
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
        km: Number(r.km_rodado || 0),
      }));
  } catch {
    return [];
  }
}

export default async function DrePage() {
  let vehicles: VehicleRest[] = [];
  let freights: FreightDreNode[] = [];
  let margins: FreightMargin[] = [];
  let tcKm: TcKmEntry[] = [];

  const today = new Date().toISOString().split("T")[0];
  const yearStart = `${new Date().getFullYear()}-01-01`;

  try {
    const cacheOpts = { revalidate: 300, tags: ["freights"] };
    [vehicles, freights, margins, tcKm] = await Promise.all([
      getVehicles().catch(() => []),
      queryAllFreightsForDre({}, 30, cacheOpts).catch(() => []),
      getAllFreightMargins(yearStart, today, cacheOpts).catch(() => []),
      fetchTcKmDaily(yearStart, today),
    ]);
  } catch (error) {
    console.error("Erro ao buscar dados DRE:", error);
  }

  return <DreClient vehicles={vehicles} freights={freights} margins={margins} tcKm={tcKm} />;
}
