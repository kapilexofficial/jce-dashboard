"use client";

import { useState, useMemo } from "react";
import {
  DollarSign, Truck, AlertTriangle, Fuel, Wrench, Clock, Users, TrendingUp,
  ArrowUpRight, ArrowDownRight, MapPin, Trophy, Gauge, BarChart3, Weight,
} from "lucide-react";
import { Pie, PieChart, Cell, Bar, BarChart, XAxis, YAxis, CartesianGrid, Line, LineChart, Label } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent,
} from "@/components/ui/chart";
import type { FreightMargin, OccurrenceRest, FreightManifestNode, DriverNode, ServiceOrderAggregated } from "@/lib/esl-api";

function fmt(v: number) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v); }
function fmtShort(v: number) { if (Math.abs(v) >= 1e6) return `R$ ${(v/1e6).toFixed(1)}M`; if (Math.abs(v) >= 1e3) return `R$ ${(v/1e3).toFixed(0)}k`; return fmt(v); }

const COLORS = ["oklch(0.68 0.19 265)","oklch(0.75 0.18 165)","oklch(0.78 0.15 55)","oklch(0.70 0.20 310)","oklch(0.72 0.14 80)","oklch(0.58 0.15 200)","oklch(0.65 0.12 130)","oklch(0.68 0.18 25)","oklch(0.55 0.16 280)","oklch(0.62 0.10 100)"];
const ML: Record<string,string> = {"01":"Janeiro","02":"Fevereiro","03":"Março","04":"Abril","05":"Maio","06":"Junho","07":"Julho","08":"Agosto","09":"Setembro","10":"Outubro","11":"Novembro","12":"Dezembro"};
const MS: Record<string,string> = {"01":"Jan","02":"Fev","03":"Mar","04":"Abr","05":"Mai","06":"Jun","07":"Jul","08":"Ago","09":"Set","10":"Out","11":"Nov","12":"Dez"};

interface Props { margins: FreightMargin[]; occurrences: OccurrenceRest[]; freights: FreightManifestNode[]; drivers: DriverNode[]; telemetryConnected: boolean; eventCount: number; serviceOrders: ServiceOrderAggregated[]; }

export function FechamentoClient({ margins: allMargins, occurrences: allOccurrences, freights: allFreights, drivers, telemetryConnected, eventCount, serviceOrders: allServiceOrders }: Props) {
  const availableMonths = useMemo(() => {
    const m = new Set<string>();
    allMargins.forEach((x) => m.add(x.service_at.slice(0,7)));
    allFreights.forEach((x) => m.add(x.serviceAt.slice(0,7)));
    return [...m].sort().reverse();
  }, [allMargins, allFreights]);

  const currentMonth = availableMonths[0] || new Date().toISOString().slice(0,7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const [year, month] = selectedMonth.split("-");
  const monthLabel = `${ML[month]} ${year}`;

  const margins = useMemo(() => allMargins.filter((m) => m.service_at.startsWith(selectedMonth)), [allMargins, selectedMonth]);
  const freights = useMemo(() => allFreights.filter((f) => f.serviceAt.startsWith(selectedMonth)), [allFreights, selectedMonth]);
  const occurrences = useMemo(() => allOccurrences.filter((o) => o.occurrence_at.startsWith(selectedMonth)), [allOccurrences, selectedMonth]);
  const serviceOrders = useMemo(() => allServiceOrders.filter((o) => o.serviceAt.startsWith(selectedMonth)), [allServiceOrders, selectedMonth]);

  // ===== MANUTENÇÃO (ESL Data Export 6573) =====
  const osAbertas = serviceOrders.filter((o) => o.status === "pending").length;
  const osEncerradas = serviceOrders.filter((o) => o.status === "finished" || o.status === "delivered").length;
  const osTotalCost = serviceOrders.reduce((s, o) => s + o.total, 0);
  const osByBrand = useMemo(() => {
    const map: Record<string, number> = {};
    serviceOrders.forEach((o) => {
      const b = (o.brand || "Sem marca").toUpperCase();
      map[b] = (map[b] || 0) + 1;
    });
    const total = serviceOrders.length;
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([name, count]) => ({ name, count, pct: total > 0 ? (count / total) * 100 : 0 }));
  }, [serviceOrders]);

  // ===== FATURAMENTO =====
  const totalRevenue = margins.reduce((s,m) => s + parseFloat(m.freight_total), 0);
  const totalWeight = margins.reduce((s,m) => s + parseFloat(m.real_weight), 0);
  const uniqueVehiclePlates = new Set(freights.filter((f)=>f.lastManifest?.vehicle).map((f)=>f.lastManifest!.vehicle.licensePlate));
  const vehicleCount = uniqueVehiclePlates.size || margins.length;
  const avgPerVehicle = vehicleCount > 0 ? totalRevenue / vehicleCount : 0;

  // Group by client (first word)
  const byClientGroup = useMemo(() => {
    const map: Record<string,{revenue:number;count:number}> = {};
    margins.forEach((m) => {
      const fw = m.sender.name.split(" ")[0].toUpperCase();
      const g = fw === "SPAL" || m.sender.name.toUpperCase().includes("SPAL") ? "SPAL" : fw === "HNK" || m.sender.name.toUpperCase().includes("HNK") ? "HNK" : fw;
      if (!map[g]) map[g] = {revenue:0,count:0};
      map[g].revenue += parseFloat(m.freight_total);
      map[g].count += 1;
    });
    const arr = Object.entries(map).sort(([,a],[,b]) => b.revenue - a.revenue);
    const top = arr.slice(0,7);
    const othersRev = arr.slice(7).reduce((s,[,d]) => s+d.revenue, 0);
    if (othersRev > 0) top.push(["Outros", {revenue:othersRev,count:0}]);
    return top.map(([name,data]) => ({name,...data,pct:totalRevenue>0?(data.revenue/totalRevenue)*100:0}));
  }, [margins, totalRevenue]);

  // ===== COMPARATIVO MENSAL =====
  const monthlyData = useMemo(() => {
    const map: Record<string,number> = {};
    allMargins.forEach((m) => { const k = m.service_at.slice(0,7); map[k] = (map[k]||0) + parseFloat(m.freight_total); });
    return Object.entries(map).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>({ key:k, month:`${MS[k.split("-")[1]]}/${k.slice(2,4)}`, revenue:v }));
  }, [allMargins]);

  // ===== OCORRÊNCIAS =====
  const occTotal = occurrences.length;
  const occByCode = useMemo(() => {
    const map: Record<string,{count:number;cost:number}> = {};
    occurrences.forEach((o) => {
      const desc = o.occurrence.description;
      if (!map[desc]) map[desc] = {count:0,cost:0};
      map[desc].count += 1;
      map[desc].cost += o.freight.total;
    });
    return Object.entries(map).sort(([,a],[,b]) => b.cost - a.cost).slice(0,5).map(([name,data])=>({name,...data}));
  }, [occurrences]);

  // ===== MOTORISTAS =====
  const driverStats = useMemo(() => {
    const map: Record<number,{revenue:number;km:number;trips:number}> = {};
    freights.filter((f)=>f.lastManifest?.mainDriverId).forEach((f) => {
      const did = f.lastManifest!.mainDriverId!;
      if (!map[did]) map[did] = {revenue:0,km:0,trips:0};
      map[did].revenue += f.total;
      map[did].km += f.lastManifest?.km || 0;
      map[did].trips += 1;
    });
    const driverNameMap: Record<number,string> = {};
    drivers.forEach((d) => { driverNameMap[Number(d.id)] = d.name; });
    return Object.entries(map)
      .map(([id,data]) => ({id:Number(id), name: driverNameMap[Number(id)] || `Motorista #${id}`, ...data}))
      .sort((a,b) => b.revenue - a.revenue);
  }, [freights, drivers]);

  const totalTrips = freights.length;
  const tripsWithManifest = freights.filter((f)=>f.lastManifest).length;
  const totalKm = freights.reduce((s,f) => s + (f.lastManifest?.km || 0), 0);

  const pieCfg: ChartConfig = {};
  byClientGroup.forEach((c,i) => { pieCfg[c.name] = {label:c.name,color:COLORS[i%COLORS.length]}; });

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Fechamento Mensal <span className="text-primary">| {monthLabel}</span>
          </h2>
          <p className="text-muted-foreground mt-1">Análise Mensal - J.C.E Transportes</p>
        </div>
        <Select value={selectedMonth} onValueChange={(v) => setSelectedMonth(v ?? currentMonth)}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {availableMonths.map((m) => { const [y,mo]=m.split("-"); return <SelectItem key={m} value={m}>{ML[mo]} {y}</SelectItem>; })}
          </SelectContent>
        </Select>
      </div>

      {/* ============ SEÇÃO 1: FATURAMENTO ============ */}
      <section className="space-y-4">
        <h3 className="text-xl font-bold uppercase tracking-wide text-primary border-b border-primary/30 pb-2">
          Faturamento - {MS[month]}/{year.slice(2)}
        </h3>
        <div className="grid gap-6 md:grid-cols-5">
          {/* Pie - Participação por cliente */}
          <Card className="md:col-span-3">
            <CardHeader><CardTitle>Participação por Cliente</CardTitle></CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <ChartContainer config={pieCfg} className="h-[280px] w-full">
                  <PieChart accessibilityLayer>
                    <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmt(Number(v))} />} />
                    <Pie data={byClientGroup.map((c)=>({name:c.name,value:c.revenue}))} dataKey="value" nameKey="name" outerRadius={110} strokeWidth={2} stroke="var(--background)"
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      label={(p:any) => `${p.name}; ${fmtShort(p.value)}; ${p.pct?.toFixed?.(0) || ((p.percent||0)*100).toFixed(0)}%`}
                    >
                      {byClientGroup.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <div className="space-y-2">
                  {byClientGroup.map((c,i) => (
                    <div key={c.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-sm" style={{backgroundColor:COLORS[i%COLORS.length]}} /><span>{c.name}</span></div>
                      <span className="font-mono font-medium">{c.pct.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KPIs Faturamento */}
          <div className="md:col-span-2 space-y-4">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/20 border-primary/30">
              <CardContent className="pt-6 text-center">
                <DollarSign className="h-8 w-8 mx-auto text-primary/60 mb-2" />
                <p className="text-4xl font-extrabold text-primary">{fmt(totalRevenue)}</p>
                <p className="text-sm text-muted-foreground mt-1">Faturamento Total</p>
              </CardContent>
            </Card>
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-4 pb-4 text-center">
                  <p className="text-2xl font-bold">{vehicleCount}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Veículos utilizados</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4 text-center">
                  <p className="text-xl font-bold">{fmt(avgPerVehicle)}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Fat. médio/veículo</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* ============ SEÇÃO 2: COMPARATIVO MENSAL ============ */}
      <section className="space-y-4">
        <h3 className="text-xl font-bold uppercase tracking-wide text-primary border-b border-primary/30 pb-2">
          Comparativo Mensal
        </h3>
        <Card>
          <CardContent className="pt-6">
            <ChartContainer config={{revenue:{label:"Faturamento",color:"oklch(0.68 0.19 265)"}}} className="h-[300px] w-full">
              <BarChart data={monthlyData} accessibilityLayer>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{fontSize:11}} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(v)=>fmtShort(v)} tick={{fontSize:10}} />
                <ChartTooltip content={<ChartTooltipContent formatter={(v)=>fmt(Number(v))} />} />
                <Bar dataKey="revenue" radius={[4,4,0,0]} barSize={32}
                  label={{position:"top" as const,fontSize:9,fill:"oklch(0.6 0.1 265)",formatter:((v:unknown)=>Number(v)>0?fmtShort(Number(v)):"") as never}}
                >
                  {monthlyData.map((d,i) => <Cell key={i} fill={d.key===selectedMonth ? "oklch(0.68 0.19 265)" : "oklch(0.35 0.05 265)"} />)}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </section>

      {/* ============ SEÇÃO 3: OCORRÊNCIAS ============ */}
      <section className="space-y-4">
        <h3 className="text-xl font-bold uppercase tracking-wide text-primary border-b border-primary/30 pb-2">
          Ocorrências - {MS[month]}/{year.slice(2)}
        </h3>
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-4xl font-extrabold">{occTotal}</p>
              <p className="text-xs text-muted-foreground mt-1">Total de Ocorrências</p>
            </CardContent>
          </Card>
          {occByCode.slice(0,3).map((o,i) => (
            <Card key={o.name}>
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-2xl font-bold">{o.count}</p>
                <p className="text-xs text-muted-foreground mt-1 truncate">{o.name}</p>
                <p className="text-xs font-medium text-amber-400 mt-0.5">{fmt(o.cost)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ============ SEÇÃO 4: TELEMETRIA (Elithium) ============ */}
      <section className="space-y-4">
        <h3 className="text-xl font-bold uppercase tracking-wide text-primary border-b border-primary/30 pb-2">
          Telemetria - {MS[month]}/{year.slice(2)}
          {telemetryConnected
            ? <Badge variant="secondary" className="ml-3 text-[10px] font-normal align-middle">Elithium conectada</Badge>
            : <Badge variant="outline" className="ml-3 text-[10px] font-normal align-middle">Aguardando permissões</Badge>
          }
        </h3>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20">
            <CardContent className="pt-6 text-center space-y-1">
              <Gauge className="h-8 w-8 mx-auto text-blue-400/60" />
              <p className="text-3xl font-extrabold">{totalKm > 0 ? totalKm.toLocaleString("pt-BR") : "---"} km</p>
              <p className="text-xs text-muted-foreground">Distância total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center space-y-1">
              <Fuel className="h-8 w-8 mx-auto text-muted-foreground/40" />
              <p className="text-3xl font-extrabold text-muted-foreground/40">--- L</p>
              <p className="text-xs text-muted-foreground">Litros consumidos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center space-y-1">
              <TrendingUp className="h-8 w-8 mx-auto text-muted-foreground/40" />
              <p className="text-3xl font-extrabold text-muted-foreground/40">--- km/l</p>
              <p className="text-xs text-muted-foreground">Consumo médio geral</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ============ SEÇÃO 5: ABASTECIMENTO (aguardando sistema externo) ============ */}
      <section className="space-y-4">
        <h3 className="text-xl font-bold uppercase tracking-wide text-primary border-b border-primary/30 pb-2">
          Abastecimento - {MS[month]}/{year.slice(2)}
          <Badge variant="outline" className="ml-3 text-[10px] font-normal align-middle">Aguardando sistema de abastecimento</Badge>
        </h3>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border-emerald-500/20">
            <CardContent className="pt-6 text-center space-y-1">
              <Fuel className="h-8 w-8 mx-auto text-emerald-400/60" />
              <p className="text-3xl font-extrabold text-emerald-400">---</p>
              <p className="text-xs text-muted-foreground">Total em abastecimentos</p>
              <p className="text-[10px] text-muted-foreground">Total de litros: ---</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-600/10 to-emerald-600/20 border-emerald-600/20">
            <CardContent className="pt-6 text-center space-y-1">
              <DollarSign className="h-8 w-8 mx-auto text-emerald-500/60" />
              <p className="text-sm text-emerald-400">R$ Economizado</p>
              <p className="text-3xl font-extrabold text-emerald-400">---</p>
              <p className="text-xs text-muted-foreground">Desconto médio/litro: ---</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 space-y-2">
              <p className="text-sm font-semibold">Postos Utilizados</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Rede credenciada</span><span className="font-mono">---</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Total postos</span><span className="font-mono">---</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Litros negociados</span><span className="font-mono">---</span></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ============ SEÇÃO 6: MANUTENÇÃO (ESL Data Export 6573) ============ */}
      <section className="space-y-4">
        <h3 className="text-xl font-bold uppercase tracking-wide text-primary border-b border-primary/30 pb-2">
          Manutenção - {MS[month]}/{year.slice(2)}
        </h3>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-center gap-8">
                <div className="text-center"><p className="text-3xl font-extrabold text-primary">{osAbertas}</p><p className="text-xs text-muted-foreground">Abertas</p></div>
                <Wrench className="h-8 w-8 text-primary/60 self-center" />
                <div className="text-center"><p className="text-3xl font-extrabold text-emerald-400">{osEncerradas}</p><p className="text-xs text-muted-foreground">Encerradas</p></div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-500/5 to-red-500/10 border-red-500/20">
            <CardContent className="pt-6 text-center">
              <Wrench className="h-8 w-8 mx-auto text-red-400 mb-2" />
              <p className="text-3xl font-extrabold">{fmtShort(osTotalCost)}</p>
              <p className="text-xs text-muted-foreground">Custo total (peças + mão de obra)</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">% OS por fabricante</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {osByBrand.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhuma OS no período</p>
              ) : osByBrand.map((b, i) => (
                <div key={b.name} className="flex items-center gap-2 text-xs">
                  <span className="w-24 truncate" title={b.name}>{b.name}</span>
                  <div className="flex-1 h-2 rounded bg-muted overflow-hidden">
                    <div className="h-full rounded" style={{ width: `${b.pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                  </div>
                  <span className="font-mono text-muted-foreground w-10 text-right">{b.pct.toFixed(0)}%</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ============ SEÇÃO 7: EFICIÊNCIA OPERACIONAL ============ */}
      <section className="space-y-4">
        <h3 className="text-xl font-bold uppercase tracking-wide text-primary border-b border-primary/30 pb-2">
          Eficiência Operacional - {MS[month]}/{year.slice(2)}
        </h3>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: "Tempo médio em viagem", sublabel: "Tempo médio dos veículos em viagem/deslocamento", value: "---", color: "text-primary", icon: Truck },
            { label: "Tempo médio parado (manutenção)", sublabel: "Tempo médio dos veículos parados em manutenção", value: "---", color: "text-muted-foreground", icon: Wrench },
            { label: "Tempo médio parado", sublabel: "Descontando viagem e manutenção", value: "---", color: "text-muted-foreground/60", icon: Clock },
          ].map((item, i) => (
            <Card key={i}>
              <CardContent className="pt-6 text-center space-y-3">
                <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-muted mx-auto">
                  <item.icon className={`h-8 w-8 ${item.color}`} />
                </div>
                <p className="text-2xl font-extrabold">{item.value}</p>
                <Badge variant="secondary" className="text-xs">{item.label}</Badge>
                <p className="text-[10px] text-muted-foreground">{item.sublabel}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ============ SEÇÃO 8: RANKING MOTORISTAS ============ */}
      <section className="space-y-4">
        <h3 className="text-xl font-bold uppercase tracking-wide text-primary border-b border-primary/30 pb-2">
          Ranking Motoristas - {MS[month]}/{year.slice(2)}
        </h3>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Resultado Empresa */}
          <Card>
            <CardHeader><CardTitle>Resultado Empresa (R$)</CardTitle><CardDescription>Top 5 motoristas por faturamento</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {driverStats.slice(0,5).map((d,i) => {
                  const maxRev = driverStats[0]?.revenue || 1;
                  return (
                    <div key={d.id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium truncate max-w-[200px]">{d.name}</span>
                        <span className="font-bold text-emerald-400">{fmt(d.revenue)}</span>
                      </div>
                      <div className="h-3 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full" style={{width:`${(d.revenue/maxRev)*100}%`,backgroundColor:"oklch(0.65 0.18 145)"}} />
                      </div>
                    </div>
                  );
                })}
                {driverStats.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum motorista com viagens no mês</p>}
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardHeader><CardTitle>Motoristas / Viagens</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-border/30">
                  <span className="text-sm text-muted-foreground">Total de viagens</span>
                  <span className="text-xl font-bold">{totalTrips}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/30">
                  <span className="text-sm text-muted-foreground">Motoristas ativos</span>
                  <span className="text-xl font-bold">{driverStats.length}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/30">
                  <span className="text-sm text-muted-foreground">Distância total</span>
                  <span className="text-xl font-bold">{totalKm > 0 ? `${totalKm.toLocaleString("pt-BR")} km` : "---"}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/30">
                  <span className="text-sm text-muted-foreground">Total motoristas cadastrados</span>
                  <span className="text-xl font-bold">{drivers.length}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Peso total transportado</span>
                  <span className="text-xl font-bold">{(totalWeight/1000).toFixed(0)}t</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <div className="text-center text-xs text-muted-foreground/40 pt-4 border-t border-border/20">
        Fechamento Mensal - J.C.E Transportes Ltda | Gerado automaticamente | {new Date().toLocaleDateString("pt-BR")}
      </div>
    </div>
  );
}
