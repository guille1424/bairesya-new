"use client";

import { createContext, use, useCallback, useMemo, useState } from "react";
import { createPersistentStore } from "@/lib/persistent-store";

export type CartLine = {
  productId: string;
  barcode: string;
  name: string;
  size: string | null;
  color: string | null;
  price: number;
  image: string | null;
  quantity: number;
  available: number;
};

export type StoreCustomer = { name: string; phone: string | null } | null;

type CartContextValue = {
  customer: StoreCustomer;
  setCustomer: (customer: StoreCustomer) => void;
  lines: CartLine[];
  count: number;
  total: number;
  open: boolean;
  setOpen: (open: boolean) => void;
  add: (line: Omit<CartLine, "quantity">, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const MAX_PER_ITEM = 20;
const EMPTY: CartLine[] = [];
const cartStore = createPersistentStore<CartLine[]>("by_cart", EMPTY);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const lines = cartStore.useValue();
  const [open, setOpen] = useState(false);
  const [customer, setCustomer] = useState<StoreCustomer>(null);

  const add = useCallback((line: Omit<CartLine, "quantity">, quantity = 1) => {
    cartStore.set((prev) => {
      const existing = prev.find((l) => l.productId === line.productId);
      if (existing) {
        return prev.map((l) =>
          l.productId === line.productId ? { ...l, ...line, quantity: Math.min(MAX_PER_ITEM, l.quantity + quantity) } : l,
        );
      }
      return [...prev, { ...line, quantity: Math.min(MAX_PER_ITEM, quantity) }];
    });
    setOpen(true);
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    cartStore.set((prev) =>
      quantity <= 0
        ? prev.filter((l) => l.productId !== productId)
        : prev.map((l) => (l.productId === productId ? { ...l, quantity: Math.min(MAX_PER_ITEM, quantity) } : l)),
    );
  }, []);

  const remove = useCallback((productId: string) => cartStore.set((prev) => prev.filter((l) => l.productId !== productId)), []);
  const clear = useCallback(() => cartStore.set(EMPTY), []);

  const value = useMemo(
    () => ({
      customer,
      setCustomer,
      lines,
      count: lines.reduce((s, l) => s + l.quantity, 0),
      total: lines.reduce((s, l) => s + l.quantity * l.price, 0),
      open,
      setOpen,
      add,
      setQuantity,
      remove,
      clear,
    }),
    [customer, lines, open, add, setQuantity, remove, clear],
  );

  return <CartContext value={value}>{children}</CartContext>;
}

export function useCart() {
  const ctx = use(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de CartProvider");
  return ctx;
}
