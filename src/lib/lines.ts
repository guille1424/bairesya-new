// Colecciones de la marca: una para cada momento del día.
export type LineValue = "DEPORTIVA" | "URBANA" | "FORMAL";

export const lines: Record<
  LineValue,
  {
    slug: string;
    label: string;
    moment: string;
    description: string;
    image: string;
    tone: string;
    /** Título de la página de la colección, con las palabras que se buscan en Google. */
    title: string;
    /** Descripción para el resultado de búsqueda (hasta ~160 caracteres). */
    metaDescription: string;
  }
> = {
  DEPORTIVA: {
    slug: "deportivo",
    label: "Deportivo",
    moment: "Para moverte",
    description: "Calzas, buzos y prendas técnicas para entrenar y moverte todo el día.",
    image: "/brand/foto-deportivo.webp",
    tone: "bg-black text-white",
    title: "Ropa deportiva de mujer",
    metaDescription:
      "Ropa deportiva de mujer en Buenos Aires: calzas, buzos y prendas técnicas para entrenar y moverte todo el día. Pedí por WhatsApp.",
  },
  URBANA: {
    slug: "urbano",
    label: "Urbano",
    moment: "Para la ciudad",
    description: "Remeras oversize, jeans y camperas para tu día a día porteño.",
    image: "/brand/foto-urbano.webp",
    tone: "bg-primary text-primary-foreground",
    title: "Ropa urbana de mujer",
    metaDescription:
      "Ropa urbana de mujer en Buenos Aires: remeras oversize, jeans y camperas para tu día a día. Pedí por WhatsApp, con envío o retiro.",
  },
  FORMAL: {
    slug: "formal",
    label: "Formal",
    moment: "Para cuando importa",
    description: "Blazers, camisas y sastrería para la oficina o la noche.",
    image: "/brand/foto-formal.webp",
    tone: "bg-white text-zinc-950",
    title: "Ropa formal de mujer",
    metaDescription:
      "Ropa formal de mujer en Buenos Aires: blazers, camisas y sastrería para la oficina o la noche. Pedí por WhatsApp, con envío o retiro.",
  },
};

export const lineValues = Object.keys(lines) as LineValue[];

export function lineFromSlug(slug: string | undefined): LineValue | undefined {
  return lineValues.find((l) => lines[l].slug === slug?.toLowerCase());
}

/** Acepta "Deportivo", "deportiva", "DEPORTIVA", "formal"… (para la importación desde Excel). */
export function parseLine(value: unknown): LineValue | null {
  const text = String(value ?? "").trim().toLowerCase();
  if (!text) return null;
  if (text.startsWith("deport")) return "DEPORTIVA";
  if (text.startsWith("urban")) return "URBANA";
  if (text.startsWith("formal")) return "FORMAL";
  return null;
}
