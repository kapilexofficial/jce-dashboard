"use client";

import { Fragment, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Truck, DollarSign, Route, TrendingUp, Activity, Fuel, ChevronDown, ChevronRight, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";

export interface VehicleRow {
  placa: string;
  modelo: string;
  viagens: number;
  ecoScore: number;
  notaTelem: number;
  kmRodado: number;
  faturamento: number;
  kmL: number;
  despesas: number;
}

const MONTH_LABELS: Record<string, string> = {
  "01": "Janeiro", "02": "Fevereiro", "03": "Março", "04": "Abril",
  "05": "Maio", "06": "Junho", "07": "Julho", "08": "Agosto",
  "09": "Setembro", "10": "Outubro", "11": "Novembro", "12": "Dezembro",
};

function fmtCurrency(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
}

function fmtInt(v: number): string {
  return Math.round(v).toLocaleString("pt-BR");
}

function fmtNum(v: number, digits = 1): string {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function monthLabel(mes: string): string {
  const [y, m] = mes.split("-");
  return `${MONTH_LABELS[m] || m} ${y}`;
}

function scoreColor(s: number): string {
  if (s === 0) return "text-muted-foreground";
  if (s >= 80) return "text-emerald-400";
  if (s >= 60) return "text-amber-400";
  return "text-red-400";
}

interface Props {
  rows: VehicleRow[];
  mes: string;
  monthsAvailable: string[];
  hasTcData: boolean;
}

export function AnaliseVeiculoClient({ rows, mes, monthsAvailable, hasTcData }: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  function handleMonthChange(value: string | null) {
    if (value) router.push(`/analise-veiculo?mes=${value}`);
  }

  const filteredRows = useMemo(() => {
    const f = filter.trim().toUpperCase();
    if (!f) return rows;
    return rows.filter((r) =>
      r.placa.toUpperCase().includes(f) || r.modelo.toUpperCase().includes(f)
    );
  }, [rows, filter]);

  const totalKm = filteredRows.reduce((s, r) => s + r.kmRodado, 0);
  const totalFat = filteredRows.reduce((s, r) => s + r.faturamento, 0);
  const totalDesp = filteredRows.reduce((s, r) => s + r.despesas, 0);
  const totalViagens = filteredRows.reduce((s, r) => s + r.viagens, 0);
  const margem = totalFat - totalDesp;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          Análise por Veículo{" "}
          <span className="text-muted-foreground font-normal text-lg">/ {monthLabel(mes)}</span>
        </h2>
        <p className="text-muted-foreground mt-1">
          Performance operacional + financeira por placa. KM rodado vem do Trucks Control (rastreador físico); faturamento e despesas vêm dos manifestos ESL.
        </p>
      </div>

      {!hasTcData && (
        <Card className="border-amber-500/40 bg-amber-500/10">
          <CardContent className="pt-4 pb-4 flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
            <div className="text-xs">
              <p className="font-semibold text-amber-300 text-sm">Sem dados do rastreador para esse mês</p>
              <p className="text-muted-foreground mt-1">
                A sincronização Trucks Control → Supabase começou recentemente. Os KMs ainda vão preencher ao longo do tempo conforme o cron de 30min rodar. KMs aparecerão como “—” até lá.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6 flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Mês</label>
            <Select value={mes} onValueChange={handleMonthChange}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {monthsAvailable.map((m) => (
                  <SelectItem key={m} value={m}>{monthLabel(m)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[220px]">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Buscar placa/modelo</label>
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Ex.: ABC1234 ou FH 460"
            />
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-bold uppercase tracking-wide text-primary">Veículos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold">{filteredRows.length}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Truck className="h-3 w-3" /> com dados no mês
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-bold uppercase tracking-wide text-emerald-400">Viagens</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold">{totalViagens}</div>
            <p className="text-xs text-muted-foreground mt-1">fretes finalizados</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-sky-500">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-bold uppercase tracking-wide text-sky-400">KM Rodado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold">{fmtInt(totalKm)}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Route className="h-3 w-3" /> rastreador
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-bold uppercase tracking-wide text-amber-400">Faturamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold">{fmtCurrency(totalFat)}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <DollarSign className="h-3 w-3" /> receita bruta
            </p>
          </CardContent>
        </Card>
        <Card className={`border-l-4 ${margem >= 0 ? "border-l-blue-500" : "border-l-red-500"}`}>
          <CardHeader className="pb-1">
            <CardTitle className={`text-sm font-bold uppercase tracking-wide ${margem >= 0 ? "text-blue-400" : "text-red-400"}`}>Resultado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-extrabold ${margem >= 0 ? "text-blue-400" : "text-red-400"}`}>{fmtCurrency(margem)}</div>
            <p className="text-xs text-muted-foreground mt-1">{fmtCurrency(totalDesp)} despesas</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalhamento por veículo</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Placa</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead className="text-right">Viagens</TableHead>
                <TableHead className="text-right" title="Nota ECO Elithium (média)">Nota ECO</TableHead>
                <TableHead className="text-right" title="Nota Telemetria calculada">Nota Telem.</TableHead>
                <TableHead className="text-right">KM</TableHead>
                <TableHead className="text-right">Faturamento</TableHead>
                <TableHead className="text-right" title="KM (rastreador) / Litros consumidos (Elithium)">km/L</TableHead>
                <TableHead className="text-right">Despesas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((r) => {
                const isExpanded = expanded === r.placa;
                return (
                  <Fragment key={r.placa}>
                    <TableRow
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setExpanded(isExpanded ? null : r.placa)}
                    >
                      <TableCell>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="font-mono font-semibold">{r.placa}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.modelo || "—"}</TableCell>
                      <TableCell className="text-right">{r.viagens || "—"}</TableCell>
                      <TableCell className={`text-right font-semibold ${scoreColor(r.ecoScore)}`}>
                        {r.ecoScore > 0 ? r.ecoScore : "—"}
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${scoreColor(r.notaTelem)}`}>
                        {r.notaTelem > 0 ? r.notaTelem : "—"}
                      </TableCell>
                      <TableCell className="text-right">{r.kmRodado > 0 ? fmtInt(r.kmRodado) : "—"}</TableCell>
                      <TableCell className="text-right">{r.faturamento > 0 ? fmtCurrency(r.faturamento) : "—"}</TableCell>
                      <TableCell className="text-right">{r.kmL > 0 ? fmtNum(r.kmL, 2) : "—"}</TableCell>
                      <TableCell className="text-right text-amber-400">
                        {r.despesas > 0 ? fmtCurrency(r.despesas) : "—"}
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow className="bg-muted/20 hover:bg-muted/20">
                        <TableCell></TableCell>
                        <TableCell colSpan={9} className="py-4">
                          <div className="text-xs text-muted-foreground space-y-2">
                            <div className="flex items-center gap-4 flex-wrap">
                              <span className="flex items-center gap-1.5">
                                <TrendingUp className="h-3.5 w-3.5" /> R$/km:{" "}
                                <strong className="text-foreground">
                                  {r.kmRodado > 0 ? fmtCurrency(r.faturamento / r.kmRodado) : "—"}
                                </strong>
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Fuel className="h-3.5 w-3.5" /> R$ despesa/km:{" "}
                                <strong className="text-foreground">
                                  {r.kmRodado > 0 ? fmtCurrency(r.despesas / r.kmRodado) : "—"}
                                </strong>
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Activity className="h-3.5 w-3.5" /> Margem:{" "}
                                <strong
                                  className={
                                    r.faturamento - r.despesas >= 0 ? "text-emerald-400" : "text-red-400"
                                  }
                                >
                                  {r.faturamento > 0
                                    ? fmtCurrency(r.faturamento - r.despesas)
                                    : "—"}
                                </strong>
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground/70 italic mt-2">
                              Timeline de eventos por dia será adicionada em breve (vai ler tc_messages do Supabase com filtro de eventos significativos: pânico, ignição, velocidade excedida, etc).
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
          {filteredRows.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              Nenhum veículo encontrado pra esse mês/filtro.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
