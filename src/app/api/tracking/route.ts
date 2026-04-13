import { getFreightDeliveryReceipts, getInvoiceOccurrences } from "@/lib/esl-api";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get("q");
    if (!query) {
      return Response.json(
        { error: "Parâmetro 'q' é obrigatório" },
        { status: 400 }
      );
    }

    const [receipts, occurrences] = await Promise.all([
      getFreightDeliveryReceipts(query).catch(() => ({ data: [] })),
      getInvoiceOccurrences({ cte_key: query }).catch(() => ({ data: [] })),
    ]);

    return Response.json({
      receipts: receipts.data,
      occurrences: occurrences.data,
    });
  } catch (error) {
    console.error("Erro ao buscar tracking:", error);
    return Response.json(
      { error: "Erro ao buscar tracking" },
      { status: 500 }
    );
  }
}
