import { z } from "zod";

export const posItemSchema = z.object({
  barcode: z.string().trim().min(1),
  quantity: z.coerce.number().int().min(1).max(999),
  priceType: z.enum(["NORMAL", "TRANSFER", "CUSTOM"]).default("NORMAL"),
  customPrice: z.coerce.number().min(0).nullish(),
});

export const posOrderSchema = z.object({
  customerId: z.string().nullish(),
  customerName: z.string().trim().min(1, "Elegí o cargá un cliente"),
  customerPhone: z.string().trim().nullish(),
  items: z.array(posItemSchema).min(1, "Agregá al menos una prenda"),
});

export const webOrderSchema = z.object({
  customerName: z.string().trim().min(2, "Ingresá tu nombre"),
  customerPhone: z.string().trim().max(30).nullish(),
  items: z
    .array(z.object({ productId: z.string().min(1), quantity: z.coerce.number().int().min(1).max(20) }))
    .min(1, "El carrito está vacío")
    .max(50),
});

export type PosItemInput = z.infer<typeof posItemSchema>;
export type PosOrderInput = z.infer<typeof posOrderSchema>;
export type WebOrderInput = z.infer<typeof webOrderSchema>;
