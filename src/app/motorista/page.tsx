export const dynamic = "force-dynamic";

import { queryDrivers, queryFreightsWithManifest, type DriverNode, type FreightManifestNode } from "@/lib/esl-api";
import { MotoristaClient } from "./client";

export default async function MotoristaPage() {
  let drivers: DriverNode[] = [];
  let freights: FreightManifestNode[] = [];

  try {
    [drivers, freights] = await Promise.all([
      queryDrivers(100).then((d) => d.individual.edges.map((e) => e.node)).catch(() => []),
      queryFreightsWithManifest(100).then((d) => d.freight.edges.map((e) => e.node)).catch(() => []),
    ]);
  } catch (error) {
    console.error("Erro ao buscar dados:", error);
  }

  return <MotoristaClient drivers={drivers} freights={freights} />;
}
