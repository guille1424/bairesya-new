export const siteConfig = {
  name: "BairesYa",
  tagline: "Moda urbana",
  description: "Ropa urbana con estilo. Descubrí la nueva colección de BairesYa y pedí por WhatsApp.",
  // Definidas en next.config.ts a partir de SITE_URL / WHATSAPP_NUMBER (con o sin NEXT_PUBLIC_).
  url: process.env.STORE_SITE_URL || "http://localhost:3000",
  whatsappNumber: (process.env.STORE_WHATSAPP_NUMBER || "").replace(/\D/g, ""),
};
