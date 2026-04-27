"use client";

import { useMemo, useState } from "react";
import {
  Clock,
  Target,
  FileClock,
  AlertOctagon,
  CheckCircle2,
  TrendingDown,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  LabelList,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DateFilter } from "@/components/date-filter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { FreightAnalysisNode } from "@/lib/esl-api";

const HOUR = 1000 * 60 * 60;
const DAY = HOUR * 24;

function diffH(start?: string | null, end?: string | null) {
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (!isFinite(ms)) return null;
  return ms / HOUR;
}

function fmtH(hours: number | null) {
  if (hours === null) return "—";
  if (hours < 1) return `${(hours * 60).toFixed(0)}min`;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

function fmtCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function fmtDateTime(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_LABELS: Record<string, string> = {
  finished: "Finalizado",
  done: "Finalizado",
  in_transit: "Em Trânsito",
  manifested: "Manifestado",
  pending: "Pendente",
  cancelled: "Cancelado",
  draft: "Rascunho",
};

const STATUS_DOT: Record<string, string> = {
  finished: "bg-emerald-400",
  done: "bg-emerald-400",
  in_transit: "bg-blue-400",
  manifested: "bg-amber-400",
  pending: "bg-muted-foreground",
};

const STATUS_BADGE: Record<string, string> = {
  finished: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  done: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  in_transit: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  manifested: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  pending: "bg-muted text-muted-foreground border-border",
};

interface Props {
  freights: FreightAnalysisNode[];
}

export function AnaliseFretesClient({ freights }: Props) {
  const today = new Date().toISOString().split("T")[0];
  const yearStart = `${new Date().getFullYear()}-01-01`;

  const [dateStart, setDateStart] = useState(yearStart);
  const [dateEnd, setDateEnd] = useState(today);
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(
    () =>
      freights.filter((f) => {
        const d = f.serviceAt?.split("T")[0] || "";
        if (d < dateStart || d > dateEnd) return false;
        if (statusFilter === "all") return true;
        if (statusFilter === "finished")
          return f.status === "finished" || f.status === "done";
        return f.status === statusFilter;
      }),
    [freights, dateStart, dateEnd, statusFilter]
  );

  // Kpis
  const finishedFreights = filtered.filter(
    (f) => (f.status === "finished" || f.status === "done") && f.finishedAt
  );

  const travelTimes = finishedFreights
    .map((f) => diffH(f.serviceAt, f.finishedAt))
    .filter((h): h is number => h !== null && h >= 0);

  const avgTravel =
    travelTimes.length > 0
      ? travelTimes.reduce((a, b) => a + b, 0) / travelTimes.length
      : null;

  const onTimeFreights = finishedFreights.filter((f) => {
    if (!f.deliveryPredictionDate || !f.finishedAt) return false;
    const predDate = new Date(
      `${f.deliveryPredictionDate}T${f.deliveryPredictionHour || "23:59:59"}`
    );
    return new Date(f.finishedAt) <= predDate;
  });

  const otdRate =
    finishedFreights.filter((f) => f.deliveryPredictionDate).length > 0
      ? (onTimeFreights.length /
          finishedFreights.filter((f) => f.deliveryPredictionDate).length) *
        100
      : null;

  const lateTimes = finishedFreights
    .map((f) => {
      if (!f.deliveryPredictionDate || !f.finishedAt) return null;
      const predDate = new Date(
        `${f.deliveryPredictionDate}T${f.deliveryPredictionHour || "23:59:59"}`
      );
      const diff =
        (new Date(f.finishedAt).getTime() - predDate.getTime()) / HOUR;
      return diff > 0 ? diff : null;
    })
    .filter((h): h is number => h !== null);

  const avgLate =
    lateTimes.length > 0
      ? lateTimes.reduce((a, b) => a + b, 0) / lateTimes.length
      : null;

  const adminLeadTimes = filtered
    .map((f) => diffH(f.createdAt, f.serviceAt))
    .filter((h): h is number => h !== null && h >= 0);

  const avgAdminLead =
    adminLeadTimes.length > 0
      ? adminLeadTimes.reduce((a, b) => a + b, 0) / adminLeadTimes.length
      : null;

  // Histograma duração (horas)
  const histogramBuckets = [
    { label: "<8h", min: 0, max: 8, count: 0, pct: "" },
    { label: "8-24h", min: 8, max: 24, count: 0, pct: "" },
    { label: "1-3 dias", min: 24, max: 72, count: 0, pct: "" },
    { label: "3-7 dias", min: 72, max: 168, count: 0, pct: "" },
    { label: ">7 dias", min: 168, max: Infinity, count: 0, pct: "" },
  ];
  travelTimes.forEach((h) => {
    const b = histogramBuckets.find((b) => h >= b.min && h < b.max);
    if (b) b.count++;
  });
  const histTotal = histogramBuckets.reduce((s, b) => s + b.count, 0);
  histogramBuckets.forEach((b) => {
    b.pct = histTotal > 0 ? `${((b.count / histTotal) * 100).toFixed(1)}%` : "";
  });

  // OTD por grupo de cliente (raiz CNPJ = 8 primeiros dígitos)
  type ClientOtd = {
    key: string;
    name: string;
    cnpjsCount: number;
    nicknames: Set<string>;
    total: number;
    withPred: number;
    onTime: number;
    late: number;
    lateHoursSum: number;
    revenue: number;
  };
  const cnpjsByKey = new Map<string, Set<string>>();
  const namesByKey = new Map<string, Map<string, number>>();
  const clientMap = new Map<string, ClientOtd>();
  finishedFreights.forEach((f) => {
    const cnpjRaw = (f.sender?.cnpj || "").replace(/\D/g, "");
    const key = cnpjRaw.length >= 8 ? cnpjRaw.slice(0, 8) : (f.sender?.name?.trim() || "—");
    const fallbackName = f.sender?.name?.trim() || "—";
    if (!clientMap.has(key)) {
      clientMap.set(key, {
        key,
        name: fallbackName,
        cnpjsCount: 0,
        nicknames: new Set<string>(),
        total: 0,
        withPred: 0,
        onTime: 0,
        late: 0,
        lateHoursSum: 0,
        revenue: 0,
      });
      cnpjsByKey.set(key, new Set());
      namesByKey.set(key, new Map());
    }
    const c = clientMap.get(key)!;
    c.total++;
    c.revenue += f.total || 0;
    if (cnpjRaw) cnpjsByKey.get(key)!.add(cnpjRaw);
    if (f.sender?.nickname) c.nicknames.add(f.sender.nickname);
    const nameCounts = namesByKey.get(key)!;
    nameCounts.set(fallbackName, (nameCounts.get(fallbackName) || 0) + 1);

    if (f.deliveryPredictionDate && f.finishedAt) {
      const predDate = new Date(
        `${f.deliveryPredictionDate}T${f.deliveryPredictionHour || "23:59:59"}`
      );
      const diff = (new Date(f.finishedAt).getTime() - predDate.getTime()) / HOUR;
      c.withPred++;
      if (diff <= 0) c.onTime++;
      else {
        c.late++;
        c.lateHoursSum += diff;
      }
    }
  });
  // resolver nome do grupo: razão social mais comum
  clientMap.forEach((c, key) => {
    const nameCounts = namesByKey.get(key)!;
    const topName = [...nameCounts.entries()].sort(([, a], [, b]) => b - a)[0];
    if (topName) c.name = topName[0];
    c.cnpjsCount = cnpjsByKey.get(key)?.size || 0;
  });
  const clientsRanked = [...clientMap.values()]
    .filter((c) => c.total >= 3)
    .sort((a, b) => b.total - a.total)
    .slice(0, 15);

  // Donut OTD
  const otdData = (() => {
    const withPred = finishedFreights.filter((f) => f.deliveryPredictionDate);
    const onTime = onTimeFreights.length;
    const lateUpTo1d = withPred.filter((f) => {
      if (!f.deliveryPredictionDate || !f.finishedAt) return false;
      const predDate = new Date(
        `${f.deliveryPredictionDate}T${f.deliveryPredictionHour || "23:59:59"}`
      );
      const diff = (new Date(f.finishedAt).getTime() - predDate.getTime()) / DAY;
      return diff > 0 && diff <= 1;
    }).length;
    const lateMore = withPred.length - onTime - lateUpTo1d;
    return [
      { name: "No prazo", value: onTime, fill: "oklch(0.72 0.17 160)" },
      { name: "Atraso ≤1d", value: lateUpTo1d, fill: "oklch(0.78 0.16 75)" },
      { name: "Atraso >1d", value: lateMore, fill: "oklch(0.65 0.20 25)" },
    ].filter((d) => d.value > 0);
  })();

  // Tabela detalhada (ordenado por data desc)
  const tableRows = [...filtered]
    .sort((a, b) => (b.serviceAt || "").localeCompare(a.serviceAt || ""))
    .slice(0, 200);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Análise de Fretes</h2>
        <p className="text-muted-foreground mt-1">
          Eficiência operacional, lead times e cumprimento de prazo
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <DateFilter
          dateStart={dateStart}
          dateEnd={dateEnd}
          onStartChange={setDateStart}
          onEndChange={setDateEnd}
        />
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v ?? "all")}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="finished">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span>Finalizado</span>
              </span>
            </SelectItem>
            <SelectItem value="in_transit">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-400" />
                <span>Em Trânsito</span>
              </span>
            </SelectItem>
            <SelectItem value="manifested">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <span>Manifestado</span>
              </span>
            </SelectItem>
            <SelectItem value="pending">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-muted-foreground" />
                <span>Pendente</span>
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto text-sm text-muted-foreground">
          {filtered.length} fretes no período · {finishedFreights.length}{" "}
          finalizados com tempo registrado
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-xs font-bold uppercase tracking-wide text-blue-400">
              Tempo de Viagem
            </CardTitle>
            <Clock className="h-4 w-4 text-blue-500/60" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold">{fmtH(avgTravel)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              média entre serviço e entrega
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-xs font-bold uppercase tracking-wide text-emerald-400">
              OTD %
            </CardTitle>
            <Target className="h-4 w-4 text-emerald-500/60" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-emerald-400">
              {otdRate !== null ? otdRate.toFixed(1) + "%" : "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {onTimeFreights.length} entregas no prazo
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-xs font-bold uppercase tracking-wide text-amber-400">
              Lead Time Admin
            </CardTitle>
            <FileClock className="h-4 w-4 text-amber-500/60" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-amber-400">
              {fmtH(avgAdminLead)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              do cadastro ao início da viagem
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-xs font-bold uppercase tracking-wide text-red-400">
              Atraso Médio
            </CardTitle>
            <AlertOctagon className="h-4 w-4 text-red-500/60" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-red-400">
              {fmtH(avgLate)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {lateTimes.length} entregas atrasadas
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-violet-500">
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-xs font-bold uppercase tracking-wide text-violet-400">
              Volume Analisado
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-violet-500/60" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-violet-400">
              {finishedFreights.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              de {filtered.length} fretes no filtro
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Operational charts */}
      <div className="grid gap-6 md:grid-cols-7">
        <Card className="md:col-span-4">
          <CardHeader>
            <CardTitle>Distribuição do Tempo de Viagem</CardTitle>
            <CardDescription>
              Quantos fretes finalizaram em cada faixa de tempo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[280px] w-full">
              <BarChart
                data={histogramBuckets}
                accessibilityLayer
                margin={{ top: 28, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelKey="label"
                      formatter={(value, _, item) => [
                        `${value} fretes (${item.payload.pct})`,
                        "",
                      ]}
                    />
                  }
                />
                <Bar
                  dataKey="count"
                  fill="oklch(0.68 0.17 250)"
                  radius={[6, 6, 0, 0]}
                >
                  <LabelList
                    dataKey="pct"
                    position="top"
                    className="fill-foreground text-xs font-semibold"
                  />
                  <LabelList
                    dataKey="count"
                    position="insideTop"
                    offset={8}
                    className="fill-white text-[10px] font-medium"
                  />
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Cumprimento de Prazo</CardTitle>
            <CardDescription>OTD do período filtrado</CardDescription>
          </CardHeader>
          <CardContent>
            {otdData.length === 0 ? (
              <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">
                Sem dados de prazo no período
              </div>
            ) : (
              <ChartContainer config={{}} className="h-[260px] w-full">
                <PieChart accessibilityLayer>
                  <ChartTooltip
                    content={<ChartTooltipContent nameKey="name" />}
                  />
                  <Pie
                    data={otdData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={95}
                    strokeWidth={3}
                    stroke="var(--background)"
                  >
                    {otdData.map((d) => (
                      <Cell key={d.name} fill={d.fill} />
                    ))}
                    <Label
                      content={({ viewBox }) => {
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                          const total = otdData.reduce(
                            (s, d) => s + d.value,
                            0
                          );
                          return (
                            <text
                              x={viewBox.cx}
                              y={viewBox.cy}
                              textAnchor="middle"
                              dominantBaseline="middle"
                            >
                              <tspan
                                x={viewBox.cx}
                                y={viewBox.cy}
                                className="fill-foreground text-3xl font-bold"
                              >
                                {otdRate !== null
                                  ? otdRate.toFixed(0) + "%"
                                  : "—"}
                              </tspan>
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy || 0) + 22}
                                className="fill-muted-foreground text-xs"
                              >
                                {total} entregas
                              </tspan>
                            </text>
                          );
                        }
                      }}
                    />
                  </Pie>
                </PieChart>
              </ChartContainer>
            )}
            <div className="grid grid-cols-3 gap-2 mt-3">
              {otdData.map((d) => (
                <div key={d.name} className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: d.fill }}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold leading-tight">
                      {d.value}
                    </p>
                    <p className="text-[10px] text-muted-foreground leading-tight truncate">
                      {d.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* OTD por cliente */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>OTD por Cliente</CardTitle>
              <CardDescription>
                Cumprimento de prazo dos principais remetentes (mín. 3 fretes)
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              Top {clientsRanked.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {clientsRanked.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
              Sem dados de prazo no período
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-center">Fretes</TableHead>
                  <TableHead className="w-[300px]">Distribuição OTD</TableHead>
                  <TableHead className="text-right">OTD%</TableHead>
                  <TableHead className="text-right">Atraso médio</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientsRanked.map((c) => {
                  const otd = c.withPred > 0 ? (c.onTime / c.withPred) * 100 : null;
                  const avgLateH = c.late > 0 ? c.lateHoursSum / c.late : null;
                  const onTimePct = c.withPred > 0 ? (c.onTime / c.withPred) * 100 : 0;
                  const latePct = c.withPred > 0 ? (c.late / c.withPred) * 100 : 0;
                  const noPredPct = c.total > 0 ? ((c.total - c.withPred) / c.total) * 100 : 0;
                  return (
                    <TableRow key={c.key}>
                      <TableCell className="max-w-[280px]">
                        <div className="text-xs font-medium truncate">{c.name}</div>
                        {c.cnpjsCount > 1 && (
                          <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                            {c.cnpjsCount} CNPJs
                            {c.nicknames.size > 0 && (
                              <span> · {[...c.nicknames].slice(0, 3).join(", ")}{c.nicknames.size > 3 ? "…" : ""}</span>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-center font-mono">
                        {c.total}
                      </TableCell>
                      <TableCell>
                        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
                          {onTimePct > 0 && (
                            <div
                              className="bg-emerald-500 h-full"
                              style={{ width: `${onTimePct * (c.withPred / c.total)}%` }}
                              title={`${c.onTime} no prazo`}
                            />
                          )}
                          {latePct > 0 && (
                            <div
                              className="bg-red-500 h-full"
                              style={{ width: `${latePct * (c.withPred / c.total)}%` }}
                              title={`${c.late} atrasados`}
                            />
                          )}
                          {noPredPct > 0 && (
                            <div
                              className="bg-muted-foreground/30 h-full"
                              style={{ width: `${noPredPct}%` }}
                              title={`${c.total - c.withPred} sem prazo`}
                            />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {otd === null ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <Badge
                            variant="outline"
                            className={`text-xs font-bold ${
                              otd >= 80
                                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                : otd >= 50
                                ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                                : "bg-red-500/15 text-red-400 border-red-500/30"
                            }`}
                          >
                            {otd.toFixed(0)}%
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {avgLateH === null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <span className="text-red-400 font-medium">{fmtH(avgLateH)}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium">
                        {fmtCurrency(c.revenue)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          <div className="flex items-center gap-4 mt-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> No prazo
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-500" /> Atrasado
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-muted-foreground/30" /> Sem prazo cadastrado
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Detail table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Detalhamento por frete</CardTitle>
              <CardDescription>
                Ordenado por data de início (mais recentes primeiro)
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              Top 200
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Finalização</TableHead>
                <TableHead>Duração</TableHead>
                <TableHead>Lead Admin</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead>OTD</TableHead>
                <TableHead>Rota</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableRows.map((f) => {
                const dur = diffH(f.serviceAt, f.finishedAt);
                const adminLead = diffH(f.createdAt, f.serviceAt);
                let onTime: boolean | null = null;
                let lateH: number | null = null;
                if (f.deliveryPredictionDate && f.finishedAt) {
                  const predDate = new Date(
                    `${f.deliveryPredictionDate}T${f.deliveryPredictionHour || "23:59:59"}`
                  );
                  const diffMs =
                    new Date(f.finishedAt).getTime() - predDate.getTime();
                  onTime = diffMs <= 0;
                  if (!onTime) lateH = diffMs / HOUR;
                }
                return (
                  <TableRow key={f.id}>
                    <TableCell className="font-mono text-xs">
                      {f.sequenceCode}
                    </TableCell>
                    <TableCell className="text-xs">
                      {fmtDateTime(f.serviceAt)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {fmtDateTime(f.finishedAt)}
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                      {fmtH(dur)}
                    </TableCell>
                    <TableCell className="text-xs">{fmtH(adminLead)}</TableCell>
                    <TableCell className="text-xs">
                      {f.deliveryPredictionDate
                        ? new Date(f.deliveryPredictionDate).toLocaleDateString("pt-BR")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {onTime === null ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : onTime ? (
                        <Badge
                          variant="outline"
                          className="text-xs bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                        >
                          ✓ no prazo
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-xs bg-red-500/15 text-red-400 border-red-500/30"
                        >
                          <TrendingDown className="h-3 w-3 mr-1" />
                          {fmtH(lateH)}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {f.originCity?.state?.code} →{" "}
                      {f.destinationCity?.state?.code}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${STATUS_BADGE[f.status] || ""}`}
                      >
                        {STATUS_LABELS[f.status] || f.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs font-medium">
                      {fmtCurrency(f.total)}
                    </TableCell>
                  </TableRow>
                );
              })}
              {tableRows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="text-center text-muted-foreground py-8"
                  >
                    Nenhum frete no período selecionado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
