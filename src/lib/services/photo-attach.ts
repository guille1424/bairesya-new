// Sin "server-only": lo usan la subida masiva del panel y el script scripts/subir-fotos.ts.
import type { PrismaClient } from "@/generated/prisma/client";
import { PHOTO_FOLDER } from "@/lib/domain/photos";

export type AttachPhoto = { barcode: string; url: string; pathname: string; position: number };

/**
 * Vincula fotos ya subidas a Blob con sus productos. Cada foto reemplaza a la que el producto tenía
 * en esa posición; las demás se conservan. Devuelve las fotos reemplazadas que hay que borrar de Blob.
 */
export async function attachPhotos(db: PrismaClient, photos: AttachPhoto[]) {
  const byBarcode = new Map<string, AttachPhoto[]>();
  for (const p of photos) byBarcode.set(p.barcode, [...(byBarcode.get(p.barcode) ?? []), p]);

  const products = await db.product.findMany({
    where: { barcode: { in: [...byBarcode.keys()] }, deletedAt: null },
    select: { id: true, barcode: true, images: { select: { id: true, position: true, pathname: true } } },
  });

  // ?v= evita que el navegador muestre la foto anterior cuando se reemplaza.
  const version = Date.now().toString(36);
  const orphans: string[] = [];
  for (const product of products) {
    const added = byBarcode.get(product.barcode)!;
    const slots = new Set(added.map((p) => p.position));
    const replaced = product.images.filter((i) => slots.has(i.position));
    await db.$transaction([
      db.productImage.deleteMany({ where: { id: { in: replaced.map((i) => i.id) } } }),
      db.productImage.createMany({
        data: added.map((p) => ({
          productId: product.id,
          url: `${p.url.split("?")[0]}?v=${version}`,
          pathname: p.pathname,
          position: p.position,
        })),
      }),
    ]);
    const kept = new Set(added.map((p) => p.pathname));
    orphans.push(...replaced.map((i) => i.pathname).filter((p) => p.startsWith(PHOTO_FOLDER) && !kept.has(p)));
  }
  return { products: products.length, orphans };
}
