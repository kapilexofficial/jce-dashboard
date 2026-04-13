"use client";

import { useState, useMemo } from "react";
import {
  Truck,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Weight,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { FreightStatusChart } from "@/components/dashboard/freight-status-chart";
import { TopClientsChart } from "@/components/dashboard/top-clients-chart";
import { RegionChart } from "@/components/dashboard/region-chart";
import type { FreightMargin, FreightNode, OccurrenceRest } from "@/lib/esl-api";

function fmt(value: number) {
  if (Math.abs(value) >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}k`;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function fmtFull(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

const MONTH_LABELS: Record<string, string> = {
  "01": "Janeiro", "02": "Fevereiro", "03": "Março", "04": "Abril",
  "05": "Maio", "06": "Junho", "07": "Julho", "08": "Agosto",
  "09": "Setembro", "10": "Outubro", "11": "Novembro", "12": "Dezembro",
};

interface Props {
  freights: FreightNode[];
  occurrences: OccurrenceRest[];
  margins: FreightMargin[];
}

export function DashboardClient({ freights: allFreights, occurrences: allOccurrences, margins: allMargins }: Props) {
  // Build available months from margins data
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    allMargins.forEach((m) => months.add(m.service_at.slice(0, 7)));
    allFreights.forEach((f) => months.add(f.serviceAt.slice(0, 7)));
    allOccurrences.forEach((o) => months.add(o.occurrence_at.slice(0, 7)));
    return [...months].sort().reverse();
  }, [allMargins, allFreights, allOccurrences]);

  const [selectedMonth, setSelectedMonth] = useState("all");

  const monthLabel = useMemo(() => {
    if (selectedMonth === "all") return "";
    const [year, month] = selectedMonth.split("-");
    return `${MONTH_LABELS[month]} ${year}`;
  }, [selectedMonth]);

  // Filter data by selected month
  const margins = useMemo(() => {
    if (selectedMonth === "all") return allMargins;
    return allMargins.filter((m) => m.service_at.startsWith(selectedMonth));
  }, [allMargins, selectedMonth]);

  const freights = useMemo(() => {
    if (selectedMonth === "all") return allFreights;
    return allFreights.filter((f) => f.serviceAt.startsWith(selectedMonth));
  }, [allFreights, selectedMonth]);

  const occurrences = useMemo(() => {
    if (selectedMonth === "all") return allOccurrences;
    return allOccurrences.filter((o) => o.occurrence_at.startsWith(selectedMonth));
  }, [allOccurrences, selectedMonth]);

  // Compute KPIs
  const totalRevenue = margins.reduce((s, m) => s + parseFloat(m.freight_total), 0);
  const totalExpenses = margins.reduce((s, m) => s + parseFloat(m.total_expenses), 0);
  const totalMargin = margins.reduce((s, m) => s + parseFloat(m.margin_total), 0);
  const totalWeight = margins.reduce((s, m) => s + parseFloat(m.real_weight), 0);
  const avgMarginPct = margins.length > 0
    ? margins.reduce((s, m) => s + parseFloat(m.margin_percentual), 0) / margins.length : 0;

  const statusCounts: Record<string, number> = {};
  freights.forEach((f) => { statusCounts[f.status] = (statusCounts[f.status] || 0) + 1; });

  const topClients = useMemo(() => {
    const map: Record<string, { revenue: number; margin: number; count: number; weight: number }> = {};
    margins.forEach((m) => {
      const name = m.sender.name;
      if (!map[name]) map[name] = { revenue: 0, margin: 0, count: 0, weight: 0 };
      map[name].revenue += parseFloat(m.freight_total);
      map[name].margin += parseFloat(m.margin_total);
      map[name].count += 1;
      map[name].weight += parseFloat(m.real_weight);
    });
    return Object.entries(map).sort(([, a], [, b]) => b.revenue - a.revenue).slice(0, 8).map(([name, data]) => ({ name, ...data }));
  }, [margins]);

  const regionData = useMemo(() => {
    const map: Record<string, { revenue: number; count: number }> = {};
    margins.forEach((m) => {
      const state = m.destination_city.state.code;
      if (!map[state]) map[state] = { revenue: 0, count: 0 };
      map[state].revenue += parseFloat(m.freight_total);
      map[state].count += 1;
    });
    return Object.entries(map).sort(([, a], [, b]) => b.revenue - a.revenue).map(([state, data]) => ({ state, ...data }));
  }, [margins]);

  return (
    <div className="space-y-8">
      {/* Header with Month Filter */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Dashboard {monthLabel && <span className="text-primary">| {monthLabel}</span>}
          </h2>
          <p className="text-muted-foreground mt-1">
            Painel operacional - J.C.E Transportes
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedMonth} onValueChange={(v) => setSelectedMonth(v ?? "all")}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os meses</SelectItem>
              {availableMonths.map((m) => {
                const [year, month] = m.split("-");
                return (
                  <SelectItem key={m} value={m}>
                    {MONTH_LABELS[month]} {year}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-sm font-bold uppercase tracking-wide text-primary">Fretes</CardTitle>
            <Truck className="h-5 w-5 text-primary/60" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-extrabold">{margins.length}</div>
            <p className="text-xs text-muted-foreground mt-1">{freights.length} via GraphQL</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-sm font-bold uppercase tracking-wide text-emerald-400">Receita</CardTitle>
            <DollarSign className="h-5 w-5 text-emerald-500/60" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-extrabold text-emerald-400">{fmt(totalRevenue)}</div>
            <div className="flex items-center gap-1 mt-1">
              <ArrowUpRight className="h-3 w-3 text-emerald-500" />
              <span className="text-xs text-emerald-500 font-medium">{fmtFull(totalRevenue)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-sm font-bold uppercase tracking-wide text-amber-400">Despesas</CardTitle>
            <ArrowDownRight className="h-5 w-5 text-amber-500/60" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-extrabold text-amber-400">{fmt(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground mt-1">impostos + custos</p>
          </CardContent>
        </Card>

        <Card className={`border-l-4 ${totalMargin >= 0 ? "border-l-blue-500" : "border-l-red-500"}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-sm font-bold uppercase tracking-wide text-blue-400">Margem</CardTitle>
            <TrendingUp className="h-5 w-5 text-blue-500/60" />
          </CardHeader>
          <CardContent>
            <div className={`text-4xl font-extrabold ${totalMargin >= 0 ? "text-blue-400" : "text-red-400"}`}>{fmt(totalMargin)}</div>
            <Badge variant={avgMarginPct > 50 ? "secondary" : "outline"} className="text-xs mt-1">{avgMarginPct.toFixed(1)}% media</Badge>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-violet-500">
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-sm font-bold uppercase tracking-wide text-violet-400">Peso Total</CardTitle>
            <Weight className="h-5 w-5 text-violet-500/60" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-extrabold text-violet-400">{(totalWeight / 1000).toFixed(0)}t</div>
            <p className="text-xs text-muted-foreground mt-1">{occurrences.length} ocorrencias</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-7">
        <div className="md:col-span-4">
          <RevenueChart margins={selectedMonth === "all" ? allMargins : margins} />
        </div>
        <div className="md:col-span-3">
          <FreightStatusChart statusCounts={statusCounts} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <TopClientsChart clients={topClients} />
        <RegionChart regions={regionData} />
      </div>

      {/* Recent Data Row */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Fretes Recentes</CardTitle>
              <Badge variant="outline" className="text-xs">{freights.length} carregados</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {freights.slice(0, 6).map((f, i) => (
                <div key={f.id}>
                  <div className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                        <Truck className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">#{f.sequenceCode}</span>
                          <Badge variant={f.status === "done" ? "secondary" : "default"} className="text-[10px] px-1.5 py-0">
                            {f.status === "done" ? "Finalizado" : f.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {f.originCity?.name}/{f.originCity?.state?.code}{" "}
                          <span className="text-primary">→</span>{" "}
                          {f.destinationCity?.name}/{f.destinationCity?.state?.code}
                        </p>
                      </div>
                    </div>
                    <div className="text-right ml-3 shrink-0">
                      <p className="text-sm font-semibold">{fmtFull(f.total)}</p>
                      <p className="text-[10px] text-muted-foreground">{formatDate(f.serviceAt)}</p>
                    </div>
                  </div>
                  {i < 5 && <Separator />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Ultimas Ocorrencias</CardTitle>
              <Badge variant="destructive" className="text-xs">{occurrences.length} total</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {occurrences.slice(0, 6).map((occ, i) => (
                <div key={occ.id}>
                  <div className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 shrink-0">
                        <AlertTriangle className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm font-medium truncate block">{occ.occurrence.description}</span>
                        <p className="text-xs text-muted-foreground">
                          NF {occ.invoice.number} | Frete #{occ.freight.draft_number}
                        </p>
                      </div>
                    </div>
                    <div className="text-right ml-3 shrink-0">
                      <p className="text-sm font-semibold">{fmtFull(occ.freight.total)}</p>
                      <p className="text-[10px] text-muted-foreground">{formatDate(occ.occurrence_at)}</p>
                    </div>
                  </div>
                  {i < 5 && <Separator />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
