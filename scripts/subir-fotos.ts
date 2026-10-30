// Sube en masa las fotos de una carpeta a Vercel Blob (carpeta productos/) y las vincula a los productos.
// Cada archivo se llama como el código de barras (columna F del Excel): 01000602M.jpg es la portada y
// 01000602M_2.jpg … _8 las fotos siguientes. Una foto con el mismo nombre reemplaza a la anterior.
//
//   npm run fotos -- <carpeta>            sube y vincula
//   npm run fotos -- <carpeta> --probar   muestra qué haría, sin subir ni cambiar nada
//
// Las fotos de códigos que todavía no están cargados se suben igual y se vinculan al importar el Excel.
import "dotenv/config";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { del, put } from "@vercel/blob";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { matchPhotos, parsePhotoName, photoPathname } from "../src/lib/domain/photos";
import { attachPhotos } from "../src/lib/services/photo-attach";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};
const CONCURRENCY = 4;

type Upload = { name: string; file: string; pathname: string; position: number; barcode?: string };
type Uploaded = Upload & { url: string };

async function runPool<T>(items: T[], worker: (item: T) => Promise<void>) {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
      for (let item = queue.shift(); item; item = queue.shift()) await worker(item);
    }),
  );
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--probar");
  const dir = args.find((a) => !a.startsWith("--"));
  if (!dir) {
    console.error("Uso: npm run fotos -- <carpeta> [--probar]");
    process.exit(1);
  }
  if (!dryRun && !process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("Falta BLOB_READ_WRITE_TOKEN en .env (Vercel → Storage → Blob → token de lectura/escritura).");
    process.exit(1);
  }

  const folder = path.resolve(dir);
  const files = readdirSync(folder, { withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => ({ name: e.name, file: path.join(folder, e.name) }));

  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    select: { barcode: true, name: true, size: true, color: true, _count: { select: { images: true } } },
  });
  const byBarcode = new Map(products.map((p) => [p.barcode, p]));
  const { matched, unmatched, invalid, duplicates } = matchPhotos(files, products.map((p) => p.barcode));

  console.log(`${dryRun ? "[PRUEBA] " : ""}Carpeta ${folder}: ${files.length} archivos\n`);

  const uploads: Upload[] = [];
  for (const [barcode, photos] of matched) {
    const p = byBarcode.get(barcode)!;
    const variant = [p.size, p.color].filter(Boolean).join(" · ");
    for (const photo of photos) {
      uploads.push({ ...photo, pathname: photoPathname(barcode, photo.position, photo.ext) });
      const which = photo.position === 0 ? "portada" : `foto ${photo.position + 1}`;
      console.log(`  ✓ ${photo.name} → ${p.name}${variant ? ` (${variant})` : ""}, ${which}`);
    }
  }
  for (const photo of unmatched) {
    const { position, ext } = parsePhotoName(photo.name)!;
    uploads.push({ ...photo, position, pathname: photoPathname(photo.code, position, ext) });
    console.log(`  ⚠ ${photo.name}: no hay producto con código ${photo.code}. Se sube y se vincula al importar el Excel.`);
  }
  for (const f of invalid) console.log(`  ✗ ${f.name}: se ignora (el nombre tiene que ser <código>.jpg o <código>_2.jpg)`);
  for (const f of duplicates) console.log(`  ✗ ${f.name}: se ignora (ya hay otro archivo para esa foto del producto)`);

  const uploaded = new Map<string, Uploaded>();
  const failed: string[] = [];
  if (!dryRun) {
    console.log(`\nSubiendo ${uploads.length} fotos…`);
    await runPool(uploads, async (u) => {
      try {
        const ext = path.extname(u.pathname).slice(1);
        const blob = await put(u.pathname, readFileSync(u.file), {
          access: "public",
          addRandomSuffix: false,
          allowOverwrite: true,
          contentType: CONTENT_TYPES[ext],
        });
        uploaded.set(u.name, { ...u, url: blob.url, pathname: blob.pathname });
      } catch (err) {
        failed.push(u.name);
        console.error(`  ✗ ${u.name}: no se pudo subir (${err instanceof Error ? err.message : err})`);
      }
    });

    const { orphans } = await attachPhotos(
      prisma,
      [...uploaded.values()].filter((u): u is Uploaded & { barcode: string } => Boolean(u.barcode)),
    );
    if (orphans.length) await del(orphans).catch((err) => console.error("No se pudieron borrar fotos reemplazadas", err));
  }

  const withoutPhotos = products.filter((p) => p._count.images === 0 && !matched.has(p.barcode));
  const verb = dryRun ? "se subirían" : "subidas";
  console.log(
    `\nResumen: ${dryRun ? uploads.length : uploaded.size} fotos ${verb}, ${matched.size} productos con fotos nuevas, ` +
      `${unmatched.length} sin producto todavía, ${invalid.length + duplicates.length} ignoradas` +
      (failed.length ? `, ${failed.length} con error` : "") +
      ".",
  );
  if (withoutPhotos.length) {
    const sample = withoutPhotos.slice(0, 10).map((p) => p.barcode).join(", ");
    console.log(`Quedan ${withoutPhotos.length} productos sin foto (la tienda muestra el logo): ${sample}${withoutPhotos.length > 10 ? "…" : ""}`);
  }
  if (!dryRun && uploaded.size) console.log("La tienda se actualiza en unos minutos.");
  if (failed.length) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
