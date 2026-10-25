"use server";

import { del } from "@vercel/blob";
import { refresh, updateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertStaff } from "@/lib/auth/dal";
import { productSchema } from "@/lib/validators/products";
import { fieldErrors, toActionError } from "./utils";
import type { ActionState } from "./types";

async function deleteBlobs(all: string[]) {
  // Solo las subidas a Blob; las imágenes de muestra (public/demo) son archivos del sitio.
  const pathnames = all.filter((p) => p.startsWith("productos/"));
  if (pathnames.length === 0 || !process.env.BLOB_READ_WRITE_TOKEN) return;
  try {
    await del(pathnames);
  } catch (err) {
    console.error("No se pudieron borrar imágenes de Blob", err);
  }
}

export async function saveProduct(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const staff = await assertStaff();
    const parsed = productSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return fieldErrors(parsed.error);
    const { id, images, ...data } = parsed.data;

    // Los empleados no ven ni editan costo/proveedor: se conservan los valores actuales.
    const isAdmin = staff.role === "ADMIN";
    const existing = id
      ? await prisma.product.findUnique({ where: { id }, include: { images: true } })
      : null;
    if (id && !existing) return { error: "El producto ya no existe." };

    const sameBarcode = await prisma.product.findUnique({ where: { barcode: data.barcode } });
    if (sameBarcode && sameBarcode.id !== id && !sameBarcode.deletedAt) {
      return { fieldErrors: { barcode: ["Ya existe otro producto con este código."] } };
    }

    const values = {
      ...data,
      ...(isAdmin
        ? {}
        : {
            cost: existing?.cost ?? 0,
            supplierName: existing?.supplierName ?? null,
            supplierAddress: existing?.supplierAddress ?? null,
          }),
      deletedAt: null,
      images: {
        deleteMany: {},
        create: images.map((img, position) => ({ ...img, position })),
      },
    };

    // Un código que pertenecía a un producto eliminado se reutiliza restaurando ese registro.
    const targetId = existing?.id ?? (sameBarcode?.deletedAt ? sameBarcode.id : undefined);
    const previousImages = targetId
      ? await prisma.productImage.findMany({ where: { productId: targetId }, select: { pathname: true } })
      : [];

    const product = targetId
      ? await prisma.product.update({ where: { id: targetId }, data: values })
      : await prisma.product.create({ data: { ...values, images: { create: values.images.create } } });

    const kept = new Set(images.map((i) => i.pathname));
    await deleteBlobs(previousImages.map((i) => i.pathname).filter((p) => !kept.has(p)));

    updateTag("catalog");
    refresh();
    return { ok: true, message: existing ? `"${product.name}" actualizado.` : `"${product.name}" creado.` };
  } catch (err) {
    return toActionError(err);
  }
}

export async function deleteProduct(id: string): Promise<ActionState> {
  try {
    await assertStaff();
    const product = await prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), isPublic: false },
      select: { name: true },
    });
    updateTag("catalog");
    refresh();
    return { ok: true, message: `"${product.name}" eliminado.` };
  } catch (err) {
    return toActionError(err);
  }
}

export async function setProductPublic(id: string, isPublic: boolean): Promise<ActionState> {
  try {
    await assertStaff();
    await prisma.product.update({ where: { id }, data: { isPublic } });
    updateTag("catalog");
    refresh();
    return { ok: true };
  } catch (err) {
    return toActionError(err);
  }
}

/** Sugiere un código interno libre (prefijo BY + número correlativo). */
export async function suggestBarcode(): Promise<string> {
  await assertStaff();
  const last = await prisma.product.findFirst({
    where: { barcode: { startsWith: "BY" } },
    orderBy: { barcode: "desc" },
    select: { barcode: true },
  });
  const next = (Number(last?.barcode.slice(2)) || 0) + 1;
  return `BY${String(next).padStart(6, "0")}`;
}
