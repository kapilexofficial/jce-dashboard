export const dynamic = "force-dynamic";

import { getAllFreightMargins, type FreightMargin } from "@/lib/esl-api";
import { FaturamentoClient } from "./client";

export default async function FaturamentoPage() {
  let margins: FreightMargin[] = [];
  try {
    margins = await getAllFreightMargins(
      "2025-01-01",
      new Date().toISOString().split("T")[0]
    );
  } catch (error) {
    console.error("Erro ao buscar margens:", error);
  }

  return <FaturamentoClient margins={margins} />;
}
