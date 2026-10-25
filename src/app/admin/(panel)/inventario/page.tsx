import { Suspense } from "react";
import type { Metadata } from "next";
import { InventoryTable } from "@/components/admin/inventory-table";
import { PageHeader } from "@/components/admin/page-header";
import { TableSkeleton } from "@/components/admin/skeletons";
import { ClearFilters, Pagination, SearchFilter, SelectFilter } from "@/components/admin/url-filters";
import { getStaff } from "@/lib/auth/dal";
import { getInventorySummary, getProductFilters, listProducts } from "@/lib/data/products";
import { oneOf, pageParam, param, type SearchParams } from "@/lib/search-params";

export const metadata: Metadata = { title: "Inventario" };

const statuses = ["in_stock", "out_of_stock", "public", "hidden"] as const;
const sorts = ["name", "-updated", "stock", "-stock", "price", "-price"] as const;

export default function InventoryPage({ searchParams }: PageProps<"/admin/inventario">) {
  return (
    <>
      <PageHeader
        title="Inventario"
        description={
          <Suspense fallback="Prendas cargadas en el sistema.">
            <Summary />
          </Suspense>
        }
      />
      <Suspense fallback={<TableSkeleton rows={8} />}>
        <Inventory searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Summary() {
  const { active, outOfStock, isPublic } = await getInventorySummary();
  return (
    <>
      {active} productos · {outOfStock} sin stock · {isPublic} publicados en la tienda
    </>
  );
}

async function Inventory({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const query = {
    q: param(params, "q"),
    category: param(params, "category"),
    color: param(params, "color"),
    size: param(params, "size"),
    status: oneOf(param(params, "status"), statuses),
    sort: oneOf(param(params, "sort"), sorts),
    page: pageParam(params),
  };
  const [staff, options, result] = await Promise.all([getStaff(), getProductFilters(), listProducts(query)]);
  const hasFilters = Boolean(query.q || query.category || query.color || query.size || query.status);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <SearchFilter placeholder="Buscar por nombre, código o categoría" />
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <SelectFilter paramKey="category" placeholder="Categoría" options={options.categories} />
          <SelectFilter paramKey="size" placeholder="Talle" options={options.sizes} className="w-full sm:w-28" />
          <SelectFilter paramKey="color" placeholder="Color" options={options.colors} className="w-full sm:w-32" />
          <SelectFilter
            paramKey="status"
            placeholder="Estado"
            options={[
              { value: "in_stock", label: "Con stock" },
              { value: "out_of_stock", label: "Sin stock" },
              { value: "public", label: "En la tienda" },
              { value: "hidden", label: "Ocultos" },
            ]}
          />
          <SelectFilter
            paramKey="sort"
            placeholder="Orden: nombre"
            options={[
              { value: "-updated", label: "Últimos modificados" },
              { value: "-stock", label: "Más stock" },
              { value: "stock", label: "Menos stock" },
              { value: "-price", label: "Mayor precio" },
              { value: "price", label: "Menor precio" },
            ]}
          />
          <ClearFilters keys={["q", "category", "size", "color", "status", "sort"]} />
        </div>
      </div>
      <InventoryTable
        products={result.products}
        options={options}
        canSeeCost={staff?.role === "ADMIN"}
        hasFilters={hasFilters}
      />
      {result.total > 0 && <Pagination page={result.page} pages={result.pages} total={result.total} noun={["producto", "productos"]} />}
    </div>
  );
}
