import { getReportData, exportReportXlsx } from "@/lib/esl-api";
import { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await getReportData(Number(id));
    return Response.json(data);
  } catch (error) {
    return Response.json(
      { error: "Erro ao executar relatório" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = await exportReportXlsx(Number(id), body);
    return Response.json(data);
  } catch (error) {
    return Response.json(
      { error: "Erro ao exportar relatório" },
      { status: 500 }
    );
  }
}
