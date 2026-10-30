import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { getCatalogFilters, getSitemapProducts } from "@/lib/data/catalog";
import { canonicalVariants, categoryPath, productPath } from "@/lib/domain/seo";
import { lines, lineValues } from "@/lib/lines";
import { absoluteUrl, siteConfig } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Se genera al pedirlo (no en el build), así el build no depende de la base.
  await connection();
  const [products, { categories }] = await Promise.all([getSitemapProducts(), getCatalogFilters()]);
  const url = (path: string) => `${siteConfig.url}${path}`;
  return [
    { url: siteConfig.url, changeFrequency: "daily", priority: 1 },
    ...lineValues.map((l) => ({ url: url(`/coleccion/${lines[l].slug}`), changeFrequency: "daily" as const, priority: 0.9 })),
    ...[...new Set(categories.map(categoryPath))].map((path) => ({ url: url(path), changeFrequency: "weekly" as const, priority: 0.7 })),
    // Solo la página principal de cada modelo y color: las de los otros talles apuntan a esa.
    ...canonicalVariants(products).map((p) => ({
      url: url(productPath(p)),
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
      images: p.images.map((i) => absoluteUrl(i.url)),
    })),
  ];
}
