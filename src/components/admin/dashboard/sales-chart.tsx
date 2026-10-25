"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { formatMoney } from "@/lib/format";

const config = {
  revenue: { label: "Ingresos", color: "var(--chart-1)" },
  profit: { label: "Ganancia", color: "var(--chart-2)" },
} satisfies ChartConfig;

const compact = new Intl.NumberFormat("es-AR", { notation: "compact", maximumFractionDigits: 1 });

export function SalesChart({ data }: { data: { label: string; revenue: number; profit: number }[] }) {
  return (
    <ChartContainer config={config} className="aspect-auto h-72 w-full">
      <BarChart data={data} margin={{ left: 4, right: 4 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={(v: number) => `$${compact.format(v)}`} />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent formatter={(value, name) => (
            <div className="flex w-full justify-between gap-4">
              <span className="text-muted-foreground">{config[name as keyof typeof config]?.label ?? name}</span>
              <span className="font-mono font-medium tabular-nums">{formatMoney(Number(value))}</span>
            </div>
          )} />}
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="profit" fill="var(--color-profit)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
