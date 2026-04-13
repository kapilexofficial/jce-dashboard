import { getFreightMargins } from "@/lib/esl-api";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const start = request.nextUrl.searchParams.get("start") || "2026-01-01";
    const end = request.nextUrl.searchParams.get("end") || new Date().toISOString().split("T")[0];
    const data = await getFreightMargins(start, end);
    return Response.json(data);
  } catch (error) {
    console.error("Erro ao buscar margens:", error);
    return Response.json(
      { error: "Erro ao buscar margens", data: [] },
      { status: 500 }
    );
  }
}
