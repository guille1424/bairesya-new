import "server-only";
import { list } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { PHOTO_FOLDER, matchPhotos } from "@/lib/domain/photos";

/**
 * Busca en Blob las fotos ya subidas con el script (productos/<código>.jpg) de los productos
 * que todavía no tienen ninguna, y las vincula. Devuelve cuántos productos quedaron con fotos.
 */
export async function linkUploadedPhotos(barcodes: string[]) {
  if (!process.env.BLOB_READ_WRITE_TOKEN || barcodes.length === 0) return 0;
  const products = await prisma.product.findMany({
    where: { barcode: { in: barcodes }, deletedAt: null, images: { none: {} } },
    select: { id: true, barcode: true },
  });
  if (products.length === 0) return 0;

  const blobs: { name: string; url: string; pathname: string; uploadedAt: Date }[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: PHOTO_FOLDER, cursor, limit: 1000 });
    blobs.push(...page.blobs.map((b) => ({ ...b, name: b.pathname.slice(PHOTO_FOLDER.length) })));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  const { matched } = matchPhotos(blobs, products.map((p) => p.barcode));
  const data = products.flatMap((p) =>
    (matched.get(p.barcode) ?? []).map((photo) => ({
      productId: p.id,
      // ?v= evita que el navegador muestre una versión anterior si la foto se reemplazó.
      url: `${photo.url}?v=${photo.uploadedAt.getTime().toString(36)}`,
      pathname: photo.pathname,
      position: photo.position,
    })),
  );
  if (data.length) await prisma.productImage.createMany({ data });
  return new Set(data.map((d) => d.productId)).size;
}
