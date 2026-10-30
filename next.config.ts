import type { NextConfig } from "next";

// Acepta las variables con o sin prefijo NEXT_PUBLIC_ y, si falta la URL del sitio,
// usa el dominio de producción que expone Vercel. Se embeben en el build (servidor y navegador).
const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
  "http://localhost:3000"
).replace(/\/+$/, "");

const nextConfig: NextConfig = {
  env: {
    STORE_SITE_URL: siteUrl,
    STORE_WHATSAPP_NUMBER: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || process.env.WHATSAPP_NUMBER || "",
  },
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Para importar planillas de Excel (Vercel acepta hasta 4,5 MB por request).
    serverActions: { bodySizeLimit: "4mb" },
  },
  async redirects() {
    const site = new URL(siteUrl);
    return [
      // Direcciones viejas de las colecciones (/?linea=deportivo): ahora cada una tiene su página.
      {
        source: "/",
        has: [{ type: "query", key: "linea", value: "(?<linea>[a-z]+)" }],
        destination: "/coleccion/:linea",
        permanent: true,
      },
      // En producción, el dominio de Vercel lleva al propio para que Google indexe un solo sitio.
      ...(process.env.VERCEL_ENV === "production" && !site.hostname.endsWith(".vercel.app")
        ? [
            {
              source: "/:path*",
              has: [{ type: "host" as const, value: ".*\\.vercel\\.app" }],
              destination: `${site.origin}/:path*`,
              permanent: true,
            },
          ]
        : []),
    ];
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
