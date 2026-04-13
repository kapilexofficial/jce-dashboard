import { queryFreights } from "@/lib/esl-api";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const params: Record<string, unknown> = {};
    const data = await queryFreights(params, 50);
    const freights = data.freight.edges.map((e) => e.node);
    return Response.json({ data: freights });
  } catch (error) {
    console.error("Erro ao buscar fretes:", error);
    return Response.json(
      { error: "Erro ao buscar fretes", data: [] },
      { status: 500 }
    );
  }
}
