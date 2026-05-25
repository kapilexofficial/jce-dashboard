"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { FreightMargin, FreightNode } from "@/lib/esl-api";

export type KpiKind = "fretes" | "receita" | "despesas";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: KpiKind | null;
  freights: FreightNode[];
  margins: FreightMargin[];
  monthLabel?: string;
}

function fmtBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

function expenseBreakdown(m: FreightMargin) {
  return {
    impostos: parseFloat(m.tax_total),
    manifest:
      parseFloat(m.manifest_freight_costs) +
      parseFloat(m.manifest_delivery_costs) +
      parseFloat(m.manifest_pick_costs) +
      parseFloat(m.manifest_reverse_pick_costs) +
      parseFloat(m.manifest_transfer_costs) +
      parseFloat(m.manifest_dispatch_draft_costs) +
      parseFloat(m.manifest_consolidation_costs),
    agentes:
      parseFloat(m.agent_costs) +
      parseFloat(m.agent_delivery_costs) +
      parseFloat(m.agent_pick_costs),
    comissao: parseFloat(m.commission_costs),
    terceiros: parseFloat(m.outsourced_total),
    seguro: parseFloat(m.insurance),
    total: parseFloat(m.total_expenses),
  };
}

export function KpiDetailSheet({
  open,
  onOpenChange,
  kind,
  freights,
  margins,
  monthLabel,
}: Props) {
  if (!kind) return null;

  const periodSuffix = monthLabel ? ` — ${monthLabel}` : "";
  let title = "";
  let description = "";

  if (kind === "fretes") {
    title = `Fretes${periodSuffix}`;
    description = `${freights.length} fretes no período · ${margins.length} com margem calculada`;
  } else if (kind === "receita") {
    const total = margins.reduce((s, m) => s + parseFloat(m.freight_total), 0);
    title = `Receita${periodSuffix}`;
    description = `Total ${fmtBRL(total)} em ${margins.length} fretes faturados`;
  } else {
    const total = margins.reduce((s, m) => s + parseFloat(m.total_expenses), 0);
    title = `Despesas${periodSuffix}`;
    description = `Total ${fmtBRL(total)} em ${margins.length} fretes`;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="!max-w-[min(96vw,1180px)] sm:!max-w-[min(96vw,1180px)] w-full p-0"
      >
        <SheetHeader className="border-b">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 overflow-auto">
          <div className="px-4 pb-6 pt-2">
            {kind === "fretes" && <FretesTable freights={freights} />}
            {kind === "receita" && <ReceitaTable margins={margins} />}
            {kind === "despesas" && <DespesasTable margins={margins} />}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function FretesTable({ freights }: { freights: FreightNode[] }) {
  const sorted = [...freights].sort((a, b) =>
    b.serviceAt.localeCompare(a.serviceAt)
  );
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Data</TableHead>
          <TableHead>CT-e / Nº</TableHead>
          <TableHead>Remetente</TableHead>
          <TableHead>Destino</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Valor</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((f) => (
          <TableRow key={f.id}>
            <TableCell className="whitespace-nowrap text-xs">
              {fmtDate(f.serviceAt)}
            </TableCell>
            <TableCell className="text-xs font-mono">
              {f.cte?.number ?? f.sequenceCode}
            </TableCell>
            <TableCell
              className="text-xs max-w-[220px] truncate"
              title={f.sender?.name}
            >
              {f.sender?.name}
            </TableCell>
            <TableCell className="text-xs">
              {f.destinationCity?.name}/{f.destinationCity?.state?.code}
            </TableCell>
            <TableCell>
              <Badge variant="outline" className="text-[10px]">
                {f.status}
              </Badge>
            </TableCell>
            <TableCell className="text-right text-xs">
              {fmtBRL(f.total)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ReceitaTable({ margins }: { margins: FreightMargin[] }) {
  const sorted = [...margins].sort((a, b) =>
    b.service_at.localeCompare(a.service_at)
  );
  const total = sorted.reduce((s, m) => s + parseFloat(m.freight_total), 0);
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Data</TableHead>
          <TableHead>CT-e</TableHead>
          <TableHead>Remetente</TableHead>
          <TableHead>Destino</TableHead>
          <TableHead className="text-right">Receita</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((m) => (
          <TableRow key={m.id}>
            <TableCell className="whitespace-nowrap text-xs">
              {fmtDate(m.service_at)}
            </TableCell>
            <TableCell className="text-xs font-mono">
              {m.cte_number || m.draft_number}
            </TableCell>
            <TableCell
              className="text-xs max-w-[260px] truncate"
              title={m.sender.name}
            >
              {m.sender.name}
            </TableCell>
            <TableCell className="text-xs">
              {m.destination_city.name}/{m.destination_city.state.code}
            </TableCell>
            <TableCell className="text-right text-xs font-medium text-emerald-400">
              {fmtBRL(parseFloat(m.freight_total))}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={4} className="font-bold">
            Total
          </TableCell>
          <TableCell className="text-right font-bold text-emerald-400">
            {fmtBRL(total)}
          </TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}

function DespesasTable({ margins }: { margins: FreightMargin[] }) {
  const sorted = [...margins].sort((a, b) =>
    b.service_at.localeCompare(a.service_at)
  );
  const rows = sorted.map((m) => ({
    id: m.id,
    date: m.service_at,
    cte: m.cte_number || m.draft_number,
    sender: m.sender.name,
    ...expenseBreakdown(m),
  }));
  const totals = rows.reduce(
    (acc, r) => ({
      impostos: acc.impostos + r.impostos,
      manifest: acc.manifest + r.manifest,
      agentes: acc.agentes + r.agentes,
      comissao: acc.comissao + r.comissao,
      terceiros: acc.terceiros + r.terceiros,
      seguro: acc.seguro + r.seguro,
      total: acc.total + r.total,
    }),
    {
      impostos: 0,
      manifest: 0,
      agentes: 0,
      comissao: 0,
      terceiros: 0,
      seguro: 0,
      total: 0,
    }
  );
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Data</TableHead>
          <TableHead>CT-e</TableHead>
          <TableHead>Remetente</TableHead>
          <TableHead className="text-right">Impostos</TableHead>
          <TableHead className="text-right">Manifest</TableHead>
          <TableHead className="text-right">Agentes</TableHead>
          <TableHead className="text-right">Comissão</TableHead>
          <TableHead className="text-right">Terceiros</TableHead>
          <TableHead className="text-right">Seguro</TableHead>
          <TableHead className="text-right">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="text-xs whitespace-nowrap">
              {fmtDate(r.date)}
            </TableCell>
            <TableCell className="text-xs font-mono">{r.cte}</TableCell>
            <TableCell
              className="text-xs max-w-[180px] truncate"
              title={r.sender}
            >
              {r.sender}
            </TableCell>
            <TableCell className="text-right text-xs">
              {fmtBRL(r.impostos)}
            </TableCell>
            <TableCell className="text-right text-xs">
              {fmtBRL(r.manifest)}
            </TableCell>
            <TableCell className="text-right text-xs">
              {fmtBRL(r.agentes)}
            </TableCell>
            <TableCell className="text-right text-xs">
              {fmtBRL(r.comissao)}
            </TableCell>
            <TableCell className="text-right text-xs">
              {fmtBRL(r.terceiros)}
            </TableCell>
            <TableCell className="text-right text-xs">
              {fmtBRL(r.seguro)}
            </TableCell>
            <TableCell className="text-right text-xs font-medium text-amber-400">
              {fmtBRL(r.total)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={3} className="font-bold">
            Total
          </TableCell>
          <TableCell className="text-right font-bold">
            {fmtBRL(totals.impostos)}
          </TableCell>
          <TableCell className="text-right font-bold">
            {fmtBRL(totals.manifest)}
          </TableCell>
          <TableCell className="text-right font-bold">
            {fmtBRL(totals.agentes)}
          </TableCell>
          <TableCell className="text-right font-bold">
            {fmtBRL(totals.comissao)}
          </TableCell>
          <TableCell className="text-right font-bold">
            {fmtBRL(totals.terceiros)}
          </TableCell>
          <TableCell className="text-right font-bold">
            {fmtBRL(totals.seguro)}
          </TableCell>
          <TableCell className="text-right font-bold text-amber-400">
            {fmtBRL(totals.total)}
          </TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}
