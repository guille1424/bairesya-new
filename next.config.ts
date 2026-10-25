import type { NextConfig } from "next";

// Acepta las variables con o sin prefijo NEXT_PUBLIC_ y, si falta la URL del sitio,
// usa el dominio de producción que expone Vercel. Se embeben en el build (servidor y navegador).
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
  "http://localhost:3000";

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
