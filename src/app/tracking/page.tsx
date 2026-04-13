"use client";

import { useState } from "react";
import { Search, MapPin, Truck, Package, CheckCircle, AlertTriangle, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface TrackingEvent {
  date: string;
  time: string;
  status: string;
  location: string;
  description: string;
  type: "success" | "info" | "warning" | "error";
}

interface TrackingResult {
  freightId: string;
  cteNumber: string;
  status: string;
  sender: string;
  recipient: string;
  origin: string;
  destination: string;
  weight: string;
  volumes: number;
  estimatedDelivery: string;
  events: TrackingEvent[];
}

// Dados de demonstração - serão substituídos por dados reais da API
const demoResult: TrackingResult = {
  freightId: "FRT-28734",
  cteNumber: "35221104435262000130573520001001721229805590",
  status: "Em Trânsito",
  sender: "Indústria ABC Ltda",
  recipient: "Comércio XYZ ME",
  origin: "São Paulo, SP",
  destination: "Rio de Janeiro, RJ",
  weight: "450 kg",
  volumes: 12,
  estimatedDelivery: "08/04/2026",
  events: [
    {
      date: "07/04/2026",
      time: "14:30",
      status: "Em trânsito",
      location: "Resende, RJ",
      description: "Mercadoria em trânsito para o destino final",
      type: "info",
    },
    {
      date: "07/04/2026",
      time: "08:15",
      status: "Saída filial",
      location: "São Paulo, SP",
      description: "Mercadoria despachada da filial de origem",
      type: "info",
    },
    {
      date: "06/04/2026",
      time: "18:00",
      status: "Em triagem",
      location: "São Paulo, SP",
      description: "Mercadoria sendo triada para embarque",
      type: "info",
    },
    {
      date: "06/04/2026",
      time: "10:30",
      status: "Coletado",
      location: "São Paulo, SP",
      description: "Mercadoria coletada no remetente",
      type: "success",
    },
    {
      date: "05/04/2026",
      time: "16:00",
      status: "Coleta agendada",
      location: "São Paulo, SP",
      description: "Coleta agendada para 06/04/2026",
      type: "info",
    },
  ],
};

const eventIcons = {
  success: <CheckCircle className="h-4 w-4 text-emerald-500" />,
  info: <Truck className="h-4 w-4 text-blue-500" />,
  warning: <Clock className="h-4 w-4 text-amber-500" />,
  error: <AlertTriangle className="h-4 w-4 text-destructive" />,
};

export default function TrackingPage() {
  const [search, setSearch] = useState("");
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = () => {
    if (!search.trim()) return;
    setLoading(true);
    // Simula busca - será substituído por chamada à API
    setTimeout(() => {
      setResult(demoResult);
      setLoading(false);
    }, 800);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Tracking</h2>
        <p className="text-muted-foreground">
          Rastreie entregas por número de frete, CT-e ou nota fiscal
        </p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Digite o número do frete, chave CT-e ou nota fiscal..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? "Buscando..." : "Rastrear"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Result */}
      {result && (
        <div className="grid gap-4 md:grid-cols-3">
          {/* Freight Info */}
          <Card className="md:col-span-1">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{result.freightId}</CardTitle>
                <Badge>{result.status}</Badge>
              </div>
              <CardDescription className="font-mono text-xs break-all">
                CT-e: {result.cteNumber}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Remetente</p>
                  <p className="text-sm font-medium">{result.sender}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Destinatário</p>
                  <p className="text-sm font-medium">{result.recipient}</p>
                </div>
                <Separator />
                <div className="flex items-center gap-2">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Origem</p>
                    <p className="text-sm">{result.origin}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-3 w-3 text-emerald-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Destino</p>
                    <p className="text-sm">{result.destination}</p>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Peso</p>
                    <p className="text-sm font-medium">{result.weight}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Volumes</p>
                    <p className="text-sm font-medium">{result.volumes}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Previsão de Entrega</p>
                  <p className="text-sm font-medium">{result.estimatedDelivery}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Histórico de Movimentação</CardTitle>
              <CardDescription>Timeline completa do frete</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-0">
                {result.events.map((event, i) => (
                  <div key={i} className="flex gap-4">
                    {/* Timeline line */}
                    <div className="flex flex-col items-center">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border bg-background">
                        {eventIcons[event.type]}
                      </div>
                      {i < result.events.length - 1 && (
                        <div className="w-px flex-1 bg-border" />
                      )}
                    </div>
                    {/* Content */}
                    <div className="flex-1 pb-6">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{event.status}</p>
                        <span className="text-xs text-muted-foreground">
                          {event.date} às {event.time}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {event.location}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {event.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty state */}
      {!result && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">Rastreie sua entrega</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Digite o número do frete, chave do CT-e ou nota fiscal acima
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
