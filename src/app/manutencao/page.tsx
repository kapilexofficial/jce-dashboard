export const dynamic = "force-dynamic";

import {
  getFleetServiceOrders,
  aggregateServiceOrders,
  type ServiceOrderAggregated,
  type ServiceOrderRow,
} from "@/lib/esl-api";
import { ManutencaoClient } from "./client";

export default async function ManutencaoPage() {
  // ESL Data Export limita a 12 meses — pegamos os últimos ~365 dias.
  const today = new Date();
  const since = new Date();
  since.setFullYear(since.getFullYear() - 1);
  since.setDate(since.getDate() + 1);
  const sinceStr = since.toISOString().split("T")[0];
  const todayStr = today.toISOString().split("T")[0];

  let rows: ServiceOrderRow[] = [];
  let orders: ServiceOrderAggregated[] = [];

  try {
    rows = await getFleetServiceOrders(sinceStr, todayStr);
    orders = aggregateServiceOrders(rows);
  } catch (err) {
    console.error("[manutencao] getFleetServiceOrders error:", err);
  }

  return <ManutencaoClient rows={rows} orders={orders} />;
}
