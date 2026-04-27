export const dynamic = "force-dynamic";

import { getVehicles, queryAllFreightsForDre, getAllFreightMargins, type VehicleRest, type FreightDreNode, type FreightMargin } from "@/lib/esl-api";
import { DreClient } from "./client";

export default async function DrePage() {
  let vehicles: VehicleRest[] = [];
  let freights: FreightDreNode[] = [];
  let margins: FreightMargin[] = [];

  const today = new Date().toISOString().split("T")[0];
  const yearStart = `${new Date().getFullYear()}-01-01`;

  try {
    const cacheOpts = { revalidate: 300, tags: ["freights"] };
    [vehicles, freights, margins] = await Promise.all([
      getVehicles().catch(() => []),
      queryAllFreightsForDre({}, 30, cacheOpts).catch(() => []),
      getAllFreightMargins(yearStart, today, cacheOpts).catch(() => []),
    ]);
  } catch (error) {
    console.error("Erro ao buscar dados DRE:", error);
  }

  return <DreClient vehicles={vehicles} freights={freights} margins={margins} />;
}
