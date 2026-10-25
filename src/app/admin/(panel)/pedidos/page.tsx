import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, ShoppingCart } from "lucide-react";
import { OrderCard } from "@/components/admin/order-card";
import { PageHeader } from "@/components/admin/page-header";
import { TableSkeleton } from "@/components/admin/skeletons";
import { Pagination, SearchFilter } from "@/components/admin/url-filters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { listOrders, orderCounts } from "@/lib/data/orders";
import { pageParam, param, type SearchParams } from "@/lib/search-params";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Pedidos" };

const tabs = {
  pendientes: { label: "Pendientes", status: ["PENDING"] as const },
  entregados: { label: "Entregados", status: ["DELIVERED"] as const },
  cancelados: { label: "Cancelados", status: ["CANCELLED"] as const },
  todos: { label: "Todos", status: ["PENDING", "DELIVERED", "CANCELLED"] as const },
};
type Tab = keyof typeof tabs;

export default function OrdersPage({ searchParams }: PageProps<"/admin/pedidos">) {
  return (
    <>
      <PageHeader
        title="Pedidos"
        description="Pedidos de caja y aprobados de la tienda: entregá, cancelá o avisá al cliente."
        actions={
          <Button variant="outline" asChild>
            <Link href="/admin/pedidos/compras">
              <ShoppingCart /> Lista de compras
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<TableSkeleton rows={4} />}>
        <Orders searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Orders({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const tab: Tab = (param(params, "estado") as Tab) in tabs ? (param(params, "estado") as Tab) : "pendientes";
  const q = param(params, "q");
  const [counts, result] = await Promise.all([
    orderCounts(),
    listOrders({ status: [...tabs[tab].status], q, page: pageParam(params) }),
  ]);
  const countFor = (t: Tab) => tabs[t].status.reduce((s, st) => s + counts[st], 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <nav className="inline-flex w-fit rounded-lg bg-muted p-1" aria-label="Estado">
          {(Object.keys(tabs) as Tab[]).map((t) => (
            <Link
              key={t}
              href={t === "pendientes" ? "/admin/pedidos" : `/admin/pedidos?estado=${t}`}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium text-muted-foreground transition-colors",
                t === tab && "bg-background text-foreground shadow-sm",
              )}
            >
              {tabs[t].label}
              <Badge variant="secondary" className="h-5 px-1.5 tabular-nums">
                {countFor(t)}
              </Badge>
            </Link>
          ))}
        </nav>
        <SearchFilter placeholder="Buscar cliente, N° o código" />
      </div>

      {result.orders.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClipboardList />
            </EmptyMedia>
            <EmptyTitle>No hay pedidos {tab !== "todos" && tabs[tab].label.toLowerCase()}</EmptyTitle>
            <EmptyDescription>
              {q ? "Probá con otra búsqueda." : "Los pedidos nuevos se crean desde la caja o llegan desde la tienda online."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {result.orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
      {result.total > 0 && <Pagination page={result.page} pages={result.pages} total={result.total} noun={["pedido", "pedidos"]} />}
    </div>
  );
}
