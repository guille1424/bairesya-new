import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { Catalog, CatalogPageSkeleton, CatalogSkeleton } from "@/components/store/catalog";
import { getCatalogFilters } from "@/lib/data/catalog";
import { categoryPath, displayCategory, findCategoryBySlug } from "@/lib/domain/seo";
import { baseOpenGraph, siteConfig } from "@/lib/site";

// Primero la dirección y después la base: así la consulta queda para cada pedido y el build no depende de la base.
async function findCategory(params: Promise<{ slug: string }>) {
  const { slug } = await params;
  const { categories } = await getCatalogFilters();
  return findCategoryBySlug(categories, decodeURIComponent(slug));
}

export async function generateMetadata({ params }: PageProps<"/categoria/[slug]">): Promise<Metadata> {
  const category = await findCategory(params);
  if (!category) return { title: "Categoría no encontrada" };
  const title = `${displayCategory(category)} de mujer`;
  const description = `${title} en Buenos Aires. Mirá talles, colores y precios en ${siteConfig.name} y pedí por WhatsApp, con envío o retiro.`;
  return {
    title,
    description,
    alternates: { canonical: categoryPath(category) },
    openGraph: { ...baseOpenGraph, title, description },
  };
}

export default function CategoryPage({ params, searchParams }: PageProps<"/categoria/[slug]">) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:py-10">
      <Suspense fallback={<CatalogPageSkeleton />}>
        <Category params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Category({ params, searchParams }: PageProps<"/categoria/[slug]">) {
  const category = await findCategory(params);
  if (!category) notFound();
  const name = displayCategory(category);
  return (
    <>
      <Breadcrumbs items={[{ name, href: categoryPath(category) }]} />
      <header className="mb-10 space-y-3">
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">Categoría</p>
        <h1 className="font-display text-5xl leading-none tracking-tight uppercase md:text-6xl">{name} de mujer</h1>
        <p className="max-w-xl text-muted-foreground">
          {name} de mujer en {siteConfig.name}. Elegí tu talle y color, y coordinamos la entrega o el retiro por WhatsApp.
        </p>
      </header>
      <Suspense fallback={<CatalogSkeleton />}>
        <Catalog searchParams={searchParams} category={category} />
      </Suspense>
    </>
  );
}
