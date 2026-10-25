"use client";

import { useState } from "react";
import Image from "next/image";
import { Ban, Check, CheckCheck, ImageOff, MessageCircle, Store, Globe, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  approveWebOrderAction,
  cancelOrderAction,
  deliverOrderAction,
  rejectWebOrderAction,
} from "@/lib/actions/orders";
import type { ActionState } from "@/lib/actions/types";
import type { OrderRow } from "@/lib/data/orders";
import { formatDate, formatMoney, orderNumber, priceTypeLabel, statusLabel } from "@/lib/format";
import { orderReadyMessage } from "@/lib/messages";
import { whatsappLink } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "./confirm-button";

const statusStyles: Record<OrderRow["status"], string> = {
  WEB_PENDING: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  PENDING: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  DELIVERED: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  CANCELLED: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status }: { status: OrderRow["status"] }) {
  return <Badge className={cn("border-0", statusStyles[status])}>{statusLabel[status]}</Badge>;
}

type Pending = { title: string; description: string; confirm: string; destructive?: boolean; action: () => Promise<ActionState> };

export function OrderCard({ order }: { order: OrderRow }) {
  const [confirm, setConfirm] = useState<Pending | null>(null);
  const units = order.items.reduce((s, i) => s + i.quantity, 0);
  const preOrder = order.items.filter((i) => i.isPreOrder).reduce((s, i) => s + i.quantity, 0);
  const wa = whatsappLink(
    order.customerPhone,
    order.status === "PENDING" ? orderReadyMessage(order) : `¡Hola ${order.customerName}! Te escribimos de BairesYa por tu pedido ${orderNumber(order.number)}.`,
  );

  return (
    <Card className={cn("gap-4", order.status === "CANCELLED" && "opacity-70")}>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-muted-foreground">{orderNumber(order.number)}</span>
          <span>{order.customerName}</span>
        </CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>{formatDate(order.date, true)}</span>
          <span className="inline-flex items-center gap-1">
            {order.source === "WEB" ? <Globe className="size-3.5" /> : <Store className="size-3.5" />}
            {order.source === "WEB" ? "Tienda online" : "Caja"}
          </span>
          <span>
            {units} prenda{units !== 1 && "s"}
          </span>
          {order.deliveredAt && <span>Entregado {formatDate(order.deliveredAt)}</span>}
        </CardDescription>
        <CardAction className="flex flex-col items-end gap-1">
          <StatusBadge status={order.status} />
          <span className="text-lg font-semibold tabular-nums">{formatMoney(order.totalAmount)}</span>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ul className="divide-y rounded-lg border">
          {order.items.map((item) => {
            const short = order.status === "WEB_PENDING" && !item.isPreOrder && item.stock !== null && item.stock < item.quantity;
            return (
              <li key={item.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <div className="relative size-9 shrink-0 overflow-hidden rounded-md border bg-muted">
                  {item.image ? (
                    <Image src={item.image} alt="" fill sizes="36px" className="object-cover" />
                  ) : (
                    <ImageOff className="absolute inset-0 m-auto size-3.5 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{item.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.barcode} · {priceTypeLabel[item.priceType]}
                  </div>
                </div>
                {item.isPreOrder && (
                  <Badge variant="outline" className="border-amber-500/50 text-amber-700 dark:text-amber-400">
                    A pedir
                  </Badge>
                )}
                {short && <Badge variant="destructive">Stock: {item.stock}</Badge>}
                <span className="w-10 text-right tabular-nums text-muted-foreground">×{item.quantity}</span>
                <span className="w-24 text-right tabular-nums">{formatMoney(item.priceAtSale * item.quantity)}</span>
              </li>
            );
          })}
        </ul>
        {preOrder > 0 && order.status === "PENDING" && (
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
            {preOrder} prenda(s) esperando al proveedor antes de entregar.
          </p>
        )}
      </CardContent>
      {(order.status === "PENDING" || order.status === "WEB_PENDING" || wa) && (
        <CardFooter className="flex flex-wrap justify-end gap-2 border-t">
          {wa && (
            <Button variant="outline" size="sm" asChild className="mr-auto">
              <a href={wa} target="_blank" rel="noreferrer">
                <MessageCircle className="text-emerald-600" />
                {order.status === "PENDING" ? "Avisar que está listo" : "WhatsApp"}
              </a>
            </Button>
          )}
          {order.status === "PENDING" && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setConfirm({
                    title: `¿Cancelar el pedido ${orderNumber(order.number)}?`,
                    description: "Las prendas que se habían descontado vuelven al stock. El pedido queda registrado como cancelado.",
                    confirm: "Cancelar pedido",
                    destructive: true,
                    action: () => cancelOrderAction(order.id),
                  })
                }
              >
                <Ban /> Cancelar
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  setConfirm({
                    title: `¿Marcar ${orderNumber(order.number)} como entregado?`,
                    description: `${order.customerName} · ${formatMoney(order.totalAmount)}. La venta pasa a contar en el dashboard y los reportes.`,
                    confirm: "Marcar entregado",
                    action: () => deliverOrderAction(order.id),
                  })
                }
              >
                <CheckCheck /> Entregar
              </Button>
            </>
          )}
          {order.status === "WEB_PENDING" && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setConfirm({
                    title: `¿Rechazar el pedido ${orderNumber(order.number)}?`,
                    description: "El pedido queda cancelado y las prendas reservadas vuelven a estar disponibles en la tienda.",
                    confirm: "Rechazar",
                    destructive: true,
                    action: () => rejectWebOrderAction(order.id),
                  })
                }
              >
                <X /> Rechazar
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  setConfirm({
                    title: `¿Aprobar el pedido ${orderNumber(order.number)}?`,
                    description: "Se descuenta el stock. Si alguna prenda ya no alcanza, queda como pre-pedido para pedir al proveedor.",
                    confirm: "Aprobar",
                    action: () => approveWebOrderAction(order.id),
                  })
                }
              >
                <Check /> Aprobar
              </Button>
            </>
          )}
        </CardFooter>
      )}
      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm?.title ?? ""}
        description={confirm?.description}
        confirmLabel={confirm?.confirm}
        destructive={confirm?.destructive}
        action={() => confirm!.action()}
      />
    </Card>
  );
}
