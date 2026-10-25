"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  clearCustomerSession,
  clearStaffSession,
  setCustomerSession,
  setStaffSession,
} from "@/lib/auth/session";
import {
  customerLoginSchema,
  customerRegisterSchema,
  staffLoginSchema,
} from "@/lib/validators/auth";
import type { ActionState } from "./types";

// Hash de referencia para que un usuario inexistente tarde lo mismo que una contraseña incorrecta.
const DUMMY_HASH = bcrypt.hashSync("bairesya-dummy-password", 10);

function safeNext(value: FormDataEntryValue | null, fallback: string) {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

export async function staffLogin(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = staffLoginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const user = await prisma.user.findUnique({ where: { username: parsed.data.username } });
  const valid = await bcrypt.compare(parsed.data.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid || !user.active) return { error: "Usuario o contraseña incorrectos." };

  await setStaffSession({ userId: user.id, username: user.username, role: user.role });
  redirect(user.role === "ADMIN" ? "/admin" : "/admin/inventario");
}

export async function staffLogout() {
  await clearStaffSession();
  redirect("/admin/login");
}

export async function customerLogin(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = customerLoginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const customer = await prisma.customer.findFirst({
    where: { email: parsed.data.email, deletedAt: null },
  });
  const valid = await bcrypt.compare(parsed.data.password, customer?.passwordHash ?? DUMMY_HASH);
  if (!customer || !customer.passwordHash || !valid) {
    return { error: "Email o contraseña incorrectos." };
  }

  await setCustomerSession({ customerId: customer.id, name: customer.name });
  redirect(safeNext(formData.get("next"), "/mi-cuenta"));
}

export async function customerRegister(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = customerRegisterSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const { name, email, phone, password } = parsed.data;

  const existing = await prisma.customer.findUnique({ where: { email } });
  if (existing) return { fieldErrors: { email: ["Ya existe una cuenta con ese email."] } };

  const customer = await prisma.customer.create({
    data: { name, email, phone: phone || null, passwordHash: await bcrypt.hash(password, 10) },
  });

  await setCustomerSession({ customerId: customer.id, name: customer.name });
  redirect(safeNext(formData.get("next"), "/mi-cuenta"));
}

export async function customerLogout() {
  await clearCustomerSession();
  redirect("/");
}
