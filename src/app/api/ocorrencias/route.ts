import { getInvoiceOccurrences } from "@/lib/esl-api";

export async function GET() {
  try {
    const data = await getInvoiceOccurrences();
    return Response.json(data);
  } catch (error) {
    console.error("Erro ao buscar ocorrências:", error);
    return Response.json(
      { error: "Erro ao buscar ocorrências", data: [] },
      { status: 500 }
    );
  }
}
