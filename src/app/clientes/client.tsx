"use client";

import { useState, useMemo } from "react";
import {
  Users,
  TrendingUp,
  DollarSign,
  MapPin,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Weight,
  Truck,
  ChevronRight,
} from "lucide-react";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Pie, PieChart, Cell, Area, AreaChart } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
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
import { DateFilter } from "@/components/date-filter";
import type { FreightMargin, FreightNode } from "@/lib/esl-api";

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}
function fmtShort(v: number) {
  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return fmt(v);
}

const COLORS = [
  "oklch(0.68 0.19 265)", "oklch(0.75 0.18 165)", "oklch(0.78 0.15 55)",
  "oklch(0.70 0.20 310)", "oklch(0.72 0.14 80)", "oklch(0.58 0.15 200)",
  "oklch(0.65 0.12 130)", "oklch(0.68 0.18 25)", "oklch(0.60 0.16 280)",
  "oklch(0.70 0.10 100)",
];

const monthNames: Record<string, string> = {
  "01": "Jan", "02": "Fev", "03": "Mar", "04": "Abr", "05": "Mai", "06": "Jun",
  "07": "Jul", "08": "Ago", "09": "Set", "10": "Out", "11": "Nov", "12": "Dez",
};

interface ClientData {
  name: string;
  document: string;
  revenue: number;
  margin: number;
  expenses: number;
  count: number;
  weight: number;
  pct: number;
  destinations: Record<string, number>;
  monthly: Record<string, number>;
}

export function ClientesClient({ margins, freights }: { margins: FreightMargin[]; freights: FreightNode[] }) {
  const [dateStart, setDateStart] = useState("2025-01-01");
  const [dateEnd, setDateEnd] = useState(new Date().toISOString().split("T")[0]);
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return margins.filter((m) => {
      const d = m.service_at.split("T")[0];
      return d >= dateStart && d <= dateEnd;
    });
  }, [margins, dateStart, dateEnd]);

  const totalRevenue = filtered.reduce((s, m) => s + parseFloat(m.freight_total), 0);

  const clients = useMemo(() => {
    const map: Record<string, ClientData> = {};
    filtered.forEach((m) => {
      const name = m.sender.name;
      if (!map[name]) map[name] = { name, document: m.sender.document, revenue: 0, margin: 0, expenses: 0, count: 0, weight: 0, pct: 0, destinations: {}, monthly: {} };
      map[name].revenue += parseFloat(m.freight_total);
      map[name].margin += parseFloat(m.margin_total);
      map[name].expenses += parseFloat(m.total_expenses);
      map[name].count += 1;
      map[name].weight += parseFloat(m.real_weight);
      // destinations
      const dest = `${m.destination_city.name}/${m.destination_city.state.code}`;
      map[name].destinations[dest] = (map[name].destinations[dest] || 0) + 1;
      // monthly
      const month = m.service_at.slice(0, 7);
      map[name].monthly[month] = (map[name].monthly[month] || 0) + parseFloat(m.freight_total);
    });
    return Object.values(map)
      .map((c) => ({ ...c, pct: totalRevenue > 0 ? (c.revenue / totalRevenue) * 100 : 0 }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [filtered, totalRevenue]);

  const searchedClients = clients.filter((c) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.document.includes(search)
  );

  const selected = selectedClient ? clients.find((c) => c.name === selectedClient) : null;

  // Region aggregation
  const byRegion = useMemo(() => {
    const map: Record<string, { revenue: number; count: number; weight: number }> = {};
    filtered.forEach((m) => {
      const key = m.destination_city.state.code;
      if (!map[key]) map[key] = { revenue: 0, count: 0, weight: 0 };
      map[key].revenue += parseFloat(m.freight_total);
      map[key].count += 1;
      map[key].weight += parseFloat(m.real_weight);
    });
    return Object.entries(map).map(([state, d]) => ({ state, ...d })).sort((a, b) => b.revenue - a.revenue);
  }, [filtered]);

  // Route aggregation (origin -> dest)
  const topRoutes = useMemo(() => {
    const map: Record<string, { revenue: number; count: number }> = {};
    filtered.forEach((m) => {
      const key = `${m.origin_city.name}/${m.origin_city.state.code} → ${m.destination_city.name}/${m.destination_city.state.code}`;
      if (!map[key]) map[key] = { revenue: 0, count: 0 };
      map[key].revenue += parseFloat(m.freight_total);
      map[key].count += 1;
    });
    return Object.entries(map).map(([route, d]) => ({ route, ...d })).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [filtered]);

  // Client monthly evolution for selected
  const selectedMonthly = useMemo(() => {
    if (!selected) return [];
    return Object.entries(selected.monthly)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, revenue]) => ({
        month: `${monthNames[key.split("-")[1]]}/${key.slice(2, 4)}`,
        revenue,
      }));
  }, [selected]);

  // Group clients by parent company (first word of name)
  const clientGroups = useMemo(() => {
    const map: Record<string, { revenue: number; margin: number; count: number; weight: number; children: string[] }> = {};
    clients.forEach((c) => {
      const firstWord = c.name.split(" ")[0].toUpperCase();
      // Normalize known groups
      const group =
        firstWord === "SPAL" || c.name.toUpperCase().includes("SPAL") ? "SPAL" :
        firstWord === "HNK" || c.name.toUpperCase().includes("HNK") ? "HNK" :
        firstWord === "COCAM" ? "COCAM" :
        firstWord === "STOLLER" ? "STOLLER" :
        firstWord === "IFC" ? "IFC" :
        firstWord;
      if (!map[group]) map[group] = { revenue: 0, margin: 0, count: 0, weight: 0, children: [] };
      map[group].revenue += c.revenue;
      map[group].margin += c.margin;
      map[group].count += c.count;
      map[group].weight += c.weight;
      if (!map[group].children.includes(c.name)) map[group].children.push(c.name);
    });
    return Object.entries(map)
      .map(([name, data]) => ({ name, ...data, pct: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0 }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [clients, totalRevenue]);

  const groupPieConfig: ChartConfig = {};
  clientGroups.forEach((g, i) => {
    groupPieConfig[g.name] = { label: g.name, color: COLORS[i % COLORS.length] };
  });

  const barConfig = { revenue: { label: "Receita", color: "var(--chart-1)" } } satisfies ChartConfig;
  const areaConfig = { revenue: { label: "Receita", color: "var(--chart-1)" } } satisfies ChartConfig;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Análise de Clientes</h2>
        <p className="text-muted-foreground mt-1">Faturamento detalhado por cliente, região e rota</p>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <DateFilter dateStart={dateStart} dateEnd={dateEnd} onStartChange={setDateStart} onEndChange={setDateEnd} />
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar cliente ou CNPJ..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {selectedClient && (
          <button onClick={() => setSelectedClient(null)} className="text-xs text-primary hover:underline pb-2">
            Limpar seleção
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Clientes</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{clients.length}</div><p className="text-xs text-muted-foreground mt-1">remetentes únicos</p></CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Receita Total</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-emerald-400">{fmtShort(totalRevenue)}</div><p className="text-xs text-muted-foreground mt-1">{filtered.length} fretes</p></CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Regiões</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{byRegion.length}</div><p className="text-xs text-muted-foreground mt-1">estados de destino</p></CardContent>
        </Card>
        <Card className="border-l-4 border-l-violet-500">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Rotas</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{topRoutes.length}</div><p className="text-xs text-muted-foreground mt-1">rotas principais</p></CardContent>
        </Card>
      </div>

      {/* Selected Client Detail */}
      {selected && (
        <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">{selected.name}</CardTitle>
                <CardDescription className="font-mono">{selected.document}</CardDescription>
              </div>
              <Badge className="text-sm px-3 py-1">{selected.pct.toFixed(1)}% da receita</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-5 mb-6">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Receita</p>
                <p className="text-xl font-bold text-emerald-400 mt-1">{fmt(selected.revenue)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Margem</p>
                <p className={`text-xl font-bold mt-1 ${selected.margin >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmt(selected.margin)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Fretes</p>
                <p className="text-xl font-bold mt-1">{selected.count}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Peso</p>
                <p className="text-xl font-bold mt-1">{(selected.weight / 1000).toFixed(1)}t</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Margem %</p>
                <p className={`text-xl font-bold mt-1 ${selected.margin >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {selected.revenue > 0 ? ((selected.margin / selected.revenue) * 100).toFixed(1) : 0}%
                </p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Monthly Evolution */}
              <div>
                <h4 className="text-sm font-semibold mb-3">Evolução Mensal</h4>
                {selectedMonthly.length > 0 ? (
                  <ChartContainer config={areaConfig} className="h-[200px] w-full">
                    <AreaChart data={selectedMonthly} accessibilityLayer>
                      <defs>
                        <linearGradient id="clientFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--color-revenue)" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="var(--color-revenue)" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                      <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => fmtShort(v)} tick={{ fontSize: 10 }} />
                      <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmt(Number(v))} />} />
                      <Area dataKey="revenue" fill="url(#clientFill)" stroke="var(--color-revenue)" strokeWidth={2} type="monotone" />
                    </AreaChart>
                  </ChartContainer>
                ) : (
                  <p className="text-sm text-muted-foreground">Apenas 1 mês de dados</p>
                )}
              </div>

              {/* Destinations */}
              <div>
                <h4 className="text-sm font-semibold mb-3">Destinos</h4>
                <div className="space-y-2">
                  {Object.entries(selected.destinations)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 6)
                    .map(([dest, count]) => (
                      <div key={dest} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span>{dest}</span>
                        </div>
                        <Badge variant="outline" className="text-xs font-mono">{count}x</Badge>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-5">
        {/* Client Ranking */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Ranking de Clientes</CardTitle>
            <CardDescription>Clique em um cliente para ver detalhes</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-right">Margem</TableHead>
                  <TableHead className="text-right">Qt</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {searchedClients.map((c, i) => (
                  <TableRow
                    key={c.name}
                    className={`cursor-pointer transition-colors ${selectedClient === c.name ? "bg-primary/10" : "hover:bg-muted/30"}`}
                    onClick={() => setSelectedClient(selectedClient === c.name ? null : c.name)}
                  >
                    <TableCell>
                      <div className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: COLORS[i % COLORS.length] }}>
                        {i + 1}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium truncate max-w-[200px]">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{c.document}</p>
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">{fmt(c.revenue)}</TableCell>
                    <TableCell className={`text-right text-sm ${c.margin >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmt(c.margin)}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{c.count}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.max(c.pct, 2)}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                        </div>
                        <span className="text-xs font-mono text-muted-foreground w-10 text-right">{c.pct.toFixed(1)}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Region + Routes */}
        <div className="md:col-span-2 space-y-6">
          {/* By Region */}
          <Card>
            <CardHeader>
              <CardTitle>Faturamento por Região</CardTitle>
              <CardDescription>Estado de destino</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {byRegion.map((r, i) => {
                  const maxRev = byRegion[0]?.revenue || 1;
                  const pct = (r.revenue / maxRev) * 100;
                  return (
                    <div key={r.state} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs w-8 justify-center">{r.state}</Badge>
                          <span className="text-muted-foreground text-xs">{r.count} fretes • {(r.weight / 1000).toFixed(0)}t</span>
                        </div>
                        <span className="font-medium text-sm">{fmt(r.revenue)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(pct, 3)}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Top Routes */}
          <Card>
            <CardHeader>
              <CardTitle>Top Rotas</CardTitle>
              <CardDescription>Rotas com maior faturamento</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {topRoutes.map((r, i) => (
                  <div key={r.route} className="flex items-center justify-between rounded-lg border p-2.5 text-sm">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="flex h-6 w-6 items-center justify-center rounded text-[10px] font-bold text-white shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }}>
                        {i + 1}
                      </div>
                      <span className="text-xs truncate">{r.route}</span>
                    </div>
                    <div className="text-right ml-2 shrink-0">
                      <p className="text-xs font-semibold">{fmt(r.revenue)}</p>
                      <p className="text-[10px] text-muted-foreground">{r.count}x</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Comparativo por Grupo */}
      {clientGroups.length >= 2 && (
        <div className="grid gap-6 md:grid-cols-5">
          {/* Pie Chart - Grupos */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Participação por Grupo</CardTitle>
              <CardDescription>Receita agrupada por empresa</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={groupPieConfig} className="h-[280px] w-full">
                <PieChart accessibilityLayer>
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        nameKey="name"
                        formatter={(value, name, item) => {
                          const group = clientGroups.find((g) => g.name === item.payload?.name);
                          return (
                            <div className="space-y-0.5">
                              <p className="font-semibold">{fmt(Number(value))}</p>
                              {group && group.children.length > 1 && (
                                <p className="text-[10px] text-muted-foreground">{group.children.join(", ")}</p>
                              )}
                            </div>
                          );
                        }}
                      />
                    }
                  />
                  <Pie
                    data={clientGroups.map((g) => ({ name: g.name, value: g.revenue }))}
                    dataKey="value"
                    nameKey="name"
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    label={(props: any) => `${props.name} ${((props.percent || 0) * 100).toFixed(0)}%`}
                    innerRadius={65}
                    outerRadius={105}
                    strokeWidth={3}
                    stroke="var(--background)"
                  >
                    {clientGroups.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>

              {/* Legend with values */}
              <div className="space-y-2 mt-4">
                {clientGroups.map((g, i) => (
                  <div key={g.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-sm font-medium">{g.name}</span>
                      <span className="text-[10px] text-muted-foreground">({g.children.length} {g.children.length === 1 ? "unidade" : "unidades"})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold">{fmt(g.revenue)}</span>
                      <Badge variant="outline" className="text-[10px] font-mono w-14 justify-center">{g.pct.toFixed(1)}%</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Bar Chart - Comparativo */}
          <Card className="md:col-span-3">
            <CardHeader>
              <CardTitle>Comparativo por Grupo</CardTitle>
              <CardDescription>Receita vs Margem lado a lado</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={barConfig} className="h-[350px] w-full">
                <BarChart
                  data={clientGroups.map((g) => ({
                    name: g.name,
                    revenue: g.revenue,
                    margin: g.margin,
                  }))}
                  layout="vertical"
                  accessibilityLayer
                  margin={{ left: 10 }}
                >
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                  <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(v) => fmtShort(v)} />
                  <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={80} tick={{ fontSize: 12, fontWeight: 600 }} />
                  <ChartTooltip content={<ChartTooltipContent formatter={(v) => fmt(Number(v))} />} />
                  <Bar dataKey="revenue" fill="oklch(0.68 0.19 265)" radius={[0, 6, 6, 0]} barSize={16} name="Receita" />
                  <Bar dataKey="margin" fill="oklch(0.75 0.18 165)" radius={[0, 6, 6, 0]} barSize={16} name="Margem" />
                </BarChart>
              </ChartContainer>

              {/* Summary table */}
              <div className="mt-4 rounded-lg border overflow-hidden">
                <div className="grid grid-cols-5 gap-2 px-4 py-2 bg-muted/50 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <div>Grupo</div>
                  <div className="text-right">Receita</div>
                  <div className="text-right">Margem</div>
                  <div className="text-right">Fretes</div>
                  <div className="text-right">Peso</div>
                </div>
                {clientGroups.map((g, i) => (
                  <div key={g.name} className="grid grid-cols-5 gap-2 px-4 py-2 border-t border-border/30 text-sm items-center">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="font-medium">{g.name}</span>
                    </div>
                    <div className="text-right font-medium">{fmtShort(g.revenue)}</div>
                    <div className={`text-right ${g.margin >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmtShort(g.margin)}</div>
                    <div className="text-right text-muted-foreground">{g.count}</div>
                    <div className="text-right text-muted-foreground">{(g.weight / 1000).toFixed(0)}t</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
