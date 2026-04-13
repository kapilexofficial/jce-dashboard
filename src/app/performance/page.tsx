export const dynamic = "force-dynamic";

import { getUsers, queryFreightsWithUser, getInvoiceOccurrences, type UserRest, type FreightNode, type OccurrenceRest } from "@/lib/esl-api";
import { PerformanceClient } from "./client";

export default async function PerformancePage() {
  let users: UserRest[] = [];
  let freights: FreightNode[] = [];
  let occurrences: OccurrenceRest[] = [];

  try {
    [users, freights, occurrences] = await Promise.all([
      getUsers().catch(() => []),
      queryFreightsWithUser({}, 100).then((d) => d.freight.edges.map((e) => e.node)).catch(() => []),
      getInvoiceOccurrences().then((d) => d.data).catch(() => []),
    ]);
  } catch (error) {
    console.error("Erro ao buscar dados de performance:", error);
  }

  return <PerformanceClient users={users} freights={freights} occurrences={occurrences} />;
}
