export const dynamic = "force-dynamic";

import { queryAllFreights, type FreightNode } from "@/lib/esl-api";
import { FretesClient } from "./client";

export default async function FretesPage() {
  let freights: FreightNode[] = [];
  try {
    freights = await queryAllFreights({}, 50, { revalidate: 300, tags: ["freights"] });
  } catch (error) {
    console.error("Erro ao buscar fretes:", error);
  }

  return <FretesClient freights={freights} />;
}
