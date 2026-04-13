export const dynamic = "force-dynamic";

import { queryAllFreights, getInvoiceOccurrences, getAllFreightMargins, type FreightMargin, type FreightNode, type OccurrenceRest } from "@/lib/esl-api";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  let freights: FreightNode[] = [];
  let occurrences: OccurrenceRest[] = [];
  let margins: FreightMargin[] = [];

  try {
    const [freightsData, occurrencesData, marginsData] = await Promise.all([
      queryAllFreights({}, 30).catch(() => [] as FreightNode[]),
      getInvoiceOccurrences().catch(() => ({ data: [] as OccurrenceRest[], paging: { size: 0 } })),
      getAllFreightMargins("2025-01-01", new Date().toISOString().split("T")[0]).catch(() => []),
    ]);
    freights = freightsData;
    occurrences = occurrencesData.data;
    margins = marginsData;
  } catch (error) {
    console.error("Erro ao buscar dados:", error);
  }

  return <DashboardClient freights={freights} occurrences={occurrences} margins={margins} />;
}
