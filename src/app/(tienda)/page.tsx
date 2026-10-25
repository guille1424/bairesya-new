import { Suspense } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { ClearFilters, Pagination, SearchFilter, SelectFilter } from "@/components/admin/url-filters";
import { ProductCard, ProductGridSkeleton } from "@/components/store/product-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { getCatalog, getCatalogFilters } from "@/lib/data/catalog";
import { oneOf, pageParam, param, type SearchParams } from "@/lib/search-params";
import { cn } from "@/lib/utils";

export default function StoreHome({ searchParams }: PageProps<"/">) {
  return (
    <>
      <section className="relative overflow-hidden border-b bg-zinc-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,oklch(0.45_0.22_283/0.6),transparent_55%),radial-gradient(ellipse_at_bottom_right,oklch(0.55_0.2_330/0.35),transparent_50%)]" />
        <div className="relative mx-auto flex max-w-7xl flex-col gap-5 px-4 py-16 sm:px-6 md:py-24">
          <span className="w-fit rounded-full border border-white/20 px-3 py-1 text-xs tracking-wide text-white/80 uppercase">
            Nueva colección
          </span>
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance md:text-6xl">
            Moda urbana con identidad porteña.
          </h1>
          <p className="max-w-xl text-white/70 md:text-lg">
            Prendas seleccionadas, talles reales y atención directa por WhatsApp. Elegí, armá tu pedido y te lo confirmamos al toque.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <Suspense fallback={<CatalogSkeleton />}>
          <Catalog searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

function CatalogSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex gap-2">
        {[80, 96, 72, 88].map((w) => (
          <Skeleton key={w} className="h-8 rounded-full" style={{ width: w }} />
        ))}
      </div>
      <ProductGridSkeleton />
    </div>
  );
}

async function Catalog({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const query = {
    q: param(params, "q"),
    category: param(params, "category"),
    size: param(params, "size"),
    color: param(params, "color"),
    sort: oneOf(param(params, "sort"), ["new", "price", "-price"] as const),
    page: pageParam(params),
  };
  const [filters, result] = await Promise.all([getCatalogFilters(), getCatalog(query)]);
  const hasFilters = Boolean(query.q || query.category || query.size || query.color);

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" aria-label="Categorías">
          <CategoryChip href="/" active={!query.category}>
            Todo
          </CategoryChip>
          {filters.categories.map((c) => (
            <CategoryChip key={c} href={`/?category=${encodeURIComponent(c)}`} active={query.category === c}>
              {c}
            </CategoryChip>
          ))}
        </nav>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <SearchFilter placeholder="Buscar prendas" />
          <div className="grid grid-cols-3 gap-2 sm:flex">
            <SelectFilter paramKey="size" placeholder="Talle" options={filters.sizes} className="w-full sm:w-28" />
            <SelectFilter paramKey="color" placeholder="Color" options={filters.colors} className="w-full sm:w-32" />
            <SelectFilter
              paramKey="sort"
              placeholder="Más nuevos"
              className="w-full sm:w-40"
              options={[
                { value: "price", label: "Menor precio" },
                { value: "-price", label: "Mayor precio" },
              ]}
            />
          </div>
          <ClearFilters keys={["q", "size", "color", "sort", "category"]} />
        </div>
      </div>

      {result.products.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Search />
            </EmptyMedia>
            <EmptyTitle>{hasFilters ? "No encontramos prendas con esos filtros" : "Muy pronto, nueva colección"}</EmptyTitle>
            <EmptyDescription>
              {hasFilters ? "Probá con otro talle, color o búsqueda." : "Estamos cargando las prendas. Volvé en un rato."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {result.products.map((p, i) => (
            <ProductCard key={p.id} product={p} priority={i < 4} />
          ))}
        </div>
      )}
      {result.pages > 1 && <Pagination page={result.page} pages={result.pages} total={result.total} noun={["prenda", "prendas"]} />}
    </div>
  );
}

function CategoryChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "shrink-0 rounded-full border px-4 py-1.5 text-sm transition-colors",
        active ? "border-foreground bg-foreground text-background" : "hover:border-foreground/40",
      )}
    >
      {children}
    </Link>
  );
}
