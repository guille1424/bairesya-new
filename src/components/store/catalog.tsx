import Link from "next/link";
import { Search } from "lucide-react";
import { ClearFilters, Pagination, SearchFilter, SelectFilter } from "@/components/admin/url-filters";
import { ProductCard, ProductGridSkeleton } from "@/components/store/product-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { getCatalog, getCatalogFilters } from "@/lib/data/catalog";
import { categoryPath, displayCategory } from "@/lib/domain/seo";
import { lineFromSlug, lines, lineValues, type LineValue } from "@/lib/lines";
import { oneOf, pageParam, param, type SearchParams } from "@/lib/search-params";
import { cn } from "@/lib/utils";

/**
 * Colecciones y categorías tienen página propia (/coleccion/deportivo, /categoria/calzas) para que Google
 * las indexe. Una categoría dentro de una colección queda como filtro de la página de la colección.
 */
export function catalogPath(line?: LineValue, category?: string) {
  if (line) return `/coleccion/${lines[line].slug}${category ? `?category=${encodeURIComponent(category)}` : ""}`;
  if (category) return categoryPath(category);
  return "/#catalogo";
}

export function CatalogSkeleton() {
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

/** Página de colección o categoría mientras carga: encabezado y catálogo. */
export function CatalogPageSkeleton() {
  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-5 w-1/2" />
      </div>
      <CatalogSkeleton />
    </div>
  );
}

export async function Catalog({
  searchParams,
  line: fixedLine,
  category: fixedCategory,
}: {
  searchParams: Promise<SearchParams>;
  /** Fijados por la página (colección o categoría); si no, se leen de la dirección. */
  line?: LineValue;
  category?: string;
}) {
  const params = await searchParams;
  const line = fixedLine ?? lineFromSlug(param(params, "linea"));
  const query = {
    q: param(params, "q"),
    line,
    category: fixedCategory ?? param(params, "category"),
    size: param(params, "size"),
    color: param(params, "color"),
    sort: oneOf(param(params, "sort"), ["new", "price", "-price"] as const),
    page: pageParam(params),
  };
  const [filters, result] = await Promise.all([getCatalogFilters(line), getCatalog(query)]);
  const hasFilters = Boolean(
    query.q || query.size || query.color || (query.line && !fixedLine) || (query.category && !fixedCategory),
  );

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <nav className="flex flex-wrap gap-2" aria-label="Colecciones">
          <LineTab href={catalogPath()} active={!line}>
            Todo
          </LineTab>
          {lineValues.map((l) => (
            <LineTab key={l} href={catalogPath(l)} active={line === l}>
              {lines[l].label}
            </LineTab>
          ))}
        </nav>
        {filters.categories.length > 1 && (
          <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" aria-label="Categorías">
            <CategoryChip href={catalogPath(line)} active={!query.category}>
              Todas las prendas
            </CategoryChip>
            {filters.categories.map((c) => (
              <CategoryChip key={c} href={catalogPath(line, c)} active={query.category === c}>
                {displayCategory(c)}
              </CategoryChip>
            ))}
          </nav>
        )}
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
          <ClearFilters keys={["q", "size", "color", "sort", "category", "linea"]} />
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
          {result.products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
      {result.pages > 1 && <Pagination page={result.page} pages={result.pages} total={result.total} noun={["prenda", "prendas"]} />}
    </div>
  );
}

function LineTab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full px-3.5 py-1.5 font-display text-base tracking-wide uppercase transition-colors sm:px-5 sm:py-2 sm:text-lg",
        active ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70",
      )}
    >
      {children}
    </Link>
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
