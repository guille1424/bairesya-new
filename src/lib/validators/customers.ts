import { z } from "zod";
import { normalizeArPhone } from "@/lib/phone";

export const customerSchema = z.object({
  id: z.string().optional().or(z.literal("")),
  name: z.string().trim().min(2, "Ingresá el nombre").max(120),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s()-]{6,24}$/, "Teléfono inválido (solo números, con código de área)")
    .or(z.literal(""))
    .transform((v) => (v ? normalizeArPhone(v) : null)),
  email: z
    .email("Email inválido")
    .trim()
    .toLowerCase()
    .or(z.literal(""))
    .transform((v) => v || null),
  address: z
    .string()
    .trim()
    .max(240)
    .transform((v) => v || null),
});
