import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/brand";
import type { CatalogProduct } from "@/lib/data/catalog";
import { formatMoney } from "@/lib/format";

export function ProductCard({ product, priority }: { product: CatalogProduct; priority?: boolean }) {
  const soldOut = product.available <= 0;
  return (
    <Link href={`/producto/${product.barcode}`} className="group flex flex-col gap-3">
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-muted">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex size-full items-center justify-center p-10">
            <Logo className="w-full opacity-20" />
          </div>
        )}
        {soldOut ? (
          <span className="absolute top-2 left-2 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium">Por encargo</span>
        ) : product.available <= 2 ? (
          <span className="absolute top-2 left-2 rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">
            Últimas unidades
          </span>
        ) : null}
      </div>
      <div className="space-y-0.5">
        <h3 className="line-clamp-1 text-sm font-medium">{product.name}</h3>
        <p className="text-xs text-muted-foreground">
          {[
            product.category,
            product.sizes.length > 1 ? `Talles ${product.sizes.join(" · ")}` : product.size && `Talle ${product.size}`,
            product.colors.length > 1 ? `${product.colors.length} colores` : product.color,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <p className="pt-1 font-semibold tabular-nums">
          {product.priceVaries ? <span className="mr-1 text-xs font-normal text-muted-foreground">Desde</span> : null}
          {formatMoney(product.price)}
        </p>
      </div>
    </Link>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="space-y-3">
          <div className="aspect-[3/4] animate-pulse rounded-xl bg-muted" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
