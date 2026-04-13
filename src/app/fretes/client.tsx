"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DateFilter } from "@/components/date-filter";
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
import type { FreightNode } from "@/lib/esl-api";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

function formatWeight(kg: number) {
  return kg >= 1000
    ? `${(kg / 1000).toFixed(1)}t`
    : `${kg.toFixed(0)} kg`;
}

const statusLabels: Record<string, string> = {
  done: "Finalizado",
  in_transit: "Em Trânsito",
  pending: "Pendente",
  cancelled: "Cancelado",
  draft: "Rascunho",
};

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  done: "secondary",
  in_transit: "default",
  pending: "outline",
  cancelled: "destructive",
  draft: "outline",
};

export function FretesClient({ freights }: { freights: FreightNode[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateStart, setDateStart] = useState("2025-01-01");
  const [dateEnd, setDateEnd] = useState(new Date().toISOString().split("T")[0]);

  const statuses = [...new Set(freights.map((f) => f.status))];

  const filtered = freights.filter((f) => {
    const matchesSearch =
      search === "" ||
      f.sender?.name?.toLowerCase().includes(search.toLowerCase()) ||
      f.recipient?.name?.toLowerCase().includes(search.toLowerCase()) ||
      f.cte?.key?.includes(search) ||
      String(f.sequenceCode).includes(search);
    const matchesStatus = statusFilter === "all" || f.status === statusFilter;
    const date = f.serviceAt?.split("T")[0] || "";
    const matchesDate = date >= dateStart && date <= dateEnd;
    return matchesSearch && matchesStatus && matchesDate;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Fretes</h2>
        <p className="text-muted-foreground">
          {freights.length} fretes carregados da API ESL
        </p>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <DateFilter dateStart={dateStart} dateEnd={dateEnd} onStartChange={setDateStart} onEndChange={setDateEnd} />
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por remetente, destinatário ou CT-e..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {statuses.map((s) => (
              <SelectItem key={s} value={s}>
                {statusLabels[s] || s}
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
                <TableHead>#</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Remetente</TableHead>
                <TableHead>Destinatário</TableHead>
                <TableHead>Rota</TableHead>
                <TableHead>Peso</TableHead>
                <TableHead>Modal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-mono text-xs">{f.sequenceCode}</TableCell>
                  <TableCell className="text-xs">{formatDate(f.serviceAt)}</TableCell>
                  <TableCell className="text-xs max-w-[150px] truncate">
                    {f.sender?.name}
                  </TableCell>
                  <TableCell className="text-xs max-w-[150px] truncate">
                    {f.recipient?.name}
                  </TableCell>
                  <TableCell className="text-xs">
                    {f.originCity?.name}/{f.originCity?.state?.code} →{" "}
                    {f.destinationCity?.name}/{f.destinationCity?.state?.code}
                  </TableCell>
                  <TableCell className="text-xs">{formatWeight(f.realWeight)}</TableCell>
                  <TableCell className="text-xs uppercase">{f.modal}</TableCell>
                  <TableCell>
                    <Badge
                      variant={statusVariant[f.status] || "default"}
                      className="text-xs"
                    >
                      {statusLabels[f.status] || f.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-xs font-medium">
                    {formatCurrency(f.total)}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    Nenhum frete encontrado
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
