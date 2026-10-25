"use client";

import { useState } from "react";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProductDetail } from "@/lib/data/catalog";
import { useCart } from "./cart";

export function AddToCart({ product }: { product: ProductDetail }) {
  const { add } = useCart();
  const [quantity, setQuantity] = useState(1);
  const soldOut = product.available <= 0;

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <div className="flex items-center rounded-lg border">
          <Button variant="ghost" size="icon" aria-label="Restar" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>
            <Minus />
          </Button>
          <span className="w-8 text-center tabular-nums">{quantity}</span>
          <Button variant="ghost" size="icon" aria-label="Sumar" onClick={() => setQuantity((q) => Math.min(20, q + 1))}>
            <Plus />
          </Button>
        </div>
        <Button
          size="lg"
          className="h-10 flex-1"
          onClick={() =>
            add(
              {
                productId: product.id,
                barcode: product.barcode,
                name: product.name,
                size: product.size,
                color: product.color,
                price: product.price,
                image: product.images[0] ?? null,
                available: product.available,
              },
              quantity,
            )
          }
        >
          <ShoppingBag /> {soldOut ? "Encargar" : "Agregar al carrito"}
        </Button>
      </div>
      {soldOut ? (
        <p className="text-sm text-muted-foreground">Sin stock por ahora: lo encargamos y te avisamos cuando llega.</p>
      ) : quantity > product.available ? (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          Hay {product.available} disponible{product.available !== 1 && "s"}; el resto lo encargamos.
        </p>
      ) : null}
    </div>
  );
}
