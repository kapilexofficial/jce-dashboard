"use client";

import { useState } from "react";
import {
  FileBarChart,
  Download,
  Eye,
  Search,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";
import { DateFilter } from "@/components/date-filter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ReportTemplate {
  id: number;
  name: string;
  description: string;
  category: string;
  lastRun: string;
}

interface ReportData {
  columns: string[];
  rows: Record<string, string | number>[];
}

// Dados de demonstração
const templates: ReportTemplate[] = [
  {
    id: 771,
    name: "Fretes por Período",
    description: "Relatório detalhado de fretes com valores, rotas e status",
    category: "Operacional",
    lastRun: "07/04/2026",
  },
  {
    id: 772,
    name: "Faturas a Receber",
    description: "Listagem de faturas em aberto e vencidas por cliente",
    category: "Financeiro",
    lastRun: "06/04/2026",
  },
  {
    id: 773,
    name: "Margem de Frete",
    description: "Análise de margem por frete com receita e custo",
    category: "Financeiro",
    lastRun: "05/04/2026",
  },
  {
    id: 774,
    name: "Ocorrências por Período",
    description: "Relatório de ocorrências agrupadas por tipo e status",
    category: "Operacional",
    lastRun: "07/04/2026",
  },
  {
    id: 775,
    name: "Performance de Entrega",
    description: "Indicadores de SLA e taxa de entrega no prazo",
    category: "Gestão",
    lastRun: "04/04/2026",
  },
  {
    id: 776,
    name: "Consolidações Rodoviárias",
    description: "Relatório de consolidações com itens e status",
    category: "Operacional",
    lastRun: "03/04/2026",
  },
];

const demoReportData: ReportData = {
  columns: ["Frete", "Data", "Origem", "Destino", "Valor", "Status"],
  rows: [
    { Frete: "FRT-28734", Data: "07/04/2026", Origem: "São Paulo, SP", Destino: "Rio de Janeiro, RJ", Valor: "R$ 3.450,00", Status: "Em Trânsito" },
    { Frete: "FRT-28733", Data: "07/04/2026", Origem: "Curitiba, PR", Destino: "Florianópolis, SC", Valor: "R$ 1.890,00", Status: "Entregue" },
    { Frete: "FRT-28732", Data: "06/04/2026", Origem: "Belo Horizonte, MG", Destino: "Vitória, ES", Valor: "R$ 2.100,00", Status: "Pendente" },
    { Frete: "FRT-28731", Data: "06/04/2026", Origem: "Campinas, SP", Destino: "Ribeirão Preto, SP", Valor: "R$ 980,00", Status: "Em Trânsito" },
    { Frete: "FRT-28730", Data: "05/04/2026", Origem: "Salvador, BA", Destino: "Recife, PE", Valor: "R$ 4.200,00", Status: "Entregue" },
  ],
};

const categoryColors: Record<string, "default" | "secondary" | "outline"> = {
  Operacional: "default",
  Financeiro: "secondary",
  Gestão: "outline",
};

export default function RelatoriosPage() {
  const [searchFilter, setSearchFilter] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [dateStart, setDateStart] = useState("2025-01-01");
  const [dateEnd, setDateEnd] = useState(new Date().toISOString().split("T")[0]);

  const filtered = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      t.category.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const handleExecute = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    setLoading(true);
    // Simula execução - será substituído por chamada real: getReportData(template.id)
    setTimeout(() => {
      setReportData(demoReportData);
      setLoading(false);
    }, 1000);
  };

  const handleExport = () => {
    if (!selectedTemplate) return;
    setExporting(true);
    // Simula exportação - será substituído por chamada real: exportReportXlsx(template.id, {})
    setTimeout(() => {
      setExporting(false);
      alert("Exportação XLSX solicitada! O arquivo será disponibilizado via FTP.");
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Relatórios</h2>
        <p className="text-muted-foreground">
          Execute e exporte relatórios a partir dos templates configurados
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <DateFilter dateStart={dateStart} dateEnd={dateEnd} onStartChange={setDateStart} onEndChange={setDateEnd} />
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar relatório..."
            className="pl-9"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((template) => (
          <Card key={template.id} className="flex flex-col">
            <CardHeader className="flex-1">
              <div className="flex items-start justify-between">
                <FileBarChart className="h-5 w-5 text-muted-foreground" />
                <Badge variant={categoryColors[template.category] || "default"}>
                  {template.category}
                </Badge>
              </div>
              <CardTitle className="text-base">{template.name}</CardTitle>
              <CardDescription className="text-xs">
                {template.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Última execução: {template.lastRun}
                </span>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleExecute(template)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Ver
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Report Data Preview */}
      {selectedTemplate && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{selectedTemplate.name}</CardTitle>
                <CardDescription>{selectedTemplate.description}</CardDescription>
              </div>
              <Button onClick={handleExport} disabled={exporting || !reportData}>
                {exporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Exportar XLSX
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Executando relatório...</span>
              </div>
            ) : reportData ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {reportData.columns.map((col) => (
                        <TableHead key={col}>{col}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.rows.map((row, i) => (
                      <TableRow key={i}>
                        {reportData.columns.map((col) => (
                          <TableCell key={col} className="text-sm">
                            {row[col]}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
