import { getReportTemplates } from "@/lib/esl-api";

export async function GET() {
  try {
    const data = await getReportTemplates();
    return Response.json({ data });
  } catch (error) {
    console.error("Erro ao buscar templates:", error);
    return Response.json(
      { error: "Erro ao buscar templates", data: [] },
      { status: 500 }
    );
  }
}
