export const dynamic = "force-dynamic";

import { queryAllFreightsForAnalysis, type FreightAnalysisNode } from "@/lib/esl-api";
import { AnaliseFretesClient } from "./client";

export default async function AnaliseFretesPage() {
  let freights: FreightAnalysisNode[] = [];
  try {
    freights = await queryAllFreightsForAnalysis(50, {
      revalidate: 300,
      tags: ["freights"],
    });
  } catch (error) {
    console.error("Erro ao buscar fretes para análise:", error);
  }

  return <AnaliseFretesClient freights={freights} />;
}
