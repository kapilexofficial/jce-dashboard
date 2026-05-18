"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Route, DollarSign, TrendingUp, ChevronDown, ChevronRight, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";

export interface PlateDaily {
  dia: string;
  km: number;
  faturamento: number;
  rsPorKm: number;
}

export interface PlateMonthly {
  placa: string;
  kmMes: number;
  faturamentoMes: number;
  rsPorKmMes: number;
  diasComDado: number;
  daily: PlateDaily[];
}

const MONTH_LABELS: Record<string, string> = {
  "01": "Janeiro", "02": "Fevereiro", "03": "Março", "04": "Abril",
  "05": "Maio", "06": "Junho", "07": "Julho", "08": "Agosto",
  "09": "Setembro", "10": "Outubro", "11": "Novembro", "12": "Dezembro",
};

function fmtCurrency(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 10_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 }).format(v);
}

function fmtInt(v: number): string {
  return Math.round(v).toLocaleString("pt-BR");
}

function fmtCurrencyPrecise(v: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 }).format(v);
}

function monthLabel(mes: string): string {
  const [y, m] = mes.split("-");
  return `${MONTH_LABELS[m] || m} ${y}`;
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

interface Props {
  rows: PlateMonthly[];
  mes: string;
  monthsAvailable: string[];
  hasTcData: boolean;
}

export function AnaliseRsKmClient({ rows, mes, monthsAvailable, hasTcData }: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  function handleMonthChange(value: string | null) {
    if (value) router.push(`/analise-rs-km?mes=${value}`);
  }

  const filteredRows = useMemo(() => {
    const f = filter.trim().toUpperCase();
    if (!f) return rows;
    return rows.filter((r) => r.placa.toUpperCase().includes(f));
  }, [rows, filter]);

  const totalKm = filteredRows.reduce((s, r) => s + r.kmMes, 0);
  const totalFat = filteredRows.reduce((s, r) => s + r.faturamentoMes, 0);
  const avgRsKm = totalKm > 0 ? totalFat / totalKm : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          R$/KM por Placa{" "}
          <span className="text-muted-foreground font-normal text-lg">/ {monthLabel(mes)}</span>
        </h2>
        <p className="text-muted-foreground mt-1">
          Ranking de eficiência financeira: faturamento (ESL) dividido por KM rodado (Trucks Control). Clique numa linha pra ver o detalhe diário.
        </p>
      </div>

      {!hasTcData && (
        <Card className="border-amber-500/40 bg-amber-500/10">
          <CardContent className="pt-4 pb-4 flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
            <div className="text-xs">
              <p className="font-semibold text-amber-300 text-sm">Sem dados do rastreador para esse mês</p>
              <p className="text-muted-foreground mt-1">
                A sincronização Trucks Control → Supabase começou recentemente. KMs aparecerão como “—” até o histórico encher pelo cron de 30min.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

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
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Buscar placa</label>
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Ex.: ABC1234"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-bold uppercase tracking-wide text-primary">R$/KM Médio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold">{avgRsKm > 0 ? fmtCurrencyPrecise(avgRsKm) : "—"}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> frota</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-bold uppercase tracking-wide text-emerald-400">KM Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold">{fmtInt(totalKm)}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Route className="h-3 w-3" /> rastreador</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-bold uppercase tracking-wide text-amber-400">Faturamento Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold">{fmtCurrency(totalFat)}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><DollarSign className="h-3 w-3" /> bruto</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-violet-500">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-bold uppercase tracking-wide text-violet-400">Placas Ativas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold">{filteredRows.length}</div>
            <p className="text-xs text-muted-foreground mt-1">no período</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ranking R$/KM — placas mais lucrativas no topo</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Placa</TableHead>
                <TableHead className="text-right">KM Mês</TableHead>
                <TableHead className="text-right">Faturamento</TableHead>
                <TableHead className="text-right font-bold">R$/KM</TableHead>
                <TableHead className="text-right" title="Dias do mês com KM ou faturamento">Dias</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((r, idx) => {
                const isExpanded = expanded === r.placa;
                return (
                  <>
                    <TableRow
                      key={r.placa}
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
                      <TableCell className="text-muted-foreground text-sm">{idx + 1}</TableCell>
                      <TableCell className="font-mono font-semibold">{r.placa}</TableCell>
                      <TableCell className="text-right">{r.kmMes > 0 ? fmtInt(r.kmMes) : "—"}</TableCell>
                      <TableCell className="text-right">{r.faturamentoMes > 0 ? fmtCurrency(r.faturamentoMes) : "—"}</TableCell>
                      <TableCell className="text-right font-bold text-emerald-400">
                        {r.rsPorKmMes > 0 ? fmtCurrencyPrecise(r.rsPorKmMes) : "—"}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{r.diasComDado}</TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow key={`${r.placa}-detail`} className="bg-muted/20 hover:bg-muted/20">
                        <TableCell></TableCell>
                        <TableCell colSpan={6} className="py-4">
                          <p className="text-xs text-muted-foreground mb-2">Detalhe diário — {r.placa}</p>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">Dia</TableHead>
                                <TableHead className="text-right text-xs">KM</TableHead>
                                <TableHead className="text-right text-xs">Faturamento</TableHead>
                                <TableHead className="text-right text-xs">R$/KM</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {r.daily.map((d) => (
                                <TableRow key={d.dia}>
                                  <TableCell className="text-xs font-mono">{formatDate(d.dia)}</TableCell>
                                  <TableCell className="text-right text-xs">{d.km > 0 ? fmtInt(d.km) : "—"}</TableCell>
                                  <TableCell className="text-right text-xs">{d.faturamento > 0 ? fmtCurrency(d.faturamento) : "—"}</TableCell>
                                  <TableCell className="text-right text-xs font-semibold text-emerald-400">
                                    {d.rsPorKm > 0 ? fmtCurrencyPrecise(d.rsPorKm) : "—"}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>
          {filteredRows.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              Nenhuma placa encontrada pra esse mês/filtro.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
