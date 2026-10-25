"use client";

import { useCallback, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { ImageOff, MoreHorizontal, Pencil, Plus, Printer, Shirt, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteProduct, setProductPublic } from "@/lib/actions/products";
import type { ProductRow } from "@/lib/data/products";
import { formatMoney } from "@/lib/format";
import { ConfirmDialog } from "./confirm-button";
import { ProductForm, type FilterOptions } from "./product-form";

type Editing = { mode: "create" } | { mode: "edit"; product: ProductRow } | null;

export function InventoryTable({
  products,
  options,
  canSeeCost,
  hasFilters,
}: {
  products: ProductRow[];
  options: FilterOptions;
  canSeeCost: boolean;
  hasFilters: boolean;
}) {
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<ProductRow | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const close = useCallback(() => setEditing(null), []);

  const allSelected = products.length > 0 && products.every((p) => selected.has(p.id));
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {selected.size > 0 && (
          <Button variant="outline" asChild>
            <Link href={`/admin/etiquetas?ids=${[...selected].join(",")}`} target="_blank">
              <Printer /> Imprimir {selected.size} etiqueta{selected.size > 1 ? "s" : ""}
            </Link>
          </Button>
        )}
        <Button onClick={() => setEditing({ mode: "create" })}>
          <Plus /> Nuevo producto
        </Button>
      </div>

      {products.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Shirt />
            </EmptyMedia>
            <EmptyTitle>{hasFilters ? "Sin resultados" : "Todavía no hay productos"}</EmptyTitle>
            <EmptyDescription>
              {hasFilters
                ? "Probá con otra búsqueda o limpiá los filtros."
                : "Cargá tu primera prenda o importá tu stock desde un Excel."}
            </EmptyDescription>
          </EmptyHeader>
          {!hasFilters && (
            <EmptyContent className="flex-row justify-center">
              <Button onClick={() => setEditing({ mode: "create" })}>
                <Plus /> Nuevo producto
              </Button>
              <Button variant="outline" asChild>
                <Link href="/admin/importar">Importar Excel</Link>
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(v) => setSelected(v ? new Set(products.map((p) => p.id)) : new Set())}
                    aria-label="Seleccionar todos"
                  />
                </TableHead>
                <TableHead>Producto</TableHead>
                <TableHead className="hidden md:table-cell">Variante</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                {canSeeCost && <TableHead className="hidden text-right lg:table-cell">Costo</TableHead>}
                <TableHead className="text-right">Efectivo</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Transf.</TableHead>
                <TableHead className="hidden text-center md:table-cell">Tienda</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id} data-state={selected.has(p.id) ? "selected" : undefined}>
                  <TableCell>
                    <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggle(p.id)} aria-label={`Seleccionar ${p.name}`} />
                  </TableCell>
                  <TableCell>
                    <button className="flex items-center gap-3 text-left" onClick={() => setEditing({ mode: "edit", product: p })}>
                      <div className="relative size-10 shrink-0 overflow-hidden rounded-md border bg-muted">
                        {p.images[0] ? (
                          <Image src={p.images[0].url} alt="" fill sizes="40px" className="object-cover" />
                        ) : (
                          <ImageOff className="absolute inset-0 m-auto size-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium hover:underline">{p.name}</div>
                        <div className="font-mono text-xs text-muted-foreground">{p.barcode}</div>
                      </div>
                    </button>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {p.category && <Badge variant="secondary">{p.category}</Badge>}
                      {p.size && <Badge variant="outline">T. {p.size}</Badge>}
                      {p.color && <Badge variant="outline">{p.color}</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <StockBadge stock={p.stock} />
                  </TableCell>
                  {canSeeCost && (
                    <TableCell className="hidden text-right text-muted-foreground tabular-nums lg:table-cell">
                      {formatMoney(p.cost)}
                    </TableCell>
                  )}
                  <TableCell className="text-right font-medium tabular-nums">{formatMoney(p.priceNormal)}</TableCell>
                  <TableCell className="hidden text-right tabular-nums sm:table-cell">{formatMoney(p.priceTransfer)}</TableCell>
                  <TableCell className="hidden text-center md:table-cell">
                    <PublicSwitch product={p} />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label="Acciones">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditing({ mode: "edit", product: p })}>
                          <Pencil /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/etiquetas?ids=${p.id}`} target="_blank">
                            <Printer /> Imprimir etiqueta
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => setDeleting(p)}>
                          <Trash2 /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Sheet open={editing !== null} onOpenChange={(open) => !open && close()}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader className="px-6 pt-6 pb-0">
            <SheetTitle>{editing?.mode === "edit" ? "Editar producto" : "Nuevo producto"}</SheetTitle>
            <SheetDescription>
              {editing?.mode === "edit" ? editing.product.name : "Cargá los datos de la prenda."}
            </SheetDescription>
          </SheetHeader>
          <div className="px-6 pb-0">
            {editing && (
              <ProductForm
                key={editing.mode === "edit" ? editing.product.id : "new"}
                product={editing.mode === "edit" ? editing.product : undefined}
                options={options}
                canSeeCost={canSeeCost}
                onDone={close}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="¿Eliminar producto?"
        description={`"${deleting?.name}" deja de aparecer en el inventario y en la tienda. Los pedidos anteriores no se modifican.`}
        confirmLabel="Eliminar"
        destructive
        action={() => deleteProduct(deleting!.id)}
      />
    </>
  );
}

export function StockBadge({ stock }: { stock: number }) {
  if (stock <= 0) return <Badge variant="destructive">Sin stock</Badge>;
  if (stock <= 2) return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400">{stock}</Badge>;
  return <span className="font-medium tabular-nums">{stock}</span>;
}

function PublicSwitch({ product }: { product: ProductRow }) {
  const [pending, startTransition] = useTransition();
  const [checked, setChecked] = useState(product.isPublic);
  return (
    <Switch
      checked={checked}
      disabled={pending}
      aria-label="Mostrar en la tienda"
      onCheckedChange={(value) => {
        setChecked(value);
        startTransition(async () => {
          const result = await setProductPublic(product.id, value);
          if (result.error) {
            setChecked(!value);
            toast.error(result.error);
          }
        });
      }}
    />
  );
}
