import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { PosTerminal } from "@/components/admin/pos/pos-terminal";
import { Skeleton } from "@/components/ui/skeleton";
import { customerOptions } from "@/lib/data/customers";
import { pendingOrderOptions } from "@/lib/data/orders";

export const metadata: Metadata = { title: "Nuevo pedido" };

export default function NewOrderPage() {
  return (
    <>
      <PageHeader title="Nuevo pedido" description="Escaneá las prendas, elegí el precio y confirmá el pedido." />
      <Suspense
        fallback={
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <Skeleton className="h-80 rounded-xl" />
            <Skeleton className="h-80 rounded-xl" />
          </div>
        }
      >
        <Terminal />
      </Suspense>
    </>
  );
}

async function Terminal() {
  const [customers, orders] = await Promise.all([customerOptions(), pendingOrderOptions()]);
  return <PosTerminal customers={customers} orders={orders} />;
}
