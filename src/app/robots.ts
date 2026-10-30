import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  // Los deploys de preview no se indexan: competirían con el sitio real.
  if (process.env.VERCEL_ENV === "preview") return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/mi-cuenta"] },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
