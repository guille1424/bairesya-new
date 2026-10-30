// Direcciones y textos para buscadores, sin acceso a base de datos (testeables con Vitest).
import { modelKey } from "./import";

/** "Calza Térmica 3/4" → "calza-termica-3-4". */
export function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type Named = { barcode: string; name: string; color: string | null };

/** Parte legible de la dirección: nombre y color, sin repetir el color si ya está en el nombre. */
export function productSlug({ name, color }: Pick<Named, "name" | "color">) {
  const base = slugify(name);
  const tone = color ? slugify(color) : "";
  return tone && !`-${base}-`.includes(`-${tone}-`) ? [base, tone].filter(Boolean).join("-") : base;
}

/** /producto/01000302M/calza-mia-negro. El código identifica la prenda; el resto es para personas y buscadores. */
export function productPath(product: Named) {
  const slug = productSlug(product);
  return `/producto/${encodeURIComponent(product.barcode)}${slug ? `/${slug}` : ""}`;
}

/** Nombre con el color, como se busca: "Calza Mia Negro". */
export function productTitle({ name, color }: Pick<Named, "name" | "color">) {
  return color && !slugify(name).includes(slugify(color)) ? `${name} ${color}` : name;
}

/** Mismo modelo (nombre) y color: los talles se muestran en una sola página. */
export function variantGroupKey({ name, color }: Pick<Named, "name" | "color">) {
  return `${modelKey(name)}|${(color ?? "").trim().toLowerCase()}`;
}

/**
 * Una página principal por modelo y color (la variante de menor código), para que los talles no
 * compitan entre sí en Google. El código no cambia con el stock, así que la elección es estable.
 */
export function canonicalVariants<T extends Named>(products: T[]): T[] {
  const main = new Map<string, T>();
  for (const product of products) {
    const key = variantGroupKey(product);
    const current = main.get(key);
    if (!current || product.barcode < current.barcode) main.set(key, product);
  }
  return [...main.values()];
}

/** Categorías cargadas en mayúsculas ("CALZAS") se muestran como "Calzas". */
export function displayCategory(category: string) {
  return category === category.toUpperCase() ? category.charAt(0) + category.slice(1).toLowerCase() : category;
}

export function categoryPath(category: string) {
  return `/categoria/${slugify(category)}`;
}

export function findCategoryBySlug(categories: string[], slug: string) {
  return categories.find((c) => slugify(c) === slug.toLowerCase());
}
