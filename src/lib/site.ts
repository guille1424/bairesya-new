export const siteConfig = {
  name: "BairesYa",
  tagline: "Moda mujer · Deportivo · Urbano · Formal",
  slogan: "La ciudad no espera",
  /** Slogan completo de la marca. */
  claim: "La ciudad no espera. Vos tampoco.",
  description:
    "Moda femenina deportiva, urbana y formal. Lo último en tendencias para moverte, trabajar y salir, lista para hoy. Pedí por WhatsApp.",
  // Definidas en next.config.ts a partir de SITE_URL / WHATSAPP_NUMBER (con o sin NEXT_PUBLIC_).
  url: process.env.STORE_SITE_URL || "http://localhost:3000",
  whatsappNumber: (process.env.STORE_WHATSAPP_NUMBER || "").replace(/\D/g, ""),
};
