export const dynamic = "force-dynamic";

import { getAllFreightMargins, getInvoiceOccurrences, queryFreightsWithManifest, queryDrivers, getFleetServiceOrders, aggregateServiceOrders, type FreightMargin, type OccurrenceRest, type FreightManifestNode, type DriverNode, type ServiceOrderAggregated } from "@/lib/esl-api";
import { getTelemetryTypes, getEventTypes, type TelemetryType, type EventType } from "@/lib/elithium-api";
import { FechamentoClient } from "./client";

export default async function FechamentoPage() {
  let margins: FreightMargin[] = [];
  let occurrences: OccurrenceRest[] = [];
  let freights: FreightManifestNode[] = [];
  let drivers: DriverNode[] = [];
  let telemetryTypes: TelemetryType[] = [];
  let eventTypes: EventType[] = [];
  let serviceOrders: ServiceOrderAggregated[] = [];

  const today = new Date().toISOString().split("T")[0];
  // ESL Data Export limita o filtro de data a no máximo 12 meses.
  const osSinceDate = new Date();
  osSinceDate.setFullYear(osSinceDate.getFullYear() - 1);
  osSinceDate.setDate(osSinceDate.getDate() + 1);
  const osSince = osSinceDate.toISOString().split("T")[0];

  try {
    [margins, occurrences, freights, drivers, telemetryTypes, eventTypes, serviceOrders] = await Promise.all([
      getAllFreightMargins("2025-01-01", today).catch(() => []),
      getInvoiceOccurrences().then((d) => d.data).catch(() => []),
      queryFreightsWithManifest(100).then((d) => d.freight.edges.map((e) => e.node)).catch(() => []),
      queryDrivers(100).then((d) => d.individual.edges.map((e) => e.node)).catch(() => []),
      getTelemetryTypes().catch(() => []),
      getEventTypes().catch(() => []),
      getFleetServiceOrders(osSince, today)
        .then((rows) => {
          console.log(`[fechamento] OS raw rows: ${rows.length}`);
          const agg = aggregateServiceOrders(rows);
          console.log(`[fechamento] OS aggregated: ${agg.length}`);
          return agg;
        })
        .catch((err) => {
          console.error("[fechamento] getFleetServiceOrders error:", err);
          return [];
        }),
    ]);
  } catch (error) {
    console.error("Erro:", error);
  }

  return <FechamentoClient
    margins={margins}
    occurrences={occurrences}
    freights={freights}
    drivers={drivers}
    telemetryConnected={telemetryTypes.length > 0}
    eventCount={eventTypes.length}
    serviceOrders={serviceOrders}
  />;
}
