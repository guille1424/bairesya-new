import "server-only";
import { prisma } from "@/lib/prisma";
import { verifyStaff } from "@/lib/auth/dal";
import type { Prisma, SaleStatus } from "@/generated/prisma/client";

export async function countWebPending() {
  await verifyStaff();
  return prisma.sale.count({ where: { status: "WEB_PENDING" } });
}

/** Pedidos a los que todavía se les pueden sumar prendas desde caja. */
export async function pendingOrderOptions() {
  await verifyStaff();
  const orders = await prisma.sale.findMany({
    where: { status: "PENDING" },
    orderBy: { date: "desc" },
    take: 100,
    select: { id: true, number: true, customerName: true, totalAmount: true },
  });
  return orders.map((o) => ({ ...o, totalAmount: Number(o.totalAmount) }));
}

export type OrderRow = {
  id: string;
  number: number;
  customerName: string;
  customerPhone: string | null;
  date: string;
  deliveredAt: string | null;
  cancelledAt: string | null;
  totalAmount: number;
  source: "WEB" | "POS";
  status: SaleStatus;
  items: {
    id: string;
    barcode: string;
    name: string;
    quantity: number;
    priceAtSale: number;
    priceType: "NORMAL" | "TRANSFER" | "CUSTOM";
    isPreOrder: boolean;
    image: string | null;
    stock: number | null;
  }[];
};

const orderSelect = {
  id: true,
  number: true,
  customerName: true,
  customerPhone: true,
  date: true,
  deliveredAt: true,
  cancelledAt: true,
  totalAmount: true,
  source: true,
  status: true,
  customer: { select: { phone: true } },
  items: {
    orderBy: { id: "asc" },
    select: {
      id: true,
      barcode: true,
      name: true,
      quantity: true,
      priceAtSale: true,
      priceType: true,
      isPreOrder: true,
      product: { select: { stock: true, images: { select: { url: true }, orderBy: { position: "asc" }, take: 1 } } },
    },
  },
} satisfies Prisma.SaleSelect;

function toOrderRow(o: Prisma.SaleGetPayload<{ select: typeof orderSelect }>): OrderRow {
  return {
    id: o.id,
    number: o.number,
    customerName: o.customerName,
    customerPhone: o.customerPhone ?? o.customer?.phone ?? null,
    date: o.date.toISOString(),
    deliveredAt: o.deliveredAt?.toISOString() ?? null,
    cancelledAt: o.cancelledAt?.toISOString() ?? null,
    totalAmount: Number(o.totalAmount),
    source: o.source,
    status: o.status,
    items: o.items.map((i) => ({
      id: i.id,
      barcode: i.barcode,
      name: i.name,
      quantity: i.quantity,
      priceAtSale: Number(i.priceAtSale),
      priceType: i.priceType,
      isPreOrder: i.isPreOrder,
      image: i.product?.images[0]?.url ?? null,
      stock: i.product?.stock ?? null,
    })),
  };
}

export const ORDERS_PAGE_SIZE = 20;

export async function listOrders({
  status,
  q,
  page = 1,
}: {
  status?: SaleStatus[];
  q?: string;
  page?: number;
}) {
  await verifyStaff();
  const where: Prisma.SaleWhereInput = {};
  if (status?.length) where.status = { in: status };
  if (q) {
    const n = Number(q.replace(/^#/, ""));
    where.OR = [
      { customerName: { contains: q, mode: "insensitive" } },
      { items: { some: { barcode: q } } },
      ...(Number.isInteger(n) && n > 0 ? [{ number: n }] : []),
    ];
  }
  const [total, orders] = await Promise.all([
    prisma.sale.count({ where }),
    prisma.sale.findMany({
      where,
      select: orderSelect,
      orderBy: { date: "desc" },
      skip: (page - 1) * ORDERS_PAGE_SIZE,
      take: ORDERS_PAGE_SIZE,
    }),
  ]);
  return { orders: orders.map(toOrderRow), total, page, pages: Math.max(1, Math.ceil(total / ORDERS_PAGE_SIZE)) };
}

export async function orderCounts() {
  await verifyStaff();
  const rows = await prisma.sale.groupBy({ by: ["status"], _count: { _all: true } });
  const counts: Record<SaleStatus, number> = { WEB_PENDING: 0, PENDING: 0, DELIVERED: 0, CANCELLED: 0 };
  for (const r of rows) counts[r.status] = r._count._all;
  return counts;
}

export type ShoppingItem = {
  barcode: string;
  name: string;
  category: string | null;
  size: string | null;
  color: string | null;
  quantity: number;
  orders: number[];
};

/** Lista de compras: prendas en pre-pedido de pedidos pendientes, agrupadas por proveedor. */
export async function getShoppingList() {
  await verifyStaff();
  const items = await prisma.saleItem.findMany({
    where: { isPreOrder: true, sale: { status: "PENDING" } },
    select: {
      barcode: true,
      name: true,
      quantity: true,
      sale: { select: { number: true } },
      product: { select: { category: true, size: true, color: true, supplierName: true, supplierAddress: true } },
    },
  });

  const suppliers = new Map<string, { name: string; address: string | null; items: Map<string, ShoppingItem> }>();
  for (const item of items) {
    const supplierName = item.product?.supplierName || "Sin proveedor";
    const supplier = suppliers.get(supplierName) ?? {
      name: supplierName,
      address: item.product?.supplierAddress ?? null,
      items: new Map<string, ShoppingItem>(),
    };
    const existing = supplier.items.get(item.barcode) ?? {
      barcode: item.barcode,
      name: item.name,
      category: item.product?.category ?? null,
      size: item.product?.size ?? null,
      color: item.product?.color ?? null,
      quantity: 0,
      orders: [],
    };
    existing.quantity += item.quantity;
    if (!existing.orders.includes(item.sale.number)) existing.orders.push(item.sale.number);
    supplier.items.set(item.barcode, existing);
    suppliers.set(supplierName, supplier);
  }

  return [...suppliers.values()]
    .map((s) => ({ ...s, items: [...s.items.values()].sort((a, b) => a.name.localeCompare(b.name)) }))
    .sort((a, b) => (a.name === "Sin proveedor" ? 1 : b.name === "Sin proveedor" ? -1 : a.name.localeCompare(b.name)));
}
