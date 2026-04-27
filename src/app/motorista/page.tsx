export const dynamic = "force-dynamic";

import { queryAllDrivers, queryAllFreightsWithManifest, type DriverNode, type FreightManifestNode } from "@/lib/esl-api";
import { MotoristaClient } from "./client";

export default async function MotoristaPage() {
  let drivers: DriverNode[] = [];
  let freights: FreightManifestNode[] = [];

  try {
    const cacheOpts = { revalidate: 300, tags: ["freights"] };
    [drivers, freights] = await Promise.all([
      queryAllDrivers(20, cacheOpts).catch(() => []),
      queryAllFreightsWithManifest(50, cacheOpts).catch(() => []),
    ]);
  } catch (error) {
    console.error("Erro ao buscar dados:", error);
  }

  return <MotoristaClient drivers={drivers} freights={freights} />;
}
