import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { AlertTriangle, ArrowRight, ClipboardList, Globe, Package, TrendingUp } from "lucide-react";
import { ReportDownloads } from "@/components/admin/dashboard/report-downloads";
import { SalesChart } from "@/components/admin/dashboard/sales-chart";
import { PageHeader } from "@/components/admin/page-header";
import { CardsSkeleton } from "@/components/admin/skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  currentYearMonth,
  getInventoryValue,
  getMonthlySeries,
  getOperationalCounters,
  getSalesByChannel,
  getSalesByPriceType,
  getTopProducts,
  monthRange,
} from "@/lib/data/stats";
import { channelLabel, formatMoney, formatNumber, priceTypeLabel } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="Dashboard" description="Cómo viene el negocio: ventas, pedidos e inventario." />
      <Suspense fallback={<CardsSkeleton />}>
        <Kpis />
      </Suspense>
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Ventas de los últimos 12 meses</CardTitle>
            <CardDescription>Pedidos entregados. La ganancia usa el costo de cada prenda al momento de la venta.</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<Skeleton className="h-72 w-full" />}>
              <MonthlyChart />
            </Suspense>
          </CardContent>
        </Card>
        <Card>
          <Tabs defaultValue="pago" className="gap-6">
            <CardHeader>
              <CardTitle>Ventas por…</CardTitle>
              <CardDescription>Histórico de ventas entregadas.</CardDescription>
              <TabsList className="mt-2 w-full">
                <TabsTrigger value="pago">Forma de pago</TabsTrigger>
                <TabsTrigger value="canal">Canal</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent>
              <TabsContent value="pago">
                <Suspense fallback={<Skeleton className="h-56 w-full" />}>
                  <PaymentBreakdown />
                </Suspense>
              </TabsContent>
              <TabsContent value="canal">
                <Suspense fallback={<Skeleton className="h-56 w-full" />}>
                  <ChannelBreakdown />
                </Suspense>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Más vendidos</CardTitle>
            <CardDescription>Últimos 90 días.</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<Skeleton className="h-48 w-full" />}>
              <TopProducts />
            </Suspense>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Stock bajo</CardTitle>
            <CardDescription>Prendas con 2 unidades o menos.</CardDescription>
            <CardAction>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/inventario?sort=stock">
                  Ver todo <ArrowRight />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<Skeleton className="h-48 w-full" />}>
              <LowStock />
            </Suspense>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2 xl:col-span-1">
          <CardHeader>
            <CardTitle>Reportes en Excel</CardTitle>
            <CardDescription>Detalle de ventas con costo, precio y ganancia por prenda.</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<Skeleton className="h-20 w-full" />}>
              <Reports />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Kpi({
  title,
  value,
  hint,
  icon: Icon,
  href,
}: {
  title: string;
  value: string;
  hint: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
}) {
  const body = (
    <Card className="h-full gap-2 transition-colors hover:border-primary/40">
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardAction>
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-4" />
          </span>
        </CardAction>
        <CardTitle className="text-2xl font-semibold tracking-tight tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">{hint}</CardContent>
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

async function Kpis() {
  await connection();
  const { year, month } = currentYearMonth();
  const { from, to } = monthRange(year, month);
  const [monthSales, counters, inventory] = await Promise.all([
    getSalesByPriceType(from, to),
    getOperationalCounters(),
    getInventoryValue(),
  ]);
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Kpi
        title="Ventas del mes"
        value={formatMoney(monthSales.total.revenue)}
        icon={TrendingUp}
        hint={
          <>
            Ganancia {formatMoney(monthSales.total.profit)} · {formatNumber(monthSales.total.units)} prendas
          </>
        }
      />
      <Kpi
        title="Pendientes de entrega"
        value={formatNumber(counters.pendingOrders)}
        icon={ClipboardList}
        href="/admin/pedidos"
        hint={
          <>
            {formatMoney(counters.pendingAmount)} a cobrar
            {counters.preOrderUnits > 0 && ` · ${counters.preOrderUnits} prendas a comprar`}
          </>
        }
      />
      <Kpi
        title="Pedidos web por aprobar"
        value={formatNumber(counters.webPending)}
        icon={Globe}
        href="/admin/pedidos-web"
        hint={counters.webPending > 0 ? "Revisalos para confirmar el stock" : "Todo al día"}
      />
      <Kpi
        title="Inventario a precio de venta"
        value={formatMoney(inventory.normal)}
        icon={Package}
        href="/admin/inventario"
        hint={
          <>
            Costo {formatMoney(inventory.cost)} · {formatNumber(inventory.units)} prendas
          </>
        }
      />
    </div>
  );
}

async function MonthlyChart() {
  const series = await getMonthlySeries();
  return <SalesChart data={series} />;
}

type BreakdownRow = { key: string; label: string; units: number; revenue: number; profit: number; color: string };

function Breakdown({ rows }: { rows: BreakdownRow[] }) {
  const total = rows.reduce((s, r) => s + r.revenue, 0);
  if (rows.every((r) => r.units === 0)) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Todavía no hay ventas entregadas.</p>;
  }
  return (
    <div className="space-y-5">
      {rows.map((row) => {
        const share = total > 0 ? (row.revenue / total) * 100 : 0;
        return (
          <div key={row.key} className="space-y-1.5">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium">{row.label}</span>
              <span className="tabular-nums">{formatMoney(row.revenue)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className={`h-full rounded-full ${row.color}`} style={{ width: `${share}%` }} />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatNumber(row.units)} prendas</span>
              <span>Ganancia {formatMoney(row.profit)}</span>
            </div>
          </div>
        );
      })}
      <div className="flex justify-between border-t pt-3 text-sm font-medium">
        <span>Total</span>
        <span className="tabular-nums">{formatMoney(total)}</span>
      </div>
    </div>
  );
}

async function PaymentBreakdown() {
  const { byType } = await getSalesByPriceType();
  const colors = { NORMAL: "bg-chart-1", TRANSFER: "bg-chart-2", CUSTOM: "bg-chart-3" } as const;
  return (
    <Breakdown
      rows={(Object.keys(byType) as (keyof typeof byType)[]).map((type) => ({
        key: type,
        label: priceTypeLabel[type],
        ...byType[type],
        color: colors[type],
      }))}
    />
  );
}

async function ChannelBreakdown() {
  const byChannel = await getSalesByChannel();
  const colors = {
    IN_PERSON: "bg-chart-1",
    WHATSAPP: "bg-chart-2",
    INSTAGRAM: "bg-chart-3",
    WEB: "bg-chart-4",
    OTHER: "bg-chart-5",
  } as const;
  return (
    <Breakdown
      rows={(Object.keys(byChannel) as (keyof typeof byChannel)[])
        // "Otro" solo aparece si tiene ventas (incluye los pedidos de caja anteriores al registro de canal).
        .filter((c) => c !== "OTHER" || byChannel[c].units > 0)
        .map((c) => ({ key: c, label: channelLabel[c], ...byChannel[c], color: colors[c] }))}
    />
  );
}

async function TopProducts() {
  const top = await getTopProducts();
  if (top.length === 0) return <p className="py-10 text-center text-sm text-muted-foreground">Sin ventas en los últimos 90 días.</p>;
  const max = Math.max(...top.map((t) => t.units));
  return (
    <ol className="space-y-3">
      {top.map((p, i) => (
        <li key={p.barcode} className="flex items-center gap-3">
          <span className="w-4 text-sm text-muted-foreground tabular-nums">{i + 1}</span>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex justify-between gap-2 text-sm">
              <span className="truncate font-medium">{p.name}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">{p.units} u.</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${(p.units / max) * 100}%` }} />
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

async function LowStock() {
  const { lowStock } = await getOperationalCounters();
  if (lowStock.length === 0) return <p className="py-10 text-center text-sm text-muted-foreground">Todo el inventario tiene stock.</p>;
  return (
    <ul className="divide-y">
      {lowStock.map((p) => (
        <li key={p.id} className="flex items-center justify-between gap-2 py-2 text-sm">
          <span className="min-w-0">
            <span className="block truncate font-medium">{p.name}</span>
            <span className="text-xs text-muted-foreground">
              {p.barcode}
              {p.size && ` · T. ${p.size}`}
            </span>
          </span>
          {p.stock <= 0 ? (
            <Badge variant="destructive">Sin stock</Badge>
          ) : (
            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400">
              <AlertTriangle /> {p.stock}
            </Badge>
          )}
        </li>
      ))}
    </ul>
  );
}

async function Reports() {
  await connection();
  const { year, month } = currentYearMonth();
  return <ReportDownloads year={year} month={month} />;
}
