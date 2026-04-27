"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Truck,
  Clock,
  User,
  Trophy,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DateFilter } from "@/components/date-filter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DriverNode, FreightManifestNode } from "@/lib/esl-api";

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}
function fmtShort(v: number) {
  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return fmt(v);
}

function fmtPct(v: number) {
  return `${v.toFixed(1)}%`;
}

/**
 * Expands inclusive date range to YYYY-MM-DD strings, intersecting with [filterStart, filterEnd].
 * Used to count "days on the road" from manifest departuredAt → closedAt.
 */
function expandTravelDays(
  start: string | null | undefined,
  end: string | null | undefined,
  filterStart: string,
  filterEnd: string
): string[] {
  if (!start || !end) return [];
  const s = start.split("T")[0];
  const e = end.split("T")[0];
  const lo = s > filterStart ? s : filterStart;
  const hi = e < filterEnd ? e : filterEnd;
  if (lo > hi) return [];
  const days: string[] = [];
  const cur = new Date(lo + "T00:00:00");
  const end_ = new Date(hi + "T00:00:00");
  while (cur <= end_) {
    days.push(cur.toISOString().split("T")[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

export function MotoristaClient({ drivers, freights }: { drivers: DriverNode[]; freights: FreightManifestNode[] }) {
  const today = new Date().toISOString().split("T")[0];
  const yearStart = `${new Date().getFullYear()}-01-01`;

  const [search, setSearch] = useState("");
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);
  const [dateStart, setDateStart] = useState(yearStart);
  const [dateEnd, setDateEnd] = useState(today);

  // Freights with manifest + driver
  const freightsWithDriver = useMemo(() => {
    return freights.filter((f) => f.lastManifest?.mainDriverId);
  }, [freights]);

  // Map driverId -> driver name (from manifest freights, since IDs don't match individual IDs)
  // We'll build a map of mainDriverId -> inferred name from the drivers list or use ID
  const driverMap = useMemo(() => {
    const map: Record<number, string> = {};
    // Collect all unique driver IDs from manifests
    freightsWithDriver.forEach((f) => {
      const did = f.lastManifest!.mainDriverId!;
      if (!map[did]) map[did] = `Motorista #${did}`;
    });
    // Also add all drivers from the individual query
    drivers.forEach((d) => {
      map[Number(d.id)] = d.name;
    });
    return map;
  }, [freightsWithDriver, drivers]);

  // All known driver IDs (from manifests + individual list)
  const allDriverIds = useMemo(() => {
    const ids = new Set<number>();
    freightsWithDriver.forEach((f) => ids.add(f.lastManifest!.mainDriverId!));
    drivers.forEach((d) => ids.add(Number(d.id)));
    return [...ids].sort((a, b) => {
      const nameA = driverMap[a] || "";
      const nameB = driverMap[b] || "";
      return nameA.localeCompare(nameB);
    });
  }, [freightsWithDriver, drivers, driverMap]);

  // Filter drivers by search
  const filteredDriverIds = allDriverIds.filter((id) => {
    if (!search) return true;
    const name = driverMap[id] || "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  // IDs that have freight data
  const driverIdsWithData = useMemo(() => {
    return new Set(freightsWithDriver.map((f) => f.lastManifest!.mainDriverId!));
  }, [freightsWithDriver]);

  // Selected driver's freights filtered by date
  const driverFreights = useMemo(() => {
    if (!selectedDriverId) return [];
    return freightsWithDriver.filter((f) => {
      if (f.lastManifest!.mainDriverId !== selectedDriverId) return false;
      const date = f.serviceAt.split("T")[0];
      return date >= dateStart && date <= dateEnd;
    });
  }, [selectedDriverId, freightsWithDriver, dateStart, dateEnd]);

  // Driver summary
  const summary = useMemo(() => {
    if (driverFreights.length === 0) return null;
    const revenue = driverFreights.reduce((s, f) => s + f.total, 0);
    const weight = driverFreights.reduce((s, f) => s + f.realWeight, 0);
    const km = driverFreights.reduce((s, f) => s + (f.lastManifest?.km || 0), 0);
    const traveledKm = driverFreights.reduce((s, f) => s + (f.lastManifest?.traveledKm || 0), 0);
    const fuelCost = driverFreights.reduce((s, f) => s + (f.lastManifest?.fuelSubtotal || 0), 0);
    const tollCost = driverFreights.reduce((s, f) => s + (f.lastManifest?.tollSubtotal || 0), 0);
    const dailyCost = driverFreights.reduce((s, f) => s + (f.lastManifest?.dailySubtotal || 0), 0);
    const expensesCost = driverFreights.reduce((s, f) => s + (f.lastManifest?.expensesSubtotal || 0), 0);
    const freightCost = driverFreights.reduce((s, f) => s + (f.lastManifest?.freightSubtotal || 0), 0);
    const deliveryCost = driverFreights.reduce((s, f) => s + (f.lastManifest?.deliverySubtotal || 0), 0);
    const totalCost = fuelCost + tollCost + dailyCost + expensesCost + freightCost + deliveryCost;
    const result = revenue - totalCost;
    const plates = [...new Set(driverFreights.map((f) => f.lastManifest?.vehicle?.licensePlate).filter(Boolean))] as string[];
    const routes = driverFreights.map((f) => ({
      origin: `${f.originCity.name}/${f.originCity.state.code}`,
      dest: `${f.destinationCity.name}/${f.destinationCity.state.code}`,
    }));
    // Travel days: expand each unique manifest's [departuredAt → closedAt] (intersected with filter).
    // Fallback to serviceAt for manifests without those timestamps.
    const seenManifests = new Set<number>();
    const travelDaySet = new Set<string>();
    driverFreights.forEach((f) => {
      const m = f.lastManifest;
      if (!m) return;
      if (seenManifests.has(m.id)) return;
      seenManifests.add(m.id);
      const days = expandTravelDays(m.departuredAt, m.closedAt, dateStart, dateEnd);
      if (days.length > 0) {
        days.forEach((d) => travelDaySet.add(d));
      } else {
        travelDaySet.add(f.serviceAt.split("T")[0]);
      }
    });
    const uniqueDays = travelDaySet;

    const days = uniqueDays.size || 1;

    return {
      trips: driverFreights.length,
      revenue, weight, km, traveledKm,
      fuelCost, tollCost, dailyCost, expensesCost, freightCost, deliveryCost,
      totalCost, result,
      plates, routes,
      daysWorked: uniqueDays.size,
      marginPct: revenue > 0 ? (result / revenue) * 100 : 0,
      kmPerDay: km / days,
      tripsPerDay: driverFreights.length / days,
      revenuePerKm: km > 0 ? revenue / km : 0,
      fuelPctOfRevenue: revenue > 0 ? (fuelCost / revenue) * 100 : 0,
    };
  }, [driverFreights, dateStart, dateEnd]);

  const selectedName = selectedDriverId ? driverMap[selectedDriverId] || `#${selectedDriverId}` : null;

  // Ranking — aggregation per driver (with date filter applied)
  type DriverAgg = {
    id: number;
    name: string;
    trips: number;
    revenue: number;
    costs: number;
    result: number;
    marginPct: number;
    km: number;
    days: number;
    revenuePerKm: number;
  };
  const byDriver = useMemo<DriverAgg[]>(() => {
    const map = new Map<
      number,
      DriverAgg & { uniqueDays: Set<string>; seenManifests: Set<number> }
    >();
    freightsWithDriver.forEach((f) => {
      const date = f.serviceAt.split("T")[0];
      if (date < dateStart || date > dateEnd) return;
      const did = f.lastManifest!.mainDriverId!;
      const m = f.lastManifest!;
      if (!map.has(did)) {
        map.set(did, {
          id: did,
          name: driverMap[did] || `Motorista #${did}`,
          trips: 0,
          revenue: 0,
          costs: 0,
          result: 0,
          marginPct: 0,
          km: 0,
          days: 0,
          revenuePerKm: 0,
          uniqueDays: new Set<string>(),
          seenManifests: new Set<number>(),
        });
      }
      const agg = map.get(did)!;
      agg.trips += 1;
      agg.revenue += f.total || 0;
      agg.costs +=
        (m.freightSubtotal || 0) +
        (m.deliverySubtotal || 0) +
        (m.fuelSubtotal || 0) +
        (m.tollSubtotal || 0) +
        (m.dailySubtotal || 0) +
        (m.expensesSubtotal || 0);
      agg.km += m.km || 0;
      // Travel days: expand departuredAt → closedAt once per manifest
      if (!agg.seenManifests.has(m.id)) {
        agg.seenManifests.add(m.id);
        const days = expandTravelDays(m.departuredAt, m.closedAt, dateStart, dateEnd);
        if (days.length > 0) {
          days.forEach((d) => agg.uniqueDays.add(d));
        } else {
          agg.uniqueDays.add(date);
        }
      }
    });
    return [...map.values()].map((d) => ({
      id: d.id,
      name: d.name,
      trips: d.trips,
      revenue: d.revenue,
      costs: d.costs,
      result: d.revenue - d.costs,
      marginPct: d.revenue > 0 ? ((d.revenue - d.costs) / d.revenue) * 100 : 0,
      km: d.km,
      days: d.uniqueDays.size,
      revenuePerKm: d.km > 0 ? d.revenue / d.km : 0,
    }));
  }, [freightsWithDriver, dateStart, dateEnd, driverMap]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Motorista</h2>
        <p className="text-muted-foreground mt-1">Performance individual - resultado por motorista</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[250px] max-w-md">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Motorista</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Buscar motorista..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            <DateFilter dateStart={dateStart} dateEnd={dateEnd} onStartChange={setDateStart} onEndChange={setDateEnd} />
            {selectedDriverId && (
              <button onClick={() => setSelectedDriverId(null)} className="text-xs text-primary hover:underline pb-2">Limpar</button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Selected Driver Profile */}
      {selectedDriverId && selectedName && (
        <>
          {/* Profile Card */}
          <Card className="border-primary/30 bg-gradient-to-r from-primary/5 via-primary/8 to-transparent">
            <CardContent className="pt-6">
              <div className="flex items-center gap-5">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/15 ring-2 ring-primary/30">
                  <User className="h-10 w-10 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold">{selectedName}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {dateStart} a {dateEnd} | {driverFreights.length} viagens
                  </p>
                  {summary && summary.plates.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {summary.plates.map((p) => (
                        <Badge key={p} variant="outline" className="font-mono text-xs">{p}</Badge>
                      ))}
                    </div>
                  )}
                </div>
                {summary && (
                  <div className={`text-right px-6 py-4 rounded-xl border-2 ${
                    summary.result >= 0
                      ? "border-emerald-500/40 bg-emerald-500/10"
                      : "border-red-500/40 bg-red-500/10"
                  }`}>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Resultado</p>
                    <p className={`text-3xl font-bold ${summary.result >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {fmt(summary.result)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {summary.marginPct.toFixed(1)}% de margem
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* KPI Grid */}
          {summary && (
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-8">
              <Card>
                <CardContent className="pt-4 pb-4 px-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Viagens</p>
                  <p className="text-2xl font-bold mt-1">{summary.trips}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4 px-4" title="Dias em viagem (manifest.departuredAt → manifest.closedAt)">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Dias em Viagem</p>
                  <p className="text-2xl font-bold mt-1">{summary.daysWorked}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4 px-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Faturamento</p>
                  <p className="text-xl font-bold mt-1 text-emerald-400">{fmtShort(summary.revenue)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4 px-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Despesas</p>
                  <p className="text-xl font-bold mt-1 text-red-400">{fmtShort(summary.totalCost)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4 px-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">KM Rodados</p>
                  <p className="text-2xl font-bold mt-1">{summary.km.toLocaleString("pt-BR")}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4 px-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Peso</p>
                  <p className="text-2xl font-bold mt-1">{(summary.weight / 1000).toFixed(1)}t</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4 px-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Veículos</p>
                  <p className="text-2xl font-bold mt-1">{summary.plates.length}</p>
                </CardContent>
              </Card>
              <Card className={summary.result >= 0 ? "border-emerald-500/20 bg-emerald-500/5" : "border-red-500/20 bg-red-500/5"}>
                <CardContent className="pt-4 pb-4 px-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Margem %</p>
                  <p className={`text-2xl font-bold mt-1 ${summary.result >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {summary.marginPct.toFixed(1)}%
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Produtividade (KPIs derivados) */}
          {summary && (
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
              <Card>
                <CardContent className="pt-4 pb-4 px-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Km/dia</p>
                  <p className="text-2xl font-bold mt-1">
                    {summary.kmPerDay.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">média rodada</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4 px-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Viagens/dia</p>
                  <p className="text-2xl font-bold mt-1">{summary.tripsPerDay.toFixed(2)}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">cadência</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4 px-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">R$/km</p>
                  <p className="text-2xl font-bold mt-1">{fmt(summary.revenuePerKm)}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">receita por km</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4 px-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Combustível</p>
                  <p className={`text-2xl font-bold mt-1 ${
                    summary.fuelPctOfRevenue > 30 ? "text-red-400" :
                    summary.fuelPctOfRevenue > 20 ? "text-amber-400" : "text-foreground"
                  }`}>
                    {fmtPct(summary.fuelPctOfRevenue)}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{fmtShort(summary.fuelCost)} da receita</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Timeline Cronológica */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Linha do Tempo - {selectedName}
                  </CardTitle>
                  <CardDescription>{dateStart} a {dateEnd} | Todas as atividades em ordem cronológica</CardDescription>
                </div>
                {summary && (
                  <div className="flex gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-emerald-400" />
                      <span className="text-muted-foreground">Receita: <span className="text-emerald-400 font-semibold">{fmt(summary.revenue)}</span></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-red-400" />
                      <span className="text-muted-foreground">Despesas: <span className="text-red-400 font-semibold">{fmt(summary.totalCost)}</span></span>
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {driverFreights.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Truck className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-lg font-medium">Nenhum registro no período</p>
                  <p className="text-sm mt-1">Ajuste as datas ou selecione outro motorista</p>
                </div>
              ) : (
                <div className="rounded-xl border overflow-hidden">
                  {/* Table Header */}
                  <div className="grid grid-cols-[100px_36px_1fr_120px_100px_100px_1fr] gap-2 px-4 py-2.5 bg-muted/50 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <div>Data</div>
                    <div></div>
                    <div>Tipo</div>
                    <div>Ocorrência</div>
                    <div>Origem</div>
                    <div>Destino</div>
                    <div>Cliente / Detalhe</div>
                  </div>

                  {/* Rows - build events from freight data */}
                  {(() => {
                    type TimelineEvent = {
                      date: string;
                      dateFormatted: string;
                      type: string;
                      legend: "faturamento" | "despesa" | "info" | "alerta";
                      occurrence: string;
                      origin: string;
                      originUf: string;
                      dest: string;
                      destUf: string;
                      client: string;
                      value: number;
                      plate: string;
                    };

                    const events: TimelineEvent[] = [];

                    driverFreights.forEach((f) => {
                      const dt = f.serviceAt.split("T")[0];
                      const dtFmt = new Date(f.serviceAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
                      const plate = f.lastManifest?.vehicle?.licensePlate || "";

                      // Faturamento
                      events.push({
                        date: dt, dateFormatted: dtFmt,
                        type: `Faturamento - CT-e #${f.sequenceCode}`,
                        legend: "faturamento", occurrence: "Frete",
                        origin: f.originCity.name, originUf: f.originCity.state.code,
                        dest: f.destinationCity.name, destUf: f.destinationCity.state.code,
                        client: f.recipient.name, value: f.total, plate,
                      });

                      // Despesas do manifesto (se houver)
                      const m = f.lastManifest;
                      if (m) {
                        if (m.fuelSubtotal > 0) {
                          events.push({ date: dt, dateFormatted: dtFmt, type: "Abastecimento - DIESEL", legend: "despesa", occurrence: "Combustível", origin: "", originUf: "", dest: "", destUf: "", client: `Manifesto #${m.id}`, value: -m.fuelSubtotal, plate });
                        }
                        if (m.tollSubtotal > 0) {
                          events.push({ date: dt, dateFormatted: dtFmt, type: "Pedágio", legend: "despesa", occurrence: "Pedágio", origin: "", originUf: "", dest: "", destUf: "", client: `Manifesto #${m.id}`, value: -m.tollSubtotal, plate });
                        }
                        if (m.dailySubtotal > 0) {
                          events.push({ date: dt, dateFormatted: dtFmt, type: "Diária", legend: "despesa", occurrence: "Diária", origin: "", originUf: "", dest: "", destUf: "", client: `Manifesto #${m.id}`, value: -m.dailySubtotal, plate });
                        }
                        if (m.expensesSubtotal > 0) {
                          events.push({ date: dt, dateFormatted: dtFmt, type: "Despesa Operacional", legend: "despesa", occurrence: "Despesa", origin: "", originUf: "", dest: "", destUf: "", client: `Manifesto #${m.id}`, value: -m.expensesSubtotal, plate });
                        }
                        if (m.freightSubtotal > 0) {
                          events.push({ date: dt, dateFormatted: dtFmt, type: "Custo Manifesto Frete", legend: "despesa", occurrence: "Custo Frete", origin: "", originUf: "", dest: "", destUf: "", client: `Manifesto #${m.id}`, value: -m.freightSubtotal, plate });
                        }
                      }
                    });

                    // Sort by date
                    events.sort((a, b) => a.date.localeCompare(b.date) || a.legend.localeCompare(b.legend));

                    const legendIcons: Record<string, { icon: string; bg: string; text: string }> = {
                      faturamento: { icon: "✓", bg: "bg-emerald-500/20", text: "text-emerald-400" },
                      despesa: { icon: "▼", bg: "bg-red-500/20", text: "text-red-400" },
                      info: { icon: "●", bg: "bg-blue-500/20", text: "text-blue-400" },
                      alerta: { icon: "!", bg: "bg-amber-500/20", text: "text-amber-400" },
                    };

                    // Running total
                    let runningTotal = 0;

                    return (
                      <>
                        {events.map((ev, i) => {
                          const leg = legendIcons[ev.legend];
                          runningTotal += ev.value;
                          return (
                            <div key={i} className="grid grid-cols-[100px_36px_1fr_120px_100px_100px_1fr] gap-2 px-4 py-2 border-t border-border/20 items-center text-sm hover:bg-muted/20 transition-colors">
                              <div className="text-xs text-muted-foreground font-mono">{ev.dateFormatted.split(" ")[0]}<br/><span className="text-[10px]">{ev.dateFormatted.split(" ")[1]}</span></div>
                              <div>
                                <div className={`flex h-6 w-6 items-center justify-center rounded text-[10px] font-bold ${leg.bg} ${leg.text}`}>
                                  {leg.icon}
                                </div>
                              </div>
                              <div>
                                <p className="text-xs font-medium truncate">{ev.type}</p>
                                {ev.plate && <span className="text-[10px] text-muted-foreground font-mono">{ev.plate}</span>}
                              </div>
                              <div className="text-xs text-muted-foreground">{ev.occurrence}</div>
                              <div className="text-xs">{ev.origin}{ev.originUf ? <span className="text-muted-foreground ml-1">{ev.originUf}</span> : ""}</div>
                              <div className="text-xs">{ev.dest}{ev.destUf ? <span className="text-muted-foreground ml-1">{ev.destUf}</span> : ""}</div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs truncate max-w-[200px]">{ev.client}</span>
                                <span className={`text-xs font-mono font-semibold shrink-0 ml-2 ${ev.value >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                  {ev.value >= 0 ? "+" : ""}{fmt(ev.value)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                        {/* Total Row */}
                        <div className="grid grid-cols-[100px_36px_1fr_120px_100px_100px_1fr] gap-2 px-4 py-3 border-t-2 border-border bg-muted/30 items-center font-semibold">
                          <div></div>
                          <div></div>
                          <div className="text-sm">Total</div>
                          <div className="text-xs text-muted-foreground">{events.length} registros</div>
                          <div></div>
                          <div></div>
                          <div className="text-right">
                            <span className={`text-sm font-mono ${runningTotal >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                              {fmt(runningTotal)}
                            </span>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Ranking comparativo (sem motorista selecionado) */}
      {!selectedDriverId && byDriver.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" /> Ranking de motoristas
                </CardTitle>
                <CardDescription>
                  Performance no período · click numa linha para ver o detalhe
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">
                {byDriver.length} com viagens
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Motorista</TableHead>
                  <TableHead className="text-right">Viagens</TableHead>
                  <TableHead className="text-right">Dias</TableHead>
                  <TableHead className="text-right">Km</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-right">Custos</TableHead>
                  <TableHead className="text-right">Resultado</TableHead>
                  <TableHead className="text-right">Margem</TableHead>
                  <TableHead className="text-right">R$/km</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...byDriver]
                  .sort((a, b) => b.result - a.result)
                  .map((d, i) => (
                    <TableRow
                      key={d.id}
                      className="cursor-pointer hover:bg-accent/50"
                      onClick={() => {
                        setSelectedDriverId(d.id);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {i + 1}
                      </TableCell>
                      <TableCell className="text-sm font-medium max-w-[200px] truncate">
                        {d.name}
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono">{d.trips}</TableCell>
                      <TableCell className="text-right text-xs font-mono">{d.days}</TableCell>
                      <TableCell className="text-right text-xs font-mono">
                        {d.km > 0 ? d.km.toLocaleString("pt-BR") : "—"}
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono">
                        {fmt(d.revenue)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono text-red-400/80">
                        {fmt(d.costs)}
                      </TableCell>
                      <TableCell
                        className={`text-right text-xs font-mono font-bold ${
                          d.result >= 0 ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {fmt(d.result)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-mono ${
                            d.marginPct >= 20
                              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                              : d.marginPct >= 0
                              ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                              : "bg-red-500/15 text-red-400 border-red-500/30"
                          }`}
                        >
                          {d.marginPct >= 0 ? (
                            <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                          ) : (
                            <TrendingDown className="h-2.5 w-2.5 mr-0.5" />
                          )}
                          {fmtPct(d.marginPct)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono text-muted-foreground">
                        {d.km > 0 ? fmt(d.revenuePerKm) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Driver List */}
      <Card>
        <CardHeader>
          <CardTitle>Motoristas</CardTitle>
          <CardDescription>
            {drivers.length} motoristas cadastrados | {driverIdsWithData.size} com viagens vinculadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {filteredDriverIds.map((id) => {
              const name = driverMap[id] || `#${id}`;
              const hasData = driverIdsWithData.has(id);
              const isSelected = selectedDriverId === id;
              return (
                <button
                  key={id}
                  onClick={() => {
                    setSelectedDriverId(isSelected ? null : id);
                    if (!isSelected) window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all hover:border-primary/40 ${
                    isSelected
                      ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                      : hasData
                      ? "border-border hover:bg-accent/50"
                      : "border-border/50 opacity-50 hover:opacity-75"
                  }`}
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold shrink-0 ${
                    isSelected ? "bg-primary text-primary-foreground" : hasData ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  }`}>
                    {name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {hasData ? "Com viagens" : "Sem viagens no período"}
                    </p>
                  </div>
                  {hasData && (
                    <div className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
