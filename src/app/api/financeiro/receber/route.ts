import { getCreditBillings } from "@/lib/esl-api";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const since =
      request.nextUrl.searchParams.get("since") ||
      new Date(Date.now() - 90 * 86400000).toISOString();
    const data = await getCreditBillings(since);
    return Response.json(data);
  } catch (error) {
    console.error("Erro ao buscar faturas a receber:", error);
    return Response.json(
      { error: "Erro ao buscar faturas a receber", data: [] },
      { status: 500 }
    );
  }
}
