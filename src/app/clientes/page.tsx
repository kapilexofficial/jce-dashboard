export const dynamic = "force-dynamic";

import { getAllFreightMargins, queryFreights, type FreightMargin, type FreightNode } from "@/lib/esl-api";
import { ClientesClient } from "./client";

export default async function ClientesPage() {
  let margins: FreightMargin[] = [];
  let freights: FreightNode[] = [];

  try {
    [margins, freights] = await Promise.all([
      getAllFreightMargins("2025-01-01", new Date().toISOString().split("T")[0]).catch(() => []),
      queryFreights({}, 100).then((d) => d.freight.edges.map((e) => e.node)).catch(() => []),
    ]);
  } catch (error) {
    console.error("Erro ao buscar dados:", error);
  }

  return <ClientesClient margins={margins} freights={freights} />;
}
