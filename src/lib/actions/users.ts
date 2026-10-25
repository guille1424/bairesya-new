"use server";

import bcrypt from "bcryptjs";
import { refresh } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/lib/auth/dal";
import { fieldErrors, toActionError, UserError } from "./utils";
import type { ActionState } from "./types";

const createSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9._-]{3,32}$/, "Entre 3 y 32 caracteres: letras, números, punto o guion"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
  role: z.enum(["ADMIN", "EMPLOYEE"]),
});

export async function createUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await assertAdmin();
    const parsed = createSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return fieldErrors(parsed.error);
    const { username, password, role } = parsed.data;
    if (await prisma.user.findUnique({ where: { username } })) {
      return { fieldErrors: { username: ["Ese usuario ya existe."] } };
    }
    await prisma.user.create({ data: { username, role, passwordHash: await bcrypt.hash(password, 10) } });
    refresh();
    return { ok: true, message: `Usuario "${username}" creado.` };
  } catch (err) {
    return toActionError(err);
  }
}

export async function resetPassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await assertAdmin();
    const parsed = z
      .object({ id: z.string().min(1), password: z.string().min(8, "Mínimo 8 caracteres") })
      .safeParse(Object.fromEntries(formData));
    if (!parsed.success) return fieldErrors(parsed.error);
    await prisma.user.update({
      where: { id: parsed.data.id },
      data: { passwordHash: await bcrypt.hash(parsed.data.password, 10) },
    });
    return { ok: true, message: "Contraseña actualizada." };
  } catch (err) {
    return toActionError(err);
  }
}

export async function setUserActive(id: string, active: boolean): Promise<ActionState> {
  try {
    const me = await assertAdmin();
    if (me.id === id) throw new UserError("No podés desactivar tu propio usuario.");
    if (!active) {
      const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
      const admins = await prisma.user.count({ where: { role: "ADMIN", active: true } });
      if (target?.role === "ADMIN" && admins <= 1) throw new UserError("Tiene que quedar al menos un administrador activo.");
    }
    await prisma.user.update({ where: { id }, data: { active } });
    refresh();
    return { ok: true, message: active ? "Usuario reactivado." : "Usuario desactivado: ya no puede iniciar sesión." };
  } catch (err) {
    return toActionError(err);
  }
}
