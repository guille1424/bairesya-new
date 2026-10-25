import { Suspense } from "react";
import type { Metadata } from "next";
import { Globe } from "lucide-react";
import { OrderCard } from "@/components/admin/order-card";
import { PageHeader } from "@/components/admin/page-header";
import { TableSkeleton } from "@/components/admin/skeletons";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { listOrders } from "@/lib/data/orders";

export const metadata: Metadata = { title: "Pedidos web" };

export default function WebOrdersPage() {
  return (
    <>
      <PageHeader
        title="Pedidos web"
        description="Pedidos hechos desde la tienda online. Mientras esperan aprobación, sus prendas quedan reservadas."
      />
      <Suspense fallback={<TableSkeleton rows={3} />}>
        <WebOrders />
      </Suspense>
    </>
  );
}

async function WebOrders() {
  const { orders } = await listOrders({ status: ["WEB_PENDING"] });
  if (orders.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Globe />
          </EmptyMedia>
          <EmptyTitle>No hay pedidos web por aprobar</EmptyTitle>
          <EmptyDescription>Cuando un cliente haga un pedido desde la tienda, va a aparecer acá.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {orders.map((order) => (
        <OrderCard key={order.id} order={order} />
      ))}
    </div>
  );
}
