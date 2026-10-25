"use server";

import { refresh, updateTag } from "next/cache";
import { assertStaff } from "@/lib/auth/dal";
import { approveWebOrder, cancelOrder, deliverOrder, rejectWebOrder } from "@/lib/services/orders";
import { orderNumber } from "@/lib/format";
import { toActionError } from "./utils";
import type { ActionState } from "./types";

async function run(fn: () => Promise<{ number: number }>, message: (n: string) => string): Promise<ActionState> {
  try {
    await assertStaff();
    const order = await fn();
    // El stock disponible en la tienda cambia con cada transición.
    updateTag("catalog");
    refresh();
    return { ok: true, message: message(orderNumber(order.number)) };
  } catch (err) {
    return toActionError(err);
  }
}

export async function deliverOrderAction(id: string) {
  return run(() => deliverOrder(id), (n) => `Pedido ${n} entregado.`);
}

export async function cancelOrderAction(id: string) {
  return run(() => cancelOrder(id), (n) => `Pedido ${n} cancelado. El stock se devolvió.`);
}

export async function approveWebOrderAction(id: string) {
  return run(() => approveWebOrder(id), (n) => `Pedido ${n} aprobado: pasa a pendientes de entrega.`);
}

export async function rejectWebOrderAction(id: string) {
  return run(() => rejectWebOrder(id), (n) => `Pedido ${n} rechazado.`);
}
