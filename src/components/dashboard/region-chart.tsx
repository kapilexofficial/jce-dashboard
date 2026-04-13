"use client";

import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Cell } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface RegionData {
  state: string;
  revenue: number;
  count: number;
}

const stateColors: Record<string, string> = {
  SP: "oklch(0.55 0.20 260)",
  RJ: "oklch(0.65 0.18 165)",
  MG: "oklch(0.70 0.16 45)",
  BA: "oklch(0.60 0.20 310)",
  PR: "oklch(0.72 0.14 80)",
  SC: "oklch(0.58 0.15 200)",
  RS: "oklch(0.65 0.12 130)",
  RN: "oklch(0.68 0.18 25)",
  PE: "oklch(0.62 0.16 280)",
  GO: "oklch(0.70 0.10 100)",
};

const chartConfig = {
  revenue: { label: "Receita", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function RegionChart({ regions }: { regions: RegionData[] }) {
  if (regions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Faturamento por Regiao</CardTitle>
          <CardDescription>Sem dados disponiveis</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Faturamento por Destino</CardTitle>
        <CardDescription>Receita por estado de destino</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[350px] w-full">
          <BarChart data={regions} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="state" tickLine={false} axisLine={false} tick={{ fontSize: 12, fontWeight: 600 }} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) =>
                v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
              }
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) =>
                    `R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                  }
                />
              }
            />
            <Bar dataKey="revenue" radius={[6, 6, 0, 0]} barSize={40}>
              {regions.map((entry, i) => (
                <Cell key={entry.state} fill={stateColors[entry.state] || `oklch(0.6 0.15 ${(i * 60) % 360})`} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-4 justify-center">
          {regions.map((r) => (
            <div key={r.state} className="flex items-center gap-1.5 text-xs">
              <div
                className="h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: stateColors[r.state] || "var(--chart-1)" }}
              />
              <span className="font-medium">{r.state}</span>
              <span className="text-muted-foreground">({r.count})</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
