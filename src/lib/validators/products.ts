import { z } from "zod";

const optionalText = (max = 120) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullish();

const money = z.coerce.number({ error: "Ingresá un número" }).min(0, "No puede ser negativo").max(100_000_000);

export const productImageSchema = z.object({
  url: z.url(),
  pathname: z.string().min(1),
});

export const productSchema = z.object({
  id: z.string().optional().or(z.literal("")),
  barcode: z.string().trim().min(1, "El código es obligatorio").max(64),
  name: z.string().trim().min(1, "El nombre es obligatorio").max(160),
  category: optionalText(),
  type: optionalText(),
  design: optionalText(),
  color: optionalText(),
  size: optionalText(40),
  cost: money,
  priceNormal: money,
  priceTransfer: money,
  stock: z.coerce.number({ error: "Ingresá un número" }).int("Debe ser un número entero").min(0).max(1_000_000),
  supplierName: optionalText(),
  supplierAddress: optionalText(240),
  isPublic: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
  publicDescription: optionalText(2000),
  images: z.preprocess(
    (v) => (typeof v === "string" && v ? JSON.parse(v) : []),
    z.array(productImageSchema).max(8, "Máximo 8 fotos"),
  ),
});

export type ProductInput = z.infer<typeof productSchema>;
