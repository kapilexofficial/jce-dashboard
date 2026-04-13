"use client";

import { Pie, PieChart, Cell, Label } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface Props {
  statusCounts: Record<string, number>;
}

// Maps ESL Cloud status strings → display category keys.
// Real values observed from API: pending, manifested, in_transit, finished, done.
const STATUS_MAP: Record<string, string> = {
  pending: "pendente",
  created: "pendente",
  draft: "pendente",
  open: "pendente",

  released: "liberado",
  approved: "liberado",

  manifested: "coleta",
  collecting: "coleta",
  pick: "coleta",

  in_transit: "transito",
  in_progress: "transito",
  transit: "transito",

  finished: "finalizado",
  done: "finalizado",
  delivered: "finalizado",

  cancelled: "cancelado",
  canceled: "cancelado",
};

const CATEGORIES: { key: string; label: string; color: string }[] = [
  { key: "pendente",   label: "Pendente",    color: "oklch(0.78 0.16 75)"  }, // amber
  { key: "liberado",   label: "Liberado",    color: "oklch(0.72 0.15 195)" }, // teal
  { key: "coleta",     label: "Em Coleta",   color: "oklch(0.68 0.18 290)" }, // purple
  { key: "transito",   label: "Em Trânsito", color: "oklch(0.68 0.17 250)" }, // blue
  { key: "finalizado", label: "Finalizado",  color: "oklch(0.72 0.17 160)" }, // green
  { key: "cancelado",  label: "Cancelado",   color: "oklch(0.65 0.20 25)"  }, // red
];

export function FreightStatusChart({ statusCounts }: Props) {
  const grouped: Record<string, number> = Object.fromEntries(
    CATEGORIES.map((c) => [c.key, 0])
  );

  Object.entries(statusCounts).forEach(([status, count]) => {
    const key = STATUS_MAP[status.toLowerCase()];
    if (key) grouped[key] += count;
  });

  const total = Object.values(grouped).reduce((s, v) => s + v, 0);

  if (total === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Status dos Fretes</CardTitle>
          <CardDescription>Sem dados disponíveis</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const data = CATEGORIES
    .filter((c) => grouped[c.key] > 0)
    .map((c) => ({ name: c.key, label: c.label, value: grouped[c.key], fill: c.color }));

  const chartConfig = Object.fromEntries(
    CATEGORIES.map((c) => [c.key, { label: c.label, color: c.color }])
  ) satisfies ChartConfig;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Status dos Fretes</CardTitle>
        <CardDescription>Distribuição por etapa da operação</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[240px] w-full">
          <PieChart accessibilityLayer>
            <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={65}
              outerRadius={105}
              strokeWidth={3}
              stroke="var(--background)"
            >
              {data.map((d) => (
                <Cell key={d.name} fill={d.fill} />
              ))}
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                        <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-3xl font-bold">
                          {total}
                        </tspan>
                        <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 22} className="fill-muted-foreground text-xs">
                          fretes
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>

        {/* Numeric legend */}
        <div className="grid grid-cols-3 gap-x-3 gap-y-2 mt-3">
          {CATEGORIES.map((c) => (
            <div key={c.key} className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
              <div className="min-w-0">
                <p className="text-xs font-semibold leading-tight">{grouped[c.key]}</p>
                <p className="text-[10px] text-muted-foreground leading-tight truncate">{c.label}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
