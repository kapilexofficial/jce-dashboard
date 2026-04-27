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
  finished: "Finalizado",
  in_transit: "Em Trânsito",
  manifested: "Manifestado",
  pending: "Pendente",
  cancelled: "Cancelado",
  draft: "Rascunho",
};

const statusClass: Record<string, string> = {
  done: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  finished: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  in_transit: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  manifested: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  pending: "bg-muted text-muted-foreground border-border",
  cancelled: "bg-red-500/15 text-red-400 border-red-500/30",
  draft: "bg-muted text-muted-foreground border-border",
};

export function FretesClient({ freights }: { freights: FreightNode[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateStart, setDateStart] = useState("2025-01-01");
  const [dateEnd, setDateEnd] = useState(new Date().toISOString().split("T")[0]);

  const statusOrder = ["finished", "in_transit", "manifested", "pending", "cancelled", "draft"];
  const statusesAvailable = new Set(freights.map((f) => f.status));
  const statuses = statusOrder.filter((s) => statusesAvailable.has(s));
  const statusCounts: Record<string, number> = {};
  freights.forEach((f) => {
    const key = f.status === "done" ? "finished" : f.status;
    statusCounts[key] = (statusCounts[key] || 0) + 1;
  });

  const statusDot: Record<string, string> = {
    done: "bg-emerald-400",
    finished: "bg-emerald-400",
    in_transit: "bg-blue-400",
    manifested: "bg-amber-400",
    pending: "bg-muted-foreground",
    cancelled: "bg-red-400",
    draft: "bg-muted-foreground",
  };

  const filtered = freights.filter((f) => {
    const matchesSearch =
      search === "" ||
      f.sender?.name?.toLowerCase().includes(search.toLowerCase()) ||
      f.recipient?.name?.toLowerCase().includes(search.toLowerCase()) ||
      f.cte?.key?.includes(search) ||
      String(f.sequenceCode).includes(search);
    const matchesStatus =
      statusFilter === "all" ||
      f.status === statusFilter ||
      (statusFilter === "finished" && f.status === "done");
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
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status ({freights.length})</SelectItem>
            {statuses.map((s) => (
              <SelectItem key={s} value={s}>
                <span className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${statusDot[s] || "bg-muted-foreground"}`} />
                  <span>{statusLabels[s] || s}</span>
                  <span className="text-muted-foreground text-xs">({statusCounts[s] || 0})</span>
                </span>
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
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-xs ${statusClass[f.status] || ""}`}
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
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
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
