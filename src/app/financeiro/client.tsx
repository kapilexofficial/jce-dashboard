"use client";

import { useState } from "react";
import { ArrowUpRight, ArrowDownRight, TrendingUp, Search } from "lucide-react";
import { DateFilter } from "@/components/date-filter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { FreightMargin } from "@/lib/esl-api";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

export function FinanceiroClient({ margins }: { margins: FreightMargin[] }) {
  const [search, setSearch] = useState("");
  const [dateStart, setDateStart] = useState("2025-01-01");
  const [dateEnd, setDateEnd] = useState(new Date().toISOString().split("T")[0]);

  const dateFiltered = margins.filter((m) => {
    const date = m.service_at?.split("T")[0] || "";
    return date >= dateStart && date <= dateEnd;
  });

  const totalRevenue = dateFiltered.reduce((s, m) => s + parseFloat(m.freight_total), 0);
  const totalExpenses = dateFiltered.reduce((s, m) => s + parseFloat(m.total_expenses), 0);
  const totalMargin = dateFiltered.reduce((s, m) => s + parseFloat(m.margin_total), 0);

  const filtered = dateFiltered.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.sender.name.toLowerCase().includes(q) ||
      m.recipient.name.toLowerCase().includes(q) ||
      m.origin_city.name.toLowerCase().includes(q) ||
      m.destination_city.name.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Financeiro</h2>
        <p className="text-muted-foreground">
          Margem de frete - {margins.length} registros
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Receita (Fretes)
            </CardTitle>
            <ArrowUpRight className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              {margins.filter((m) => parseFloat(m.freight_total) > 0).length} fretes faturados
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Despesas
            </CardTitle>
            <ArrowDownRight className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">impostos + seguros + custos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Margem Total
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalMargin >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {formatCurrency(totalMargin)}
            </div>
            <p className="text-xs text-muted-foreground">receita - despesas</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <DateFilter dateStart={dateStart} dateEnd={dateEnd} onStartChange={setDateStart} onEndChange={setDateEnd} />
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por remetente, destinatário ou cidade..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Remetente</TableHead>
                <TableHead>Destinatário</TableHead>
                <TableHead>Rota</TableHead>
                <TableHead className="text-right">Receita</TableHead>
                <TableHead className="text-right">Despesas</TableHead>
                <TableHead className="text-right">Margem</TableHead>
                <TableHead className="text-right">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((m) => {
                const margin = parseFloat(m.margin_total);
                const pct = parseFloat(m.margin_percentual);
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono text-xs">{m.draft_number}</TableCell>
                    <TableCell className="text-xs">{formatDate(m.service_at)}</TableCell>
                    <TableCell className="text-xs max-w-[120px] truncate">
                      {m.sender.name}
                    </TableCell>
                    <TableCell className="text-xs max-w-[120px] truncate">
                      {m.recipient.name}
                    </TableCell>
                    <TableCell className="text-xs">
                      {m.origin_city.name}/{m.origin_city.state.code} →{" "}
                      {m.destination_city.name}/{m.destination_city.state.code}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {formatCurrency(parseFloat(m.freight_total))}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {formatCurrency(parseFloat(m.total_expenses))}
                    </TableCell>
                    <TableCell className={`text-right text-xs font-medium ${margin >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {formatCurrency(margin)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={pct > 0 ? "secondary" : "destructive"}
                        className="text-xs"
                      >
                        {pct.toFixed(1)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
