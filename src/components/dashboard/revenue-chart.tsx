"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { FreightMargin } from "@/lib/esl-api";

interface Props {
  margins: FreightMargin[];
  selectedMonth?: string; // "YYYY-MM" or "all"
}

const MONTH_NAMES = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

function monthLabel(ym: string) {
  const [y, m] = ym.split("-");
  return `${MONTH_NAMES[parseInt(m, 10) - 1]}/${y.slice(2)}`;
}

function prevMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function daysInMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

function fmtBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

export function RevenueChart({ margins, selectedMonth }: Props) {
  const monthsWithData = Array.from(
    new Set(margins.map((m) => m.service_at.slice(0, 7)))
  ).sort();

  const currentMonth =
    selectedMonth && selectedMonth !== "all"
      ? selectedMonth
      : monthsWithData[monthsWithData.length - 1];

  if (!currentMonth) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Receita — Comparativo Mensal</CardTitle>
          <CardDescription>Sem dados disponíveis</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const previousMonth = prevMonth(currentMonth);
  const hasPrevious = margins.some((m) =>
    m.service_at.startsWith(previousMonth)
  );

  const aggByDay = (ym: string) => {
    const daily: Record<number, number> = {};
    margins.forEach((m) => {
      if (!m.service_at.startsWith(ym)) return;
      const day = new Date(m.service_at).getDate();
      daily[day] = (daily[day] || 0) + parseFloat(m.freight_total);
    });
    return daily;
  };

  const currentDaily = aggByDay(currentMonth);
  const previousDaily = hasPrevious ? aggByDay(previousMonth) : {};

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const isCurrentCalendarMonth = currentMonth === todayKey;
  const curDays = daysInMonth(currentMonth);
  const prevDays = hasPrevious ? daysInMonth(previousMonth) : 0;
  const curMaxDay = isCurrentCalendarMonth ? Math.min(today.getDate(), curDays) : curDays;
  const horizonDays = Math.max(curDays, prevDays);

  const data: { day: number; atual?: number; anterior?: number }[] = [];
  let cumCur = 0;
  let cumPrev = 0;
  for (let d = 1; d <= horizonDays; d++) {
    cumCur += currentDaily[d] || 0;
    cumPrev += previousDaily[d] || 0;
    data.push({
      day: d,
      atual: d <= curMaxDay ? cumCur : undefined,
      anterior: hasPrevious && d <= prevDays ? cumPrev : undefined,
    });
  }

  const totalAtual = cumCur;
  const totalAnterior = cumPrev;
  const delta =
    hasPrevious && totalAnterior > 0
      ? ((totalAtual - totalAnterior) / totalAnterior) * 100
      : null;

  const chartConfig = {
    atual: { label: monthLabel(currentMonth), color: "var(--chart-1)" },
    anterior: {
      label: hasPrevious ? monthLabel(previousMonth) : "—",
      color: "oklch(0.65 0.04 230)",
    },
  } satisfies ChartConfig;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Receita — Comparativo Mensal</CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>
            <span className="font-medium text-foreground">{monthLabel(currentMonth)}:</span>{" "}
            {fmtBRL(totalAtual)}
            {isCurrentCalendarMonth && (
              <span className="text-xs text-muted-foreground"> (parcial — até dia {curMaxDay})</span>
            )}
          </span>
          {hasPrevious && (
            <span>
              <span className="font-medium text-foreground">{monthLabel(previousMonth)}:</span>{" "}
              {fmtBRL(totalAnterior)}
            </span>
          )}
          {delta !== null && (
            <span
              className={`font-semibold ${delta >= 0 ? "text-emerald-400" : "text-rose-400"}`}
            >
              {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <LineChart data={data} accessibilityLayer margin={{ left: 6, right: 12 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
              label={{
                value: "dia do mês",
                position: "insideBottom",
                offset: -4,
                style: { fontSize: 10, fill: "var(--muted-foreground)" },
              }}
            />
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
                  labelFormatter={(value) => `Dia ${value}`}
                  formatter={(value) =>
                    `R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                  }
                />
              }
            />
            {hasPrevious && (
              <Line
                dataKey="anterior"
                stroke="var(--color-anterior)"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                type="monotone"
                connectNulls
              />
            )}
            <Line
              dataKey="atual"
              stroke="var(--color-atual)"
              strokeWidth={2.5}
              dot={false}
              type="monotone"
              connectNulls
            />
            <ChartLegend content={<ChartLegendContent />} />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
