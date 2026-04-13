"use client";

import { useState, useMemo } from "react";
import { DateFilter } from "@/components/date-filter";
import {
  Users,
  Trophy,
  TrendingUp,
  FileText,
  ArrowUpRight,
  Truck,
} from "lucide-react";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/chart";
import type { UserRest, FreightNode, OccurrenceRest } from "@/lib/esl-api";

function fmtCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

const COLORS = [
  "oklch(0.68 0.19 265)",
  "oklch(0.75 0.18 165)",
  "oklch(0.78 0.15 55)",
  "oklch(0.70 0.20 310)",
  "oklch(0.72 0.14 80)",
  "oklch(0.65 0.18 200)",
  "oklch(0.60 0.15 130)",
  "oklch(0.68 0.12 25)",
];

export function PerformanceClient({
  users,
  freights,
  occurrences,
}: {
  users: UserRest[];
  freights: FreightNode[];
  occurrences: OccurrenceRest[];
}) {
  const [dateStart, setDateStart] = useState("2025-01-01");
  const [dateEnd, setDateEnd] = useState(new Date().toISOString().split("T")[0]);

  const userMap = useMemo(() => {
    const map: Record<number, string> = {};
    users.forEach((u) => { map[u.id] = u.name; });
    return map;
  }, [users]);

  const filteredFreights = useMemo(() => {
    return freights.filter((f) => {
      const date = f.serviceAt?.split("T")[0] || "";
      return date >= dateStart && date <= dateEnd;
    });
  }, [freights, dateStart, dateEnd]);

  const filteredOccurrences = useMemo(() => {
    return occurrences.filter((o) => {
      const date = o.occurrence_at?.split("T")[0] || "";
      return date >= dateStart && date <= dateEnd;
    });
  }, [occurrences, dateStart, dateEnd]);

  const userStats = useMemo(() => {
    const stats: Record<number, { name: string; freights: number; totalValue: number; totalWeight: number }> = {};
    filteredFreights.forEach((f) => {
      const uid = f.userId || 0;
      if (!stats[uid]) stats[uid] = { name: userMap[uid] || `User #${uid}`, freights: 0, totalValue: 0, totalWeight: 0 };
      stats[uid].freights += 1;
      stats[uid].totalValue += f.total;
      stats[uid].totalWeight += f.realWeight;
    });
    return Object.entries(stats)
      .map(([id, data]) => ({ id: Number(id), ...data }))
      .sort((a, b) => b.freights - a.freights);
  }, [filteredFreights, userMap]);

  const occurrencesByUser = useMemo(() => {
    const stats: Record<number, { name: string; count: number }> = {};
    filteredOccurrences.forEach((o) => {
      const uid = o.user_id || o.creator_user_id || 0;
      if (!stats[uid]) stats[uid] = { name: userMap[uid] || `User #${uid}`, count: 0 };
      stats[uid].count += 1;
    });
    return Object.entries(stats)
      .map(([id, data]) => ({ id: Number(id), ...data }))
      .sort((a, b) => b.count - a.count);
  }, [filteredOccurrences, userMap]);

  const totalFreights = filteredFreights.length;
  const totalValue = filteredFreights.reduce((s, f) => s + f.total, 0);
  const topUser = userStats[0];

  const chartConfig = {
    freights: { label: "Fretes", color: "var(--chart-1)" },
  } satisfies ChartConfig;

  const chartData = userStats.slice(0, 10).map((u) => ({
    name: u.name.length > 16 ? u.name.slice(0, 16) + "..." : u.name,
    freights: u.freights,
    value: u.totalValue,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Performance</h2>
        <p className="text-muted-foreground mt-1">
          Desempenho dos usuarios na emissao de fretes e ocorrencias
        </p>
      </div>

      <DateFilter dateStart={dateStart} dateEnd={dateEnd} onStartChange={setDateStart} onEndChange={setDateEnd} />

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/15 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Usuarios Ativos
            </CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground mt-1">{userStats.length} com fretes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total Emitido
            </CardTitle>
            <FileText className="h-4 w-4 text-chart-2" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalFreights}</div>
            <p className="text-xs text-muted-foreground mt-1">fretes no periodo</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Valor Total
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-chart-2" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{fmtCurrency(totalValue)}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/5 to-amber-500/15 border-amber-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Top Emissor
            </CardTitle>
            <Trophy className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">{topUser?.name || "-"}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {topUser?.freights || 0} fretes • {fmtCurrency(topUser?.totalValue || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-5">
        {/* Chart */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Fretes por Usuario</CardTitle>
            <CardDescription>Ranking de emissao</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[400px] w-full">
              <BarChart data={chartData} layout="vertical" accessibilityLayer margin={{ left: 10 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                <XAxis type="number" tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={120} tick={{ fontSize: 11 }} />
                <ChartTooltip
                  content={<ChartTooltipContent formatter={(v) => `${v} fretes`} />}
                />
                <Bar dataKey="freights" fill="var(--color-freights)" radius={[0, 6, 6, 0]} barSize={18} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Ranking Visual */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Ranking Detalhado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {userStats.map((u, i) => {
                const maxFreights = userStats[0]?.freights || 1;
                const maxValue = userStats.reduce((max, s) => Math.max(max, s.totalValue), 1);
                const freightPct = (u.freights / maxFreights) * 100;
                const valuePct = (u.totalValue / maxValue) * 100;
                return (
                  <div key={u.id} className="rounded-xl border bg-card/50 p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white shrink-0"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      >
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{u.name}</p>
                        <p className="text-[10px] text-muted-foreground">{(u.totalWeight / 1000).toFixed(0)}t transportadas</p>
                      </div>
                    </div>
                    {/* Bars */}
                    <div className="space-y-2">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Fretes</span>
                          <span className="text-xs font-bold">{u.freights}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(freightPct, 4)}%`, backgroundColor: COLORS[i % COLORS.length] }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Valor</span>
                          <span className="text-xs font-bold">{fmtCurrency(u.totalValue)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500 opacity-60"
                            style={{ width: `${Math.max(valuePct, 4)}%`, backgroundColor: COLORS[i % COLORS.length] }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Occurrences by User */}
      <Card>
        <CardHeader>
          <CardTitle>Ocorrencias por Usuario</CardTitle>
          <CardDescription>Quem registrou mais ocorrencias</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {occurrencesByUser.slice(0, 8).map((u, i) => (
              <div
                key={u.id}
                className="flex items-center gap-3 rounded-xl border bg-card/50 p-3"
              >
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold text-white shrink-0"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                >
                  {u.count}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{u.name}</p>
                  <p className="text-[10px] text-muted-foreground">ocorrencias registradas</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Users Directory */}
      <Card>
        <CardHeader>
          <CardTitle>Diretorio de Usuarios</CardTitle>
          <CardDescription>{users.length} usuarios cadastrados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {users.map((u) => {
              const stat = userStats.find((s) => s.id === u.id);
              return (
                <div
                  key={u.id}
                  className="flex items-center gap-3 rounded-lg border bg-card/50 p-3"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                    {u.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{u.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                  </div>
                  {stat && (
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {stat.freights} fretes
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
