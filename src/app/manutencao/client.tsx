"use client";

import { useMemo, useState } from "react";
import {
  Wrench,
  Hammer,
  ShieldCheck,
  DollarSign,
  TrendingUp,
  Truck,
  Package,
  AlertCircle,
} from "lucide-react";
import {
  Pie,
  PieChart,
  Cell,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Line,
  LineChart,
  Label,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { ServiceOrderAggregated, ServiceOrderRow } from "@/lib/esl-api";

const COLORS = [
  "oklch(0.68 0.19 265)",
  "oklch(0.75 0.18 165)",
  "oklch(0.78 0.15 55)",
  "oklch(0.70 0.20 310)",
  "oklch(0.72 0.14 80)",
  "oklch(0.58 0.15 200)",
  "oklch(0.65 0.12 130)",
  "oklch(0.68 0.18 25)",
  "oklch(0.55 0.16 280)",
  "oklch(0.62 0.10 100)",
];

const MS: Record<string, string> = {
  "01": "Jan",
  "02": "Fev",
  "03": "Mar",
  "04": "Abr",
  "05": "Mai",
  "06": "Jun",
  "07": "Jul",
  "08": "Ago",
  "09": "Set",
  "10": "Out",
  "11": "Nov",
  "12": "Dez",
};

const TYPE_LABEL: Record<string, string> = {
  preventive: "Preventiva",
  corrective: "Corretiva",
  other: "Outros",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Aberta",
  finished: "Finalizada",
  delivered: "Entregue",
  unknown: "N/D",
};

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(v);
}
function fmtShort(v: number) {
  if (Math.abs(v) >= 1e6) return `R$ ${(v / 1e6).toFixed(1)}M`;
  if (Math.abs(v) >= 1e3) return `R$ ${(v / 1e3).toFixed(0)}k`;
  return fmt(v);
}

interface Props {
  rows: ServiceOrderRow[];
  orders: ServiceOrderAggregated[];
}

export function ManutencaoClient({ rows, orders }: Props) {
  // ===== PERÍODO =====
  const availableMonths = useMemo(() => {
    const s = new Set<string>();
    orders.forEach((o) => s.add(o.serviceAt.slice(0, 7)));
    return [...s].sort().reverse();
  }, [orders]);
  const defaultMonth = availableMonths[0] || "ALL";
  const [period, setPeriod] = useState<string>(defaultMonth);

  const filteredOrders = useMemo(
    () =>
      period === "ALL"
        ? orders
        : orders.filter((o) => o.serviceAt.startsWith(period)),
    [orders, period]
  );
  const filteredRows = useMemo(() => {
    if (period === "ALL") return rows;
    const codes = new Set(filteredOrders.map((o) => o.sequenceCode));
    return rows.filter((r) => codes.has(r.sequence_code));
  }, [rows, filteredOrders, period]);

  // ===== KPIs =====
  const totalOs = filteredOrders.length;
  const openOs = filteredOrders.filter((o) => o.status === "pending").length;
  const closedOs = filteredOrders.filter(
    (o) => o.status === "finished" || o.status === "delivered"
  ).length;
  const totalCost = filteredOrders.reduce((s, o) => s + o.total, 0);
  const partsCost = filteredOrders.reduce((s, o) => s + o.partsTotal, 0);
  const laborCost = filteredOrders.reduce((s, o) => s + o.laborTotal, 0);
  const avgPerOs = totalOs > 0 ? totalCost / totalOs : 0;
  const preventiveCount = filteredOrders.filter((o) => o.type === "preventive").length;
  const correctiveCount = filteredOrders.filter((o) => o.type === "corrective").length;
  const preventivePct =
    totalOs > 0 ? (preventiveCount / totalOs) * 100 : 0;

  // ===== Mix por tipo de manutenção =====
  const byType = useMemo(() => {
    const map: Record<string, { count: number; cost: number }> = {};
    filteredOrders.forEach((o) => {
      const k = o.type;
      if (!map[k]) map[k] = { count: 0, cost: 0 };
      map[k].count += 1;
      map[k].cost += o.total;
    });
    return Object.entries(map).map(([k, v]) => ({
      name: TYPE_LABEL[k] ?? k,
      count: v.count,
      cost: v.cost,
    }));
  }, [filteredOrders]);

  // ===== Por categoria de veículo =====
  const byVehicleCategory = useMemo(() => {
    const map: Record<string, { count: number; cost: number }> = {};
    filteredOrders.forEach((o) => {
      const k = o.vehicleType || "N/D";
      if (!map[k]) map[k] = { count: 0, cost: 0 };
      map[k].count += 1;
      map[k].cost += o.total;
    });
    return Object.entries(map)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.cost - a.cost);
  }, [filteredOrders]);

  // ===== Top 10 veículos por custo =====
  const topVehicles = useMemo(() => {
    const map: Record<
      string,
      { plate: string; model: string; brand: string; count: number; cost: number }
    > = {};
    filteredOrders.forEach((o) => {
      const k = o.plate || "N/D";
      if (!map[k])
        map[k] = {
          plate: o.plate,
          model: o.model,
          brand: o.brand,
          count: 0,
          cost: 0,
        };
      map[k].count += 1;
      map[k].cost += o.total;
    });
    return Object.values(map)
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10);
  }, [filteredOrders]);

  // ===== Top 10 peças (por quantidade e por custo) =====
  const topParts = useMemo(() => {
    const map: Record<string, { qty: number; cost: number }> = {};
    filteredRows.forEach((r) => {
      const name = r.fvr_fes_p_t_name;
      if (!name) return;
      const qty = parseFloat(r.fvr_fes_quantity ?? "0") || 0;
      const unit = parseFloat(r.fvr_fes_unitary_value ?? "0") || 0;
      if (!map[name]) map[name] = { qty: 0, cost: 0 };
      map[name].qty += qty;
      map[name].cost += qty * unit;
    });
    return Object.entries(map)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10);
  }, [filteredRows]);

  // ===== Fabricante vs custo =====
  const byBrand = useMemo(() => {
    const map: Record<string, { count: number; cost: number }> = {};
    filteredOrders.forEach((o) => {
      const k = (o.brand || "N/D").toUpperCase();
      if (!map[k]) map[k] = { count: 0, cost: 0 };
      map[k].count += 1;
      map[k].cost += o.total;
    });
    return Object.entries(map)
      .map(([name, v]) => ({
        name,
        ...v,
        avgCost: v.count > 0 ? v.cost / v.count : 0,
      }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 8);
  }, [filteredOrders]);

  // ===== Evolução mensal (últimos 12 meses — ignora filtro) =====
  const monthlyTrend = useMemo(() => {
    const map: Record<string, { count: number; cost: number }> = {};
    orders.forEach((o) => {
      const k = o.serviceAt.slice(0, 7);
      if (!map[k]) map[k] = { count: 0, cost: 0 };
      map[k].count += 1;
      map[k].cost += o.total;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => ({
        key: k,
        month: `${MS[k.split("-")[1]]}/${k.slice(2, 4)}`,
        count: v.count,
        cost: v.cost,
      }));
  }, [orders]);

  // ===== Tabela detalhada =====
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const tableRows = useMemo(() => {
    return filteredOrders.filter((o) => {
      if (typeFilter !== "all" && o.type !== typeFilter) return false;
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !o.plate.toLowerCase().includes(q) &&
          !o.model.toLowerCase().includes(q) &&
          !o.brand.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [filteredOrders, typeFilter, statusFilter, search]);

  const periodLabel =
    period === "ALL"
      ? "Últimos 12 meses"
      : `${MS[period.split("-")[1]]}/${period.slice(0, 4)}`;

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Manutenção da Frota
          </h1>
          <p className="text-sm text-muted-foreground">
            Panorama completo de ordens de serviço — {periodLabel}
          </p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v ?? "ALL")}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Últimos 12 meses</SelectItem>
            {availableMonths.map((m) => (
              <SelectItem key={m} value={m}>
                {MS[m.split("-")[1]]}/{m.slice(0, 4)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ============ KPIs ============ */}
      <section className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <Wrench className="h-6 w-6 mx-auto text-primary mb-2" />
            <p className="text-3xl font-extrabold">{totalOs}</p>
            <p className="text-xs text-muted-foreground">Total OS</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/5 to-amber-500/10 border-amber-500/20">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-6 w-6 mx-auto text-amber-400 mb-2" />
            <p className="text-3xl font-extrabold text-amber-400">{openOs}</p>
            <p className="text-xs text-muted-foreground">Abertas</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border-emerald-500/20">
          <CardContent className="pt-6 text-center">
            <ShieldCheck className="h-6 w-6 mx-auto text-emerald-400 mb-2" />
            <p className="text-3xl font-extrabold text-emerald-400">{closedOs}</p>
            <p className="text-xs text-muted-foreground">Encerradas</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/5 to-red-500/10 border-red-500/20">
          <CardContent className="pt-6 text-center">
            <DollarSign className="h-6 w-6 mx-auto text-red-400 mb-2" />
            <p className="text-2xl font-extrabold">{fmtShort(totalCost)}</p>
            <p className="text-xs text-muted-foreground">Custo total</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Peças {fmtShort(partsCost)} · M.O. {fmtShort(laborCost)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <TrendingUp className="h-6 w-6 mx-auto text-primary mb-2" />
            <p className="text-2xl font-extrabold">{fmtShort(avgPerOs)}</p>
            <p className="text-xs text-muted-foreground">Custo médio/OS</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Hammer className="h-6 w-6 mx-auto text-primary mb-2" />
            <p className="text-2xl font-extrabold">{preventivePct.toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground">Preventiva</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {preventiveCount}P · {correctiveCount}C
            </p>
          </CardContent>
        </Card>
      </section>

      {/* ============ Mix por tipo + Categoria de veículo ============ */}
      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Mix por tipo de manutenção</CardTitle>
            <CardDescription>OS e custo por classificação</CardDescription>
          </CardHeader>
          <CardContent>
            {byType.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">
                Sem dados no período
              </p>
            ) : (
              <ChartContainer
                config={{ count: { label: "OS" } } satisfies ChartConfig}
                className="mx-auto aspect-square max-h-[260px]"
              >
                <PieChart>
                  <ChartTooltip
                    content={<ChartTooltipContent nameKey="name" />}
                  />
                  <Pie
                    data={byType}
                    dataKey="count"
                    nameKey="name"
                    innerRadius={60}
                    strokeWidth={3}
                  >
                    {byType.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                    <Label
                      content={({ viewBox }) => {
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
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
                                className="fill-foreground text-2xl font-bold"
                              >
                                {totalOs}
                              </tspan>
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy || 0) + 20}
                                className="fill-muted-foreground text-xs"
                              >
                                OS
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
            <div className="mt-4 space-y-1">
              {byType.map((t, i) => (
                <div
                  key={t.name}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span>{t.name}</span>
                  </div>
                  <span className="font-mono text-muted-foreground">
                    {t.count} · {fmtShort(t.cost)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Custo por categoria de veículo</CardTitle>
            <CardDescription>Cavalos, carretas e outros</CardDescription>
          </CardHeader>
          <CardContent>
            {byVehicleCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">
                Sem dados no período
              </p>
            ) : (
              <ChartContainer
                config={{ cost: { label: "Custo" } } satisfies ChartConfig}
                className="h-[260px] w-full"
              >
                <BarChart data={byVehicleCategory} layout="vertical">
                  <CartesianGrid horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => fmtShort(v)}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 11 }}
                    width={130}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(v) => fmt(v as number)}
                      />
                    }
                  />
                  <Bar dataKey="cost" radius={4}>
                    {byVehicleCategory.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ============ Top veículos + Top peças ============ */}
      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top 10 veículos com maior custo</CardTitle>
            <CardDescription>Ranking por custo total no período</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {topVehicles.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Sem dados
              </p>
            ) : (
              topVehicles.map((v, i) => (
                <div
                  key={v.plate + i}
                  className="flex items-center gap-3 p-2 rounded hover:bg-muted/50"
                >
                  <div className="w-6 text-center text-xs font-bold text-muted-foreground">
                    #{i + 1}
                  </div>
                  <Truck className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{v.plate}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {v.brand} {v.model}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono font-semibold">
                      {fmtShort(v.cost)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {v.count} OS
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 10 peças (por custo)</CardTitle>
            <CardDescription>
              Peças mais impactantes no período
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {topParts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Sem dados
              </p>
            ) : (
              topParts.map((p, i) => (
                <div
                  key={p.name + i}
                  className="flex items-center gap-3 p-2 rounded hover:bg-muted/50"
                >
                  <div className="w-6 text-center text-xs font-bold text-muted-foreground">
                    #{i + 1}
                  </div>
                  <Package className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-semibold truncate"
                      title={p.name}
                    >
                      {p.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Qtd: {p.qty.toFixed(0)}
                    </p>
                  </div>
                  <p className="text-sm font-mono font-semibold">
                    {fmtShort(p.cost)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      {/* ============ Fabricante + Evolução mensal ============ */}
      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Fabricante: custo e média/OS</CardTitle>
            <CardDescription>Top 8 por custo total</CardDescription>
          </CardHeader>
          <CardContent>
            {byBrand.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">
                Sem dados
              </p>
            ) : (
              <ChartContainer
                config={{ cost: { label: "Custo" } } satisfies ChartConfig}
                className="h-[260px] w-full"
              >
                <BarChart data={byBrand}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    angle={-20}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tickFormatter={(v) => fmtShort(v)}
                    tick={{ fontSize: 11 }}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(v) => fmt(v as number)}
                      />
                    }
                  />
                  <Bar dataKey="cost" fill={COLORS[0]} radius={4} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Evolução mensal</CardTitle>
            <CardDescription>Últimos 12 meses (independe do filtro)</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyTrend.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">
                Sem dados
              </p>
            ) : (
              <ChartContainer
                config={{
                  count: { label: "OS", color: COLORS[0] },
                  cost: { label: "Custo", color: COLORS[2] },
                } satisfies ChartConfig}
                className="h-[260px] w-full"
              >
                <LineChart data={monthlyTrend}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    yAxisId="count"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    yAxisId="cost"
                    orientation="right"
                    tickFormatter={(v) => fmtShort(v)}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    yAxisId="count"
                    dataKey="count"
                    stroke={COLORS[0]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    yAxisId="cost"
                    dataKey="cost"
                    stroke={COLORS[2]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ============ Tabela detalhada ============ */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Ordens de serviço</CardTitle>
              <CardDescription>
                {tableRows.length} OS
                {tableRows.length !== totalOs ? ` de ${totalOs}` : ""}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Input
                placeholder="Buscar placa, modelo, fabricante…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-[240px]"
              />
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? "all")}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="preventive">Preventiva</SelectItem>
                  <SelectItem value="corrective">Corretiva</SelectItem>
                  <SelectItem value="other">Outros</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="pending">Aberta</SelectItem>
                  <SelectItem value="finished">Finalizada</SelectItem>
                  <SelectItem value="delivered">Entregue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Placa</TableHead>
                  <TableHead>Veículo</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Peças</TableHead>
                  <TableHead className="text-right">M.O.</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      className="text-center text-muted-foreground py-8"
                    >
                      Nenhuma OS com os filtros aplicados
                    </TableCell>
                  </TableRow>
                ) : (
                  tableRows.slice(0, 100).map((o) => (
                    <TableRow key={o.sequenceCode}>
                      <TableCell className="font-mono">
                        {o.sequenceCode}
                      </TableCell>
                      <TableCell className="text-xs">
                        {o.serviceAt.slice(0, 10).split("-").reverse().join("/")}
                      </TableCell>
                      <TableCell className="font-semibold">{o.plate}</TableCell>
                      <TableCell className="text-xs">
                        {o.brand} {o.model}
                      </TableCell>
                      <TableCell className="text-xs">{o.vehicleType}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            o.type === "preventive"
                              ? "default"
                              : o.type === "corrective"
                              ? "destructive"
                              : "secondary"
                          }
                          className="text-[10px]"
                        >
                          {TYPE_LABEL[o.type]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            o.status === "pending"
                              ? "outline"
                              : "secondary"
                          }
                          className="text-[10px]"
                        >
                          {STATUS_LABEL[o.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {fmtShort(o.partsTotal)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {fmtShort(o.laborTotal)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {fmtShort(o.total)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {tableRows.length > 100 && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Mostrando 100 de {tableRows.length} — refine os filtros
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
