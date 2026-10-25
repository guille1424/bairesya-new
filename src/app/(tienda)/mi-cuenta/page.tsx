import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut, PackageOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { customerLogout } from "@/lib/actions/auth";
import { getCustomer } from "@/lib/auth/dal";
import { formatDate, formatMoney, orderNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Mi cuenta", robots: { index: false } };

const customerStatus: Record<string, { label: string; className: string }> = {
  WEB_PENDING: { label: "Recibido", className: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  PENDING: { label: "Confirmado", className: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  DELIVERED: { label: "Entregado", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  CANCELLED: { label: "Cancelado", className: "bg-muted text-muted-foreground" },
};

export default function AccountPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
      <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
        <Account />
      </Suspense>
    </div>
  );
}

async function Account() {
  const customer = await getCustomer();
  if (!customer) redirect("/ingresar?next=/mi-cuenta");

  const orders = await prisma.sale.findMany({
    where: { customerId: customer.id },
    orderBy: { date: "desc" },
    take: 50,
    select: {
      id: true,
      number: true,
      date: true,
      status: true,
      totalAmount: true,
      items: { select: { id: true, name: true, quantity: true, priceAtSale: true } },
    },
  });

  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Hola, {customer.name.split(" ")[0]}</h1>
          <p className="text-sm text-muted-foreground">{customer.email}</p>
        </div>
        <form action={customerLogout}>
          <Button variant="outline" size="sm" type="submit">
            <LogOut /> Salir
          </Button>
        </form>
      </div>

      <h2 className="pt-4 font-medium">Mis pedidos</h2>
      {orders.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <PackageOpen />
            </EmptyMedia>
            <EmptyTitle>Todavía no hiciste pedidos</EmptyTitle>
            <EmptyDescription>Cuando compres desde la tienda, vas a poder seguirlos acá.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href="/">Ver la colección</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const status = customerStatus[order.status];
            return (
              <Card key={order.id} className="gap-3">
                <CardHeader>
                  <CardTitle className="font-mono text-base">{orderNumber(order.number)}</CardTitle>
                  <CardDescription>{formatDate(order.date, true)}</CardDescription>
                  <CardAction className="flex flex-col items-end gap-1">
                    <Badge className={`border-0 ${status.className}`}>{status.label}</Badge>
                    <span className="font-semibold tabular-nums">{formatMoney(Number(order.totalAmount))}</span>
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {order.items.map((item) => (
                      <li key={item.id} className="flex justify-between gap-4">
                        <span className="truncate">
                          {item.quantity} × {item.name}
                        </span>
                        <span className="tabular-nums">{formatMoney(Number(item.priceAtSale) * item.quantity)}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
