"use client";

import { useState, useMemo } from "react";
import {
  Receipt,
  Truck,
  Search,
  TrendingUp,
  DollarSign,
  Route,
  Weight,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { VehicleRest, FreightDreNode, FreightMargin } from "@/lib/esl-api";

function fmtCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function fmtPct(v: number) {
  return `${v.toFixed(1)}%`;
}

interface DreRow {
  label: string;
  value: number;
  pct: number;
  indent?: boolean;
  bold?: boolean;
  highlight?: "green" | "red" | "blue";
  separator?: boolean;
}

export function DreClient({
  vehicles,
  freights,
  margins,
}: {
  vehicles: VehicleRest[];
  freights: FreightDreNode[];
  margins: FreightMargin[];
}) {
  const [plateSearch, setPlateSearch] = useState("");
  const [selectedPlate, setSelectedPlate] = useState<string | null>(null);
  const [dateStart, setDateStart] = useState("2025-01-01");
  const [dateEnd, setDateEnd] = useState(new Date().toISOString().split("T")[0]);

  // Build map of plates that have freight data
  const freightsWithVehicle = useMemo(() => {
    return freights.filter((f) => f.lastManifest?.vehicle?.licensePlate);
  }, [freights]);

  // Unique plates from freights
  const platesInUse = useMemo(() => {
    const map: Record<string, { model: string; count: number; vehicleId: string }> = {};
    freightsWithVehicle.forEach((f) => {
      const plate = f.lastManifest!.vehicle.licensePlate;
      if (!map[plate]) {
        map[plate] = { model: f.lastManifest!.vehicle.model, count: 0, vehicleId: f.lastManifest!.vehicle.id };
      }
      map[plate].count += 1;
    });
    return map;
  }, [freightsWithVehicle]);

  const activeVehicles = vehicles.filter((v) => v.status === "active");

  // Merge REST vehicles with plates derived from freights (fallback when REST is empty/401).
  // Keeps `VehicleRest` shape so downstream code stays the same.
  const mergedVehicles = useMemo<VehicleRest[]>(() => {
    const byPlate = new Map<string, VehicleRest>();
    activeVehicles.forEach((v) => byPlate.set(v.license_plate, v));
    Object.entries(platesInUse).forEach(([plate, info]) => {
      if (!byPlate.has(plate)) {
        byPlate.set(plate, {
          id: Number(info.vehicleId) || 0,
          license_plate: plate,
          model: info.model || "—",
          fleet_number: null,
          status: "active",
        });
      }
    });
    return [...byPlate.values()];
  }, [activeVehicles, platesInUse]);

  const filteredVehicles = useMemo(() => {
    // Show plates with data first, then all
    const withData = mergedVehicles.filter((v) => platesInUse[v.license_plate]);
    const withoutData = mergedVehicles.filter((v) => !platesInUse[v.license_plate]);
    const all = [...withData, ...withoutData];
    if (!plateSearch) return all;
    return all.filter((v) =>
      v.license_plate.toLowerCase().includes(plateSearch.toLowerCase()) ||
      v.model.toLowerCase().includes(plateSearch.toLowerCase())
    );
  }, [mergedVehicles, plateSearch, platesInUse]);

  // Filter freights by selected plate and date
  const filteredFreights = useMemo(() => {
    let data = freightsWithVehicle;
    if (selectedPlate) {
      data = data.filter((f) => f.lastManifest!.vehicle.licensePlate === selectedPlate);
    }
    return data.filter((f) => {
      const date = f.serviceAt.split("T")[0];
      return date >= dateStart && date <= dateEnd;
    });
  }, [freightsWithVehicle, selectedPlate, dateStart, dateEnd]);

  // Also filter margins by date for consolidated view
  const filteredMargins = useMemo(() => {
    return margins.filter((m) => {
      const date = m.service_at.split("T")[0];
      return date >= dateStart && date <= dateEnd;
    });
  }, [margins, dateStart, dateEnd]);

  const vehicle = selectedPlate
    ? activeVehicles.find((v) => v.license_plate === selectedPlate)
    : null;

  // Build DRE from filtered data
  const dreData = useMemo((): DreRow[] => {
    if (selectedPlate) {
      // DRE by vehicle - use freight + manifest data
      const data = filteredFreights;
      if (data.length === 0) return [];

      const totalRevenue = data.reduce((s, f) => s + f.total, 0);
      const totalWeight = data.reduce((s, f) => s + f.realWeight, 0);
      const totalKm = data.reduce((s, f) => s + (f.lastManifest?.km || 0), 0);

      // Manifest costs
      const freightCost = data.reduce((s, f) => s + (f.lastManifest?.freightSubtotal || 0), 0);
      const deliveryCost = data.reduce((s, f) => s + (f.lastManifest?.deliverySubtotal || 0), 0);
      const pickCost = data.reduce((s, f) => s + (f.lastManifest?.pickSubtotal || 0), 0);
      const fuelCost = data.reduce((s, f) => s + (f.lastManifest?.fuelSubtotal || 0), 0);
      const tollCost = data.reduce((s, f) => s + (f.lastManifest?.tollSubtotal || 0), 0);
      const dailyCost = data.reduce((s, f) => s + (f.lastManifest?.dailySubtotal || 0), 0);
      const expensesCost = data.reduce((s, f) => s + (f.lastManifest?.expensesSubtotal || 0), 0);
      const discounts = data.reduce((s, f) => s + (f.lastManifest?.discountsSubtotal || 0), 0);
      const advances = data.reduce((s, f) => s + (f.lastManifest?.advanceSubtotal || 0), 0);
      const totalManifestCost = data.reduce((s, f) => s + (f.lastManifest?.totalCost || 0), 0);

      const totalCosts = freightCost + deliveryCost + pickCost + fuelCost + tollCost + dailyCost + expensesCost;
      const result = totalRevenue - totalCosts;
      const base = totalRevenue || 1;

      const rows: DreRow[] = [
        { label: "RECEITA BRUTA DE FRETE", value: totalRevenue, pct: 100, bold: true, highlight: "blue" },
        { label: `CT-e emitidos (${data.length} fretes)`, value: totalRevenue, pct: 100, indent: true },
        { label: "", value: 0, pct: 0, separator: true },
        { label: "(-) CUSTOS VARIÁVEIS", value: -(freightCost + deliveryCost + pickCost), pct: ((freightCost + deliveryCost + pickCost) / base) * 100, bold: true, highlight: "red" },
        { label: "Frete (manifesto)", value: -freightCost, pct: (freightCost / base) * 100, indent: true },
        { label: "Entrega", value: -deliveryCost, pct: (deliveryCost / base) * 100, indent: true },
        { label: "Coleta", value: -pickCost, pct: (pickCost / base) * 100, indent: true },
        { label: "", value: 0, pct: 0, separator: true },
        { label: "(-) COMBUSTÍVEL", value: -fuelCost, pct: (fuelCost / base) * 100, bold: true, highlight: "red" },
        { label: "", value: 0, pct: 0, separator: true },
        { label: "(-) PEDÁGIOS", value: -tollCost, pct: (tollCost / base) * 100, bold: true, highlight: "red" },
        { label: "", value: 0, pct: 0, separator: true },
        { label: "(-) DIÁRIAS", value: -dailyCost, pct: (dailyCost / base) * 100, bold: true },
        { label: "", value: 0, pct: 0, separator: true },
        { label: "(-) DESPESAS OPERACIONAIS", value: -expensesCost, pct: (expensesCost / base) * 100, bold: true },
        { label: "", value: 0, pct: 0, separator: true },
        { label: "(-) DESCONTOS", value: -discounts, pct: (discounts / base) * 100, bold: true },
        { label: "(+) ADIANTAMENTOS", value: advances, pct: (advances / base) * 100, bold: true },
        { label: "", value: 0, pct: 0, separator: true },
        { label: "TOTAL CUSTOS VEÍCULO", value: -totalCosts, pct: (totalCosts / base) * 100, bold: true, highlight: "red" },
        { label: "", value: 0, pct: 0, separator: true },
        { label: "RESULTADO OPERACIONAL", value: result, pct: (result / base) * 100, bold: true, highlight: result >= 0 ? "green" : "red" },
      ];
      return rows;
    } else {
      // Consolidated DRE from margins
      const data = filteredMargins;
      if (data.length === 0) return [];

      const totalRevenue = data.reduce((s, m) => s + parseFloat(m.freight_total), 0);
      const taxTotal = data.reduce((s, m) => s + parseFloat(m.tax_total), 0);
      const manifestCosts = data.reduce((s, m) =>
        s + parseFloat(m.manifest_freight_costs) + parseFloat(m.manifest_delivery_costs) +
        parseFloat(m.manifest_pick_costs) + parseFloat(m.manifest_transfer_costs) +
        parseFloat(m.manifest_dispatch_draft_costs) + parseFloat(m.manifest_consolidation_costs), 0);
      const outsourced = data.reduce((s, m) => s + parseFloat(m.outsourced_total), 0);
      const agentCosts = data.reduce((s, m) =>
        s + parseFloat(m.agent_costs) + parseFloat(m.agent_delivery_costs) + parseFloat(m.agent_pick_costs), 0);
      const commissions = data.reduce((s, m) => s + parseFloat(m.commission_costs), 0);
      const insurance = data.reduce((s, m) => s + parseFloat(m.insurance), 0);
      const totalExpenses = data.reduce((s, m) => s + parseFloat(m.total_expenses), 0);
      const totalMargin = data.reduce((s, m) => s + parseFloat(m.margin_total), 0);
      const base = totalRevenue || 1;

      return [
        { label: "RECEITA BRUTA DE FRETE", value: totalRevenue, pct: 100, bold: true, highlight: "blue" },
        { label: "", value: 0, pct: 0, separator: true },
        { label: "(-) IMPOSTOS", value: -taxTotal, pct: (taxTotal / base) * 100, bold: true, highlight: "red" },
        { label: "", value: 0, pct: 0, separator: true },
        { label: "RECEITA LÍQUIDA", value: totalRevenue - taxTotal, pct: ((totalRevenue - taxTotal) / base) * 100, bold: true, highlight: "blue" },
        { label: "", value: 0, pct: 0, separator: true },
        { label: "(-) CUSTOS MANIFESTOS", value: -manifestCosts, pct: (manifestCosts / base) * 100, bold: true, highlight: "red" },
        { label: "(-) TERCEIRIZADOS", value: -outsourced, pct: (outsourced / base) * 100, bold: true },
        { label: "(-) AGENTES", value: -agentCosts, pct: (agentCosts / base) * 100, bold: true },
        { label: "(-) COMISSÕES", value: -commissions, pct: (commissions / base) * 100, bold: true },
        { label: "(-) SEGUROS", value: -insurance, pct: (insurance / base) * 100, bold: true },
        { label: "", value: 0, pct: 0, separator: true },
        { label: "TOTAL DESPESAS", value: -totalExpenses, pct: (totalExpenses / base) * 100, bold: true, highlight: "red" },
        { label: "", value: 0, pct: 0, separator: true },
        { label: "RESULTADO (MARGEM)", value: totalMargin, pct: totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0, bold: true, highlight: totalMargin >= 0 ? "green" : "red" },
      ];
    }
  }, [selectedPlate, filteredFreights, filteredMargins]);

  // Summary for selected vehicle
  const vehicleSummary = useMemo(() => {
    if (!selectedPlate) return null;
    const data = filteredFreights;
    const revenue = data.reduce((s, f) => s + f.total, 0);
    const costs = data.reduce((s, f) => {
      const m = f.lastManifest;
      if (!m) return s;
      return s + (m.freightSubtotal || 0) + (m.deliverySubtotal || 0) + (m.pickSubtotal || 0) +
        (m.fuelSubtotal || 0) + (m.tollSubtotal || 0) + (m.dailySubtotal || 0) + (m.expensesSubtotal || 0);
    }, 0);
    return {
      freights: data.length,
      revenue,
      weight: data.reduce((s, f) => s + f.realWeight, 0),
      km: data.reduce((s, f) => s + (f.lastManifest?.km || 0), 0),
      result: revenue - costs,
    };
  }, [selectedPlate, filteredFreights]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">DRE por Veículo</h2>
        <p className="text-muted-foreground mt-1">
          Demonstração do Resultado - cada veículo como uma mini empresa
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px] max-w-xs">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Buscar Veículo
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Placa ou modelo..."
                  className="pl-9"
                  value={plateSearch}
                  onChange={(e) => setPlateSearch(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Início
              </label>
              <Input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} className="w-[160px]" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Fim
              </label>
              <Input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} className="w-[160px]" />
            </div>
            {selectedPlate && (
              <button
                onClick={() => setSelectedPlate(null)}
                className="text-xs text-primary hover:underline pb-2"
              >
                Limpar seleção
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Vehicle Info + KPIs */}
      {selectedPlate && vehicle && (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="pt-6 flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 ring-1 ring-primary/30 mb-3">
                <Truck className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold font-mono">{vehicle.license_plate}</h3>
              <p className="text-xs text-muted-foreground mt-1">{vehicle.model}</p>
              <Badge variant="secondary" className="mt-2">{vehicle.status}</Badge>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Fretes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{vehicleSummary?.freights || 0}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><FileText className="h-3 w-3" /> no período</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Receita</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-400">{fmtCurrency(vehicleSummary?.revenue || 0)}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><DollarSign className="h-3 w-3" /> faturado</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 grid grid-rows-2 divide-y divide-border h-full">
              <div className="pb-3">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">KM Rodados</p>
                <div className="text-2xl font-bold mt-1">{(vehicleSummary?.km || 0).toLocaleString("pt-BR")}</div>
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><Route className="h-3 w-3" /> km total</p>
              </div>
              <div className="pt-3">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Peso</p>
                <div className="text-2xl font-bold mt-1">{((vehicleSummary?.weight || 0) / 1000).toFixed(1)}t</div>
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><Weight className="h-3 w-3" /> transportado</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-500/20 bg-gradient-to-br from-red-500/5 to-red-500/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Despesas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400">{fmtCurrency((vehicleSummary?.revenue || 0) - (vehicleSummary?.result || 0))}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><DollarSign className="h-3 w-3" /> custos totais</p>
            </CardContent>
          </Card>
          <Card className={`border-2 ${
            (vehicleSummary?.result || 0) >= 0
              ? "border-emerald-500/50 bg-gradient-to-br from-emerald-500/10 to-emerald-500/20"
              : "border-red-500/50 bg-gradient-to-br from-red-500/10 to-red-500/20"
          }`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Resultado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                (vehicleSummary?.result || 0) >= 0 ? "text-emerald-400" : "text-red-400"
              }`}>
                {fmtCurrency(vehicleSummary?.result || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {vehicleSummary?.revenue
                  ? fmtPct(((vehicleSummary.result || 0) / vehicleSummary.revenue) * 100)
                  : "0%"} margem
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* DRE Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                DRE - Demonstração do Resultado
              </CardTitle>
              <CardDescription>
                {selectedPlate ? (
                  <>Veículo <span className="font-mono font-bold text-foreground">{selectedPlate}</span> | {filteredFreights.length} fretes</>
                ) : (
                  <>Visão consolidada | {filteredMargins.length} fretes</>
                )} | {dateStart} a {dateEnd}
              </CardDescription>
            </div>
            {!selectedPlate && (
              <Badge variant="outline" className="text-xs">Selecione um veículo para DRE individual</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {dreData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Receipt className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-lg font-medium">Nenhum dado encontrado</p>
              <p className="text-sm mt-1">
                {selectedPlate
                  ? "Este veículo não possui fretes com manifesto no período selecionado"
                  : "Altere o período para visualizar dados"}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden">
              <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-muted/50 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                <div className="col-span-7">Descrição</div>
                <div className="col-span-3 text-right">Valor (R$)</div>
                <div className="col-span-2 text-right">% Receita</div>
              </div>
              {dreData.map((row, i) => {
                if (row.separator) return <Separator key={i} className="!bg-border/30" />;
                const hlClass =
                  row.highlight === "green" ? "bg-emerald-500/5" :
                  row.highlight === "red" ? "" :
                  row.highlight === "blue" ? "bg-primary/5" : "";
                const textClass =
                  row.highlight === "green" ? "text-emerald-400" :
                  row.highlight === "red" ? "text-red-400" :
                  row.highlight === "blue" ? "text-primary" : "";

                return (
                  <div
                    key={i}
                    className={`grid grid-cols-12 gap-4 px-6 py-2.5 border-b border-border/20 items-center transition-colors hover:bg-muted/20 ${
                      row.bold ? `font-semibold ${hlClass}` : ""
                    }`}
                  >
                    <div className={`col-span-7 text-sm ${row.indent ? "pl-6 text-muted-foreground font-normal" : textClass}`}>
                      {row.bold && !row.indent && (
                        <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{
                          backgroundColor:
                            row.highlight === "green" ? "oklch(0.75 0.18 165)" :
                            row.highlight === "red" ? "oklch(0.65 0.22 22)" :
                            row.highlight === "blue" ? "oklch(0.68 0.19 265)" : "transparent"
                        }} />
                      )}
                      {row.label}
                    </div>
                    <div className={`col-span-3 text-right text-sm font-mono ${
                      row.bold ? textClass : row.value < 0 ? "text-red-400/70" : "text-muted-foreground"
                    }`}>
                      {row.value !== 0 ? fmtCurrency(row.value) : "-"}
                    </div>
                    <div className={`col-span-2 text-right text-sm font-mono ${row.bold ? "text-muted-foreground" : "text-muted-foreground/60"}`}>
                      {row.pct > 0 || row.label.includes("RESULTADO") ? fmtPct(row.pct) : "-"}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Freight details for selected vehicle */}
          {selectedPlate && filteredFreights.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-semibold mb-3">Fretes deste veículo no período</h4>
              <div className="space-y-2">
                {filteredFreights.map((f) => (
                  <div key={f.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="font-mono text-xs">#{f.sequenceCode}</Badge>
                      <div>
                        <p className="font-medium">{f.sender.name} → {f.recipient.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {f.originCity.name}/{f.originCity.state.code} → {f.destinationCity.name}/{f.destinationCity.state.code}
                          {f.lastManifest?.km ? ` • ${f.lastManifest.km.toLocaleString("pt-BR")}km` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{fmtCurrency(f.total)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(f.serviceAt).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vehicle Fleet */}
      <Card>
        <CardHeader>
          <CardTitle>Frota</CardTitle>
          <CardDescription>
            {Object.keys(platesInUse).length} veículos com fretes vinculados | {activeVehicles.length} ativos no total
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredVehicles.slice(0, 60).map((v) => {
              const hasData = platesInUse[v.license_plate];
              const isSelected = selectedPlate === v.license_plate;
              return (
                <button
                  key={v.id}
                  onClick={() => {
                    setSelectedPlate(isSelected ? null : v.license_plate);
                    if (!isSelected) window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all hover:border-primary/40 ${
                    isSelected
                      ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                      : hasData
                      ? "border-border hover:bg-accent/50"
                      : "border-border/50 opacity-50 hover:opacity-75"
                  }`}
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg shrink-0 ${
                    isSelected ? "bg-primary/20 text-primary" : hasData ? "bg-muted text-muted-foreground" : "bg-muted/50 text-muted-foreground/50"
                  }`}>
                    <Truck className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold font-mono">{v.license_plate}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{v.model}</p>
                  </div>
                  {hasData && (
                    <Badge variant={isSelected ? "default" : "secondary"} className="text-[10px] shrink-0">
                      {hasData.count}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
