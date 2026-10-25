import "server-only";
import ExcelJS from "exceljs";
import { z } from "zod";

/** Columnas de la plantilla (mismos nombres que la app anterior). "price" es el costo. */
const COLUMNS = [
  "barcode",
  "name",
  "category",
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
] as const;
type Column = (typeof COLUMNS)[number];

const text = z
  .unknown()
  .transform((v) => (v === null || v === undefined ? "" : String(v).trim()))
  .transform((v) => v || null);
const number = (label: string) =>
  z.unknown().transform((v, ctx) => {
    if (v === null || v === undefined || v === "") return 0;
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
  type: text,
  design: text,
  color: text,
  size: text,
  price: number("Costo"),
  priceNormal: number("Precio efectivo"),
  priceTransfer: number("Precio transferencia"),
  stock: number("Stock").pipe(z.number().int("El stock debe ser entero")),
  supplierName: text,
  supplierAddress: text,
});

export type ImportRow = z.infer<typeof importRowSchema>;

function cellValue(cell: ExcelJS.Cell): unknown {
  const v = cell.value;
  if (v === null || v === undefined) return null;
  if (typeof v === "object") {
    if (v instanceof Date) return v.toISOString();
    if ("result" in v) return v.result ?? null; // fórmula: usar el valor calculado
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
        const raw = Object.fromEntries(
          COLUMNS.map((c) => [c, indexes.has(c) ? cellValue(row.getCell(indexes.get(c)!)) : null]),
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
