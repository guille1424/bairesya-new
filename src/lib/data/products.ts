import "server-only";
import { prisma } from "@/lib/prisma";
import { verifyStaff } from "@/lib/auth/dal";
import type { Prisma } from "@/generated/prisma/client";

export const PAGE_SIZE = 25;

export type ProductRow = {
  id: string;
  barcode: string;
  name: string;
  category: string | null;
  line: "DEPORTIVA" | "URBANA" | "FORMAL" | null;
  type: string | null;
  design: string | null;
  color: string | null;
  size: string | null;
  cost: number;
  priceNormal: number;
  priceTransfer: number;
  stock: number;
  supplierName: string | null;
  supplierAddress: string | null;
  isPublic: boolean;
  publicDescription: string | null;
  images: { url: string; pathname: string }[];
  updatedAt: string;
};

const productSelect = {
  id: true,
  barcode: true,
  name: true,
  category: true,
  line: true,
  type: true,
  design: true,
  color: true,
  size: true,
  cost: true,
  priceNormal: true,
  priceTransfer: true,
  stock: true,
  supplierName: true,
  supplierAddress: true,
  isPublic: true,
  publicDescription: true,
  updatedAt: true,
  images: { select: { url: true, pathname: true }, orderBy: { position: "asc" } },
} satisfies Prisma.ProductSelect;

type ProductRecord = Prisma.ProductGetPayload<{ select: typeof productSelect }>;

/** Convierte Decimal/Date a tipos planos. Oculta costo y proveedor a los empleados. */
function toRow(p: ProductRecord, canSeeCost: boolean): ProductRow {
  return {
    ...p,
    cost: canSeeCost ? Number(p.cost) : 0,
    supplierName: canSeeCost ? p.supplierName : null,
    supplierAddress: canSeeCost ? p.supplierAddress : null,
    priceNormal: Number(p.priceNormal),
    priceTransfer: Number(p.priceTransfer),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export type ProductQuery = {
  q?: string;
  category?: string;
  color?: string;
  size?: string;
  status?: "in_stock" | "out_of_stock" | "public" | "hidden";
  sort?: "name" | "-updated" | "stock" | "-stock" | "price" | "-price";
  page?: number;
};

const sorts: Record<NonNullable<ProductQuery["sort"]>, Prisma.ProductOrderByWithRelationInput> = {
  name: { name: "asc" },
  "-updated": { updatedAt: "desc" },
  stock: { stock: "asc" },
  "-stock": { stock: "desc" },
  price: { priceNormal: "asc" },
  "-price": { priceNormal: "desc" },
};

function whereFor(query: ProductQuery): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { deletedAt: null };
  if (query.q) {
    where.OR = [
      { name: { contains: query.q, mode: "insensitive" } },
      { barcode: { contains: query.q, mode: "insensitive" } },
      { category: { contains: query.q, mode: "insensitive" } },
    ];
  }
  if (query.category) where.category = query.category;
  if (query.color) where.color = query.color;
  if (query.size) where.size = query.size;
  if (query.status === "in_stock") where.stock = { gt: 0 };
  if (query.status === "out_of_stock") where.stock = { lte: 0 };
  if (query.status === "public") where.isPublic = true;
  if (query.status === "hidden") where.isPublic = false;
  return where;
}

export async function listProducts(query: ProductQuery) {
  const staff = await verifyStaff();
  const page = Math.max(1, query.page ?? 1);
  const where = whereFor(query);
  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      select: productSelect,
      orderBy: [sorts[query.sort ?? "name"], { id: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  return {
    products: products.map((p) => toRow(p, staff.role === "ADMIN")),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function getProductFilters() {
  await verifyStaff();
  const distinct = async (field: "category" | "color" | "size") => {
    const rows = await prisma.product.findMany({
      where: { deletedAt: null, [field]: { not: null } },
      distinct: [field],
      select: { [field]: true },
      orderBy: { [field]: "asc" },
    });
    return rows.map((r) => (r as unknown as Record<string, string | null>)[field]).filter((v): v is string => Boolean(v));
  };
  const [categories, colors, sizes] = await Promise.all([distinct("category"), distinct("color"), distinct("size")]);
  return { categories, colors, sizes };
}

export async function getProductsByIds(ids: string[]) {
  const staff = await verifyStaff();
  const products = await prisma.product.findMany({
    where: { id: { in: ids }, deletedAt: null },
    select: productSelect,
    orderBy: { name: "asc" },
  });
  return products.map((p) => toRow(p, staff.role === "ADMIN"));
}

export async function getInventorySummary() {
  await verifyStaff();
  const [active, outOfStock, isPublic] = await Promise.all([
    prisma.product.count({ where: { deletedAt: null } }),
    prisma.product.count({ where: { deletedAt: null, stock: { lte: 0 } } }),
    prisma.product.count({ where: { deletedAt: null, isPublic: true } }),
  ]);
  return { active, outOfStock, isPublic };
}
