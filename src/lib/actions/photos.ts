"use server";

import { del } from "@vercel/blob";
import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertStaff } from "@/lib/auth/dal";
import { MAX_PHOTO_BYTES, PHOTO_FOLDER, matchPhotos, parsePhotoName, photoPathname } from "@/lib/domain/photos";
import { attachPhotos } from "@/lib/services/photo-attach";
import { toActionError } from "./utils";
import type { ActionState } from "./types";

const MAX_FILES = 2000;

export type PhotoPlanRow = {
  index: number;
  name: string;
  status: "match" | "new" | "invalid" | "duplicate" | "too_big";
  pathname?: string;
  position?: number;
  product?: string;
};

export type PhotoPlan = ActionState & { rows?: PhotoPlanRow[] };

const filesSchema = z.array(z.object({ name: z.string().max(255), size: z.number().nonnegative() })).max(MAX_FILES);

/** Vista previa de la subida masiva: a qué producto va cada archivo de la carpeta. */
export async function planPhotoUpload(input: unknown): Promise<PhotoPlan> {
  try {
    await assertStaff();
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return { error: "Falta configurar Vercel Blob (BLOB_READ_WRITE_TOKEN) para subir fotos." };
    }
    const parsed = filesSchema.safeParse(input);
    if (!parsed.success) return { error: `Elegí una carpeta con hasta ${MAX_FILES} archivos.` };

    const files = parsed.data.map((f, index) => ({ ...f, index }));
    const codes = [...new Set(files.map((f) => parsePhotoName(f.name)?.code).filter((c): c is string => Boolean(c)))];
    const products = codes.length
      ? await prisma.product.findMany({
          where: { deletedAt: null, OR: codes.map((code) => ({ barcode: { equals: code, mode: "insensitive" } })) },
          select: { barcode: true, name: true, size: true, color: true },
        })
      : [];
    const byBarcode = new Map(products.map((p) => [p.barcode, p]));

    const fitting = files.filter((f) => f.size <= MAX_PHOTO_BYTES);
    const { matched, unmatched, invalid, duplicates } = matchPhotos(fitting, products.map((p) => p.barcode));
    const rows: PhotoPlanRow[] = [
      ...[...matched.values()].flat().map((f): PhotoPlanRow => {
        const p = byBarcode.get(f.barcode)!;
        const variant = [p.size, p.color].filter(Boolean).join(" · ");
        return {
          index: f.index,
          name: f.name,
          status: "match",
          pathname: photoPathname(f.barcode, f.position, f.ext),
          position: f.position,
          product: variant ? `${p.name} (${variant})` : p.name,
        };
      }),
      ...unmatched.map((f): PhotoPlanRow => {
        const { position, ext } = parsePhotoName(f.name)!;
        return { index: f.index, name: f.name, status: "new", pathname: photoPathname(f.code, position, ext), position };
      }),
      ...duplicates.map((f): PhotoPlanRow => ({ index: f.index, name: f.name, status: "duplicate" })),
      ...files
        .filter((f) => f.size > MAX_PHOTO_BYTES && parsePhotoName(f.name))
        .map((f): PhotoPlanRow => ({ index: f.index, name: f.name, status: "too_big" })),
      ...invalid.map((f): PhotoPlanRow => ({ index: f.index, name: f.name, status: "invalid" })),
    ];
    return { ok: true, rows };
  } catch (err) {
    return toActionError(err);
  }
}

const uploadedSchema = z
  .array(
    z.object({
      pathname: z.string().startsWith(PHOTO_FOLDER),
      url: z.url().refine((u) => new URL(u).hostname.endsWith(".public.blob.vercel-storage.com")),
    }),
  )
  .min(1)
  .max(MAX_FILES);

/** Vincula a sus productos las fotos que el navegador ya subió a Blob. */
export async function attachUploadedPhotos(input: unknown): Promise<ActionState> {
  try {
    await assertStaff();
    const parsed = uploadedSchema.safeParse(input);
    if (!parsed.success) return { error: "No se pudieron vincular las fotos. Probá de nuevo." };

    const uploaded = parsed.data.map((u) => ({ ...u, name: u.pathname.slice(PHOTO_FOLDER.length) }));
    const codes = [...new Set(uploaded.map((u) => parsePhotoName(u.name)?.code).filter((c): c is string => Boolean(c)))];
    const products = await prisma.product.findMany({
      where: { deletedAt: null, barcode: { in: codes } },
      select: { barcode: true },
    });
    const { matched } = matchPhotos(uploaded, products.map((p) => p.barcode));
    const { products: count, orphans } = await attachPhotos(prisma, [...matched.values()].flat());
    if (orphans.length) await del(orphans).catch((err) => console.error("No se pudieron borrar fotos reemplazadas", err));

    updateTag("catalog");
    refresh();
    const pending = uploaded.length - [...matched.values()].flat().length;
    return {
      ok: true,
      message:
        `Se subieron ${uploaded.length} fotos y se actualizaron ${count} productos.` +
        (pending ? ` ${pending} quedan guardadas hasta que se carguen sus productos.` : ""),
    };
  } catch (err) {
    return toActionError(err);
  }
}
