"use server";

import { refresh, updateTag } from "next/cache";
import { getCustomer } from "@/lib/auth/dal";
import { createWebOrder } from "@/lib/services/orders";
import { webOrderSchema } from "@/lib/validators/orders";
import { normalizeArPhone } from "@/lib/phone";
import { toActionError } from "./utils";
import type { ActionState } from "./types";

export type PlacedOrder = {
  number: number;
  totalAmount: number;
  customerName: string;
  items: { name: string; quantity: number; priceAtSale: number; isPreOrder: boolean }[];
};

/** Pedido desde la tienda: precios y disponibilidad se calculan en el servidor. */
export async function placeWebOrder(payload: unknown): Promise<ActionState & { order?: PlacedOrder }> {
  try {
    const parsed = webOrderSchema.safeParse(payload);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    const customer = await getCustomer();
    const input = {
      ...parsed.data,
      customerPhone: parsed.data.customerPhone ? normalizeArPhone(parsed.data.customerPhone) : null,
    };

    const sale = await createWebOrder(input, customer?.id ?? null);
    updateTag("catalog");
    refresh();
    return {
      ok: true,
      order: {
        number: sale.number,
        totalAmount: Number(sale.totalAmount),
        customerName: input.customerName,
        items: sale.items.map((i) => ({ ...i, priceAtSale: Number(i.priceAtSale) })),
      },
    };
  } catch (err) {
    return toActionError(err);
  }
}
