"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ShoppingBag, UserRound } from "lucide-react";
import { BrandLink } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { lines, lineValues } from "@/lib/lines";
import { useCart, type StoreCustomer } from "./cart";

export function StoreHeader({ account }: { account: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <BrandLink />
        <nav className="ml-6 hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
          {lineValues.map((l) => (
            <Link key={l} href={`/coleccion/${lines[l].slug}`} className="transition-colors hover:text-foreground">
              {lines[l].label}
            </Link>
          ))}
          <Link href="/#catalogo" className="transition-colors hover:text-foreground">
            Lo último
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          {account}
          <CartButton />
        </div>
      </div>
    </header>
  );
}

function CartButton() {
  const { count, setOpen } = useCart();
  return (
    <Button variant="ghost" size="icon" className="relative" aria-label={`Carrito (${count})`} onClick={() => setOpen(true)}>
      <ShoppingBag />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex size-4.5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground tabular-nums">
          {count}
        </span>
      )}
    </Button>
  );
}

/** Muestra el acceso a la cuenta y comparte los datos del cliente con el checkout. */
export function AccountLink({ customer }: { customer: StoreCustomer }) {
  const { setCustomer } = useCart();
  useEffect(() => setCustomer(customer), [customer, setCustomer]);
  return (
    <Button variant="ghost" size="sm" asChild>
      <Link href={customer ? "/mi-cuenta" : "/ingresar"}>
        <UserRound />
        <span className="hidden max-w-28 truncate sm:inline">{customer ? customer.name.split(" ")[0] : "Ingresar"}</span>
      </Link>
    </Button>
  );
}
