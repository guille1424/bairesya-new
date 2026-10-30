import "server-only";
import ExcelJS from "exceljs";
import { z } from "zod";
import { parseLine } from "@/lib/lines";
import { parseYesNo } from "@/lib/domain/import";

/**
 * Columnas de la plantilla (mismos nombres que la app anterior). "price" es el costo.
 * Una columna que no está en el archivo no modifica ese dato de los productos existentes.
 */
const COLUMNS = [
  "barcode",
  "name",
  "category",
  "line",
  "type",
  "design",
  "color",
  "size",
  "price",
  "priceNormal",
  "priceTransfer",
  "stock",
  "supplierName",
  "supplierAddress",
  "isPublic",
  "publicDescription",
] as const;
type Column = (typeof COLUMNS)[number];

const text = z.unknown().transform((v) => {
  if (v === undefined) return undefined;
  return (v === null ? "" : String(v).trim()) || null;
});
const number = (label: string) =>
  z.unknown().transform((v, ctx) => {
    if (v === undefined) return undefined;
    if (v === null || v === "") return 0;
    const n = typeof v === "number" ? v : Number(String(v).replace(/\$|\s/g, "").replace(",", "."));
    if (!Number.isFinite(n) || n < 0) {
      ctx.addIssue({ code: "custom", message: `${label} inválido` });
      return z.NEVER;
    }
    return n;
  });

export const importRowSchema = z.object({
  barcode: z
    .unknown()
    .transform((v) => String(v ?? "").trim())
    .pipe(z.string().min(1, "Falta el código").max(64)),
  name: z
    .unknown()
    .transform((v) => String(v ?? "").trim())
    .pipe(z.string().min(1, "Falta el nombre").max(160)),
  category: text,
  line: z.unknown().transform((v, ctx) => {
    if (v === undefined) return undefined;
    if (v === null || String(v).trim() === "") return null;
    const line = parseLine(v);
    if (!line) ctx.addIssue({ code: "custom", message: "Colección inválida (Deportivo, Urbano o Formal)" });
    return line;
  }),
  type: text,
  design: text,
  color: text,
  size: text,
  price: number("Costo"),
  priceNormal: number("Precio efectivo"),
  priceTransfer: number("Precio transferencia"),
  stock: number("Stock").pipe(z.number().int("El stock debe ser entero").optional()),
  supplierName: text,
  supplierAddress: text,
  // Vacías = sin dato: toman las de otra fila del mismo modelo (ver fillModelFields) o no se modifican.
  isPublic: z.unknown().transform((v, ctx) => {
    const value = parseYesNo(v);
    if (value === null) {
      ctx.addIssue({ code: "custom", message: "Publicar inválido (Sí o No)" });
      return z.NEVER;
    }
    return value;
  }),
  publicDescription: z
    .unknown()
    .transform((v) => (v === null || v === undefined ? "" : String(v).trim()))
    .pipe(z.string().max(2000, "La descripción supera los 2000 caracteres"))
    .transform((v) => v || undefined),
});

export type ImportRow = z.infer<typeof importRowSchema>;

function cellValue(cell: ExcelJS.Cell): unknown {
  const v = cell.value;
  if (v === null || v === undefined) return null;
  if (typeof v === "object") {
    if (v instanceof Date) return v.toISOString();
    // Fórmula: usar el valor calculado (no hay si el archivo nunca se abrió y guardó en Excel).
    if ("formula" in v || "sharedFormula" in v || "result" in v) return ("result" in v ? v.result : null) ?? null;
    if ("richText" in v) return v.richText.map((t) => t.text).join("");
    if ("text" in v) return v.text;
    if ("error" in v) return null;
  }
  return v;
}

/** Lee la primera hoja que tenga encabezados "barcode" y "name". */
export async function readImportFile(buffer: ArrayBuffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  for (const sheet of workbook.worksheets) {
    for (let headerRow = 1; headerRow <= 5; headerRow++) {
      const indexes = new Map<Column, number>();
      sheet.getRow(headerRow).eachCell((cell, col) => {
        const key = String(cellValue(cell) ?? "").trim();
        const match = COLUMNS.find((c) => c.toLowerCase() === key.toLowerCase());
        if (match) indexes.set(match, col);
      });
      if (!indexes.has("barcode") || !indexes.has("name")) continue;

      const rows: { row: number; raw: Record<Column, unknown> }[] = [];
      for (let r = headerRow + 1; r <= sheet.rowCount; r++) {
        const row = sheet.getRow(r);
        // Las columnas que faltan quedan undefined para no pisar esos datos.
        const raw = Object.fromEntries(
          COLUMNS.map((c) => [c, indexes.has(c) ? cellValue(row.getCell(indexes.get(c)!)) : undefined]),
        ) as Record<Column, unknown>;
        // Filas vacías (o con fórmulas que no devuelven nada) se ignoran, como antes.
        const empty = (v: unknown) => v === null || v === undefined || String(v).trim() === "";
        if (empty(raw.barcode) && empty(raw.name)) continue;
        rows.push({ row: r, raw });
      }
      return { sheet: sheet.name, rows };
    }
  }
  return null;
}
