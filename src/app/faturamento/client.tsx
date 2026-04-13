"use client";

import { useState, useMemo } from "react";
import {
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  MapPin,
  Calendar,
  BarChart3,
  Building2,
} from "lucide-react";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Line, LineChart, Area, AreaChart, Pie, PieChart, Cell } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateFilter } from "@/components/date-filter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import type { FreightMargin } from "@/lib/esl-api";

function fmtCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function fmtShort(value: number) {
  if (Math.abs(value) >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}k`;
  return fmtCurrency(value);
}

const monthNames: Record<string, string> = {
  "01": "Jan", "02": "Fev", "03": "Mar", "04": "Abr",
  "05": "Mai", "06": "Jun", "07": "Jul", "08": "Ago",
  "09": "Set", "10": "Out", "11": "Nov", "12": "Dez",
};

const PIE_COLORS = [
  "oklch(0.55 0.20 260)",
  "oklch(0.65 0.18 165)",
  "oklch(0.70 0.16 45)",
  "oklch(0.60 0.20 310)",
  "oklch(0.72 0.14 80)",
  "oklch(0.58 0.15 200)",
  "oklch(0.65 0.12 130)",
  "oklch(0.68 0.18 25)",
];

export function FaturamentoClient({ margins }: { margins: FreightMargin[] }) {
  const [activeTab, setActiveTab] = useState("periodo");
  const [dateStart, setDateStart] = useState("2025-01-01");
  const [dateEnd, setDateEnd] = useState(new Date().toISOString().split("T")[0]);

  const dateFiltered = useMemo(() => {
    return margins.filter((m) => {
      const date = m.service_at?.split("T")[0] || "";
      return date >= dateStart && date <= dateEnd;
    });
  }, [margins, dateStart, dateEnd]);

  const totalRevenue = dateFiltered.reduce((s, m) => s + parseFloat(m.freight_total), 0);
  const totalExpenses = dateFiltered.reduce((s, m) => s + parseFloat(m.total_expenses), 0);
  const totalMargin = dateFiltered.reduce((s, m) => s + parseFloat(m.margin_total), 0);
  const totalWeight = dateFiltered.reduce((s, m) => s + parseFloat(m.real_weight), 0);

  // ---- By Period ----
  const byMonth = useMemo(() => {
    const map: Record<string, { revenue: number; expenses: number; margin: number; count: number }> = {};
    dateFiltered.forEach((m: FreightMargin) => {
      const key = m.service_at.slice(0, 7);
      if (!map[key]) map[key] = { revenue: 0, expenses: 0, margin: 0, count: 0 };
      map[key].revenue += parseFloat(m.freight_total);
      map[key].expenses += parseFloat(m.total_expenses);
      map[key].margin += parseFloat(m.margin_total);
      map[key].count += 1;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => ({
        month: `${monthNames[key.split("-")[1]]}/${key.slice(2, 4)}`,
        ...v,
      }));
  }, [dateFiltered]);

  // ---- Comparativo Mensal (bruto vs acumulado até dia atual) ----
  const monthlyComparison = useMemo(() => {
    // Group ALL margins by month (ignoring date filter) to get full-month values
    const allByMonth: Record<string, { bruto: number; count: number }> = {};
    margins.forEach((m) => {
      const key = m.service_at.slice(0, 7);
      if (!allByMonth[key]) allByMonth[key] = { bruto: 0, count: 0 };
      allByMonth[key].bruto += parseFloat(m.freight_total);
      allByMonth[key].count += 1;
    });

    // Group filtered margins (with date filter) to get "até data atual"
    const filteredByMonth: Record<string, { atual: number; count: number }> = {};
    dateFiltered.forEach((m) => {
      const key = m.service_at.slice(0, 7);
      if (!filteredByMonth[key]) filteredByMonth[key] = { atual: 0, count: 0 };
      filteredByMonth[key].atual += parseFloat(m.freight_total);
      filteredByMonth[key].count += 1;
    });

    const allKeys = [...new Set([...Object.keys(allByMonth), ...Object.keys(filteredByMonth)])].sort();

    return allKeys.map((key) => ({
      key,
      month: `${monthNames[key.split("-")[1]]}/${key.slice(2, 4)}`,
      bruto: allByMonth[key]?.bruto || 0,
      atual: filteredByMonth[key]?.atual || 0,
      countBruto: allByMonth[key]?.count || 0,
      countAtual: filteredByMonth[key]?.count || 0,
    }));
  }, [margins, dateFiltered]);

  // ---- By Client ----
  const byClient = useMemo(() => {
    const map: Record<string, { revenue: number; margin: number; count: number; weight: number; pct: number }> = {};
    dateFiltered.forEach((m) => {
      const name = m.sender.name;
      if (!map[name]) map[name] = { revenue: 0, margin: 0, count: 0, weight: 0, pct: 0 };
      map[name].revenue += parseFloat(m.freight_total);
      map[name].margin += parseFloat(m.margin_total);
      map[name].count += 1;
      map[name].weight += parseFloat(m.real_weight);
    });
    return Object.entries(map)
      .map(([name, data]) => ({
        name,
        shortName: name.length > 25 ? name.slice(0, 25) + "..." : name,
        ...data,
        pct: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [dateFiltered, totalRevenue]);

  // ---- By Region ----
  const byOriginState = useMemo(() => {
    const map: Record<string, { revenue: number; count: number; weight: number }> = {};
    dateFiltered.forEach((m) => {
      const state = m.origin_city.state.code;
      if (!map[state]) map[state] = { revenue: 0, count: 0, weight: 0 };
      map[state].revenue += parseFloat(m.freight_total);
      map[state].count += 1;
      map[state].weight += parseFloat(m.real_weight);
    });
    return Object.entries(map)
      .map(([state, data]) => ({ state, ...data }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [dateFiltered]);

  const byDestState = useMemo(() => {
    const map: Record<string, { revenue: number; count: number; weight: number }> = {};
    dateFiltered.forEach((m) => {
      const state = m.destination_city.state.code;
      if (!map[state]) map[state] = { revenue: 0, count: 0, weight: 0 };
      map[state].revenue += parseFloat(m.freight_total);
      map[state].count += 1;
      map[state].weight += parseFloat(m.real_weight);
    });
    return Object.entries(map)
      .map(([state, data]) => ({ state, ...data }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [dateFiltered]);

  // ---- By Filial ----
  const byFilial = useMemo(() => {
    const map: Record<string, { revenue: number; margin: number; count: number }> = {};
    dateFiltered.forEach((m) => {
      const name = m.corporation.nickname;
      if (!map[name]) map[name] = { revenue: 0, margin: 0, count: 0 };
      map[name].revenue += parseFloat(m.freight_total);
      map[name].margin += parseFloat(m.margin_total);
      map[name].count += 1;
    });
    return Object.entries(map)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [dateFiltered]);

  const periodChartConfig = {
    revenue: { label: "Receita", color: "oklch(0.55 0.20 260)" },
    expenses: { label: "Despesas", color: "oklch(0.70 0.16 45)" },
    margin: { label: "Margem", color: "oklch(0.65 0.18 165)" },
  } satisfies ChartConfig;

  const clientPieConfig: ChartConfig = {};
  byClient.slice(0, 6).forEach((c, i) => {
    clientPieConfig[c.shortName] = { label: c.shortName, color: PIE_COLORS[i] };
  });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Faturamento</h2>
        <p className="text-muted-foreground mt-1">
          Analise de faturamento por periodo, cliente e regiao
        </p>
      </div>

      <DateFilter dateStart={dateStart} dateEnd={dateEnd} onStartChange={setDateStart} onEndChange={setDateEnd} />

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Receita Total
            </CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmtShort(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">{margins.length} fretes</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border-emerald-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Margem Total
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalMargin >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {fmtShort(totalMargin)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalRevenue > 0 ? ((totalMargin / totalRevenue) * 100).toFixed(1) : 0}% sobre receita
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Clientes Unicos
            </CardTitle>
            <Users className="h-4 w-4 text-violet-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{byClient.length}</div>
            <p className="text-xs text-muted-foreground mt-1">remetentes distintos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Regioes Atendidas
            </CardTitle>
            <MapPin className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{byDestState.length}</div>
            <p className="text-xs text-muted-foreground mt-1">estados de destino</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 max-w-lg">
          <TabsTrigger value="periodo" className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" /> Periodo
          </TabsTrigger>
          <TabsTrigger value="cliente" className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" /> Cliente
          </TabsTrigger>
          <TabsTrigger value="regiao" className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" /> Regiao
          </TabsTrigger>
          <TabsTrigger value="filial" className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5" /> Filial
          </TabsTrigger>
        </TabsList>

        {/* === POR PERIODO === */}
        <TabsContent value="periodo" className="space-y-6 mt-6">
          {/* Comparativo Mensal */}
          <Card>
            <CardHeader>
              <CardTitle>Faturamento: Mensal | Comparativo</CardTitle>
              <CardDescription>Faturamento bruto (mensal) vs Faturamento no período filtrado</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  bruto: { label: "Faturamento bruto (mensal)", color: "oklch(0.55 0.12 55)" },
                  atual: { label: "Faturamento (período filtrado)", color: "oklch(0.72 0.12 55)" },
                } satisfies ChartConfig}
                className="h-[350px] w-full"
              >
                <BarChart data={monthlyComparison} accessibilityLayer>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => fmtShort(v)}
                    tick={{ fontSize: 10 }}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name) => {
                          const label = name === "bruto" ? "Bruto mensal" : "Período filtrado";
                          return `${label}: ${fmtCurrency(Number(value))}`;
                        }}
                      />
                    }
                  />
                  <Bar
                    dataKey="bruto"
                    fill="var(--color-bruto)"
                    radius={[4, 4, 0, 0]}
                    barSize={28}
                    label={{
                      position: "top" as const,
                      fontSize: 9,
                      fill: "oklch(0.55 0.12 55)",
                      formatter: ((v: unknown) => Number(v) > 0 ? fmtShort(Number(v)) : "") as never,
                    }}
                  />
                  <Bar
                    dataKey="atual"
                    fill="var(--color-atual)"
                    radius={[4, 4, 0, 0]}
                    barSize={28}
                    label={{
                      position: "top" as const,
                      fontSize: 9,
                      fill: "oklch(0.72 0.12 55)",
                      formatter: ((v: unknown) => Number(v) > 0 ? fmtShort(Number(v)) : "") as never,
                    }}
                  />
                </BarChart>
              </ChartContainer>
              <div className="flex justify-center gap-6 mt-3">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-6 rounded-sm" style={{ backgroundColor: "oklch(0.55 0.12 55)" }} />
                  <span className="text-xs text-muted-foreground">Faturamento bruto (mensal)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-6 rounded-sm" style={{ backgroundColor: "oklch(0.72 0.12 55)" }} />
                  <span className="text-xs text-muted-foreground">Faturamento (período filtrado)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-5">
            <Card className="md:col-span-3">
              <CardHeader>
                <CardTitle>Evolucao Mensal</CardTitle>
                <CardDescription>Receita, despesas e margem por mes</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={periodChartConfig} className="h-[350px] w-full">
                  <AreaChart data={byMonth} accessibilityLayer>
                    <defs>
                      <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-revenue)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="var(--color-revenue)" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="fillMargin" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-margin)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="var(--color-margin)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                    <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => fmtShort(v)} tick={{ fontSize: 11 }} />
                    <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmtCurrency(Number(v))} />} />
                    <Area dataKey="revenue" fill="url(#fillRevenue)" stroke="var(--color-revenue)" strokeWidth={2} type="monotone" />
                    <Area dataKey="margin" fill="url(#fillMargin)" stroke="var(--color-margin)" strokeWidth={2} type="monotone" />
                    <Line dataKey="expenses" stroke="var(--color-expenses)" strokeWidth={2} strokeDasharray="4 4" dot={false} type="monotone" />
                    <ChartLegend content={<ChartLegendContent />} />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Detalhamento Mensal</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mes</TableHead>
                      <TableHead className="text-right">Receita</TableHead>
                      <TableHead className="text-right">Margem</TableHead>
                      <TableHead className="text-right">Qt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byMonth.map((m) => (
                      <TableRow key={m.month}>
                        <TableCell className="font-medium text-sm">{m.month}</TableCell>
                        <TableCell className="text-right text-sm">{fmtShort(m.revenue)}</TableCell>
                        <TableCell className={`text-right text-sm font-medium ${m.margin >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                          {fmtShort(m.margin)}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">{m.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* === POR CLIENTE === */}
        <TabsContent value="cliente" className="space-y-6 mt-6">
          <div className="grid gap-6 md:grid-cols-5">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Distribuicao de Receita</CardTitle>
                <CardDescription>Participacao por cliente</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={clientPieConfig} className="h-[350px] w-full">
                  <PieChart accessibilityLayer>
                    <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmtCurrency(Number(v))} />} />
                    <Pie
                      data={byClient.slice(0, 6).map((c) => ({
                        name: c.shortName,
                        value: c.revenue,
                        fill: `var(--color-${c.shortName})`,
                      }))}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={70}
                      outerRadius={110}
                      strokeWidth={3}
                      stroke="var(--background)"
                    >
                      {byClient.slice(0, 6).map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
              </CardContent>
            </Card>
            <Card className="md:col-span-3">
              <CardHeader>
                <CardTitle>Ranking de Clientes</CardTitle>
                <CardDescription>Ordenado por receita</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead></TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="text-right">Receita</TableHead>
                      <TableHead className="text-right">Margem</TableHead>
                      <TableHead className="text-right">Peso</TableHead>
                      <TableHead className="text-right">%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byClient.map((c, i) => (
                      <TableRow key={c.name}>
                        <TableCell>
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: PIE_COLORS[i] || "var(--muted)" }}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium truncate max-w-[200px]">{c.name}</p>
                            <p className="text-xs text-muted-foreground">{c.count} fretes</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">{fmtCurrency(c.revenue)}</TableCell>
                        <TableCell className={`text-right text-sm ${c.margin >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                          {fmtCurrency(c.margin)}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {(c.weight / 1000).toFixed(0)}t
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className="text-xs font-mono">
                            {c.pct.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* === POR REGIAO === */}
        <TabsContent value="regiao" className="space-y-6 mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Origem - Estados</CardTitle>
                <CardDescription>Receita por estado de origem</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {byOriginState.map((r, i) => {
                    const maxRevenue = byOriginState[0]?.revenue || 1;
                    const pct = (r.revenue / maxRevenue) * 100;
                    return (
                      <div key={r.state} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-xs w-8 justify-center">
                              {r.state}
                            </Badge>
                            <span className="text-muted-foreground">{r.count} fretes</span>
                          </div>
                          <span className="font-medium">{fmtCurrency(r.revenue)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.max(pct, 2)}%`,
                              backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Destino - Estados</CardTitle>
                <CardDescription>Receita por estado de destino</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {byDestState.map((r, i) => {
                    const maxRevenue = byDestState[0]?.revenue || 1;
                    const pct = (r.revenue / maxRevenue) * 100;
                    return (
                      <div key={r.state} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-xs w-8 justify-center">
                              {r.state}
                            </Badge>
                            <span className="text-muted-foreground">{r.count} fretes • {(r.weight / 1000).toFixed(0)}t</span>
                          </div>
                          <span className="font-medium">{fmtCurrency(r.revenue)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.max(pct, 2)}%`,
                              backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* === POR FILIAL === */}
        <TabsContent value="filial" className="space-y-6 mt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {byFilial.map((f, i) => (
              <Card key={f.name} className="relative overflow-hidden">
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                />
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-base">{f.name}</CardTitle>
                  </div>
                  <CardDescription>{f.count} fretes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Receita</p>
                      <p className="text-lg font-bold mt-1">{fmtShort(f.revenue)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Margem</p>
                      <p className={`text-lg font-bold mt-1 ${f.margin >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {fmtShort(f.margin)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
