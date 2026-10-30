import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { Catalog, CatalogPageSkeleton, CatalogSkeleton } from "@/components/store/catalog";
import { lineFromSlug, lines } from "@/lib/lines";
import { baseOpenGraph } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/coleccion/[slug]">): Promise<Metadata> {
  const line = lineFromSlug((await params).slug);
  if (!line) return { title: "Colección no encontrada" };
  const { title, metaDescription: description, slug, image } = lines[line];
  return {
    title,
    description,
    alternates: { canonical: `/coleccion/${slug}` },
    openGraph: { ...baseOpenGraph, title, description, images: [image] },
  };
}

export default function CollectionPage({ params, searchParams }: PageProps<"/coleccion/[slug]">) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:py-10">
      <Suspense fallback={<CatalogPageSkeleton />}>
        <Collection params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Collection({ params, searchParams }: PageProps<"/coleccion/[slug]">) {
  const line = lineFromSlug((await params).slug);
  if (!line) notFound();
  const l = lines[line];
  return (
    <>
      <Breadcrumbs items={[{ name: l.label, href: `/coleccion/${l.slug}` }]} />
      <header className="mb-10 space-y-3">
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          Colección {l.label} · {l.moment}
        </p>
        <h1 className="font-display text-5xl leading-none tracking-tight uppercase md:text-6xl">{l.title}</h1>
        <p className="max-w-xl text-muted-foreground">{l.description}</p>
      </header>
      <Suspense fallback={<CatalogSkeleton />}>
        <Catalog searchParams={searchParams} line={line} />
      </Suspense>
    </>
  );
}
