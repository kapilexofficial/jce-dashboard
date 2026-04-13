"use client";

import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface ClientData {
  name: string;
  revenue: number;
  margin: number;
  count: number;
  weight: number;
}

const chartConfig = {
  revenue: { label: "Receita", color: "var(--chart-1)" },
  margin: { label: "Margem", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function TopClientsChart({ clients }: { clients: ClientData[] }) {
  const data = clients.map((c) => ({
    name: c.name.length > 18 ? c.name.slice(0, 18) + "..." : c.name,
    fullName: c.name,
    revenue: c.revenue,
    margin: c.margin,
    count: c.count,
  }));

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Clientes</CardTitle>
          <CardDescription>Sem dados disponiveis</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Faturamento por Cliente</CardTitle>
        <CardDescription>Receita e margem por remetente</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[350px] w-full">
          <BarChart data={data} layout="vertical" accessibilityLayer margin={{ left: 10 }}>
            <CartesianGrid horizontal={false} />
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) =>
                v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
              }
            />
            <YAxis
              dataKey="name"
              type="category"
              tickLine={false}
              axisLine={false}
              width={130}
              tick={{ fontSize: 11 }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => {
                    const num = Number(value);
                    return `R$ ${num.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
                  }}
                />
              }
            />
            <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[0, 4, 4, 0]} barSize={14} />
            <Bar dataKey="margin" fill="var(--color-margin)" radius={[0, 4, 4, 0]} barSize={14} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
