"use server";

import { refresh } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertStaff } from "@/lib/auth/dal";
import { customerSchema } from "@/lib/validators/customers";
import { fieldErrors, toActionError } from "./utils";
import type { ActionState } from "./types";

export type SavedCustomer = { id: string; name: string; phone: string | null };

export async function saveCustomer(
  _prev: ActionState & { customer?: SavedCustomer },
  formData: FormData,
): Promise<ActionState & { customer?: SavedCustomer }> {
  try {
    await assertStaff();
    const parsed = customerSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return fieldErrors(parsed.error);
    const { id, ...data } = parsed.data;

    if (data.email) {
      const other = await prisma.customer.findUnique({ where: { email: data.email } });
      if (other && other.id !== id) return { fieldErrors: { email: ["Ya hay un cliente con ese email."] } };
    }

    const customer = id
      ? await prisma.customer.update({ where: { id }, data, select: { id: true, name: true, phone: true } })
      : await prisma.customer.create({ data, select: { id: true, name: true, phone: true } });

    refresh();
    return { ok: true, message: id ? "Cliente actualizado." : `Cliente "${customer.name}" creado.`, customer };
  } catch (err) {
    return toActionError(err);
  }
}

export async function deleteCustomer(id: string): Promise<ActionState> {
  try {
    await assertStaff();
    await prisma.customer.update({ where: { id }, data: { deletedAt: new Date() } });
    refresh();
    return { ok: true, message: "Cliente eliminado." };
  } catch (err) {
    return toActionError(err);
  }
}
