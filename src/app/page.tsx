export const dynamic = "force-dynamic";

import { queryAllFreights, getAllInvoiceOccurrences, getAllFreightMargins, type FreightMargin, type FreightNode, type OccurrenceRest } from "@/lib/esl-api";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  let freights: FreightNode[] = [];
  let occurrences: OccurrenceRest[] = [];
  let margins: FreightMargin[] = [];

  const today = new Date().toISOString().split("T")[0];
  const yearStart = `${new Date().getFullYear()}-01-01`;

  try {
    const [freightsData, occurrencesData, marginsData] = await Promise.all([
      queryAllFreights({}, 30).catch(() => [] as FreightNode[]),
      getAllInvoiceOccurrences(undefined, { stopBefore: yearStart }).catch(() => [] as OccurrenceRest[]),
      getAllFreightMargins(yearStart, today).catch(() => []),
    ]);
    freights = freightsData;
    occurrences = occurrencesData;
    margins = marginsData;
  } catch (error) {
    console.error("Erro ao buscar dados:", error);
  }

  return <DashboardClient freights={freights} occurrences={occurrences} margins={margins} />;
}
