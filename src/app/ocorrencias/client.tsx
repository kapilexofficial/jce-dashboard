"use client";

import { useState } from "react";
import { Search, AlertTriangle } from "lucide-react";
import { DateFilter } from "@/components/date-filter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { OccurrenceRest } from "@/lib/esl-api";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function OcorrenciasClient({ occurrences }: { occurrences: OccurrenceRest[] }) {
  const [search, setSearch] = useState("");
  const [codeFilter, setCodeFilter] = useState("all");
  const [dateStart, setDateStart] = useState("2025-01-01");
  const [dateEnd, setDateEnd] = useState(new Date().toISOString().split("T")[0]);

  const codes = [...new Set(occurrences.map((o) => String(o.occurrence.code)))];

  const filtered = occurrences.filter((o) => {
    const matchesSearch =
      search === "" ||
      o.invoice.number.includes(search) ||
      o.occurrence.description.toLowerCase().includes(search.toLowerCase()) ||
      o.freight.cte_key?.includes(search);
    const matchesCode = codeFilter === "all" || String(o.occurrence.code) === codeFilter;
    const date = o.occurrence_at?.split("T")[0] || "";
    const matchesDate = date >= dateStart && date <= dateEnd;
    return matchesSearch && matchesCode && matchesDate;
  });

  // Group by occurrence code for summary
  const byCode: Record<string, number> = {};
  occurrences.forEach((o) => {
    const desc = `${o.occurrence.code} - ${o.occurrence.description}`;
    byCode[desc] = (byCode[desc] || 0) + 1;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Ocorrências</h2>
        <p className="text-muted-foreground">
          {occurrences.length} ocorrências carregadas da API ESL
        </p>
      </div>

      {/* Summary by code */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Object.entries(byCode)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 4)
          .map(([desc, count]) => (
            <Card key={desc}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground truncate max-w-[180px]">
                  {desc}
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{count}</div>
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <DateFilter dateStart={dateStart} dateEnd={dateEnd} onStartChange={setDateStart} onEndChange={setDateEnd} />
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por NF, CT-e ou descrição..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={codeFilter} onValueChange={(v) => setCodeFilter(v ?? "all")}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Código" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os códigos</SelectItem>
            {codes.map((c) => (
              <SelectItem key={c} value={c}>
                Cód. {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Ocorrência</TableHead>
                <TableHead>Nota Fiscal</TableHead>
                <TableHead>CT-e</TableHead>
                <TableHead>Valor Frete</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">{o.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs shrink-0">
                        {o.occurrence.code}
                      </Badge>
                      <span className="text-xs truncate max-w-[200px]">
                        {o.occurrence.description}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    NF {o.invoice.number}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    #{o.freight.draft_number}
                  </TableCell>
                  <TableCell className="text-xs">
                    {formatCurrency(o.freight.total)}
                  </TableCell>
                  <TableCell className="text-xs">{formatDate(o.occurrence_at)}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhuma ocorrência encontrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
