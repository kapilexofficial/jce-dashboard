"use client";

import { useState } from "react";
import { Package, Search, Calendar, MapPin } from "lucide-react";
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

const picks = [
  { id: "COL-5001", customer: "Indústria ABC Ltda", origin: "São Paulo, SP", dest: "Rio de Janeiro, RJ", scheduledAt: "08/04/2026 09:00", status: "Agendada" },
  { id: "COL-5000", customer: "Fábrica Sul SA", origin: "Curitiba, PR", dest: "Florianópolis, SC", scheduledAt: "08/04/2026 14:00", status: "Agendada" },
  { id: "COL-4999", customer: "Metalúrgica BH", origin: "Belo Horizonte, MG", dest: "Vitória, ES", scheduledAt: "07/04/2026 10:00", status: "Coletada" },
  { id: "COL-4998", customer: "Tech Parts Ltda", origin: "Campinas, SP", dest: "Ribeirão Preto, SP", scheduledAt: "07/04/2026 08:00", status: "Coletada" },
  { id: "COL-4997", customer: "Bahia Foods ME", origin: "Salvador, BA", dest: "Recife, PE", scheduledAt: "06/04/2026 11:00", status: "Cancelada" },
  { id: "COL-4996", customer: "Vinícola Serra", origin: "Porto Alegre, RS", dest: "Curitiba, PR", scheduledAt: "06/04/2026 09:00", status: "Coletada" },
];

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  Agendada: "default",
  Coletada: "secondary",
  Cancelada: "destructive",
  "Em Rota": "outline",
};

export default function ColetasPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateStart, setDateStart] = useState("2025-01-01");
  const [dateEnd, setDateEnd] = useState(new Date().toISOString().split("T")[0]);

  const filtered = picks.filter((p) => {
    const matchesSearch =
      p.id.toLowerCase().includes(search.toLowerCase()) ||
      p.customer.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    const date = p.scheduledAt?.split(" ")[0]?.split("/").reverse().join("-") || "";
    const matchesDate = !date || (date >= dateStart && date <= dateEnd);
    return matchesSearch && matchesStatus && matchesDate;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Coletas</h2>
        <p className="text-muted-foreground">Agendamento e acompanhamento de coletas</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Agendadas</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {picks.filter((p) => p.status === "Agendada").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Coletadas</CardTitle>
            <Package className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {picks.filter((p) => p.status === "Coletada").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Canceladas</CardTitle>
            <Package className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {picks.filter((p) => p.status === "Cancelada").length}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <DateFilter dateStart={dateStart} dateEnd={dateEnd} onStartChange={setDateStart} onEndChange={setDateEnd} />
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por ID ou cliente..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="Agendada">Agendada</SelectItem>
            <SelectItem value="Coletada">Coletada</SelectItem>
            <SelectItem value="Cancelada">Cancelada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Coleta</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Rota</TableHead>
                <TableHead>Agendamento</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.id}</TableCell>
                  <TableCell className="text-sm">{p.customer}</TableCell>
                  <TableCell className="text-xs">{p.origin} → {p.dest}</TableCell>
                  <TableCell className="text-xs">{p.scheduledAt}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[p.status]} className="text-xs">
                      {p.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
