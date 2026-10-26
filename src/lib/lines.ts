// Colecciones de la marca: una para cada momento del día.
export type LineValue = "DEPORTIVA" | "URBANA" | "FORMAL";

export const lines: Record<
  LineValue,
  { slug: string; label: string; moment: string; description: string; image: string; tone: string }
> = {
  DEPORTIVA: {
    slug: "deportivo",
    label: "Deportivo",
    moment: "Para moverte",
    description: "Buzos, joggers y prendas técnicas para entrenar y andar todo el día.",
    image: "/brand/line-deportivo.webp",
    tone: "bg-[oklch(0.93_0.2_125)] text-zinc-950",
  },
  URBANA: {
    slug: "urbano",
    label: "Urbano",
    moment: "Para la ciudad",
    description: "Remeras oversize, jeans y camperas para el día a día porteño.",
    image: "/brand/line-urbano.webp",
    tone: "bg-primary text-primary-foreground",
  },
  FORMAL: {
    slug: "formal",
    label: "Formal",
    moment: "Para cuando importa",
    description: "Camisas, sastrería y básicos elegantes para la oficina o la noche.",
    image: "/brand/line-formal.webp",
    tone: "bg-zinc-900 text-white dark:bg-zinc-800",
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
