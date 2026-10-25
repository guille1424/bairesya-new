// Data Access Layer de autenticación: toda lectura o escritura protegida pasa por acá.
import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { readCustomerSession, readStaffSession } from "./session";

export type StaffUser = { id: string; username: string; role: "ADMIN" | "EMPLOYEE" };
export type CurrentCustomer = { id: string; name: string; email: string | null };

export class AuthError extends Error {}

/** Usuario del equipo con sesión válida y activo en la base, o null. */
export const getStaff = cache(async (): Promise<StaffUser | null> => {
  const session = await readStaffSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, username: true, role: true, active: true },
  });
  if (!user || !user.active) return null;
  return { id: user.id, username: user.username, role: user.role };
});

/** Para páginas del panel: redirige al login si no hay sesión. */
export async function verifyStaff() {
  const staff = await getStaff();
  if (!staff) redirect("/admin/login");
  return staff;
}

/** Para páginas solo-admin: los empleados vuelven al inventario. */
export async function verifyAdmin() {
  const staff = await verifyStaff();
  if (staff.role !== "ADMIN") redirect("/admin/inventario");
  return staff;
}

/** Para Server Actions y Route Handlers: lanza en vez de redirigir. */
export async function assertStaff() {
  const staff = await getStaff();
  if (!staff) throw new AuthError("Sesión expirada. Volvé a iniciar sesión.");
  return staff;
}

export async function assertAdmin() {
  const staff = await assertStaff();
  if (staff.role !== "ADMIN") throw new AuthError("No tenés permisos para esta acción.");
  return staff;
}

export const getCustomer = cache(async (): Promise<CurrentCustomer | null> => {
  const session = await readCustomerSession();
  if (!session) return null;
  const customer = await prisma.customer.findFirst({
    where: { id: session.customerId, deletedAt: null },
    select: { id: true, name: true, email: true },
  });
  return customer;
});
