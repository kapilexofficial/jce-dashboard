const BASE_URL = process.env.ESL_API_BASE_URL || "";
const TOKEN = process.env.ESL_API_TOKEN || "";
const DATA_EXPORT_TOKEN = process.env.ESL_DATA_EXPORT_TOKEN || TOKEN;
const GRAPHQL_URL = process.env.ESL_GRAPHQL_URL || `${BASE_URL}/graphql`;
const GRAPHQL_TOKEN = process.env.ESL_GRAPHQL_TOKEN || TOKEN;

async function request<T>(
  path: string,
  options?: RequestInit & {
    params?: Record<string, string>;
    cacheOpts?: { revalidate: number; tags: string[] };
  }
): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  if (options?.params) {
    Object.entries(options.params).forEach(([k, v]) =>
      url.searchParams.set(k, v)
    );
  }

  const { cacheOpts, params: _, ...rest } = options || {};
  void _;

  const res = await fetch(url.toString(), {
    ...rest,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...(cacheOpts
      ? { next: { revalidate: cacheOpts.revalidate, tags: cacheOpts.tags } }
      : { cache: "no-store" as RequestCache }),
  });

  if (!res.ok) {
    throw new Error(`ESL API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

async function graphql<T>(
  query: string,
  variables?: Record<string, unknown>,
  cacheOpts?: { revalidate: number; tags: string[] }
): Promise<T> {
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GRAPHQL_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
    ...(cacheOpts
      ? { next: { revalidate: cacheOpts.revalidate, tags: cacheOpts.tags } }
      : { cache: "no-store" as RequestCache }),
  });

  if (!res.ok) {
    throw new Error(`ESL GraphQL error: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  if (json.errors) {
    throw new Error(`GraphQL error: ${json.errors[0]?.message}`);
  }
  return json.data;
}

// ============ REST API Services ============

// --- Financeiro ---
export async function getCreditBillings(since: string) {
  return request<CreditBillingsResponse>("/api/accounting/credit/billings", {
    params: { since },
  });
}

export async function getDebitBillings(since: string) {
  return request<DebitBillingsResponse>("/api/accounting/debit/billings", {
    params: { since },
  });
}

// --- Frete Margins ---
export async function getFreightMargins(
  serviceAtStart: string,
  serviceAtEnd: string,
  start?: number,
  cacheOpts?: { revalidate: number; tags: string[] }
) {
  const params: Record<string, string> = {
    service_at_start: serviceAtStart,
    service_at_end: serviceAtEnd,
  };
  if (start) params.start = String(start);
  return request<FreightMarginsResponse>("/api/report/freight/margins", {
    params,
    cacheOpts,
  });
}

export async function getAllFreightMargins(
  serviceAtStart: string,
  serviceAtEnd: string,
  cacheOpts?: { revalidate: number; tags: string[] }
): Promise<FreightMargin[]> {
  const all: FreightMargin[] = [];
  let nextId: number | undefined;
  for (let i = 0; i < 100; i++) {
    const res = await getFreightMargins(serviceAtStart, serviceAtEnd, nextId, cacheOpts);
    all.push(...res.data);
    if (!res.paging.next_id || res.data.length === 0) break;
    nextId = res.paging.next_id;
  }
  return all;
}

// --- Usuários ---
export async function getUsers() {
  const all: UserRest[] = [];
  let nextId: number | undefined;
  for (let i = 0; i < 5; i++) {
    const params: Record<string, string> = {};
    if (nextId) params.start = String(nextId);
    const res = await request<{ data: UserRest[]; paging: Paging }>("/api/users/mains", { params });
    all.push(...res.data);
    if (!res.paging.next_id || res.data.length === 0) break;
    nextId = res.paging.next_id;
  }
  return all;
}

// --- Veículos ---
export async function getVehicles() {
  const all: VehicleRest[] = [];
  let nextId: number | undefined;
  for (let i = 0; i < 20; i++) {
    const params: Record<string, string> = {};
    if (nextId) params.start = String(nextId);
    const res = await request<{ data: VehicleRest[]; paging: Paging }>("/api/vehicles", { params });
    all.push(...res.data);
    if (!res.paging.next_id || res.data.length === 0) break;
    nextId = res.paging.next_id;
  }
  return all;
}

// --- Ocorrências ---
export async function getInvoiceOccurrences(params?: Record<string, string>) {
  return request<OccurrencesResponse>("/api/invoice_occurrences", { params });
}

export async function getAllInvoiceOccurrences(
  baseParams?: Record<string, string>,
  options?: { stopBefore?: string; maxPages?: number }
): Promise<OccurrenceRest[]> {
  const all: OccurrenceRest[] = [];
  let nextId: number | undefined;
  const maxPages = options?.maxPages ?? 200;
  for (let i = 0; i < maxPages; i++) {
    const params: Record<string, string> = { ...(baseParams || {}) };
    if (nextId) params.start = String(nextId);
    const res = await request<OccurrencesResponse>("/api/invoice_occurrences", { params });
    all.push(...res.data);
    if (!res.paging.next_id || res.data.length === 0) break;
    if (options?.stopBefore) {
      const last = res.data[res.data.length - 1];
      if (last && last.occurrence_at < options.stopBefore) break;
    }
    nextId = res.paging.next_id;
  }
  return all;
}

// --- Comprovante de Entrega ---
export async function getFreightDeliveryReceipts(cteKey: string) {
  return request<{ data: DeliveryReceipt[] }>("/api/freight_delivery_receipts", {
    params: { cte_key: cteKey },
  });
}

// --- Data Export / Relatórios ---
export async function getReportTemplates() {
  return request<ReportTemplate[]>("/api/analytics/reports");
}

export async function getReportInfo(templateId: number) {
  return request<ReportInfo>(`/api/analytics/reports/${templateId}/info`);
}

export async function getReportData(templateId: number) {
  return request<Record<string, unknown>[]>(
    `/api/analytics/reports/${templateId}/data`
  );
}

/**
 * Data Export template 6573 "Frota - OS".
 * Retorna ordens de serviço no período — uma linha por peça (agrupar por sequence_code).
 * Observação: o endpoint tem rate limit e o Node fetch não aceita body em GET,
 * então o filtro é enviado via querystring (Rails nested params).
 */
export async function getFleetServiceOrders(
  serviceAtStart: string,
  serviceAtEnd: string
): Promise<ServiceOrderRow[]> {
  // ESL/Rails rejeita espaço como `+`, exige `%20`. URLSearchParams usa `+`,
  // então montamos a query manualmente com encodeURIComponent.
  const dateRange = `${serviceAtStart} - ${serviceAtEnd}`;
  // Ordem importa: `per` antes de `search[]` — caso contrário a ESL ignora `per`
  // e aplica o default de ~20 linhas por página.
  const qs =
    `page=1&per=2000&search%5Bfleet_service_orders%5D%5Bservice_at%5D=` +
    encodeURIComponent(dateRange);
  const url = `${BASE_URL}/api/analytics/reports/6573/data?${qs}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${DATA_EXPORT_TOKEN}` },
    next: { revalidate: 300 },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ESL Data Export 6573: ${res.status} — ${body.slice(0, 200)}`);
  }
  return res.json();
}

export interface ServiceOrderRow {
  sequence_code: number;
  created_at: string;
  service_at: string;
  current_odometer: number | null;
  status: "pending" | "finished" | "delivered" | null;
  maintenance_type:
    | "preventive"
    | "corrective"
    | "preparation"
    | "damage"
    | "reform"
    | "help"
    | null;
  service_description: string | null;
  fvr_fos_labor_value: string | null;
  fvr_fes_p_t_name: string | null;
  fvr_fes_quantity: string | null;
  fvr_fes_unitary_value: string | null;
  fvr_vie_license_plate: string | null;
  fvr_vie_model: string | null;
  fvr_vie_ved_name: string | null;
  fvr_vie_vee_name: string | null;
  fvr_vie_vee_vcy_name: string | null;
}

export interface ServiceOrderAggregated {
  sequenceCode: number;
  serviceAt: string;
  createdAt: string;
  plate: string;
  model: string;
  brand: string;
  vehicleType: string;
  status: "pending" | "finished" | "delivered" | "unknown";
  type: "preventive" | "corrective" | "other";
  partsTotal: number;
  laborTotal: number;
  total: number;
  partsCount: number;
}

/** Agrupa as linhas do template 6573 por sequence_code. */
export function aggregateServiceOrders(
  rows: ServiceOrderRow[]
): ServiceOrderAggregated[] {
  const map = new Map<number, ServiceOrderAggregated>();
  for (const r of rows) {
    const code = r.sequence_code;
    if (!map.has(code)) {
      const rawType = r.maintenance_type;
      map.set(code, {
        sequenceCode: code,
        serviceAt: r.service_at,
        createdAt: r.created_at,
        plate: r.fvr_vie_license_plate ?? "",
        model: r.fvr_vie_model ?? "",
        brand: r.fvr_vie_ved_name ?? "",
        vehicleType: r.fvr_vie_vee_name ?? "",
        status: (r.status ?? "unknown") as ServiceOrderAggregated["status"],
        type:
          rawType === "preventive" || rawType === "corrective"
            ? rawType
            : "other",
        partsTotal: 0,
        laborTotal: 0,
        total: 0,
        partsCount: 0,
      });
    }
    const agg = map.get(code)!;
    const qty = parseFloat(r.fvr_fes_quantity ?? "0") || 0;
    const unit = parseFloat(r.fvr_fes_unitary_value ?? "0") || 0;
    if (r.fvr_fes_p_t_name) {
      agg.partsTotal += qty * unit;
      agg.partsCount += 1;
    }
  }
  // Labor é por OS (não por linha) — soma o labor_value distinto por sequence_code
  const laborByOs = new Map<number, Set<string>>();
  for (const r of rows) {
    if (r.fvr_fos_labor_value) {
      if (!laborByOs.has(r.sequence_code))
        laborByOs.set(r.sequence_code, new Set());
      laborByOs.get(r.sequence_code)!.add(r.fvr_fos_labor_value);
    }
  }
  for (const [code, vals] of laborByOs) {
    const agg = map.get(code);
    if (!agg) continue;
    for (const v of vals) agg.laborTotal += parseFloat(v) || 0;
  }
  for (const agg of map.values()) agg.total = agg.partsTotal + agg.laborTotal;
  return Array.from(map.values()).sort(
    (a, b) => b.sequenceCode - a.sequenceCode
  );
}

export async function exportReportXlsx(
  templateId: number,
  body: Record<string, unknown>
) {
  return request<{ message: string }>(`/api/analytics/reports/${templateId}/export`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// ============ GraphQL Services ============

export async function queryDrivers(first = 100) {
  return graphql<{ individual: { edges: { node: DriverNode }[] } }>(
    `query individual($params: IndividualInput!, $first: Int) {
      individual(params: $params, first: $first) {
        edges {
          node { id name cpf }
        }
      }
    }`,
    { params: { driver: { active: true } }, first }
  );
}

export async function queryAllDrivers(
  maxPages = 50,
  cacheOpts?: { revalidate: number; tags: string[] }
): Promise<DriverNode[]> {
  const all: DriverNode[] = [];
  let cursor: string | undefined;
  for (let i = 0; i < maxPages; i++) {
    const res = await graphql<{
      individual: {
        pageInfo?: GqlPageInfo;
        edges: {
          node: { id: string; name: string; cpf: string; driver: { id: string } | null };
        }[];
      };
    }>(
      `query individual($params: IndividualInput!, $first: Int, $after: String) {
        individual(params: $params, first: $first, after: $after) {
          pageInfo { hasNextPage endCursor }
          edges { node { id name cpf driver { id } } }
        }
      }`,
      { params: { driver: { active: true } }, first: 50, after: cursor },
      cacheOpts
    );
    res.individual.edges.forEach((e) => {
      const n = e.node;
      // Use Driver.id (matches manifest.mainDriverId), not Individual.id
      all.push({
        id: n.driver?.id || n.id,
        name: n.name,
        cpf: n.cpf,
      });
    });
    const info = res.individual.pageInfo;
    if (!info?.hasNextPage || !info.endCursor) break;
    cursor = info.endCursor;
  }
  return all;
}

export async function queryFreightsWithManifest(first = 100) {
  return graphql<{ freight: { edges: { node: FreightManifestNode }[] } }>(
    `query freight($params: FreightInput!, $first: Int) {
      freight(params: $params, first: $first) {
        edges {
          node {
            id sequenceCode total subtotal realWeight serviceAt status modal
            sender { name }
            recipient { name }
            originCity { name state { code } }
            destinationCity { name state { code } }
            cte { key number }
            lastManifest {
              id mainDriverId serviceDate status
              vehicle { id licensePlate model }
              totalCost freightSubtotal deliverySubtotal pickSubtotal
              fuelSubtotal tollSubtotal dailySubtotal
              expensesSubtotal advanceSubtotal discountsSubtotal
              km traveledKm
            }
          }
        }
      }
    }`,
    { params: {}, first }
  );
}

export async function queryAllFreightsWithManifest(
  maxPages = 50,
  cacheOpts?: { revalidate: number; tags: string[] }
): Promise<FreightManifestNode[]> {
  const all: FreightManifestNode[] = [];
  let cursor: string | undefined;
  for (let i = 0; i < maxPages; i++) {
    const res = await graphql<{
      freight: { pageInfo?: GqlPageInfo; edges: { node: FreightManifestNode }[] };
    }>(
      `query freight($params: FreightInput!, $first: Int, $after: String) {
        freight(params: $params, first: $first, after: $after) {
          pageInfo { hasNextPage endCursor }
          edges {
            node {
              id sequenceCode total subtotal realWeight serviceAt status modal
              sender { name }
              recipient { name }
              originCity { name state { code } }
              destinationCity { name state { code } }
              cte { key number }
              lastManifest {
                id mainDriverId serviceDate status
                departuredAt closedAt
                vehicle { id licensePlate model }
                totalCost freightSubtotal deliverySubtotal pickSubtotal
                fuelSubtotal tollSubtotal dailySubtotal
                expensesSubtotal advanceSubtotal discountsSubtotal
                km traveledKm
              }
            }
          }
        }
      }`,
      { params: {}, first: 50, after: cursor },
      cacheOpts
    );
    all.push(...res.freight.edges.map((e) => e.node));
    const info = res.freight.pageInfo;
    if (!info?.hasNextPage || !info.endCursor) break;
    cursor = info.endCursor;
  }
  return all;
}

export interface DriverNode {
  id: string;
  name: string;
  cpf: string;
}

export interface FreightManifestNode {
  id: number;
  sequenceCode: number;
  total: number;
  subtotal: number;
  realWeight: number;
  serviceAt: string;
  status: string;
  modal: string;
  sender: { name: string };
  recipient: { name: string };
  originCity: { name: string; state: { code: string } };
  destinationCity: { name: string; state: { code: string } };
  cte: { key: string | null; number: number | null } | null;
  lastManifest: {
    id: number;
    mainDriverId: number | null;
    serviceDate: string | null;
    status: string;
    departuredAt: string | null;
    closedAt: string | null;
    vehicle: { id: string; licensePlate: string; model: string };
    totalCost: number;
    freightSubtotal: number;
    deliverySubtotal: number;
    pickSubtotal: number;
    fuelSubtotal: number;
    tollSubtotal: number;
    dailySubtotal: number;
    expensesSubtotal: number;
    advanceSubtotal: number;
    discountsSubtotal: number;
    km: number;
    traveledKm: number;
  } | null;
}

export async function queryFreightsForDre(
  params: Record<string, unknown>,
  first = 50,
  after?: string,
  cacheOpts?: { revalidate: number; tags: string[] }
) {
  return graphql<{ freight: { pageInfo?: GqlPageInfo; edges: { node: FreightDreNode }[] } }>(
    `query freight($params: FreightInput!, $first: Int, $after: String) {
      freight(params: $params, first: $first, after: $after) {
        pageInfo { hasNextPage endCursor }
        edges {
          node {
            id serviceAt status type total subtotal realWeight
            sequenceCode modal userId
            sender { name }
            recipient { name }
            originCity { name state { code } }
            destinationCity { name state { code } }
            cte { key number }
            lastManifest {
              id
              vehicle { id licensePlate model }
              totalCost
              freightSubtotal
              deliverySubtotal
              pickSubtotal
              fuelSubtotal
              tollSubtotal
              dailySubtotal
              expensesSubtotal
              discountsSubtotal
              advanceSubtotal
              km
              status
            }
          }
        }
      }
    }`,
    { params, first, after },
    cacheOpts
  );
}

/** Paginated fetch of all freights with DRE/manifest data (ESL caps pages at ~20). */
export async function queryAllFreightsForDre(
  params: Record<string, unknown> = {},
  maxPages = 50,
  cacheOpts?: { revalidate: number; tags: string[] }
): Promise<FreightDreNode[]> {
  const all: FreightDreNode[] = [];
  let cursor: string | undefined;
  for (let i = 0; i < maxPages; i++) {
    const res = await queryFreightsForDre(params, 50, cursor, cacheOpts);
    all.push(...res.freight.edges.map((e) => e.node));
    const info = res.freight.pageInfo;
    if (!info?.hasNextPage || !info.endCursor) break;
    cursor = info.endCursor;
  }
  return all;
}

export async function queryFreightsWithUser(params: Record<string, unknown>, first = 100) {
  return graphql<{ freight: FreightConnection }>(
    `query freight($params: FreightInput!, $first: Int) {
      freight(params: $params, first: $first) {
        edges {
          node {
            id serviceAt status type total subtotal realWeight
            invoicesTotalVolumes sequenceCode modal userId
            deliveryPredictionDate
            sender { id name }
            recipient { id name }
            originCity { id name state { code } }
            destinationCity { id name state { code } }
            cte { key number }
          }
        }
      }
    }`,
    { params, first }
  );
}

export async function queryFreights(
  params: Record<string, unknown>,
  first = 50,
  after?: string,
  cacheOpts?: { revalidate: number; tags: string[] }
) {
  return graphql<{ freight: FreightConnection }>(
    `query freight($params: FreightInput!, $first: Int, $after: String) {
      freight(params: $params, first: $first, after: $after) {
        pageInfo { hasNextPage endCursor }
        edges {
          node {
            id
            serviceAt
            status
            type
            total
            subtotal
            realWeight
            invoicesTotalVolumes
            sequenceCode
            modal
            deliveryPredictionDate
            sender { id name }
            recipient { id name }
            originCity { id name state { code } }
            destinationCity { id name state { code } }
            cte { key number }
          }
        }
      }
    }`,
    { params, first, after },
    cacheOpts
  );
}

/**
 * Fetches all freights via cursor pagination. ESL caps each page at 20,
 * so we loop until hasNextPage is false or maxPages is reached.
 */
export interface FreightAnalysisNode extends Omit<FreightNode, "sender" | "recipient"> {
  finishedAt: string | null;
  draftEmissionAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  deliveryPredictionHour: string | null;
  sender: { id: string; name: string; nickname: string | null; cnpj: string | null };
  recipient: { id: string; name: string; nickname: string | null; cnpj: string | null };
}

export async function queryAllFreightsForAnalysis(
  maxPages = 50,
  cacheOpts?: { revalidate: number; tags: string[] }
): Promise<FreightAnalysisNode[]> {
  const all: FreightAnalysisNode[] = [];
  let cursor: string | undefined;
  for (let i = 0; i < maxPages; i++) {
    const res = await graphql<{ freight: GqlConnection<FreightAnalysisNode> }>(
      `query freight($first: Int, $after: String) {
        freight(params: {}, first: $first, after: $after) {
          pageInfo { hasNextPage endCursor }
          edges {
            node {
              id sequenceCode status type total subtotal realWeight modal
              serviceAt finishedAt draftEmissionAt createdAt updatedAt
              deliveryPredictionDate deliveryPredictionHour
              invoicesTotalVolumes
              sender { id name nickname cnpj }
              recipient { id name nickname cnpj }
              originCity { id name state { code } }
              destinationCity { id name state { code } }
              cte { key number }
            }
          }
        }
      }`,
      { first: 50, after: cursor },
      cacheOpts
    );
    all.push(...res.freight.edges.map((e) => e.node));
    const info = res.freight.pageInfo;
    if (!info?.hasNextPage || !info.endCursor) break;
    cursor = info.endCursor;
  }
  return all;
}

export async function queryAllFreights(
  params: Record<string, unknown> = {},
  maxPages = 50,
  cacheOpts?: { revalidate: number; tags: string[] }
): Promise<FreightNode[]> {
  const all: FreightNode[] = [];
  let cursor: string | undefined;
  for (let i = 0; i < maxPages; i++) {
    const res = await queryFreights(params, 50, cursor, cacheOpts);
    all.push(...res.freight.edges.map((e) => e.node));
    const info = res.freight.pageInfo;
    if (!info?.hasNextPage || !info.endCursor) break;
    cursor = info.endCursor;
  }
  return all;
}

export async function queryInvoices(params: Record<string, unknown>, first = 50) {
  return graphql<{ invoice: InvoiceConnection }>(
    `query invoice($params: InvoiceQueryInput, $first: Int) {
      invoice(params: $params, first: $first) {
        edges {
          node {
            id
            number
            status
            issuedAt
            productValue
            cubedWeight
            key
            series
          }
        }
      }
    }`,
    { params, first }
  );
}

export async function queryCreditBillings(params: Record<string, unknown>, first = 50) {
  return graphql<{ creditCustomerBilling: CreditBillingConnection }>(
    `query creditCustomerBilling($params: CreditCustomerBillingInput, $first: Int) {
      creditCustomerBilling(params: $params, first: $first) {
        edges {
          node {
            id
            type
            value
            valueToPay
            dueDate
            issueDate
            paid
            sequenceCode
            customer { person { name } }
          }
        }
      }
    }`,
    { params, first }
  );
}

// ============ Types ============

// --- REST Response Types ---
export interface CreditBillingsResponse {
  data: RestCreditBilling[];
  paging: Paging;
}

export interface DebitBillingsResponse {
  data: RestDebitBilling[];
  paging: Paging;
}

export interface FreightMarginsResponse {
  data: FreightMargin[];
  paging: Paging;
}

export interface OccurrencesResponse {
  data: OccurrenceRest[];
  paging: Paging;
}

export interface Paging {
  next_id: number | null;
  last_id: number | null;
  per: number;
  size: number;
  total?: number;
}

// --- REST Data Types ---
export interface RestCreditBilling {
  id: number;
  type: string;
  number: string;
  status: string;
  customer_name: string;
  total_value: number;
  due_date: string;
  issued_at: string;
}

export interface RestDebitBilling {
  id: number;
  type: string;
  number: string;
  status: string;
  provider_name: string;
  total_value: number;
  due_date: string;
  issued_at: string;
}

export interface FreightMargin {
  id: number;
  service_at: string;
  corporation: { id: number; nickname: string; cnpj: string };
  emission_type: string;
  cte_number: number;
  cte_key: string | null;
  draft_number: number;
  sender: { id: number; document: string; name: string };
  origin_city: { name: string; state: { code: string; name: string } };
  recipient: { id: number; document: string; name: string };
  destination_city: { name: string; state: { code: string; name: string } };
  real_weight: string;
  invoices_value: string;
  freight_total: string;
  outsourced_total: string;
  manifest_freight_costs: string;
  manifest_delivery_costs: string;
  manifest_pick_costs: string;
  manifest_reverse_pick_costs: string;
  manifest_transfer_costs: string;
  manifest_dispatch_draft_costs: string;
  manifest_consolidation_costs: string;
  agent_costs: string;
  agent_delivery_costs: string;
  agent_pick_costs: string;
  commission_costs: string;
  tax_total: string;
  insurance: string;
  total_expenses: string;
  margin_total: string;
  margin_percentual: string;
}

export interface OccurrenceRest {
  id: number;
  receiver: string | null;
  document_number: string | null;
  comments: string | null;
  occurrence_at: string;
  user_id: number;
  creator_user_id: number;
  created_at: string;
  updated_at: string;
  invoice: {
    id: number;
    key: string;
    series: string;
    number: string;
    type: string;
  };
  freight: {
    id: number;
    cte_number: number;
    cte_key: string;
    reference_number: string;
    draft_number: number;
    delivery_prediction_at: string;
    total: number;
    corporation: {
      document: string;
      name: string;
      address: { state: { code: string } };
    };
    sender: { document: string };
  };
  occurrence: {
    id: number;
    trigger: string;
    code: number;
    description: string;
  };
  manifest: unknown | null;
}

export interface DeliveryReceipt {
  id: number;
  image_url: string;
  receiver_name: string;
  received_at: string;
  document_number: string;
}

export interface ReportTemplate {
  id: number;
  name: string;
  description: string;
}

export interface ReportInfo {
  columns: { name: string; label: string; type: string }[];
}

// --- GraphQL Types ---
interface GqlPageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

interface GqlConnection<T> {
  edges: { node: T }[];
  pageInfo?: GqlPageInfo;
}

export type FreightConnection = GqlConnection<FreightNode>;
export type InvoiceConnection = GqlConnection<InvoiceNode>;
export type CreditBillingConnection = GqlConnection<CreditBillingNode>;

export interface FreightNode {
  id: number;
  serviceAt: string;
  status: string;
  type: string;
  total: number;
  subtotal: number;
  realWeight: number;
  invoicesTotalVolumes: number;
  sequenceCode: number;
  modal: string;
  deliveryPredictionDate: string | null;
  sender: { id: string; name: string };
  recipient: { id: string; name: string };
  originCity: { id: string; name: string; state: { code: string } };
  destinationCity: { id: string; name: string; state: { code: string } };
  cte: { key: string | null; number: number | null } | null;
  userId?: number;
}

export interface UserRest {
  id: number;
  name: string;
  email: string;
  type: string;
  active: boolean;
}

export interface VehicleRest {
  id: number;
  license_plate: string;
  model: string;
  fleet_number: string | null;
  status: string;
  fabrication_year?: number;
  model_year?: number;
  odometer?: number;
  weight_capacity?: number;
  chassis_number?: string;
}

export interface FreightDreNode {
  id: number;
  serviceAt: string;
  status: string;
  type: string;
  total: number;
  subtotal: number;
  realWeight: number;
  sequenceCode: number;
  modal: string;
  userId?: number;
  sender: { name: string };
  recipient: { name: string };
  originCity: { name: string; state: { code: string } };
  destinationCity: { name: string; state: { code: string } };
  cte: { key: string | null; number: number | null } | null;
  lastManifest: {
    id: number;
    vehicle: { id: string; licensePlate: string; model: string };
    totalCost: number;
    freightSubtotal: number;
    deliverySubtotal: number;
    pickSubtotal: number;
    fuelSubtotal: number;
    tollSubtotal: number;
    dailySubtotal: number;
    expensesSubtotal: number;
    discountsSubtotal: number;
    advanceSubtotal: number;
    km: number;
    status: string;
  } | null;
}

export interface InvoiceNode {
  id: string;
  number: string;
  status: string;
  issuedAt: string;
  productValue: number;
  cubedWeight: number;
  key: string;
  series: string;
}

export interface CreditBillingNode {
  id: number;
  type: string;
  value: number;
  valueToPay: number;
  dueDate: string;
  issueDate: string;
  paid: boolean;
  sequenceCode: number;
  customer: { person: { name: string } };
}
