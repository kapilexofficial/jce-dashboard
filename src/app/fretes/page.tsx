export const dynamic = "force-dynamic";

import { queryFreights, type FreightNode } from "@/lib/esl-api";
import { FretesClient } from "./client";

export default async function FretesPage() {
  let freights: FreightNode[] = [];
  try {
    const data = await queryFreights({}, 50);
    freights = data.freight.edges.map((e) => e.node);
  } catch (error) {
    console.error("Erro ao buscar fretes:", error);
  }

  return <FretesClient freights={freights} />;
}
