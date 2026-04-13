"use client";

import { useState, useMemo } from "react";
import {
  Gauge, Fuel, Truck, Activity, Zap, Thermometer,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Pie, PieChart, Cell, Label } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent,
} from "@/components/ui/chart";

function fmt(v: number) { return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtInt(v: number) { return Math.round(v).toLocaleString("pt-BR"); }
function fmtCur(v: number) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v); }

const COLORS = ["oklch(0.68 0.19 265)","oklch(0.75 0.18 165)","oklch(0.78 0.15 55)","oklch(0.70 0.20 310)","oklch(0.72 0.14 80)","oklch(0.58 0.15 200)","oklch(0.65 0.12 130)","oklch(0.68 0.18 25)"];
const ML: Record<string,string> = {"01":"Janeiro","02":"Fevereiro","03":"Março","04":"Abril","05":"Maio","06":"Junho","07":"Julho","08":"Agosto","09":"Setembro","10":"Outubro","11":"Novembro","12":"Dezembro"};

interface VehicleTelemetry {
  plate: string; driver: string; ignition: boolean; date: string; location: string;
  lat: number; lng: number;
  odometer: number; fuelTotal: number; kml: number; speed: number; rpm: number;
  engineTemp: number; fuelLevel: number; coolantTemp: number;
}

export function TelemetriaClient({ vehicles }: { vehicles: VehicleTelemetry[] }) {
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [selectedPlate, setSelectedPlate] = useState("all");

  const [year, month] = selectedMonth.split("-");
  const monthLabel = `${ML[month]} ${year}`;

  const allPlates = useMemo(() => [...new Set(vehicles.map((v) => v.plate))].sort(), [vehicles]);

  // Valid = realistic km/l for trucks (1.0 to 4.0)
  const validVehicles = useMemo(() => vehicles.filter((v) => v.odometer > 0 && v.fuelTotal > 100 && v.kml >= 1.0 && v.kml <= 4.0), [vehicles]);

  // Filter by plate
  const displayVehicles = useMemo(() => {
    if (selectedPlate === "all") return validVehicles;
    return validVehicles.filter((v) => v.plate === selectedPlate);
  }, [validVehicles, selectedPlate]);

  const selectedVehicle = selectedPlate !== "all" ? vehicles.find((v) => v.plate === selectedPlate) : null;

  const totalKm = displayVehicles.reduce((s, v) => s + v.odometer, 0);
  const totalLiters = displayVehicles.reduce((s, v) => s + v.fuelTotal, 0);
  const avgKml = totalLiters > 0 ? totalKm / totalLiters : 0;

  // Ranking by km/l
  const ranking = useMemo(() => [...displayVehicles].sort((a, b) => b.kml - a.kml), [displayVehicles]);

  // Distribution by kml range
  const kmlRanges = useMemo(() => {
    const ranges = [
      { name: "> 2.5 km/l", min: 2.5, max: 99, count: 0, color: COLORS[0] },
      { name: "2.0 - 2.5", min: 2.0, max: 2.5, count: 0, color: COLORS[1] },
      { name: "1.5 - 2.0", min: 1.5, max: 2.0, count: 0, color: COLORS[2] },
      { name: "< 1.5 km/l", min: 0, max: 1.5, count: 0, color: COLORS[3] },
    ];
    displayVehicles.forEach((v) => { const r = ranges.find((r) => v.kml >= r.min && v.kml < r.max); if (r) r.count += 1; });
    return ranges.filter((r) => r.count > 0);
  }, [displayVehicles]);

  const availableMonths = useMemo(() => {
    const months: string[] = [];
    for (let i = 0; i < 12; i++) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`); }
    return months;
  }, []);

  // Brand data (demo - until Vehicle List API is available)
  const brandData = [
    { brand: "VOLVO", km: 368500, pctKm: 30.40, liters: 147655, kml: 2.50, economy: 18308, color: "#003057" },
    { brand: "DAF", km: 230577, pctKm: 19.02, liters: 99017, kml: 2.33, economy: 6662.4, color: "#004B93" },
    { brand: "MAN", km: 172135, pctKm: 14.20, liters: 79905, kml: 2.15, economy: 3691.45, color: "#1D1D1B" },
    { brand: "M.BENZ", km: 163440, pctKm: 13.48, liters: 70507, kml: 2.32, economy: 0, color: "#333333" },
    { brand: "SCANIA", km: 150998, pctKm: 12.46, liters: 67676, kml: 2.23, economy: 5564.37, color: "#C8102E" },
    { brand: "VOLKSWAGEN", km: 126394, pctKm: 10.43, liters: 66680, kml: 1.90, economy: 2265.82, color: "#001E50" },
  ];
  const avgKmlBrand = 2.28;

  // Model + Traction data
  const modelData = [
    { brand: "VOLVO", model: "FH-460", traction: "6x2", kml: 2.68 },
    { brand: "DAF", model: "XF 105 FTS 460", traction: "6x2", kml: 2.94 },
    { brand: "DAF", model: "XF FTS480", traction: "6x2", kml: 2.53 },
    { brand: "M.BENZ", model: "2544 S", traction: "6x2", kml: 2.38 },
    { brand: "M.BENZ", model: "2544 S/LS", traction: "6x2", kml: 2.25 },
    { brand: "M.BENZ", model: "2546 LS", traction: "6x2", kml: 2.80 },
    { brand: "M.BENZ", model: "1933 S/ LS 2P", traction: "4x2", kml: 1.69 },
    { brand: "MAN", model: "TGX 28.440", traction: "6x2", kml: 2.52 },
    { brand: "SCANIA", model: "R-450", traction: "6x2", kml: 2.77 },
    { brand: "VOLKSWAGEN", model: "METEOR 28.480", traction: "6x2", kml: 2.35 },
    { brand: "VOLVO", model: "FH-540", traction: "6x4", kml: 1.65 },
    { brand: "DAF", model: "XF 105 FTT 510", traction: "6x4", kml: 1.76 },
    { brand: "DAF", model: "XF FTT530", traction: "6x4", kml: 1.65 },
    { brand: "M.BENZ", model: "2644 S/LS", traction: "6x4", kml: 2.27 },
    { brand: "M.BENZ", model: "2651 S", traction: "6x4", kml: 2.35 },
    { brand: "MAN", model: "TGX 29.480", traction: "6x4", kml: 1.57 },
    { brand: "SCANIA", model: "R-500", traction: "6x4", kml: 2.06 },
    { brand: "SCANIA", model: "R-540", traction: "6x4", kml: 1.73 },
    { brand: "VOLKSWAGEN", model: "METEOR 29.520", traction: "6x4", kml: 1.64 },
    { brand: "VOLKSWAGEN", model: "METEOR 29.530", traction: "6x4", kml: 1.58 },
  ];
  const modelAvgKml = 2.05;
  const bestModel = [...modelData].sort((a, b) => b.kml - a.kml)[0];
  const worstModel = [...modelData].sort((a, b) => a.kml - b.kml)[0];
  const avg6x2 = (() => { const d = modelData.filter((m) => m.traction === "6x2"); return d.reduce((s, m) => s + m.kml, 0) / d.length; })();
  const avg6x4 = (() => { const d = modelData.filter((m) => m.traction === "6x4"); return d.reduce((s, m) => s + m.kml, 0) / d.length; })();
  const avg4x2 = (() => { const d = modelData.filter((m) => m.traction === "4x2"); return d.length > 0 ? d.reduce((s, m) => s + m.kml, 0) / d.length : 0; })();

  const pieCfg: ChartConfig = {};
  kmlRanges.forEach((r) => { pieCfg[r.name] = { label: r.name, color: r.color }; });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Telemetria <span className="text-primary">| {monthLabel}</span>
          </h2>
          <p className="text-muted-foreground mt-1">Dados em tempo real - Elithium / SSX</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedPlate} onValueChange={(v) => setSelectedPlate(v ?? "all")}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Placa" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as placas</SelectItem>
              {allPlates.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedMonth} onValueChange={(v) => setSelectedMonth(v ?? currentMonthKey)}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {availableMonths.map((m) => { const [y, mo] = m.split("-"); return <SelectItem key={m} value={m}>{ML[mo]} {y}</SelectItem>; })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Selected Vehicle Detail */}
      {selectedVehicle && (
        <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="pt-6">
            <div className="flex items-center gap-5">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 ring-2 ring-primary/30">
                <Truck className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold font-mono">{selectedVehicle.plate}</h3>
                <p className="text-sm text-muted-foreground">{selectedVehicle.driver}</p>
                <p className="text-xs text-muted-foreground">{selectedVehicle.location}</p>
              </div>
              <div className="grid grid-cols-4 gap-6 text-center">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Ignição</p>
                  <div className={`h-3 w-3 rounded-full mx-auto mt-1 ${selectedVehicle.ignition ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" : "bg-muted-foreground/30"}`} />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Velocidade</p>
                  <p className="text-lg font-bold mt-0.5">{selectedVehicle.speed.toFixed(0)} km/h</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">RPM</p>
                  <p className="text-lg font-bold mt-0.5">{selectedVehicle.rpm.toFixed(0)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Combustível</p>
                  <p className="text-lg font-bold mt-0.5">{selectedVehicle.fuelLevel.toFixed(0)}%</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-primary font-bold mb-3">KPI Produtividade</p>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-1"><CardTitle className="text-sm font-bold uppercase tracking-wide text-primary">Km/l</CardTitle></CardHeader>
            <CardContent>
              <div className="text-4xl font-extrabold">{fmt(avgKml)}</div>
              <p className="text-xs text-muted-foreground mt-1">{displayVehicles.length} veículos</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-emerald-500">
            <CardHeader className="pb-1"><CardTitle className="text-sm font-bold uppercase tracking-wide text-emerald-400">KM Total</CardTitle></CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold">{fmtInt(totalKm)}</div>
              <p className="text-xs text-muted-foreground mt-1">odômetro acumulado</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="pb-1"><CardTitle className="text-sm font-bold uppercase tracking-wide text-amber-400">Litros</CardTitle></CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold">{fmtInt(totalLiters)}</div>
              <p className="text-xs text-muted-foreground mt-1">consumidos</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-violet-500">
            <CardHeader className="pb-1"><CardTitle className="text-sm font-bold uppercase tracking-wide text-violet-400">Frota</CardTitle></CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold">{vehicles.length}</div>
              <p className="text-xs text-muted-foreground mt-1">{vehicles.filter((v) => v.ignition).length} com ignição ligada</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Cards Montadoras */}
      {selectedPlate === "all" && (
        <div>
          <p className="text-[10px] uppercase tracking-widest text-primary font-bold mb-3">Análise Km e Consumo por Montadora</p>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
            {brandData.map((b, i) => (
              <Card key={b.brand} className="overflow-hidden relative">
                <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: b.color }} />
                <CardContent className="pt-5 pb-5 px-5">
                  {/* Brand Header */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20 shrink-0">
                      <BrandLogo brand={b.brand} size={44} />
                    </div>
                    <div>
                      <p className="text-xl font-extrabold tracking-tight">{b.brand}</p>
                      <p className="text-xs text-muted-foreground">{b.pctKm.toFixed(1)}% da frota</p>
                    </div>
                    <div className="ml-auto text-right">
                      <p className={`text-2xl font-extrabold ${b.kml >= avgKmlBrand ? "text-emerald-400" : "text-amber-400"}`}>{fmt(b.kml)}</p>
                      <p className="text-[10px] text-muted-foreground">km/l</p>
                    </div>
                  </div>
                  {/* Metrics */}
                  <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border/30">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">KM</p>
                      <p className="text-sm font-bold mt-0.5">{fmtInt(b.km)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Litros</p>
                      <p className="text-sm font-bold mt-0.5">{fmtInt(b.liters)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Economia</p>
                      <p className={`text-sm font-bold mt-0.5 ${b.economy > 0 ? "text-emerald-400" : "text-muted-foreground/40"}`}>{b.economy > 0 ? fmtCur(b.economy) : "---"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Distribuição Km/l */}
        <Card>
          <CardHeader><CardTitle>Distribuição de Consumo (Km/l)</CardTitle></CardHeader>
          <CardContent>
            {kmlRanges.length > 0 ? (
              <>
                <ChartContainer config={pieCfg} className="h-[280px] w-full">
                  <PieChart accessibilityLayer>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Pie data={kmlRanges.map((d) => ({ name: d.name, value: d.count }))} dataKey="value" nameKey="name" innerRadius={65} outerRadius={110} strokeWidth={3} stroke="var(--background)">
                      {kmlRanges.map((d, i) => <Cell key={i} fill={d.color} />)}
                      <Label content={({ viewBox }) => {
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                          return (<text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                            <tspan x={viewBox.cx} y={(viewBox.cy || 0) - 6} className="fill-foreground text-2xl font-bold">{fmt(avgKml)}</tspan>
                            <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 14} className="fill-muted-foreground text-xs">km/l médio</tspan>
                          </text>);
                        }
                      }} />
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <div className="flex flex-wrap gap-4 justify-center mt-2">
                  {kmlRanges.map((d) => (
                    <div key={d.name} className="flex items-center gap-2 text-xs">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} /><span>{d.name}: <strong>{d.count}</strong></span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-center py-8 text-muted-foreground">Selecione uma placa com dados válidos</p>
            )}
          </CardContent>
        </Card>

        {/* Ranking km/l */}
        <Card>
          <CardHeader><CardTitle>Ranking por Consumo (Km/l)</CardTitle><CardDescription>Veículos mais econômicos</CardDescription></CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              {ranking.slice(0, 10).map((v, i) => (
                <div key={v.plate} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: COLORS[i % COLORS.length] }}>{i + 1}</div>
                      <Badge variant="outline" className="font-mono text-[10px]">{v.plate}</Badge>
                      <span className="text-xs text-muted-foreground truncate max-w-[120px]">{v.driver}</span>
                    </div>
                    <span className={`font-bold font-mono ${v.kml >= avgKml ? "text-emerald-400" : "text-amber-400"}`}>{fmt(v.kml)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min((v.kml / 3) * 100, 100)}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comparativo por Tração */}
      {selectedPlate === "all" && (
        <div>
          <p className="text-[10px] uppercase tracking-widest text-primary font-bold mb-3">Comparativo por Tração</p>
          <div className="grid gap-4 grid-cols-3">
            {[
              { traction: "6x2", avg: avg6x2, count: modelData.filter((m) => m.traction === "6x2").length, color: "oklch(0.68 0.19 265)", desc: "Mais econômico - longas distâncias" },
              { traction: "6x4", avg: avg6x4, count: modelData.filter((m) => m.traction === "6x4").length, color: "oklch(0.58 0.15 200)", desc: "Maior tração - cargas pesadas" },
              { traction: "4x2", avg: avg4x2, count: modelData.filter((m) => m.traction === "4x2").length, color: "oklch(0.65 0.12 130)", desc: "Urbano / leve" },
            ].filter((t) => t.count > 0).map((t) => (
              <Card key={t.traction} className="relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: t.color }} />
                <CardContent className="pt-6 text-center">
                  <p className="text-4xl font-extrabold font-mono" style={{ color: t.color }}>{t.traction}</p>
                  <p className={`text-3xl font-extrabold mt-2 ${t.avg >= modelAvgKml ? "text-emerald-400" : "text-amber-400"}`}>{fmt(t.avg)} <span className="text-sm font-normal text-muted-foreground">km/l</span></p>
                  <p className="text-xs text-muted-foreground mt-2">{t.count} modelos</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{t.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Tabela por Modelo e Tração */}
      {selectedPlate === "all" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Consumo por Modelo e Tração</CardTitle>
                <CardDescription>Todos os modelos da frota agrupados por tipo de tração</CardDescription>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded bg-emerald-500/30" /><span className="text-muted-foreground">Acima da média ({fmt(modelAvgKml)})</span></div>
                <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded bg-amber-500/30" /><span className="text-muted-foreground">Abaixo da média</span></div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {(["6x2", "6x4", "4x2"] as const).map((traction) => {
              const models = modelData.filter((m) => m.traction === traction).sort((a, b) => b.kml - a.kml);
              if (models.length === 0) return null;
              const maxKml = Math.max(...modelData.map((m) => m.kml));

              return (
                <div key={traction} className="mb-6 last:mb-0">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className="font-mono text-sm px-3 py-1">{traction}</Badge>
                    <span className="text-xs text-muted-foreground">{models.length} modelos</span>
                    <span className="text-xs font-medium ml-auto">Média: {fmt(models.reduce((s, m) => s + m.kml, 0) / models.length)} km/l</span>
                  </div>
                  <div className="space-y-1.5">
                    {models.map((m, i) => {
                      const barWidth = (m.kml / maxKml) * 100;
                      const isAboveAvg = m.kml >= modelAvgKml;
                      const isBest = m.kml === bestModel.kml;
                      const isWorst = m.kml === worstModel.kml;

                      return (
                        <div key={`${m.brand}-${m.model}`} className={`grid grid-cols-[180px_1fr_100px] gap-3 items-center rounded-lg px-3 py-2.5 ${
                          isBest ? "bg-emerald-500/10 ring-1 ring-emerald-500/20" :
                          isWorst ? "bg-red-500/10 ring-1 ring-red-500/20" :
                          isAboveAvg ? "bg-emerald-500/5" : "bg-amber-500/5"
                        }`}>
                          <div className="flex items-center gap-2.5">
                            <BrandLogo brand={m.brand} size={22} />
                            <div>
                              <p className="text-[10px] text-muted-foreground leading-none">{m.brand}</p>
                              <p className="text-sm font-extrabold leading-tight">{m.model}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-3 rounded-full bg-muted/50 overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{
                                width: `${barWidth}%`,
                                backgroundColor: isBest ? "oklch(0.75 0.18 165)" : isWorst ? "oklch(0.65 0.22 22)" : isAboveAvg ? "oklch(0.65 0.15 165)" : "oklch(0.65 0.12 55)",
                              }} />
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`text-sm font-bold font-mono ${
                              isBest ? "text-emerald-400" : isWorst ? "text-red-400" : isAboveAvg ? "text-emerald-400/80" : "text-amber-400"
                            }`}>{fmt(m.kml)}</span>
                            <span className="text-[10px] text-muted-foreground ml-1">km/l</span>
                            {isBest && <Badge variant="secondary" className="text-[8px] ml-1 px-1 py-0">MELHOR</Badge>}
                            {isWorst && <Badge variant="destructive" className="text-[8px] ml-1 px-1 py-0">PIOR</Badge>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {/* Total */}
            <div className="flex items-center justify-between pt-4 mt-4 border-t-2 border-border">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">Total Geral</span>
                <Badge variant="outline" className="text-xs">{modelData.length} modelos</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-extrabold text-primary font-mono">{fmt(modelAvgKml)}</span>
                <span className="text-xs text-muted-foreground">km/l</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle>Frota - Dados de Telemetria</CardTitle>
          <CardDescription>{displayVehicles.length} veículos com dados válidos de {vehicles.length} rastreados</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Placa</TableHead>
                <TableHead>Motorista</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead className="text-center">Ign.</TableHead>
                <TableHead className="text-right">Odômetro</TableHead>
                <TableHead className="text-right">Litros</TableHead>
                <TableHead className="text-right">Km/l</TableHead>
                <TableHead className="text-right">Última pos.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranking.map((v) => (
                <TableRow key={v.plate} className={selectedPlate === v.plate ? "bg-primary/10" : ""}>
                  <TableCell className="font-mono font-bold text-sm">{v.plate}</TableCell>
                  <TableCell className="text-sm truncate max-w-[140px]">{v.driver}</TableCell>
                  <TableCell className="text-xs text-muted-foreground truncate max-w-[140px]">{v.location}</TableCell>
                  <TableCell className="text-center"><div className={`h-2.5 w-2.5 rounded-full mx-auto ${v.ignition ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" : "bg-muted-foreground/30"}`} /></TableCell>
                  <TableCell className="text-right font-mono text-sm">{fmtInt(v.odometer)} km</TableCell>
                  <TableCell className="text-right font-mono text-sm">{fmtInt(v.fuelTotal)} L</TableCell>
                  <TableCell className="text-right"><Badge variant={v.kml >= avgKml ? "secondary" : "outline"} className={`font-mono ${v.kml >= avgKml ? "text-emerald-400" : ""}`}>{fmt(v.kml)}</Badge></TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">{new Date(v.date).toLocaleDateString("pt-BR")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Status Grid */}
      <Card>
        <CardHeader><CardTitle>Status da Frota em Tempo Real</CardTitle><CardDescription>Todos os {vehicles.length} veículos rastreados</CardDescription></CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {vehicles.sort((a, b) => a.plate.localeCompare(b.plate)).map((v) => (
              <button
                key={v.plate}
                onClick={() => { setSelectedPlate(selectedPlate === v.plate ? "all" : v.plate); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all hover:border-primary/40 ${
                  selectedPlate === v.plate ? "border-primary bg-primary/10 ring-1 ring-primary/30" :
                  v.ignition ? "border-emerald-500/30 bg-emerald-500/5" : ""
                }`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg shrink-0 ${v.ignition ? "bg-emerald-500/20 text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                  <Truck className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold font-mono">{v.plate}</p>
                    <div className={`h-2 w-2 rounded-full ${v.ignition ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground/30"}`} />
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">{v.driver}</p>
                  {v.kml >= 1.0 && v.kml <= 4.0 && (
                    <p className="text-[10px] font-mono text-muted-foreground">{fmt(v.kml)} km/l | {fmtInt(v.odometer)} km</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
