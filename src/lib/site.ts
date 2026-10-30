export const siteConfig = {
  name: "BairesYa",
  tagline: "Moda mujer · Deportivo · Urbano · Formal",
  slogan: "La ciudad no espera",
  /** Slogan completo de la marca. */
  claim: "La ciudad no espera. Vos tampoco.",
  /** Lo que la gente busca en Google; va en el título de la portada. */
  title: "Ropa de mujer deportiva, urbana y formal en Buenos Aires",
  description:
    "Ropa de mujer deportiva, urbana y formal en Buenos Aires. Lo último en tendencias para moverte, trabajar y salir, lista para hoy. Pedí por WhatsApp.",
  // Definidas en next.config.ts a partir de SITE_URL / WHATSAPP_NUMBER (con o sin NEXT_PUBLIC_).
  url: process.env.STORE_SITE_URL || "http://localhost:3000",
  whatsappNumber: (process.env.STORE_WHATSAPP_NUMBER || "").replace(/\D/g, ""),
};

/** Dirección completa: las fotos del catálogo de muestra se guardan relativas ("/catalogo/…"). */
export function absoluteUrl(path: string) {
  return new URL(path, siteConfig.url).href;
}

/** Las páginas que definen su openGraph reemplazan el del layout entero, así que lo repiten con esto. */
export const baseOpenGraph = { type: "website", locale: "es_AR", siteName: siteConfig.name } as const;
