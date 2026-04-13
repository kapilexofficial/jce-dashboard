export const dynamic = "force-dynamic";

import { getVehicles, queryAllFreightsForDre, getAllFreightMargins, type VehicleRest, type FreightDreNode, type FreightMargin } from "@/lib/esl-api";
import { DreClient } from "./client";

export default async function DrePage() {
  let vehicles: VehicleRest[] = [];
  let freights: FreightDreNode[] = [];
  let margins: FreightMargin[] = [];

  try {
    [vehicles, freights, margins] = await Promise.all([
      getVehicles().catch(() => []),
      queryAllFreightsForDre({}, 30).catch(() => []),
      getAllFreightMargins("2025-01-01", new Date().toISOString().split("T")[0]).catch(() => []),
    ]);
  } catch (error) {
    console.error("Erro ao buscar dados DRE:", error);
  }

  return <DreClient vehicles={vehicles} freights={freights} margins={margins} />;
}
