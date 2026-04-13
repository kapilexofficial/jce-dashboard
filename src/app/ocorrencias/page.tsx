export const dynamic = "force-dynamic";

import { getInvoiceOccurrences, type OccurrenceRest } from "@/lib/esl-api";
import { OcorrenciasClient } from "./client";

export default async function OcorrenciasPage() {
  let occurrences: OccurrenceRest[] = [];
  try {
    const data = await getInvoiceOccurrences();
    occurrences = data.data;
  } catch (error) {
    console.error("Erro ao buscar ocorrências:", error);
  }

  return <OcorrenciasClient occurrences={occurrences} />;
}
