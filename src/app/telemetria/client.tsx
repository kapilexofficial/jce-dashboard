"use client";

import { useState, useMemo } from "react";
import {
  Gauge, Fuel, Truck, Thermometer, Battery, Route, TrendingUp, Activity,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis, Label } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent,
} from "@/components/ui/chart";

export interface PositionPoint {
  date: string;
  odometer: number;
  fuelTotal: number;
  fuelLevel: number;
  coolantTemp: number;
  oilTemp: number;
  battery: number;
  gear: number;
  ignition: boolean;
  lat: number;
  lng: number;
  location: string;
}

export interface VehicleHistory {
  plate: string;
  driver: string;
  model: string;
  points: PositionPoint[];
}

function fmt(v: number, digits = 2) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
function fmtInt(v: number) {
  return Math.round(v).toLocaleString("pt-BR");
}

const COLORS = [
  "oklch(0.68 0.19 265)",
  "oklch(0.75 0.18 165)",
  "oklch(0.78 0.15 55)",
  "oklch(0.70 0.20 310)",
  "oklch(0.72 0.14 80)",
  "oklch(0.58 0.15 200)",
];

function toDateInput(iso: string) {
  return iso.split("T")[0];
}

interface VehicleMetrics {
  plate: string;
  driver: string;
  model: string;
  pointsInPeriod: number;
  kmRodados: number;
  litros: number;
  kml: number;
  startDate: string;
  endDate: string;
  fuelLevelLast: number;
  coolantTempLast: number;
  oilTempLast: number;
  batteryLast: number;
  ignitionLast: boolean;
  latLast: number;
  lngLast: number;
  locationLast: string;
}

function computeMetrics(v: VehicleHistory, startTs: number, endTs: number): VehicleMetrics | null {
  const inRange = v.points.filter((p) => {
    const t = new Date(p.date).getTime();
    return t >= startTs && t <= endTs;
  });
  if (inRange.length === 0) return null;

  const first = inRange[0];
  const last = inRange[inRange.length - 1];

  const kmRodados = Math.max(0, last.odometer - first.odometer);
  const litros = Math.max(0, last.fuelTotal - first.fuelTotal);
  const kml = litros > 0 ? kmRodados / litros : 0;

  return {
    plate: v.plate,
    driver: v.driver,
    model: v.model,
    pointsInPeriod: inRange.length,
    kmRodados,
    litros,
    kml,
    startDate: first.date,
    endDate: last.date,
    fuelLevelLast: last.fuelLevel,
    coolantTempLast: last.coolantTemp,
    oilTempLast: last.oilTemp,
    batteryLast: last.battery,
    ignitionLast: last.ignition,
    latLast: last.lat,
    lngLast: last.lng,
    locationLast: last.location,
  };
}

export function TelemetriaClient({ vehicles }: { vehicles: VehicleHistory[] }) {
  const allDates = useMemo(() => {
    const times: number[] = [];
    for (const v of vehicles) {
      for (const p of v.points) times.push(new Date(p.date).getTime());
    }
    return times;
  }, [vehicles]);

  const windowMin = allDates.length > 0 ? new Date(Math.min(...allDates)) : new Date();
  const windowMax = allDates.length > 0 ? new Date(Math.max(...allDates)) : new Date();

  const [dateStart, setDateStart] = useState(toDateInput(windowMin.toISOString()));
  const [dateEnd, setDateEnd] = useState(toDateInput(windowMax.toISOString()));
  const [selectedPlate, setSelectedPlate] = useState("all");

  const startTs = new Date(`${dateStart}T00:00:00`).getTime();
  const endTs = new Date(`${dateEnd}T23:59:59`).getTime();

  const metrics = useMemo(() => {
    return vehicles
      .map((v) => computeMetrics(v, startTs, endTs))
      .filter((m): m is VehicleMetrics => m !== null && m.kmRodados > 0);
  }, [vehicles, startTs, endTs]);

  const displayMetrics = useMemo(() => {
    if (selectedPlate === "all") return metrics;
    return metrics.filter((m) => m.plate === selectedPlate);
  }, [metrics, selectedPlate]);

  const totalKm = displayMetrics.reduce((s, v) => s + v.kmRodados, 0);
  const totalLiters = displayMetrics.reduce((s, v) => s + v.litros, 0);
  const avgKml = totalLiters > 0 ? totalKm / totalLiters : 0;
  const ignitionOn = displayMetrics.filter((v) => v.ignitionLast).length;

  const ranking = useMemo(
    () => [...displayMetrics].filter((v) => v.kml > 0).sort((a, b) => b.kml - a.kml),
    [displayMetrics]
  );

  const kmlDistribution = useMemo(() => {
    const buckets = [
      { name: "> 3.0 km/l", min: 3.0, max: 99, count: 0, color: COLORS[0] },
      { name: "2.5 - 3.0", min: 2.5, max: 3.0, count: 0, color: COLORS[1] },
      { name: "2.0 - 2.5", min: 2.0, max: 2.5, count: 0, color: COLORS[2] },
      { name: "1.5 - 2.0", min: 1.5, max: 2.0, count: 0, color: COLORS[3] },
      { name: "1.0 - 1.5", min: 1.0, max: 1.5, count: 0, color: COLORS[4] },
      { name: "< 1.0 km/l", min: 0, max: 1.0, count: 0, color: COLORS[5] },
    ];
    for (const v of displayMetrics.filter((v) => v.kml > 0)) {
      const b = buckets.find((r) => v.kml >= r.min && v.kml < r.max);
      if (b) b.count += 1;
    }
    return buckets.filter((b) => b.count > 0);
  }, [displayMetrics]);

  const top10Km = useMemo(() => [...displayMetrics].sort((a, b) => b.kmRodados - a.kmRodados).slice(0, 10), [displayMetrics]);

  const chartConfig = {
    count: { label: "Veículos" },
    kmRodados: { label: "Km", color: "oklch(0.68 0.19 265)" },
  } satisfies ChartConfig;

  const windowStartLocal = windowMin.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  const windowEndLocal = windowMax.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  const windowHours = Math.round((windowMax.getTime() - windowMin.getTime()) / 3600000);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          Telemetria <span className="text-muted-foreground font-normal text-lg">/ Consumo por período</span>
        </h2>
        <p className="text-muted-foreground mt-1">
          Cálculo delta das posições Elithium — km rodados, litros consumidos, km/l real
        </p>
      </div>

      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="pt-4 text-xs text-muted-foreground">
          <span className="font-semibold text-amber-400">Janela disponível na API:</span>{" "}
          {windowStartLocal} → {windowEndLocal} ({windowHours}h). O filtro abaixo opera dentro dessa janela.
          Para histórico mensal é necessário coleta diária em base local (em desenvolvimento).
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Início</label>
              <Input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} className="w-[160px]" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Fim</label>
              <Input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} className="w-[160px]" />
            </div>
            <div className="min-w-[200px]">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Veículo</label>
              <Select value={selectedPlate} onValueChange={(v) => setSelectedPlate(v ?? "all")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toda a frota</SelectItem>
                  {vehicles.map((v) => (
                    <SelectItem key={v.plate} value={v.plate}>{v.plate} — {v.driver}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-bold uppercase tracking-wide text-primary">Km/l médio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold">{fmt(avgKml)}</div>
            <p className="text-xs text-muted-foreground mt-1">no período</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-bold uppercase tracking-wide text-emerald-400">Km rodados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold">{fmtInt(totalKm)}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Route className="h-3 w-3" /> total frota</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-bold uppercase tracking-wide text-amber-400">Litros consumidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold">{fmtInt(totalLiters)}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Fuel className="h-3 w-3" /> diesel</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-violet-500">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-bold uppercase tracking-wide text-violet-400">Frota</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold">{displayMetrics.length}</div>
            <p className="text-xs text-muted-foreground mt-1">com dados no período</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-sky-500">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-bold uppercase tracking-wide text-sky-400">Ignição ligada</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold">{ignitionOn}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Activity className="h-3 w-3" /> agora</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Consumo (Km/l)</CardTitle>
            <CardDescription>{displayMetrics.filter((v) => v.kml > 0).length} veículos com km/l calculado</CardDescription>
          </CardHeader>
          <CardContent>
            {kmlDistribution.length > 0 ? (
              <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[280px]">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                  <Pie data={kmlDistribution} dataKey="count" nameKey="name" innerRadius={60} strokeWidth={2}>
                    {kmlDistribution.map((r) => <Cell key={r.name} fill={r.color} />)}
                    <Label
                      position="center"
                      content={({ viewBox }) => {
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                          return (
                            <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                              <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-bold">
                                {fmt(avgKml)}
                              </tspan>
                              <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 18} className="fill-muted-foreground text-xs">
                                km/l médio
                              </tspan>
                            </text>
                          );
                        }
                        return null;
                      }}
                    />
                  </Pie>
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-sm text-muted-foreground">Sem dados no período</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 10 — Km rodados</CardTitle>
            <CardDescription>veículos mais rodados no período</CardDescription>
          </CardHeader>
          <CardContent>
            {top10Km.length > 0 ? (
              <ChartContainer config={chartConfig} className="max-h-[320px] w-full">
                <BarChart data={top10Km} layout="vertical" margin={{ left: 30 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="plate" type="category" width={80} tickLine={false} axisLine={false} className="text-xs font-mono" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="kmRodados" fill="var(--color-kmRodados)" radius={4} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-sm text-muted-foreground">Sem dados no período</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Gauge className="h-5 w-5 text-primary" /> Detalhamento por veículo</CardTitle>
          <CardDescription>
            {displayMetrics.length} veículos no período ·{" "}
            {ranking.length > 0 && <>melhor: <span className="font-mono font-semibold text-emerald-400">{ranking[0].plate}</span> ({fmt(ranking[0].kml)} km/l)</>}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Placa</TableHead>
                <TableHead>Motorista</TableHead>
                <TableHead className="text-right">Km</TableHead>
                <TableHead className="text-right">Litros</TableHead>
                <TableHead className="text-right">Km/l</TableHead>
                <TableHead className="text-right">Nível</TableHead>
                <TableHead className="text-right">Bateria</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayMetrics.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhum veículo com dados no período selecionado</TableCell>
                </TableRow>
              )}
              {[...displayMetrics].sort((a, b) => b.kmRodados - a.kmRodados).map((v) => (
                <TableRow key={v.plate}>
                  <TableCell className="font-mono font-semibold">{v.plate}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{v.driver}</TableCell>
                  <TableCell className="text-right font-mono">{fmtInt(v.kmRodados)}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(v.litros, 1)}</TableCell>
                  <TableCell className="text-right font-mono">
                    <span className={v.kml >= 2.5 ? "text-emerald-400 font-semibold" : v.kml >= 1.5 ? "" : "text-amber-400"}>{fmt(v.kml)}</span>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {v.fuelLevelLast > 0 ? `${fmtInt(v.fuelLevelLast)}%` : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {v.batteryLast > 0 ? (
                      <span className="inline-flex items-center gap-1"><Battery className="h-3 w-3" /> {fmt(v.batteryLast, 1)}V</span>
                    ) : "—"}
                  </TableCell>
                  <TableCell>
                    {v.ignitionLast
                      ? <Badge variant="default" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Ligado</Badge>
                      : <Badge variant="outline">Desligado</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Thermometer className="h-5 w-5 text-primary" /> Saúde do motor (snapshot atual)</CardTitle>
          <CardDescription>Últimas leituras de temperatura por veículo</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Placa</TableHead>
                <TableHead className="text-right">Líquido arref.</TableHead>
                <TableHead className="text-right">Óleo motor</TableHead>
                <TableHead>Localização</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayMetrics.slice(0, 15).map((v) => (
                <TableRow key={v.plate}>
                  <TableCell className="font-mono font-semibold">{v.plate}</TableCell>
                  <TableCell className="text-right font-mono">
                    <span className={v.coolantTempLast > 95 ? "text-red-400" : v.coolantTempLast > 85 ? "text-amber-400" : "text-emerald-400"}>
                      {v.coolantTempLast > 0 ? `${fmtInt(v.coolantTempLast)}°C` : "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    <span className={v.oilTempLast > 110 ? "text-red-400" : v.oilTempLast > 95 ? "text-amber-400" : "text-emerald-400"}>
                      {v.oilTempLast > 0 ? `${fmtInt(v.oilTempLast)}°C` : "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground truncate max-w-[300px]">{v.locationLast || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
