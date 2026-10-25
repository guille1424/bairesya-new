import { Suspense } from "react";
import type { Metadata } from "next";
import { LabelSheet } from "@/components/admin/label-sheet";
import { Spinner } from "@/components/ui/spinner";
import { getProductsByIds } from "@/lib/data/products";
import { param, type SearchParams } from "@/lib/search-params";

export const metadata: Metadata = { title: "Etiquetas", robots: { index: false } };

export default function LabelsPage({ searchParams }: PageProps<"/admin/etiquetas">) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <Spinner className="size-6" />
        </div>
      }
    >
      <Labels searchParams={searchParams} />
    </Suspense>
  );
}

async function Labels({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const ids = (param(await searchParams, "ids") ?? "").split(",").filter(Boolean).slice(0, 200);
  const products = ids.length ? await getProductsByIds(ids) : [];
  return (
    <LabelSheet
      labels={products.map((p) => ({
        id: p.id,
        barcode: p.barcode,
        name: p.name,
        size: p.size,
        color: p.color,
        priceNormal: p.priceNormal,
        priceTransfer: p.priceTransfer,
      }))}
    />
  );
}
