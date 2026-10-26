// Carga (o quita con --remove) el catálogo de muestra de prisma/demo/catalog.json.
// Los productos usan códigos DEMO-* y las fotos (Pexels) están en public/catalogo.
import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

type Catalog = {
  suppliers: Record<string, [string, string]>;
  models: {
    code: string;
    name: string;
    category: string;
    line: "DEPORTIVA" | "URBANA" | "FORMAL";
    type: string;
    price: number;
    cost: number;
    supplier: string;
    description: string;
    variants: { color: string; sizes: Record<string, number> }[];
  }[];
};

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

async function remove() {
  const { count } = await prisma.product.deleteMany({ where: { barcode: { startsWith: "DEMO-" } } });
  console.log(`Se quitaron ${count} productos de muestra.`);
}

async function load() {
  const catalog: Catalog = JSON.parse(readFileSync(new URL("./demo/catalog.json", import.meta.url), "utf8"));
  let rows = 0;
  const loaded: string[] = [];
  // Fechas escalonadas para que "Más nuevos" tenga un orden natural.
  const base = Date.now() - catalog.models.length * 60_000;

  for (const [index, model] of catalog.models.entries()) {
    const [supplierName, supplierAddress] = catalog.suppliers[model.supplier];
    for (const variant of model.variants) {
      const file = `${model.code}-${slug(model.name)}-${slug(variant.color)}.webp`;
      for (const [size, stock] of Object.entries(variant.sizes)) {
        const barcode = `DEMO-${model.code}-${slug(variant.color).slice(0, 3).toUpperCase()}-${slug(size).toUpperCase()}`;
        const data = {
          name: model.name,
          category: model.category,
          line: model.line,
          type: model.type,
          color: variant.color,
          size,
          cost: model.cost,
          priceNormal: model.price,
          priceTransfer: Math.round((model.price * 0.9) / 100) * 100,
          stock,
          supplierName,
          supplierAddress,
          isPublic: true,
          publicDescription: model.description,
          deletedAt: null,
          createdAt: new Date(base + index * 60_000),
        };
        const product = await prisma.product.upsert({
          where: { barcode },
          create: { barcode, ...data },
          update: data,
        });
        await prisma.productImage.deleteMany({ where: { productId: product.id } });
        await prisma.productImage.create({
          data: { productId: product.id, url: `/catalogo/${file}`, pathname: `catalogo/${file}`, position: 0 },
        });
        loaded.push(barcode);
        rows++;
      }
    }
  }
  // Variantes de muestra que ya no están en el catálogo (por ejemplo, colores cambiados).
  const { count: removed } = await prisma.product.deleteMany({
    where: { barcode: { startsWith: "DEMO-", notIn: loaded } },
  });
  if (removed) console.log(`Se quitaron ${removed} variantes de muestra que ya no están en el catálogo.`);
  console.log(`Catálogo de muestra listo: ${catalog.models.length} modelos, ${rows} productos (talle/color).`);
}

(process.argv.includes("--remove") ? remove() : load())
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
