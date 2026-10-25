import "server-only";
import { prisma } from "@/lib/prisma";
import { verifyStaff } from "@/lib/auth/dal";
import type { Prisma } from "@/generated/prisma/client";

export type CustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  hasAccount: boolean;
  orders: number;
  spent: number;
  lastOrderAt: string | null;
};

export const CUSTOMERS_PAGE_SIZE = 25;

export async function listCustomers({ q, page = 1 }: { q?: string; page?: number }) {
  await verifyStaff();
  const where: Prisma.CustomerWhereInput = { deletedAt: null };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }
  const [total, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      orderBy: [{ name: "asc" }, { id: "asc" }],
      skip: (page - 1) * CUSTOMERS_PAGE_SIZE,
      take: CUSTOMERS_PAGE_SIZE,
      select: { id: true, name: true, phone: true, email: true, address: true, passwordHash: true },
    }),
  ]);

  const stats = await prisma.sale.groupBy({
    by: ["customerId"],
    where: { customerId: { in: customers.map((c) => c.id) }, status: { not: "CANCELLED" } },
    _count: { _all: true },
    _sum: { totalAmount: true },
    _max: { date: true },
  });
  const byId = new Map(stats.map((s) => [s.customerId, s]));

  const rows: CustomerRow[] = customers.map(({ passwordHash, ...c }) => {
    const s = byId.get(c.id);
    return {
      ...c,
      hasAccount: Boolean(passwordHash),
      orders: s?._count._all ?? 0,
      spent: Number(s?._sum.totalAmount ?? 0),
      lastOrderAt: s?._max.date?.toISOString() ?? null,
    };
  });

  return { customers: rows, total, page, pages: Math.max(1, Math.ceil(total / CUSTOMERS_PAGE_SIZE)) };
}

/** Lista corta para el selector de clientes en caja. */
export async function customerOptions() {
  await verifyStaff();
  return prisma.customer.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true, phone: true },
  });
}
