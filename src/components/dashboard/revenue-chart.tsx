"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import type { FreightMargin } from "@/lib/esl-api";

interface Props {
  margins: FreightMargin[];
}

const chartConfig = {
  receita: { label: "Receita", color: "var(--chart-1)" },
  margem: { label: "Margem", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function RevenueChart({ margins }: Props) {
  const byMonth: Record<string, { receita: number; margem: number; despesas: number }> = {};
  margins.forEach((m) => {
    const date = new Date(m.service_at);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!byMonth[key]) byMonth[key] = { receita: 0, margem: 0, despesas: 0 };
    byMonth[key].receita += parseFloat(m.freight_total);
    byMonth[key].margem += parseFloat(m.margin_total);
    byMonth[key].despesas += parseFloat(m.total_expenses);
  });

  const monthNames: Record<string, string> = {
    "01": "Jan", "02": "Fev", "03": "Mar", "04": "Abr",
    "05": "Mai", "06": "Jun", "07": "Jul", "08": "Ago",
    "09": "Set", "10": "Out", "11": "Nov", "12": "Dez",
  };

  const data = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, values]) => ({
      month: `${monthNames[key.split("-")[1]]}/${key.slice(2, 4)}`,
      receita: values.receita,
      margem: values.margem,
    }));

  if (data.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Receita vs Margem</CardTitle>
          <CardDescription>Sem dados de margem disponiveis</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Receita vs Margem</CardTitle>
        <CardDescription>Evolucao mensal</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <AreaChart data={data} accessibilityLayer>
            <defs>
              <linearGradient id="gradReceita" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-receita)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--color-receita)" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradMargem" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-margem)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--color-margem)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
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
            <Area
              dataKey="receita"
              fill="url(#gradReceita)"
              stroke="var(--color-receita)"
              strokeWidth={2.5}
              type="monotone"
            />
            <Area
              dataKey="margem"
              fill="url(#gradMargem)"
              stroke="var(--color-margem)"
              strokeWidth={2.5}
              type="monotone"
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
