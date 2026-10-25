import "server-only";
import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/auth/dal";

type PriceType = "NORMAL" | "TRANSFER" | "CUSTOM";

/** Inicio de mes en hora de Buenos Aires (UTC-3, sin horario de verano). */
function monthStart(year: number, month: number) {
  return new Date(Date.UTC(year, month - 1, 1, 3));
}

export function currentYearMonth(now = new Date()) {
  const ar = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  return { year: ar.getUTCFullYear(), month: ar.getUTCMonth() + 1 };
}

export async function getInventoryValue() {
  await verifyAdmin();
  const [row] = await prisma.$queryRaw<
    { units: number; cost: number; normal: number; transfer: number; products: number }[]
  >`
    SELECT
      COALESCE(SUM(GREATEST(stock, 0)), 0)::int AS units,
      COALESCE(SUM(cost * GREATEST(stock, 0)), 0)::float8 AS cost,
      COALESCE(SUM("priceNormal" * GREATEST(stock, 0)), 0)::float8 AS normal,
      COALESCE(SUM("priceTransfer" * GREATEST(stock, 0)), 0)::float8 AS transfer,
      COUNT(*)::int AS products
    FROM "Product" WHERE "deletedAt" IS NULL`;
  return row;
}

/** Ventas entregadas por tipo de precio (con el costo del momento de la venta). */
export async function getSalesByPriceType(from?: Date, to?: Date) {
  await verifyAdmin();
  const rows = await prisma.$queryRaw<{ priceType: PriceType; units: number; revenue: number; cost: number }[]>`
    SELECT i."priceType",
      COALESCE(SUM(i.quantity), 0)::int AS units,
      COALESCE(SUM(i."priceAtSale" * i.quantity), 0)::float8 AS revenue,
      COALESCE(SUM(i."costAtSale" * i.quantity), 0)::float8 AS cost
    FROM "SaleItem" i JOIN "Sale" s ON s.id = i."saleId"
    WHERE s.status = 'DELIVERED'
      AND (${from ?? null}::timestamptz IS NULL OR s.date >= ${from ?? null}::timestamptz)
      AND (${to ?? null}::timestamptz IS NULL OR s.date < ${to ?? null}::timestamptz)
    GROUP BY i."priceType"`;
  const result = Object.fromEntries(
    (["NORMAL", "TRANSFER", "CUSTOM"] as const).map((t) => [t, { units: 0, revenue: 0, cost: 0, profit: 0 }]),
  ) as Record<PriceType, { units: number; revenue: number; cost: number; profit: number }>;
  for (const r of rows) result[r.priceType] = { ...r, profit: r.revenue - r.cost };
  const total = Object.values(result).reduce(
    (acc, r) => ({ units: acc.units + r.units, revenue: acc.revenue + r.revenue, cost: acc.cost + r.cost, profit: acc.profit + r.profit }),
    { units: 0, revenue: 0, cost: 0, profit: 0 },
  );
  return { byType: result, total };
}

/** Ingresos y ganancia de los últimos 12 meses (pedidos entregados). */
export async function getMonthlySeries() {
  await verifyAdmin();
  const { year, month } = currentYearMonth();
  const from = monthStart(month === 12 ? year : year - 1, month === 12 ? 1 : month + 1);
  const rows = await prisma.$queryRaw<{ ym: string; revenue: number; profit: number; orders: number }[]>`
    SELECT to_char(s.date AT TIME ZONE 'America/Argentina/Buenos_Aires', 'YYYY-MM') AS ym,
      COALESCE(SUM(i."priceAtSale" * i.quantity), 0)::float8 AS revenue,
      COALESCE(SUM((i."priceAtSale" - i."costAtSale") * i.quantity), 0)::float8 AS profit,
      COUNT(DISTINCT s.id)::int AS orders
    FROM "Sale" s JOIN "SaleItem" i ON i."saleId" = s.id
    WHERE s.status = 'DELIVERED' AND s.date >= ${from}
    GROUP BY 1`;
  const byMonth = new Map(rows.map((r) => [r.ym, r]));
  const series = [];
  for (let k = 11; k >= 0; k--) {
    const d = new Date(Date.UTC(year, month - 1 - k, 1));
    const ym = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const label = new Intl.DateTimeFormat("es-AR", { month: "short", timeZone: "UTC" }).format(d).replace(".", "");
    const r = byMonth.get(ym);
    series.push({ ym, label, revenue: r?.revenue ?? 0, profit: r?.profit ?? 0, orders: r?.orders ?? 0 });
  }
  return series;
}

export async function getTopProducts(days = 90, take = 5) {
  await verifyAdmin();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return prisma.$queryRaw<{ barcode: string; name: string; units: number; revenue: number }[]>`
    SELECT i.barcode, MAX(i.name) AS name, SUM(i.quantity)::int AS units,
      SUM(i."priceAtSale" * i.quantity)::float8 AS revenue
    FROM "SaleItem" i JOIN "Sale" s ON s.id = i."saleId"
    WHERE s.status = 'DELIVERED' AND s.date >= ${since}
    GROUP BY i.barcode ORDER BY units DESC, revenue DESC LIMIT ${take}`;
}

export async function getOperationalCounters() {
  await verifyAdmin();
  const [pending, webPending, lowStock, preOrderUnits] = await Promise.all([
    prisma.sale.aggregate({ where: { status: "PENDING" }, _count: { _all: true }, _sum: { totalAmount: true } }),
    prisma.sale.count({ where: { status: "WEB_PENDING" } }),
    prisma.product.findMany({
      where: { deletedAt: null, stock: { lte: 2 } },
      orderBy: [{ stock: "asc" }, { name: "asc" }],
      take: 6,
      select: { id: true, name: true, barcode: true, stock: true, size: true },
    }),
    prisma.saleItem.aggregate({ where: { isPreOrder: true, sale: { status: "PENDING" } }, _sum: { quantity: true } }),
  ]);
  return {
    pendingOrders: pending._count._all,
    pendingAmount: Number(pending._sum.totalAmount ?? 0),
    webPending,
    lowStock,
    preOrderUnits: preOrderUnits._sum.quantity ?? 0,
  };
}

export function monthRange(year: number, month: number) {
  const from = monthStart(year, month);
  const to = month === 12 ? monthStart(year + 1, 1) : monthStart(year, month + 1);
  return { from, to };
}
