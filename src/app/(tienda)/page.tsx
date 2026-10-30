import { Suspense } from "react";
import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { Catalog, CatalogSkeleton } from "@/components/store/catalog";
import { Collections, Promises } from "@/components/store/home/collections";
import { Hero } from "@/components/store/home/hero";
import { Marquee } from "@/components/store/home/marquee";
import { siteConfig } from "@/lib/site";

// Los filtros (?q=, ?size=…) son la misma página para Google.
export const metadata: Metadata = { alternates: { canonical: "/" } };

/** Datos de la marca para Google: nombre del sitio en los resultados, logo y contacto. */
const organization = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "OnlineStore",
      "@id": `${siteConfig.url}/#tienda`,
      name: siteConfig.name,
      url: siteConfig.url,
      logo: `${siteConfig.url}/icon-512.png`,
      description: siteConfig.description,
      slogan: siteConfig.claim,
      ...(siteConfig.whatsappNumber && { telephone: `+${siteConfig.whatsappNumber}` }),
      address: { "@type": "PostalAddress", addressLocality: "Buenos Aires", addressCountry: "AR" },
      areaServed: "Buenos Aires",
    },
    {
      "@type": "WebSite",
      "@id": `${siteConfig.url}/#sitio`,
      name: siteConfig.name,
      url: siteConfig.url,
      inLanguage: "es-AR",
      publisher: { "@id": `${siteConfig.url}/#tienda` },
    },
  ],
};

export default function StoreHome({ searchParams }: PageProps<"/">) {
  return (
    <>
      <JsonLd data={organization} />
      <Hero />
      <Marquee />
      <Collections />
      <Promises />
      <section id="catalogo" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-16 sm:px-6 md:py-20">
        <div className="mb-8 space-y-3">
          <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">Catálogo</p>
          <h2 className="font-display text-5xl leading-none tracking-tight uppercase md:text-6xl">Lo último</h2>
        </div>
        <Suspense fallback={<CatalogSkeleton />}>
          <Catalog searchParams={searchParams} />
        </Suspense>
      </section>
    </>
  );
}
