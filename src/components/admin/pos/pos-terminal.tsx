"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Camera,
  Check,
  ChevronsUpDown,
  ImageOff,
  Minus,
  PackagePlus,
  Plus,
  ScanBarcode,
  ShoppingBag,
  Trash2,
  UserPlus,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { searchPosProducts, submitPosOrder, type PosProduct } from "@/lib/actions/pos";
import type { SavedCustomer } from "@/lib/actions/customers";
import { formatMoney, orderNumber, priceTypeLabel } from "@/lib/format";
import { createPersistentStore } from "@/lib/persistent-store";
import { cn } from "@/lib/utils";
import { BarcodeScannerDialog } from "../barcode-scanner";
import { CustomerForm } from "../customer-form";

type PriceType = "NORMAL" | "TRANSFER" | "CUSTOM";
type CartItem = PosProduct & { quantity: number; priceType: PriceType; customPrice: number | null };
type CustomerOption = { id: string; name: string; phone: string | null };
type OrderOption = { id: string; number: number; customerName: string; totalAmount: number };

// El carrito sobrevive a recargas (por si se cierra la pestaña a mitad de una venta).
const EMPTY_CART: CartItem[] = [];
const posCart = createPersistentStore<CartItem[]>("by_pos_cart", EMPTY_CART);
const setCart = posCart.set;
const WALK_IN = { id: null, name: "Consumidor final", phone: null };

function unitPrice(item: CartItem) {
  if (item.priceType === "TRANSFER") return item.priceTransfer;
  if (item.priceType === "CUSTOM") return item.customPrice ?? 0;
  return item.priceNormal;
}

export function PosTerminal({ customers: initialCustomers, orders }: { customers: CustomerOption[]; orders: OrderOption[] }) {
  const cart = posCart.useValue();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<PosProduct[]>([]);
  const [searching, startSearch] = useTransition();
  const [submitting, startSubmit] = useTransition();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [customers, setCustomers] = useState(initialCustomers);
  const [customer, setCustomer] = useState<{ id: string | null; name: string; phone: string | null } | null>(null);
  const [existingOrder, setExistingOrder] = useState<OrderOption | null>(null);
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const focusInput = () => setTimeout(() => inputRef.current?.focus(), 0);

  const addProduct = useCallback((product: PosProduct) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.barcode === product.barcode);
      if (existing) return prev.map((i) => (i.barcode === product.barcode ? { ...i, quantity: i.quantity + 1 } : i));
      return [...prev, { ...product, quantity: 1, priceType: "NORMAL", customPrice: null }];
    });
    toast.success(`${product.name} agregado`, { duration: 1500 });
    setQuery("");
    setMatches([]);
  }, []);

  const lookup = useCallback(
    (code: string) => {
      const value = code.trim();
      if (!value) return;
      startSearch(async () => {
        const { exact, matches } = await searchPosProducts(value);
        if (exact) addProduct(exact);
        else if (matches.length === 1 && matches[0].barcode.toLowerCase() === value.toLowerCase()) addProduct(matches[0]);
        else if (matches.length > 0) setMatches(matches);
        else toast.error(`No se encontró "${value}"`);
        focusInput();
      });
    },
    [addProduct],
  );

  function update(barcode: string, patch: Partial<CartItem>) {
    setCart((prev) => prev.map((i) => (i.barcode === barcode ? { ...i, ...patch } : i)));
  }

  function remove(barcode: string) {
    const index = cart.findIndex((i) => i.barcode === barcode);
    const item = cart[index];
    if (!item) return;
    setCart((prev) => prev.filter((i) => i.barcode !== barcode));
    toast(`${item.name} quitado`, {
      action: {
        label: "Deshacer",
        onClick: () => setCart((prev) => [...prev.slice(0, index), item, ...prev.slice(index)]),
      },
    });
  }

  const totals = useMemo(() => {
    const byType: Record<PriceType, number> = { NORMAL: 0, TRANSFER: 0, CUSTOM: 0 };
    let units = 0;
    let preOrderUnits = 0;
    for (const item of cart) {
      byType[item.priceType] += unitPrice(item) * item.quantity;
      units += item.quantity;
      preOrderUnits += Math.max(0, item.quantity - Math.max(0, item.stock));
    }
    return { byType, units, preOrderUnits, total: byType.NORMAL + byType.TRANSFER + byType.CUSTOM };
  }, [cart]);

  const invalidCustom = cart.find((i) => i.priceType === "CUSTOM" && !(i.customPrice && i.customPrice > 0));
  const canSubmit =
    cart.length > 0 && !invalidCustom && (mode === "new" ? customer !== null : existingOrder !== null) && !submitting;

  function submit() {
    if (!canSubmit) return;
    startSubmit(async () => {
      const result = await submitPosOrder({
        existingOrderId: mode === "existing" ? existingOrder?.id : null,
        customerId: mode === "new" ? customer?.id : null,
        customerName: mode === "new" ? customer?.name ?? "" : existingOrder?.customerName ?? "",
        customerPhone: mode === "new" ? customer?.phone : null,
        items: cart.map((i) => ({
          barcode: i.barcode,
          quantity: i.quantity,
          priceType: i.priceType,
          customPrice: i.priceType === "CUSTOM" ? i.customPrice : null,
        })),
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`${result.message} ${orderNumber(result.orderNumber!)}`, {
        action: { label: "Ver pedidos", onClick: () => router.push("/admin/pedidos") },
      });
      setCart([]);
      setCustomer(null);
      setExistingOrder(null);
      focusInput();
    });
  }

  const onCustomerSaved = useCallback((saved: SavedCustomer) => {
    setCustomers((prev) => [...prev, saved].sort((a, b) => a.name.localeCompare(b.name)));
    setCustomer(saved);
  }, []);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex min-w-0 flex-col gap-4">
        <Card>
          <CardContent className="space-y-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                lookup(query);
              }}
            >
              <InputGroup className="h-12">
                <InputGroupAddon>{searching ? <Spinner /> : <ScanBarcode />}</InputGroupAddon>
                <InputGroupInput
                  ref={inputRef}
                  autoFocus
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    if (!e.target.value) setMatches([]);
                  }}
                  placeholder="Escaneá o escribí el código / nombre y presioná Enter"
                  className="text-base"
                  aria-label="Código o nombre del producto"
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton variant="secondary" onClick={() => setScannerOpen(true)}>
                    <Camera /> <span className="hidden sm:inline">Cámara</span>
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            </form>
            {matches.length > 0 && (
              <div className="overflow-hidden rounded-lg border">
                <p className="border-b bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
                  {matches.length} coincidencias — elegí una
                </p>
                {matches.map((p) => (
                  <button
                    key={p.barcode}
                    onClick={() => {
                      addProduct(p);
                      focusInput();
                    }}
                    className="flex w-full items-center gap-3 border-b px-3 py-2 text-left last:border-0 hover:bg-accent"
                  >
                    <Thumb src={p.image} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{p.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {p.barcode} · {[p.size && `T. ${p.size}`, p.color].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span className="text-sm tabular-nums">{formatMoney(p.priceNormal)}</span>
                    <Badge variant={p.stock > 0 ? "secondary" : "destructive"}>{p.stock > 0 ? `${p.stock} u.` : "Sin stock"}</Badge>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="gap-0 py-0">
          <CardHeader className="border-b py-4">
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="size-4" /> Carrito
              {totals.units > 0 && <Badge variant="secondary">{totals.units} prendas</Badge>}
            </CardTitle>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setCart([])}>
                Vaciar
              </Button>
            )}
          </CardHeader>
          {cart.length === 0 ? (
            <Empty className="py-14">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ScanBarcode />
                </EmptyMedia>
                <EmptyTitle>El carrito está vacío</EmptyTitle>
                <EmptyDescription>Escaneá la etiqueta de una prenda para empezar.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="divide-y">
              {cart.map((item) => {
                const preOrder = Math.max(0, item.quantity - Math.max(0, item.stock));
                return (
                  <li key={item.barcode} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <Thumb src={item.image} />
                      <div className="min-w-0">
                        <div className="truncate font-medium">{item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.barcode}
                          {item.size && ` · T. ${item.size}`}
                          {item.color && ` · ${item.color}`}
                        </div>
                        {preOrder > 0 && (
                          <Badge variant="outline" className="mt-1 border-amber-500/50 text-amber-700 dark:text-amber-400">
                            {preOrder} a pedir al proveedor
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Tabs value={item.priceType} onValueChange={(v) => update(item.barcode, { priceType: v as PriceType })}>
                        <TabsList className="h-8">
                          <TabsTrigger value="NORMAL" className="text-xs">Efectivo</TabsTrigger>
                          <TabsTrigger value="TRANSFER" className="text-xs">Transf.</TabsTrigger>
                          <TabsTrigger value="CUSTOM" className="text-xs">Otro</TabsTrigger>
                        </TabsList>
                      </Tabs>
                      {item.priceType === "CUSTOM" && (
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="Precio"
                          className="h-8 w-24"
                          value={item.customPrice ?? ""}
                          onChange={(e) => update(item.barcode, { customPrice: e.target.value === "" ? null : Number(e.target.value) })}
                          aria-invalid={!(item.customPrice && item.customPrice > 0)}
                        />
                      )}
                      <div className="flex items-center rounded-lg border">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Restar"
                          onClick={() => (item.quantity > 1 ? update(item.barcode, { quantity: item.quantity - 1 }) : remove(item.barcode))}
                        >
                          <Minus />
                        </Button>
                        <span className="w-8 text-center text-sm tabular-nums">{item.quantity}</span>
                        <Button variant="ghost" size="icon-sm" aria-label="Sumar" onClick={() => update(item.barcode, { quantity: item.quantity + 1 })}>
                          <Plus />
                        </Button>
                      </div>
                      <span className="w-24 text-right font-medium tabular-nums">{formatMoney(unitPrice(item) * item.quantity)}</span>
                      <Button variant="ghost" size="icon-sm" aria-label="Quitar" onClick={() => remove(item.barcode)}>
                        <Trash2 />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <div className="lg:sticky lg:top-20 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle>Pedido</CardTitle>
            <CardDescription>Elegí el cliente o sumá las prendas a un pedido pendiente.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={mode} onValueChange={(v) => setMode(v as "new" | "existing")}>
              <TabsList className="w-full">
                <TabsTrigger value="new">Pedido nuevo</TabsTrigger>
                <TabsTrigger value="existing">Pedido existente</TabsTrigger>
              </TabsList>
            </Tabs>

            {mode === "new" ? (
              <div className="flex gap-2">
                <Picker
                  placeholder="Elegir cliente…"
                  value={customer?.name}
                  emptyText="No hay clientes con ese nombre."
                  items={[
                    { value: "walk-in", label: WALK_IN.name, hint: "Venta rápida sin datos" },
                    ...customers.map((c) => ({ value: c.id, label: c.name, hint: c.phone ?? undefined })),
                  ]}
                  onSelect={(value) =>
                    setCustomer(value === "walk-in" ? WALK_IN : customers.find((c) => c.id === value) ?? null)
                  }
                />
                <Button variant="outline" size="icon" aria-label="Nuevo cliente" onClick={() => setNewCustomerOpen(true)}>
                  <UserPlus />
                </Button>
              </div>
            ) : (
              <Picker
                placeholder="Elegir pedido pendiente…"
                value={existingOrder ? `${orderNumber(existingOrder.number)} · ${existingOrder.customerName}` : undefined}
                emptyText="No hay pedidos pendientes."
                items={orders.map((o) => ({
                  value: o.id,
                  label: `${orderNumber(o.number)} · ${o.customerName}`,
                  hint: formatMoney(o.totalAmount),
                }))}
                onSelect={(value) => setExistingOrder(orders.find((o) => o.id === value) ?? null)}
              />
            )}

            <Separator />

            <dl className="space-y-1.5 text-sm">
              {(Object.keys(totals.byType) as PriceType[])
                .filter((t) => totals.byType[t] > 0)
                .map((t) => (
                  <div key={t} className="flex justify-between text-muted-foreground">
                    <dt>{priceTypeLabel[t]}</dt>
                    <dd className="tabular-nums">{formatMoney(totals.byType[t])}</dd>
                  </div>
                ))}
              <div className="flex items-baseline justify-between pt-1">
                <dt className="font-medium">Total</dt>
                <dd className="text-2xl font-semibold tracking-tight tabular-nums">{formatMoney(totals.total)}</dd>
              </div>
            </dl>

            {totals.preOrderUnits > 0 && (
              <p className="flex gap-2 rounded-lg bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
                <PackagePlus className="size-4 shrink-0" />
                {totals.preOrderUnits} prenda(s) sin stock quedan como pre-pedido y aparecen en la lista de compras.
              </p>
            )}
            {invalidCustom && <p className="text-xs text-destructive">Falta el precio de &quot;{invalidCustom.name}&quot;.</p>}
          </CardContent>
          <CardFooter className="flex-col gap-2">
            <Button size="lg" className="w-full" disabled={!canSubmit} onClick={submit}>
              {submitting ? <Spinner /> : <Check />}
              {mode === "new" ? "Confirmar pedido" : "Agregar al pedido"}
            </Button>
            <Button variant="link" size="sm" asChild>
              <Link href="/admin/pedidos">Ver pedidos pendientes</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      <BarcodeScannerDialog open={scannerOpen} onOpenChange={setScannerOpen} onScan={lookup} />

      <Dialog open={newCustomerOpen} onOpenChange={setNewCustomerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo cliente</DialogTitle>
            <DialogDescription>Queda guardado y seleccionado para este pedido.</DialogDescription>
          </DialogHeader>
          {newCustomerOpen && <CustomerForm onDone={() => setNewCustomerOpen(false)} onSaved={onCustomerSaved} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Thumb({ src }: { src: string | null }) {
  return (
    <div className="relative size-10 shrink-0 overflow-hidden rounded-md border bg-muted">
      {src ? <Image src={src} alt="" fill sizes="40px" className="object-cover" /> : <ImageOff className="absolute inset-0 m-auto size-4 text-muted-foreground" />}
    </div>
  );
}

function Picker({
  placeholder,
  value,
  items,
  emptyText,
  onSelect,
}: {
  placeholder: string;
  value?: string;
  items: { value: string; label: string; hint?: string }[];
  emptyText: string;
  onSelect: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className={cn("min-w-0 flex-1 justify-between", !value && "text-muted-foreground")}>
          <span className="flex min-w-0 items-center gap-2">
            <UserRound className="size-4 shrink-0" />
            <span className="truncate">{value ?? placeholder}</span>
          </span>
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar…" />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.value}
                  value={`${item.label} ${item.hint ?? ""}`}
                  onSelect={() => {
                    onSelect(item.value);
                    setOpen(false);
                  }}
                >
                  <span className="truncate">{item.label}</span>
                  {item.hint && <span className="ml-auto truncate text-xs text-muted-foreground">{item.hint}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
