"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, MessageCircle, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/brand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { placeWebOrder, type PlacedOrder } from "@/lib/actions/store";
import { productPath } from "@/lib/domain/seo";
import { formatMoney, orderNumber } from "@/lib/format";
import { webOrderMessage } from "@/lib/messages";
import { siteConfig } from "@/lib/site";
import { whatsappLink } from "@/lib/whatsapp";
import { useCart } from "./cart";

type Step = "cart" | "checkout" | "done";

export function CartSheet() {
  const cart = useCart();
  const [step, setStep] = useState<Step>("cart");
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);

  function onOpenChange(open: boolean) {
    cart.setOpen(open);
    if (!open && step === "done") {
      setStep("cart");
      setPlaced(null);
    }
  }

  return (
    <Sheet open={cart.open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>{step === "checkout" ? "Tus datos" : step === "done" ? "¡Pedido enviado!" : "Tu carrito"}</SheetTitle>
          <SheetDescription>
            {step === "checkout"
              ? "Te contactamos por WhatsApp para coordinar el pago y la entrega."
              : step === "done"
                ? "Lo vamos a revisar y te confirmamos por WhatsApp."
                : `${cart.count} prenda${cart.count !== 1 ? "s" : ""}`}
          </SheetDescription>
        </SheetHeader>
        {step === "cart" && <CartLines onCheckout={() => setStep("checkout")} />}
        {step === "checkout" && (
          <Checkout
            onBack={() => setStep("cart")}
            onPlaced={(order) => {
              setPlaced(order);
              setStep("done");
            }}
          />
        )}
        {step === "done" && placed && <Done order={placed} />}
      </SheetContent>
    </Sheet>
  );
}

function CartLines({ onCheckout }: { onCheckout: () => void }) {
  const cart = useCart();
  if (cart.lines.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-muted">
          <ShoppingBag className="size-6 text-muted-foreground" />
        </span>
        <p className="font-medium">Tu carrito está vacío</p>
        <Button variant="outline" onClick={() => cart.setOpen(false)}>
          Seguir mirando
        </Button>
      </div>
    );
  }
  return (
    <>
      <ul className="flex-1 divide-y overflow-y-auto px-4">
        {cart.lines.map((line) => (
          <li key={line.productId} className="flex gap-3 py-4">
            <div className="relative aspect-[3/4] w-20 shrink-0 overflow-hidden rounded-md bg-muted">
              {line.image ? (
                <Image src={line.image} alt={line.name} fill sizes="80px" className="object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center p-3">
                  <Logo className="w-full opacity-30" />
                </div>
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <Link href={productPath(line)} onClick={() => cart.setOpen(false)} className="truncate font-medium hover:underline">
                {line.name}
              </Link>
              <span className="text-xs text-muted-foreground">
                {[line.size && `Talle ${line.size}`, line.color].filter(Boolean).join(" · ")}
              </span>
              {line.quantity > line.available && (
                <Badge variant="outline" className="mt-1 w-fit border-amber-500/50 text-[11px] text-amber-700 dark:text-amber-400">
                  {line.available > 0 ? `Quedan ${line.available}; el resto se encarga` : "Por encargo"}
                </Badge>
              )}
              <div className="mt-auto flex items-center justify-between pt-2">
                <div className="flex items-center rounded-lg border">
                  <Button variant="ghost" size="icon-xs" aria-label="Restar" onClick={() => cart.setQuantity(line.productId, line.quantity - 1)}>
                    <Minus />
                  </Button>
                  <span className="w-7 text-center text-sm tabular-nums">{line.quantity}</span>
                  <Button variant="ghost" size="icon-xs" aria-label="Sumar" onClick={() => cart.setQuantity(line.productId, line.quantity + 1)}>
                    <Plus />
                  </Button>
                </div>
                <span className="font-medium tabular-nums">{formatMoney(line.price * line.quantity)}</span>
              </div>
            </div>
            <Button variant="ghost" size="icon-sm" aria-label="Quitar" onClick={() => cart.remove(line.productId)}>
              <Trash2 />
            </Button>
          </li>
        ))}
      </ul>
      <SheetFooter className="border-t">
        <div className="flex items-baseline justify-between">
          <span className="text-muted-foreground">Total</span>
          <span className="text-xl font-semibold tabular-nums">{formatMoney(cart.total)}</span>
        </div>
        <p className="text-xs text-muted-foreground">Precio en efectivo. Pagando por transferencia el precio puede variar.</p>
        <Button size="lg" onClick={onCheckout}>
          Continuar
        </Button>
      </SheetFooter>
    </>
  );
}

function Checkout({ onBack, onPlaced }: { onBack: () => void; onPlaced: (order: PlacedOrder) => void }) {
  const cart = useCart();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="flex flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        setError(null);
        startTransition(async () => {
          const result = await placeWebOrder({
            customerName: data.get("name"),
            customerPhone: data.get("phone"),
            items: cart.lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
          });
          if (result.error || !result.order) {
            setError(result.error ?? "No se pudo enviar el pedido.");
            return;
          }
          cart.clear();
          onPlaced(result.order);
          const link = whatsappLink(siteConfig.whatsappNumber, webOrderMessage(result.order));
          if (link) window.open(link, "_blank");
          else toast.success("Pedido recibido");
        });
      }}
    >
      <div className="flex-1 overflow-y-auto p-4">
        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel htmlFor="checkout-name">Nombre y apellido</FieldLabel>
            <Input id="checkout-name" name="name" required minLength={2} autoComplete="name" defaultValue={cart.customer?.name} />
          </Field>
          <Field>
            <FieldLabel htmlFor="checkout-phone">WhatsApp</FieldLabel>
            <Input
              id="checkout-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              required
              autoComplete="tel"
              placeholder="11 2345 6789"
              defaultValue={cart.customer?.phone ?? ""}
            />
            <FieldDescription>Para confirmarte el pedido y coordinar la entrega.</FieldDescription>
          </Field>
          {!cart.customer && (
            <p className="text-sm text-muted-foreground">
              ¿Tenés cuenta?{" "}
              <Link href="/ingresar" onClick={() => cart.setOpen(false)} className="font-medium text-primary underline-offset-4 hover:underline">
                Ingresá
              </Link>{" "}
              para ver tus pedidos después.
            </p>
          )}
          {error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        </FieldGroup>
      </div>
      <SheetFooter className="border-t">
        <div className="flex items-baseline justify-between">
          <span className="text-muted-foreground">{cart.count} prendas</span>
          <span className="text-xl font-semibold tabular-nums">{formatMoney(cart.total)}</span>
        </div>
        <Button size="lg" type="submit" disabled={pending}>
          {pending ? <Spinner /> : <MessageCircle />}
          Enviar pedido por WhatsApp
        </Button>
        <Button type="button" variant="ghost" onClick={onBack} disabled={pending}>
          Volver al carrito
        </Button>
      </SheetFooter>
    </form>
  );
}

function Done({ order }: { order: PlacedOrder }) {
  const cart = useCart();
  const link = whatsappLink(siteConfig.whatsappNumber, webOrderMessage(order));
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <CheckCircle2 className="size-12 text-emerald-600" />
      <div className="space-y-1">
        <p className="text-lg font-semibold">Pedido {orderNumber(order.number)}</p>
        <p className="text-sm text-muted-foreground">
          Total {formatMoney(order.totalAmount)}. Si no se abrió WhatsApp, envianos el mensaje desde acá.
        </p>
      </div>
      {link && (
        <Button asChild size="lg">
          <a href={link} target="_blank" rel="noreferrer">
            <MessageCircle /> Abrir WhatsApp
          </a>
        </Button>
      )}
      <Button variant="ghost" onClick={() => cart.setOpen(false)}>
        Seguir comprando
      </Button>
    </div>
  );
}
