import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, MapPin, PackageCheck } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { PrintButton } from "@/components/admin/print-button";
import { TableSkeleton } from "@/components/admin/skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getShoppingList } from "@/lib/data/orders";
import { orderNumber } from "@/lib/format";

export const metadata: Metadata = { title: "Lista de compras" };

export default function ShoppingListPage() {
  return (
    <>
      <PageHeader
        title="Lista de compras"
        description="Prendas vendidas sin stock en pedidos pendientes, agrupadas por proveedor."
        actions={
          <>
            <Button variant="ghost" asChild className="print:hidden">
              <Link href="/admin/pedidos">
                <ArrowLeft /> Pedidos
              </Link>
            </Button>
            <PrintButton />
          </>
        }
      />
      <Suspense fallback={<TableSkeleton rows={4} />}>
        <ShoppingList />
      </Suspense>
    </>
  );
}

async function ShoppingList() {
  const suppliers = await getShoppingList();
  if (suppliers.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <PackageCheck />
          </EmptyMedia>
          <EmptyTitle>No hay nada para comprar</EmptyTitle>
          <EmptyDescription>Todos los pedidos pendientes tienen stock.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {suppliers.map((supplier) => (
        <Card key={supplier.name} className="gap-0 overflow-hidden py-0 break-inside-avoid">
          <CardHeader className="border-b py-4">
            <CardTitle>{supplier.name}</CardTitle>
            {supplier.address && (
              <CardDescription className="flex items-center gap-1">
                <MapPin className="size-3.5" /> {supplier.address}
              </CardDescription>
            )}
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Prenda</TableHead>
                <TableHead>Variante</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="hidden sm:table-cell">Pedidos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {supplier.items.map((item) => (
                <TableRow key={item.barcode}>
                  <TableCell>
                    <div className="font-medium">{item.name}</div>
                    <div className="font-mono text-xs text-muted-foreground">{item.barcode}</div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {[item.category, item.size && `T. ${item.size}`, item.color].filter(Boolean).join(" · ") || "—"}
                  </TableCell>
                  <TableCell className="text-right text-base font-semibold tabular-nums">{item.quantity}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {item.orders.map((n) => (
                        <Badge key={n} variant="secondary" className="font-mono">
                          {orderNumber(n)}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ))}
    </div>
  );
}
