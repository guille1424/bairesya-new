import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, MessageCircle, Truck } from "lucide-react";
import { AddToCart } from "@/components/store/add-to-cart";
import { ProductCard } from "@/components/store/product-card";
import { ProductGallery } from "@/components/store/product-gallery";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getPublicProduct, getRelatedProducts, type ProductDetail } from "@/lib/data/catalog";
import { formatMoney } from "@/lib/format";
import { siteConfig } from "@/lib/site";
import { whatsappLink } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/producto/[barcode]">): Promise<Metadata> {
  const { barcode } = await params;
  const product = await getPublicProduct(decodeURIComponent(barcode));
  if (!product) return { title: "Producto no encontrado" };
  const description =
    product.description?.slice(0, 160) ||
    `${product.name}${product.size ? ` talle ${product.size}` : ""}${product.color ? `, ${product.color}` : ""}. ${formatMoney(product.price)} en ${siteConfig.name}.`;
  return {
    title: product.name,
    description,
    alternates: { canonical: `/producto/${product.barcode}` },
    openGraph: { title: product.name, description, images: product.images.slice(0, 1) },
  };
}

export default function ProductPage({ params }: PageProps<"/producto/[barcode]">) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:py-10">
      <Button variant="ghost" size="sm" asChild className="-ml-2 mb-4">
        <Link href="/">
          <ChevronLeft /> Volver a la colección
        </Link>
      </Button>
      <Suspense fallback={<ProductSkeleton />}>
        <Product params={params} />
      </Suspense>
    </div>
  );
}

function ProductSkeleton() {
  return (
    <div className="grid gap-8 md:grid-cols-2 lg:gap-12">
      <Skeleton className="aspect-[3/4] rounded-2xl" />
      <div className="space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-6 w-1/4" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}

async function Product({ params }: { params: Promise<{ barcode: string }> }) {
  const { barcode } = await params;
  const product = await getPublicProduct(decodeURIComponent(barcode));
  if (!product) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.barcode,
    image: product.images,
    description: product.description ?? undefined,
    color: product.color ?? undefined,
    size: product.size ?? undefined,
    brand: { "@type": "Brand", name: siteConfig.name },
    offers: {
      "@type": "Offer",
      priceCurrency: "ARS",
      price: product.price,
      availability: product.available > 0 ? "https://schema.org/InStock" : "https://schema.org/BackOrder",
      url: `${siteConfig.url}/producto/${product.barcode}`,
    },
  };
  const consult = whatsappLink(
    siteConfig.whatsappNumber,
    `¡Hola! Quería consultar por "${product.name}"${product.size ? ` talle ${product.size}` : ""} (${product.barcode}).`,
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <div className="grid gap-8 md:grid-cols-2 lg:gap-12">
        <ProductGallery images={product.images} name={product.name} />
        <div className="flex flex-col gap-6 md:py-4">
          <div className="space-y-2">
            {product.category && (
              <Link href={`/?category=${encodeURIComponent(product.category)}`} className="text-sm text-muted-foreground hover:underline">
                {product.category}
              </Link>
            )}
            <h1 className="text-3xl font-semibold tracking-tight">{product.name}</h1>
            <p className="text-2xl font-semibold tabular-nums">{formatMoney(product.price)}</p>
            <p className="text-xs text-muted-foreground">Precio en efectivo. Consultá el precio por transferencia.</p>
          </div>

          <Variants product={product} />

          <AddToCart product={product} />

          {consult && (
            <Button variant="outline" asChild>
              <a href={consult} target="_blank" rel="noreferrer">
                <MessageCircle className="text-emerald-600" /> Consultar por WhatsApp
              </a>
            </Button>
          )}

          {product.description && (
            <div className="space-y-2 border-t pt-6">
              <h2 className="font-medium">Descripción</h2>
              <p className="text-sm whitespace-pre-line text-muted-foreground">{product.description}</p>
            </div>
          )}

          <dl className="grid grid-cols-2 gap-4 border-t pt-6 text-sm">
            {[
              ["Talle", product.size],
              ["Color", product.color],
              ["Tipo", product.type],
              ["Diseño", product.design],
            ]
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k}>
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
          </dl>

          <p className="flex items-center gap-2 rounded-xl bg-muted/60 p-4 text-sm text-muted-foreground">
            <Truck className="size-4 shrink-0" />
            Coordinamos la entrega o el retiro por WhatsApp cuando confirmamos tu pedido.
          </p>
        </div>
      </div>

      <Suspense fallback={null}>
        <Related product={product} />
      </Suspense>
    </>
  );
}

function Variants({ product }: { product: ProductDetail }) {
  if (product.variants.length <= 1) return null;
  const sizes = [...new Map(product.variants.filter((v) => v.color === product.color).map((v) => [v.size, v])).values()];
  const colors = [...new Map(product.variants.filter((v) => v.size === product.size).map((v) => [v.color, v])).values()];
  return (
    <div className="space-y-4">
      {sizes.length > 1 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Talle</p>
          <div className="flex flex-wrap gap-2">
            {sizes.map((v) => (
              <VariantLink key={v.barcode} barcode={v.barcode} active={v.barcode === product.barcode} soldOut={v.available <= 0}>
                {v.size ?? "Único"}
              </VariantLink>
            ))}
          </div>
        </div>
      )}
      {colors.length > 1 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Color</p>
          <div className="flex flex-wrap gap-2">
            {colors.map((v) => (
              <VariantLink key={v.barcode} barcode={v.barcode} active={v.barcode === product.barcode} soldOut={v.available <= 0}>
                {v.color ?? "—"}
              </VariantLink>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function VariantLink({ barcode, active, soldOut, children }: { barcode: string; active: boolean; soldOut: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={`/producto/${barcode}`}
      replace
      scroll={false}
      className={cn(
        "min-w-11 rounded-lg border px-3 py-2 text-center text-sm transition-colors",
        active ? "border-foreground bg-foreground text-background" : "hover:border-foreground/50",
        soldOut && !active && "text-muted-foreground line-through decoration-1",
      )}
    >
      {children}
    </Link>
  );
}

async function Related({ product }: { product: ProductDetail }) {
  const related = await getRelatedProducts(product.category, product.name);
  if (related.length === 0) return null;
  return (
    <section className="mt-16 space-y-6">
      <h2 className="text-xl font-semibold tracking-tight">También te puede gustar</h2>
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4">
        {related.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
