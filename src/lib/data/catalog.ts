// Catálogo público. Nunca expone costo, proveedor ni precio de transferencia.
import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { webReservations } from "@/lib/services/orders";
import { availableForWeb } from "@/lib/domain/orders";
import type { Prisma } from "@/generated/prisma/client";

export const CATALOG_PAGE_SIZE = 24;

export type CatalogProduct = {
  id: string;
  barcode: string;
  name: string;
  category: string | null;
  size: string | null;
  color: string | null;
  price: number;
  available: number;
  image: string | null;
  /** Talles/colores publicados del mismo modelo (en el listado se agrupa por nombre). */
  sizes: string[];
  colors: string[];
  priceVaries?: boolean;
};

const publicWhere: Prisma.ProductWhereInput = { deletedAt: null, isPublic: true };

const cardSelect = {
  id: true,
  barcode: true,
  name: true,
  category: true,
  size: true,
  color: true,
  priceNormal: true,
  stock: true,
  images: { select: { url: true }, orderBy: { position: "asc" }, take: 1 },
} satisfies Prisma.ProductSelect;

async function withAvailability(products: Prisma.ProductGetPayload<{ select: typeof cardSelect }>[]): Promise<CatalogProduct[]> {
  const reserved = await webReservations(products.map((p) => p.id));
  return products.map((p) => ({
    id: p.id,
    barcode: p.barcode,
    name: p.name,
    category: p.category,
    size: p.size,
    color: p.color,
    price: Number(p.priceNormal),
    available: availableForWeb(p.stock, reserved.get(p.id) ?? 0),
    image: p.images[0]?.url ?? null,
    sizes: p.size ? [p.size] : [],
    colors: p.color ? [p.color] : [],
  }));
}

/**
 * Agrupa variantes (mismo nombre, distinto talle/color) en una sola tarjeta.
 * La tarjeta enlaza a la variante con stock y foto, muestra el precio más bajo y suma el disponible.
 */
function groupModels(items: CatalogProduct[]) {
  const groups = new Map<string, CatalogProduct[]>();
  for (const item of items) {
    const key = item.name.trim().toLowerCase();
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups.values()].map((variants) => {
    const best = [...variants].sort(
      (a, b) => Number(b.available > 0) - Number(a.available > 0) || Number(!!b.image) - Number(!!a.image),
    )[0];
    const uniq = (values: string[]) => [...new Set(values)];
    return {
      ...best,
      image: best.image ?? variants.find((v) => v.image)?.image ?? null,
      price: Math.min(...variants.map((v) => v.price)),
      priceVaries: new Set(variants.map((v) => v.price)).size > 1,
      available: variants.reduce((s, v) => s + v.available, 0),
      sizes: uniq(variants.flatMap((v) => v.sizes)),
      colors: uniq(variants.flatMap((v) => v.colors)),
    };
  });
}

export type CatalogQuery = {
  q?: string;
  category?: string;
  size?: string;
  color?: string;
  sort?: "new" | "price" | "-price";
  page?: number;
};

export async function getCatalog(query: CatalogQuery) {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");

  const page = Math.max(1, query.page ?? 1);
  const where: Prisma.ProductWhereInput = { ...publicWhere };
  if (query.q) {
    where.OR = [
      { name: { contains: query.q, mode: "insensitive" } },
      { category: { contains: query.q, mode: "insensitive" } },
      { color: { contains: query.q, mode: "insensitive" } },
    ];
  }
  if (query.category) where.category = query.category;
  if (query.size) where.size = query.size;
  if (query.color) where.color = query.color;

  // Se pagina por modelo (nombre), no por variante.
  const models = await prisma.product.groupBy({
    by: ["name"],
    where,
    _min: { priceNormal: true },
    _max: { createdAt: true },
  });
  models.sort((a, b) => {
    if (query.sort === "price") return Number(a._min.priceNormal) - Number(b._min.priceNormal);
    if (query.sort === "-price") return Number(b._min.priceNormal) - Number(a._min.priceNormal);
    return (b._max.createdAt?.getTime() ?? 0) - (a._max.createdAt?.getTime() ?? 0);
  });
  const total = models.length;
  const names = models.slice((page - 1) * CATALOG_PAGE_SIZE, page * CATALOG_PAGE_SIZE).map((m) => m.name);

  const variants = await prisma.product.findMany({
    where: { ...where, name: { in: names } },
    select: cardSelect,
    orderBy: [{ size: "asc" }, { id: "asc" }],
  });
  const grouped = groupModels(await withAvailability(variants));
  const order = new Map(names.map((n, i) => [n.trim().toLowerCase(), i]));
  grouped.sort((a, b) => (order.get(a.name.trim().toLowerCase()) ?? 0) - (order.get(b.name.trim().toLowerCase()) ?? 0));

  return {
    products: grouped,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE)),
  };
}

export async function getCatalogFilters() {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");

  const distinct = async (field: "category" | "size" | "color") => {
    const rows = await prisma.product.findMany({
      where: { ...publicWhere, [field]: { not: null } },
      distinct: [field],
      select: { [field]: true },
      orderBy: { [field]: "asc" },
    });
    return rows.map((r) => (r as unknown as Record<string, string | null>)[field]).filter((v): v is string => Boolean(v));
  };
  const [categories, sizes, colors] = await Promise.all([distinct("category"), distinct("size"), distinct("color")]);
  return { categories, sizes, colors };
}

export type ProductDetail = CatalogProduct & {
  description: string | null;
  type: string | null;
  design: string | null;
  images: string[];
  /** Mismo modelo en otros talles/colores (productos con el mismo nombre). */
  variants: { barcode: string; size: string | null; color: string | null; available: number }[];
};

export async function getPublicProduct(barcode: string): Promise<ProductDetail | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");

  const product = await prisma.product.findFirst({
    where: { ...publicWhere, barcode },
    select: {
      ...cardSelect,
      type: true,
      design: true,
      publicDescription: true,
      images: { select: { url: true }, orderBy: { position: "asc" } },
    },
  });
  if (!product) return null;

  const siblings = await prisma.product.findMany({
    where: { ...publicWhere, name: { equals: product.name, mode: "insensitive" } },
    select: cardSelect,
    orderBy: [{ size: "asc" }, { color: "asc" }],
  });
  const [main] = await withAvailability([{ ...product, images: product.images.slice(0, 1) }]);
  const variants = await withAvailability(siblings);

  return {
    ...main,
    description: product.publicDescription,
    type: product.type,
    design: product.design,
    images: product.images.map((i) => i.url),
    variants: variants.map((v) => ({ barcode: v.barcode, size: v.size, color: v.color, available: v.available })),
  };
}

export async function getRelatedProducts(category: string | null, excludeName: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");

  const products = await prisma.product.findMany({
    where: {
      ...publicWhere,
      ...(category ? { category } : {}),
      NOT: { name: { equals: excludeName, mode: "insensitive" } },
    },
    select: cardSelect,
    orderBy: { createdAt: "desc" },
    take: 4,
  });
  return withAvailability(products);
}

export async function getSitemapProducts() {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");
  return prisma.product.findMany({ where: publicWhere, select: { barcode: true, updatedAt: true } });
}
