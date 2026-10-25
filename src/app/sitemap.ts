import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { getSitemapProducts } from "@/lib/data/catalog";
import { siteConfig } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Se genera al pedirlo (no en el build), así el build no depende de la base.
  await connection();
  const products = await getSitemapProducts();
  return [
    { url: siteConfig.url, changeFrequency: "daily", priority: 1 },
    ...products.map((p) => ({
      url: `${siteConfig.url}/producto/${encodeURIComponent(p.barcode)}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
