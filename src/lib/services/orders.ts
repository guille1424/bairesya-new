// Operaciones de pedidos contra la base. Cada una corre en una transacción.
import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import {
  OrderError,
  assertTransition,
  buildLines,
  linesTotal,
  restockOnCancel,
  roundMoney,
  splitStock,
  type OrderLine,
} from "@/lib/domain/orders";
import type { PosItemInput, PosOrderInput, WebOrderInput } from "@/lib/validators/orders";

type Tx = Prisma.TransactionClient;

const productForSale = {
  id: true,
  barcode: true,
  name: true,
  cost: true,
  priceNormal: true,
  priceTransfer: true,
  stock: true,
} as const;

function toPriced(p: { id: string; barcode: string; name: string; cost: unknown; priceNormal: unknown; priceTransfer: unknown }) {
  return {
    id: p.id,
    barcode: p.barcode,
    name: p.name,
    cost: Number(p.cost),
    priceNormal: Number(p.priceNormal),
    priceTransfer: Number(p.priceTransfer),
  };
}

/** Descuenta stock solo si alcanza; si otro proceso lo tomó antes, falla y se reintenta. */
async function decrementStock(tx: Tx, productId: string, quantity: number) {
  if (quantity <= 0) return;
  const { count } = await tx.product.updateMany({
    where: { id: productId, stock: { gte: quantity } },
    data: { stock: { decrement: quantity } },
  });
  if (count === 0) throw new StockConflict();
}

class StockConflict extends Error {}

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof StockConflict && i < attempts) continue;
      if (err instanceof StockConflict) throw new OrderError("El stock cambió mientras se procesaba. Probá de nuevo.");
      throw err;
    }
  }
}

/** Arma las líneas de caja descontando stock en la misma transacción. */
async function buildPosLines(tx: Tx, items: PosItemInput[]) {
  const lines: OrderLine[] = [];
  for (const item of items) {
    const product = await tx.product.findFirst({
      where: { barcode: item.barcode, deletedAt: null },
      select: productForSale,
    });
    if (!product) throw new OrderError(`No existe un producto activo con código ${item.barcode}.`);
    const itemLines = buildLines(toPriced(product), product.stock, item.quantity, item.priceType, item.customPrice);
    for (const line of itemLines) {
      if (!line.isPreOrder) await decrementStock(tx, product.id, line.quantity);
    }
    lines.push(...itemLines);
  }
  return lines;
}

export async function createPosOrder(input: PosOrderInput) {
  return withRetry(() =>
    prisma.$transaction(async (tx) => {
      const lines = await buildPosLines(tx, input.items);
      return tx.sale.create({
        data: {
          customerId: input.customerId || null,
          customerName: input.customerName,
          customerPhone: input.customerPhone || null,
          totalAmount: linesTotal(lines),
          source: "POS",
          status: "PENDING",
          items: { create: lines },
        },
        select: { id: true, number: true },
      });
    }),
  );
}

export async function addItemsToOrder(saleId: string, items: PosItemInput[]) {
  return withRetry(() =>
    prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({ where: { id: saleId }, select: { status: true, totalAmount: true } });
      if (!sale) throw new OrderError("Pedido no encontrado.");
      assertTransition("addItems", sale.status);
      const lines = await buildPosLines(tx, items);
      return tx.sale.update({
        where: { id: saleId },
        data: {
          totalAmount: roundMoney(Number(sale.totalAmount) + linesTotal(lines)),
          items: { create: lines },
        },
        select: { id: true, number: true },
      });
    }),
  );
}

/** Un pedido web sin aprobar deja de reservar stock pasado este tiempo (evita bloqueos por pedidos abandonados). */
export const RESERVATION_HOURS = 72;

/** Unidades reservadas por pedidos web pendientes, por producto. */
export async function webReservations(productIds: string[], tx: Tx = prisma) {
  if (productIds.length === 0) return new Map<string, number>();
  const since = new Date(Date.now() - RESERVATION_HOURS * 60 * 60 * 1000);
  const rows = await tx.saleItem.groupBy({
    by: ["productId"],
    where: { productId: { in: productIds }, isPreOrder: false, sale: { status: "WEB_PENDING", date: { gte: since } } },
    _sum: { quantity: true },
  });
  return new Map(rows.map((r) => [r.productId!, r._sum.quantity ?? 0]));
}

/** Pedido desde la tienda: precios del servidor, sin tocar stock (queda reservado hasta aprobar). */
export async function createWebOrder(input: WebOrderInput, customerId: string | null) {
  return prisma.$transaction(async (tx) => {
    const ids = [...new Set(input.items.map((i) => i.productId))];
    const products = await tx.product.findMany({
      where: { id: { in: ids }, deletedAt: null, isPublic: true },
      select: productForSale,
    });
    const byId = new Map(products.map((p) => [p.id, p]));
    const reserved = await webReservations(ids, tx);

    const lines: OrderLine[] = [];
    for (const item of input.items) {
      const product = byId.get(item.productId);
      if (!product) throw new OrderError("Uno de los productos ya no está disponible.");
      const available = Math.max(0, product.stock - (reserved.get(product.id) ?? 0));
      const itemLines = buildLines(toPriced(product), available, item.quantity, "NORMAL");
      // Lo reservado por este mismo pedido cuenta para los ítems siguientes del mismo producto.
      const taken = itemLines.filter((l) => !l.isPreOrder).reduce((s, l) => s + l.quantity, 0);
      reserved.set(product.id, (reserved.get(product.id) ?? 0) + taken);
      lines.push(...itemLines);
    }

    return tx.sale.create({
      data: {
        customerId,
        customerName: input.customerName,
        customerPhone: input.customerPhone || null,
        totalAmount: linesTotal(lines),
        source: "WEB",
        status: "WEB_PENDING",
        items: { create: lines },
      },
      select: { id: true, number: true, totalAmount: true, items: { select: { name: true, quantity: true, priceAtSale: true, isPreOrder: true } } },
    });
  });
}

/** Aprueba un pedido web: descuenta stock; lo que ya no alcance pasa a pre-pedido. */
export async function approveWebOrder(saleId: string) {
  return withRetry(() =>
    prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({ where: { id: saleId }, include: { items: true } });
      if (!sale) throw new OrderError("Pedido no encontrado.");
      assertTransition("approveWeb", sale.status);

      for (const item of sale.items) {
        if (item.isPreOrder || !item.productId) continue;
        const product = await tx.product.findUnique({ where: { id: item.productId }, select: { stock: true } });
        const { inStock, preOrder } = splitStock(product?.stock ?? 0, item.quantity);
        await decrementStock(tx, item.productId, inStock);
        if (preOrder > 0) {
          if (inStock === 0) {
            await tx.saleItem.update({ where: { id: item.id }, data: { isPreOrder: true } });
          } else {
            await tx.saleItem.update({ where: { id: item.id }, data: { quantity: inStock } });
            await tx.saleItem.create({
              data: {
                saleId,
                productId: item.productId,
                barcode: item.barcode,
                name: item.name,
                priceAtSale: item.priceAtSale,
                costAtSale: item.costAtSale,
                priceType: item.priceType,
                quantity: preOrder,
                isPreOrder: true,
              },
            });
          }
        }
      }

      return tx.sale.update({ where: { id: saleId }, data: { status: "PENDING" }, select: { id: true, number: true } });
    }),
  );
}

export async function rejectWebOrder(saleId: string) {
  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({ where: { id: saleId }, select: { status: true } });
    if (!sale) throw new OrderError("Pedido no encontrado.");
    assertTransition("rejectWeb", sale.status);
    return tx.sale.update({
      where: { id: saleId },
      data: { status: "CANCELLED", cancelledAt: new Date() },
      select: { id: true, number: true },
    });
  });
}

export async function cancelOrder(saleId: string) {
  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({ where: { id: saleId }, include: { items: true } });
    if (!sale) throw new OrderError("Pedido no encontrado.");
    assertTransition("cancel", sale.status);
    for (const { productId, quantity } of restockOnCancel(sale.status, sale.items)) {
      await tx.product.update({ where: { id: productId }, data: { stock: { increment: quantity } } });
    }
    return tx.sale.update({
      where: { id: saleId },
      data: { status: "CANCELLED", cancelledAt: new Date() },
      select: { id: true, number: true },
    });
  });
}

export async function deliverOrder(saleId: string) {
  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({ where: { id: saleId }, select: { status: true } });
    if (!sale) throw new OrderError("Pedido no encontrado.");
    assertTransition("deliver", sale.status);
    return tx.sale.update({
      where: { id: saleId },
      data: { status: "DELIVERED", deliveredAt: new Date() },
      select: { id: true, number: true },
    });
  });
}
