"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertStaff } from "@/lib/auth/dal";
import { importRowSchema, readImportFile, type ImportRow } from "@/lib/import";
import { toActionError } from "./utils";
import type { ActionState } from "./types";

export type PreviewRow = {
  row: number;
  status: "create" | "update" | "error";
  errors: string[];
  data: ImportRow | null;
  barcode: string;
  name: string;
};

export type PreviewResult = ActionState & {
  sheet?: string;
  rows?: PreviewRow[];
  summary?: { create: number; update: number; error: number };
};

const MAX_ROWS = 2000;

export async function previewImport(_prev: PreviewResult, formData: FormData): Promise<PreviewResult> {
  try {
    await assertStaff();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) return { error: "Elegí un archivo .xlsx." };
    if (!file.name.toLowerCase().endsWith(".xlsx")) return { error: "El archivo tiene que ser .xlsx (Excel)." };

    const parsed = await readImportFile(await file.arrayBuffer());
    if (!parsed) return { error: 'No se encontraron las columnas "barcode" y "name" en el archivo.' };
    if (parsed.rows.length === 0) return { error: "El archivo no tiene filas con productos." };
    if (parsed.rows.length > MAX_ROWS) return { error: `Máximo ${MAX_ROWS} filas por archivo.` };

    const seen = new Map<string, number>();
    const rows: PreviewRow[] = parsed.rows.map(({ row, raw }) => {
      const result = importRowSchema.safeParse(raw);
      const barcode = String(raw.barcode ?? "").trim();
      const name = String(raw.name ?? "").trim();
      const errors = result.success ? [] : result.error.issues.map((i) => i.message);
      if (barcode && seen.has(barcode)) errors.push(`Código repetido (fila ${seen.get(barcode)})`);
      if (barcode) seen.set(barcode, row);
      return { row, barcode, name, errors, data: result.success ? result.data : null, status: errors.length ? "error" : "create" };
    });

    const existing = await prisma.product.findMany({
      where: { barcode: { in: rows.filter((r) => r.status !== "error").map((r) => r.barcode) }, deletedAt: null },
      select: { barcode: true },
    });
    const existingSet = new Set(existing.map((e) => e.barcode));
    for (const r of rows) if (r.status === "create" && existingSet.has(r.barcode)) r.status = "update";

    const summary = { create: 0, update: 0, error: 0 };
    for (const r of rows) summary[r.status]++;
    return { ok: true, sheet: parsed.sheet, rows, summary };
  } catch (err) {
    return toActionError(err);
  }
}

export async function applyImport(rows: unknown): Promise<ActionState> {
  try {
    await assertStaff();
    const parsed = z.array(importRowSchema).min(1).max(MAX_ROWS).safeParse(rows);
    if (!parsed.success) return { error: "Los datos a importar no son válidos. Volvé a cargar el archivo." };

    let created = 0;
    let updated = 0;
    await prisma.$transaction(
      async (tx) => {
        for (const { price, ...row } of parsed.data) {
          const data = { ...row, cost: price, deletedAt: null };
          const existing = await tx.product.findUnique({ where: { barcode: row.barcode }, select: { deletedAt: true } });
          await tx.product.upsert({ where: { barcode: row.barcode }, create: data, update: data });
          if (existing && !existing.deletedAt) updated++;
          else created++;
        }
      },
      { timeout: 60_000, maxWait: 10_000 },
    );

    updateTag("catalog");
    refresh();
    return { ok: true, message: `Importación lista: ${created} productos nuevos y ${updated} actualizados.` };
  } catch (err) {
    return toActionError(err);
  }
}
