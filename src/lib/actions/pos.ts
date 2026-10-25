"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertStaff } from "@/lib/auth/dal";
import { addItemsToOrder, createPosOrder } from "@/lib/services/orders";
import { posItemSchema, posOrderSchema } from "@/lib/validators/orders";
import { toActionError } from "./utils";
import type { ActionState } from "./types";

export type PosProduct = {
  barcode: string;
  name: string;
  size: string | null;
  color: string | null;
  priceNormal: number;
  priceTransfer: number;
  stock: number;
  image: string | null;
};

/** Busca por código exacto o, si no, por nombre/código parcial (para el buscador de caja). */
export async function searchPosProducts(query: string): Promise<{ exact: PosProduct | null; matches: PosProduct[] }> {
  await assertStaff();
  const q = query.trim();
  if (!q) return { exact: null, matches: [] };

  const select = {
    barcode: true,
    name: true,
    size: true,
    color: true,
    priceNormal: true,
    priceTransfer: true,
    stock: true,
    images: { select: { url: true }, orderBy: { position: "asc" as const }, take: 1 },
  };
  const toPos = (p: {
    barcode: string;
    name: string;
    size: string | null;
    color: string | null;
    priceNormal: unknown;
    priceTransfer: unknown;
    stock: number;
    images: { url: string }[];
  }): PosProduct => ({
    barcode: p.barcode,
    name: p.name,
    size: p.size,
    color: p.color,
    priceNormal: Number(p.priceNormal),
    priceTransfer: Number(p.priceTransfer),
    stock: p.stock,
    image: p.images[0]?.url ?? null,
  });

  const exact = await prisma.product.findFirst({ where: { barcode: q, deletedAt: null }, select });
  if (exact) return { exact: toPos(exact), matches: [] };

  const matches = await prisma.product.findMany({
    where: {
      deletedAt: null,
      OR: [{ name: { contains: q, mode: "insensitive" } }, { barcode: { contains: q, mode: "insensitive" } }],
    },
    select,
    orderBy: { name: "asc" },
    take: 8,
  });
  return { exact: null, matches: matches.map(toPos) };
}

const submitSchema = posOrderSchema.extend({
  existingOrderId: z.string().nullish(),
  customerName: z.string().trim(),
  items: z.array(posItemSchema).min(1, "Agregá al menos una prenda"),
});

export type PosSubmitResult = ActionState & { orderNumber?: number; orderId?: string };

export async function submitPosOrder(payload: unknown): Promise<PosSubmitResult> {
  try {
    await assertStaff();
    const parsed = submitSchema.safeParse(payload);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    const { existingOrderId, ...order } = parsed.data;

    let result: { id: string; number: number };
    if (existingOrderId) {
      result = await addItemsToOrder(existingOrderId, order.items);
    } else {
      if (!order.customerName) return { error: "Elegí o cargá un cliente para el pedido." };
      result = await createPosOrder(order);
    }

    updateTag("catalog");
    refresh();
    return {
      ok: true,
      orderId: result.id,
      orderNumber: result.number,
      message: existingOrderId ? "Prendas agregadas al pedido." : "Pedido creado.",
    };
  } catch (err) {
    return toActionError(err);
  }
}
