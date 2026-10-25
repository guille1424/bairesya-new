import { Suspense } from "react";
import type { Metadata } from "next";
import { CustomersTable } from "@/components/admin/customers-table";
import { PageHeader } from "@/components/admin/page-header";
import { TableSkeleton } from "@/components/admin/skeletons";
import { Pagination, SearchFilter } from "@/components/admin/url-filters";
import { listCustomers } from "@/lib/data/customers";
import { pageParam, param, type SearchParams } from "@/lib/search-params";

export const metadata: Metadata = { title: "Clientes" };

export default function CustomersPage({ searchParams }: PageProps<"/admin/clientes">) {
  return (
    <>
      <PageHeader title="Clientes" description="Tus compradores, con su historial y contacto directo por WhatsApp." />
      <Suspense fallback={<TableSkeleton />}>
        <Customers searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Customers({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const q = param(params, "q");
  const result = await listCustomers({ q, page: pageParam(params) });
  return (
    <div className="flex flex-col gap-4">
      <SearchFilter placeholder="Buscar por nombre, teléfono o email" />
      <CustomersTable customers={result.customers} hasFilters={Boolean(q)} />
      {result.total > 0 && <Pagination page={result.page} pages={result.pages} total={result.total} noun={["cliente", "clientes"]} />}
    </div>
  );
}
