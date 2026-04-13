export const dynamic = "force-dynamic";

import { getFreightMargins, type FreightMargin } from "@/lib/esl-api";
import { FinanceiroClient } from "./client";

export default async function FinanceiroPage() {
  let margins: FreightMargin[] = [];
  try {
    const data = await getFreightMargins(
      "2026-01-01",
      new Date().toISOString().split("T")[0]
    );
    margins = data.data;
  } catch (error) {
    console.error("Erro ao buscar margens:", error);
  }

  return <FinanceiroClient margins={margins} />;
}
