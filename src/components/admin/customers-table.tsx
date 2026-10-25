"use client";

import { useCallback, useState } from "react";
import { MessageCircle, MoreHorizontal, Pencil, Plus, Trash2, UserRound, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteCustomer } from "@/lib/actions/customers";
import type { CustomerRow } from "@/lib/data/customers";
import { formatDate, formatMoney } from "@/lib/format";
import { whatsappLink } from "@/lib/whatsapp";
import { ConfirmDialog } from "./confirm-button";
import { CustomerForm } from "./customer-form";

type Editing = { mode: "create" } | { mode: "edit"; customer: CustomerRow } | null;

export function CustomersTable({ customers, hasFilters }: { customers: CustomerRow[]; hasFilters: boolean }) {
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<CustomerRow | null>(null);
  const close = useCallback(() => setEditing(null), []);

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => setEditing({ mode: "create" })}>
          <Plus /> Nuevo cliente
        </Button>
      </div>

      {customers.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle>{hasFilters ? "Sin resultados" : "Todavía no hay clientes"}</EmptyTitle>
            <EmptyDescription>
              {hasFilters
                ? "Probá con otro nombre o teléfono."
                : "Los clientes se crean desde acá, desde la caja o cuando se registran en la tienda."}
            </EmptyDescription>
          </EmptyHeader>
          {!hasFilters && (
            <EmptyContent>
              <Button onClick={() => setEditing({ mode: "create" })}>
                <Plus /> Nuevo cliente
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Cliente</TableHead>
                <TableHead className="hidden md:table-cell">Contacto</TableHead>
                <TableHead className="text-right">Pedidos</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Total comprado</TableHead>
                <TableHead className="hidden text-right lg:table-cell">Último pedido</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => {
                const wa = whatsappLink(c.phone, `Hola ${c.name.split(" ")[0]}! Te escribimos de BairesYa.`);
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <button className="flex items-center gap-3 text-left" onClick={() => setEditing({ mode: "edit", customer: c })}>
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <UserRound className="size-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium hover:underline">{c.name}</span>
                          {c.hasAccount && (
                            <Badge variant="secondary" className="mt-0.5">
                              Cuenta web
                            </Badge>
                          )}
                        </span>
                      </button>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="text-sm">{c.phone ?? "—"}</div>
                      {c.email && <div className="text-xs text-muted-foreground">{c.email}</div>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{c.orders}</TableCell>
                    <TableCell className="hidden text-right tabular-nums sm:table-cell">{formatMoney(c.spent)}</TableCell>
                    <TableCell className="hidden text-right text-muted-foreground lg:table-cell">
                      {c.lastOrderAt ? formatDate(c.lastOrderAt) : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {wa && (
                          <Button variant="ghost" size="icon-sm" asChild aria-label="Escribir por WhatsApp">
                            <a href={wa} target="_blank" rel="noreferrer">
                              <MessageCircle className="text-emerald-600" />
                            </a>
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" aria-label="Acciones">
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditing({ mode: "edit", customer: c })}>
                              <Pencil /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => setDeleting(c)}>
                              <Trash2 /> Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={editing !== null} onOpenChange={(open) => !open && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.mode === "edit" ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
            <DialogDescription>Datos de contacto para pedidos y envíos.</DialogDescription>
          </DialogHeader>
          {editing && (
            <CustomerForm
              key={editing.mode === "edit" ? editing.customer.id : "new"}
              customer={editing.mode === "edit" ? editing.customer : undefined}
              onDone={close}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="¿Eliminar cliente?"
        description={`"${deleting?.name}" deja de aparecer en la lista. Sus pedidos anteriores se conservan.`}
        confirmLabel="Eliminar"
        destructive
        action={() => deleteCustomer(deleting!.id)}
      />
    </>
  );
}
